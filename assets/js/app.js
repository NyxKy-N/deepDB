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

  (function () {
  var D = window.DDB_I18N_DICT;
  if (!D) return;
  if (D.en && D.en.texts) {
    D.en.texts['强调色'] = 'Accent color';
    D.en.texts['只改变按钮、链接与高亮等强调色，不影响界面底色。'] = 'Changes buttons, links, focus rings and highlights only — not the page background.';
  }
  if (D.it && D.it.texts) {
    D.it.texts['强调色'] = 'Colore accento';
    D.it.texts['只改变按钮、链接与高亮等强调色，不影响界面底色。'] = 'Cambia solo pulsanti, link, focus ed evidenziazioni, non lo sfondo della pagina.';
  }
})();

const ROUTES = {
    '': { key: 'home', nav: 'home', title: 'deepDB · Database design teaching tools' },
    'tools/er': { key: 'er', nav: 'er', title: 'designER · Relational design' },
    'tools/noer': { key: 'noer', nav: 'noer', title: 'noER · Document database design' },
    'tools/ra': { key: 'ra', nav: 'ra', title: 'designQT basic · Relational algebra' },
    'tools/translater': { key: 'translater', nav: 'translater', title: 'translatER · ER → relational schema' }
  };

  ROUTES['about'] = { key: 'about', nav: '', title: 'About · deepDB' };

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
  /* ---------------- 强调色 ---------------- */
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
  function faviconFor(hex) {
    const svg = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' rx='18' fill='" + hex + "'/><text x='32' y='45' font-family='Helvetica,Arial' font-size='34' font-weight='700' fill='%23ffffff' text-anchor='middle'>d</text></svg>";
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
    const icon = document.querySelector('link[rel="icon"]');
    if (icon) icon.setAttribute('href', faviconFor(a.hex));
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
        '<div class="hint">跟随系统时自动切换深浅色。</div></div>' +
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
    if (window.DDB_HOMEALT) return window.DDB_HOMEALT.html();
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
        desc: '画实体、属性、关系与 ISA，自动检查并重构为逻辑模式。',
        href: '#/tools/er', btn: '打开 designER', primary: true },
      { tag: '翻译', name: 'translatER', icon: 'schema', fig: 'schema',
        desc: '把 ER 手写或一键翻译成关系模式，并用 Done 校验。',
        href: '#/tools/translater', btn: '打开 translatER' },
      { tag: '文档模型', name: 'noER', icon: 'doc', fig: 'doc',
        desc: '用集合与字段描述文档模型，自动检查命名与引用。',
        href: '#/tools/noer', btn: '打开 noER' },
      { tag: '关系代数', name: 'designQT basic', icon: 'ra', fig: 'ra',
        desc: '用 σ、π、⋈ 等算子搭表达式树并导出。',
        href: '#/tools/ra', btn: '打开 designQT' }
    ];
    const rows = tools.map(function (t, i) {
      return [
        '<div class="tool-row" style="--i:' + i + '" data-href="' + t.href + '" role="link" tabindex="0">',
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

    /* ---- 一个模型，四种视图（可切换） ---- */
    const erNode = function (name, rows) {
      return '<div class="mini-er-node"><b>' + name + '</b>' + rows.map(function (r) {
        return '<span>' + r + '</span>';
      }).join('') + '</div>';
    };
    const views = [
      { key: 'er', label: 'ER 图' },
      { key: 'rel', label: '关系模式' },
      { key: 'json', label: 'JSON Schema' },
      { key: 'ra', label: '关系代数' }
    ];
    const viewTabs = views.map(function (v, i) {
      return '<button type="button" role="tab" class="view-tab' + (i === 0 ? ' is-active' : '') + '"' +
        ' data-view="' + v.key + '" aria-selected="' + (i === 0) + '">' + v.label + '</button>';
    }).join('');
    const viewPanels = [
      '<div class="view-panel is-active" data-panel="er" aria-hidden="false">',
      '  <div class="mini-er">',
      '    <svg class="mini-er-links" viewBox="0 0 520 230" aria-hidden="true">',
      '      <path d="M116 74 H206" class="ml"/><path d="M206 74 V150" class="ml"/>',
      '      <path d="M318 74 H404" class="ml"/><path d="M404 74 V150" class="ml"/>',
      '      <path d="M206 150 H318" class="ml"/>',
      '    </svg>',
      '    <div class="mini-er-node n1">' + '<b>STUDENT</b><span>sid · <i>PK</i></span><span>sname</span><span>dept</span></div>',
      '    <div class="mini-er-diamond d1"><span>enrolls</span></div>',
      '    <div class="mini-er-node n2"><b>COURSE</b><span>cid · <i>PK</i></span><span>title</span></div>',
      '    <div class="mini-er-note">悬停节点 → 看它长什么样</div>',
      '  </div>',
      '</div>',
      '<div class="view-panel" data-panel="rel" aria-hidden="true">',
      '  <pre class="code-mini">CREATE TABLE student (\n  sid    INTEGER PRIMARY KEY,\n  sname  VARCHAR(64) UNIQUE,\n  dept   VARCHAR(32)\n);\n\nCREATE TABLE enrolls (\n  sid  INTEGER REFERENCES student(sid),\n  cid  INTEGER REFERENCES course(cid),\n  grade DECIMAL(5,2),\n  PRIMARY KEY (sid, cid)\n);</pre>',
      '</div>',
      '<div class="view-panel" data-panel="json" aria-hidden="true">',
      '  <pre class="code-mini">{ "title": "student", "required": ["sid"], "properties": {\n  "sid":   { "type": "integer" },\n  "sname": { "type": "string", "maxLength": 64 },\n  "dept":  { "type": "string" }\n} }</pre>',
      '</div>',
      '<div class="view-panel" data-panel="ra" aria-hidden="true">',
      '  <pre class="code-mini">π[title, grade] (\n  σ[grade > 90] (\n    student ⋈[sid] enrolls\n  )\n)</pre>',
      '</div>'
    ].join('\n');

    /* ---- 界面片段（可筛选、可放大） ---- */
    const gallery = [
      { kind: 'er', title: '实体卡片', tag: 'designER', mock: 'ent' },
      { kind: 'rel', title: '关系模式', tag: 'translatER', mock: 'rel' },
      { kind: 'doc', title: '文档集合', tag: 'noER', mock: 'doc' },
      { kind: 'ra', title: '表达式树', tag: 'designQT', mock: 'ra' },
      { kind: 'er', title: '检查清单', tag: 'designER', mock: 'check' },
      { kind: 'ui', title: '设置面板', tag: 'App', mock: 'set' }
    ];
    const mockHTML = {
      ent: '<div class="mock-window"><div class="mock-bar"><i></i><i></i><i></i><span>designER</span></div><div class="mock-body"><div class="mock-entity"><b>ENTITY</b><code>Student( sid, sname, dept, score )</code></div><div class="mock-pills"><span class="mock-pill">PK · sid</span><span class="mock-pill">UNIQUE · sname</span></div></div></div>',
      rel: '<div class="mock-window"><div class="mock-bar"><i></i><i></i><i></i><span>translatER</span></div><div class="mock-body mock-code">STUDENT (sid(PK), sname, dept)\nCOURSE  (cid(PK), title)\nENROLLS (sid(PK), cid(PK), grade)</div></div>',
      doc: '<div class="mock-window"><div class="mock-bar"><i></i><i></i><i></i><span>noER</span></div><div class="mock-body"><div class="mock-collection"><b>users</b><span>_id · objectId</span><span>email · string</span><span>profile · object</span></div></div></div>',
      ra: '<div class="mock-window"><div class="mock-bar"><i></i><i></i><i></i><span>designQT</span></div><div class="mock-body mock-ops"><span>σ select</span><span>π project</span><span>⋈ join</span></div></div>',
      check: '<div class="mock-window"><div class="mock-bar"><i></i><i></i><i></i><span>model check</span></div><div class="mock-body"><div class="mock-check ok">✓ 检查通过</div><div class="mock-check warn">! 一个关系缺少主键</div></div></div>',
      set: '<div class="mock-window"><div class="mock-bar"><i></i><i></i><i></i><span>settings</span></div><div class="mock-body"><div class="mock-seg"><b>中文</b><span>English</span><span>Italiano</span></div><div class="mock-seg"><span>Light</span><b>Dark</b><span>System</span></div></div></div>'
    };
    const galleryHTML = gallery.map(function (g) {
      return '<button type="button" class="g-card" data-kind="' + g.kind + '" data-title="' + util.esc(g.title) + '" data-tag="' + util.esc(g.tag) + '">' +
        '<div class="g-preview">' + mockHTML[g.mock] + '</div>' +
        '<div class="g-meta"><b>' + util.esc(g.title) + '</b><span>' + util.esc(g.tag) + '</span></div>' +
        '</button>';
    }).join('\n');
    const filters = [
      { key: 'all', label: '全部' }, { key: 'er', label: 'ER' }, { key: 'rel', label: 'Schema' },
      { key: 'doc', label: '文档' }, { key: 'ra', label: '代数' }
    ].map(function (f, i) {
      return '<button type="button" class="g-filter-btn' + (i === 0 ? ' is-active' : '') + '" data-filter="' + f.key + '">' + f.label + '</button>';
    }).join('');

    const steps = [
      { n: '01', ic: 'pen', t: '画出概念模型', p: '添加实体、属性与关系。', more: '拖动画布、双击改名、点属性球改类型；模型自动保存。' },
      { n: '02', ic: 'check', t: '检查并重构', p: '自动检查并重构为逻辑模式。', more: '每条问题都给出原因，点「定位」跳到对应元素。' },
      { n: '03', ic: 'export', t: '导出结果', p: '复制或下载结果。', more: '逻辑模式、JSON Schema、关系代数表达式均可复制或下载。' }
    ];
    const stepsHTML = steps.map(function (s, i) {
      return '<li class="hstep' + (i === 0 ? ' is-open' : '') + '" data-step="' + i + '">' +
        '<span class="step-num">' + s.n + '</span><span class="step-ic">' + ICONS[s.ic] + '</span>' +
        '<div class="step-main"><h4>' + s.t + '</h4><p>' + s.p + '</p>' +
        '<div class="step-more">' + s.more + '</div></div></li>';
    }).join('\n');

    const marqueeItems = ['ER 建模', '逻辑模式', 'JSON Schema', 'σ σ 选择', '⋈ 连接', '检查通过', '一键翻译', '关系代数', '文档模型', '实时预览'];
    const marqueeHTML = marqueeItems.concat(marqueeItems).map(function (m) {
      return '<span class="marquee-item"><i></i>' + m + '</span>';
    }).join('');

    return [
      '<div class="home">',
      '<div class="home-bg" aria-hidden="true"><i class="blob b1"></i><i class="blob b2"></i><i class="blob b3"></i></div>',
      '<section class="hero home-section">',
      '  <div class="hero-copy">',
      '    <h1>把数据库设计，从<em>草图</em>画到<em>模式</em></h1>',
      '    <p class="lede">四个工具：画 ER、翻译成关系模式、设计文档模型、搭关系代数。全部在浏览器里完成。</p>',
      '    <div class="hero-actions">',
      '      <a class="btn btn--primary" href="#/tools/er">打开 designER</a>',
      '      <a class="btn btn--ghost" href="#/tools/translater">translatER →</a>',,
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

      '<section class="section home-section views-sec">',
      '  <div class="section-head"><h2>一个模型，四种视图</h2>',
      '    <p>同一份设计，换一种角度看：点标签切换。</p></div>',
      '  <div class="views-tabs" role="tablist">' + viewTabs + '</div>',
      '  <div class="views-stage">' + viewPanels + '</div>',
      '</section>',

      '<section class="section home-section gallery-sec">',
      '  <div class="section-head"><h2>界面片段</h2>',
      '    <p>这些都是真实组件，筛一下或点开看细节。</p></div>',
      '  <div class="g-filters">' + filters + '</div>',
      '  <div class="g-grid">' + galleryHTML + '</div>',
      '</section>',

      '<div class="marquee-band" aria-hidden="true"><div class="marquee-track">' + marqueeHTML + '</div></div>',

      '<section class="section section--split home-section">',
      '  <div class="section-head"><h2>三步把想法变成模式</h2><p>点开每一步，看它具体做什么。</p></div>',
      '  <ol class="step-list">' + stepsHTML + '</ol>',
      '</section>',

      '<section class="section home-section playsec">',
      '  <div class="section-head"><h2>点一下试试</h2>',
      '    <p>点属性切换主键，下面的 SQL 会实时更新。</p></div>',
      '  <div class="play">',
      '    <div class="play-card">',
      '      <div class="play-head"><span class="play-dot"></span><b>Student</b><span class="play-tag">ENTITY</span></div>',
      '      <div class="play-attrs">',
      '        <button type="button" class="play-attr is-pk" data-play-attr="sid" data-pk="1">sid</button>',
      '        <button type="button" class="play-attr" data-play-attr="sname">sname</button>',
      '        <button type="button" class="play-attr" data-play-attr="dept">dept</button>',
      '        <button type="button" class="play-attr" data-play-attr="score">score</button>',
      '        <button type="button" class="play-attr" data-play-attr="birthDate">birthDate</button>',
      '      </div>',
      '      <div class="play-actions"><button type="button" class="mini-btn" data-play-reset>重置</button><span class="play-count" id="playCount" data-i18n-skip>1 PK</span></div>',
      '    </div>',
      '    <div class="play-out">',
      '      <div class="play-out-head"><span>SQL</span><button type="button" class="mini-btn" data-play-copy>复制</button></div>',
      '      <pre class="play-code" id="playCode"></pre>',
      '    </div>',
      '  </div>',
      '</section>',

      '<section class="section home-section">',
      '  <div class="section-head"><h2>为课堂与练习而做</h2></div>',
      '  <div class="feature-cols">',
      '    <div class="feature"><span class="feature-ic">' + ICONS.target + '</span><div><h4>专注建模</h4><p>打开就能画，模型自动保留。</p></div></div>',
      '    <div class="feature"><span class="feature-ic">' + ICONS.alert + '</span><div><h4>检查会解释原因</h4><p>每条检查说明原因，可一键定位。</p></div></div>',
      '    <div class="feature"><span class="feature-ic">' + ICONS.box + '</span><div><h4>导出即交付</h4><p>逻辑模式、JSON Schema 都可导出。</p></div></div>',
      '    <div class="feature"><span class="feature-ic">' + ICONS.bolt + '</span><div><h4>双击就能用</h4><p>纯静态页面，无需安装。</p></div></div>',
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
      '      <p class="hint">受 designerdb.io 启发的教学实现，支持中 / 英 / 意。</p>',
      '      <p class="hint footer-author"><img class="author-avatar" src="assets/img/avatar.jpg" alt="" width="30" height="30">作者 · NyxKy</p>',
      '      <p class="hint footer-author footer-author--deepseek"><img class="author-avatar" src="assets/img/deepseek.png" alt="" width="30" height="30">助手 · Deepseek</p>',
      '      <p class="hint footer-repo"><a href="https://github.com/NyxKy-N/deepDB.git" target="_blank" rel="noopener">github.com/NyxKy-N/deepDB</a></p>',
      '    </div>',
      '    <div class="footer-cols">',,
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
  let altUnmount = null;
  function bindHomeMotion() {
    const home = view.querySelector('.home');
    const art = view.querySelector('.hero-art');
    if (!home || !art) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (homeMotionBound) return;
    homeMotionBound = true;
    const bg = home.querySelector('.home-bg');
    const rows = Array.prototype.slice.call(home.querySelectorAll('.tool-row'));
    const heroBtns = Array.prototype.slice.call(home.querySelectorAll('.hero-actions .btn'));
    let raf = 0;
    let mx = 0, my = 0, cx = 0, cy = 0;
    function flush() {
      raf = 0;
      art.style.setProperty('--px', (mx * 12).toFixed(2) + 'px');
      art.style.setProperty('--py', (my * 10).toFixed(2) + 'px');
      if (bg) bg.style.transform = 'translate3d(' + (mx * -18).toFixed(1) + 'px,' + (my * -14).toFixed(1) + 'px,0)';
      heroBtns.forEach(function (b) {
        b.style.setProperty('--bx', (mx * 7).toFixed(2) + 'px');
        b.style.setProperty('--by', (my * 5).toFixed(2) + 'px');
      });
    }
    home.addEventListener('pointermove', function (e) {
      const r = home.getBoundingClientRect();
      mx = (e.clientX - r.left) / r.width - 0.5;
      my = (e.clientY - r.top) / r.height - 0.5;
      if (raf) return;
      raf = requestAnimationFrame(flush);
    });
    home.addEventListener('pointerleave', function () {
      mx = 0; my = 0;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      flush();
    });
    /* 工具行：指针位置驱动 3D 倾斜 + 光斑 */
    rows.forEach(function (row) {
      let rowRaf = 0, nx = 0.5, ny = 0.5;
      function apply() {
        rowRaf = 0;
        row.style.setProperty('--mx', (nx * 100).toFixed(1) + '%');
        row.style.setProperty('--my', (ny * 100).toFixed(1) + '%');
        row.style.setProperty('--ry', ((nx - 0.5) * 7).toFixed(2) + 'deg');
        row.style.setProperty('--rx', ((0.5 - ny) * 5.5).toFixed(2) + 'deg');
        row.style.setProperty('--tx', ((nx - 0.5) * 4).toFixed(2) + 'px');
      }
      row.addEventListener('pointermove', function (e) {
        const r = row.getBoundingClientRect();
        nx = (e.clientX - r.left) / r.width;
        ny = (e.clientY - r.top) / r.height;
        if (!rowRaf) rowRaf = requestAnimationFrame(apply);
      });
      row.addEventListener('pointerleave', function () {
        if (rowRaf) cancelAnimationFrame(rowRaf);
        rowRaf = 0;
        nx = 0.5; ny = 0.5;
        apply();
      });
    });
    /* 工具行整行可点 */
    home.addEventListener('click', function (e) {
      const row = e.target.closest('.tool-row');
      if (!row || e.target.closest('a, button')) return;
      const href = row.getAttribute('data-href');
      if (href) location.hash = href;
    });
    home.addEventListener('keydown', function (e) {
      const row = e.target.closest('.tool-row');
      if (!row || (e.key !== 'Enter' && e.key !== ' ')) return;
      const href = row.getAttribute('data-href');
      if (href) { e.preventDefault(); location.hash = href; }
    });

    /* 一个模型，四种视图 */
    const tabs = Array.prototype.slice.call(home.querySelectorAll('.view-tab'));
    const panels = Array.prototype.slice.call(home.querySelectorAll('.view-panel'));
    function showView(key) {
      tabs.forEach(function (b) {
        const on = b.getAttribute('data-view') === key;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      panels.forEach(function (p) {
        const on = p.getAttribute('data-panel') === key;
        p.classList.toggle('is-active', on);
        p.setAttribute('aria-hidden', on ? 'false' : 'true');
      });
    }
    tabs.forEach(function (b) { b.addEventListener('click', function () { showView(b.getAttribute('data-view')); }); });

    /* 界面片段：筛选 + 放大 */
    const gcards = Array.prototype.slice.call(home.querySelectorAll('.g-card'));
    const gbtns = Array.prototype.slice.call(home.querySelectorAll('.g-filter-btn'));
    const toolHref = { er: '#/tools/er', rel: '#/tools/translater', doc: '#/tools/noer', ra: '#/tools/ra' };
    function applyFilter(key) {
      gbtns.forEach(function (b) {
        const on = b.getAttribute('data-filter') === key;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      gcards.forEach(function (c, i) {
        const show = key === 'all' || c.getAttribute('data-kind') === key;
        c.classList.toggle('is-hidden', !show);
        c.style.transitionDelay = show ? Math.min(i, 6) * 40 + 'ms' : '0ms';
      });
    }
    gbtns.forEach(function (b) { b.addEventListener('click', function () { applyFilter(b.getAttribute('data-filter')); }); });
    gcards.forEach(function (card) {
      card.addEventListener('click', function () {
        const title = card.getAttribute('data-title');
        const tag = card.getAttribute('data-tag');
        const preview = card.querySelector('.g-preview');
        const href = toolHref[card.getAttribute('data-kind')] || '#/';
        ui.modal({
          title: title, wide: true, origin: card,
          body: '<div class="g-modal"><div class="g-modal-preview">' + (preview ? preview.innerHTML : '') +
            '</div><p class="hint">' + util.esc(tag) + ' · deepDB</p></div>',
          actions: [{ label: '打开对应页面 →', primary: true, onClick: function (close) { close(); location.hash = href; } }]
        });
      });
    });

    /* 点一下试试：属性主键编辑 + 实时 SQL */
    const playCode = home.querySelector('#playCode');
    const playCount = home.querySelector('#playCount');
    const playAttrs = Array.prototype.slice.call(home.querySelectorAll('.play-attr'));
    function playRender() {
      if (!playCode) return;
      const names = playAttrs.map(function (b) { return b.getAttribute('data-play-attr'); });
      const pks = playAttrs.filter(function (b) { return b.getAttribute('data-pk') === '1'; })
        .map(function (b) { return b.getAttribute('data-play-attr'); });
      const left = names.filter(function (n) { return pks.indexOf(n) < 0; });
      const lines = [];
      pks.forEach(function (n) { lines.push('  ' + n + ' INTEGER PRIMARY KEY'); });
      left.forEach(function (n) {
        const type = n === 'score' ? 'DECIMAL(5,2)' : n === 'birthDate' ? 'DATE' : n === 'dept' ? 'VARCHAR(32)' : 'VARCHAR(64)';
        lines.push('  ' + n + ' ' + type);
      });
      playCode.textContent = 'CREATE TABLE student (\n' + lines.join(',\n') + '\n);';
      if (playCount) playCount.textContent = pks.length + ' PK';
    }
    playAttrs.forEach(function (b) {
      b.addEventListener('click', function () {
        b.setAttribute('data-pk', b.getAttribute('data-pk') === '1' ? '0' : '1');
        b.classList.toggle('is-pk', b.getAttribute('data-pk') === '1');
        playRender();
      });
    });
    const playReset = home.querySelector('[data-play-reset]');
    if (playReset) playReset.addEventListener('click', function () {
      playAttrs.forEach(function (b) {
        const on = b.getAttribute('data-play-attr') === 'sid';
        b.setAttribute('data-pk', on ? '1' : '0');
        b.classList.toggle('is-pk', on);
      });
      playRender();
    });
    const playCopy = home.querySelector('[data-play-copy]');
    if (playCopy) playCopy.addEventListener('click', function () {
      if (!playCode) return;
      DDB.io.copy(playCode.textContent).then(function (ok) {
        DDB.ui.toast(ok ? 'SQL 已复制' : '复制失败', ok ? 'ok' : 'err');
      });
    });
    playRender();

    /* 三步：点开看细节 */
    Array.prototype.forEach.call(home.querySelectorAll('.step-list li'), function (li) {
      li.addEventListener('click', function () {
        const open = li.classList.contains('is-open');
        Array.prototype.forEach.call(home.querySelectorAll('.step-list li'), function (x) { x.classList.remove('is-open'); });
        if (!open) li.classList.add('is-open');
      });
    });
  }
  function showHome() {
    if (window.DDB_HOMEALT) {
      view.innerHTML = window.DDB_HOMEALT.html();
      view.classList.remove('view--tool');
      view.classList.add('view--althome');
      if (altUnmount) { try { altUnmount(); } catch (e) {} altUnmount = null; }
      altUnmount = window.DDB_HOMEALT.mount(view);
      return;
    }
    view.innerHTML = homeHTML();
    view.classList.remove('view--tool');
    homeMotionBound = false;
    bindHomeMotion();
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
      '    <p class="about-lead">A tiny database-design studio in the browser. Four tools, three languages, two themes — drawn by one author and helped by one very patient whale.</p>',
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
      '    <button type="button" class="dd-link" data-menu-settings><span class="dd-num">06</span><b>Settings</b><i>↗</i></button>',
      '    <a class="dd-link" href="#/about" data-menu-nav><span class="dd-num">07</span><b>About</b><i>↗</i></a>',
      '    <div class="dd-mono dd-menu-meta"><span>AUTHOR · NYXKY</span><span>HELPER · DEEPSEEK</span></div>',
      '  </div>',
      '</nav>',
    ].join('\n');
    document.body.appendChild(el);
    menuDrawer = el;
    var panel = el.querySelector('.dd-menu-panel');
    panel.addEventListener('pointerenter', function () {
      window.clearTimeout(menuCloseTimer);
    });
    panel.addEventListener('pointerleave', function () {
      if (menuPinned) return;
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
        closeMenuDrawer(true);
        openSettings(set);
      }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menuDrawer && menuDrawer.classList.contains('on')) closeMenuDrawer(true);
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
    const ph = panel.offsetHeight || 460;
    let top = r ? r.top : margin;
    top = Math.min(Math.max(margin, top), Math.max(margin, window.innerHeight - ph - margin));
    panel.style.top = top + 'px';
    document.body.classList.add('dd-menu-open');
  }

  function closeMenuDrawer(force) {
    if (!menuDrawer) return;
    const el = menuDrawer;
    if (!force && menuPinned) return;
    menuPinned = false;
    el.classList.remove('on');
    el.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('dd-menu-open');
  }

  function bindMenuTriggers() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-menu-trigger]'), function (btn) {
      if (btn.closest('[data-nav-pill]') || btn.closest('[data-ahmenu]')) return;
      if (btn.__ddMenuBound) return;
      btn.__ddMenuBound = true;
      btn.addEventListener('pointerenter', function () {
        if (window.matchMedia && window.matchMedia('(hover: none)').matches) return;
        openMenuDrawer(btn);
      });
      btn.addEventListener('pointerleave', function () {
        if (menuPinned) return;
        window.clearTimeout(menuCloseTimer);
        menuCloseTimer = window.setTimeout(function () { if (!menuPinned) closeMenuDrawer(false); }, 240);
      });
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
    if (setBtn) setBtn.addEventListener('click', function () { openSettings(setBtn); });
    pill.addEventListener('pointerenter', function () { if (!hdrPinned) pill.classList.add('open'); });
    pill.addEventListener('pointerleave', function () { if (!hdrPinned) pill.classList.remove('open'); });
    mb.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
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
      setOpen(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && pill.classList.contains('open')) setOpen(false);
    });
    if (window.DDB_I18N && window.DDB_I18N.retranslate) window.DDB_I18N.retranslate(pill);
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
  function render() {
    const route = parseRoute();
    if (altUnmount) { try { altUnmount(); } catch (e) {} altUnmount = null; }
    view.classList.remove('view--althome');
    if (window.DDB_HOMEALT) document.body.setAttribute('data-route', route.key);
    document.body.classList.add('dd-ed');
    if (menuDrawer) closeMenuDrawer(true);
    document.title = route.title;
    setActiveNav(route);
    // 先把旧内容摘下（保留缓存，便于切换后继续编辑）
    while (view.firstChild) view.removeChild(view.firstChild);
    if (route.key === 'home') showHome();
    else if (route.key === 'about') showAbout();
    else showTool(route);
    ensureHeaderMenu();
    bindMenuTriggers();
    // 页面切换动效
    view.classList.remove('is-entering');
    void view.offsetWidth;
    view.classList.add('is-entering');
    window.clearTimeout(render._enterTimer);
    render._enterTimer = window.setTimeout(function () {
      view.classList.remove('is-entering');
    }, 320);
    if (route.key === 'home' && !window.DDB_HOMEALT) setupReveal();
  }

  const settingsBtn = document.getElementById('settingsBtn');
  if (settingsBtn) settingsBtn.addEventListener('click', function () { openSettings(settingsBtn); });
  document.addEventListener('click', function (e) {
    const t = e.target && e.target.closest ? e.target.closest('[data-alt-settings]') : null;
    if (!t) return;
    e.preventDefault();
    openSettings(t);
  });

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

  applyTheme(readTheme());
  applyAccent(readAccent());
  window.addEventListener('hashchange', render);
  if (!location.hash) location.replace('#/');
  render();
  if (DDB) DDB.version = DDB.version || '1.0.0';
})();

/* file dropdown: close after choosing an item or clicking outside */
(() => {
  document.addEventListener('click', (e) => {
    const item = e.target.closest('.dd-file-pop button, .dd-file-pop a');
    const inside = e.target.closest('.dd-file-menu');
    if (item) {
      const d = item.closest('.dd-file-menu');
      if (d) d.open = false;
    } else if (!inside) {
      document.querySelectorAll('.dd-file-menu[open]').forEach((d) => { d.open = false; });
    }
  });
})();

