#!/usr/bin/env node
/**
 * Brand asset generator.
 *
 * Reads the master logo from `public/logo.png` (or `LOGO_SRC` env var on first
 * run) and produces every favicon, PWA icon, Apple touch icon, OG image and
 * Windows tile asset the app references.
 *
 * Run with: `npm run generate:brand`
 *
 * Background colour: blue-950 (#172554) — matches the footer / hero.
 * Padding for any-purpose icons: ~12% safe-area.
 * Padding for maskable icons: ~38% safe-area (to survive Android's adaptive
 * icon mask which can crop up to 25% on each side).
 */

import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PUB = path.join(ROOT, 'public');

const NAVY = { r: 0x17, g: 0x25, b: 0x54, alpha: 1 };
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

const LOGO_SRC = process.env.LOGO_SRC || path.join(PUB, 'logo.png');
const MASTER = path.join(PUB, 'logo.png');

async function ensureMaster() {
  if (LOGO_SRC !== MASTER) {
    await fs.copyFile(LOGO_SRC, MASTER);
  } else if (!existsSync(MASTER)) {
    throw new Error(
      `No master logo found. Place a PNG at ${MASTER} or pass LOGO_SRC=/abs/path.`
    );
  }
}

async function fittedLogoBuffer(targetSize, paddingFactor) {
  const inner = Math.round(targetSize * paddingFactor);
  return sharp(MASTER)
    .resize(inner, inner, { fit: 'inside', background: TRANSPARENT })
    .toBuffer();
}

async function squareIcon(size, { paddingFactor = 0.86, background = NAVY } = {}) {
  const fitted = await fittedLogoBuffer(size, paddingFactor);
  return sharp({
    create: { width: size, height: size, channels: 4, background },
  })
    .composite([{ input: fitted, gravity: 'center' }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

async function landscapeImage(width, height, paddingFactor = 0.65) {
  const innerW = Math.round(width * paddingFactor);
  const innerH = Math.round(height * paddingFactor);
  const fitted = await sharp(MASTER)
    .resize(innerW, innerH, { fit: 'inside', background: TRANSPARENT })
    .toBuffer();
  return sharp({
    create: { width, height, channels: 4, background: NAVY },
  })
    .composite([{ input: fitted, gravity: 'center' }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/**
 * Encode a multi-image .ico file. Each entry stores its PNG payload directly
 * (this is the standard Vista+ ICO with PNG-compressed bitmaps; supported by
 * every modern browser, including IE9+).
 */
function encodeIco(entries) {
  const HEADER = 6;
  const ENTRY = 16;
  const dirSize = HEADER + ENTRY * entries.length;

  const header = Buffer.alloc(HEADER);
  header.writeUInt16LE(0, 0);            // reserved
  header.writeUInt16LE(1, 2);            // type = 1 (icon)
  header.writeUInt16LE(entries.length, 4);

  const dir = Buffer.alloc(ENTRY * entries.length);
  let dataOffset = dirSize;

  entries.forEach((entry, i) => {
    const o = i * ENTRY;
    const sizeByte = entry.size >= 256 ? 0 : entry.size; // 0 means 256
    dir.writeUInt8(sizeByte, o);                  // width
    dir.writeUInt8(sizeByte, o + 1);              // height
    dir.writeUInt8(0, o + 2);                     // colour palette (none)
    dir.writeUInt8(0, o + 3);                     // reserved
    dir.writeUInt16LE(1, o + 4);                  // colour planes
    dir.writeUInt16LE(32, o + 6);                 // bpp
    dir.writeUInt32LE(entry.buffer.length, o + 8);
    dir.writeUInt32LE(dataOffset, o + 12);
    dataOffset += entry.buffer.length;
  });

  return Buffer.concat([header, dir, ...entries.map((e) => e.buffer)]);
}

async function main() {
  await ensureMaster();

  const writes = [];

  // PWA / OS icons (any-purpose; navy background for visibility everywhere).
  const anyPurposeSizes = [16, 32, 48, 64, 96, 128, 192, 256, 384, 512];
  const anyBuffers = await Promise.all(
    anyPurposeSizes.map(async (size) => ({
      size,
      buffer: await squareIcon(size, { paddingFactor: size <= 32 ? 0.94 : 0.86 }),
    }))
  );
  anyBuffers.forEach(({ size, buffer }) => {
    writes.push(fs.writeFile(path.join(PUB, `icon-${size}.png`), buffer));
  });

  // Common alias filenames many tools/scanners look for.
  const find = (s) => anyBuffers.find((b) => b.size === s).buffer;
  writes.push(fs.writeFile(path.join(PUB, 'favicon-16x16.png'), find(16)));
  writes.push(fs.writeFile(path.join(PUB, 'favicon-32x32.png'), find(32)));
  writes.push(fs.writeFile(path.join(PUB, 'favicon-48x48.png'), find(48)));
  writes.push(fs.writeFile(path.join(PUB, 'icon-192.png'), find(192)));
  writes.push(fs.writeFile(path.join(PUB, 'icon-512.png'), find(512)));

  // Apple touch icon (180×180 — current iOS size).
  const apple = await squareIcon(180, { paddingFactor: 0.86 });
  writes.push(fs.writeFile(path.join(PUB, 'apple-touch-icon.png'), apple));

  // Maskable icons — extra padding so Android's adaptive-icon mask does not clip the monogram.
  const maskable192 = await squareIcon(192, { paddingFactor: 0.62 });
  const maskable512 = await squareIcon(512, { paddingFactor: 0.62 });
  writes.push(fs.writeFile(path.join(PUB, 'icon-maskable-192.png'), maskable192));
  writes.push(fs.writeFile(path.join(PUB, 'icon-maskable-512.png'), maskable512));

  // Multi-size favicon.ico (16, 32, 48).
  const ico = encodeIco([
    { size: 16, buffer: find(16) },
    { size: 32, buffer: find(32) },
    { size: 48, buffer: find(48) },
  ]);
  writes.push(fs.writeFile(path.join(PUB, 'favicon.ico'), ico));

  // Open Graph / social share images.
  const og = await landscapeImage(1200, 630, 0.62);
  const ogSquare = await landscapeImage(1200, 1200, 0.65);
  writes.push(fs.writeFile(path.join(PUB, 'og-image.png'), og));
  writes.push(fs.writeFile(path.join(PUB, 'og-image-square.png'), ogSquare));
  writes.push(fs.writeFile(path.join(PUB, 'twitter-image.png'), og));

  await Promise.all(writes);

  // Friendly summary
  const out = (await fs.readdir(PUB))
    .filter((f) => /\.(png|ico)$/.test(f))
    .sort();
  console.log('Generated', out.length, 'brand asset files:');
  out.forEach((f) => console.log('  •', f));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
