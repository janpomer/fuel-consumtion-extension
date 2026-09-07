#!/usr/bin/env node
// Generates the extension icons (public/icons/*.png) with zero dependencies:
// a rounded blue tile with a white fuel drop, rasterised and PNG-encoded here.
import { deflateSync } from 'node:zlib';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const SIZES = [16, 32, 48, 128];
const BG = [26, 115, 232];
const FG = [255, 255, 255];
const SAMPLES = 3; // supersampling factor, for smooth edges

/** RGBA pixels for one icon size. */
function raster(size) {
  const pixels = Buffer.alloc(size * size * 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const { tile, drop } = coverage(x, y, size);
      const offset = (y * size + x) * 4;

      // Drop over tile over transparency.
      const alpha = tile;
      const mix = alpha === 0 ? 0 : Math.min(drop / alpha, 1);
      for (let c = 0; c < 3; c++) {
        pixels[offset + c] = Math.round(BG[c] * (1 - mix) + FG[c] * mix);
      }
      pixels[offset + 3] = Math.round(alpha * 255);
    }
  }

  return pixels;
}

/** Antialiased coverage of the tile and the drop for one pixel. */
function coverage(px, py, size) {
  let tile = 0;
  let drop = 0;

  for (let sy = 0; sy < SAMPLES; sy++) {
    for (let sx = 0; sx < SAMPLES; sx++) {
      const x = (px + (sx + 0.5) / SAMPLES) / size;
      const y = (py + (sy + 0.5) / SAMPLES) / size;
      const inTile = insideRoundedTile(x, y);
      if (!inTile) continue;
      tile++;
      if (insideDrop(x, y)) drop++;
    }
  }

  const total = SAMPLES * SAMPLES;
  return { tile: tile / total, drop: drop / total };
}

/** Rounded square filling the canvas, in normalised [0,1] coordinates. */
function insideRoundedTile(x, y) {
  const r = 0.22;
  const dx = Math.max(r - x, x - (1 - r), 0);
  const dy = Math.max(r - y, y - (1 - r), 0);
  return dx * dx + dy * dy <= r * r;
}

/** Teardrop: a circle plus a cone tapering to a point above it. */
function insideDrop(x, y) {
  const u = x - 0.5;
  const v = y - 0.5;

  const circleR = 0.26;
  const circleCy = 0.13;
  if (u * u + (v - circleCy) * (v - circleCy) <= circleR * circleR) return true;

  const tipY = -0.34;
  if (v < tipY || v > circleCy) return false;
  const halfWidth = circleR * ((v - tipY) / (circleCy - tipY));
  return Math.abs(u) <= halfWidth;
}

/** Minimal PNG encoder: IHDR + IDAT + IEND, 8-bit RGBA, no interlacing. */
function encodePng(width, height, rgba) {
  const raw = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter type: none
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: RGBA

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function chunk(type, data) {
  const header = Buffer.alloc(4);
  header.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([header, body, crc]);
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

const outDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');
await mkdir(outDir, { recursive: true });

for (const size of SIZES) {
  const file = path.join(outDir, `icon${size}.png`);
  await writeFile(file, encodePng(size, size, raster(size)));
  console.log(`[icons] ${path.relative(process.cwd(), file)}`);
}
