'use strict';

/*
 * Regenerates build/icon.png (1024x1024) from the site's own brand assets:
 * the warm paper tile, the black hexagon "DB" mark and the blue dot, using the
 * display font embedded in assets/css/home-alt.css. Run on any desktop OS:
 *
 *   npm run icon
 *
 * (Requires the Electron devDependency from this folder.)
 */

const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const APP_DIR = path.resolve(__dirname, '..');
const SITE_DIR = path.resolve(APP_DIR, '..');
const OUT = path.join(APP_DIR, 'build', 'icon.png');
const SIZE = 1024;

function readDisplayFontFaces() {
  const css = fs.readFileSync(path.join(SITE_DIR, 'assets', 'css', 'home-alt.css'), 'utf8');
  const blocks = css.match(/@font-face\s*\{[^}]*\}/g) || [];
  if (!blocks.length) throw new Error('no @font-face blocks found in home-alt.css');
  return blocks.join('\n');
}

function buildHtml(fontFaces) {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>
${fontFaces}
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; width: ${SIZE}px; height: ${SIZE}px; background: transparent; }
body { display: grid; place-items: center; font-family: 'Anton', Impact, 'Arial Narrow', sans-serif; }
.tile {
  position: relative;
  width: 824px;
  height: 824px;
  border-radius: 186px;
  background: radial-gradient(120% 90% at 28% 12%, #fdfbf5 0%, #f5f2e9 46%, #ebe8dd 100%);
  box-shadow:
    inset 0 0 0 1.5px rgba(18, 18, 14, 0.1),
    inset 0 2px 0 rgba(255, 255, 255, 0.65),
    0 30px 72px rgba(18, 18, 14, 0.26),
    0 8px 22px rgba(18, 18, 14, 0.14);
  display: grid;
  place-items: center;
  overflow: hidden;
}
.tile::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.32), rgba(255, 255, 255, 0) 42%);
  pointer-events: none;
}
.mark {
  position: relative;
  width: 470px;
  height: 470px;
  background: #12120e;
  color: #f4f3ee;
  display: grid;
  place-items: center;
  clip-path: polygon(50% 0%, 100% 24%, 100% 76%, 50% 100%, 0% 76%, 0% 24%);
  transform: translateY(-8px);
}
.mark span {
  font-size: 172px;
  line-height: 1;
  letter-spacing: 0.03em;
  padding-bottom: 0.02em;
}
.dot {
  position: absolute;
  left: 50%;
  bottom: 86px;
  width: 62px;
  height: 62px;
  margin-left: -31px;
  background: #3d43ff;
}
</style>
</head>
<body>
  <div class="tile">
    <div class="mark"><span>DB</span></div>
    <div class="dot"></div>
  </div>
</body>
</html>`;
}

app.whenReady().then(async function () {
  const htmlPath = path.join(os.tmpdir(), 'deepdb-desktop-mac-icon.html');
  fs.writeFileSync(htmlPath, buildHtml(readDisplayFontFaces()), 'utf8');

  const win = new BrowserWindow({
    width: SIZE,
    height: SIZE,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    show: false,
    webPreferences: { offscreen: true }
  });

  try {
    await win.loadFile(htmlPath);
    await new Promise(function (resolve) {
      setTimeout(resolve, 1200);
    });
    const image = await win.webContents.capturePage({ x: 0, y: 0, width: SIZE, height: SIZE });
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, image.toPNG());
    console.log('[deepdb-desktop-mac] wrote ' + OUT + ' ' + fs.statSync(OUT).size + ' bytes');
    app.quit();
  } catch (err) {
    console.error('[deepdb-desktop-mac] icon generation failed:', err);
    app.exit(1);
  }
});

app.on('window-all-closed', function () {
  app.quit();
});
