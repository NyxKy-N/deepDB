'use strict';

/*
 * deepDB desktop shell for macOS.
 *
 * Serves the bundled static site over a loopback HTTP connection (stable
 * origin, so localStorage models survive restarts) and opens it in a frameless
 * Chromium window. macOS details live here: the native application menu, the
 * window lifecycle (closing the window keeps the app alive), the About panel,
 * and window bounds persistence.
 *
 * The same file runs on Windows/Linux for chrome preview and screenshots; the
 * macOS-only paths are gated on process.platform so nothing crashes off a Mac.
 */

const { app, BrowserWindow, Menu, ipcMain, shell, screen } = require('electron');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const APP_TITLE = 'deepDB — database design studio';
const IS_MAC = process.platform === 'darwin';

const BASE_PORT = 17872;
const PORT_TRIES = 20;

const DEFAULT_WIDTH = 1280;
const DEFAULT_HEIGHT = 860;
const MIN_WIDTH = 960;
const MIN_HEIGHT = 640;
const WINDOW_STATE_FILE = 'window-state.json';

const SITE_URL = 'https://deepdbweb.vercel.app/';
const REPO_URL = 'https://github.com/NyxKy-N/deepDB';

app.setName('deepDB');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8'
};

let server = null;
let win = null;
let serverPort = 0;
let stateFile = null;
let saveTimer = 0;

/* ------------------------------- the server ------------------------------- */

function serveFile(root, req, res) {
  let rel;
  try {
    rel = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
  } catch (err) {
    res.writeHead(400);
    res.end('Bad request');
    return;
  }
  if (!rel || rel === '/') rel = '/index.html';
  const file = path.normalize(path.join(root, rel));
  const rootNorm = path.normalize(root);
  if (file !== rootNorm && !file.startsWith(rootNorm + path.sep)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  fs.readFile(file, function (err, buf) {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    });
    res.end(buf);
  });
}

function startServer() {
  const root = path.join(__dirname, 'web');
  return new Promise(function (resolve, reject) {
    server = http.createServer(function (req, res) {
      serveFile(root, req, res);
    });
    let port = BASE_PORT;
    let tries = 0;
    server.on('error', function (err) {
      if (err && err.code === 'EADDRINUSE' && tries < PORT_TRIES) {
        tries += 1;
        port += 1;
        server.listen(port, '127.0.0.1');
        return;
      }
      reject(err);
    });
    server.on('listening', function () {
      resolve(server.address().port);
    });
    server.listen(port, '127.0.0.1');
  });
}

/* ---------------------------- window persistence --------------------------- */

function readWindowState() {
  if (!stateFile) return null;
  try {
    const parsed = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (err) {
    return null;
  }
}

function isVisibleOnSomeDisplay(bounds) {
  return screen.getAllDisplays().some(function (display) {
    const area = display.workArea;
    const overlapX = Math.min(bounds.x + bounds.width, area.x + area.width) - Math.max(bounds.x, area.x);
    const overlapY = Math.min(bounds.y + bounds.height, area.y + area.height) - Math.max(bounds.y, area.y);
    return overlapX >= 160 && overlapY >= 120;
  });
}

function restoreWindowState() {
  const saved = readWindowState();
  if (!saved) return null;
  const width = Number.isFinite(saved.width) ? Math.max(MIN_WIDTH, Math.round(saved.width)) : DEFAULT_WIDTH;
  const height = Number.isFinite(saved.height) ? Math.max(MIN_HEIGHT, Math.round(saved.height)) : DEFAULT_HEIGHT;
  const hasPosition = Number.isFinite(saved.x) && Number.isFinite(saved.y);
  const bounds = { x: Math.round(saved.x), y: Math.round(saved.y), width: width, height: height };
  const positionIsUsable = hasPosition && isVisibleOnSomeDisplay(bounds);
  return {
    width: width,
    height: height,
    x: positionIsUsable ? bounds.x : undefined,
    y: positionIsUsable ? bounds.y : undefined,
    maximized: saved.maximized === true
  };
}

function saveWindowState(target) {
  if (!stateFile || !target || target.isDestroyed()) return;
  try {
    const bounds = target.getBounds();
    /* Content size (rather than window bounds) keeps the saved geometry stable
       across platforms: frameless windows still have invisible resize borders
       on some systems, which would otherwise make the window grow a few pixels
       on every restore. */
    const content = target.getContentSize();
    fs.mkdirSync(path.dirname(stateFile), { recursive: true });
    fs.writeFileSync(
      stateFile,
      JSON.stringify(
        {
          x: bounds.x,
          y: bounds.y,
          width: content[0],
          height: content[1],
          maximized: target.isMaximized()
        },
        null,
        2
      ) + '\n'
    );
  } catch (err) {
    /* window state is a convenience only: never break the app over it */
  }
}

function scheduleStateSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(function () {
    saveWindowState(win);
  }, 500);
}

/* -------------------------------- the window ------------------------------- */

function openExternal(url) {
  if (/^https?:\/\//i.test(url)) shell.openExternal(url);
}

function sendRenderer(channel, payload) {
  if (!win || win.isDestroyed()) return;
  win.webContents.send(channel, payload);
}

function sendWhenLoaded(channel, payload) {
  if (!win || win.isDestroyed()) return;
  if (win.webContents.isLoadingMainFrame()) {
    win.webContents.once('did-finish-load', function () {
      sendRenderer(channel, payload);
    });
    return;
  }
  sendRenderer(channel, payload);
}

function createWindow() {
  const restored = restoreWindowState();
  /* Off a Mac (development preview only) frameless windows report a few extra
     pixels of invisible resize border as their content size; persisting that
     would make the window creep larger on every restart. The size is therefore
     only restored on macOS, where bounds and content match exactly. */
  const persistedSize = IS_MAC && restored;
  const options = {
    title: APP_TITLE,
    width: persistedSize ? restored.width : DEFAULT_WIDTH,
    height: persistedSize ? restored.height : DEFAULT_HEIGHT,
    useContentSize: true,
    minWidth: MIN_WIDTH,
    minHeight: MIN_HEIGHT,
    frame: false,
    roundedCorners: true,
    hasShadow: true,
    backgroundColor: '#f1efe7',
    show: false,
    fullscreenable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
      /* Off a Mac the window has no native frame either, so the same macOS
         chrome is rendered for development previews and screenshots. */
      additionalArguments: IS_MAC ? [] : ['--deepdb-mac-chrome-preview']
    }
  };

  if (restored && Number.isFinite(restored.x) && Number.isFinite(restored.y)) {
    options.x = restored.x;
    options.y = restored.y;
  }

  win = new BrowserWindow(options);

  if (!Number.isFinite(options.x) || !Number.isFinite(options.y)) {
    win.center();
  }

  win.once('ready-to-show', function () {
    if (restored && restored.maximized) win.maximize();
    win.show();
    if (process.env.DEEP_DB_DESKTOP_DEV) win.webContents.openDevTools({ mode: 'detach' });
  });

  win.on('resize', scheduleStateSave);
  win.on('move', scheduleStateSave);
  win.on('maximize', function () {
    scheduleStateSave();
    sendRenderer('desktop:maximized', true);
  });
  win.on('unmaximize', function () {
    scheduleStateSave();
    sendRenderer('desktop:maximized', false);
  });
  win.on('enter-full-screen', function () {
    sendRenderer('desktop:fullscreen', true);
  });
  win.on('leave-full-screen', function () {
    sendRenderer('desktop:fullscreen', false);
  });
  win.on('close', function () {
    saveWindowState(win);
  });
  win.on('closed', function () {
    win = null;
  });

  win.webContents.setWindowOpenHandler(function (details) {
    openExternal(details.url);
    return { action: 'deny' };
  });

  win.webContents.on('will-navigate', function (event, url) {
    const origin = 'http://127.0.0.1:' + serverPort;
    if (url !== origin && !url.startsWith(origin + '/')) {
      event.preventDefault();
      openExternal(url);
    }
  });

  win.loadURL('http://127.0.0.1:' + serverPort + '/index.html');
}

function revealWindow() {
  if (win && !win.isDestroyed()) {
    if (win.isMinimized()) win.restore();
    win.show();
    win.focus();
    return win;
  }
  if (!serverPort) return null;
  createWindow();
  return win;
}

/* --------------------------------- the menu -------------------------------- */

function openSettingsFromMenu() {
  if (!revealWindow()) return;
  sendWhenLoaded('desktop:menu', 'settings');
}

function buildApplicationMenu() {
  const template = [
    {
      label: 'deepDB',
      submenu: [
        { role: 'about', label: 'About deepDB' },
        { type: 'separator' },
        { label: 'Settings…', accelerator: 'Cmd+,', click: openSettingsFromMenu },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide', label: 'Hide deepDB' },
        { role: 'hideOthers', label: 'Hide Others' },
        { role: 'unhide', label: 'Show All' },
        { type: 'separator' },
        { role: 'quit', label: 'Quit deepDB' }
      ]
    },
    {
      label: 'File',
      submenu: [{ role: 'close', label: 'Close Window', accelerator: 'Cmd+W' }]
    },
    {
      /* Deliberately no Undo/Redo roles: a menu accelerator would swallow
         Cmd+Z before the page sees it and break the canvas undo history.
         Text-field undo is shimmed from the preload instead. */
      label: 'Edit',
      submenu: [
        { role: 'cut', label: 'Cut' },
        { role: 'copy', label: 'Copy' },
        { role: 'paste', label: 'Paste' },
        { role: 'selectAll', label: 'Select All' }
      ]
    },
    {
      label: 'View',
      submenu: [{ role: 'togglefullscreen', label: 'Toggle Full Screen' }]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize', label: 'Minimize' },
        { role: 'zoom', label: 'Zoom' },
        { type: 'separator' },
        { role: 'front', label: 'Bring All to Front' }
      ]
    },
    {
      role: 'help',
      submenu: [
        { label: 'deepDB Website', click: function () { openExternal(SITE_URL); } },
        { label: 'GitHub Repository', click: function () { openExternal(REPO_URL); } },
        { type: 'separator' },
        { label: 'Inspired by designerdb.io — not affiliated', enabled: false }
      ]
    }
  ];
  return Menu.buildFromTemplate(template);
}

function setupApplicationMenu() {
  if (IS_MAC || process.env.DEEP_DB_DESKTOP_MENU === '1') {
    Menu.setApplicationMenu(buildApplicationMenu());
  } else {
    /* Chrome preview on Windows/Linux: no native menu bar, the traffic lights
       are still drawn by the preload script. */
    Menu.setApplicationMenu(null);
  }
}

/* ------------------------------- the IPC bridge ---------------------------- */

function registerIpc() {
  ipcMain.on('desktop:window', function (event, action) {
    const target = BrowserWindow.fromWebContents(event.sender);
    if (!target || target.isDestroyed() || target !== win) return;
    if (action === 'minimize') {
      target.minimize();
    } else if (action === 'toggle-maximize') {
      if (target.isMaximized()) target.unmaximize();
      else target.maximize();
    } else if (action === 'close') {
      target.close();
    }
  });

  ipcMain.on('desktop:edit', function (event, action) {
    const target = BrowserWindow.fromWebContents(event.sender);
    if (!target || target.isDestroyed() || target !== win) return;
    if (action === 'redo') target.webContents.redo();
    else target.webContents.undo();
  });
}

/* --------------------------------- lifecycle ------------------------------- */

const gotLock = app.requestSingleInstanceLock();

if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', function () {
    if (!revealWindow()) return;
  });

  app.whenReady().then(function () {
    stateFile = path.join(app.getPath('userData'), WINDOW_STATE_FILE);
    registerIpc();

    if (IS_MAC) {
      app.setAboutPanelOptions({
        applicationName: 'deepDB',
        applicationVersion: app.getVersion(),
        copyright: 'Copyright © 2026 NyxKy',
        credits:
          'Database design tools for students — designER, translatER, noER and designQT.\n' +
          'Inspired by designerdb.io; not affiliated.',
        website: REPO_URL
      });
    }

    setupApplicationMenu();

    startServer()
      .then(function (port) {
        serverPort = port;
        createWindow();
      })
      .catch(function (err) {
        console.error('[deepDB] failed to start local server:', err);
        app.quit();
      });
  });

  app.on('activate', function () {
    revealWindow();
  });

  app.on('window-all-closed', function () {
    /* macOS apps stay alive after the last window closes; everywhere else
       (dev preview) quit so `electron .` exits cleanly. */
    if (!IS_MAC) app.quit();
  });

  app.on('will-quit', function () {
    clearTimeout(saveTimer);
    saveWindowState(win);
    if (server) {
      try {
        server.close();
      } catch (err) {
        /* ignore */
      }
      server = null;
    }
  });
}
