'use strict';

/*
 * desktop/preload.js
 * Adds the in-page window chrome for the frameless desktop window:
 * a glass capsule with minimize / maximize-restore / close buttons, matching
 * the website's floating glass pills, plus draggable regions.
 *
 * Runs sandboxed: only Electron's contextBridge + ipcRenderer are available.
 */

const { contextBridge, ipcRenderer } = require('electron');

const api = {
  minimize: function () { ipcRenderer.send('desktop:window', 'minimize'); },
  toggleMaximize: function () { ipcRenderer.send('desktop:window', 'toggle-maximize'); },
  close: function () { ipcRenderer.send('desktop:window', 'close'); }
};

contextBridge.exposeInMainWorld('deepdbDesktop', api);

const ICONS = {
  minimize: '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2.4 6h7.2" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
  maximize: '<svg viewBox="0 0 12 12" aria-hidden="true"><rect x="2.6" y="2.6" width="6.8" height="6.8" rx="1.2" fill="none" stroke="currentColor" stroke-width="1.35"/></svg>',
  restore: '<svg viewBox="0 0 12 12" aria-hidden="true"><rect x="2.1" y="3.5" width="5.4" height="5.4" rx="1" fill="none" stroke="currentColor" stroke-width="1.25"/><path d="M4.6 2.6h3.3a1.6 1.6 0 0 1 1.6 1.6v3.3" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/></svg>',
  close: '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 3l6 6M9 3l-6 6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>'
};

function buildWindowChrome() {
  document.documentElement.classList.add('deepdb-desktop');

  const css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = 'desktop.css';
  document.head.appendChild(css);

  const capsule = document.createElement('div');
  capsule.className = 'dd-desktop-controls';
  capsule.setAttribute('data-i18n-skip', '');
  capsule.innerHTML =
    '<button type="button" class="dd-desktop-btn" data-act="minimize" aria-label="Minimize" title="Minimize">' + ICONS.minimize + '</button>' +
    '<button type="button" class="dd-desktop-btn" data-act="toggle-maximize" aria-label="Maximize" title="Maximize">' + ICONS.maximize + '</button>' +
    '<button type="button" class="dd-desktop-btn dd-desktop-btn--close" data-act="close" aria-label="Close" title="Close">' + ICONS.close + '</button>';
  document.body.appendChild(capsule);

  const maxBtn = capsule.querySelector('[data-act="toggle-maximize"]');
  function setMaximized(value) {
    if (!maxBtn) return;
    maxBtn.innerHTML = value ? ICONS.restore : ICONS.maximize;
    maxBtn.setAttribute('aria-label', value ? 'Restore' : 'Maximize');
    maxBtn.setAttribute('title', value ? 'Restore' : 'Maximize');
  }

  capsule.addEventListener('click', function (event) {
    const btn = event.target.closest('[data-act]');
    if (!btn) return;
    const act = btn.getAttribute('data-act');
    if (act === 'minimize') api.minimize();
    else if (act === 'toggle-maximize') api.toggleMaximize();
    else if (act === 'close') api.close();
  });

  /* Derive maximize state from the window geometry: resizing to the work area
     is the one signal that arrives reliably for frameless windows. */
  function syncMaximized() {
    var maximized = window.outerWidth >= screen.availWidth - 2 &&
      window.outerHeight >= screen.availHeight - 2;
    setMaximized(maximized);
  }
  window.addEventListener('resize', syncMaximized);
  syncMaximized();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', buildWindowChrome);
} else {
  buildWindowChrome();
}
