/**
 * Run all Supabase migrations in supabase/migrations/ (sorted by filename).
 *
 *   npm run db:migrate
 *
 * Why statement-by-statement for big schema files:
 *   Postgres stops the rest of the batch on the first error. If enums/tables
 *   already exist from a partial run, the whole file would abort and you'd
 *   never get later objects (e.g. profiles). We run each statement and skip
 *   benign "already exists" DDL errors so the migration can finish.
 *
 * Prerequisites:
 *   DATABASE_URL or SUPABASE_DB_PASSWORD + NEXT_PUBLIC_SUPABASE_URL
 *
 * Optional:
 *   SKIP_COMPLETE_SCHEMA=1 — only run migrations after the main schema file
 *   MIGRATE_STRICT=1       — one query per file (old behavior; fails fast on duplicates)
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnv() {
    const envPath = path.join(__dirname, '..', '.env.local');
    const altPath = path.join(__dirname, '..', '.env');
    const p = fs.existsSync(envPath) ? envPath : fs.existsSync(altPath) ? altPath : null;
    if (!p) return {};
    return Object.fromEntries(
        fs.readFileSync(p, 'utf-8').split('\n')
            .filter((l) => /^[A-Z_]+=/.test(l.trim()))
            .map((l) => {
                const eq = l.indexOf('=');
                return [l.slice(0, eq).trim(), l.slice(eq + 1).trim()];
            })
    );
}

const env = { ...process.env, ...loadEnv() };
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const PROJECT_REF = SUPABASE_URL?.match(/([a-zA-Z0-9]{20,})\.supabase\.co/)?.[1];

let connectionString = env.DATABASE_URL;
let directConnection = null;
if (!connectionString && env.SUPABASE_DB_PASSWORD && PROJECT_REF) {
    const pw = encodeURIComponent(env.SUPABASE_DB_PASSWORD);
    const region = env.SUPABASE_POOLER_REGION || 'us-east-1';
    connectionString = `postgresql://postgres.${PROJECT_REF}:${pw}@aws-0-${region}.pooler.supabase.com:6543/postgres`;
    directConnection = `postgresql://postgres:${pw}@db.${PROJECT_REF}.supabase.co:5432/postgres`;
}

const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
const skipComplete = env.SKIP_COMPLETE_SCHEMA === '1' || env.SKIP_COMPLETE_SCHEMA === 'true';
const strictMode = env.MIGRATE_STRICT === '1' || env.MIGRATE_STRICT === 'true';

function listMigrationFiles() {
    if (!fs.existsSync(migrationsDir)) {
        console.error('No folder:', migrationsDir);
        process.exit(1);
    }
    let files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
    if (skipComplete) {
        files = files.filter((f) => !f.includes('20260209000000_complete_schema'));
        console.log('SKIP_COMPLETE_SCHEMA: skipping main schema file.\n');
    }
    return files;
}

/** Split SQL on semicolons outside single quotes and dollar-quoted blocks */
function splitPostgresStatements(sql) {
    const statements = [];
    let start = 0;
    let i = 0;
    let inSingle = false;
    let dollarTag = null;
    const len = sql.length;

    while (i < len) {
        const c = sql[i];

        if (dollarTag) {
            if (sql.slice(i, i + dollarTag.length) === dollarTag) {
                i += dollarTag.length;
                dollarTag = null;
            } else {
                i++;
            }
            continue;
        }

        if (inSingle) {
            if (c === "'" && sql[i + 1] === "'") {
                i += 2;
                continue;
            }
            if (c === "'") inSingle = false;
            i++;
            continue;
        }

        if (c === "'") {
            inSingle = true;
            i++;
            continue;
        }

        if (c === '$') {
            const rest = sql.slice(i);
            const m = rest.match(/^\$([a-zA-Z_]*)\$/);
            if (m) {
                dollarTag = m[0];
                i += dollarTag.length;
                continue;
            }
        }

        if (c === ';') {
            const stmt = sql.slice(start, i).trim();
            if (stmt.length > 0 && !/^\s*--/.test(stmt)) {
                statements.push(stmt);
            }
            i++;
            while (i < len && /[\s\r\n]/.test(sql[i])) i++;
            start = i;
            continue;
        }

        i++;
    }

    const tail = sql.slice(start).trim();
    if (tail.length > 0 && !/^\s*--/.test(tail)) {
        statements.push(tail);
    }
    return statements;
}

function isIgnorableDDL(err) {
    const msg = (err.message || '').toLowerCase();
    const code = err.code;
    const ignorableCodes = new Set([
        '42P07', // duplicate_table
        '42710', // duplicate_object (type, policy, etc.)
        '42723', // duplicate_function
        '42P06', // duplicate_schema
    ]);
    if (ignorableCodes.has(code)) return true;
    if (/already exists/.test(msg)) return true;
    if (/duplicate key/.test(msg) && /unique|constraint/.test(msg)) return false;
    return false;
}

async function tryConnect(connStr, label) {
    console.log(`Trying ${label}...`);
    const client = new pg.Client({
        connectionString: connStr,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 45000,
    });
    try {
        await client.connect();
        console.log(`Connected (${label}).\n`);
        return client;
    } catch (err) {
        console.log(`${label} failed: ${err.message}`);
        return null;
    }
}

async function runFileForgiving(client, file, fullPath) {
    const sql = fs.readFileSync(fullPath, 'utf-8');
    const statements = splitPostgresStatements(sql);
    let ok = 0;
    let skipped = 0;
    let failed = 0;
    let lastRealError = null;

    for (let n = 0; n < statements.length; n++) {
        const stmt = statements[n];
        if (/^\s*--/.test(stmt) || stmt.length < 5) continue;
        try {
            await client.query(stmt);
            ok++;
        } catch (err) {
            if (isIgnorableDDL(err)) {
                skipped++;
            } else {
                failed++;
                lastRealError = { err, index: n + 1, stmt: stmt.slice(0, 120) };
                break;
            }
        }
    }

    if (lastRealError) {
        console.error(`  Stopped at statement ${lastRealError.index}/${statements.length}`);
        console.error(`  ${lastRealError.err.message}`);
        console.error(`  Preview: ${lastRealError.stmt.replace(/\s+/g, ' ')}...`);
        throw lastRealError.err;
    }

    console.log(`  ${ok} statements OK, ${skipped} skipped (already present)`);
    return { ok, skipped };
}

async function main() {
    const files = listMigrationFiles();
    if (files.length === 0) {
        console.error('No migration .sql files to run.');
        process.exit(1);
    }

    console.log('=== Full database migration ===');
    console.log(`Project ref: ${PROJECT_REF || '(from DATABASE_URL)'}`);
    console.log(strictMode ? 'Mode: STRICT (one query per file)\n' : 'Mode: resilient (statement-by-statement, skip duplicate DDL)\n');
    console.log(`Migrations (${files.length}):`);
    files.forEach((f) => console.log(`  - ${f}`));
    console.log('');

    let client = connectionString ? await tryConnect(connectionString, 'Pooler (6543)') : null;
    if (!client && directConnection) {
        client = await tryConnect(directConnection, 'Direct (5432)');
    }

    if (!client) {
        console.error('\nNeed a Postgres connection. Add to .env.local:');
        console.error('  DATABASE_URL=... (Session mode pooler or direct from Supabase Dashboard)');
        console.error('  OR SUPABASE_DB_PASSWORD + NEXT_PUBLIC_SUPABASE_URL');
        process.exit(1);
    }

    let totalOk = 0;
    let totalSkip = 0;

    for (const file of files) {
        const fullPath = path.join(migrationsDir, file);
        console.log(`--- ${file} ---`);
        if (strictMode) {
            const sql = fs.readFileSync(fullPath, 'utf-8');
            try {
                await client.query(sql);
                console.log('  OK\n');
            } catch (err) {
                console.error(`  FAILED: ${err.message}\n`);
                if (err.message?.includes('already exists') && file.includes('complete_schema')) {
                    console.error('Tip: Run without MIGRATE_STRICT=1 so duplicate DDL is skipped and the rest applies.');
                }
                await client.end();
                process.exit(1);
            }
        } else {
            const { ok, skipped } = await runFileForgiving(client, file, fullPath);
            totalOk += ok;
            totalSkip += skipped;
            console.log('');
        }
    }

    await client.end();
    console.log('=== All migrations finished ===');
    if (!strictMode) {
        console.log(`Totals: ${totalOk} statements applied, ${totalSkip} duplicates skipped.`);
    }
    console.log('Verify: SELECT to_regclass(\'public.profiles\');  -- should return profiles');
}

main().catch((err) => {
    console.error('Fatal:', err.message);
    process.exit(1);
});
