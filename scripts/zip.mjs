#!/usr/bin/env node
// Packs dist/ into a store-ready zip. Uses the `zip` CLI when available.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');

const { version } = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
const output = path.join(root, `fuel-consumption-extension-${version}.zip`);

const result = spawnSync('zip', ['-r', '-X', output, '.'], { cwd: dist, stdio: 'inherit' });

if (result.error?.code === 'ENOENT') {
  console.error(`The \`zip\` command was not found. Zip the contents of dist/ manually.`);
  process.exit(1);
}

process.exit(result.status ?? 0);
