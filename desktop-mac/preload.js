'use strict';

/*
 * Preload for the deepDB macOS desktop shell.
 *
 * Draws the macOS traffic lights (the window is frameless) and injects the
 * drag-region stylesheet. It also shims the small set of keyboard behaviours
 * that a macOS app normally gets from menu roles, without letting any of them
 * interfere with the site's own canvas shortcuts (the canvas owns Cmd+Z).
 */

const { contextBridge, ipcRenderer } = require('electron');

const argv = typeof process !== 'undefined' && Array.isArray(process.argv) ? process.argv : [];
const flag =
  argv.indexOf('--deepdb-mac-chrome-preview') !== -1 ||
  (typeof process !== 'undefined' &&
    process.env &&
    process.env.DEEP_DB_DESKTOP_PREVIEW === '1');
const IS_MAC = (typeof process !== 'undefined' && process.platform === 'darwin') || flag;

const CSS_HREF = 'desktop-mac.css';

if (IS_MAC) {
  contextBridge.exposeInMainWorld('deepdbDesktop', {
    platform: 'mac',
    minimize: function () {
      ipcRenderer.send('desktop:window', 'minimize');
    },
    toggleMaximize: function () {
      ipcRenderer.send('desktop:window', 'toggle-maximize');
    },
    close: function () {
      ipcRenderer.send('desktop:window', 'close');
    }
  });
}

/* --------------------------------- helpers -------------------------------- */

function isEditableField(element) {
  if (!element || !element.closest) return false;
  const field = element.closest(
    'input, textarea, [contenteditable=""], [contenteditable="true"], [contenteditable="plaintext-only"]'
  );
  if (!field) return false;
  if (field.tagName === 'INPUT') {
    const type = (field.getAttribute('type') || 'text').toLowerCase();
    return ['button', 'checkbox', 'radio', 'range', 'color', 'file', 'submit', 'reset', 'image'].indexOf(type) === -1;
  }
  if (field.tagName === 'TEXTAREA') return true;
  return field.hasAttribute('contenteditable');
}

function isHomeRoute() {
  const hash = window.location.hash || '';
  return hash === '' || hash === '#' || hash === '#/' || hash === '#/home';
}

function syncRouteClass() {
  document.documentElement.classList.toggle('ddm-home', isHomeRoute());
}

function injectStylesheet() {
  if (document.getElementById('ddm-style')) return;
  const link = document.createElement('link');
  link.id = 'ddm-style';
  link.rel = 'stylesheet';
  link.href = CSS_HREF;
  (document.head || document.documentElement).appendChild(link);
}

/* ----------------------------- traffic lights ----------------------------- */

const DOT_SVG = {
  close:
    '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3.3 3.3 8.7 8.7M8.7 3.3 3.3 8.7"/></svg>',
  minimize: '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 6h6"/></svg>',
  zoom:
    '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3.4 8.6 8.6 3.4M5.9 3.4h2.7v2.7M3.4 5.9v2.7h2.7"/></svg>'
};

function buildTrafficLights() {
  const cluster = document.createElement('div');
  cluster.className = 'ddm-cluster';
  cluster.setAttribute('role', 'group');
  cluster.setAttribute('aria-label', 'Window controls');

  const spec = [
    { action: 'close', cls: 'ddm-close', label: 'Close window' },
    { action: 'minimize', cls: 'ddm-minimize', label: 'Minimize window' },
    { action: 'toggle-maximize', cls: 'ddm-zoom', label: 'Zoom window' }
  ];

  for (const item of spec) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ddm-dot ' + item.cls;
    button.setAttribute('aria-label', item.label);
    button.title = item.label;
    button.innerHTML = DOT_SVG[item.action === 'toggle-maximize' ? 'zoom' : item.action];
    button.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      ipcRenderer.send('desktop:window', item.action);
    });
    cluster.appendChild(button);
  }

  /* macOS zooms on double-clicking the empty part of the controls' area as
     well; double-clicks on the dots themselves keep their single-click action. */
  cluster.addEventListener('dblclick', function (event) {
    if (event.target !== cluster) return;
    event.preventDefault();
    ipcRenderer.send('desktop:window', 'toggle-maximize');
  });

  /* Same gesture on the title-bar strip, matching the system "double-click a
     window's title bar to zoom" preference. Kept to the strip itself so the
     site's own double-click actions (pills, links, canvas) are untouched. */
  document.addEventListener('dblclick', function (event) {
    const strip = event.target && event.target.closest ? event.target.closest('.app-header, .ah-nav') : null;
    if (!strip || event.target !== strip) return;
    event.preventDefault();
    ipcRenderer.send('desktop:window', 'toggle-maximize');
  });

  (document.body || document.documentElement).appendChild(cluster);
  document.documentElement.classList.add('ddm-chrome');
}

/* ------------------------------ mac menu hooks ---------------------------- */

const SETTINGS_SELECTORS = [
  '[data-hdr-settings]',
  '[data-alt-settings]',
  '#settingsBtn',
  '[data-menu-settings]'
];

function clickSettings() {
  let target = null;
  for (const selector of SETTINGS_SELECTORS) {
    const node = document.querySelector(selector);
    if (node && node instanceof HTMLElement) {
      target = node;
      if (node.offsetParent !== null || node.getClientRects().length > 0) break;
    }
  }
  if (target) target.click();
}

ipcRenderer.on('desktop:menu', function (event, action) {
  if (action === 'settings') clickSettings();
});

ipcRenderer.on('desktop:maximized', function (event, maximized) {
  document.documentElement.classList.toggle('ddm-maximized', maximized === true);
});

ipcRenderer.on('desktop:fullscreen', function (event, fullscreen) {
  document.documentElement.classList.toggle('ddm-fullscreen', fullscreen === true);
});

/* --------------------------------- keyboard -------------------------------- */

function isPrimaryModifier(event) {
  return event.metaKey;
}

document.addEventListener(
  'keydown',
  function (event) {
    if (!isPrimaryModifier(event) || event.ctrlKey || event.altKey) return;

    /* Settings… (Cmd+,) — the menu accelerator normally gets this first; the
       handler is the path used when the app runs without a native menu. */
    if (event.key === ',' || event.code === 'Comma') {
      event.preventDefault();
      clickSettings();
      return;
    }

    /* Text-field undo/redo. The canvas keeps its own Cmd+Z because the
       shortcut is only intercepted while an editable field has focus. */
    if (!isEditableField(event.target)) return;
    const key = (event.key || '').toLowerCase();
    if (key === 'z') {
      event.preventDefault();
      ipcRenderer.send('desktop:edit', event.shiftKey ? 'redo' : 'undo');
    } else if (key === 'y') {
      event.preventDefault();
      ipcRenderer.send('desktop:edit', 'redo');
    }
  },
  true
);

/* ----------------------------------- boot ---------------------------------- */

function boot() {
  injectStylesheet();
  syncRouteClass();
  if (IS_MAC) {
    buildTrafficLights();
    const syncFocus = function () {
      document.documentElement.classList.toggle('ddm-inactive', !document.hasFocus());
    };
    window.addEventListener('focus', syncFocus);
    window.addEventListener('blur', function () {
      window.setTimeout(syncFocus, 60);
    });
    syncFocus();
  }
  window.addEventListener('hashchange', syncRouteClass);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
