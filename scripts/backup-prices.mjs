// Dumps id, sku, name, price, compare_at_price for every product to CSV.
// Usage: node scripts/backup-prices.mjs > scripts/backups/price-backup-YYYY-MM-DD.csv
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Minimal .env.local loader (no dotenv dependency in this project)
for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const rows = [];
let from = 0;
const PAGE = 1000;
for (;;) {
    const { data, error } = await supabase
        .from('products')
        .select('id, sku, name, price, compare_at_price')
        .order('sku')
        .range(from, from + PAGE - 1);
    if (error) {
        console.error('Fetch failed:', error.message);
        process.exit(1);
    }
    rows.push(...(data || []));
    if (!data || data.length < PAGE) break;
    from += PAGE;
}

const esc = (v) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

console.log('id,sku,name,price,compare_at_price');
for (const r of rows) {
    console.log([r.id, r.sku, r.name, r.price, r.compare_at_price].map(esc).join(','));
}
console.error(`Backed up ${rows.length} products`);
