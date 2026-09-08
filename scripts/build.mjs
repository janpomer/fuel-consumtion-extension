#!/usr/bin/env node
// Builds dist/: compiles src/ with tsc and copies public/ over the output.
// No bundler — the extension loads plain ES modules straight from disk.
import { spawn } from 'node:child_process';
import { cp, mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const watch = process.argv.includes('--watch');

const tsc = path.join(root, 'node_modules', 'typescript', 'bin', 'tsc');

if (!watch) await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
await copyStatic();

if (watch) {
  // Recopy static files whenever they change, and let tsc watch the TS sources.
  const { watch: watchFs } = await import('node:fs');
  let pending;
  watchFs(path.join(root, 'public'), { recursive: true }, () => {
    clearTimeout(pending);
    pending = setTimeout(() => void copyStatic().then(() => log('static files copied')), 100);
  });
  log('watching src/ and public/ — reload the extension in chrome://extensions after a change');
}

const child = spawn(process.execPath, [tsc, ...(watch ? ['--watch', '--preserveWatchOutput'] : [])], {
  cwd: root,
  stdio: 'inherit',
});

child.on('exit', (code) => {
  if (!watch && code === 0) log('build complete → dist/');
  process.exit(code ?? 0);
});

async function copyStatic() {
  await cp(path.join(root, 'public'), dist, { recursive: true });
}

function log(message) {
  console.log(`[build] ${message}`);
}
