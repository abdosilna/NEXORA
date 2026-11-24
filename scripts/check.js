import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const TARGET_PATHS = [
  'config.js',
  'handler.js',
  'main.js',
  'index.js',
  'lib',
  'plugins',
  'scripts',
  'tests',
  'public/admin',
];

function collectJsFiles(target, out = []) {
  if (!fs.existsSync(target)) return out;
  const stat = fs.statSync(target);
  if (stat.isFile()) {
    if (target.endsWith('.js')) out.push(target);
    return out;
  }
  for (const entry of fs.readdirSync(target, { withFileTypes: true })) {
    const full = path.join(target, entry.name);
    if (entry.isDirectory()) {
      collectJsFiles(full, out);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      out.push(full);
    }
  }
  return out;
}

const files = TARGET_PATHS.flatMap((p) => collectJsFiles(path.join(ROOT, p)));
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
  import('../config.js'),
  import('../handler.js'),
  import('../main.js'),
  import('../index.js'),
  import('../lib/whatsapp/connection.js'),
  import('../lib/whatsapp/pairing.js'),
  import('../lib/whatsapp/auth-state.js'),
  import('../lib/whatsapp/plugins.js'),
  import('../lib/whatsapp/simple.js'),
  import('../lib/whatsapp/message-handler.js'),
  import('../lib/bot/router.js'),
  import('../lib/admin/server.js'),
]);

const { loadConfig } = await import('../config.js');
loadConfig({ DATABASE_PATH: ':memory:', WHATSAPP_AUTO_CONNECT: 'false' }, { loadDotenv: false });

console.log(`Verification passed: ${checked} ES module files checked, ESM imports and config schema verified.`);
