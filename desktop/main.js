'use strict';

/*
 * deepDB desktop shell: serves the bundled static site over a loopback HTTP
 * connection (stable origin, so localStorage models survive restarts) and
 * opens it in a frameless-ish Chromium window.
 */

const { app, BrowserWindow, Menu, shell } = require('electron');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const APP_TITLE = 'deepDB — database design studio';
const BASE_PORT = 17872;
const PORT_TRIES = 20;

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

function openExternal(url) {
  if (/^https?:\/\//i.test(url)) shell.openExternal(url);
}

function createWindow(port) {
  win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    title: APP_TITLE,
    backgroundColor: '#0c0c0a',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false
    }
  });
  Menu.setApplicationMenu(null);
  const origin = 'http://127.0.0.1:' + port;
  win.once('ready-to-show', function () {
    win.show();
  });
  win.webContents.setWindowOpenHandler(function (details) {
    openExternal(details.url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', function (event, url) {
    if (url !== origin && !url.startsWith(origin + '/')) {
      event.preventDefault();
      openExternal(url);
    }
  });
  win.loadURL(origin + '/index.html');
  win.on('closed', function () {
    win = null;
  });
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', function () {
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.focus();
  });
  app.whenReady().then(function () {
    startServer().then(function (port) {
      createWindow(port);
    }).catch(function (err) {
      console.error('[deepDB] failed to start local server:', err);
      app.quit();
    });
  });
  app.on('window-all-closed', function () {
    app.quit();
  });
  app.on('will-quit', function () {
    if (server) {
      try { server.close(); } catch (err) { /* ignore */ }
      server = null;
    }
  });
}
