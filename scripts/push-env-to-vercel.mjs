#!/usr/bin/env node
/**
 * Push .env.local to Vercel Production (and optionally Preview).
 * Requires: vercel CLI linked to the project, and .env.local in repo root.
 *
 * Usage:
 *   node scripts/push-env-to-vercel.mjs [production|preview|both]
 *   Default: production only.
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const envPath = path.join(root, '.env.local');

const target = process.argv[2] || 'production';
const environments = target === 'both' ? ['production', 'preview'] : [target];

if (!fs.existsSync(envPath)) {
  console.error('.env.local not found in project root.');
  process.exit(1);
}

const raw = fs.readFileSync(envPath, 'utf8');

function parseValue(val) {
  const s = val.trim();
  if (s.startsWith('"') && s.endsWith('"')) {
    return s.slice(1, -1).replace(/\\"/g, '"');
  }
  if (s.startsWith("'") && s.endsWith("'")) {
    return s.slice(1, -1).replace(/\\'/g, "'");
  }
  return s;
}

const vars = [];
for (const line of raw.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eq = trimmed.indexOf('=');
  if (eq <= 0) continue;
  const key = trimmed.slice(0, eq).trim();
  const value = parseValue(trimmed.slice(eq + 1));
  vars.push([key, value]);
}

const tmpDir = path.join(root, '.tmp-vercel-env');
if (!fs.existsSync(tmpDir)) {
  fs.mkdirSync(tmpDir, { recursive: true });
}

let added = 0;
for (const [key, value] of vars) {
  for (const env of environments) {
    const tmpFile = path.join(tmpDir, `${key}.${env}.txt`);
    fs.writeFileSync(tmpFile, value, 'utf8');
    try {
      execSync(`vercel env add "${key}" ${env} --force < "${tmpFile}"`, {
        cwd: root,
        stdio: 'pipe',
      });
      console.log(`  ${env}: ${key}`);
      added += 1;
    } catch (e) {
      console.error(`  ${env}: ${key} failed: ${e.message || e}`);
    }
    try {
      fs.unlinkSync(tmpFile);
    } catch (_) {}
  }
}

try {
  fs.rmdirSync(tmpDir);
} catch (_) {}

console.log(`\nDone. ${added} env var(s) added/updated for ${environments.join(', ')}.`);
console.log('Redeploy the project for changes to take effect.');
