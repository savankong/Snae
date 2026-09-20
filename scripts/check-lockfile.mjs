#!/usr/bin/env node
/**
 * Fails when a workspace package is missing from package-lock.json.
 *
 * Adding a package under packages/ without re-running `npm install` leaves the
 * lockfile stale. Everything still passes locally, because node_modules already
 * holds the symlink — and then `npm ci` rejects it in CI. That has now happened
 * twice (@snae/db, then @snae/media). This catches it in a second, before the
 * push, with a message that says exactly how to fix it.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const lock = JSON.parse(readFileSync(join(root, 'package-lock.json'), 'utf8'));
const locked = new Set(Object.keys(lock.packages ?? {}));

const missing = [];
for (const dir of ['packages', 'apps']) {
  const base = join(root, dir);
  if (!existsSync(base)) continue;
  for (const entry of readdirSync(base, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const manifest = join(base, entry.name, 'package.json');
    if (!existsSync(manifest)) continue;
    const { name } = JSON.parse(readFileSync(manifest, 'utf8'));
    // npm records a workspace both by its path and under node_modules/<name>.
    if (!locked.has(`${dir}/${entry.name}`) || !locked.has(`node_modules/${name}`)) {
      missing.push(`${name} (${dir}/${entry.name})`);
    }
  }
}

if (missing.length > 0) {
  console.error('Lockfile is stale. Missing workspace entries:\n');
  for (const m of missing) console.error(`  - ${m}`);
  console.error('\nFix: npm install --package-lock-only && git add package-lock.json\n');
  process.exit(1);
}
console.log(`Lockfile is in sync (${locked.size} entries).`);
