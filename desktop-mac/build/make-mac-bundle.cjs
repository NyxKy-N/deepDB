#!/usr/bin/env node
'use strict';

/*
 * make-mac-bundle.cjs — cross-build a complete, runnable macOS .app bundle
 * for the deepDB desktop wrapper from the official Electron darwin zip,
 * entirely on Windows/Linux (no macOS toolchain required).
 *
 * Why this exists: electron-packager/electron-builder refuse (or silently
 * mis-build) darwin targets on Windows because they cannot create the
 * framework symlinks without admin rights. This script writes the zip itself,
 * synthesising the symlink entries (unix mode S_IFLNK) and exec-bit modes into
 * the archive, so unzipping on macOS recreates a byte-correct Electron.app
 * layout, renamed to deepDB.app with our web payload installed.
 *
 * The bundle is unsigned (Windows cannot codesign for macOS). Ship a small
 * first-run .command helper that removes the quarantine flag and applies an
 * ad-hoc signature on the Mac (required on Apple Silicon).
 *
 * usage:
 *   node make-mac-bundle.cjs --electron <electron-vX-darwin-arm64.zip>
 *                            --payload  <desktop-mac folder>
 *                            --icon     <build/icon.icns>
 *                            --out      <out.zip>
 *                            [--arch arm64|x64] [--app-name deepDB]
 *   node make-mac-bundle.cjs --inspect <electron-zip>
 *   node make-mac-bundle.cjs --verify  <out.zip>
 */

const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const APP_NAME = 'deepDB';
const APP_ID = 'app.deepdb.desktop';
const APP_VERSION = '1.5.20'; // overridden from the payload package.json version when present
const COPYRIGHT = 'Copyright © 2026 NyxKy';
const CATEGORY = 'public.app-category.developer-tools';
const ICON_NAME = 'deepdb.icns';

/* ------------------------------------------------------------------ CRC32 */

let CRC_TABLE = null;
function crc32(buf) {
  if (!CRC_TABLE) {
    CRC_TABLE = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      CRC_TABLE[n] = c;
    }
  }
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

/* ------------------------------------------------------------- ZIP reader */

function findEocd(buf) {
  const min = Math.max(0, buf.length - 65557);
  for (let i = buf.length - 22; i >= min; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) return i;
  }
  throw new Error('EOCD not found (not a zip?)');
}

function readZip(file) {
  const buf = fs.readFileSync(file);
  const eocd = findEocd(buf);
  const total = buf.readUInt16LE(eocd + 10);
  const cdOffset = buf.readUInt32LE(eocd + 16);
  const entries = [];
  let p = cdOffset;
  for (let i = 0; i < total; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('bad central header at ' + p);
    const flags = buf.readUInt16LE(p + 8);
    const method = buf.readUInt16LE(p + 10);
    const crc = buf.readUInt32LE(p + 16);
    const compSize = buf.readUInt32LE(p + 20);
    const uncompSize = buf.readUInt32LE(p + 24);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const extAttr = buf.readUInt32LE(p + 38);
    const localOffset = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen);
    const mode = extAttr >>> 16;
    entries.push({ name, mode, flags, method, crc, compSize, uncompSize, localOffset, extAttr });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return { buf, entries };
}

function rawCompressedData(zip, entry) {
  const b = zip.buf;
  const p = entry.localOffset;
  if (b.readUInt32LE(p) !== 0x04034b50) throw new Error('bad local header for ' + entry.name);
  const nameLen = b.readUInt16LE(p + 26);
  const extraLen = b.readUInt16LE(p + 28);
  const start = p + 30 + nameLen + extraLen;
  return b.subarray(start, start + entry.compSize);
}

function entryContent(zip, entry) {
  if (entry.uncompSize === 0) return Buffer.alloc(0);
  const raw = rawCompressedData(zip, entry);
  if (entry.method === 0) return Buffer.from(raw);
  if (entry.method === 8) return zlib.inflateRawSync(raw);
  throw new Error('unsupported compression method ' + entry.method + ' for ' + entry.name);
}

function isDir(mode) { return (mode & 0xf000) === 0x4000; }
function isSymlink(mode) { return (mode & 0xf000) === 0xa000; }

/* ------------------------------------------------------------- ZIP writer */

function dosDateTime() {
  // fixed 2026-01-01 00:00:00, keeps builds reproducible
  const date = ((2026 - 1980) << 9) | (1 << 5) | 1;
  const time = 0;
  return { date, time };
}

class ZipWriter {
  constructor() {
    this.parts = [];
    this.central = [];
    this.offset = 0;
    const d = dosDateTime();
    this.dosDate = d.date;
    this.dosTime = d.time;
    this.names = new Set();
  }

  _name(name) {
    if (this.names.has(name)) throw new Error('duplicate zip entry: ' + name);
    this.names.add(name);
  }

  _local(name, method, crc, comp, compSize, uncompSize) {
    const nameBuf = Buffer.from(name, 'utf8');
    const head = Buffer.alloc(30);
    head.writeUInt32LE(0x04034b50, 0);
    head.writeUInt16LE(20, 4);
    head.writeUInt16LE(0x0800, 6); // utf-8 names
    head.writeUInt16LE(method, 8);
    head.writeUInt16LE(this.dosTime, 10);
    head.writeUInt16LE(this.dosDate, 12);
    head.writeUInt32LE(crc, 14);
    head.writeUInt32LE(compSize, 18);
    head.writeUInt32LE(uncompSize, 22);
    head.writeUInt16LE(nameBuf.length, 26);
    head.writeUInt16LE(0, 28);
    return { head, nameBuf, comp };
  }

  _record(name, mode, method, crc, compSize, uncompSize, localOffset) {
    const nameBuf = Buffer.from(name, 'utf8');
    const c = Buffer.alloc(46);
    c.writeUInt32LE(0x02014b50, 0);
    c.writeUInt16LE((3 << 8) | 30, 4); // made by unix 3.0
    c.writeUInt16LE(20, 6);
    c.writeUInt16LE(0x0800, 8);
    c.writeUInt16LE(method, 10);
    c.writeUInt16LE(this.dosTime, 12);
    c.writeUInt16LE(this.dosDate, 14);
    c.writeUInt32LE(crc, 16);
    c.writeUInt32LE(compSize, 20);
    c.writeUInt32LE(uncompSize, 24);
    c.writeUInt16LE(nameBuf.length, 28);
    c.writeUInt16LE(0, 30);
    c.writeUInt16LE(0, 32);
    c.writeUInt16LE(0, 34);
    c.writeUInt16LE(0, 36);
    c.writeUInt32LE((((mode & 0xffff) << 16) >>> 0), 38);
    c.writeUInt32LE(localOffset, 42);
    this.central.push(c, nameBuf);
  }

  /** copy an untouched file entry, reusing its already-compressed bytes */
  addRawCopy(newName, srcEntry, compData, mode) {
    this._name(newName);
    const offset = this.offset;
    const { head, nameBuf, comp } = this._local(newName, srcEntry.method, srcEntry.crc, compData, srcEntry.compSize, srcEntry.uncompSize);
    this.parts.push(head, nameBuf, comp);
    this.offset += head.length + nameBuf.length + comp.length;
    this._record(newName, mode, srcEntry.method, srcEntry.crc, srcEntry.compSize, srcEntry.uncompSize, offset);
  }

  addBuffer(newName, content, mode) {
    this._name(newName);
    const offset = this.offset;
    const comp = zlib.deflateRawSync(content, { level: 9 });
    const crc = crc32(content);
    const { head, nameBuf } = this._local(newName, 8, crc, comp, comp.length, content.length);
    this.parts.push(head, nameBuf, comp);
    this.offset += head.length + nameBuf.length + comp.length;
    this._record(newName, mode, 8, crc, comp.length, content.length, offset);
  }

  /** directory entry (stored, size 0) — keeps empty dirs / symlink targets alive */
  addDirectory(newName) {
    this._name(newName);
    const offset = this.offset;
    const { head, nameBuf } = this._local(newName, 0, 0, Buffer.alloc(0), 0, 0);
    this.parts.push(head, nameBuf);
    this.offset += head.length + nameBuf.length;
    this._record(newName, 0o040755, 0, 0, 0, 0, offset);
  }

  addSymlink(newName, target) {
    const content = Buffer.from(target, 'utf8');
    this.addBuffer(newName, content, 0o120777);
  }

  finish() {
    const cdOffset = this.offset;
    const cd = Buffer.concat(this.central);
    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0);
    eocd.writeUInt16LE(0, 4);
    eocd.writeUInt16LE(0, 6);
    eocd.writeUInt16LE(this.names.size, 8);
    eocd.writeUInt16LE(this.names.size, 10);
    eocd.writeUInt32LE(cd.length, 12);
    eocd.writeUInt32LE(cdOffset, 16);
    eocd.writeUInt16LE(0, 20);
    return Buffer.concat([...this.parts, cd, eocd]);
  }
}

/* --------------------------------------------------------------- ICNS read */

function readIcnsSize(icnsPath) {
  const b = fs.readFileSync(icnsPath);
  if (b.toString('ascii', 0, 4) !== 'icns') throw new Error('not an icns file: ' + icnsPath);
  return b;
}

/* ------------------------------------------------------------------ utils */

function sha256(buf) {
  return require('node:crypto').createHash('sha256').update(buf).digest('hex');
}

function walkFiles(dir, base, out) {
  for (const name of fs.readdirSync(dir).sort()) {
    const full = path.join(dir, name);
    const rel = base ? base + '/' + name : name;
    const st = fs.statSync(full);
    if (st.isDirectory()) walkFiles(full, rel, out);
    else out.push({ rel, full, size: st.size });
  }
  return out;
}

function removePlistDict(xml, key) {
  const keyTag = '<key>' + key + '</key>';
  const keyIdx = xml.indexOf(keyTag);
  if (keyIdx < 0) return xml;
  const dictStart = xml.indexOf('<dict>', keyIdx);
  if (dictStart < 0) return xml;
  let depth = 1;
  let i = dictStart + '<dict>'.length;
  while (i < xml.length && depth > 0) {
    const nextOpen = xml.indexOf('<dict>', i);
    const nextClose = xml.indexOf('</dict>', i);
    if (nextClose < 0) throw new Error('unbalanced <dict> for ' + key);
    if (nextOpen >= 0 && nextOpen < nextClose) { depth++; i = nextOpen + '<dict>'.length; }
    else { depth--; i = nextClose + '</dict>'.length; }
  }
  // swallow the whitespace before the key so the plist stays tidy
  let start = keyIdx;
  while (start > 0 && (xml[start - 1] === '\t' || xml[start - 1] === ' ')) start--;
  return xml.slice(0, start) + xml.slice(i);
}

function setPlistString(xml, key, value) {
  const esc = String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const re = new RegExp('(<key>' + key + '</key>\\s*<string>)[^<]*(</string>)');
  if (re.test(xml)) return xml.replace(re, (m, a, b) => a + esc + b);
  return xml.replace('</dict>', '\t<key>' + key + '</key>\n\t<string>' + esc + '</string>\n</dict>');
}

function getPlistString(xml, key) {
  const re = new RegExp('<key>' + key + '</key>\\s*<string>([^<]*)</string>');
  const m = xml.match(re);
  return m ? m[1] : null;
}

/* ---------------------------------------------------------------- inspect */

function cmdInspect(zipPath) {
  const zip = readZip(zipPath);
  console.log('entries: ' + zip.entries.length);
  const top = new Set();
  for (const e of zip.entries) top.add(e.name.split('/')[0]);
  console.log('top-level: ' + [...top].join(', '));
  console.log('\n-- symlinks --');
  for (const e of zip.entries) {
    if (isSymlink(e.mode)) console.log('  ' + e.name + '  ->  ' + entryContent(zip, e).toString('utf8'));
  }
  console.log('\n-- helper apps / icon / default_app --');
  for (const e of zip.entries) {
    if (/Helper[^/]*\.app\/$/.test(e.name) || /Contents\/Resources\/[^/]*\.(icns|asar)$/.test(e.name)) {
      console.log('  mode=' + e.mode.toString(8) + '  ' + e.name);
    }
  }
  console.log('\n-- main Info.plist --');
  const main = zip.entries.find((e) => e.name === 'Electron.app/Contents/Info.plist');
  if (main) console.log(entryContent(zip, main).toString('utf8'));
  console.log('\n-- helper Info.plist names --');
  for (const e of zip.entries) {
    if (/Helper[^/]*\.app\/Contents\/Info\.plist$/.test(e.name)) console.log('  ' + e.name);
  }
  console.log('\n-- Electron.app/Contents listing --');
  const seen = new Set();
  for (const e of zip.entries) {
    if (!e.name.startsWith('Electron.app/Contents/')) continue;
    const parts = e.name.split('/');
    const key = parts.slice(0, 4).join('/');
    if (!seen.has(key)) { seen.add(key); console.log('  ' + key); }
  }
}

/* ------------------------------------------------------------------ build */

function renameHelperApp(rel) {
  const map = [
    ['Contents/Frameworks/Electron Helper.app/', 'Contents/Frameworks/deepDB Helper.app/'],
    ['Contents/Frameworks/Electron Helper (GPU).app/', 'Contents/Frameworks/deepDB Helper (GPU).app/'],
    ['Contents/Frameworks/Electron Helper (Plugin).app/', 'Contents/Frameworks/deepDB Helper (Plugin).app/'],
    ['Contents/Frameworks/Electron Helper (Renderer).app/', 'Contents/Frameworks/deepDB Helper (Renderer).app/']
  ];
  for (const [from, to] of map) if (rel.startsWith(from)) return to + rel.slice(from.length);
  return rel;
}

function renameExecutable(rel) {
  const map = [
    ['Contents/MacOS/Electron', 'Contents/MacOS/' + APP_NAME],
    ['Contents/Frameworks/deepDB Helper.app/Contents/MacOS/Electron Helper', 'Contents/Frameworks/deepDB Helper.app/Contents/MacOS/deepDB Helper'],
    ['Contents/Frameworks/deepDB Helper (GPU).app/Contents/MacOS/Electron Helper (GPU)', 'Contents/Frameworks/deepDB Helper (GPU).app/Contents/MacOS/deepDB Helper (GPU)'],
    ['Contents/Frameworks/deepDB Helper (Plugin).app/Contents/MacOS/Electron Helper (Plugin)', 'Contents/Frameworks/deepDB Helper (Plugin).app/Contents/MacOS/deepDB Helper (Plugin)'],
    ['Contents/Frameworks/deepDB Helper (Renderer).app/Contents/MacOS/Electron Helper (Renderer)', 'Contents/Frameworks/deepDB Helper (Renderer).app/Contents/MacOS/deepDB Helper (Renderer)']
  ];
  for (const [from, to] of map) if (rel === from) return to;
  return rel;
}

function transformPlist(text, rel, helperAppName) {
  let xml = text;
  if (!helperAppName) {
    xml = removePlistDict(xml, 'ElectronAsarIntegrity');
    xml = setPlistString(xml, 'CFBundleExecutable', APP_NAME);
    xml = setPlistString(xml, 'CFBundleName', APP_NAME);
    xml = setPlistString(xml, 'CFBundleDisplayName', APP_NAME);
    xml = setPlistString(xml, 'CFBundleIdentifier', APP_ID);
    xml = setPlistString(xml, 'CFBundleShortVersionString', APP_VERSION);
    xml = setPlistString(xml, 'CFBundleVersion', APP_VERSION);
    xml = setPlistString(xml, 'CFBundleIconFile', ICON_NAME);
    xml = setPlistString(xml, 'LSApplicationCategoryType', CATEGORY);
    xml = setPlistString(xml, 'NSHumanReadableCopyright', COPYRIGHT);
  } else {
    const bin = helperAppName; // e.g. "deepDB Helper (GPU)"
    xml = setPlistString(xml, 'CFBundleExecutable', bin);
    xml = setPlistString(xml, 'CFBundleName', bin);
    xml = setPlistString(xml, 'CFBundleDisplayName', bin);
    const oldId = getPlistString(xml, 'CFBundleIdentifier') || 'com.github.Electron';
    const suffix = oldId.replace(/^com\.github\.Electron/, '');
    xml = setPlistString(xml, 'CFBundleIdentifier', APP_ID + suffix);
  }
  return xml;
}

const HELPER_APPS = [
  ['Contents/Frameworks/deepDB Helper.app/Contents/Info.plist', 'deepDB Helper'],
  ['Contents/Frameworks/deepDB Helper (GPU).app/Contents/Info.plist', 'deepDB Helper (GPU)'],
  ['Contents/Frameworks/deepDB Helper (Plugin).app/Contents/Info.plist', 'deepDB Helper (Plugin)'],
  ['Contents/Frameworks/deepDB Helper (Renderer).app/Contents/Info.plist', 'deepDB Helper (Renderer)']
];

function buildBundle(opts) {
  const zip = readZip(opts.electron);
  const out = new ZipWriter();
  const appPrefix = APP_NAME + '.app/';

  const dropped = [];
  const kept = [];

  for (const e of zip.entries) {
    let name = e.name;

    let relDir = null;
    if (isDir(e.mode)) {
      if (!name.startsWith('Electron.app/')) continue;
      relDir = renameHelperApp(name.slice('Electron.app/'.length));
      out.addDirectory(appPrefix + relDir);
      kept.push(appPrefix + relDir);
      continue;
    }

    // top-level files from the Electron zip
    if (name === 'version') { dropped.push(name); continue; }
    if (name === 'LICENSE') {
      out.addBuffer(appPrefix + 'Contents/Resources/LICENSE.electron.txt', entryContent(zip, e), 0o100644);
      kept.push(name);
      continue;
    }
    if (name === 'LICENSES.chromium.html') {
      kept.push(name);
      if (isSymlink(e.mode)) continue;
      out.addBuffer(appPrefix + 'Contents/Resources/LICENSES.chromium.html', entryContent(zip, e), 0o100644);
      continue;
    }
    if (!name.startsWith('Electron.app/')) { dropped.push(name); continue; }

    let rel = name.slice('Electron.app/'.length);
    rel = renameHelperApp(rel);

    if (rel === 'Contents/Resources/default_app.asar') { dropped.push(name); continue; }
    if (rel === 'Contents/Resources/electron.icns') { dropped.push(name); continue; }

    const full = appPrefix + rel;
    const helper = HELPER_APPS.find(([p]) => p === rel);

    if (isSymlink(e.mode)) {
      const target = entryContent(zip, e).toString('utf8');
      out.addSymlink(full, target);
      kept.push(full + ' -> ' + target);
      continue;
    }

    if (helper) {
      const xml = entryContent(zip, e).toString('utf8');
      const newXml = transformPlist(xml, rel, helper[1]);
      out.addBuffer(full, Buffer.from(newXml, 'utf8'), 0o100644);
      kept.push(full);
      continue;
    }
    if (rel === 'Contents/Info.plist') {
      const xml = entryContent(zip, e).toString('utf8');
      const newXml = transformPlist(xml, rel, null);
      out.addBuffer(full, Buffer.from(newXml, 'utf8'), 0o100644);
      kept.push(full);
      continue;
    }

    const execRel = renameExecutable(rel);
    const mode = (e.mode & 0o111) ? 0o100755 : 0o100644;
    if (execRel !== rel) {
      out.addRawCopy(appPrefix + execRel, e, rawCompressedData(zip, e), 0o100755);
      kept.push(appPrefix + execRel);
      continue;
    }
    // plain file (includes the framework version dirs and symlink-free files)
    out.addRawCopy(full, e, rawCompressedData(zip, e), mode);
    kept.push(full);
  }

  // app payload -> Contents/Resources/app
  const payloadFiles = walkFiles(opts.payload, '', []);
  const SKIP = /^(node_modules|dist|build|mac-bundle|_mac-build|\.git)(\/|$)/;
  const KEEP_ROOT = new Set(['package.json', 'main.js', 'preload.js', 'desktop-mac.css']);
  let payloadCount = 0;
  for (const f of payloadFiles) {
    if (SKIP.test(f.rel)) continue;
    if (f.rel.startsWith('web/') || KEEP_ROOT.has(f.rel)) {
      out.addBuffer(appPrefix + 'Contents/Resources/app/' + f.rel, fs.readFileSync(f.full), 0o100644);
      payloadCount++;
    }
  }

  // icon
  out.addBuffer(appPrefix + 'Contents/Resources/' + ICON_NAME, readIcnsSize(opts.icon), 0o100644);

  // first-run helper + readme
  out.addBuffer('README.txt', Buffer.from(opts.readme, 'utf8'), 0o100644);
  out.addBuffer('First Launch deepDB.command', Buffer.from(opts.firstRun, 'utf8'), 0o100755);

  const buf = out.finish();
  fs.mkdirSync(path.dirname(opts.out), { recursive: true });
  fs.writeFileSync(opts.out, buf);

  console.log('[bundle] ' + opts.arch + ': wrote ' + opts.out);
  console.log('[bundle]   size ' + (buf.length / 1024 / 1024).toFixed(1) + ' MiB, entries ' + out.names.size + ' (payload files ' + payloadCount + ')');
  console.log('[bundle]   electron zip entries kept ' + kept.length + ', dropped ' + dropped.length);
  const symlinks = [...out.names].filter((n) => n.includes('Versions/Current') || n.endsWith('framework/' + path.basename(n)));
  return buf;
}

/* ----------------------------------------------------------------- verify */

function cmdVerify(zipPath, expectedErSha) {
  const zip = readZip(zipPath);
  const byName = new Map(zip.entries.map((e) => [e.name, e]));
  const problems = [];
  const app = APP_NAME + '.app/';

  function want(name) {
    const e = byName.get(name);
    if (!e) problems.push('missing ' + name);
    return e;
  }
  const main = want(app + 'Contents/MacOS/' + APP_NAME);
  if (main && !(main.mode & 0o111)) problems.push('main executable lacks exec bit: mode=' + main.mode.toString(8));
  const plistEntry = want(app + 'Contents/Info.plist');
  if (plistEntry) {
    const xml = entryContent(zip, plistEntry).toString('utf8');
    for (const [key, val] of [
      ['CFBundleExecutable', APP_NAME],
      ['CFBundleIdentifier', APP_ID],
      ['CFBundleIconFile', ICON_NAME]
    ]) {
      if (getPlistString(xml, key) !== val) problems.push('Info.plist ' + key + ' != ' + val + ' (got ' + getPlistString(xml, key) + ')');
    }
    const shortVersion = getPlistString(xml, 'CFBundleShortVersionString');
    const bundleVersion = getPlistString(xml, 'CFBundleVersion');
    if (!shortVersion || !/^\d+\.\d+\.\d+$/.test(shortVersion)) problems.push('bad CFBundleShortVersionString: ' + shortVersion);
    if (bundleVersion !== shortVersion) problems.push('CFBundleVersion != CFBundleShortVersionString');
    if (process.env.DDB_EXPECT_VERSION && shortVersion !== process.env.DDB_EXPECT_VERSION) {
      problems.push('version mismatch: expected ' + process.env.DDB_EXPECT_VERSION + ' got ' + shortVersion);
    }
  }
  const helpers = ['deepDB Helper', 'deepDB Helper (GPU)', 'deepDB Helper (Plugin)', 'deepDB Helper (Renderer)'];
  for (const h of helpers) {
    const p = app + 'Contents/Frameworks/' + h + '.app/';
    const hplist = want(p + 'Contents/Info.plist');
    const hbin = want(p + 'Contents/MacOS/' + h);
    if (hbin && !(hbin.mode & 0o111)) problems.push(h + ' binary lacks exec bit');
    if (hplist) {
      const xml = entryContent(zip, hplist).toString('utf8');
      if (getPlistString(xml, 'CFBundleExecutable') !== h) problems.push(h + ' CFBundleExecutable wrong');
      if (!(getPlistString(xml, 'CFBundleIdentifier') || '').startsWith(APP_ID + '.helper')) problems.push(h + ' CFBundleIdentifier wrong: ' + getPlistString(xml, 'CFBundleIdentifier'));
    }
  }
  const syms = zip.entries.filter((e) => isSymlink(e.mode));
  if (syms.length < 10) problems.push('too few symlink entries: ' + syms.length);
  const allNames = new Set(zip.entries.map((e) => e.name));
  const symlinkTargets = new Map();
  for (const s of syms) symlinkTargets.set(s.name, entryContent(zip, s).toString('utf8'));

  // resolve a path through symlink components (like a real filesystem would)
  function resolves(p, depth) {
    if (depth > 32) return false;
    const parts = p.split('/').filter(Boolean);
    let cur = '';
    for (let i = 0; i < parts.length; i++) {
      cur += (cur ? '/' : '') + parts[i];
      if (symlinkTargets.has(cur)) {
        const target = path.posix.normalize(path.posix.join(path.posix.dirname(cur), symlinkTargets.get(cur)));
        const rest = parts.slice(i + 1).join('/');
        return resolves(rest ? target + '/' + rest : target, depth + 1);
      }
    }
    return allNames.has(cur) || allNames.has(cur + '/') || [...allNames].some((n) => n.startsWith(cur + '/'));
  }

  for (const s of syms) {
    const target = symlinkTargets.get(s.name);
    const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(s.name), target));
    if (!resolves(resolved, 0)) problems.push('dangling symlink ' + s.name + ' -> ' + resolved);
  }
  const current = syms.find((e) => e.name === app + 'Contents/Frameworks/Electron Framework.framework/Versions/Current');
  if (!current) problems.push('missing framework Versions/Current symlink');
  else if (entryContent(zip, current).toString('utf8') !== 'A') problems.push('Versions/Current target != A');
  const fwTop = syms.find((e) => e.name === app + 'Contents/Frameworks/Electron Framework.framework/Electron Framework');
  if (!fwTop) problems.push('missing top-level framework binary symlink');
  const erEntry = want(app + 'Contents/Resources/app/web/assets/js/er.js');
  if (erEntry) {
    const content = entryContent(zip, erEntry);
    if (expectedErSha && sha256(content) !== expectedErSha) problems.push('er.js sha256 mismatch: ' + sha256(content));
    if (!content.toString('utf8').includes('parseAttrCard')) problems.push('er.js has no parseAttrCard (stale snapshot)');
  } else {
    problems.push('web payload missing');
  }
  if (byName.has(app + 'Contents/Resources/default_app.asar')) problems.push('default_app.asar not removed');
  for (const name of byName.keys()) {
    if (name.startsWith('Electron.app/')) { problems.push('leftover Electron.app path: ' + name); break; }
  }
  for (const n of ['README.txt', 'First Launch deepDB.command']) want(n);

  console.log('[verify] entries=' + zip.entries.length + ' symlinks=' + syms.length + ' size=' + (fs.statSync(zipPath).size / 1024 / 1024).toFixed(1) + ' MiB');
  for (const s of syms) console.log('   sym ' + s.name.slice(app.length) + ' -> ' + entryContent(zip, s).toString('utf8'));
  if (problems.length) {
    console.error('[verify] FAILED (' + problems.length + '):');
    for (const p of problems) console.error('   - ' + p);
    process.exitCode = 1;
  } else {
    console.log('[verify] OK — bundle structure looks like a valid renamed Electron.app');
  }
}

/* ------------------------------------------------------------------- main */

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--inspect') out.inspect = argv[++i];
    else if (a === '--verify') out.verify = argv[++i];
    else if (a === '--electron') out.electron = argv[++i];
    else if (a === '--payload') out.payload = argv[++i];
    else if (a === '--icon') out.icon = argv[++i];
    else if (a === '--out') out.out = argv[++i];
    else if (a === '--arch') out.arch = argv[++i];
    else if (a === '--dirname') out.dirname = argv[++i];
    else throw new Error('unknown argument ' + a);
  }
  return out;
}

function main() {
  const args = parseArgs(process.argv);
  if (args.inspect) { cmdInspect(args.inspect); return; }
  if (args.verify) { cmdVerify(args.verify, process.env.DDB_EXPECT_ER_SHA); return; }
  if (!args.electron || !args.payload || !args.icon || !args.out) {
    console.error('usage: node make-mac-bundle.cjs --electron <zip> --payload <desktop-mac> --icon <icns> --out <zip> [--arch arm64]');
    process.exit(1);
  }
  const arch = args.arch || 'arm64';
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(args.payload, 'package.json'), 'utf8'));
    if (pkg && typeof pkg.version === 'string' && /^\d+\.\d+\.\d+$/.test(pkg.version)) APP_VERSION = pkg.version;
  } catch (err) {
    console.warn('[bundle] could not read payload version, using ' + APP_VERSION);
  }
  const readmePath = path.join(args.payload, 'mac-bundle', 'README.txt');
  const firstRunPath = path.join(args.payload, 'mac-bundle', 'First Launch deepDB.command');
  const readme = (fs.existsSync(readmePath) ? fs.readFileSync(readmePath, 'utf8') : 'deepDB for macOS\n').replace(/\r\n/g, '\n');
  const firstRun = (fs.existsSync(firstRunPath) ? fs.readFileSync(firstRunPath, 'utf8') : '#!/bin/bash\necho deepDB\n').replace(/\r\n/g, '\n');
  buildBundle({ electron: args.electron, payload: args.payload, icon: args.icon, out: args.out, arch, readme, firstRun });
}

main();
