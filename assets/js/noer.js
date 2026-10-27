/* ================================================================
   noer.js · noER · NoSQL 文档数据库设计器
   - 集合（collection）画布建模：字段、类型、必填、唯一、嵌套对象/数组、引用
   - 自动检查、示例文档生成、MongoDB JSON Schema / Mongoose 输出
   ================================================================ */
(function () {
  'use strict';
  const util = DDB.util;
  const SAMPLE_IDS = ['65f1c0de9a1b2c3d4e5f6001', '65f1c0de9a1b2c3d4e5f6002', '65f1c0de9a1b2c3d4e5f6003'];

  const TYPES = [
    { id: 'string', label: 'string' },
    { id: 'number', label: 'number' },
    { id: 'boolean', label: 'boolean' },
    { id: 'date', label: 'date' },
    { id: 'objectId', label: 'objectId' },
    { id: 'object', label: 'object（嵌套文档）' },
    { id: 'array', label: 'array（数组）' },
    { id: 'ref', label: 'ref（引用集合）' },
    { id: 'mixed', label: 'mixed（任意）' }
  ];
  const ITEM_TYPES = ['string', 'number', 'boolean', 'date', 'objectId', 'object', 'mixed'];

  /* ---------------- 模型 ---------------- */
  function emptyModel() {
    return { version: 1, name: 'Untitled document model', collections: [] };
  }
  function newCollection(name, x, y) {
    return { id: util.uid('col'), name: name, x: x || 0, y: y || 0, fields: [] };
  }
  function newField(name, type) {
    return { id: util.uid('fld'), name: name || 'field', type: type || 'string', required: false, unique: false, key: false, ref: '' };
  }
  function newChild(name, type) {
    return { id: util.uid('chd'), name: name || 'child', type: type || 'string', required: false };
  }

  function sampleModel() {
    const users = newCollection('users', 60, 60);
    users.fields = [
      { id: util.uid('fld'), name: '_id', type: 'objectId', required: true, unique: true, key: true },
      { id: util.uid('fld'), name: 'email', type: 'string', required: true, unique: true, key: false },
      { id: util.uid('fld'), name: 'displayName', type: 'string', required: true, unique: false, key: false },
      { id: util.uid('fld'), name: 'createdAt', type: 'date', required: true, unique: false, key: false },
      { id: util.uid('fld'), name: 'profile', type: 'object', required: false, unique: false, key: false, children: [
        { id: util.uid('chd'), name: 'avatarUrl', type: 'string', required: false },
        { id: util.uid('chd'), name: 'bio', type: 'string', required: false }
      ] },
      { id: util.uid('fld'), name: 'tags', type: 'array', required: false, unique: false, key: false, itemType: 'string' }
    ];
    const products = newCollection('products', 640, 60);
    products.fields = [
      { id: util.uid('fld'), name: '_id', type: 'objectId', required: true, unique: true, key: true },
      { id: util.uid('fld'), name: 'sku', type: 'string', required: true, unique: true, key: false },
      { id: util.uid('fld'), name: 'title', type: 'string', required: true, unique: false, key: false },
      { id: util.uid('fld'), name: 'price', type: 'number', required: true, unique: false, key: false },
      { id: util.uid('fld'), name: 'stock', type: 'number', required: false, unique: false, key: false },
      { id: util.uid('fld'), name: 'categories', type: 'array', required: false, unique: false, key: false, itemType: 'string' }
    ];
    const orders = newCollection('orders', 60, 420);
    orders.fields = [
      { id: util.uid('fld'), name: '_id', type: 'objectId', required: true, unique: true, key: true },
      { id: util.uid('fld'), name: 'user', type: 'ref', required: true, unique: false, key: false, ref: users.id },
      { id: util.uid('fld'), name: 'items', type: 'array', required: true, unique: false, key: false, itemType: 'object', children: [
        { id: util.uid('chd'), name: 'product', type: 'ref', required: true, ref: products.id },
        { id: util.uid('chd'), name: 'qty', type: 'number', required: true }
      ] },
      { id: util.uid('fld'), name: 'total', type: 'number', required: true, unique: false, key: false },
      { id: util.uid('fld'), name: 'status', type: 'string', required: true, unique: false, key: false },
      { id: util.uid('fld'), name: 'placedAt', type: 'date', required: true, unique: false, key: false }
    ];
    const reviews = newCollection('reviews', 640, 420);
    reviews.fields = [
      { id: util.uid('fld'), name: '_id', type: 'objectId', required: true, unique: true, key: true },
      { id: util.uid('fld'), name: 'order', type: 'ref', required: true, unique: false, key: false, ref: orders.id },
      { id: util.uid('fld'), name: 'rating', type: 'number', required: true, unique: false, key: false },
      { id: util.uid('fld'), name: 'comment', type: 'string', required: false, unique: false, key: false },
      { id: util.uid('fld'), name: 'createdAt', type: 'date', required: true, unique: false, key: false }
    ];
    return { version: 1, name: '电商文档模型（示例）', collections: [users, products, orders, reviews] };
  }

  function normalize(model) {
    const m = model && typeof model === 'object' ? model : emptyModel();
    if (!Array.isArray(m.collections)) m.collections = [];
    m.collections.forEach(function (c) {
      c.id = c.id || util.uid('col');
      c.name = c.name || 'collection';
      c.x = Number(c.x) || 0;
      c.y = Number(c.y) || 0;
      if (!Array.isArray(c.fields)) c.fields = [];
      c.fields.forEach(normField);
    });
    if (!m.name) m.name = 'Untitled document model';
    return m;
  }
  function normField(f) {
    f.id = f.id || util.uid('fld');
    f.name = f.name || 'field';
    f.type = f.type || 'string';
    f.required = !!f.required;
    f.unique = !!f.unique;
    f.key = !!f.key;
    f.ref = f.ref || '';
    if (f.type === 'array') {
      f.itemType = f.itemType || 'string';
      if (!Array.isArray(f.children)) f.children = [];
      f.children.forEach(normChild);
    } else if (f.type === 'object') {
      if (!Array.isArray(f.children)) f.children = [];
      f.children.forEach(normChild);
    } else if (f.children && f.children.length) {
      // 类型改回标量时保留子字段但不使用
      f.children.forEach(normChild);
    }
    return f;
  }
  function normChild(ch) {
    ch.id = ch.id || util.uid('chd');
    ch.name = ch.name || 'child';
    ch.type = ch.type || 'string';
    ch.required = !!ch.required;
    ch.ref = ch.ref || '';
    return ch;
  }
  function hasChildren(f) { return (f.type === 'object' || f.type === 'array') && f.itemType !== 'string'; }

  /* ---------------- 挂载 ---------------- */
  function mount(root, ctx) {
    const state = {
      model: emptyModel(),
      view: { x: 40, y: 30, s: 1 },
      sel: null,          // {cid, fid|null, chid|null}
      refMode: false,
      refFrom: null,
      tab: 'insp',
    };
    let histTimer = null;
    let draftTimer = null;
    let dirty = false;
    let drag = null;
    let pan = null;
    let geo = {};

    root.innerHTML = [
      '<div class="tool">',
      '  <div class="tool-bar">',
      '    <div class="tool-title"><b>noER</b><span class="tool-mode">DOCUMENTS</span></div>',
      '    <button class="btn btn--sm" data-act="new" title="新建空白文档模型">新建</button>',
      '    <button class="btn btn--sm" data-act="sample" title="载入示例：电商文档模型">示例</button>',
      '    <button class="btn btn--sm" data-act="save" title="保存到浏览器 (Ctrl+S)">保存</button>',
      '    <button class="btn btn--sm" data-act="open">打开</button>',
      '    <button class="btn btn--sm" data-act="export-json" title="导出为 .json 文件">导出</button>',
      '    <button class="btn btn--sm" data-act="import-json" title="从 .json 文件导入">导入</button>',
      '    <span class="sep"></span>',
      '    <button class="btn btn--sm" data-act="undo" title="撤销 (Ctrl+Z)">↶</button>',
      '    <button class="btn btn--sm" data-act="redo" title="重做 (Ctrl+Y)">↷</button>',
      '    <span class="sep"></span>',
      '    <button class="btn btn--sm" data-act="add-col">＋ 集合</button>',
      '    <button class="btn btn--sm" data-act="ref-mode" title="引用模式：先点源集合，再点目标集合 (L)">🔗 引用</button>',
      '    <button class="btn btn--sm" data-act="layout" title="重新排布所有集合">自动布局</button>',
      '  </div>',
      '  <div class="tool-body">',
      '    <aside class="tool-left">',
      '      <div class="panel-body">',
      '        <div class="panel-title">添加元素</div>',
      '        <button class="btn btn--sm btn--block" data-act="add-col">▤ 集合 Collection</button>',
      '        <button class="btn btn--sm btn--block" data-act="ref-mode">🔗 引用另一个集合</button>',
      '        <div class="hint">引用模式：先点来源集合，再点目标集合。</div>',
      '      </div>',
      '      <div class="panel-body">',
      '        <div class="panel-title">集合列表 <span class="hint" id="noerCount"></span></div>',
      '        <div class="outline-list" id="noerOutline"></div>',
      '      </div>',
      '      <div class="panel-body">',
      '        <div class="panel-title">文档模型要点</div>',
      '        <div class="hint">每个集合自带 _id<br>嵌套 = 内嵌 object<br>一对多放在「多」侧<br>unique 字段自动建索引</div>',
      '      </div>',
      '    </aside>',
      '    <div class="tool-canvas">',
      '      <div class="canvas" id="noerCanvas">',
      '        <div class="world" id="noerWorld">',
      '          <svg class="edges" id="noerEdges"></svg>',
      '          <div class="overlay" id="noerOverlay"></div>',
      '          <div class="nodes" id="noerNodes"></div>',
      '        </div>',
      '        <div class="canvas-hint" id="noerHint">',
      '          <b>空白文档模型</b><span>点击左上角「＋ 集合」开始设计<br>或载入示例模型快速体验</span>',
      '          <div style="margin-top:14px;pointer-events:auto"><button class="btn btn--sm btn--primary" data-act="sample">载入示例模型</button></div>',
      '        </div>',
      '      </div>',
      '      <div class="canvas-tools">',
      '        <div class="zoom-chip">',
      '          <button data-act="zoom-out" title="缩小">−</button>',
      '          <span class="zval" id="noerZoom">100%</span>',
      '          <button data-act="zoom-in" title="放大">＋</button>',
      '          <button data-act="zoom-fit" title="适应画布">⤢</button>',
      '        </div>',
      '      </div>',
      '      <div class="canvas-legend">',
      '        <span>▤ 集合</span><span>→ 引用</span><span>● 必填</span><span>● 唯一</span><span>嵌套字段缩进</span>',
      '      </div>',
      '    </div>',
      '    <aside class="tool-right">',
      '      <div class="tabbar" id="noerTabs">',
      '        <button class="tab active" data-tab="insp">属性</button>',
      '        <button class="tab" data-tab="checks">检查<span class="cnt" id="noerCheckCnt">0</span></button>',
      '      </div>',
      '      <div class="tab-panel" id="noerTabInsp"></div>',
      '      <div class="tab-panel hidden" id="noerTabChecks"></div>',
      '    </aside>',
      '  </div>',
      '</div>'
    ].join('\n');

    const $ = function (sel) { return root.querySelector(sel); };
    const canvasEl = $('#noerCanvas');
    const worldEl = $('#noerWorld');
    const nodesEl = $('#noerNodes');
    const edgesEl = $('#noerEdges');
    const overlayEl = $('#noerOverlay');
    const hintEl = $('#noerHint');

    /* ---------------- 历史 ---------------- */
    const history = DDB.createHistory({
      get: function () { return state.model; },
      set: function (m) { state.model = normalize(m); },
      limit: 80
    });
    history.reset();

    /* 草稿：刷新后保留当前编辑内容 */
    function saveDraft() {
      clearTimeout(draftTimer);
      draftTimer = setTimeout(function () {
        DDB.draft.save('noer', { model: state.model, view: state.view });
      }, 200);
    }
    function loadDraft() {
      const d = DDB.draft.load('noer');
      if (!d || !d.model || !Array.isArray(d.model.collections)) return false;
      state.model = normalize(d.model);
      if (d.view && typeof d.view.x === 'number') {
        state.view = {
          x: d.view.x,
          y: d.view.y,
          s: util.clamp(d.view.s || 1, 0.25, 2.4)
        };
      }
      
      return state.model.collections.length > 0;
    }

    function pushNow() {
      if (!dirty) return;
      clearTimeout(histTimer);
      dirty = false;
      history.push();
      updateToolbar();
      saveDraft();
    }
    function schedulePush() {
      dirty = true;
      clearTimeout(histTimer);
      histTimer = setTimeout(function () {
        if (!dirty) return;
        dirty = false;
        history.push();
        updateToolbar();
        saveDraft();
      }, 500);
    }
    function undo() {
      pushNow();
      if (history.undo()) { normalizeSel(); refresh(); }
      else ui.toast('没有可撤销的操作');
    }
    function redo() {
      if (history.redo()) { normalizeSel(); refresh(); }
      else ui.toast('没有可重做的操作');
    }
    const ui = DDB.ui;

    /* ---------------- 查找 ---------------- */
    function getCol(id) { return state.model.collections.find(function (c) { return c.id === id; }); }
    function findField(cid, fid) {
      const c = getCol(cid);
      if (!c) return null;
      return c.fields.find(function (f) { return f.id === fid; }) || null;
    }
    function getRefTarget(cid, fid, chid) {
      const f = findField(cid, fid);
      if (!f) return null;
      if (chid) {
        const ch = (f.children || []).find(function (x) { return x.id === chid; });
        return ch && ch.ref ? getCol(ch.ref) : null;
      }
      return f.ref ? getCol(f.ref) : null;
    }
    function normalizeSel() {
      if (!state.sel) return;
      const c = getCol(state.sel.cid);
      if (!c) { state.sel = null; return; }
      if (state.sel.fid) {
        const f = findField(state.sel.cid, state.sel.fid);
        if (!f) { state.sel.fid = null; state.sel.chid = null; return; }
        if (state.sel.chid && !(f.children || []).some(function (x) { return x.id === state.sel.chid; })) state.sel.chid = null;
      }
    }
    function allRefs() {
      const out = [];
      state.model.collections.forEach(function (c) {
        c.fields.forEach(function (f) {
          if (f.type === 'ref') out.push({ cid: c.id, fid: f.id, name: f.name, target: f.ref });
          (f.children || []).forEach(function (ch) {
            if (ch.type === 'ref') out.push({ cid: c.id, fid: f.id, chid: ch.id, name: f.name + '.' + ch.name, target: ch.ref });
          });
        });
      });
      return out;
    }

    /* ---------------- 视图 ---------------- */
    function applyView() {
      worldEl.style.transform = 'translate(' + state.view.x + 'px,' + state.view.y + 'px) scale(' + state.view.s + ')';
      const z = $('#noerZoom');
      if (z) z.textContent = Math.round(state.view.s * 100) + '%';
    }
    function zoomAt(cx, cy, factor) {
      const s0 = state.view.s;
      const s1 = util.clamp(s0 * factor, 0.25, 2.4);
      if (s1 === s0) return;
      state.view.x = cx - (cx - state.view.x) * (s1 / s0);
      state.view.y = cy - (cy - state.view.y) * (s1 / s0);
      state.view.s = s1;
      applyView();
    }
    function fitView() {
      const cs = state.model.collections;
      if (!cs.length) { state.view = { x: 40, y: 30, s: 1 }; applyView(); return; }
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      cs.forEach(function (c) {
        const g = geo[c.id];
        const w = g ? g.w : 250, h = g ? g.h : 120;
        minX = Math.min(minX, c.x); minY = Math.min(minY, c.y);
        maxX = Math.max(maxX, c.x + w); maxY = Math.max(maxY, c.y + h);
      });
      const pad = 50;
      const cw = canvasEl.clientWidth, ch = canvasEl.clientHeight;
      const s = util.clamp(Math.min(cw / (maxX - minX + pad * 2), ch / (maxY - minY + pad * 2)), 0.3, 1.3);
      state.view.s = s;
      state.view.x = (cw - (maxX - minX) * s) / 2 - minX * s;
      state.view.y = (ch - (maxY - minY) * s) / 2 - minY * s;
      applyView();
    }
    function centerCol(id) {
      const c = getCol(id);
      if (!c) return;
      const g = geo[id];
      const w = g ? g.w : 250, h = g ? g.h : 120;
      state.view.s = Math.max(state.view.s, 0.75);
      state.view.x = canvasEl.clientWidth / 2 - (c.x + w / 2) * state.view.s;
      state.view.y = canvasEl.clientHeight / 2 - (c.y + h / 2) * state.view.s;
      applyView();
    }

    /* ---------------- 渲染：节点 ---------------- */
    function fieldHTML(c, f, child) {
      const d = child || f;
      const isSel = state.sel && state.sel.cid === c.id && state.sel.fid === f.id && (child ? state.sel.chid === child.id : !state.sel.chid);
      const tgt = child ? getCol(d.ref) : getRefTarget(c.id, f.id);
      const flags = [];
      if (d.required) flags.push('<span class="flag" title="必填"></span>');
      if (d.unique) flags.push('<span class="flag uniq" title="唯一"></span>');
      let typeLabel = d.type;
      if (d.type === 'array') typeLabel = 'array<' + (d.itemType || 'mixed') + '>';
      if (d.type === 'ref') typeLabel = 'ref';
      return '<div class="noer-field' + (child ? ' nested' : '') + (isSel ? ' f-sel' : '') + '" data-col="' + c.id + '" data-field="' + f.id + '" data-child="' + (child ? child.id : '') + '">' +
        flags.join('') +
        '<span class="fn">' + util.esc(d.name) + (d.key ? ' 🔑' : '') + '</span>' +
        (d.type === 'ref'
          ? '<span class="ft fref">' + util.esc(tgt ? '→ ' + tgt.name : '→ ?') + '</span>'
          : '<span class="ft">' + util.esc(typeLabel) + '</span>') +
        '</div>';
    }
    function collectionCardHTML(c) {
      const selected = state.sel && state.sel.cid === c.id && !state.sel.fid;
      let rows = '';
      c.fields.forEach(function (f) {
        rows += fieldHTML(c, f);
        if (hasChildren(f)) {
          (f.children || []).forEach(function (ch) { rows += fieldHTML(c, f, ch); });
        }
      });
      const nestedCount = c.fields.reduce(function (n, f) { return n + ((f.children || []).length); }, 0);
      return '<div class="noer-node" data-col="' + c.id + '" style="left:' + c.x + 'px;top:' + c.y + 'px">' +
        '<div class="noer-card' + (selected ? ' selected' : '') + '">' +
        '  <div class="noer-head" data-col="' + c.id + '" data-head="1">' +
        '    <span class="dot"></span><span class="nm" data-edit-name="' + c.id + '">' + util.esc(c.name) + '</span>' +
        '    <span class="kind">' + c.fields.length + ' 个字段' + (nestedCount ? ' · ' + nestedCount + ' 个嵌套' : '') + '</span>' +
        '  </div>' +
        '  <div class="noer-fields">' +
        (rows || '<div class="noer-empty">还没有字段，点下面的「＋ 字段」添加</div>') +
        '    <div class="noer-field-add" data-act="add-field" data-col="' + c.id + '">＋ 字段</div>' +
        '  </div>' +
        '</div>' +
        '</div>';
    }
    function renderNodes() {
      nodesEl.innerHTML = state.model.collections.map(collectionCardHTML).join('');
      geo = {};
      state.model.collections.forEach(function (c) {
        const el = nodesEl.querySelector('.noer-node[data-col="' + c.id + '"]');
        if (el) geo[c.id] = { x: c.x, y: c.y, w: el.offsetWidth, h: el.offsetHeight };
      });
      hintEl.style.display = state.model.collections.length ? 'none' : '';
    }

    /* ---------------- 渲染：连线 ---------------- */
    function rectPoint(cx, cy, w, h, dx, dy) {
      const hw = w / 2, hh = h / 2;
      let t = Infinity;
      if (dx) t = Math.min(t, Math.abs(hw / dx));
      if (dy) t = Math.min(t, Math.abs(hh / dy));
      if (!isFinite(t)) t = 0;
      return { x: cx + dx * t, y: cy + dy * t };
    }
    function renderEdges() {
      const defs = '<defs><marker id="noerArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#9aa8c9"/></marker></defs>';
      const refs = allRefs();
      const groups = {};
      refs.forEach(function (r) {
        if (!r.target) return;
        const key = [r.cid, r.target].sort().join('|');
        groups[key] = groups[key] || [];
        groups[key].push(r);
      });
      const paths = [];
      const labels = [];
      Object.keys(groups).forEach(function (key) {
        const list = groups[key];
        list.forEach(function (r, i) {
          const sc = getCol(r.cid), tc = getCol(r.target);
          if (!sc || !tc) return;
          const off = (i - (list.length - 1) / 2) * 26;
          const gs = geo[sc.id] || { x: sc.x, y: sc.y, w: 250, h: 120 };
          const gt = geo[tc.id] || { x: tc.x, y: tc.y, w: 250, h: 120 };
          const csx = gs.x + gs.w / 2, csy = gs.y + gs.h / 2;
          const ctx2 = gt.x + gt.w / 2, cty = gt.y + gt.h / 2;
          if (sc.id === tc.id) {
            const x = gs.x + gs.w, y = gs.y + 40;
            const d = 'M' + x + ',' + y + ' C' + (x + 90) + ',' + (y - 40) + ' ' + (x + 90) + ',' + (y + 70) + ' ' + x + ',' + (y + 50);
            paths.push('<path class="e-line" d="' + d + '" marker-end="url(#noerArrow)"/>');
            labels.push({ x: x + 70, y: y + 10, text: r.name });
            return;
          }
          let dx = ctx2 - csx, dy = cty - csy;
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          dx /= len; dy /= len;
          // 垂直方向偏移避免多条引用线重叠
          const px = -dy * off, py = dx * off;
          const sp = rectPoint(csx + px, csy + py, gs.w, gs.h, dx, dy);
          const tp = rectPoint(ctx2 + px, cty + py, gt.w, gt.h, -dx, -dy);
          const active = state.sel && state.sel.cid === sc.id && state.sel.fid === r.fid;
          paths.push('<path class="e-line' + (active ? ' active' : '') + '" d="M' + sp.x + ',' + sp.y + ' L' + tp.x + ',' + tp.y + '" marker-end="url(#noerArrow)"/>');
          labels.push({ x: (sp.x + tp.x) / 2, y: (sp.y + tp.y) / 2, text: r.name });
        });
      });
      edgesEl.innerHTML = defs + paths.join('');
      overlayEl.innerHTML = labels.map(function (l) {
        return '<span class="er-edge-label" style="left:' + l.x + 'px;top:' + l.y + 'px"><span class="card">' + util.esc(l.text) + '</span></span>';
      }).join('');
    }

    /* ---------------- 渲染：左栏 / 顶栏 ---------------- */
    function renderOutline() {
      const box = $('#noerOutline');
      const cs = state.model.collections;
      const cnt = $('#noerCount');
      if (cnt) cnt.textContent = cs.length + ' 个集合';
      if (!cs.length) { box.innerHTML = '<div class="hint" style="padding:8px">还没有集合</div>'; return; }
      box.innerHTML = cs.map(function (c) {
        const active = state.sel && state.sel.cid === c.id;
        const refs = c.fields.filter(function (f) { return f.type === 'ref'; }).length;
        return '<div class="outline-item' + (active ? ' active' : '') + '" data-act="locate" data-id="' + c.id + '">' +
          '<span class="oi-name">' + util.esc(c.name) + '</span>' +
          '<span class="oi-meta">' + c.fields.length + (refs ? ' · ' + refs + ' ref' : '') + '</span>' +
          '<button class="icon-x del" data-act="del-col" data-id="' + c.id + '" title="删除集合" style="border:0;background:transparent;color:var(--muted);cursor:pointer">✕</button>' +
          '</div>';
      }).join('');
    }
    function updateToolbar() {
      root.querySelectorAll('[data-act="undo"]').forEach(function (b) { b.disabled = !history.canUndo(); b.style.opacity = history.canUndo() ? '' : '.45'; });
      root.querySelectorAll('[data-act="redo"]').forEach(function (b) { b.disabled = !history.canRedo(); b.style.opacity = history.canRedo() ? '' : '.45'; });
      root.querySelectorAll('[data-act="ref-mode"]').forEach(function (b) { b.classList.toggle('btn--primary', state.refMode); });
      root.querySelectorAll('.tab').forEach(function (t) { t.classList.toggle('active', t.getAttribute('data-tab') === state.tab); });
      ['insp', 'checks'].forEach(function (t) {
        const panel = $('#noerTab' + t.charAt(0).toUpperCase() + t.slice(1));
        if (panel) panel.classList.toggle('hidden', t !== state.tab);
      });
      const sel = $('#noerTabInsp');
      if (state.refMode) sel.classList.add('ref');
      canvasEl.classList.toggle('linking', state.refMode);
    }

    /* ---------------- 渲染：属性面板 ---------------- */
    function selectOptions(list, current) {
      return list.map(function (t) {
        const v = typeof t === 'string' ? t : t.id;
        const l = typeof t === 'string' ? t : t.label;
        return '<option value="' + v + '"' + (v === current ? ' selected' : '') + '>' + l + '</option>';
      }).join('');
    }
    function bind(o) { return 'data-bind="' + util.esc(JSON.stringify(o)) + '"'; }
    function fieldRowHTML(c, f, ch) {
      const d = ch
        ? { t: 'child', cid: c.id, fid: f.id, chid: ch.id }
        : { t: 'field', cid: c.id, fid: f.id };
      const name = ch ? ch.name : f.name;
      const type = ch ? ch.type : f.type;
      const required = ch ? ch.required : f.required;
      const rowSel = state.sel && state.sel.cid === c.id && state.sel.fid === f.id && (ch ? state.sel.chid === ch.id : !state.sel.chid);
      let extra = '';
      if (!ch) {
        if (type === 'ref') {
          const others = state.model.collections.filter(function (x) { return x.id !== c.id; });
          extra += '<label class="field"><span>引用集合</span><select ' + bind({ t: 'field', cid: c.id, fid: f.id, k: 'ref' }) + '>' +
            '<option value="">（请选择）</option>' +
            others.map(function (x) { return '<option value="' + x.id + '"' + (f.ref === x.id ? ' selected' : '') + '>' + util.esc(x.name) + '</option>'; }).join('') +
            '</select></label>';
        }
        if (type === 'array') {
          extra += '<label class="field"><span>数组元素类型</span><select ' + bind({ t: 'field', cid: c.id, fid: f.id, k: 'itemType' }) + '>' + selectOptions(ITEM_TYPES, f.itemType) + '</select></label>';
        }
      }
      const childrenBox = (!ch && hasChildren(f)) ? '<div class="attr-children">' +
        (f.children || []).map(function (x) { return fieldRowHTML(c, f, x); }).join('') +
        '<button class="btn btn--sm" data-act="add-child" data-col="' + c.id + '" data-fid="' + f.id + '">＋ 嵌套字段</button>' +
        '</div>' : '';
      return '<div class="attr-row' + (rowSel ? ' sel' : '') + '">' +
        '<div class="attr-row-top">' +
        '<input class="nm" placeholder="字段名" value="' + util.esc(name) + '" ' + bind(Object.assign({}, d, { k: 'name' })) + '>' +
        '<select class="ty" ' + bind(Object.assign({}, d, { k: 'type' })) + '>' + selectOptions(TYPES, type) + '</select>' +
        '<button class="icon-x" data-act="' + (ch ? 'del-child' : 'del-field') + '" data-col="' + c.id + '" data-fid="' + f.id + '"' + (ch ? ' data-chid="' + ch.id + '"' : '') + ' title="删除">✕</button>' +
        '</div>' +
        '<div class="attr-row-flags">' +
        '<label class="check"><input type="checkbox" ' + bind(Object.assign({}, d, { k: 'required' })) + (required ? ' checked' : '') + '> 必填</label>' +
        (!ch ? '<label class="check"><input type="checkbox" ' + bind({ t: 'field', cid: c.id, fid: f.id, k: 'unique' }) + (f.unique ? ' checked' : '') + '> 唯一</label>' +
          '<label class="check"><input type="checkbox" ' + bind({ t: 'field', cid: c.id, fid: f.id, k: 'key' }) + (f.key ? ' checked' : '') + '> 主键</label>' : '') +
        '</div>' + extra + childrenBox + '</div>';
    }
    function renderInspector() {
      const box = $('#noerTabInsp');
      const s = state.sel;
      if (!s) {
        const emptyHint = state.refMode
          ? '引用模式已开启：先点击包含引用字段的集合，再点击被引用的集合。'
          : '在画布中选择一个集合查看并编辑它的文档结构。<br>也可以在左侧列表点击集合名称定位。';
        box.innerHTML = '<div class="insp"><div class="insp-empty">' + emptyHint + '</div></div>';
        return;
      }
      const c = getCol(s.cid);
      if (!c) { box.innerHTML = '<div class="insp"><div class="insp-empty">集合已删除</div></div>'; return; }
      const refs = allRefs().filter(function (r) { return r.target === c.id; });
      let html = '<div class="insp">';
      html += '<div class="insp-section"><div class="insp-title">集合 Collection</div>' +
        '<label class="field"><span>集合名</span><input type="text" value="' + util.esc(c.name) + '" ' + bind({ t: 'collection', cid: c.id, k: 'name' }) + '></label>' +
        '<div class="insp-actions">' +
        '<button class="btn btn--sm" data-act="add-field" data-col="' + c.id + '">＋ 字段</button>' +
        '<button class="btn btn--sm" data-act="locate" data-id="' + c.id + '">定位</button>' +
        '<button class="btn btn--sm btn--danger" data-act="del-col" data-id="' + c.id + '">删除集合</button>' +
        '</div></div>';
      html += '<div class="insp-section"><div class="insp-title">字段 <span class="hint">' + c.fields.length + '</span></div>';
      if (!c.fields.length) html += '<div class="hint">还没有字段，点「＋ 字段」添加。</div>';
      else html += c.fields.map(function (f) { return fieldRowHTML(c, f, null); }).join('');
      html += '</div>';
      if (refs.length) {
        html += '<div class="insp-section"><div class="insp-title">被引用（' + refs.length + '）</div><div class="hint">' +
          refs.map(function (r) { const src = getCol(r.cid); return util.esc((src ? src.name : '?') + '.' + r.name); }).join('、') + '</div></div>';
      }
      html += '</div>';
      box.innerHTML = html;
    }

    /* ---------------- 检查 ---------------- */
    function checks() {
      const out = [];
      const err = function (m, t) { out.push({ level: 'err', msg: m, target: t }); };
      const warn = function (m, t) { out.push({ level: 'warn', msg: m, target: t }); };
      const info = function (m, t) { out.push({ level: 'info', msg: m, target: t }); };
      const cs = state.model.collections;
      if (!cs.length) { info('文档模型还是空的，先添加一个集合。'); return out; }
      const names = {};
      cs.forEach(function (c) {
        const t = { cid: c.id };
        const label = c.name || '（未命名集合）';
        if (!c.name || !c.name.trim()) err('存在未命名的集合。', t);
        const lower = (c.name || '').trim().toLowerCase();
        if (lower) {
          if (names[lower]) err('集合名重复：「' + c.name + '」。', t);
          names[lower] = true;
          if (!/^[a-z][a-z0-9_]*$/i.test(c.name)) warn('集合名「' + c.name + '」不是推荐的命名风格（小写字母/数字/下划线）。', t);
        }
        if (!c.fields.length) warn('集合「' + label + '」没有任何字段。', t);
        const hasId = c.fields.some(function (f) { return f.name === '_id' || f.key; });
        if (!hasId) info('集合「' + label + '」没有 _id 字段，生成时会自动补上默认 _id。', t);
        const fnames = {};
        let requiredCount = 0;
        c.fields.forEach(function (f) {
          const ft = { cid: c.id, fid: f.id };
          const fl = f.name || '（未命名字段）';
          if (!f.name || !f.name.trim()) err('集合「' + label + '」存在未命名字段。', ft);
          else if (fnames[f.name.toLowerCase()]) err('集合「' + label + '」字段名重复：「' + f.name + '」。', ft);
          else fnames[f.name.toLowerCase()] = true;
          if (f.required) requiredCount += 1;
          if (f.type === 'ref') {
            if (!f.ref) err('引用字段「' + label + '.' + fl + '」没有选择目标集合。', ft);
            else {
              const tgt = getCol(f.ref);
              if (!tgt) err('引用字段「' + label + '.' + fl + '」的目标集合已被删除。', ft);
              else {
                const tk = tgt.fields.some(function (x) { return x.name === '_id' || x.key; });
                if (!tk) warn('引用字段「' + label + '.' + fl + '」的目标集合「' + tgt.name + '」没有 _id 字段。', ft);
              }
            }
          }
          if (f.type === 'object' && !(f.children || []).length) warn('嵌套文档字段「' + label + '.' + fl + '」还没有子字段。', ft);
          if (f.type === 'array') {
            if (!f.itemType) warn('数组字段「' + label + '.' + fl + '」没有指定元素类型。', ft);
            if (f.itemType === 'object' && !(f.children || []).length) warn('文档数组字段「' + label + '.' + fl + '」还没有描述元素结构。', ft);
          }
          (f.children || []).forEach(function (ch) {
            const ct = { cid: c.id, fid: f.id, chid: ch.id };
            if (!ch.name || !ch.name.trim()) err('嵌套字段「' + label + '.' + fl + '」存在未命名字段。', ct);
            if (ch.type === 'ref' && !ch.ref) err('嵌套引用字段「' + label + '.' + fl + '.' + (ch.name || '?') + '」没有选择目标集合。', ct);
            if (ch.type === 'ref' && ch.ref && !getCol(ch.ref)) err('嵌套引用字段「' + label + '.' + fl + '.' + (ch.name || '?') + '」的目标集合不存在。', ct);
          });
        });
        if (c.fields.length && !requiredCount) info('集合「' + label + '」没有任何必填字段，考虑把关键字段标记为必填。', t);
        const uniq = c.fields.filter(function (f) { return f.unique; });
        if (uniq.length) info('集合「' + label + '」的唯一字段会生成唯一索引：' + uniq.map(function (f) { return f.name; }).join(', ') + '。', t);
      });
      allRefs().forEach(function (r) {
        if (r.target && r.cid === r.target && !r.chid) info('集合「' + (getCol(r.cid) || {}).name + '」存在自引用字段「' + r.name + '」（例如树形结构）。', { cid: r.cid, fid: r.fid });
      });
      // 双向引用提示
      const pairs = {};
      allRefs().forEach(function (r) {
        if (!r.target || r.chid) return;
        const key = [r.cid, r.target].sort().join('|');
        pairs[key] = pairs[key] || [];
        pairs[key].push(r);
      });
      Object.keys(pairs).forEach(function (k) {
        const list = pairs[k];
        const cids = {};
        list.forEach(function (r) { cids[r.cid] = true; });
        if (Object.keys(cids).length > 1) warn('两个集合之间存在双向引用（' + list.map(function (r) { const c = getCol(r.cid); return (c ? c.name : '?') + '.' + r.name; }).join('、') + '），文档模型里通常只需要单向引用。', { cid: list[0].cid });
      });
      return out;
    }
    function renderChecks() {
      const list = checks();
      const bad = list.filter(function (x) { return x.level !== 'info'; }).length;
      const cnt = $('#noerCheckCnt');
      if (cnt) { cnt.textContent = bad; cnt.style.display = bad ? '' : 'none'; }
      const box = $('#noerTabChecks');
      if (!list.length) { box.innerHTML = '<div class="check-ok">✓ 模型看起来没有问题</div>'; return; }
      if (!bad) box.innerHTML = '<div class="check-ok" style="margin-bottom:10px">✓ 没有错误或警告</div>';
      const order = { err: 0, warn: 1, info: 2 };
      const sorted = list.slice().sort(function (a, b) { return order[a.level] - order[b.level]; });
      box.innerHTML = '<div class="check-list">' + sorted.map(function (c, i) {
        const go = c.target ? '<span class="cgo" data-act="locate-check" data-idx="' + i + '">定位</span>' : '';
        return '<div class="check-item ' + c.level + '"><span class="cdot"></span><span class="cmsg">' + util.esc(c.msg) + '</span>' + go + '</div>';
      }).join('') + '</div>';
      box.__list = sorted;
    }

    /* ---------------- 刷新 ---------------- */
    function refresh(opts) {
      opts = opts || {};
      renderNodes();
      renderEdges();
      renderOutline();
      if (!opts.keepInspector) renderInspector();
      renderChecks();
      updateToolbar();
      saveDraft();
      if (!opts.keepView) applyView();
    }

    /* ---------------- 数据操作 ---------------- */
    function mutate(fn, opts) {
      fn(state.model);
      pushNow();
      refresh(opts || {});
    }
    function viewCenterWorld() {
      return {
        x: (-state.view.x + canvasEl.clientWidth / 2) / state.view.s - 125,
        y: (-state.view.y + canvasEl.clientHeight / 2) / state.view.s - 60
      };
    }
    function addCollection(name) {
      const p = viewCenterWorld();
      const taken = state.model.collections.map(function (c) { return c.name; });
      const col = newCollection(util.uniqueName(name || 'collection', taken), p.x, p.y);
      col.fields.push({ id: util.uid('fld'), name: '_id', type: 'objectId', required: true, unique: true, key: true });
      state.model.collections.push(col);
      state.sel = { cid: col.id, fid: null, chid: null };
      pushNow();
      refresh();
      centerCol(col.id);
      ui.toast('已添加集合 ' + col.name, 'ok');
    }
    function addField(cid, f) {
      const c = getCol(cid);
      if (!c) return;
      const names = c.fields.map(function (x) { return x.name; });
      const nf = f || newField(util.uniqueName('field', names), 'string');
      c.fields.push(nf);
      state.sel = { cid: c.id, fid: nf.id, chid: null };
      pushNow();
      refresh();
      ui.toast('已添加字段 ' + nf.name, 'ok');
    }
    function addChild(cid, fid) {
      const f = findField(cid, fid);
      if (!f) return;
      if (!Array.isArray(f.children)) f.children = [];
      const ch = newChild(util.uniqueName('child', f.children.map(function (x) { return x.name; })), 'string');
      f.children.push(ch);
      state.sel = { cid: cid, fid: fid, chid: ch.id };
      pushNow();
      refresh();
    }
    function deleteCollection(cid) {
      const c = getCol(cid);
      if (!c) return;
      const refs = allRefs().filter(function (r) { return r.target === cid; });
      let msg = '删除集合「' + c.name + '」会同时删除它的 ' + c.fields.length + ' 个字段。';
      if (refs.length) msg += '\n另有 ' + refs.length + ' 个引用字段指向它，删除后这些引用将失效。';
      ui.confirm({ title: '删除集合', message: msg, okLabel: '删除', danger: true }).then(function (ok) {
        if (!ok) return;
        state.model.collections = state.model.collections.filter(function (x) { return x.id !== cid; });
        allRefs().forEach(function (r) {
          if (r.target !== cid) return;
          const f = findField(r.cid, r.fid);
          if (r.chid && f) f.children = (f.children || []).filter(function (ch) { return ch.id !== r.chid; });
          else if (f) f.ref = '';
        });
        if (state.sel && state.sel.cid === cid) state.sel = null;
        pushNow();
        refresh();
        ui.toast('已删除集合 ' + c.name, 'ok');
      });
    }
    function deleteField(cid, fid, chid) {
      const c = getCol(cid);
      if (!c) return;
      const f = findField(cid, fid);
      if (!f) return;
      if (chid) { f.children = (f.children || []).filter(function (ch) { return ch.id !== chid; }); }
      else {
        if (c.fields.length <= 1) { ui.toast('集合至少保留一个字段，可通过删除集合来移除它', 'warn'); return; }
        c.fields = c.fields.filter(function (x) { return x.id !== fid; });
      }
      if (state.sel && state.sel.fid === fid && (!chid || state.sel.chid === chid)) { state.sel.fid = null; state.sel.chid = null; }
      else if (state.sel && state.sel.chid === chid) state.sel.chid = null;
      pushNow();
      refresh();
    }
    function autoLayout() {
      const cs = state.model.collections;
      const cols = Math.max(1, Math.ceil(Math.sqrt(cs.length)));
      const cw = 300, ch = 240;
      cs.forEach(function (c, i) {
        c.x = 40 + (i % cols) * cw;
        c.y = 40 + Math.floor(i / cols) * ch;
      });
      pushNow();
      refresh();
      fitView();
      ui.toast('已自动布局', 'ok');
    }

    /* ---------------- 绑定编辑 ---------------- */
    function applyBind(d, value, isCheck) {
      if (d.t === 'collection') {
        const c = getCol(d.cid);
        if (!c) return;
        if (d.k === 'name') c.name = value;
        return;
      }
      const c = getCol(d.cid);
      if (!c) return;
      const f = findField(c.id, d.fid);
      if (!f) return;
      const obj = d.t === 'child' ? (f.children || []).find(function (x) { return x.id === d.chid; }) : f;
      if (!obj) return;
      if (d.k === 'name') {
        obj.name = value;
      } else if (d.k === 'type') {
        obj.type = value;
        if (value === 'object' || (value === 'array' && obj.itemType === 'object')) {
          if (!Array.isArray(obj.children)) obj.children = [];
        } else if (value === 'array') {
          if (!obj.itemType) obj.itemType = 'string';
        } else if (value === 'ref') {
          if (!obj.ref) {
            const other = state.model.collections.find(function (x) { return x.id !== c.id; });
            if (other) obj.ref = other.id;
          }
        } else {
          delete obj.children;
        }
      } else if (d.k === 'itemType') {
        obj.itemType = value;
        if (value === 'object' && !Array.isArray(obj.children)) obj.children = [];
      } else if (d.k === 'ref') {
        obj.ref = value;
      } else if (d.k === 'required' || d.k === 'unique' || d.k === 'key') {
        obj[d.k] = isCheck ? !!value : value;
      }
    }

    /* ---------------- 导出 / 存档 ---------------- */
    function exportJSON() {
      DDB.io.download(util.ident(state.model.name) + '.noer.json', JSON.stringify(state.model, null, 2), 'application/json');
      ui.toast('已导出模型 JSON', 'ok');
    }
    function importJSON() {
      DDB.io.pickFile('.json,application/json').then(function (res) {
        if (!res) return;
        try {
          const m = JSON.parse(res.text);
          if (!m || !Array.isArray(m.collections)) throw new Error('缺少 collections');
          state.model = normalize(m);
          state.sel = null;
          history.reset();
          refresh();
          fitView();
          ui.toast('已导入 ' + state.model.collections.length + ' 个集合', 'ok');
        } catch (e) {
          ui.toast('导入失败：' + e.message, 'err');
        }
      });
    }
    function save() {
      DDB.ui.prompt({ title: '保存文档模型', label: '名称', value: state.model.name || 'Untitled document model' }).then(function (name) {
        if (!name) return;
        state.model.name = name;
        if (DDB.store.save('noer', name, state.model)) ui.toast('已保存到浏览器：' + name, 'ok');
        else ui.toast('保存失败（浏览器存储不可用）', 'err');
        refresh();
      });
    }
    function open() {
      const list = DDB.store.list('noer');
      if (!list.length) { ui.toast('还没有保存的文档模型', 'info'); return; }
      const body = '<div class="store-list">' + list.map(function (r) {
        return '<div class="store-item"><div><div class="si-name">' + util.esc(r.name) + '</div>' +
          '<div class="si-meta">' + util.fmtAgo(r.savedAt) + '</div></div>' +
          '<div class="si-actions"><button class="btn btn--sm" data-load="' + util.esc(r.name) + '">打开</button>' +
          '<button class="btn btn--sm btn--danger" data-rm="' + util.esc(r.name) + '">删除</button></div></div>';
      }).join('') + '</div>';
      DDB.ui.modal({
        title: '打开已保存的文档模型', body: body, wide: false,
        onMount: function (modal, close) {
          modal.querySelectorAll('[data-load]').forEach(function (b) {
            b.addEventListener('click', function () {
              const rec = DDB.store.load('noer', b.getAttribute('data-load'));
              if (!rec || !rec.model) { ui.toast('读取失败', 'err'); return; }
              close();
              state.model = normalize(rec.model);
              state.sel = null;
              history.reset();
              refresh();
              fitView();
              ui.toast('已打开：' + rec.name, 'ok');
            });
          });
          modal.querySelectorAll('[data-rm]').forEach(function (b) {
            b.addEventListener('click', function () {
              const name = b.getAttribute('data-rm');
              ui.confirm({ title: '删除存档', message: '确定删除「' + name + '」？', danger: true, okLabel: '删除' }).then(function (ok) {
                if (!ok) return;
                DDB.store.remove('noer', name);
                close();
                ui.toast('已删除存档');
              });
            });
          });
        }
      });
    }
    function setRefMode(on) {
      state.refMode = !!on;
      state.refFrom = null;
      updateToolbar();
      renderInspector();
      if (state.refMode) ui.toast('引用模式：先点源集合，再点目标集合', 'info');
    }

    /* ---------------- 命令 ---------------- */
    function command(act, el) {
      switch (act) {
        case 'new':
          ui.confirm({ title: '新建文档模型', message: '当前模型未保存的修改会丢失，确定新建？', okLabel: '新建' }).then(function (ok) {
            if (!ok) return;
            state.model = emptyModel();
            state.sel = null;
            history.reset();
            refresh();
          });
          break;
        case 'sample': {
          const load = function () {
            state.model = normalize(sampleModel());
            state.sel = null;
            history.reset();
            refresh();
            fitView();
            ui.toast('已载入示例模型', 'ok');
          };
          if (!state.model.collections.length) { load(); break; }
          ui.confirm({ title: '载入示例模型', message: '将载入「电商文档模型」示例，当前内容会被替换。', okLabel: '载入' }).then(function (ok) {
            if (!ok) return;
            load();
          });
          break;
        }
        case 'save': save(); break;
        case 'open': open(); break;
        case 'export-json': exportJSON(); break;
        case 'import-json': importJSON(); break;
        case 'undo': undo(); break;
        case 'redo': redo(); break;
        case 'add-col': addCollection(); break;
        case 'add-field': addField(el.getAttribute('data-col')); break;
        case 'add-child': addChild(el.getAttribute('data-col'), el.getAttribute('data-fid')); break;
        case 'del-field': deleteField(el.getAttribute('data-col'), el.getAttribute('data-fid')); break;
        case 'del-child': deleteField(el.getAttribute('data-col'), el.getAttribute('data-fid'), el.getAttribute('data-chid')); break;
        case 'del-col': deleteCollection(el.getAttribute('data-id')); break;
        case 'ref-mode': setRefMode(!state.refMode); break;
        case 'layout': autoLayout(); break;
        case 'locate': centerCol(el.getAttribute('data-id')); break;
        case 'locate-check': {
          const list = $('#noerTabChecks').__list || [];
          const item = list[+el.getAttribute('data-idx')];
          if (!item || !item.target) break;
          state.sel = { cid: item.target.cid, fid: item.target.fid || null, chid: item.target.chid || null };
          state.tab = 'insp';
          updateToolbar();
          refresh();
          centerCol(item.target.cid);
          break;
        }
        case 'zoom-in': zoomAt(canvasEl.clientWidth / 2, canvasEl.clientHeight / 2, 1.2); break;
        case 'zoom-out': zoomAt(canvasEl.clientWidth / 2, canvasEl.clientHeight / 2, 1 / 1.2); break;
        case 'zoom-fit': fitView(); break;
        default: break;
      }
    }

    /* ---------------- 事件 ---------------- */
    root.addEventListener('click', function (e) {
      const tab = util.closest(e.target, '[data-tab]');
      if (tab && root.contains(tab)) {
        state.tab = tab.getAttribute('data-tab');
        updateToolbar();
        return;
      }
      const bindEl = util.closest(e.target, '[data-bind]');
      if (bindEl && (bindEl.tagName === 'INPUT' || bindEl.tagName === 'SELECT') && bindEl.type === 'checkbox') {
        applyBind(JSON.parse(bindEl.getAttribute('data-bind')), bindEl.checked, true);
        pushNow();
        refresh({ keepInspector: false });
        return;
      }
      const actEl = util.closest(e.target, '[data-act]');
      if (actEl && root.contains(actEl)) {
        command(actEl.getAttribute('data-act'), actEl);
        return;
      }
      // 左右侧栏内的点击不改变画布选中
      if (util.closest(e.target, '.tool-left') || util.closest(e.target, '.tool-right')) return;
      // 点击画布上的字段 / 集合
      const fldEl = util.closest(e.target, '.noer-field');
      if (fldEl) {
        const cid = fldEl.getAttribute('data-col');
        const fid = fldEl.getAttribute('data-field');
        const chid = fldEl.getAttribute('data-child') || null;
        if (state.refMode) { handleRefClick(cid); return; }
        state.sel = { cid: cid, fid: fid, chid: chid || null };
        state.tab = 'insp';
        updateToolbar();
        refresh();
        return;
      }
      const cardEl = util.closest(e.target, '.noer-card');
      if (cardEl) {
        const node = util.closest(cardEl, '.noer-node');
        const cid = node ? node.getAttribute('data-col') : cardEl.getAttribute('data-col');
        if (state.refMode) { handleRefClick(cid); return; }
        state.sel = { cid: cid, fid: null, chid: null };
        state.tab = 'insp';
        updateToolbar();
        refresh();
        return;
      }
      // 空白：取消选择
      state.sel = null;
      if (state.refMode) state.refFrom = null;
      refresh();
    });

    root.addEventListener('input', function (e) {
      const el = e.target;
      if (!el || !el.getAttribute || !el.hasAttribute('data-bind')) return;
      const d = JSON.parse(el.getAttribute('data-bind'));
      if (d.k === 'name' || d.k === 'ref') {
        applyBind(d, el.value);
        schedulePush();
        refresh({ keepInspector: true, keepView: true });
        renderEdges();
      }
    });

    root.addEventListener('change', function (e) {
      const el = e.target;
      if (!el || !el.getAttribute) return;
      if (!el.hasAttribute('data-bind')) return;
      const d = JSON.parse(el.getAttribute('data-bind'));
      if (d.k === 'name' || d.k === 'ref') return; // 已由 input 处理
      applyBind(d, el.value, el.type === 'checkbox');
      pushNow();
      refresh();
    });

    function handleRefClick(targetCid) {
      if (!state.refFrom) {
        state.refFrom = targetCid;
        ui.toast('已选择源集合，请点击被引用的集合', 'info');
        return;
      }
      const from = state.refFrom;
      if (from === targetCid) { state.refFrom = null; ui.toast('已取消引用选择'); return; }
      const src = getCol(from), tgt = getCol(targetCid);
      state.refFrom = null;
      if (!src || !tgt) return;
      DDB.ui.prompt({
        title: '创建引用字段',
        label: '在「' + src.name + '」中新增引用「' + tgt.name + '」的字段名',
        value: util.lowerFirst(tgt.name) + 'Ref',
        hint: 'ref 字段存放目标集合的 _id。'
      }).then(function (name) {
        if (!name) return;
        const f = newField(name, 'ref');
        f.ref = tgt.id;
        src.fields.push(f);
        state.sel = { cid: src.id, fid: f.id, chid: null };
        state.refMode = false;
        pushNow();
        refresh();
        ui.toast('已创建引用字段 ' + src.name + '.' + name, 'ok');
      });
    }

    /* 画布：平移 / 缩放 / 拖拽 */
    canvasEl.addEventListener('wheel', function (e) {
      e.preventDefault();
      const r = canvasEl.getBoundingClientRect();
      const f = e.deltaY < 0 ? 1.1 : 1 / 1.1;
      zoomAt(e.clientX - r.left, e.clientY - r.top, f);
    }, { passive: false });

    canvasEl.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      // 交互控件上的按下不启动拖拽（否则 click 会被画布吞掉）
      if (util.closest(e.target, 'button, a, input, select, textarea, [data-act], [data-bind]')) return;
      const node = util.closest(e.target, '.noer-node');
      if (node) {
        const cid = node.getAttribute('data-col');
        const c = getCol(cid);
        if (!c) return;
        drag = { cid: cid, sx: e.clientX, sy: e.clientY, ox: c.x, oy: c.y, moved: false };
        return;
      }
      if (util.closest(e.target, '.noer-card')) return;
      pan = { sx: e.clientX, sy: e.clientY, ox: state.view.x, oy: state.view.y };
      canvasEl.classList.add('panning');
    });

    function onPointerMove(e) {
      if (!root.isConnected || !root.offsetParent) return;
      if (drag) {
        const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
        if (!drag.moved && Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
        if (!drag.moved) return;
        const c = getCol(drag.cid);
        if (!c) return;
        c.x = drag.ox + dx / state.view.s;
        c.y = drag.oy + dy / state.view.s;
        renderNodes();
        renderEdges();
        return;
      }
      if (pan) {
        state.view.x = pan.ox + (e.clientX - pan.sx);
        state.view.y = pan.oy + (e.clientY - pan.sy);
        applyView();
      }
    }
    function onPointerUp() {
      if (drag) {
        if (drag.moved) { pushNow(); renderNodes(); renderEdges(); }
        drag = null;
      }
      if (pan) { pan = null; canvasEl.classList.remove('panning'); }
    }
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);

    /* 双击集合名内联重命名 */
    root.addEventListener('dblclick', function (e) {
      const el = util.closest(e.target, '[data-edit-name]');
      if (!el) return;
      const cid = el.getAttribute('data-edit-name');
      const c = getCol(cid);
      if (!c) return;
      el.contentEditable = 'true';
      el.focus();
      document.execCommand && document.execCommand('selectAll', false, null);
      const done = function () {
        el.contentEditable = 'false';
        const v = (el.textContent || '').trim();
        if (v && v !== c.name) { c.name = v; pushNow(); }
        refresh();
      };
      el.addEventListener('blur', done, { once: true });
      el.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter') { ev.preventDefault(); el.blur(); }
        if (ev.key === 'Escape') { el.textContent = c.name; el.blur(); }
      });
    });

    /* 键盘 */
    function onKeyDown(e) {
      if (!root.isConnected || !root.offsetParent) return;
      if (util.inField(e)) return;
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); }
      else if (ctrl && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); }
      else if (ctrl && e.key.toLowerCase() === 's') { e.preventDefault(); save(); }
      else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (state.sel && state.sel.fid) { e.preventDefault(); deleteField(state.sel.cid, state.sel.fid, state.sel.chid); }
        else if (state.sel && state.sel.cid) { e.preventDefault(); deleteCollection(state.sel.cid); }
      } else if (e.key.toLowerCase() === 'l') { setRefMode(!state.refMode); }
      else if (e.key === 'Escape') {
        if (state.refMode) setRefMode(false);
        else if (state.sel) { state.sel = null; refresh(); }
      }
    }
    document.addEventListener('keydown', onKeyDown);

    /* ---------------- 初始化 ---------------- */
    function boot() {
      const restored = loadDraft();
      state.model = normalize(state.model);
      if (restored) history.reset();
      refresh();
      applyView();
      if (!state.model.collections.length) {
        // 首次进入给一个可操作的空画布提示
        state.sel = null;
      } else if (restored) {
        setTimeout(fitView, 60);
      }
    }

    // 对外暴露给 app.js 的保存/载入辅助（打开工具时若有草稿则恢复）
    DDB.tools.noer = DDB.tools.noer || {};
    DDB.tools.noer.mount = mount;
    DDB.tools.noer.state = state;
    DDB.tools.noer.save = save;
    DDB.tools.noer.load = function (model) { state.model = normalize(model); state.sel = null; history.reset(); refresh(); fitView(); };
    DDB.tools.noer.exportJSON = exportJSON;
    boot();

    /* 触屏双指缩放（手机 / 平板） */
    const removePinch = (function () {
      const pts = new Map();
      let active = false, startDist = 0, startS = 1, startVX = 0, startVY = 0;
      let startMid = { x: 0, y: 0 }, swallowUntil = 0;
      function midPoint(r) {
        const list = Array.from(pts.values());
        return { x: (list[0].x + list[1].x) / 2 - r.left, y: (list[0].y + list[1].y) / 2 - r.top };
      }
      function down(e) {
        if (e.pointerType === 'mouse') return;
        pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pts.size !== 2) return;
        const list = Array.from(pts.values());
        const r = canvasEl.getBoundingClientRect();
        active = true;
        startDist = Math.hypot(list[0].x - list[1].x, list[0].y - list[1].y) || 1;
        startS = state.view.s; startVX = state.view.x; startVY = state.view.y;
        startMid = midPoint(r);
        swallowUntil = Date.now() + 500;
        e.preventDefault(); e.stopPropagation();
      }
      function move(e) {
        if (!pts.has(e.pointerId)) return;
        pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (!active || pts.size < 2) return;
        const list = Array.from(pts.values());
        const r = canvasEl.getBoundingClientRect();
        const m = midPoint(r);
        const d = Math.hypot(list[0].x - list[1].x, list[0].y - list[1].y) || startDist;
        const ns = Math.max(0.25, Math.min(2.4, startS * (d / startDist)));
        const wx = (startMid.x - startVX) / startS;
        const wy = (startMid.y - startVY) / startS;
        state.view.s = ns;
        state.view.x = m.x - wx * ns;
        state.view.y = m.y - wy * ns;
        applyView();
        renderEdges();
        e.preventDefault(); e.stopPropagation();
      }
      function up(e) {
        if (!pts.has(e.pointerId)) return;
        pts.delete(e.pointerId);
        if (active && pts.size < 2) { active = false; swallowUntil = Date.now() + 350; }
      }
      function swallowClick(e) {
        if (Date.now() < swallowUntil) { e.preventDefault(); e.stopPropagation(); }
      }
      canvasEl.addEventListener('pointerdown', down, true);
      window.addEventListener('pointermove', move, { passive: false, capture: true });
      window.addEventListener('pointerup', up, true);
      window.addEventListener('pointercancel', up, true);
      canvasEl.addEventListener('click', swallowClick, true);
      return function () {
        canvasEl.removeEventListener('pointerdown', down, true);
        window.removeEventListener('pointermove', move, true);
        window.removeEventListener('pointerup', up, true);
        window.removeEventListener('pointercancel', up, true);
        canvasEl.removeEventListener('click', swallowClick, true);
      };
    })();
    return function unmount() {
      if (removePinch) removePinch();
      clearTimeout(histTimer);
      clearTimeout(draftTimer);
      if (state.model.collections.length) {
        DDB.draft.save('noer', { model: state.model, view: state.view });
      }
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      root.innerHTML = '';
    };
  }

  DDB.tools.noer = DDB.tools.noer || {};
  DDB.tools.noer.id = 'noer';
  DDB.tools.noer.title = 'noER · 文档数据库设计';
  DDB.tools.noer.mount = mount;
})();
