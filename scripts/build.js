import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const requiredFiles = [
  'src/index.js',
  'public/admin/index.html',
  'public/admin/app.js',
  'public/admin/styles.css',
];

for (const rel of requiredFiles) {
  if (!fs.existsSync(path.join(ROOT, rel))) {
    throw new Error(`Missing required file: ${rel}`);
  }
}

execFileSync(process.execPath, [path.join(ROOT, 'scripts/check.js')], { stdio: 'inherit' });
console.log('NEXORA BOT verification build completed.');
