/*!
 * boot.js · 启动前主题与强调色（无依赖，最先加载）
 * 由 app.js 的调色板抽出，避免 index.html 内联重复维护。
 */
(function () {
  'use strict';

  const ACCENT_KEY = 'designerdb:v1:accent';
  const ACCENTS = [
    { id: 'red', hex: '#d93b35', ink: '#ffffff' },
    { id: 'orange', hex: '#e06a24', ink: '#ffffff' },
    { id: 'yellow', hex: '#d5a01d', ink: '#1b1505' },
    { id: 'green', hex: '#2f8f57', ink: '#ffffff' },
    { id: 'cyan', hex: '#1d8b9b', ink: '#ffffff' },
    { id: 'blue', hex: '#1b18ff', ink: '#ffffff' },
    { id: 'purple', hex: '#7a3edb', ink: '#ffffff' }
  ];
  const accentOf = function (id) {
    for (let i = 0; i < ACCENTS.length; i++) if (ACCENTS[i].id === id) return ACCENTS[i];
    return ACCENTS[5];
  };
  function readAccent() {
    try { return accentOf(localStorage.getItem(ACCENT_KEY)).id; } catch (err) { return 'blue'; }
  }
  function faviconFor() {
    /* white tile, black N&K — the same mark as the desktop app icon */
    const svg = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'>" +
      "<rect width='512' height='512' rx='112' fill='#ffffff' stroke='#e3dfd3' stroke-width='6'/>" +
      "<text x='256' y='330' text-anchor='middle' font-family='Arial,Helvetica,sans-serif' font-size='190' font-weight='700' letter-spacing='-8' fill='#000000'>N&amp;K</text></svg>";
    return 'data:image/svg+xml,' + encodeURIComponent(svg);
  }
  function applyAccent(id, originEvent) {
    const a = accentOf(id);
    const el = document.documentElement;
    el.setAttribute('data-accent', a.id);
    el.style.setProperty('--accent', a.hex);
    el.style.setProperty('--accent-ink', a.ink);
    try { localStorage.setItem(ACCENT_KEY, a.id); } catch (err) { }
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', a.hex);
    let icon = document.querySelector('link[rel="icon"]');
    if (!icon) {
      icon = document.createElement('link');
      icon.rel = 'icon';
      document.head.appendChild(icon);
    }
    icon.setAttribute('href', faviconFor(a.hex));
  }

  /* ---------------- 设置弹窗 ---------------- */

  init();

  function init() {
    applyAccent(readAccent());
    let motion = 'on';
    try { motion = localStorage.getItem('designerdb:v1:motion') === 'off' ? 'off' : 'on'; } catch (err) { }
    document.documentElement.setAttribute('data-motion', motion);
  }

  window.DDB_BOOT = {
    ACCENT_KEY,
    LANG_KEY: 'designerdb:v1:lang',
    ACCENTS,
    accentOf,
    readAccent,
    faviconFor,
    applyAccent
  };
})();
