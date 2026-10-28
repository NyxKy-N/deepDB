/*!
 * designQT basic · 关系代数表达式图形编辑器
 * 纯静态、无依赖，window.DDB.tools.ra.mount(root, ctx)
 */
(function () {
  function slug(s) { return String(s).replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, '-'); }
  'use strict';

  const DDB = window.DDB;
  const util = DDB.util;
  const ui = DDB.ui;

  /* ---------------- 操作符定义 ---------------- */
  const KINDS = {
    relation: { sym: '▤', label: '关系', arity: 0, rel: true },
    select: { sym: 'σ', label: '选择', arity: 1, prop: 'pred', ph: 'age > 20' },
    project: { sym: 'π', label: '投影', arity: 1, prop: 'cols', ph: 'name, dept' },
    rename: { sym: 'ρ', label: '重命名', arity: 1, prop: 'map', ph: 'S(sid, sname)' },
    join: { sym: '⋈', label: '连接', arity: 2, prop: 'cond', ph: 'S.sid = E.sid' },
    product: { sym: '×', label: '笛卡尔积', arity: 2 },
    union: { sym: '∪', label: '并', arity: 2 },
    intersect: { sym: '∩', label: '交', arity: 2 },
    diff: { sym: '−', label: '差', arity: 2 },
    group: { sym: 'γ', label: '分组聚合', arity: 1 },
    division: { sym: '÷', label: '除', arity: 2 },
    slot: { sym: '＋', label: '占位符', arity: 0 }
  };

  function uid(p) { return util.uid(p || 'n'); }

  function mkNode(kind) {
    const def = KINDS[kind];
    const n = {
      id: uid('ra'), kind: kind, name: '', cols: '', pred: '', map: '',
      cond: '', groupBy: '', aggs: '', children: [], ox: 0, oy: 0
    };
    if (kind === 'relation') { n.name = ''; n.cols = ''; }
    for (let i = 0; i < def.arity; i++) n.children.push(mkNode('slot'));
    return n;
  }

  function emptyModel() {
    return { version: 1, name: 'Untitled expression', root: mkNode('slot') };
  }

  /* 选课系统示例：
     π_{sname, dept} ( σ_{score > 90} ( Student ⋈_{Student.sid = Enrolls.sid} Enrolls ) ) */
  function sampleModel() {
    const student = mkNode('relation');
    student.name = 'Student'; student.cols = 'sid, sname, dept, score';
    const enroll = mkNode('relation');
    enroll.name = 'Enrolls'; enroll.cols = 'sid, cid, score';
    const join = mkNode('join');
    join.cond = 'Student.sid = Enrolls.sid';
    join.children = [student, enroll];
    const sel = mkNode('select');
    sel.pred = 'score > 90';
    sel.children = [join];
    const proj = mkNode('project');
    proj.cols = 'sname, dept';
    proj.children = [sel];
    return { version: 1, name: '选课系统 · 查询示例', root: proj };
  }

  /* ---------------- 工具函数 ---------------- */
  function parseList(s) {
    return String(s || '').split(',').map(function (x) { return x.trim(); })
      .filter(Boolean);
  }

  function findNode(n, id, parent) {
    if (!n) return null;
    if (n.id === id) return { node: n, parent: parent || null };
    for (let i = 0; i < n.children.length; i++) {
      const r = findNode(n.children[i], id, n);
      if (r) return r;
    }
    return null;
  }

  function everyNode(n, fn) {
    if (!n) return;
    fn(n);
    n.children.forEach(function (c) { everyNode(c, fn); });
  }

  function collectSlots(n, out) {
    if (!n) return out;
    if (n.kind === 'slot') out.push(n);
    n.children.forEach(function (c) { collectSlots(c, out); });
    return out;
  }

  /* 输出字段推断 */
  function schemaOf(n, depth) {
    depth = depth || 0;
    if (!n || n.kind === 'slot' || depth > 40) return null;
    const c = n.children || [];
    switch (n.kind) {
      case 'relation':
        return parseList(n.cols).map(function (x) { return { name: x, src: n.name || '?' }; });
      case 'select': return schemaOf(c[0], depth + 1);
      case 'project':
        return parseList(n.cols).map(function (x) { return { name: x, src: '' }; });
      case 'rename': {
        const sub = schemaOf(c[0], depth + 1);
        const map = String(n.map || '').trim();
        const m = map.match(/^([A-Za-z_][\w]*)\s*\(([^)]*)\)/);
        if (m) {
          const cols = parseList(m[2]);
          return cols.map(function (x) { return { name: x, src: m[1] }; });
        }
        return sub;
      }
      case 'join': case 'product': {
        const a = schemaOf(c[0], depth + 1), b = schemaOf(c[1], depth + 1);
        if (!a && !b) return null;
        return (a || []).concat(b || []);
      }
      case 'union': case 'intersect': case 'diff':
        return schemaOf(c[0], depth + 1);
      case 'group': {
        const out = parseList(n.groupBy).map(function (x) { return { name: x, src: '' }; });
        parseList(n.aggs).forEach(function (a) {
          const mm = String(a).match(/\bas\s+([A-Za-z_]\w*)/i);
          out.push({ name: mm ? mm[1] : a.split('(')[0].trim().toLowerCase() || 'agg', src: '' });
        });
        return out;
      }
      case 'division': {
        const a = schemaOf(c[0], depth + 1) || [];
        const b = schemaOf(c[1], depth + 1) || [];
        const bn = b.map(function (x) { return x.name; });
        return a.filter(function (x) { return bn.indexOf(x.name) < 0; });
      }
      default: return null;
    }
  }

  function schemaNames(n) {
    const s = schemaOf(n);
    if (!s) return null;
    return s.map(function (x) { return x.name; });
  }

  /* 关系代数表达式文本 */
  function exprOf(n, depth) {
    depth = depth || 0;
    if (!n || n.kind === 'slot' || depth > 40) return '?';
    const c = n.children || [];
    const sub = function (i) { return exprOf(c[i], depth + 1); };
    switch (n.kind) {
      case 'relation': return (n.name || '未命名表');
      case 'select': return 'σ_{' + (n.pred || '?') + '}(' + sub(0) + ')';
      case 'project': return 'π_{' + (n.cols || '?') + '}(' + sub(0) + ')';
      case 'rename': return 'ρ_{' + (n.map || '?') + '}(' + sub(0) + ')';
      case 'join': return '(' + sub(0) + ' ⋈_{' + (n.cond || '?') + '} ' + sub(1) + ')';
      case 'product': return '(' + sub(0) + ' × ' + sub(1) + ')';
      case 'union': return '(' + sub(0) + ' ∪ ' + sub(1) + ')';
      case 'intersect': return '(' + sub(0) + ' ∩ ' + sub(1) + ')';
      case 'diff': return '(' + sub(0) + ' − ' + sub(1) + ')';
      case 'group': return 'γ_{' + (n.groupBy || '?') + '; ' + (n.aggs || '?') + '}(' + sub(0) + ')';
      case 'division': return '(' + sub(0) + ' ÷ ' + sub(1) + ')';
      default: return '?';
    }
  }

  /* ---------------- mount ---------------- */
  function mount(root, ctx) {
    ctx = ctx || {};
    let state = {
      model: emptyModel(),
      sel: null,
      tab: 'insp',
      view: { x: 60, y: 30, s: 1 }
    };
    let geo = {};
    let histTimer = null;
    let draftTimer = null;

    const history = DDB.createHistory({
      get: function () { return JSON.stringify(state.model); },
      set: function (s) {
        try { state.model = JSON.parse(s); } catch (e) { }
        if (state.sel && !findNode(state.model.root, state.sel)) state.sel = null;
        refresh();
      },
      limit: 120,
      onChange: function () { updateToolbar(); }
    });

    /* 草稿：刷新后保留当前表达式 */
    function isEmptyModel(m) { return !m || !m.root || m.root.kind === 'slot'; }
    function saveDraft() {
      clearTimeout(draftTimer);
      draftTimer = setTimeout(function () {
        if (isEmptyModel(state.model)) { DDB.draft.clear('ra'); return; }
        DDB.draft.save('ra', { model: state.model, view: state.view });
      }, 200);
    }
    function loadDraft() {
      const d = DDB.draft.load('ra');
      if (!d || !d.model || !d.model.root) return false;
      state.model = normalize(d.model);
      if (d.view && typeof d.view.x === 'number') {
        state.view = { x: d.view.x, y: d.view.y, s: util.clamp(d.view.s || 1, 0.25, 2.2) };
      }
      return !isEmptyModel(state.model);
    }

    root.innerHTML = [
      '<div class="tool">',
      '  <div class="tool-bar">',
      '    <div class="tool-title"><b>designQT</b><span class="tool-mode">basic · 关系代数</span></div>',
      '    <span class="sep"></span>',
      '    <button class="btn btn--sm" data-act="new">新建</button>',
      '    <button class="btn btn--sm" data-act="sample">示例</button>',
      '    <button class="btn btn--sm" data-act="save">保存</button>',
      '    <button class="btn btn--sm" data-act="open">打开</button>',
      '    <span class="sep"></span>',
      '    <button class="btn btn--sm" data-act="undo" title="撤销 (Ctrl+Z)">撤销</button>',
      '    <button class="btn btn--sm" data-act="redo" title="重做 (Ctrl+Y)">重做</button>',
      '    <span class="sep"></span>',
      '    <button class="btn btn--sm" data-act="layout">自动布局</button>',
      '    <span class="spacer"></span>',
      '    <button class="btn btn--sm btn--primary" data-act="gen">生成表达式</button>',
      '  </div>',
      '  <div class="tool-body">',
      '    <aside class="tool-left">',
      '      <div class="panel-body">',
      '        <div class="panel-title">添加操作</div>',
      '        <div class="ra-ops">',
      '          <button class="btn btn--sm" data-act="add-op" data-kind="relation" title="填入占位符：基表">▤ 关系</button>',
      '          <button class="btn btn--sm" data-act="add-op" data-kind="select" title="σ 选择">σ 选择</button>',
      '          <button class="btn btn--sm" data-act="add-op" data-kind="project" title="π 投影">π 投影</button>',
      '          <button class="btn btn--sm" data-act="add-op" data-kind="rename" title="ρ 重命名">ρ 重命名</button>',
      '          <button class="btn btn--sm" data-act="add-op" data-kind="join" title="⋈ 连接">⋈ 连接</button>',
      '          <button class="btn btn--sm" data-act="add-op" data-kind="product" title="× 笛卡尔积">× 积</button>',
      '          <button class="btn btn--sm" data-act="add-op" data-kind="union" title="∪ 并">∪ 并</button>',
      '          <button class="btn btn--sm" data-act="add-op" data-kind="intersect" title="∩ 交">∩ 交</button>',
      '          <button class="btn btn--sm" data-act="add-op" data-kind="diff" title="− 差">− 差</button>',
      '          <button class="btn btn--sm" data-act="add-op" data-kind="group" title="γ 分组聚合">γ 聚合</button>',
      '          <button class="btn btn--sm" data-act="add-op" data-kind="division" title="÷ 除">÷ 除</button>',
      '        </div>',
      '        <div class="hint">先点占位符再选操作；选中节点会包一层。</div>',
      '      </div>',
      '      <div class="panel-body">',
      '        <div class="panel-title">表达式树</div>',
      '        <div class="outline-list" id="raOutline"></div>',
      '      </div>',
      '      <div class="panel-body">',
      '        <div class="panel-title">快捷键</div>',
      '        <div class="hint">Ctrl+Z / Ctrl+Y 撤销重做 · Delete 删除节点 · Esc 取消选中 · 滚轮缩放画布</div>',
      '      </div>',
      '    </aside>',
      '    <div class="tool-canvas">',
      '      <div class="canvas" id="raCanvas">',
      '        <div class="world" id="raWorld">',
      '          <svg class="edges" id="raEdges" width="4000" height="3000"></svg>',
      '          <div class="nodes" id="raNodes"></div>',
      '        </div>',
      '        <div class="ra-root-empty" id="raHint"><b>还没有表达式</b><span>点击左侧「▤ 关系」开始，或先点「示例」</span></div>',
      '        <div class="canvas-tools"><div class="zoom-chip"><button class="icon-btn" data-act="zoom-out">−</button><span class="zval" id="raZoom">100%</span><button class="icon-btn" data-act="zoom-in">＋</button><button class="icon-btn" data-act="zoom-fit" title="适应画布">⤢</button></div></div>',
      '        <div class="canvas-legend">σ 选择 · π 投影 · ρ 重命名 · ⋈ 连接 · × 积 · ∪ ∩ − 集合运算 · γ 聚合</div>',
      '      </div>',
      '    </div>',
      '    <aside class="tool-right">',
      '      <div class="tabbar">',
      '        <button class="tab active" data-tab="insp">属性</button>',
      '        <button class="tab" data-tab="checks">检查<span class="cnt" id="raCheckCnt"></span></button>',
      '        <button class="tab" data-tab="expr">表达式</button>',
      '      </div>',
      '      <div class="tab-panel" id="raTabInsp"></div>',
      '      <div class="tab-panel hidden" id="raTabChecks"></div>',
      '      <div class="tab-panel hidden" id="raTabExpr"></div>',
      '    </aside>',
      '  </div>',
      '</div>'
    ].join('\n');

    const $ = function (sel) { return root.querySelector(sel); };
    const canvasEl = $('#raCanvas');
    const worldEl = $('#raWorld');
    const nodesEl = $('#raNodes');
    const edgesEl = $('#raEdges');

    /* ---------- 历史 ---------- */
    function pushNow() { clearTimeout(histTimer); history.push(); updateToolbar(); saveDraft(); }
    function schedulePush() {
      clearTimeout(histTimer);
      histTimer = setTimeout(function () { history.push(); saveDraft(); }, 500);
    }
    function undo() { if (history.undo()) { state.sel = null; refresh(); } }
    function redo() { if (history.redo()) { state.sel = null; refresh(); } }

    /* ---------- 视图 ---------- */
    function applyView() {
      worldEl.style.transform = 'translate(' + state.view.x + 'px, ' + state.view.y + 'px) scale(' + state.view.s + ')';
      worldEl.style.transformOrigin = '0 0';
      const z = $('#raZoom');
      if (z) z.textContent = Math.round(state.view.s * 100) + '%';
    }    function zoomAt(cx, cy, factor) {
      const v = state.view;
      const ns = util.clamp(v.s * factor, 0.25, 2.2);
      const k = ns / v.s;
      v.x = cx - (cx - v.x) * k;
      v.y = cy - (cy - v.y) * k;
      v.s = ns;
      applyView();
    }
    function fitView() {
      const b = bounds();
      if (!b) return;
      const pad = 70;
      const cw = canvasEl.clientWidth, ch = canvasEl.clientHeight;
      if (!cw || !ch) return;
      const s = util.clamp(Math.min((cw - pad * 2) / b.w, (ch - pad * 2) / b.h), 0.3, 1.35);
      state.view.s = s;
      state.view.x = (cw - b.w * s) / 2 - b.x * s;
      state.view.y = (ch - b.h * s) / 2 - b.y * s;
      applyView();
    }
    function bounds() {
      const all = [];
      everyNode(state.model.root, function (n) { all.push(n); });
      const placed = all.filter(function (n) { return typeof n.x === 'number'; });
      if (!placed.length) return null;
      let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
      placed.forEach(function (n) {
        const g = geo[n.id] || { w: 160, h: 60 };
        x1 = Math.min(x1, n.x); y1 = Math.min(y1, n.y);
        x2 = Math.max(x2, n.x + g.w); y2 = Math.max(y2, n.y + g.h);
      });
      return { x: x1, y: y1, w: Math.max(1, x2 - x1), h: Math.max(1, y2 - y1) };
    }

    /* ---------- 布局 ---------- */
    const V_GAP = 82, H_GAP = 30;
    function relayout() {
      const rootNode = state.model.root;
      if (!rootNode) return;
      // 自底向上计算子树宽度
      const widths = {};
      function measureW(n) {
        const g = geo[n.id] || { w: 170 };
        if (!n.children.length) { widths[n.id] = g.w; return g.w; }
        let total = 0;
        n.children.forEach(function (c, i) {
          total += measureW(c) + (i ? H_GAP : 0);
        });
        widths[n.id] = Math.max(g.w, total);
        return widths[n.id];
      }
      measureW(rootNode);
      let maxY = 0;
      function place(n, left, top) {
        const g = geo[n.id] || { w: 170, h: 60 };
        const w = widths[n.id];
        n.bx = left + (w - g.w) / 2;
        n.by = top;
        n.x = n.bx + (n.ox || 0);
        n.y = n.by + (n.oy || 0);
        maxY = Math.max(maxY, top + g.h);
        if (!n.children.length) return;
        let childLeft = left;
        const totalKids = n.children.reduce(function (s, c) { return s + widths[c.id]; }, 0) + H_GAP * (n.children.length - 1);
        childLeft = left + (w - totalKids) / 2;
        n.children.forEach(function (c) {
          place(c, childLeft, top + g.h + V_GAP);
          childLeft += widths[c.id] + H_GAP;
        });
      }
      place(rootNode, 0, 0);
      return maxY;
    }

    /* ---------- 节点渲染 ---------- */
    function infoLines(n) {
      const out = [];
      if (n.kind === 'relation') {
        if (!n.name) out.push({ t: '（未命名基表）', dim: true });
        else out.push({ t: n.name });
        if (n.cols) out.push({ t: '(' + n.cols + ')', dim: true });
      } else if (n.kind === 'select') {
        out.push({ t: n.pred ? 'σ.cond = ' + n.pred : 'σ.cond = ？', dim: !n.pred });
      } else if (n.kind === 'project') {
        out.push({ t: n.cols ? 'π.cols = ' + n.cols : 'π.cols = ？', dim: !n.cols });
      } else if (n.kind === 'rename') {
        out.push({ t: n.map ? 'ρ.map = ' + n.map : 'ρ.map = ？', dim: !n.map });
      } else if (n.kind === 'join') {
        out.push({ t: n.cond ? '⋈.cond = ' + n.cond : '⋈.cond = ？', dim: !n.cond });
      } else if (n.kind === 'group') {
        out.push({ t: n.groupBy ? 'γ.groupBy = ' + n.groupBy : 'γ.groupBy = ？', dim: !n.groupBy });
        out.push({ t: n.aggs ? 'γ.aggs = ' + n.aggs : 'γ.aggs = ？', dim: !n.aggs });
      }
      return out;
    }

    function nodeHTML(n) {
      const def = KINDS[n.kind] || KINDS.slot;
      if (n.kind === 'slot') {
        return '<div class="ra-node" data-node="' + n.id + '">' +
          '<div class="ra-slot">＋ 占位符<br>点击左侧操作填充</div></div>';
      }
      const lines = infoLines(n).map(function (l) {
        return '<div class="ln' + (l.dim ? ' dim' : '') + '">' + util.esc(l.t) + '</div>';
      }).join('');
      const names = schemaNames(n);
      const cols = names && names.length
        ? '<div class="ra-cols">' + names.slice(0, 10).map(function (x) { return '<span>' + util.esc(x) + '</span>'; }).join('') + (names.length > 10 ? '<span>…</span>' : '') + '</div>'
        : '';
      return '<div class="ra-node" data-node="' + n.id + '">' +
        '<div class="ra-card' + (def.rel ? ' ra-rel' : '') + '">' +
        '<div class="ra-sym"><span class="s">' + def.sym + '</span><span>' + def.label + '</span></div>' +
        (lines ? '<div class="ra-info">' + lines + '</div>' : '') +
        cols +
        '</div></div>';
    }

    function renderNodes() {
      // 空模型（根就是一个占位符）时用画布中央的提示代替节点，避免重复占位
      const emptyRoot = !state.model.root || state.model.root.kind === 'slot';
      const list = [];
      if (!emptyRoot) everyNode(state.model.root, function (n) { list.push(n); });
      nodesEl.innerHTML = list.map(nodeHTML).join('');
      // 先测量，再布局，再定位
      const els = nodesEl.querySelectorAll('.ra-node');
      els.forEach(function (el) {
        el.style.left = '0px'; el.style.top = '0px';
        geo[el.getAttribute('data-node')] = { w: el.offsetWidth, h: el.offsetHeight };
      });
      if (!emptyRoot) relayout();
      els.forEach(function (el) {
        const id = el.getAttribute('data-node');
        const r = findNode(state.model.root, id);
        if (!r) return;
        el.style.left = r.node.x + 'px';
        el.style.top = r.node.y + 'px';
        el.classList.toggle('selected', state.sel === id);
      });
      const hint = $('#raHint');
      if (hint) hint.style.display = emptyRoot ? '' : 'none';
    }

    function renderEdges() {
      const parts = [];
      function walk(n) {
        if (!n || !n.children.length) return;
        const gp = geo[n.id] || { w: 170, h: 60 };
        const px = n.x + gp.w / 2, py = n.y + gp.h;
        n.children.forEach(function (c) {
          const gc = geo[c.id] || { w: 170, h: 60 };
          const cx = c.x + gc.w / 2, cy = c.y;
          const mid = (py + cy) / 2;
          parts.push('<path class="ra-edge' + (c.kind === 'slot' ? ' slot' : '') + '" d="M' + px + ',' + py +
            ' C' + px + ',' + mid + ' ' + cx + ',' + mid + ' ' + cx + ',' + cy + '"/>');
          walk(c);
        });
      }
      walk(state.model.root);
      edgesEl.innerHTML = parts.join('');
    }

    /* ---------- 大纲 ---------- */
    function renderOutline() {
      const box = $('#raOutline');
      if (!box) return;
      const rows = [];
      function walk(n, depth) {
        const def = KINDS[n.kind] || KINDS.slot;
        let label = def.label;
        if (n.kind === 'relation') label = n.name || '（未命名）';
        else if (n.kind === 'select') label = 'σ ' + (n.pred || '…');
        else if (n.kind === 'project') label = 'π ' + (n.cols || '…');
        else if (n.kind === 'rename') label = 'ρ ' + (n.map || '…');
        else if (n.kind === 'join') label = '⋈ ' + (n.cond || '…');
        else if (n.kind === 'group') label = 'γ ' + (n.groupBy || '…');
        rows.push('<div class="outline-item' + (state.sel === n.id ? ' active' : '') + '" data-act="locate" data-id="' + n.id + '" style="padding-left:' + (8 + depth * 12) + 'px">' +
          '<span class="oi-name" data-i18n="1">' + def.sym + ' ' + util.esc(label) + '</span></div>');
        n.children.forEach(function (c) { walk(c, depth + 1); });
      }
      if (state.model.root) walk(state.model.root, 0);
      box.innerHTML = rows.join('') || '<div class="store-empty">还没有节点</div>';
    }

    /* ---------- 属性面板 ---------- */
    function fieldRow(label, key, value, ph) {
      return '<label class="field"><span>' + util.esc(label) + '</span>' +
        '<input type="text" data-bind="' + util.esc(key) + '" value="' + util.esc(value || '') + '" placeholder="' + util.esc(ph || '') + '"></label>';
    }

    function renderInspector() {
      const box = $('#raTabInsp');
      if (!box) return;
      const r = state.sel ? findNode(state.model.root, state.sel) : null;
      if (!r) {
        box.innerHTML = '<div class="insp"><div class="insp-empty">在画布中选中一个节点，编辑它的参数。</div>' +
          '<div class="insp-section"><div class="insp-title">表达式</div>' +
          '<pre class="code ra-expr">' + util.esc(exprOf(state.model.root)) + '</pre></div></div>';
        return;
      }
      const n = r.node, def = KINDS[n.kind] || KINDS.slot;
      let body = '';
      if (n.kind === 'slot') {
        body = '<div class="insp-section"><div class="insp-title">填充占位符</div>' +
          '<div class="hint">选择左侧操作；「▤ 关系」填写基表名与字段。</div></div>';
      } else if (n.kind === 'relation') {
        body = '<div class="insp-section"><div class="insp-title">基表</div>' +
          fieldRow('表名', 'name', n.name, 'Student') +
          fieldRow('字段（逗号分隔）', 'cols', n.cols, 'sid, sname, dept, score') +
          '</div>';
      } else if (n.kind === 'select') {
        body = '<div class="insp-section"><div class="insp-title">选择条件 σ</div>' +
          fieldRow('条件表达式', 'pred', n.pred, 'age > 20 AND dept = \'CS\'') + '</div>';
      } else if (n.kind === 'project') {
        body = '<div class="insp-section"><div class="insp-title">投影字段 π</div>' +
          fieldRow('字段（逗号分隔）', 'cols', n.cols, 'sname, dept') + '</div>';
      } else if (n.kind === 'rename') {
        body = '<div class="insp-section"><div class="insp-title">重命名 ρ</div>' +
          fieldRow('重命名规则', 'map', n.map, 'S(sid, sname)') + '</div>';
      } else if (n.kind === 'join') {
        body = '<div class="insp-section"><div class="insp-title">连接条件 ⋈</div>' +
          fieldRow('条件表达式', 'cond', n.cond, 'Student.sid = Enrolls.sid') + '</div>';
      } else if (n.kind === 'group') {
        body = '<div class="insp-section"><div class="insp-title">分组聚合 γ</div>' +
          fieldRow('分组字段', 'groupBy', n.groupBy, 'dept') +
          fieldRow('聚合函数', 'aggs', n.aggs, 'COUNT(*) as cnt, AVG(score) as avg_score') + '</div>';
      } else {
        body = '<div class="insp-section"><div class="insp-title">' + def.label + ' ' + def.sym + '</div>' +
          '<div class="hint">该运算没有额外参数。</div></div>';
      }
      const names = schemaNames(n);
      const schemaHTML = names
        ? '<div class="insp-section"><div class="insp-title">输出字段（推断）</div><div class="ra-cols" style="padding:0">' +
        names.map(function (x) { return '<span>' + util.esc(x) + '</span>'; }).join('') + '</div></div>'
        : '';
      const childRows = n.children.map(function (c, i) {
        const d2 = KINDS[c.kind] || KINDS.slot;
        return '<div class="participant-card">' +
          '<div class="participant-top"><span>' + (i + 1) + '. ' + d2.sym + ' ' + d2.label + '</span>' +
          '<button class="icon-x" data-act="locate" data-id="' + c.id + '">定位</button></div></div>';
      }).join('');
      box.innerHTML = '<div class="insp">' +
        '<div class="insp-section"><div class="insp-title">节点 · ' + def.sym + ' ' + def.label + '</div></div>' +
        body + schemaHTML +
        (childRows ? '<div class="insp-section"><div class="insp-title">子表达式</div>' + childRows + '</div>' : '') +
        '<div class="insp-actions">' +
        '<button class="btn btn--sm btn--danger" data-act="delete-node" data-id="' + n.id + '">删除该节点</button>' +
        '</div></div>';
    }

    /* ---------- 检查 ---------- */
    function checks() {
      const list = [];
      (function walk(n) {
        if (!n) return;
        const def = KINDS[n.kind] || KINDS.slot;
        if (n.kind === 'slot') {
          list.push({ level: 'err', msg: '存在未填充的占位符，表达式不完整。', target: n.id });
          return;
        }
        if (n.kind === 'relation') {
          if (!n.name) list.push({ level: 'err', msg: '基表缺少表名。', target: n.id });
          if (!parseList(n.cols).length) list.push({ level: 'err', msg: '基表「' + (n.name || '未命名') + '」缺少字段列表。', target: n.id });
        }
        if (n.kind === 'select' && !String(n.pred || '').trim()) list.push({ level: 'err', msg: 'σ 选择缺少条件。', target: n.id });
        if (n.kind === 'project' && !parseList(n.cols).length) list.push({ level: 'err', msg: 'π 投影缺少字段。', target: n.id });
        if (n.kind === 'rename' && !String(n.map || '').trim()) list.push({ level: 'warn', msg: 'ρ 重命名缺少规则。', target: n.id });
        if (n.kind === 'join' && !String(n.cond || '').trim()) list.push({ level: 'err', msg: '⋈ 连接缺少连接条件。', target: n.id });
        if (n.kind === 'group') {
          if (!String(n.groupBy || '').trim()) list.push({ level: 'warn', msg: 'γ 聚合未指定分组字段。', target: n.id });
          if (!String(n.aggs || '').trim()) list.push({ level: 'err', msg: 'γ 聚合缺少聚合函数。', target: n.id });
        }
        n.children.forEach(walk);
      })(state.model.root);

      (function walk2(n) {
        if (!n || n.kind === 'slot') return;
        const kids = n.children.filter(function (c) { return c.kind !== 'slot'; });
        if (n.kind === 'project' && kids[0]) {
          const child = schemaNames(kids[0]);
          const cols = parseList(n.cols);
          if (child) {
            cols.forEach(function (c) {
              const base = c.indexOf('.') >= 0 ? c.split('.').pop() : c;
              if (child.indexOf(base) < 0) list.push({ level: 'warn', msg: 'π 字段「' + c + '」不在子表达式输出中（' + child.join(', ') + '）。', target: n.id });
            });
          }
        }
        if (n.kind === 'union' && n.children[0] && n.children[1]) {
          const a = schemaNames(n.children[0]), b = schemaNames(n.children[1]);
          if (a && b && a.length !== b.length) {
            list.push({ level: 'warn', msg: '∪ 并运算两侧字段数不一致（' + a.length + ' vs ' + b.length + '）。', target: n.id });
          }
        }
        if (n.kind === 'join') {
          const cond = String(n.cond || '');
          if (cond && cond.indexOf('=') < 0 && cond.indexOf('>') < 0 && cond.indexOf('<') < 0) {
            list.push({ level: 'info', msg: '⋈ 连接条件看起来不像比较运算，请确认。', target: n.id });
          }
        }
        n.children.forEach(walk2);
      })(state.model.root);

      if (!list.length) list.push({ level: 'ok', msg: '表达式完整，没有发现问题。' });
      return list;
    }

    function renderChecks() {
      const box = $('#raTabChecks');
      const cnt = $('#raCheckCnt');
      if (!box) return;
      const list = checks();
      const errs = list.filter(function (c) { return c.level === 'err'; }).length;
      const warns = list.filter(function (c) { return c.level === 'warn'; }).length;
      if (cnt) cnt.textContent = errs ? String(errs) : (warns ? String(warns) : '');
      box.__list = list;
      if (list.length === 1 && list[0].level === 'ok') {
        box.innerHTML = '<div class="insp"><div class="check-ok">✓ ' + util.esc(list[0].msg) + '</div></div>';
        return;
      }
      box.innerHTML = '<div class="insp"><div class="check-list">' + list.map(function (c, i) {
        return '<div class="check-item ' + c.level + '"><span class="cdot"></span><span class="cmsg">' + util.esc(c.msg) + '</span>' +
          (c.target ? '<span class="cgo" data-act="locate-check" data-idx="' + i + '">定位</span>' : '') + '</div>';
      }).join('') + '</div></div>';
    }

    /* ---------- 表达式输出 ---------- */
    function renderExpr() {
      const box = $('#raTabExpr');
      if (!box) return;
      const txt = exprOf(state.model.root);
      const schema = schemaNames(state.model.root);
      box.innerHTML = '<div class="insp">' +
        '<div class="insp-section"><div class="insp-title">关系代数表达式</div>' +
        '<div class="code-wrap"><button class="code-copy" data-act="copy-expr">复制</button>' +
        '<pre class="code ra-expr">' + util.esc(txt) + '</pre></div></div>' +
        '<div class="insp-section"><div class="insp-title">输出字段</div>' +
        (schema ? '<div class="ra-cols" style="padding:0">' + schema.map(function (x) { return '<span>' + util.esc(x) + '</span>'; }).join('') + '</div>'
          : '<div class="hint">无法推断（表达式不完整）。</div>') + '</div>' +
        '<div class="insp-section"><div class="insp-title">导出</div><div class="insp-actions">' +
        '<button class="btn btn--sm" data-act="export-expr">下载 .txt</button>' +
        '<button class="btn btn--sm" data-act="export-json">导出 JSON</button>' +
        '<button class="btn btn--sm" data-act="import-json">导入 JSON</button></div></div>' +
        '<div class="insp-section"><div class="insp-title">运算符说明</div><div class="hint">' +
        'σ 选择 · π 投影 · ρ 重命名 · ⋈ 连接 · × 积 · ∪ 并 · ∩ 交 · − 差 · γ 聚合 · ÷ 除。</div></div>' +
        '</div>';
    }

    function updateToolbar() {
      const u = root.querySelector('[data-act="undo"]');
      const r = root.querySelector('[data-act="redo"]');
      if (u) { u.disabled = !history.canUndo(); u.style.opacity = u.disabled ? '.5' : ''; }
      if (r) { r.disabled = !history.canRedo(); r.style.opacity = r.disabled ? '.5' : ''; }
      root.querySelectorAll('[data-tab]').forEach(function (b) {
        b.classList.toggle('active', b.getAttribute('data-tab') === state.tab);
      });
      const ids = { insp: '#raTabInsp', checks: '#raTabChecks', expr: '#raTabExpr' };
      Object.keys(ids).forEach(function (k) {
        const el = $(ids[k]);
        if (el) el.classList.toggle('hidden', state.tab !== k);
      });
    }

    /* ---------- 数据操作 ---------- */
    // 未选中时：若只有一个空占位符则填充它
    function addOp(kind) {
      const def = KINDS[kind];
      if (!def) return;
      const r = state.sel ? findNode(state.model.root, state.sel) : null;
      if (!state.model.root) state.model.root = mkNode('slot');
      if (!r) {
        // 未选中：若只有一个空占位符则填充它，否则提示
        const slots = collectSlots(state.model.root, []);
        if (slots.length === 1 && kind === 'relation') {
          const parent = findNode(state.model.root, slots[0].id).parent;
          const nn = mkNode('relation');
          if (parent) { const idx = parent.children.map(function (c) { return c.id; }).indexOf(slots[0].id); parent.children[idx] = nn; }
          else state.model.root = nn;
          state.sel = nn.id; pushNow(); refresh(); return;
        }
        if (slots.length === 1) {
          const parent = findNode(state.model.root, slots[0].id).parent;
          const nn = mkNode(kind);
          if (parent) { const idx = parent.children.map(function (c) { return c.id; }).indexOf(slots[0].id); parent.children[idx] = nn; }
          else state.model.root = nn;
          state.sel = nn.id; pushNow(); refresh(); return;
        }
        ui.toast('先选中一个虚线占位符，再选择操作', 'warn');
        return;
      }
      const n = r.node;
      if (n.kind === 'slot') {
        const nn = mkNode(kind);
        if (r.parent) {
          const idx = r.parent.children.map(function (c) { return c.id; }).indexOf(n.id);
          r.parent.children[idx] = nn;
        } else {
          state.model.root = nn;
        }
        state.sel = nn.id;
        pushNow(); refresh();
        return;
      }
      // 已有节点：包一层
      if (def.arity === 0) {
        ui.toast('「关系」只能填入占位符：请先选中一个虚线占位符', 'warn');
        return;
      }
      const nn = mkNode(kind);
      if (kind === 'relation') { nn.name = n.name; }
      nn.children[0] = n;
      if (r.parent) {
        const idx = r.parent.children.map(function (c) { return c.id; }).indexOf(n.id);
        r.parent.children[idx] = nn;
      } else {
        state.model.root = nn;
      }
      state.sel = nn.id;
      pushNow(); refresh();
    }

    function deleteNode(id) {
      const r = findNode(state.model.root, id);
      if (!r) return;
      if (!r.parent) {
        state.model.root = mkNode('slot');
      } else {
        const idx = r.parent.children.map(function (c) { return c.id; }).indexOf(id);
        if (idx >= 0) r.parent.children[idx] = mkNode('slot');
      }
      state.sel = r.parent ? r.parent.id : null;
      pushNow(); refresh();
    }

    function applyBind(key, value) {
      const r = state.sel ? findNode(state.model.root, state.sel) : null;
      if (!r) return;
      r.node[key] = value;
    }

    /* ---------- 保存 / 打开 / 导入导出 ---------- */
    function save() {
      ui.prompt({ title: '保存表达式', label: '名称', value: state.model.name || 'Untitled expression' }).then(function (name) {
        if (!name) return;
        state.model.name = name;
        if (DDB.store.save('ra', name, state.model)) ui.toast('已保存「' + name + '」', 'ok');
        else ui.toast('保存失败：浏览器存储不可用', 'err');
      });
    }
    function open() {
      const items = DDB.store.list('ra');
      const body = items.length
        ? '<div class="store-list">' + items.map(function (it) {
          return '<div class="store-item"><div><div class="si-name">' + util.esc(it.name) + '</div>' +
            '<div class="si-meta">' + util.esc(util.fmtAgo(it.savedAt)) + '</div></div>' +
            '<div class="si-actions"><button class="btn btn--sm" data-open="' + util.esc(it.name) + '">打开</button>' +
            '<button class="btn btn--sm btn--danger" data-del="' + util.esc(it.name) + '">删除</button></div></div>';
        }).join('') + '</div>'
        : '<div class="store-empty">还没有保存过表达式。</div>';
      const m = ui.modal({
        title: '打开表达式', body: body, wide: false,
        onMount: function (el, close) {
          el.addEventListener('click', function (e) {
            const o = util.closest(e.target, '[data-open]');
            if (o) {
              const rec = DDB.store.load('ra', o.getAttribute('data-open'));
              if (rec && rec.model) { state.model = normalize(rec.model); state.sel = null; history.reset(); refresh(); fitView(); close(); }
              return;
            }
            const d = util.closest(e.target, '[data-del]');
            if (d) {
              const name = d.getAttribute('data-del');
              DDB.store.remove('ra', name);
              d.closest('.store-item').remove();
              ui.toast('已删除「' + name + '」');
            }
          });
        }
      });
      void m;
    }
    function exportJSON() {
      DDB.io.download(slug(state.model.name || 'relational-algebra') + '.ra.json', JSON.stringify(state.model, null, 2), 'application/json');
    }
    function importJSON() {
      DDB.io.pickFile('.json,application/json').then(function (f) {
        if (!f) return;
        try {
          const obj = JSON.parse(f.text);
          state.model = normalize(obj);
          state.sel = null; history.reset(); refresh(); fitView();
          ui.toast('已导入 ' + f.name, 'ok');
        } catch (e) { ui.toast('导入失败：JSON 解析错误', 'err'); }
      });
    }
    function exportExpr() {
      DDB.io.download(slug(state.model.name || 'relational-algebra') + '.txt', exprOf(state.model.root) + '\n', 'text/plain');
      ui.toast('已下载表达式文本', 'ok');
    }
    function copyExpr(btn) {
      DDB.io.copy(exprOf(state.model.root)).then(function (ok) {
        ui.toast(ok ? '已复制表达式' : '复制失败，请手动选择', ok ? 'ok' : 'err');
        if (btn) { btn.textContent = '已复制'; setTimeout(function () { btn.textContent = '复制'; }, 1200); }
      });
    }

    /* ---------- 规范化 ---------- */
    function normalize(model) {
      const out = emptyModel();
      out.name = (model && model.name) || 'Untitled expression';
      function norm(n) {
        if (!n || typeof n !== 'object') return mkNode('slot');
        const kind = KINDS[n.kind] ? n.kind : 'slot';
        const nn = {
          id: n.id || uid('ra'), kind: kind,
          name: n.name || '', cols: n.cols || '', pred: n.pred || '',
          map: n.map || '', cond: n.cond || '', groupBy: n.groupBy || '',
          aggs: n.aggs || '', children: [],
          ox: Number.isFinite(n.ox) ? n.ox : 0, oy: Number.isFinite(n.oy) ? n.oy : 0
        };
        const arity = KINDS[kind].arity;
        const kids = Array.isArray(n.children) ? n.children : [];
        for (let i = 0; i < arity; i++) nn.children.push(norm(kids[i]));
        return nn;
      }
      out.root = model && model.root ? norm(model.root) : mkNode('slot');
      return out;
    }

    /* ---------- 命令 ---------- */
    function command(act, el) {
      switch (act) {
        case 'new': {
          ui.confirm({ title: '新建表达式', message: '当前表达式将被清空（未保存的内容会丢失），继续？', okLabel: '新建', danger: true }).then(function (ok) {
            if (!ok) return;
            state.model = emptyModel(); state.sel = null; history.reset(); refresh();
            state.view = { x: 60, y: 30, s: 1 }; applyView();
          });
          return;
        }
        case 'sample': {
          state.model = sampleModel(); state.sel = null; history.reset(); refresh(); fitView();
          ui.toast('已载入示例：选课系统查询', 'ok');
          return;
        }
        case 'save': return save();
        case 'open': return open();
        case 'undo': return undo();
        case 'redo': return redo();
        case 'layout': refresh(); fitView(); return;
        case 'add-op': return addOp(el.getAttribute('data-kind'));
        case 'delete-node': return deleteNode(el.getAttribute('data-id'));
        case 'locate': {
          state.sel = el.getAttribute('data-id');
          state.tab = 'insp';
          refresh();
          scrollSelectedIntoView();
          return;
        }
        case 'locate-check': {
          const box = $('#raTabChecks');
          const list = box && box.__list ? box.__list : [];
          const idx = parseInt(el.getAttribute('data-idx'), 10);
          const c = list[idx];
          if (c && c.target) {
            state.sel = c.target; state.tab = 'insp'; refresh(); scrollSelectedIntoView();
          }
          return;
        }
        case 'zoom-in': zoomAt(canvasEl.clientWidth / 2, canvasEl.clientHeight / 2, 1.18); return;
        case 'zoom-out': zoomAt(canvasEl.clientWidth / 2, canvasEl.clientHeight / 2, 1 / 1.18); return;
        case 'zoom-fit': return fitView();
        case 'gen': state.tab = 'expr'; updateToolbar(); renderExpr(); ui.toast('已生成关系代数表达式', 'ok'); return;
        case 'copy-expr': return copyExpr(el);
        case 'export-json': return exportJSON();
        case 'import-json': return importJSON();
        case 'export-expr': return exportExpr();
      }
    }

    function scrollSelectedIntoView() {
      const el = nodesEl.querySelector('[data-node="' + state.sel + '"]');
      if (!el) return;
      const r = el.getBoundingClientRect(), c = canvasEl.getBoundingClientRect();
      if (r.top < c.top + 40 || r.bottom > c.bottom - 40 || r.left < c.left + 40 || r.right > c.right - 40) {
        const g = el;
        const nx = parseFloat(g.style.left) || 0, ny = parseFloat(g.style.top) || 0;
        const gw = g.offsetWidth, gh = g.offsetHeight;
        state.view.x = c.width / 2 - (nx + gw / 2) * state.view.s;
        state.view.y = c.height / 2 - (ny + gh / 2) * state.view.s;
        applyView();
      }
    }

    /* ---------- 刷新 ---------- */
    function refresh(opts) {
      opts = opts || {};
      renderNodes();
      renderEdges();
      renderOutline();
      renderChecks();
      renderExpr();
      if (!opts.keepInspector) renderInspector();
      updateToolbar();
      saveDraft();
    }

    /* ---------- 事件 ---------- */
    root.addEventListener('click', function (e) {
      const tab = util.closest(e.target, '[data-tab]');
      if (tab && root.contains(tab)) {
        state.tab = tab.getAttribute('data-tab');
        updateToolbar();
        refresh();
        if (state.tab === 'checks' || state.tab === 'expr') { renderChecks(); renderExpr(); }
        return;
      }
      const bindEl = util.closest(e.target, '[data-bind]');
      if (bindEl) return;
      const actEl = util.closest(e.target, '[data-act]');
      if (actEl && root.contains(actEl)) { command(actEl.getAttribute('data-act'), actEl); return; }
      if (util.closest(e.target, '.tool-left') || util.closest(e.target, '.tool-right')) return;
      const nodeEl = util.closest(e.target, '.ra-node');
      if (nodeEl) {
        state.sel = nodeEl.getAttribute('data-node');
        state.tab = 'insp';
        refresh();
        scrollSelectedIntoView();
        return;
      }
      state.sel = null;
      refresh();
    });

    root.addEventListener('input', function (e) {
      const el = e.target;
      if (!el || !el.getAttribute || !el.getAttribute('data-bind')) return;
      const key = el.getAttribute('data-bind');
      const r = state.sel ? findNode(state.model.root, state.sel) : null;
      if (!r) return;
      r.node[key] = el.value;
      schedulePush();
      refresh({ keepInspector: true });
    });
    root.addEventListener('change', function (e) {
      const el = e.target;
      if (!el || !el.getAttribute || !el.getAttribute('data-bind')) return;
      pushNow();
      refresh({ keepInspector: true });
    });

    canvasEl.addEventListener('wheel', function (e) {
      e.preventDefault();
      const rect = canvasEl.getBoundingClientRect();
      zoomAt(e.clientX - rect.left, e.clientY - rect.top, e.deltaY < 0 ? 1.12 : 1 / 1.12);
    }, { passive: false });

    let pan = null;
    let nodeDrag = null;
    function subtreeOf(id) {
      const found = findNode(state.model.root, id);
      const list = [];
      if (!found) return list;
      everyNode(found.node, function (n) { list.push({ n: n, ox: n.ox || 0, oy: n.oy || 0 }); });
      return list;
    }
    canvasEl.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      if (util.closest(e.target, '.zoom-chip')) return;
      const nodeEl = util.closest(e.target, '.ra-node');
      if (nodeEl) {
        const id = nodeEl.getAttribute('data-node');
        nodeDrag = { id: id, sx: e.clientX, sy: e.clientY, moved: false, items: subtreeOf(id) };
        nodeEl.classList.add('dragging');
        e.preventDefault();
        return;
      }
      pan = { sx: e.clientX, sy: e.clientY, ox: state.view.x, oy: state.view.y };
      canvasEl.classList.add('panning');
    });
    function paintNodePositions() {
      const els = nodesEl.querySelectorAll('.ra-node');
      els.forEach(function (el) {
        const r = findNode(state.model.root, el.getAttribute('data-node'));
        if (!r) return;
        el.style.left = r.node.x + 'px';
        el.style.top = r.node.y + 'px';
      });
      renderEdges();
    }
    function onPointerMove(e) {
      if (!root.isConnected || !root.offsetParent) return;
      if (nodeDrag) {
        const dx = e.clientX - nodeDrag.sx, dy = e.clientY - nodeDrag.sy;
        if (!nodeDrag.moved && Math.abs(dx) + Math.abs(dy) > 3) nodeDrag.moved = true;
        if (!nodeDrag.moved) return;
        nodeDrag.items.forEach(function (it) {
          it.n.ox = it.ox + dx;
          it.n.oy = it.oy + dy;
          it.n.x = (it.n.bx || 0) + it.n.ox;
          it.n.y = (it.n.by || 0) + it.n.oy;
        });
        paintNodePositions();
        return;
      }
      if (!pan) return;
      state.view.x = pan.ox + (e.clientX - pan.sx);
      state.view.y = pan.oy + (e.clientY - pan.sy);
      applyView();
    }
    function onPointerUp(e) {
      if (nodeDrag) {
        const moved = nodeDrag.moved;
        const el = nodesEl.querySelector('.ra-node.dragging');
        if (el) el.classList.remove('dragging');
        const id = nodeDrag.id;
        nodeDrag = null;
        if (moved) {
          state.sel = id;
          pushNow();
          refresh();
          scrollSelectedIntoView();
        }
        return;
      }
      if (!pan) return;
      pan = null;
      canvasEl.classList.remove('panning');
    }
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);

    function onKeyDown(e) {
      if (!root.isConnected || !root.offsetParent) return;
      if (util.inField(e)) return;
      const ctrl = e.ctrlKey || e.metaKey;
      const k = e.key.toLowerCase();
      if (ctrl && k === 'z') { e.preventDefault(); undo(); return; }
      if (ctrl && k === 'y') { e.preventDefault(); redo(); return; }
      if (ctrl && k === 's') { e.preventDefault(); save(); return; }
      if (k === 'delete' || k === 'backspace') {
        if (state.sel) { e.preventDefault(); deleteNode(state.sel); }
        return;
      }
      if (k === 'escape') { if (state.sel) { state.sel = null; refresh(); } return; }
      if (k === 'l' && !ctrl) { refresh(); fitView(); }
    }
    document.addEventListener('keydown', onKeyDown);

    /* ---------- 初始化 ---------- */
    const restored = loadDraft();
    state.model = normalize(state.model);
    if (restored) history.reset();
    applyView();
    refresh();
    if (restored) setTimeout(fitView, 60);

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
        const ns = Math.max(0.25, Math.min(2.2, startS * (d / startDist)));
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
      if (!isEmptyModel(state.model)) DDB.draft.save('ra', { model: state.model, view: state.view });
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      root.innerHTML = '';
    };
  }
  if (window.DDB && DDB.registerTool) DDB.registerTool('ra', { title: 'designQT basic · 关系代数', mount: mount });
})();
