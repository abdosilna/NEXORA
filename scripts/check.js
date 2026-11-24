import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const TARGET_DIRS = ['src', 'scripts', 'tests', 'public/admin'];

function collectJsFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectJsFiles(full, out);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      out.push(full);
    }
  }
  return out;
}

const files = TARGET_DIRS.flatMap((d) => collectJsFiles(path.join(ROOT, d)));
let checked = 0;

for (const file of files) {
  execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
  checked += 1;
}

const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
if (!fs.existsSync(path.join(ROOT, pkg.main))) {
  throw new Error(`Missing package.json main entry point: ${pkg.main}`);
}

const requiredAssets = [
  'public/admin/index.html',
  'public/admin/app.js',
  'public/admin/styles.css',
];
for (const rel of requiredAssets) {
  if (!fs.existsSync(path.join(ROOT, rel))) {
    throw new Error(`Missing required admin asset: ${rel}`);
  }
}

// Verify core ESM import graph resolves cleanly without missing modules or circular init failures
await Promise.all([
  import('../src/config/env.js'),
  import('../src/whatsapp/connection.js'),
  import('../src/whatsapp/pairing.js'),
  import('../src/whatsapp/auth-state.js'),
  import('../src/whatsapp/message-handler.js'),
  import('../src/bot/router.js'),
  import('../src/admin/server.js'),
]);

const { loadConfig } = await import('../src/config/env.js');
loadConfig({ DATABASE_PATH: ':memory:', WHATSAPP_AUTO_CONNECT: 'false' }, { loadDotenv: false });

console.log(`Verification passed: ${checked} ES module files checked, ESM imports and config schema verified.`);
