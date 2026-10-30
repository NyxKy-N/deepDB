'use strict';

/*
 * Builds build/icon.icns (the macOS app icon) from build/icon.png.
 *
 * macOS needs an .icns container; electron-packager/electron-builder both accept
 * build/icon.icns directly, so this script lets a Windows/Linux machine
 * cross-build the macOS bundle without Apple tooling (sips/iconutil).
 *
 *   npm run icon:icns
 *
 * The downscaling uses Electron's nativeImage (no browser window involved).
 * Run `npm run icon` first to refresh build/icon.png from the site brand assets.
 */

const { app, nativeImage } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const APP_DIR = path.resolve(__dirname, '..');
const BUILD_DIR = path.join(APP_DIR, 'build');
const SOURCE = path.join(BUILD_DIR, 'icon.png');
const OUT = path.join(BUILD_DIR, 'icon.icns');

// icns entry type -> pixel size (PNG based entries, macOS 10.7+)
const ENTRIES = [
  ['icp4', 16],
  ['icp5', 32],
  ['icp6', 64],
  ['ic07', 128],
  ['ic08', 256],
  ['ic09', 512],
  ['ic10', 1024]
];

function buildIcns(entries) {
  const chunks = [];
  let total = 8;
  for (const [type, png] of entries) {
    const header = Buffer.alloc(8);
    header.write(type, 0, 'ascii');
    header.writeUInt32BE(8 + png.length, 4);
    chunks.push(header, png);
    total += 8 + png.length;
  }
  const head = Buffer.alloc(8);
  head.write('icns', 0, 'ascii');
  head.writeUInt32BE(total, 4);
  return Buffer.concat([head, ...chunks]);
}

app.whenReady().then(function () {
  try {
    if (!fs.existsSync(SOURCE)) throw new Error('build/icon.png missing — run `npm run icon` first');
    const source = nativeImage.createFromPath(SOURCE);
    if (source.isEmpty()) throw new Error('build/icon.png could not be decoded');
    const rendered = [];
    for (const [type, size] of ENTRIES) {
      const png = source.resize({ width: size, height: size, quality: 'best' }).toPNG();
      if (!png || !png.length) throw new Error('failed to render ' + size + 'px icon');
      rendered.push([type, png]);
    }
    const icns = buildIcns(rendered);
    fs.mkdirSync(BUILD_DIR, { recursive: true });
    fs.writeFileSync(OUT, icns);
    console.log('[deepdb-desktop-mac] wrote ' + OUT + ' ' + icns.length + ' bytes');
    app.quit();
  } catch (err) {
    console.error('[deepdb-desktop-mac] icns generation failed:', err);
    app.exit(1);
  }
});
