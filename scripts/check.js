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

console.log(`Syntax check passed for ${checked} JavaScript ES module files.`);
