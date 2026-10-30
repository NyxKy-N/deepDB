/*
 * Build step for the deepDB Windows desktop app.
 * Copies the untouched static site (index.html + assets/ + README.md) from the
 * repository root into desktop/web/ so electron-builder can pack it. Nothing in
 * the website source is modified.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const APP_DIR = path.resolve(HERE, '..');
const SITE_DIR = path.resolve(APP_DIR, '..');
const WEB_DIR = path.join(APP_DIR, 'web');

const ENTRIES = ['index.html', 'assets', 'README.md'];

fs.rmSync(WEB_DIR, { recursive: true, force: true });
fs.mkdirSync(WEB_DIR, { recursive: true });

for (const entry of ENTRIES) {
  const from = path.join(SITE_DIR, entry);
  const to = path.join(WEB_DIR, entry);
  if (!fs.existsSync(from)) {
    throw new Error('[deepdb-desktop] missing site entry: ' + from);
  }
  const stat = fs.statSync(from);
  if (stat.isDirectory()) {
    fs.cpSync(from, to, { recursive: true });
  } else {
    fs.copyFileSync(from, to);
  }
}

const indexSize = fs.statSync(path.join(WEB_DIR, 'index.html')).size;
let assetCount = 0;
const walk = (dir) => {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.isDirectory()) walk(path.join(dir, ent.name));
    else assetCount += 1;
  }
};
walk(path.join(WEB_DIR, 'assets'));

console.log('[deepdb-desktop] copied site into web/: index.html ' + indexBytes(indexSize) + ', assets ' + assetCount + ' files');

function indexBytes(n) {
  return n + 'B';
}
