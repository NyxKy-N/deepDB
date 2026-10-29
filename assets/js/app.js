/*!
 * app.js · 路由 + 首页 + 设置（语言 / 强调色）
 * 纯静态、无构建，hash 路由：#/ · #/tools/er · #/tools/noer · #/tools/ra · #/tools/translater · #/about
 * 工具脚本按路由懒加载（见 ROUTES.scripts / ensureRoute）
 */
(function () {
  'use strict';

  const DDB = window.DDB;
  const util = DDB.util;
  const ui = DDB.ui;

  const view = document.getElementById('view');
  const nav = document.getElementById('appNav');


const ROUTES = {
    '': { key: 'home', nav: 'home', title: 'deepDB · Database design teaching tools', scripts: ['assets/js/home-alt.js'] },
    'tools/er': { key: 'er', nav: 'er', title: 'designER · Relational design', scripts: ['assets/js/er-schema.js', 'assets/js/er.js'] },
    'tools/noer': { key: 'noer', nav: 'noer', title: 'noER · Document database design', scripts: ['assets/js/noer.js'] },
    'tools/ra': { key: 'ra', nav: 'ra', title: 'designQT basic · Relational algebra', scripts: ['assets/js/ra.js'] },
    'tools/translater': { key: 'translater', nav: 'translater', title: 'translatER · ER → relational schema', scripts: ['assets/js/er-schema.js', 'assets/js/er.js', 'assets/js/translater.js'] }
  };

  ROUTES['about'] = { key: 'about', nav: '', title: 'About · deepDB' };

  /* ---------------- 界面（单一浅色主题） ---------------- */
  /* ---------------- 强调色（实现见 boot.js） ---------------- */
  const BOOT = window.DDB_BOOT || {};
  const ACCENT_KEY = BOOT.ACCENT_KEY || 'designerdb:v1:accent';
  const MOTION_KEY = 'designerdb:v1:motion';
  const ACCENTS = BOOT.ACCENTS || [];
  const accentOf = BOOT.accentOf || function (id) { return ACCENTS[0] || { id: 'blue', hex: '#1b18ff', ink: '#ffffff' }; };
  const readAccent = BOOT.readAccent || function () { return 'blue'; };
  const applyAccent = BOOT.applyAccent || function () { };

  /* ---------------- 设置弹窗 ---------------- */
  function openSettings(invoker) {
    const motion = document.documentElement.getAttribute('data-motion') === 'off' ? 'off' : 'on';
    const seg = function (name, items, cur) {
      return '<div class="seg seg--wide" role="group" aria-label="' + name + '">' + items.map(function (it) {
        return '<button type="button" data-set-' + name + '="' + it.id + '" class="' + (it.id === cur ? 'active' : '') + '" aria-pressed="' + (it.id === cur ? 'true' : 'false') + '">' + it.label + '</button>';
      }).join('') + '</div>';
    };
    const m = ui.modal({
      title: '设置',
      origin: invoker || (document.getElementById('settingsBtn') || null),
      body: [
        '<div class="set-block"><div class="set-label">动画</div>' + seg('motion', [{ id: 'on', label: 'ON' }, { id: 'off', label: 'OFF' }], motion) + '<div class="hint">关闭后页面的过渡与动效停用。</div></div>',
        '<div class="set-block"><div class="set-label">强调色</div><div class="swatches" role="group" aria-label="accent">' +
        ACCENTS.map(function (a) {
          const on = a.id === readAccent();
          return '<button type="button" class="swatch' + (on ? ' active' : '') + '" data-set-accent="' + a.id + '" style="--sw:' + a.hex + '" aria-label="' + a.id + '" aria-pressed="' + (on ? 'true' : 'false') + '"><span></span></button>';
        }).join('') +
        '</div><div class="hint">只改变按钮、链接与高亮等强调色，不影响界面底色。</div></div>'
      ].join(''),
      actions: [{ label: '完成', primary: true, onClick: function (close) { close(); } }]
    });
    m.addEventListener('click', function (e) {
      const mb2 = e.target.closest('[data-set-motion]');
      if (mb2) {
        const next = mb2.getAttribute('data-set-motion');
        document.documentElement.setAttribute('data-motion', next);
        try { localStorage.setItem(MOTION_KEY, next); } catch (err) { }
        m.querySelectorAll('[data-set-motion]').forEach(function (b) {
          const on = b.getAttribute('data-set-motion') === next;
          b.classList.toggle('active', on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        return;
      }
      const ab = e.target.closest('[data-set-accent]');
      if (ab) {
        const nextAccent = ab.getAttribute('data-set-accent');
        applyAccent(nextAccent, e);
        m.querySelectorAll('[data-set-accent]').forEach(function (b) {
          const on = b.getAttribute('data-set-accent') === nextAccent;
          b.classList.toggle('active', on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        return;
      }
    });
  }

  /* ---------------- 首页 ---------------- */

  function parseRoute() {
    const raw = String(location.hash || '').replace(/^#\/?/, '').replace(/\/+$/, '');
    return ROUTES[raw] || ROUTES[''];
  }

  function syncPillActive(route) {
    const pill = document.querySelector('.app-header .header-right [data-nav-pill]');
    if (!pill) return;
    const navKey = route && route.nav;
    Array.prototype.forEach.call(pill.querySelectorAll('a.ddq-tool'), function (a) {
      const m = /#\/tools\/([a-z]+)/.exec(a.getAttribute('href') || '');
      a.classList.toggle('is-active', !!(m && navKey && m[1] === navKey));
    });
  }

  function setActiveNav(route) {
    if (!nav) return;
    nav.querySelectorAll('a[data-nav]').forEach(function (a) {
      a.classList.toggle('active', a.getAttribute('data-nav') === route.nav);
    });
    syncPillActive(route);
  }
  let altUnmount = null;

  /* ---------------- 按路由懒加载工具脚本 ---------------- */
  const SCRIPT_CACHE = {};
  function loadScript(src) {
    if (!SCRIPT_CACHE[src]) {
      SCRIPT_CACHE[src] = new Promise(function (resolve, reject) {
        const el = document.createElement('script');
        el.src = src;
        el.async = false;
        el.onload = function () { resolve(src); };
        el.onerror = function () { reject(new Error('load failed: ' + src)); };
        document.head.appendChild(el);
      });
    }
    return SCRIPT_CACHE[src];
  }
  function ensureRoute(route) {
    const list = (route && route.scripts) || [];
    return list.reduce(function (p, src) {
      return p.then(function () { return loadScript(src); });
    }, Promise.resolve());
  }
  function routeReady(route) {
    if (route.key === 'home') return !!window.DDB_HOMEALT;
    if (route.key === 'about') return true;
    return !!(DDB.tools && DDB.tools[route.key]);
  }

  function showHome() {
    if (!window.DDB_HOMEALT) {
      view.innerHTML = '<div class="home"><div class="err-note">Home page failed to load.</div></div>';
      return;
    }
    view.innerHTML = window.DDB_HOMEALT.html();
    view.classList.remove('view--tool');
    view.classList.add('view--althome');
    if (altUnmount) { try { altUnmount(); } catch (e) {} altUnmount = null; }
    altUnmount = window.DDB_HOMEALT.mount(view);
  }


  /* ---------------- About page ---------------- */
  function showAbout() {
    if (altUnmount) { try { altUnmount(); } catch (e) {} altUnmount = null; }
    view.classList.remove('view--tool', 'view--althome');
    view.innerHTML = [
      '<div class="aboutpage">',
      '  <section class="about-hero">',
      '    <a class="btn btn--sm about-back" href="#/"><span>← HOME</span></a>',
      '    <div class="about-label">( ABOUT DEEPDB )</div>',
      '    <h1 class="about-title">ABOUT</h1>',
      '    <p class="about-lead">A tiny database-design studio in the browser. Four tools, three languages, one theme — drawn by one author and helped by one very patient whale.</p>',
      '  </section>',
      '  <div class="about-grid">',
      '    <article class="about-card">',
      '      <div class="about-card-head">',
      '        <img class="about-avatar" src="assets/img/avatar.jpg" alt="NyxKy" loading="lazy">',
      '        <div><div class="about-label">AUTHOR</div><h2>NyxKy</h2></div>',
      '      </div>',
      '      <p>Designs and codes deepDB. Draws ER models for fun, then argues with the foreign-key checker.</p>',
      '      <div class="about-tags"><span>DESIGN</span><span>FRONT-END</span><span>ER MODELLING</span></div>',
      '      <div class="about-links">',
      '        <a href="https://github.com/NyxKy-N" target="_blank" rel="noopener"><span>GITHUB ↗</span></a>',
      '        <a href="https://github.com/NyxKy-N/deepDB" target="_blank" rel="noopener"><span>REPO ↗</span></a>',
      '      </div>',
      '    </article>',
      '    <article class="about-card">',
      '      <div class="about-card-head">',
      '        <img class="about-avatar dark" src="assets/img/deepseek.png" alt="Deepseek" loading="lazy">',
      '        <div><div class="about-label">HELPER</div><h2>Deepseek</h2></div>',
      '      </div>',
      '      <p>Mascot, rubber duck and co-author of the long patches. Stays calm while the layout gets rebuilt for the ninth time.</p>',
      '      <div class="about-tags"><span>CODE</span><span>COPY</span><span>DESIGN FEEDBACK</span></div>',
      '      <div class="about-links">',
      '        <a href="https://www.deepseek.com" target="_blank" rel="noopener"><span>DEEPSEEK ↗</span></a>',
      '      </div>',
      '    </article>',
      '  </div>',
      '  <div class="about-table">',
      '    <div class="about-row"><b>WHAT IT IS</b><span>A pure-static teaching site for relational and document models — no build step, no server, no upload. Models stay in your browser.</span></div>',,
      '    <div class="about-row"><b>STACK</b><span>Vanilla HTML / CSS / JavaScript. Classic scripts, localStorage drafts, CSS-first motion. Fonts: Anton, Space Grotesk, Instrument Serif.</span></div>',
      '    <div class="about-row"><b>INSPIRATION</b><span>Tool set modelled on <a href="https://designerdb.io/#tools" target="_blank" rel="noopener">designerdb.io</a>; the editorial home language nods to <a href="https://altshift.agency/" target="_blank" rel="noopener">altshift.agency</a>.</span></div>',
      '    <div class="about-row"><b>SOURCE</b><span><a href="https://github.com/NyxKy-N/deepDB" target="_blank" rel="noopener">github.com/NyxKy-N/deepDB</a> · <a href="https://deepdbweb.vercel.app/#/" target="_blank" rel="noopener">deepdbweb.vercel.app</a></span></div>',
      '    <div class="about-row"><b>LICENCE</b><span>© 2026 deepDB® — models designed differently. Content and code by the author; helper credits to Deepseek.</span></div>',
      '  </div>',
      '</div>',
    ].join('\n');
    window.scrollTo(0, 0);
  }

  /* ---------------- Global menu drawer ---------------- */
  let menuPinned = false;
  let menuCloseTimer = 0;
  let menuDrawer = null;
  let hdrPinned = false;
  let menuBound = false;

  function buildMenuDrawer() {
    if (menuDrawer) return menuDrawer;
    const el = document.createElement('div');
    el.className = 'dd-menu';
    el.id = 'ddMenu';
    el.innerHTML = [
      '<div class="dd-menu-bd" data-menu-close></div>',
      '<nav class="dd-menu-panel" aria-label="Menu">',
      '  <div class="dd-menu-top"><span class="dd-mono">( MENU )</span><button type="button" class="dd-menu-x" data-menu-close>CLOSE ✕</button></div>',
      '  <div class="dd-menu-links">',
      '    <a class="dd-link" href="#/tools/er" data-menu-nav><span class="dd-num">01</span><b>designER</b><i>↗</i></a>',
      '    <a class="dd-link" href="#/tools/translater" data-menu-nav><span class="dd-num">02</span><b>translatER</b><i>↗</i></a>',
      '    <a class="dd-link" href="#/tools/noer" data-menu-nav><span class="dd-num">03</span><b>noER</b><i>↗</i></a>',
      '    <a class="dd-link" href="#/tools/ra" data-menu-nav><span class="dd-num">04</span><b>designQT</b><i>↗</i></a>',,
      '  </div>',
      '  <div class="dd-menu-foot">',
      '    <button type="button" class="dd-link" data-menu-settings><span class="dd-num">05</span><b>Settings</b><i>↗</i></button>',
      '    <a class="dd-link" href="#/about" data-menu-nav><span class="dd-num">06</span><b>About</b><i>↗</i></a>',
      '    <div class="dd-mono dd-menu-meta"><span>AUTHOR · NYXKY</span><span>HELPER · DEEPSEEK</span></div>',
      '  </div>',
      '</nav>',
    ].join('\n');
    document.body.appendChild(el);
    menuDrawer = el;
    var panel = el.querySelector('.dd-menu-panel');
    panel.addEventListener('pointerenter', function () {
      if (isTouchLike()) return;
      window.clearTimeout(menuCloseTimer);
    });
    panel.addEventListener('pointerleave', function () {
      if (menuPinned) return;
      if (isTouchLike()) return;
      window.clearTimeout(menuCloseTimer);
      menuCloseTimer = window.setTimeout(function () { if (!menuPinned) closeMenuDrawer(false); }, 240);
    });
    el.addEventListener('click', function (e) {
      const close = e.target.closest('[data-menu-close]');
      const nav = e.target.closest('[data-menu-nav]');
      const set = e.target.closest('[data-menu-settings]');
      if (close) { closeMenuDrawer(true); return; }
      if (nav) { closeMenuDrawer(true); return; }
      if (set) {
        e.preventDefault();
        openSettings(set);
        /* keep the drawer until the settings modal has shrunk back to this row */
        const h = function () { document.removeEventListener("ddb:modal-close", h); closeMenuDrawer(true); };
        document.addEventListener("ddb:modal-close", h);
      }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (document.querySelector('#modalHost .modal-backdrop')) return; /* let the modal close first */
      if (menuDrawer && menuDrawer.classList.contains('on')) closeMenuDrawer(true);
    });
    return el;
  }

  function openMenuDrawer(trigger) {
    const el = buildMenuDrawer();
    window.clearTimeout(menuCloseTimer);
    const panel = el.querySelector('.dd-menu-panel');
    const r = trigger && trigger.getBoundingClientRect ? trigger.getBoundingClientRect() : null;
    const margin = 12;
    const pw = Math.min(430, window.innerWidth - margin * 2);
    const maxRight = Math.max(margin, window.innerWidth - pw - margin);
    if (r) {
      const right = Math.min(maxRight, Math.max(margin, window.innerWidth - r.left + 10));
      panel.style.right = right + 'px';
      panel.style.left = 'auto';
    } else {
      panel.style.right = maxRight + 'px';
    }
    el.classList.add('on');
    el.setAttribute('aria-hidden', 'false');
    el._trigger = trigger || null;
    if (trigger && trigger.setAttribute) trigger.setAttribute('aria-expanded', 'true');
    const ph = panel.offsetHeight || 460;
    let top = r ? r.top : margin;
    top = Math.min(Math.max(margin, top), Math.max(margin, window.innerHeight - ph - margin));
    panel.style.top = top + 'px';
    /* m13662: animate the drawer in from the Menu button itself */
    const pr = panel.getBoundingClientRect();
    if (pr.width && pr.height && r) {
      const ox = Math.max(0, Math.min(100, ((r.left + r.width / 2) - pr.left) / pr.width * 100));
      const oy = Math.max(0, Math.min(100, ((r.top + r.height / 2) - pr.top) / pr.height * 100));
      panel.style.setProperty('--dd-menu-ox', ox + '%');
      panel.style.setProperty('--dd-menu-oy', oy + '%');
    }
    document.body.classList.add('dd-menu-open');
  }

  function closeMenuDrawer(force) {
    if (!menuDrawer) return;
    const el = menuDrawer;
    if (!force && menuPinned) return;
    menuPinned = false;
    el.classList.remove('on');
    el.setAttribute('aria-hidden', 'true');
    if (el._trigger && el._trigger.setAttribute) el._trigger.setAttribute('aria-expanded', 'false');
    el._trigger = null;
    document.body.classList.remove('dd-menu-open');
  }

  function isTouchLike() {
    return (window.matchMedia && window.matchMedia("(hover: none), (pointer: coarse)").matches) || window.innerWidth <= 900;
  }

  function bindMenuTriggers() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-menu-trigger]'), function (btn) {
      if (btn.closest('[data-nav-pill]') || btn.closest('[data-ahmenu]')) return;
      if (btn.__ddMenuBound) return;
      btn.__ddMenuBound = true;
      /* Click-only: hovering a trigger must not pop the second-level drawer open. */
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        const open = menuDrawer && menuDrawer.classList.contains('on');
        if (open && menuPinned) { closeMenuDrawer(true); return; }
        menuPinned = true;
        openMenuDrawer(btn);
      });
    });
  }

  function ensureHeaderMenu() {
    const right = document.querySelector('.app-header .header-right');
    if (!right) return;
    if (right.querySelector('[data-nav-pill]')) return;
    right.innerHTML =
      '<div class="dd-nav-pill" data-nav-pill>' +
      '  <a class="ddq ddq-tool" href="#/tools/er"><span>designER</span><i>↗</i></a>' +
      '  <a class="ddq ddq-tool" href="#/tools/translater"><span>translatER</span><i>↗</i></a>' +
      '  <a class="ddq ddq-tool" href="#/tools/noer"><span>noER</span><i>↗</i></a>' +
      '  <a class="ddq ddq-tool" href="#/tools/ra"><span>designQT</span><i>↗</i></a>' +
      '  <button type="button" class="ddq" data-hdr-settings><span>Settings</span><i>↗</i></button>' +
      '  <a class="ddq" href="#/about"><span>About</span><i>↗</i></a>' +
      '  <div class="dd-lang" role="group" aria-label="Language · 语言 · Lingua">' +
      '    <button type="button" data-set-lang="en">EN</button>' +
      '    <button type="button" data-set-lang="zh">中</button>' +
      '    <button type="button" data-set-lang="it">IT</button>' +
      '  </div>' +
      '  <button type="button" class="dd-menu-btn" data-menu-trigger aria-expanded="false"><span>Menu</span><i class="dd-dots"><b></b><b></b></i></button>' +
      '</div>';
    const pill = right.querySelector('[data-nav-pill]');
    const mb = pill.querySelector('[data-menu-trigger]');
    const setBtn = pill.querySelector('[data-hdr-settings]');
    const setOpen = function (v) {
      hdrPinned = v;
      pill.classList.toggle('open', v);
      mb.setAttribute('aria-expanded', v ? 'true' : 'false');
    };
    if (setBtn) setBtn.addEventListener('click', function () {
      /* keep the capsule unfolded until the Settings modal has shrunk back */
      hdrPinned = true;
      pill.classList.add('open');
      const h = function () {
        document.removeEventListener('ddb:modal-close', h);
        hdrPinned = false;
        pill.classList.remove('open');
      };
      document.addEventListener('ddb:modal-close', h);
      openSettings(setBtn);
    });
    pill.addEventListener('pointerenter', function () { if (isTouchLike()) return; if (!hdrPinned) pill.classList.add('open'); });
    pill.addEventListener('pointerleave', function () { if (isTouchLike()) return; if (!hdrPinned) pill.classList.remove('open'); });
    mb.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      /* desktop: unfold the pill in place; phones/tablets: the same drawer as before */
      if (window.innerWidth <= 900) {
        if (menuDrawer && menuDrawer.classList.contains('on')) { closeMenuDrawer(true); }
        else { openMenuDrawer(mb); }
        return;
      }
      setOpen(!pill.classList.contains('open'));
    });
    Array.prototype.forEach.call(pill.querySelectorAll('a.ddq'), function (a) {
      a.addEventListener('click', function () { setOpen(false); });
    });
    document.addEventListener('click', function (e) {
      if (!pill.classList.contains('open') || hdrPinned !== true) return;
      if (pill.contains(e.target)) return;
      /* a modal opened from the capsule owns the screen: keep it unfolded until it shrank back */
      if (document.querySelector('#modalHost .modal-backdrop')) return;
      setOpen(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape' || !pill.classList.contains('open')) return;
      if (document.querySelector('#modalHost .modal-backdrop')) return; /* let the modal close first */
      setOpen(false);
    });
    if (window.DDB_I18N && window.DDB_I18N.retranslate) window.DDB_I18N.retranslate(pill);
    syncPillActive(parseRoute());
  }

  /* 两侧面板：可折叠 / 展开，状态跨工具与刷新保留 */
  const PANEL_KEY = (DDB.keys && DDB.keys.panels) || 'designerdb:v1:panels';

  function readPanels() {
    try { return JSON.parse(localStorage.getItem(PANEL_KEY) || '{}') || {}; } catch (err) { return {}; }
  }
  function writePanels(p) {
    try { localStorage.setItem(PANEL_KEY, JSON.stringify(p)); } catch (err) { }
  }
  function applyPanels(body, p) {
    var wasLeftCollapsed = body.classList.contains('lb-collapsed');
    body.classList.toggle('lb-collapsed', !!p.left);
    body.classList.toggle('rb-collapsed', !!p.right);
    /* sidebar resize */
    if (body.style) {
      if (p.left) {
        body.style.setProperty('--lbw', '0px');
      } else if (wasLeftCollapsed || !body.style.getPropertyValue('--lbw')) {
        var savedW = Number(localStorage.getItem(LBW_KEY) || 0);
        var w2 = savedW >= LBW_MIN && savedW <= LBW_MAX ? savedW : 224;
        body.style.setProperty('--lbw', w2 + 'px');
      }
    }
    const phone = window.innerWidth <= 640;
    const lb = body.querySelector('.side-toggle[data-side="left"]');
    const rb = body.querySelector('.side-toggle[data-side="right"]');
    if (lb) {
      lb.textContent = phone ? (p.left ? '↑' : '↓') : (p.left ? '›' : '‹');
      lb.setAttribute('aria-pressed', p.left ? 'true' : 'false');
      lb.setAttribute('aria-label', p.left ? '展开左栏' : '隐藏左栏');
      lb.setAttribute('title', p.left ? '展开左栏' : '隐藏左栏');
      if (window.DDB_I18N && window.DDB_I18N.retranslate) window.DDB_I18N.retranslate(lb);
    }
    if (rb) {
      rb.textContent = phone ? (p.right ? '↑' : '↓') : (p.right ? '‹' : '›');
      rb.setAttribute('aria-pressed', p.right ? 'true' : 'false');
      rb.setAttribute('aria-label', p.right ? '展开右栏' : '隐藏右栏');
      rb.setAttribute('title', p.right ? '展开右栏' : '隐藏右栏');
      if (window.DDB_I18N && window.DDB_I18N.retranslate) window.DDB_I18N.retranslate(rb);
    }
  }
  const QUICK_ACTS = ['add-entity', 'add-rel', 'add-attr-sel', 'add-col', 'add-field', 'ref-mode', 'add-op'];

  function wrapAccordions(box) {
    const left = box.querySelector('.tool-left');
    if (!left || left.dataset.accordion === '1') return;
    left.dataset.accordion = '1';
    const bodies = Array.prototype.slice.call(left.querySelectorAll('.panel-body'));
    bodies.forEach(function (panel) {
      if (panel.closest('.m-acc')) return;
      const title = panel.querySelector('.panel-title');
      const label = title ? (title.firstChild && title.firstChild.textContent.trim() || title.textContent.trim()) : '选项';
      const acc = document.createElement('div');
            acc.className = 'm-acc';
            const head = document.createElement('button');
            head.type = 'button';
            head.className = 'm-acc-head';
            head.setAttribute('aria-expanded', 'false');
            const labelSpan = document.createElement('span');
            labelSpan.textContent = label;
            const chevron = document.createElement('i');
            head.appendChild(labelSpan);
            head.appendChild(chevron);
            const wrapBody = document.createElement('div');
            wrapBody.className = 'm-acc-body';
            const inner = document.createElement('div');
            Array.prototype.slice.call(panel.childNodes).forEach(function (n) {
              if (n === title) return;
              inner.appendChild(n);
            });
            wrapBody.appendChild(inner);
            acc.appendChild(head);
            acc.appendChild(wrapBody);
            const open0 = window.innerWidth > 1024;
            acc.classList.toggle('open', open0);
            head.setAttribute('aria-expanded', open0 ? 'true' : 'false');
            head.addEventListener('click', function () {
              const next = !acc.classList.contains('open');
              acc.classList.toggle('open', next);
              head.setAttribute('aria-expanded', next ? 'true' : 'false');
            });
            panel.appendChild(acc);
    });
  }

  function buildQuickBar(box) {
    const canvas = box.querySelector('.tool-canvas');
    const bar = box.querySelector('.tool-bar');
    if (!canvas || !bar || canvas.querySelector('.m-quick')) return;
    const picks = [];
    QUICK_ACTS.forEach(function (act) {
      const src = bar.querySelector('[data-act="' + act + '"]');
      if (src) picks.push(src);
    });
    if (!picks.length) {
      // 关系代数：RA 的操作按钮都在左栏 .ra-ops 中，取前四个
      const ops = box.querySelectorAll('.ra-ops [data-act="add-op"]');
      Array.prototype.slice.call(ops, 0, 4).forEach(function (b) { picks.push(b); });
    }
    if (!picks.length) return;
    const quick = document.createElement('div');
    quick.className = 'm-quick';
    quick.setAttribute('role', 'toolbar');
    quick.setAttribute('aria-label', '快捷操作');
    picks.forEach(function (src) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn--sm ' + (src.classList.contains('btn--primary') ? 'btn--primary' : '');
      btn.textContent = src.textContent.trim();
      btn.addEventListener('click', function () { src.click(); });
      quick.appendChild(btn);
    });
    canvas.appendChild(quick);
  }

  const LBW_KEY = (DDB.keys && DDB.keys.lbw) || 'designerdb:v1:lbw';
  const LBW_MIN = 224;
  const LBW_MAX = 420;
  function setupSideResize(body) {
    const left = body.querySelector('.tool-left');
    if (!left || left.querySelector('.lb-resize')) return;
    const saved = Number(localStorage.getItem(LBW_KEY) || 0);
    if (saved >= LBW_MIN && saved <= LBW_MAX) body.style.setProperty('--lbw', saved + 'px');
    const grip = document.createElement('div');
    grip.className = 'lb-resize';
    grip.setAttribute('role', 'separator');
    grip.setAttribute('aria-orientation', 'vertical');
    grip.setAttribute('title', '拖动调整左栏宽度');
    left.appendChild(grip);
    let start = null;
    grip.addEventListener('pointerdown', function (e) {
      if (window.innerWidth <= 1024) return;
      start = { x: e.clientX, w: left.getBoundingClientRect().width };
      body.classList.add('lb-resizing');
      grip.classList.add('dragging');
      grip.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    grip.addEventListener('pointermove', function (e) {
      if (!start) return;
      const next = Math.max(LBW_MIN, Math.min(LBW_MAX, Math.round(start.w + (e.clientX - start.x))));
      body.style.setProperty('--lbw', next + 'px');
      window.dispatchEvent(new Event('resize'));
    });
    function end(e) {
      if (!start) return;
      start = null;
      body.classList.remove('lb-resizing');
      grip.classList.remove('dragging');
      const raw = parseInt(body.style.getPropertyValue('--lbw'), 10);
      const w = Number.isFinite(raw) ? raw : Math.round(left.getBoundingClientRect().width);
      try { localStorage.setItem(LBW_KEY, String(w)); } catch (err) {}
    }
    grip.addEventListener('pointerup', end);
    grip.addEventListener('pointercancel', end);
  }


  /* 手机底部抽屉：横条手柄（向上拉展开，向下拉关闭） */
  function setupSheetGrips(box, body) {
    ['left', 'right'].forEach(function (side) {
      const panel = body.querySelector('.tool-' + side);
      if (!panel || panel.querySelector('.sheet-grip')) return;
      const grip = document.createElement('div');
      grip.className = 'sheet-grip';
      grip.setAttribute('role', 'button');
      grip.setAttribute('tabindex', '0');
      grip.setAttribute('aria-label', '\u5411\u4e0b\u62d6\u52a8\u6536\u8d77\u9762\u677f');
      grip.innerHTML = '<i></i>';
      panel.insertBefore(grip, panel.firstChild);

      function commit(open) {
        if (!open) body.classList.remove('sheet-expanded');
        const p = readPanels();
        p[side] = !open;
        if (window.innerWidth <= 1024 && open) {
          p[side === 'left' ? 'right' : 'left'] = true;
        }
        writePanels(p);
        applyPanels(body, p);
        window.dispatchEvent(new Event('resize'));
      }

      let startY = 0;
      let dy = 0;
      let active = false;
      grip.addEventListener('pointerdown', function (e) {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        active = true;
        startY = e.clientY;
        dy = 0;
        grip.classList.add('is-dragging');
        try { grip.setPointerCapture(e.pointerId); } catch (err) {}
        e.preventDefault();
      });
      grip.addEventListener('pointermove', function (e) {
        if (!active) return;
        dy = e.clientY - startY;
        body.classList.add('sheet-dragging');
        if (panel) {
          const maxDown = Math.max(120, panel.getBoundingClientRect().height);
          const clamped = Math.max(0, Math.min(dy, maxDown));
          panel.style.transform = 'translateY(' + clamped + 'px)';
        }
        grip.style.transform = 'translateY(' + (dy < 0 ? Math.max(dy / 4, -12) : 0) + 'px)';
      });
      function end() {
        if (!active) return;
        active = false;
        body.classList.remove('sheet-dragging');
        grip.classList.remove('is-dragging');
        grip.style.transform = '';
        if (panel) panel.style.transform = '';
        if (dy >= 22) commit(false);
        dy = 0;
      }
      grip.addEventListener('pointerup', end);
      grip.addEventListener('pointercancel', end);
      grip.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return;
        e.preventDefault();
        const p = readPanels();
        commit(!!p[side]);
      });
    });
  }

  function decorateTool(box) {
    const body = box.querySelector('.tool-body');
    const canvas = box.querySelector('.tool-canvas');
    if (!body || !canvas || canvas.querySelector('.side-toggles')) return;
    const wrap = document.createElement('div');
    wrap.className = 'side-toggles';
    wrap.innerHTML =
      '<button type="button" class="side-toggle st-left" data-side="left" aria-pressed="false" aria-label="隐藏左栏" title="隐藏左栏">‹</button>' +
      '<button type="button" class="side-toggle st-right" data-side="right" aria-pressed="false" aria-label="隐藏右栏" title="隐藏右栏">›</button>';
    canvas.appendChild(wrap);
    const panels = readPanels();
    // 手机上默认收起两侧面板，避免一进来就挡住画布
    if (window.innerWidth <= 860) {
      if (panels.left === undefined) panels.left = true;
      if (panels.right === undefined) panels.right = true;
    }
    applyPanels(body, panels);
    if (window.innerWidth <= 1024) {
      // 平板 / 手机：两侧抽屉默认收起，靠 ‹ › 打开
      panels.left = true;
      panels.right = true;
      applyPanels(body, panels);
      writePanels(panels);
    }
    wrapAccordions(box);
    buildQuickBar(box);
    setupSideResize(body);
    setupSheetGrips(box, body);
    wrap.addEventListener('click', function (e) {
      const btn = e.target.closest('.side-toggle');
      if (!btn) return;
      e.preventDefault();
      const p = readPanels();
      const side = btn.getAttribute('data-side');
      p[side] = !p[side];
      /* 平板 / 手机上同时只开一个抽屉：开一边自动收起另一边 */
      if (window.innerWidth <= 1024 && p[side] === false) {
        p[side === 'left' ? 'right' : 'left'] = true;
      }
      body.classList.remove('sheet-expanded');
      writePanels(p);
      applyPanels(body, p);
      window.dispatchEvent(new Event('resize'));
    });
  }

  const cache = {};

  function showTool(route) {
    let box = cache[route.key];
    if (!box) {
      box = document.createElement('div');
      box.className = 'view-tool';
      box.style.height = '100%';
      view.appendChild(box);
      cache[route.key] = box;
      const tool = DDB.tools[route.key];
      if (!tool || !tool.mount) {
        box.innerHTML = '<div class="home"><div class="err-note">该工具尚未加载：' + util.esc(route.key) + '。请检查 assets/js 是否完整。</div></div>';
        return;
      }
      try {
        tool.mount(box, { mode: 'full' });
        decorateTool(box);
      } catch (err) {
        console.error('[deepDB] mount ' + route.key + ' failed', err);
        box.innerHTML = '<div class="home"><div class="err-note">工具初始化失败：' + util.esc(String(err && err.message || err)) + '</div></div>';
      }
    } else {
      view.appendChild(box);
    }
    view.classList.add('view--tool');
    box.classList.remove('is-enter');
    void box.offsetWidth;
    box.classList.add('is-enter');
    clearTimeout(box._enterTimer);
    box._enterTimer = setTimeout(function () { box.classList.remove('is-enter'); }, 520);
    window.scrollTo(0, 0);
    window.dispatchEvent(new Event('resize'));
  }

  let revealTicking = false;
  let revealHome = null;



  function render() {
    const route = parseRoute();
    if (!routeReady(route)) {
      view.innerHTML = '<div class="router-loading" role="status">Loading…</div>';
      ensureRoute(route).then(renderNow, function (err) {
        console.error('[deepDB] route load failed', err);
        view.innerHTML = '<div class="home"><div class="err-note">Page failed to load. Please check assets/js files.</div></div>';
      });
      return;
    }
    renderNow();
  }

  function renderNow() {
    const route = parseRoute();
    if (altUnmount) { try { altUnmount(); } catch (e) {} altUnmount = null; }
    view.classList.remove('view--althome');
    document.body.setAttribute('data-route', route.key);
    document.body.classList.add('dd-ed');
    if (menuDrawer) closeMenuDrawer(true);
    document.title = route.title;
    setActiveNav(route);
    while (view.firstChild) view.removeChild(view.firstChild);
    if (route.key === 'home') showHome();
    else if (route.key === 'about') showAbout();
    else showTool(route);
    ensureHeaderMenu();
    bindMenuTriggers();
    syncLangChips();
    view.classList.remove('is-entering');
    void view.offsetWidth;
    view.classList.add('is-entering');
    window.clearTimeout(render._enterTimer);
    render._enterTimer = window.setTimeout(function () {
      view.classList.remove('is-entering');
    }, 320);
    syncMeta();
  }


  const settingsBtn = document.getElementById('settingsBtn');
  if (settingsBtn) settingsBtn.addEventListener('click', function () { openSettings(settingsBtn); });
  document.addEventListener('click', function (e) {
    const t = e.target && e.target.closest ? e.target.closest('[data-alt-settings]') : null;
    if (!t) return;
    e.preventDefault();
    openSettings(t);
  });

  /* language switch (home capsule + workspace header): one shared control */
  function syncLangChips() {
    const cur = (window.DDB_I18N && window.DDB_I18N.lang) || 'en';
    Array.prototype.forEach.call(document.querySelectorAll('.dd-lang [data-set-lang]'), function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-set-lang') === cur ? 'true' : 'false');
    });
  }
  document.addEventListener('click', function (e) {
    const t = e.target && e.target.closest ? e.target.closest('[data-set-lang]') : null;
    if (!t) return;
    if (t.closest('.modal-card, .settings-panel')) return; /* settings panel owns its own buttons */
    e.preventDefault();
    e.stopPropagation();
    if (window.DDB_I18N) window.DDB_I18N.setLang(t.getAttribute('data-set-lang'));
  });
  window.addEventListener('ddb:lang', syncLangChips);

  let lastCompact = window.innerWidth <= 1024;
  window.addEventListener('resize', function () {
    Object.keys(cache).forEach(function (k) {
      const box = cache[k];
      const body = box && box.querySelector('.tool-body');
      if (body) applyPanels(body, readPanels());
    });
    const compact = window.innerWidth <= 1024;
    if (compact === lastCompact) return;
    lastCompact = compact;
    Object.keys(cache).forEach(function (k) {
      const box = cache[k];
      const body = box && box.querySelector('.tool-body');
      if (!body) return;
      const panels = readPanels();
      panels.left = compact;
      panels.right = compact;
      writePanels(panels);
      applyPanels(body, panels);
      const open = !compact;
      body.querySelectorAll('.m-acc').forEach(function (d) { d.open = open; });
    });
  });


  const PAGE_DESC = {
    zh: 'deepDB 数据库设计工具集：ER 图、关系模式、JSON Schema 与关系代数，纯静态、离线可用。',
    en: 'deepDB — database design tools in the browser. ER diagrams, logical schemas, JSON Schema and relational algebra, offline.',
    it: 'deepDB — strumenti di progettazione di database nel browser. Diagrammi ER, schemi logici, JSON Schema e algebra relazionale, offline.'
  };
  function syncMeta() {
    const lang = (window.DDB_I18N && window.DDB_I18N.lang) || 'zh';
    const d = document.querySelector('meta[name="description"]');
    if (d) d.setAttribute('content', PAGE_DESC[lang] || PAGE_DESC.en);
  }
  window.addEventListener('ddb:lang', syncMeta);

  applyAccent(readAccent());
  window.addEventListener('hashchange', render);
  if (!location.hash) location.replace('#/');
  render();
})();

/* file dropdown (details): click toggles, hover opens, 200ms slide/fade, ESC/outside closes */
(() => {
  const FILE_POP = { scale: 0.18, shift: 1, open: 280, close: 240 };
  function openFileMenu(d, viaHover) {
    if (!d || d._closing) return;
    clearTimeout(d._leaveT);
    if (d.classList.contains("is-open")) return;
    d.classList.add("is-open");
    try { d.open = true; } catch (err) { }
    d._hoverOpened = !!viaHover;
    d._pinned = !viaHover;
    const pop = d.querySelector(".dd-file-pop");
    const sum = d.querySelector(".dd-file-sum");
    if (pop && window.innerWidth <= 760) {
      pop.style.setProperty("left", "12px", "important");
      pop.style.setProperty("right", "auto", "important");
      pop.style.setProperty("width", "min(280px, calc(100vw - 24px))", "important");
    }
    if (pop && window.DDB && DDB.ui && DDB.ui.popFrom) DDB.ui.popFrom(pop, sum || d, "open", null, FILE_POP);
  }
  function closeFileMenu(d, immediate) {
    if (!d || d._closing) return;
    clearTimeout(d._leaveT);
    if (!d.classList.contains("is-open")) return;
    const pop = d.querySelector(".dd-file-pop");
    const sum = d.querySelector(".dd-file-sum");
    const finish = function () {
      d._closing = false;
      d._hoverOpened = false;
      d._pinned = false;
      d.classList.remove("is-open");
      try { d.open = false; } catch (err) { }
    };
    if (!immediate && pop && window.DDB && DDB.ui && DDB.ui.popFrom) {
      d._closing = true;
      DDB.ui.popFrom(pop, sum || d, "close", finish, FILE_POP);
      return;
    }
    finish();
  }
  document.addEventListener("click", function (e) {
    const sum = e.target.closest(".dd-file-sum");
    if (sum) {
      e.preventDefault();
      const d = sum.parentElement;
      if (d._closing) return;
      if (d.classList.contains("is-open")) {
        if (d._hoverOpened && !d._pinned) { d._pinned = true; return; }
        closeFileMenu(d);
      } else openFileMenu(d);
      return;
    }
    const item = e.target.closest(".dd-file-pop button, .dd-file-pop a");
    if (item) {
      const d = item.closest(".dd-file-menu");
      /* the tool's own handler may open a modal after this listener: decide on the next tick */
      setTimeout(function () {
        if (document.querySelector("#modalHost .modal-backdrop")) {
          /* an item that opened a modal: retract the File menu only after that modal shrank back */
          const h = function () { document.removeEventListener("ddb:modal-close", h); closeFileMenu(d); };
          document.addEventListener("ddb:modal-close", h);
        } else closeFileMenu(d);
      }, 0);
      return;
    }
    /* a modal owns the screen: leave the File menu where it is */
    if (document.querySelector("#modalHost .modal-backdrop")) return;
    document.querySelectorAll(".dd-file-menu.is-open").forEach(function (d) { closeFileMenu(d); });
  });

  document.addEventListener("pointerenter", function (e) {
    if ((window.matchMedia && window.matchMedia("(hover: none), (pointer: coarse)").matches) || window.innerWidth <= 900) return;
    const sum = e.target.closest && e.target.closest(".dd-file-sum");
    if (!sum) return;
    const d = sum.parentElement;
    if (!d || d._closing) return;
    clearTimeout(d._leaveT);
    openFileMenu(d, true);
  }, true);
  document.addEventListener("pointerout", function (e) {
    if ((window.matchMedia && window.matchMedia("(hover: none), (pointer: coarse)").matches) || window.innerWidth <= 900) return;
    const menu = e.target.closest && e.target.closest(".dd-file-menu");
    if (!menu) return;
    const to = e.relatedTarget && e.relatedTarget.closest ? e.relatedTarget.closest(".dd-file-menu") : null;
    if (to === menu) return;
    clearTimeout(menu._leaveT);
    menu._leaveT = setTimeout(function () {
      if (menu.matches(":hover")) return;
      /* a modal opened from this menu owns the screen: retract the menu when it shrank back */
      if (document.querySelector("#modalHost .modal-backdrop")) {
        const h = function () { document.removeEventListener("ddb:modal-close", h); closeFileMenu(menu); };
        document.addEventListener("ddb:modal-close", h);
        return;
      }
      closeFileMenu(menu);
    }, 160);
  }, false);
  document.addEventListener("pointerover", function (e) {
    const menu = e.target.closest && e.target.closest(".dd-file-menu");
    if (!menu) return;
    clearTimeout(menu._leaveT);
  }, false);
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (document.querySelector("#modalHost .modal-backdrop")) return; /* let the modal close first */
    document.querySelectorAll(".dd-file-menu.is-open").forEach(function (d) { closeFileMenu(d); });
  });
})();

/* m11934 touch: no long-press menus/selection on controls */
(() => {
  const isTouch = () => (window.matchMedia && window.matchMedia("(hover: none), (pointer: coarse)").matches) || window.innerWidth <= 900;
  document.addEventListener("contextmenu", (e) => {
    if (!isTouch()) return;
    const t = e.target.closest(".dd-menu-btn,.dd-file-sum,.dd-file-pop button,.dd-file-pop a,.dd-link,.ddq,.tab,.side-toggle,.m-quick .btn,.btn");
    if (t) e.preventDefault();
  }, true);
})();
