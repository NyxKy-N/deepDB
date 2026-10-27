/*!
 * app.js · 路由 + 首页 + 设置（语言 / 主题）
 * 纯静态、无构建，hash 路由：#/ · #/tools/er · #/tools/noer · #/tools/ra
 */
(function () {
  'use strict';

  const DDB = window.DDB;
  const util = DDB.util;
  const ui = DDB.ui;

  const view = document.getElementById('view');
  const nav = document.getElementById('appNav');

  const ROUTES = {
    '': { key: 'home', nav: 'home', title: 'deepDB · 数据库设计教学工具' },
    'tools/er': { key: 'er', nav: 'er', title: 'designER · 关系设计' },
    'tools/noer': { key: 'noer', nav: 'noer', title: 'noER · 文档数据库设计' },
    'tools/ra': { key: 'ra', nav: 'ra', title: 'designQT basic · 关系代数表达式' },
    'tools/translater': { key: 'translater', nav: 'translater', title: 'translatER · ER → 关系模式' }
  };

  ROUTES['lab'] = { key: 'lab', nav: '', title: 'deepDB · Motion lab' };

  /* ---------------- 主题 ---------------- */
  const THEME_KEY = 'designerdb:v1:theme';
  const mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  function readTheme() {
    try { return localStorage.getItem(THEME_KEY) || 'system'; } catch (err) { return 'system'; }
  }
  function applyTheme(mode) {
    const dark = mode === 'dark' || (mode === 'system' && mq && mq.matches);
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  }
  function setTheme(mode, originEvent) {
    const commit = function () {
      try { localStorage.setItem(THEME_KEY, mode); } catch (err) { }
      applyTheme(mode);
    };
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!document.startViewTransition || reduce) { commit(); return; }
    const x = originEvent && isFinite(originEvent.clientX) ? originEvent.clientX : window.innerWidth / 2;
    const y = originEvent && isFinite(originEvent.clientY) ? originEvent.clientY : window.innerHeight / 2;
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y)) + 24;
    let vt = null;
    try { vt = document.startViewTransition(commit); } catch (e) { commit(); return; }
    // 面板折叠：桌面展开、窄屏默认收起
    setTimeout(function () {
      const want = mode === 'dark' ? 'dark' : (mode === 'light' ? 'light' : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
      if (document.documentElement.getAttribute('data-theme') !== want) commit();
    }, 700);
    vt.ready.then(function () {
      document.documentElement.animate(
        { clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + radius + 'px at ' + x + 'px ' + y + 'px)'] },
        { duration: 520, easing: 'cubic-bezier(.32,.72,.24,1)', pseudoElement: '::view-transition-new(root)' }
      );
    }).catch(function () { });
  }
  if (mq) {
    const onScheme = function () { if (readTheme() === 'system') applyTheme('system'); };
    if (mq.addEventListener) mq.addEventListener('change', onScheme);
    else if (mq.addListener) mq.addListener(onScheme);
  }

  /* ---------------- 设置弹窗 ---------------- */
  function openSettings(invoker) {
    const lang = (window.DDB_I18N && window.DDB_I18N.lang) || 'zh';
    const theme = readTheme();
    const langs = [
      { id: 'zh', label: '中文' },
      { id: 'en', label: 'English' },
      { id: 'it', label: 'Italiano' }
    ];
    const themes = [
      { id: 'light', label: '浅色' },
      { id: 'dark', label: '深色' },
      { id: 'system', label: '跟随系统' }
    ];
    const seg = function (name, items, cur) {
      return '<div class="seg seg--wide" role="group" aria-label="' + name + '">' + items.map(function (it) {
        return '<button type="button" data-set-' + name + '="' + it.id + '" class="' + (it.id === cur ? 'active' : '') + '" aria-pressed="' + (it.id === cur ? 'true' : 'false') + '">' + it.label + '</button>';
      }).join('') + '</div>';
    };
    const m = ui.modal({
      title: '设置',
      origin: invoker || (document.getElementById('settingsBtn') || null),
      body: [
        '<div class="set-block"><div class="set-label">语言</div>' + seg('lang', langs, lang) + '</div>',
        '<div class="set-block"><div class="set-label">主题</div>' + seg('theme', themes, theme) +
        '<div class="hint">深色模式跟随系统时会随系统外观自动切换。</div></div>'
      ].join(''),
      actions: [{ label: '完成', primary: true, onClick: function (close) { close(); } }]
    });
    m.addEventListener('click', function (e) {
      const lb = e.target.closest('[data-set-lang]');
      if (lb) {
        const next = lb.getAttribute('data-set-lang');
        if (window.DDB_I18N) window.DDB_I18N.setLang(next);
        m.querySelectorAll('[data-set-lang]').forEach(function (b) {
          const on = b.getAttribute('data-set-lang') === next;
          b.classList.toggle('active', on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        return;
      }
      const tb = e.target.closest('[data-set-theme]');
      if (tb) {
        const next = tb.getAttribute('data-set-theme');
        setTheme(next, e);
        m.querySelectorAll('[data-set-theme]').forEach(function (b) {
          const on = b.getAttribute('data-set-theme') === next;
          b.classList.toggle('active', on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
      }
    });
  }

  /* ---------------- 首页 ---------------- */
  function homeHTML() {
    const ic = function (inner) {
      return '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">' + inner + '</svg>';
    };
    const ICONS = {
      er: ic('<rect x="3" y="4.5" width="8.2" height="6" rx="1.6"/><rect x="12.8" y="13.5" width="8.2" height="6" rx="1.6"/><path d="M11.2 7.5h3.1a1.6 1.6 0 0 1 1.6 1.6v4.4"/>'),
      doc: ic('<path d="M6 3.5h8.5L19 8v12.5H6z"/><path d="M14 3.5V8h4.5"/><path d="M9 12h6M9 15.5h6M9 19h3.5"/>'),
      ra: ic('<circle cx="12" cy="4.8" r="2.1"/><circle cx="6.4" cy="13.4" r="2.1"/><circle cx="17.6" cy="13.4" r="2.1"/><path d="M12 6.9v3.2M12 10.1 6.8 11.7M12 10.1l5.2 1.6"/><circle cx="6.4" cy="19.4" r="2.1"/><circle cx="17.6" cy="19.4" r="2.1"/><path d="M6.4 15.5v1.8M17.6 15.5v1.8"/>'),
      schema: ic('<rect x="3.2" y="4.5" width="17.6" height="15" rx="2"/><path d="M3.2 9.2h17.6M8.4 9.2v10.3M11.6 13h6.4M11.6 16.4h4.2"/>'),
      pen: ic('<path d="M4 20l3.6-1 10-10a2.1 2.1 0 0 0-3-3l-10 10z"/><path d="M13.4 6.6l3 3"/>'),
      check: ic('<circle cx="12" cy="12" r="8.4"/><path d="M8.2 12.3l2.6 2.6 5-5.2"/>'),
      export: ic('<path d="M12 4v10"/><path d="M8.3 7.6 12 4l3.7 3.6"/><path d="M5 15v4.2h14V15"/>'),
      target: ic('<circle cx="12" cy="12" r="8.4"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1"/>'),
      alert: ic('<path d="M12 4.2 21 19.8H3z"/><path d="M12 9.6v4.2"/><circle cx="12" cy="16.8" r=".9"/>'),
      box: ic('<path d="M4 8.2 12 4l8 4.2v7.6L12 20l-8-4.2z"/><path d="M4 8.2 12 12l8-3.8M12 12v8"/>'),
      bolt: ic('<path d="M13.4 3.5 5.6 13.6h5.2L10.6 20.5l7.8-10.1h-5.2z"/>')
    };
    const tools = [
      { tag: '关系模型', name: 'designER', icon: 'er', fig: 'er',
        desc: '在无限画布上画实体、属性（小球）、关系与 ISA，自动检查设计错误，重构为逻辑模式。',
        href: '#/tools/er', btn: '打开 designER', primary: true },
      { tag: '翻译', name: 'translatER', icon: 'schema', fig: 'schema',
        desc: '手写或一键翻译 ER 模型：表名自动匹配实体，PK/FK 点选，Done 一键校验。',
        href: '#/tools/translater', btn: '打开 translatER' },
      { tag: '文档模型', name: 'noER', icon: 'doc', fig: 'doc',
        desc: '用集合、字段、嵌套对象与引用描述文档数据库，自动检查命名、引用与嵌套结构。',
        href: '#/tools/noer', btn: '打开 noER' },
      { tag: '关系代数', name: 'designQT basic', icon: 'ra', fig: 'ra',
        desc: '用 σ、π、ρ、⋈、×、∪、∩、−、γ 搭表达式树，自动推断输出字段并导出标准表达式。',
        href: '#/tools/ra', btn: '打开 designQT' }
    ];
    const rows = tools.map(function (t, i) {
      return [
        '<div class="tool-row" style="--i:' + i + '">',
        '  <div class="tool-row-head"><span class="tool-row-num">' + ('0' + (i + 1)) + '</span><span class="tool-row-tag">' + util.esc(t.tag) + '</span></div>',
        '  <div class="tool-row-main">',
        '    <div class="tool-row-title"><span class="tool-icon">' + ICONS[t.icon] + '</span><h3>' + util.esc(t.name) + '</h3></div>',
        '    <p>' + util.esc(t.desc) + '</p>',
        '  </div>',
        '  <div class="tool-fig fig-' + t.fig + '">' + ICONS[t.fig] + '<span class="fig-grid"></span></div>',
        '  <a class="btn ' + (t.primary ? 'btn--primary' : '') + '" href="' + t.href + '">' + util.esc(t.btn) + '</a>',
        '</div>'
      ].join('\n');
    }).join('\n');
    const heroBadges = [
      { icon: 'er', label: 'designER' },
      { icon: 'schema', label: 'translatER' },
      { icon: 'doc', label: 'noER' },
      { icon: 'ra', label: 'designQT' }
    ].map(function (b) {
      return '<span class="hero-badge">' + ICONS[b.icon] + '<b>' + b.label + '</b></span>';
    }).join('');

    return [
      '<div class="home">',
      '<div class="home-bg" aria-hidden="true"><i class="blob b1"></i><i class="blob b2"></i><i class="blob b3"></i></div>',
      '<section class="hero home-section">',
      '  <div class="hero-copy">',
      '    <h1>把数据库设计，从<em>草图</em>画到<em>模式</em></h1>',
      '    <p class="lede">四个工具覆盖关系模型、文档模型、关系代数与 ER 翻译。画完模型就能检查、重构并导出结果，全部在浏览器里完成。</p>',
      '    <div class="hero-actions">',
      '      <a class="btn btn--primary" href="#/tools/er">打开 designER</a>',
      '      <a class="btn btn--ghost" href="#/tools/translater">translatER →</a>',
      '      <a class="btn btn--ghost" href="#/lab">Motion lab →</a>',
      '    </div>',
      '    <div class="hero-badges">' + heroBadges + '</div>',
      '  </div>',
      '  <div class="hero-art">',
      '    <div class="art-window">',
      '      <div class="art-bar"><i></i><i></i><i></i><span>designER · 选课系统</span></div>',
      '      <div class="art-body">',
      '        <div class="art-node"><b>实体</b><code>Student( sid, sname, dept, score )</code></div>',
      '        <div class="art-row">',
      '          <div class="art-chip art-a">PK · sid</div>',
      '          <div class="art-chip">UNIQUE · sname</div>',
      '        </div>',
      '        <div class="art-row art-mini">',
      '          <div class="art-card"><span data-i18n-skip>ER snippet</span><b>Student ⋈ Enrolls</b></div>',
      '          <div class="art-card"><span data-i18n-skip>Relational schema</span><b>STUDENT (sid(PK), …)</b></div>',
      '        </div>',
      '        <div class="art-row">',
      '          <div class="art-chip green">✓ 检查通过</div>',
      '          <div class="art-chip">逻辑模式 5 表</div>',
      '        </div>',
      '      </div>',
      '    </div>',
      '  </div>',
      '</section>',

      '<section class="section home-section">',
      '  <div class="section-head"><h2>四个工具，一套建模工作流</h2>',
      '    <p>先画模型，再检查与重构，最后导出为结构或表达式。</p></div>',
      '  <div class="tool-rows">' + rows + '</div>',
      '</section>',

      '<section class="section section--split home-section">',
      '  <div class="section-head"><h2>三步把想法变成模式</h2></div>',
      '  <ol class="step-list">',
      '    <li><span class="step-num">01</span><span class="step-ic">' + ICONS.pen + '</span><div><h4>画出概念模型</h4><p>添加实体与属性，用关系连接它们并设置参与度。</p></div></li>',
      '    <li><span class="step-num">02</span><span class="step-ic">' + ICONS.check + '</span><div><h4>检查并重构</h4><p>自动检查问题，一键重构为含主键、外键、唯一约束的逻辑模式。</p></div></li>',
      '    <li><span class="step-num">03</span><span class="step-ic">' + ICONS.export + '</span><div><h4>导出结果</h4><p>复制或下载逻辑模式、JSON Schema 与关系代数表达式。</p></div></li>',
      '  </ol>',
      '</section>',

      '<section class="section home-section">',
      '  <div class="section-head"><h2>为课堂与练习而做</h2></div>',
      '  <div class="feature-cols">',
      '    <div class="feature"><span class="feature-ic">' + ICONS.target + '</span><div><h4>专注建模</h4><p>没有多余设置，打开就能画；模型自动保留，可随时导出 JSON 备份。</p></div></div>',
      '    <div class="feature"><span class="feature-ic">' + ICONS.alert + '</span><div><h4>检查会解释原因</h4><p>每条检查都说明问题出在哪，并可一键定位到对应元素。</p></div></div>',
      '    <div class="feature"><span class="feature-ic">' + ICONS.box + '</span><div><h4>导出即交付</h4><p>逻辑模式、关系模式文本、JSON Schema 都能复制或下载。</p></div></div>',
      '    <div class="feature"><span class="feature-ic">' + ICONS.bolt + '</span><div><h4>双击就能用</h4><p>纯静态页面，不需要安装任何依赖。</p></div></div>',
      '  </div>',
      '</section>',

      '<section class="cta-band home-section">',
      '  <div><h2>从下一个数据模型开始</h2><p>打开 designER 载入示例，或者在空白画布上从第一个实体开始画。</p></div>',
      '  <a class="btn" href="#/tools/er">开始建模 →</a>',
      '</section>',
      '</div>',
      '<footer class="site-footer">',
      '  <div class="footer-inner">',
      '    <div class="footer-brand">',
      '      <div class="footer-logo">deep<strong>DB</strong></div>',
      '      <p class="hint">受 designerdb.io 启发的教学实现，支持中文 / English / Italiano。</p>',
      '      <p class="hint footer-author"><img class="author-avatar" src="assets/img/avatar.jpg" alt="" width="30" height="30">作者 · NyxKy</p>',
      '      <p class="hint footer-author footer-author--deepseek"><img class="author-avatar" src="assets/img/deepseek.png" alt="" width="30" height="30">助手 · Deepseek</p>',
      '      <p class="hint footer-repo"><a href="https://github.com/NyxKy-N/deepDB.git" target="_blank" rel="noopener">github.com/NyxKy-N/deepDB</a></p>',
      '    </div>',
      '    <div class="footer-cols">',
      '      <div class="footer-col"><h5>工具</h5><a href="#/tools/er">designER</a><a href="#/tools/translater">translatER</a><a href="#/tools/noer">noER</a><a href="#/tools/ra">designQT basic</a><a href="#/lab">Motion lab</a></div>',
      '      <div class="footer-col"><h5>页面</h5><a href="#/">首页</a><a href="#/">建模工作流</a></div>',
      '      <div class="footer-col"><h5>说明</h5><p class="hint">模型自动保留在浏览器中</p><p class="hint">快捷键：Ctrl+Z / Ctrl+Y / Delete / Esc</p></div>',
      '    </div>',
      '  </div>',
      '</footer>',
    ].join('\n');
  }

  function parseRoute() {
    const raw = String(location.hash || '').replace(/^#\/?/, '').replace(/\/+$/, '');
    return ROUTES[raw] || ROUTES[''];
  }

  function setActiveNav(route) {
    if (!nav) return;
    nav.querySelectorAll('a[data-nav]').forEach(function (a) {
      a.classList.toggle('active', a.getAttribute('data-nav') === route.nav);
    });
  }

  let homeMotionBound = false;
  function bindHomeMotion() {
    const home = view.querySelector('.home');
    const art = view.querySelector('.hero-art');
    if (!home || !art) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0;
    home.addEventListener('pointermove', function (e) {
      const r = home.getBoundingClientRect();
      const tx = (e.clientX - r.left) / r.width - 0.5;
      const ty = (e.clientY - r.top) / r.height - 0.5;
      if (raf) return;
      raf = requestAnimationFrame(function () {
        raf = 0;
        art.style.setProperty('--px', (tx * 12).toFixed(2) + 'px');
        art.style.setProperty('--py', (ty * 10).toFixed(2) + 'px');
      });
    });
    home.addEventListener('pointerleave', function () {
      art.style.setProperty('--px', '0px');
      art.style.setProperty('--py', '0px');
    });
  }
  function showHome() {
    view.innerHTML = homeHTML();
    view.classList.remove('view--tool');
    homeMotionBound = false;
    bindHomeMotion();
  }

  /* 两侧面板：可折叠 / 展开，状态跨工具与刷新保留 */
  const PANEL_KEY = 'designerdb:v1:panels';

  function readPanels() {
    try { return JSON.parse(localStorage.getItem(PANEL_KEY) || '{}') || {}; } catch (err) { return {}; }
  }
  function writePanels(p) {
    try { localStorage.setItem(PANEL_KEY, JSON.stringify(p)); } catch (err) { }
  }
  function applyPanels(body, p) {
    body.classList.toggle('lb-collapsed', !!p.left);
    body.classList.toggle('rb-collapsed', !!p.right);
    const lb = body.querySelector('.side-toggle[data-side="left"]');
    const rb = body.querySelector('.side-toggle[data-side="right"]');
    if (lb) {
      lb.textContent = p.left ? '›' : '‹';
      lb.setAttribute('aria-pressed', p.left ? 'true' : 'false');
      lb.setAttribute('aria-label', p.left ? '展开左栏' : '隐藏左栏');
      lb.setAttribute('title', p.left ? '展开左栏' : '隐藏左栏');
    }
    if (rb) {
      rb.textContent = p.right ? '‹' : '›';
      rb.setAttribute('aria-pressed', p.right ? 'true' : 'false');
      rb.setAttribute('aria-label', p.right ? '展开右栏' : '隐藏右栏');
      rb.setAttribute('title', p.right ? '展开右栏' : '隐藏右栏');
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

  const LBW_KEY = 'designerdb:v1:lbw';
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
      grip.classList.remove('dragging');
      const raw = parseInt(body.style.getPropertyValue('--lbw'), 10);
      const w = Number.isFinite(raw) ? raw : Math.round(left.getBoundingClientRect().width);
      try { localStorage.setItem(LBW_KEY, String(w)); } catch (err) {}
    }
    grip.addEventListener('pointerup', end);
    grip.addEventListener('pointercancel', end);
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
    window.scrollTo(0, 0);
    window.dispatchEvent(new Event('resize'));
  }

  let revealTicking = false;
  let revealHome = null;
  function updateReveal() {
    revealTicking = false;
    if (!revealHome) return;
    const vh = window.innerHeight || 800;
    revealHome.querySelectorAll('.home-section').forEach(function (el) {
      const r = el.getBoundingClientRect();
      const on = r.top < vh * 0.96 && r.bottom > vh * 0.06;
      const below = r.top >= vh * 0.96;
      el.classList.toggle('is-visible', on);
      el.classList.toggle('is-below', !on && below);
      el.classList.toggle('is-leaving', !on && !below);
    });
  }
  function scheduleReveal() {
    if (revealTicking) return;
    revealTicking = true;
    requestAnimationFrame(updateReveal);
  }
  function setupReveal() {
    const home = view.querySelector('.home');
    if (!home) return;
    if (revealHome && revealHome !== home) {
      window.removeEventListener('scroll', scheduleReveal);
      window.removeEventListener('resize', scheduleReveal);
    }
    revealHome = home;
    window.addEventListener('scroll', scheduleReveal, { passive: true });
    window.addEventListener('resize', scheduleReveal);
    /* 首帧先全部标记，再按视口裁剪，避免首屏闪一下 */
    home.querySelectorAll('.home-section').forEach(function (el) { el.classList.add('is-visible'); });
    updateReveal();
  }
  let labUnmount = null;
  function showLab() {
    if (labUnmount) { try { labUnmount(); } catch (e) {} labUnmount = null; }
    view.classList.remove('view--tool');
    view.innerHTML = window.DDB_LAB ? window.DDB_LAB.html() : '<div class="home"><div class="err-note">Motion lab not loaded.</div></div>';
    if (window.DDB_LAB) labUnmount = window.DDB_LAB.mount(view);
    window.scrollTo(0, 0);
  }

  function render() {
    const route = parseRoute();
    document.title = route.title;
    setActiveNav(route);
    // 先把旧内容摘下（保留缓存，便于切换后继续编辑）
    while (view.firstChild) view.removeChild(view.firstChild);
    if (route.key === 'home') showHome();
    else if (route.key === 'lab') showLab();
    else showTool(route);
    // 页面切换动效
    view.classList.remove('is-entering');
    void view.offsetWidth;
    view.classList.add('is-entering');
    window.clearTimeout(render._enterTimer);
    render._enterTimer = window.setTimeout(function () {
      view.classList.remove('is-entering');
    }, 320);
    if (route.key === 'home') setupReveal();
  }

  const settingsBtn = document.getElementById('settingsBtn');
  if (settingsBtn) settingsBtn.addEventListener('click', function () { openSettings(settingsBtn); });

  let lastCompact = window.innerWidth <= 1024;
  window.addEventListener('resize', function () {
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

  applyTheme(readTheme());
  window.addEventListener('hashchange', render);
  if (!location.hash) location.replace('#/');
  render();
  if (DDB) DDB.version = DDB.version || '1.0.0';
})();
