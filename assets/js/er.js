/* ================================================================
   er.js · designER 画布编辑器
   实体-关系模型：实体、属性小球、关系、ISA；检查与逻辑模式重构由 er-schema.js 提供
   ================================================================ */
(function () {
  'use strict';
  const { util, ui, store, io } = DDB;
  const esc = util.esc;

  const TYPES = ['AUTO', 'INT', 'BIGINT', 'VARCHAR(64)', 'VARCHAR(255)', 'TEXT', 'DATE', 'TIMESTAMP', 'DECIMAL(10,2)', 'REAL', 'BOOLEAN'];
  const STORE_KIND = 'er';
  const ER_ICONS = {
    entity: '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="2.3" y="4.5" width="11.4" height="7" rx="2.2" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>',
    rel: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2.4 13.6 8 8 13.6 2.4 8Z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>',
    attr: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="4.2" fill="none" stroke="currentColor" stroke-width="1.4"/><circle cx="8" cy="8" r="1.5" fill="currentColor"/></svg>',
    pk: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="4.6" cy="8" r="2.1" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M6.8 8h6.6M11.4 8v2M13.4 8v1.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>'
  };


  /* ---------------- 模型 ---------------- */
  function uid(p) { return util.uid(p); }
  function emptyModel() {
    return { version: 1, name: 'Untitled ER model', entities: [], relationships: [], isas: [] };
  }
  function newAttr(name) {
    return { id: uid('a'), name: name || 'attr1', type: 'AUTO', key: false, partial: false, multi: false, nocard: true, composite: false, x: null, y: null, children: [] };
  }
  function numOrNull(v) { return (typeof v === 'number' && isFinite(v)) ? v : null; }
  /* section */
  /* designerdb.io .er wrapper (itemsArray) */
  function adaptModel(raw) {
    if (!raw || typeof raw !== 'object') return raw;
    var src = raw;
    if (raw.erDesign && raw.erDesign.model) src = raw.erDesign.model;
    else if (raw.model && (raw.model.itemsArray || raw.model.entities)) src = raw.model;
    if (src && Array.isArray(src.itemsArray)) return convertItemsModel(src, raw);
    if (src && Array.isArray(src.entities)) return src;
    return raw;
  }
  function typeFor(name, isId) {
    if (typeof ERSCHEMA !== 'undefined' && ERSCHEMA.guessType) {
      var t = ERSCHEMA.guessType(name);
      return t || (isId ? 'INT' : 'VARCHAR(64)');
    }
    return isId ? 'INT' : 'VARCHAR(64)';
  }
  function convertItemsModel(src, root) {
    var items = src.itemsArray || [];
    var byId = {};
    items.forEach(function (it) { if (it && it._id != null) byId[it._id] = it; });
    var eId = function (n) { return 'ent_er' + n; };
    var rId = function (n) { return 'rel_er' + n; };
    var aId = function (n) { return 'a_er' + n; };
    var model = { version: 1, name: 'Imported .er model', entities: [], relationships: [], isas: [] };
    var entBy = {}, relBy = {};
    items.forEach(function (it) {
      if (!it) return;
      if (it.__type === 'Entity') {
        var ent = { id: eId(it._id), type: 'entity', name: it._name || 'Entity', x: Number(it._x) || 0, y: Number(it._y) || 0, weak: !!it._weak, attributes: [] };
        model.entities.push(ent); entBy[it._id] = ent;
      } else if (it.__type === 'Relationship') {
        var rel = { id: rId(it._id), type: 'relationship', name: it._name || 'Relationship', x: Number(it._x) || 0, y: Number(it._y) || 0, participants: [], attributes: [] };
        model.relationships.push(rel); relBy[it._id] = rel;
      }
    });
    var parseCard = function (v) {
      var parts = String(v || '0_N').split('_');
      var min = String(parts[0]) === '1' ? 1 : 0;
      var max = String(parts[1] || 'N').toUpperCase() === 'N' ? 'N' : '1';
      return { min: min, max: max };
    };
    var attrMap = {};
    var mkAttr = function (it) {
      var card = String(it._cardinality || '');
      var lo = String(card).split('_')[0] === '1' ? 1 : 0;
      return { id: aId(it._id), name: it._name || 'attr', type: typeFor(it._name, !!it._identifier), key: !!it._identifier, partial: false, multi: /N$/.test(card), min: lo, nocard: !/N$/.test(card), composite: false, x: null, y: null, children: [] };
    };
    items.forEach(function (it) {
      if (!it) return;
      if (it.__type === 'Attribute') { var a = mkAttr(it); attrMap[it._id] = a; }
    });
    items.forEach(function (it) {
      if (!it) return;
      if (it.__type === 'Participation') {
        var rel = relBy[it._relationshipId]; var ent = entBy[it._entityId];
        if (!rel || !ent) return;
        var c = parseCard(it._cardinality);
        rel.participants.push({ id: 'p_er' + it._id, entityId: ent.id, min: c.min, max: c.max, role: it._role || '' });
      } else if (it.__type === 'Attribute') {
        var parent = byId[it._parentId]; var attr = attrMap[it._id];
        if (!parent || !attr) return;
        if (parent.__type === 'Entity' && entBy[parent._id]) entBy[parent._id].attributes.push(attr);
        else if (parent.__type === 'Relationship' && relBy[parent._id]) relBy[parent._id].attributes.push(attr);
        else if (parent.__type === 'Attribute' && attrMap[parent._id]) {
          var pa = attrMap[parent._id];
          pa.composite = true; pa.children.push({ id: attr.id, name: attr.name, type: attr.type, key: false, partial: false, multi: attr.multi, min: attr.min || 0, nocard: attr.nocard, x: null, y: null });
        }
      }
    });
    /* Generalization / GeneralizationChild -> isas */
    var genList = items.filter(function (it) { return it && it.__type === 'Generalization'; });
    var gchild = items.filter(function (it) { return it && it.__type === 'GeneralizationChild'; });
    genList.forEach(function (g) {
      var parent = entBy[g._entityId];
      if (!parent) return;
      var kids = gchild.filter(function (c) { return c._generalizationId === g._id; })
        .map(function (c) { return entBy[c._entityId]; })
        .filter(Boolean)
        .map(function (e) { return e.id; });
      if (!kids.length) return;
      var kind = String(g._type || 't_e');
      model.isas.push({
        id: 'isa_er' + g._id, type: 'isa', name: 'ISA', x: 0, y: 0,
        parentId: parent.id, childIds: kids,
        totality: kind.charAt(0) === 't' ? 't' : 'p',
        exclusivity: kind.charAt(2) === 'e' ? 'e' : 'o'
      });
    });
    return model;
  }
  window.DDB_ER_ADAPT = adaptModel;

  function normalizeAttr(a) {
    return {
      id: a.id || uid('a'),
      name: a.name || 'attr',
      type: a.type || 'AUTO',
      key: !!a.key,
      partial: !!a.partial,
      multi: !!a.multi,
      min: Number(a.min) === 1 ? 1 : 0,
      nocard: !!a.nocard,
      composite: !!a.composite,
      x: numOrNull(a.x),
      y: numOrNull(a.y),
      children: (a.children || []).map(function (c) {
        return { id: c.id || uid('c'), name: c.name || 'child', type: c.type || 'AUTO', key: !!c.key, partial: !!c.partial, multi: !!c.multi, min: Number(c.min) === 1 ? 1 : 0, nocard: c.nocard !== false, x: numOrNull(c.x), y: numOrNull(c.y),
          ox: numOrNull(c.ox), oy: numOrNull(c.oy) };
      })
    };
  }
  function normalize(m) {
    const model = (m && typeof m === 'object') ? m : {};
    const normalized = {
      version: 1,
      name: model.name || 'Untitled ER model',
      entities: (model.entities || []).map(function (e) {
        return {
          id: e.id || uid('ent'), type: 'entity', name: e.name || 'Entity',
          x: Number(e.x) || 0, y: Number(e.y) || 0, weak: !!e.weak,
          attributes: (e.attributes || []).map(normalizeAttr),
          fks: (e.fks || []).map(function (f) {
            return {
              id: f.id || uid('fk'),
              refEntityId: f.refEntityId || '',
              refAttrId: f.refAttrId || '',
              relId: f.relId || ''
            };
          })
        };
      }),
      relationships: (model.relationships || []).map(function (r) {
        return {
          id: r.id || uid('rel'), type: 'relationship', name: r.name || 'Relationship',
          x: Number(r.x) || 0, y: Number(r.y) || 0,
          participants: (r.participants || []).map(function (p) {
            return {
              id: p.id || uid('p'), entityId: p.entityId || '',
              min: String(p.min) === '1' ? 1 : 0,
              max: String(p.max) === 'N' ? 'N' : '1',
              role: p.role || ''
            };
          }),
          attributes: (r.attributes || []).map(normalizeAttr)
        };
      }),
      isas: (model.isas || []).map(function (i) {
        return {
          id: i.id || uid('isa'), type: 'isa', name: i.name || 'ISA',
          x: Number(i.x) || 0, y: Number(i.y) || 0,
          parentId: i.parentId || null,
          childIds: (i.childIds || []).slice(),
          totality: i.totality === 'p' ? 'p' : 't',
          exclusivity: i.exclusivity === 'o' ? 'o' : 'e'
        };
      })
    };
    normalized.entities.forEach(normalizeOwnerKeys);
    normalized.relationships.forEach(normalizeOwnerKeys);
    return normalized;
  }
  function normalizeOwnerKeys(owner) {
    if (!owner || !owner.attributes) return;
    owner.attributes.forEach(function (a) {
      if (a.children && a.children.length) a.key = false;
      (a.children || []).forEach(function (c) {
        if (!c.key) return;
        const other = owner.attributes.some(function (x) { return x.key && x.id !== a.id; });
        if (!other) c.key = false;
      });
    });
  }

  function sampleModel() {
    return normalize({
      name: '选课系统 (University)',
      entities: [
        { id: 'ent_person', name: 'Person', x: 520, y: 40, attributes: [
          { name: 'id', type: 'INT', key: true }, { name: 'name', type: 'VARCHAR(64)' }
        ] },
        { id: 'ent_dept', name: 'Department', x: 120, y: 340, attributes: [
          { name: 'id', type: 'INT', key: true }, { name: 'name', type: 'VARCHAR(64)' }
        ] },
        { id: 'ent_prof', name: 'Professor', x: 320, y: 250, attributes: [
          { name: 'id', type: 'INT', key: true }, { name: 'name', type: 'VARCHAR(64)' }, { name: 'email', type: 'VARCHAR(255)' }
        ] },
        { id: 'ent_stu', name: 'Student', x: 760, y: 250, attributes: [
          { name: 'id', type: 'INT', key: true }, { name: 'name', type: 'VARCHAR(64)' }, { name: 'email', type: 'VARCHAR(255)' }, { name: 'birthDate', type: 'DATE' }
        ] },
        { id: 'ent_course', name: 'Course', x: 560, y: 560, attributes: [
          { name: 'id', type: 'INT', key: true }, { name: 'title', type: 'VARCHAR(255)' }, { name: 'credits', type: 'INT' }
        ] }
      ],
      relationships: [
        { id: 'rel_belongs', name: 'BelongsTo', x: 300, y: 470, participants: [
          { entityId: 'ent_dept', min: 1, max: 'N', role: '' },
          { entityId: 'ent_stu', min: 0, max: '1', role: '' }
        ] },
        { id: 'rel_teaches', name: 'Teaches', x: 640, y: 420, participants: [
          { entityId: 'ent_prof', min: 0, max: 'N', role: '' },
          { entityId: 'ent_course', min: 0, max: '1', role: '' }
        ] },
        { id: 'rel_enrolls', name: 'Enrolls', x: 780, y: 600, participants: [
          { entityId: 'ent_stu', min: 0, max: 'N', role: '' },
          { entityId: 'ent_course', min: 0, max: 'N', role: '' }
        ], attributes: [{ name: 'grade', type: 'DECIMAL(10,2)' }] }
      ],
      isas: [
        { id: 'isa_person', parentId: 'ent_person', childIds: ['ent_prof', 'ent_stu'], totality: 't', exclusivity: 'e' }
      ]
    });
  }

  /* ---------------- 挂载 ---------------- */
  function mount(root, ctx) {
    const isFull = true; // designER basic 已移除，始终是完整版
    const state = {
      model: emptyModel(),
      view: { x: 40, y: 30, s: 1 },
      selected: null,
      selectedAttr: null,
      linking: false,
      linkFrom: null,
      tab: 'insp',
      schema: null,
      inspScroll: 0,
      hintCursor: null
    };
    let histTimer = null;
    let dirty = false;
    let drag = null;
    let attrDrag = null;
    let pan = null;
    let pendingFrame = false;

    /* ---------- DOM ---------- */
    root.innerHTML = [
      '<div class="tool">',
      '  <div class="tool-bar">',
      '    <div class="tool-title"><b>designER</b><span class="tool-mode">' + (isFull ? 'FULL' : 'BASIC') + '</span></div>',
            '    <details class="dd-file-menu"><summary class="btn btn--sm dd-file-sum" aria-label="File"><span>File</span><i class="df-caret">▾</i></summary>',
      '      <div class="dd-file-pop">',
    '    <button class="btn btn--sm" data-act="new" title="新建空白模型">新建</button>',
          '    <button class="btn btn--sm" data-act="sample" title="载入示例：选课系统">示例</button>',
          '    <button class="btn btn--sm" data-act="save" title="保存到浏览器 (Ctrl+S)">保存</button>',
          '    <button class="btn btn--sm" data-act="open">打开</button>',
          '    <button class="btn btn--sm" data-act="export-json" title="导出为 .json 文件">导出</button>',
          '    <button class="btn btn--sm" data-act="import-json" title="从 .json 文件导入">导入</button>',
      '      </div>',
      '    </details>',
      '    <span class="sep"></span>',
      '    <button class="btn btn--sm" data-act="undo" title="撤销 (Ctrl+Z)">↶</button>',
      '    <button class="btn btn--sm" data-act="redo" title="重做 (Ctrl+Y)">↷</button>',
      '    <span class="sep"></span>',
      '    <button class="btn btn--sm" data-act="add-entity">＋ 实体</button>',
      '    <button class="btn btn--sm" data-act="add-rel">＋ 关系</button>',
      '    <button class="btn btn--sm" data-act="add-attr-sel" title="给选中的实体 / 关系添加属性">＋ 属性</button>',
      '    <span class="sep"></span>',
      '    <button class="btn btn--sm" data-act="layout" title="重新排布所有元素">自动布局</button>',
      '  </div>',
      '  <div class="tool-body">',
      '    <aside class="tool-left">',
      '      <div class="panel-body">',
      '        <div class="panel-title">添加元素</div>',
      '        <button class="btn btn--sm btn--block er-add-btn" data-act="add-entity"><i class="er-ico">' + ER_ICONS.entity + '</i><span class="cn">实体</span><span class="en">Entity</span><span class="it">Entità</span></button>',
      '        <button class="btn btn--sm btn--block er-add-btn" data-act="add-rel"><i class="er-ico">' + ER_ICONS.rel + '</i><span class="cn">关系</span><span class="en">Relationship</span><span class="it">Associazione</span></button>',
      '        <button class="btn btn--sm btn--block er-add-btn" data-act="add-attr-sel" title="给选中的实体 / 关系添加属性"><i class="er-ico">' + ER_ICONS.attr + '</i><span class="cn">属性</span><span class="en">Attribute</span><span class="it">Attributo</span></button>',
      '        <div class="hint">属性以小球围绕实体；点击编辑，拖动移动。</div>',
      '      </div>',
      '      <div class="panel-body">',
      '        <div class="panel-title">模型结构 <span class="hint" id="erCount"></span></div>',
      '        <div class="outline-list" id="erOutline"></div>',
      '      </div>',
      '      <div class="panel-body">',
      '        <div class="panel-title">快捷键</div>',
      '        <div class="hint">Ctrl+Z / Ctrl+Y 撤销重做 · Delete 删除 · Esc 取消<br>双击改名 · 滚轮缩放 · 拖动平移</div>',
      '      </div>',
      '    </aside>',
      '    <div class="tool-canvas">',
      '      <div class="canvas" id="erCanvas">',
      '        <div class="world" id="erWorld">',
      '          <svg class="edges" id="erEdges"></svg>',
      '          <div class="overlay" id="erOverlay"></div>',
      '          <div class="nodes" id="erNodes"></div>',
      '          <div class="attr-layer" id="erAttrNodes"></div>',
      '        </div>',
      '        <div class="canvas-hint" id="erHint">',
      '          <b>空白模型</b><span>从「＋ 实体」开始，或载入示例</span>',
      '          <div style="margin-top:14px;pointer-events:auto"><button class="btn btn--sm btn--primary" data-act="sample">载入示例模型</button></div>',
      '        </div>',
      '        <div class="node-menu" id="erMenu" hidden></div>',
      '        <div class="node-menu edge-menu" id="erEdgeMenu" hidden></div>',
      '      </div>',
      '      <div class="canvas-tools">',
      '        <div class="zoom-chip">',
      '          <button data-act="zoom-out" title="缩小">−</button>',
      '          <span class="zval" id="erZoom">100%</span>',
      '          <button data-act="zoom-in" title="放大">＋</button>',
      '          <button data-act="zoom-fit" title="适应画布">⤢</button>',
      '        </div>',
      '      </div>',
      '      <div class="canvas-legend">',
      '        <span><i class="lg-ico">' + ER_ICONS.entity + '</i><span>实体</span></span><span><i class="lg-ico">' + ER_ICONS.rel + '</i><span>关系</span></span><span><i class="lg-ico">' + ER_ICONS.attr + '</i><span>属性</span></span><span><i class="lg-ico">' + ER_ICONS.pk + '</i><span>主键</span></span><span>(min,max) 参与基数</span>',
      '      </div>',
      '    </div>',
      '    <aside class="tool-right">',
      '      <div class="tabbar" id="erTabs">',
      '        <button class="tab active" data-tab="insp">属性</button>',
      '        <button class="tab" data-tab="checks">检查<span class="cnt" id="erCheckCnt">0</span></button>',
      '        <button class="tab" data-tab="schema">逻辑模式</button>',
      '      </div>',
      '      <div class="tab-panel" id="erTabInsp"></div>',
      '      <div class="tab-panel hidden" id="erTabChecks"></div>',
      '      <div class="tab-panel hidden" id="erTabSchema"></div>',
      '    </aside>',
      '  </div>',
      '</div>'
    ].join('\n');

    const $ = function (sel) { return root.querySelector(sel); };
    const canvasEl = $('#erCanvas');
    const worldEl = $('#erWorld');
    const nodesEl = $('#erNodes');
    const attrNodesEl = $('#erAttrNodes');
    const edgesEl = $('#erEdges');
    const overlayEl = $('#erOverlay');
    const hintEl = $('#erHint');
    const menuEl = $('#erMenu');
    const edgeMenuEl = $('#erEdgeMenu');
    let menuCloseTimer = 0;
    let edgeCloseTimer = 0;

    /* ---------- 历史 ---------- */
    const history = DDB.createHistory({
      get: function () { return state.model; },
      set: function (m) { state.model = m; },
      limit: 80
    });
    history.reset();

    function markDirty() { dirty = true; }
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

    /* ---------- 草稿自动保存（刷新后仍保留） ---------- */
    let draftTimer = null;
    function saveDraft() {
      clearTimeout(draftTimer);
      draftTimer = setTimeout(function () {
        if (!DDB.draft) return;
        DDB.draft.save('er', { model: state.model, view: state.view });
      }, 200);
    }
    function loadDraft() {
      const d = DDB.draft && DDB.draft.load('er');
      if (!d || !d.model) return false;
      const m = normalize(d.model);
      if (!m.entities.length && !m.relationships.length) return false;
      state.model = m;
      if (d.view && typeof d.view.s === 'number') {
        state.view = {
          x: Number(d.view.x) || 40, y: Number(d.view.y) || 30,
          s: util.clamp(Number(d.view.s) || 1, 0.2, 2.2)
        };
      }
      return true;
    }
    function mutate(fn, opts) {
      opts = opts || {};
      fn(state.model);
      if (opts.history !== false) pushNow();
      refresh(opts);
    }
    function undo() {
      pushNow();
      if (history.undo()) { normalizeSelection(); refresh(); }
    }
    function redo() {
      if (history.redo()) { normalizeSelection(); refresh(); }
    }

    /* ---------- 查找 ---------- */
    function getEntity(id) { return state.model.entities.find(function (e) { return e.id === id; }); }
    function getRel(id) { return state.model.relationships.find(function (r) { return r.id === id; }); }
    function getIsa(id) { return state.model.isas.find(function (i) { return i.id === id; }); }
    function getNode(ntype, id) {
      if (ntype === 'entity') return getEntity(id);
      if (ntype === 'relationship') return getRel(id);
      if (ntype === 'isa') return getIsa(id);
      return null;
    }
    function nodeName(n) { return (n && n.name) || '（未命名）'; }
    function allNodes() {
      return state.model.entities.map(function (n) { return { ntype: 'entity', node: n }; })
        .concat(state.model.relationships.map(function (n) { return { ntype: 'relationship', node: n }; }))
        .concat(state.model.isas.map(function (n) { return { ntype: 'isa', node: n }; }));
    }
    function normalizeSelection() {
      if (state.selected) {
        const n = getNode(state.selected.ntype, state.selected.id);
        if (!n) { state.selected = null; state.selectedAttr = null; }
        else if (state.selectedAttr) {
          const list = state.selected.ntype === 'relationship' ? n.attributes : (state.selected.ntype === 'entity' ? n.attributes : []);
          if (!list.some(function (a) { return a.id === state.selectedAttr; })) state.selectedAttr = null;
        }
      }
      if (state.linkFrom && !getNode(state.linkFrom.ntype, state.linkFrom.id)) state.linkFrom = null;
    }

    /* ---------- 视图 ---------- */
    function applyView() {
      worldEl.style.transform = 'translate(' + state.view.x + 'px,' + state.view.y + 'px) scale(' + state.view.s + ')';
      const z = $('#erZoom');
      if (z) z.textContent = Math.round(state.view.s * 100) + '%';
      saveDraft();
    }
    function viewCenter() {
      const r = canvasEl.getBoundingClientRect();
      return {
        x: (r.width / 2 - state.view.x) / state.view.s,
        y: (r.height / 2 - state.view.y) / state.view.s
      };
    }
    function fitView(forceMin) {
      const list = allNodes();
      if (!list.length) {
        state.view = { x: 40, y: 30, s: 1 };
        applyView();
        return;
      }
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      list.forEach(function (it) {
        if (it.ntype === 'isa') return;
        const el = elFor(it.node.id);
        const w = el ? el.offsetWidth : 180;
        const h = el ? el.offsetHeight : 100;
        minX = Math.min(minX, it.node.x);
        minY = Math.min(minY, it.node.y);
        maxX = Math.max(maxX, it.node.x + w);
        maxY = Math.max(maxY, it.node.y + h);
      });
      if (!isFinite(minX)) { state.view = { x: 40, y: 30, s: 1 }; applyView(); return; }
      // 属性小球同样参与取景（它们连在实体/关系周围，会比节点本身更靠外）
      Array.prototype.forEach.call(attrNodesEl.children, function (el) {
        const m = /translate\((-?[\d.]+)px,\s*(-?[\d.]+)px\)/.exec(el.style.transform || '');
        if (!m) return;
        const x = parseFloat(m[1]), y = parseFloat(m[2]);
        minX = Math.min(minX, x - 30);
        minY = Math.min(minY, y - 26);
        maxX = Math.max(maxX, x + el.offsetWidth + 30);
        maxY = Math.max(maxY, y + el.offsetHeight + 26);
      });
      const r = canvasEl.getBoundingClientRect();
      const pad = 64;
      const bw = Math.max(maxX - minX, 1);
      const bh = Math.max(maxY - minY, 1);
      const autoMin = r.width < 640 ? 0.2 : (r.width < 900 ? 0.34 : 0.62);
      const minFit = Math.min(forceMin || autoMin, autoMin);
      const s = util.clamp(Math.min((r.width - pad * 2) / bw, (r.height - pad * 2) / bh), minFit, 1.2);
      state.view.s = s;
      state.view.x = r.width / 2 - (minX + bw / 2) * s;
      state.view.y = r.height / 2 - (minY + bh / 2) * s;
      applyView();
    }
    function centerNode(ntype, id) {
      const n = getNode(ntype, id);
      if (!n) return;
      if (ntype === 'isa') {
        const par = n.parentId ? getEntity(n.parentId) : null;
        if (par) { centerNode('entity', par.id); return; }
      }
      const el = elFor(id);
      const w = el ? el.offsetWidth : 200;
      const h = el ? el.offsetHeight : 100;
      const r = canvasEl.getBoundingClientRect();
      state.view.x = r.width / 2 - (n.x + w / 2) * state.view.s;
      state.view.y = r.height / 2 - (n.y + h / 2) * state.view.s;
      applyView();
    }
    function zoomAt(factor, cx, cy) {
      const r = canvasEl.getBoundingClientRect();
      const sx = cx == null ? r.width / 2 : cx - r.left;
      const sy = cy == null ? r.height / 2 : cy - r.top;
      const wx = (sx - state.view.x) / state.view.s;
      const wy = (sy - state.view.y) / state.view.s;
      const ns = util.clamp(state.view.s * factor, 0.2, 2.2);
      state.view.x = sx - wx * ns;
      state.view.y = sy - wy * ns;
      state.view.s = ns;
      applyView();
    }

    /* ---------- 渲染：节点 ---------- */
    function elFor(id) { return nodesEl.querySelector('[data-node="' + id + '"]'); }

    /* ---------- 渲染：实体 / 关系 / ISA 节点 ---------- */
    /* 某个实体 / 关系下的主键名（含子属性），按模型顺序 */
    function keyNamesOf(owner) {
      const names = [];
      (owner.attributes || []).forEach(function (a) {
        if (a.key) names.push(a.name);
        (a.children || []).forEach(function (c) { if (c.key) names.push(c.name); });
      });
      return names;
    }
    function compoundKeyHTML(owner) {
      const names = keyNamesOf(owner);
      if (names.length < 2) return '';
      return '<div class="er-cpk" title="复合键：' + esc(names.join(' + ')) + '">' +
        '<span class="er-cpk-k">复合键</span><span class="er-cpk-v">' + esc(names.join(' + ')) + '</span></div>';
    }
    /* ---------- 外键（引用的另一端实体的主键） ---------- */
    function findAttrById(owner, attrId) {
      if (!owner) return null;
      let found = null;
      (owner.attributes || []).forEach(function (a) {
        if (a.id === attrId) found = a;
        (a.children || []).forEach(function (c) { if (c.id === attrId) found = c; });
      });
      return found;
    }
    function keyAttrList(entity) {
      const out = [];
      (entity.attributes || []).forEach(function (a) {
        if (a.key) out.push(a);
        (a.children || []).forEach(function (c) { if (c.key) out.push(c); });
      });
      return out;
    }
    function fkEntries(ent) {
      const out = [];
      (ent.fks || []).forEach(function (f) {
        const target = getEntity(f.refEntityId);
        const ref = findAttrById(target, f.refAttrId);
        const rel = f.relId ? getRel(f.relId) : null;
        if (!target || !ref || !ref.key) return;
        out.push({ fk: f, target: target, ref: ref, rel: rel });
      });
      return out;
    }
    function fkLabel(e) {
      return e.target.name + '.' + e.ref.name;
    }
    function foreignKeyHTML(ent) {
      const list = fkEntries(ent);
      if (!list.length) return '';
      const text = list.map(fkLabel).join(' · ');
      return '<div class="er-fk" title="外键：' + esc(text) + '">' +
        '<span class="er-fk-k">外键</span><span class="er-fk-v">' + esc(clipLabel(text, 26)) + '</span></div>';
    }
    /* 某个实体可选的外键来源：它能参与的每个关系里，另一端实体的主键属性 */
    function fkCandidates(ent) {
      const seen = {};
      const out = [];
      state.model.relationships.forEach(function (r) {
        if (!r.participants.some(function (p) { return p.entityId === ent.id; })) return;
        r.participants.forEach(function (p) {
          if (p.entityId === ent.id) return;
          const other = getEntity(p.entityId);
          if (!other) return;
          keyAttrList(other).forEach(function (a) {
            const key = other.id + '|' + a.id;
            if (seen[key]) return;
            seen[key] = 1;
            out.push({ relId: r.id, relName: r.name, entity: other, attr: a });
          });
        });
      });
      return out;
    }
    function fkInspHTML(ent) {
      const list = fkEntries(ent);
      const cands = fkCandidates(ent);
      let body = '';
      if (list.length) {
        body += '<div class="fk-list">' + list.map(function (e) {
          return '<div class="fk-row">' +
            '<span class="fk-name" title="外键 ' + esc(fkLabel(e)) + '">' + esc(e.ref.name) + ' → ' + esc(fkLabel(e)) + '</span>' +
            '<button class="icon-x" title="删除外键" data-act="del-fk" data-entity-id="' + ent.id + '" data-fk-id="' + e.fk.id + '">✕</button>' +
            '</div>';
        }).join('') + '</div>';
      } else {
        body += '<div class="hint">还没有外键。外键会显示在实体框里。</div>';
      }
      if (cands.length) {
        body += '<div class="fk-add">' +
          '<select data-act="fk-pick" data-entity-id="' + ent.id + '">' +
          cands.map(function (c) {
            return '<option value="' + esc(c.entity.id + '|' + c.attr.id + '|' + c.relId) + '">' +
              esc(c.entity.name + '.' + c.attr.name + '（经 ' + c.relName + '）') + '</option>';
          }).join('') +
          '</select>' +
          '<button class="btn btn--sm" data-act="add-fk" data-entity-id="' + ent.id + '">＋ 添加外键</button>' +
          '</div>';
      } else {
        body += '<div class="hint">先让该实体参与关系，另一端实体的主键才能作为外键。</div>';
      }
      return '<div class="insp-section"><div class="insp-title">外键 Foreign key <span class="hint">' + list.length + '</span></div>' +
        body + '</div>';
    }
    function pruneFks() {
      state.model.entities.forEach(function (ent) {
        if (!Array.isArray(ent.fks)) { ent.fks = []; return; }
        ent.fks = ent.fks.filter(function (f) {
          const target = getEntity(f.refEntityId);
          const ref = findAttrById(target, f.refAttrId);
          const rel = f.relId ? getRel(f.relId) : null;
          return !!(target && ref && ref.key && rel);
        });
      });
    }
    function clipLabel(name, max) {
      var chars = Array.from(String(name == null ? '' : name));
      if (chars.length <= (max || 14)) return String(name == null ? '' : name);
      return chars.slice(0, max || 14).join('') + '\u2026';
    }
    function entityNodeHTML(ent) {
      const selected = state.selected && !state.selected.attrOnly && state.selected.ntype === 'entity' && state.selected.id === ent.id;
      return '<div class="er-node er-entity' + (ent.weak ? ' weak' : '') + (selected ? ' selected' : '') + '" data-node="' + ent.id + '" data-ntype="entity" style="transform:translate(' + Math.round(ent.x) + 'px,' + Math.round(ent.y) + 'px)">' +
        '<div class="er-entity-head">' +
        '<span class="er-entity-name" data-edit-name title="' + esc(ent.name) + '">' + esc(clipLabel(ent.name, 14)) + '</span></div>' +
        compoundKeyHTML(ent) +
        foreignKeyHTML(ent) +
        '</div>';
    }

    function relWidth(name) {
      var w = 24;
      Array.from(String(name || '')).forEach(function (ch) { w += /[\u4e00-\u9fff]/.test(ch) ? 13 : 7.6; });
      return Math.max(160, Math.min(340, Math.round(w + 44)));
    }
    function relNodeHTML(rel) {
      var shown = clipLabel(rel.name, 14);
      var rw = relWidth(shown);
      const selected = state.selected && !state.selected.attrOnly && state.selected.ntype === 'relationship' && state.selected.id === rel.id;
      return '<div class="er-node er-rel' + (selected ? ' selected' : '') + '" data-node="' + rel.id + '" data-ntype="relationship" style="width:' + rw + 'px;transform:translate(' + Math.round(rel.x) + 'px,' + Math.round(rel.y) + 'px)">' +
        '<svg class="er-diamond" width="' + rw + '" height="92" viewBox="0 0 160 92" preserveAspectRatio="none" aria-hidden="true">' +
        '<polygon points="80,6 154,46 80,86 6,46"></polygon></svg>' +
        '<div class="er-rel-title" data-edit-name title="' + esc(rel.name) + '">' + esc(shown) + '</div>' +
        compoundKeyHTML(rel) +
        '</div>';
    }

    function renderNodes() {
      nodesEl.innerHTML = state.model.entities.map(entityNodeHTML).join('') +
        state.model.relationships.map(relNodeHTML).join('');
      renderAttrNodes();
    }

    /* ---------- 渲染：属性小球（每个属性一个连着实体的圆） ---------- */
    function ownerKeyStats(rootKind, rootId) {
      const owner = rootKind === 'entity' ? getEntity(rootId) : getRel(rootId);
      if (!owner) return { top: 0, child: 0, total: 0 };
      let top = 0, child = 0;
      owner.attributes.forEach(function (a) {
        if (a.key) top++;
        (a.children || []).forEach(function (c) { if (c.key) child++; });
      });
      return { top: top, child: child, total: top + child };
    }
    function attrNodeHTML(a, ownerKind, ownerId, rootKind, rootId, ownerEnt) {
      const attrOnly = state.selected && state.selected.attrOnly;
      const sel = state.selectedAttr === a.id && state.selected && state.selected.id === rootId && (!attrOnly || state.selected.ntype === rootKind);
      const isWeak = ownerEnt && ownerEnt.weak;
      const keyCount = ownerKeyStats(rootKind, rootId).total;
      const cls = ['er-attr-node'];
      if (a.multi) cls.push('is-multi');
      if (a.key) {
        if (keyCount > 1) cls.push('is-key-white');
        else cls.push(isWeak ? 'is-partial' : 'is-key');
      }
      if (a.children && a.children.length) cls.push('is-composite');
      if (sel) cls.push('selected');
      return '<div class="' + cls.join(' ') + '" data-attr-node data-attr-id="' + a.id + '"' +
        ' data-owner-kind="' + ownerKind + '" data-owner-id="' + ownerId + '"' +
        ' data-nid="' + rootId + '" data-nk="' + rootKind + '" data-dir="up">' +
        '<span class="er-attr-name">' + esc(a.name) + '</span>' +
        (a.nocard ? '' : '<span class="er-attr-card">(' + (a.multi ? String(a.min || 0) + ',N' : '0,1') + ')</span>') +
        '</div>';
    }
    function renderAttrNodes() {
      const parts = [];
      state.model.entities.forEach(function (ent) {
        ent.attributes.forEach(function (a) {
          parts.push(attrNodeHTML(a, 'entity', ent.id, 'entity', ent.id, ent));
          (a.children || []).forEach(function (c) {
            parts.push(attrNodeHTML(c, 'attr', a.id, 'entity', ent.id, ent));
          });
        });
      });
      state.model.relationships.forEach(function (rel) {
        rel.attributes.forEach(function (a) {
          parts.push(attrNodeHTML(a, 'rel', rel.id, 'relationship', rel.id, null));
          (a.children || []).forEach(function (c) {
            parts.push(attrNodeHTML(c, 'attr', a.id, 'relationship', rel.id, null));
          });
        });
      });
      attrNodesEl.innerHTML = parts.join('');
    }
    function attrElById(attrId) { return attrNodesEl.querySelector('[data-attr-id="' + attrId + '"]'); }

    /* 找到属性（含子属性）的模型对象 */
    function findAttrModel(id) {
      let found = null;
      function scan(list) {
        (list || []).forEach(function (a) {
          if (found) return;
          if (a.id === id) { found = a; return; }
          scan(a.children);
        });
      }
      state.model.entities.forEach(function (e) { if (!found) scan(e.attributes); });
      state.model.relationships.forEach(function (r) { if (!found) scan(r.attributes); });
      return found;
    }

    /* 把属性小球排到所属实体 / 关系 / 父属性周围（椭圆环），并返回位置表
       尺寸很小，名字在外面；自动位置会做一次腾挪，尽量互相不压住 */
    /* 属性小球排布：按槽位确定位置（同一结构永远得到同一位置，不会跳动），
       名字需要的空间不足时整体放大环半径 */
    let attrLayoutCache = {};
    /* 属性小球手动拖拽时记录「所属元素的中心」作为锚点；元素移动时小球跟着平移 */
    function ownerCentre(kind, id) {
      const num = function (m, i) { return m ? parseFloat(m[i]) : 0; };
      if (kind === 'attr') {
        const el = attrNodesEl.querySelector('[data-attr-node][data-attr-id="' + id + '"]');
        if (!el) return { x: 0, y: 0 };
        const m = /translate\((-?[\d.]+)px,\s*(-?[\d.]+)px\)/.exec(el.style.transform || '');
        const half = el.getAttribute('data-owner-kind') === 'attr' ? 13 : 17;
        return { x: num(m, 1) + half, y: num(m, 2) + half };
      }
      const el = elFor(id);
      if (!el) return { x: 0, y: 0 };
      const m = /translate\((-?[\d.]+)px,\s*(-?[\d.]+)px\)/.exec(el.style.transform || '');
      return { x: num(m, 1) + el.offsetWidth / 2, y: num(m, 2) + el.offsetHeight / 2 };
    }
    function layoutAttrs() {
      const pos = {};
      const geo = computeGeo();
      const els = Array.prototype.slice.call(attrNodesEl.querySelectorAll('[data-attr-node]'));
      if (!els.length) return pos;
      const groups = {};
      els.forEach(function (el) {
        const k = el.getAttribute('data-owner-kind') + ':' + el.getAttribute('data-owner-id');
        (groups[k] = groups[k] || []).push(el);
      });
      const placed = {};
      function ownerBox(kind, id) {
        if (kind === 'attr' && placed[id]) return placed[id];
        return geo[id] || null;
      }
      Object.keys(groups).sort(function (a, b) {
        return (a.indexOf('attr:') === 0 ? 1 : 0) - (b.indexOf('attr:') === 0 ? 1 : 0);
      }).forEach(function (k) {
        const list = groups[k];
        const kind = k.split(':')[0];
        const id = k.slice(kind.length + 1);
        const owner = ownerBox(kind, id);
        if (!owner) return;
        const isAttrOwner = kind === 'attr';
        const halfW = (owner.w || 18) / 2;
        const halfH = (owner.h || 18) / 2;
        const n = list.length;
        const step = (Math.PI * 2) / n;
        const start = -Math.PI / 2 + (n % 2 === 0 ? step / 2 : 0);
        const baseRx = halfW + (isAttrOwner ? 30 : 54);
        const baseRy = halfH + (isAttrOwner ? 26 : 46);
        const need = n * 80;
        const perimeter = Math.PI * (baseRx + baseRy);
        const scale = Math.max(1, need / perimeter);
        const sig = list.map(function (el) { return el.getAttribute('data-attr-id'); }).join(',') +
          '|' + Math.round(owner.w) + 'x' + Math.round(owner.h) + '|' + (scale > 1 ? scale.toFixed(2) : '1');
        let cache = attrLayoutCache[k];
        if (!cache || cache.sig !== sig) cache = attrLayoutCache[k] = { sig: sig, map: {} };
        list.forEach(function (el, i) {
          const attrId = el.getAttribute('data-attr-id');
          const a = findAttrModel(attrId);
          const comp = !!(a && a.children && a.children.length);
          const w = comp ? 34 : (isAttrOwner ? 12 : 18);
          let cx, cy, manual = false;
          if (a && a.x != null && a.y != null) {
            /* 手动拖过的属性：坐标以「拖动时所属元素的中心」为锚点，元素移动时同步位移 */
            const baseX = a.ox != null ? a.ox : owner.x;
            const baseY = a.oy != null ? a.oy : owner.y;
            cx = a.x + (owner.x - baseX);
            cy = a.y + (owner.y - baseY);
            manual = true;
          } else if (cache.map[attrId]) {
            cx = owner.x + cache.map[attrId].dx; cy = owner.y + cache.map[attrId].dy;
          } else if (isAttrOwner) {
            /* 子属性：沿「实体 → 复合属性」向外的方向排成一小簇 */
            const rootId = el.getAttribute('data-nid');
            const root = geo[rootId] || owner;
            let ox = owner.x - root.x, oy = owner.y - root.y;
            const ol = Math.hypot(ox, oy) || 1;
            ox /= ol; oy /= ol;
            const px = -oy, py = ox;
            const dist = 34 + i * 20;
            const side = (i % 2 === 0 ? 1 : -1) * (15 + Math.floor(i / 2) * 16);
            cx = owner.x + ox * dist + px * side;
            cy = owner.y + oy * dist + py * side;
            cache.map[attrId] = { dx: cx - owner.x, dy: cy - owner.y };
          } else {
            const ang = start + i * step;
            cx = owner.x + Math.cos(ang) * baseRx * scale;
            cy = owner.y + Math.sin(ang) * baseRy * scale;
            cache.map[attrId] = { dx: cx - owner.x, dy: cy - owner.y };
          }
          const rec = { ntype: 'attr', x: cx, y: cy, w: w, h: isAttrOwner ? 12 : 18, comp: comp, manual: manual, attrId: attrId, el: el };
          pos[attrId] = rec;
          placed[attrId] = rec;
        });
      });
      Object.keys(placed).forEach(function (attrId) {
        const rec = placed[attrId];
        const el = rec.el;
        const owner = el.getAttribute('data-owner-kind');
        const oid = el.getAttribute('data-owner-id');
        const o = ownerBox(owner, oid);
        const dx = rec.x - (o ? o.x : rec.x), dy = rec.y - (o ? o.y : rec.y);
        let dir = Math.abs(dy) >= Math.abs(dx) ? (dy >= 0 ? 'down' : 'up') : (dx >= 0 ? 'right' : 'left');
        /* 复合属性（药丸）名字放在上方，把左右两侧留给子属性 */
        if (rec.comp) dir = 'up';
        el.setAttribute('data-dir', dir);
        el.style.transform = 'translate(' + Math.round(rec.x - rec.w / 2) + 'px,' + Math.round(rec.y - rec.h / 2) + 'px)';
      });
      return pos;
    }

    /* ---------- 渲染：连线 ---------- */
    function computeGeo() {
      const geo = {};
      allNodes().forEach(function (it) {
        const el = elFor(it.node.id);
        let w = el ? el.offsetWidth : 0;
        let h = el ? el.offsetHeight : 0;
        if (!w || !h) {
          if (it.ntype === 'entity') { w = 200; h = 120; }
          else if (it.ntype === 'relationship') { w = 160; h = 92; }
          else { w = 0; h = 0; }
        }
        geo[it.node.id] = { x: it.node.x + w / 2, y: it.node.y + h / 2, w: w, h: h, ntype: it.ntype };
      });
      return geo;
    }
    function edgePoint(from, to, shape) {
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const len = Math.hypot(dx, dy) || 1;
      const ux = dx / len, uy = dy / len;
      let t;
      if (shape.ntype === 'entity') t = 1 / (Math.abs(ux) / (shape.w / 2 + 2) + Math.abs(uy) / (shape.h / 2 + 2));
      else if (shape.ntype === 'relationship') t = 1 / (Math.abs(ux) / ((shape.w || 160) / 2) + Math.abs(uy) / ((shape.h || 92) / 2));
      else if (shape.ntype === 'attr') t = 1 / (Math.abs(ux) / ((shape.w || 18) / 2) + Math.abs(uy) / ((shape.h || 18) / 2));
      else t = 30;
      t = Math.min(t, len);
      return { x: from.x + ux * t, y: from.y + uy * t, ux: ux, uy: uy };
    }
    function svgLine(x1, y1, x2, y2, cls) {
      const l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      l.setAttribute('x1', x1); l.setAttribute('y1', y1);
      l.setAttribute('x2', x2); l.setAttribute('y2', y2);
      l.setAttribute('class', 'e-line ' + (cls || ''));
      return l;
    }
    function addCardLabel(x, y, text, total, relId, pid) {
      const d = document.createElement('button');
      d.type = 'button';
      d.className = 'er-edge-label er-card' + (total ? ' total' : '');
      d.style.left = x + 'px';
      d.style.top = y + 'px';
      d.setAttribute('data-act', 'edit-card');
      d.setAttribute('data-rel-id', relId);
      d.setAttribute('data-pid', pid);
      d.title = '点击修改基数';
      d.innerHTML = '<span class="card' + (total ? ' total' : '') + '">' + esc(text) + '</span>';
      overlayEl.appendChild(d);
    }
    function drawEdges() {
      const pos = layoutAttrs();
      const geo = computeGeo();
      edgesEl.innerHTML = '';
      overlayEl.innerHTML = '';
      function attrLink(parentShape, attrId, cls) {
        const ap = pos[attrId];
        if (!ap || !parentShape) return;
        const p1 = edgePoint(parentShape, ap, parentShape);
        const p2 = edgePoint(ap, parentShape, ap);
        const ln = svgLine(p1.x, p1.y, p2.x, p2.y, cls || 'attr');
        ln.setAttribute('stroke-linecap', 'round');
        edgesEl.appendChild(ln);
      }
      // 实体 / 关系 → 属性小球，以及复合属性 → 子属性
      state.model.entities.forEach(function (ent) {
        const g = geo[ent.id];
        if (!g) return;
        ent.attributes.forEach(function (a) {
          attrLink(g, a.id, 'attr');
          (a.children || []).forEach(function (c) { attrLink(pos[a.id], c.id, 'attr child'); });
        });
      });
      state.model.relationships.forEach(function (rel) {
        const g = geo[rel.id];
        if (!g) return;
        rel.attributes.forEach(function (a) {
          attrLink(g, a.id, 'attr');
          (a.children || []).forEach(function (c) { attrLink(pos[a.id], c.id, 'attr child'); });
        });
      });
      // 复合键：把同一所有者下的多个主键小球串起来，并在端头点一个小黑点
      function drawKeyChains(owner, rootKind, rootId) {
        const stats = ownerKeyStats(rootKind, rootId);
        if (stats.total < 2) return;
        const g = geo[rootId];
        if (!g) return;
        const keys = [];
        (owner.attributes || []).forEach(function (a) {
          if (a.key && pos[a.id]) keys.push({ p: pos[a.id], kind: 'attr' });
          (a.children || []).forEach(function (c) {
            if (c.key && pos[c.id]) keys.push({ p: pos[c.id], kind: 'child', parent: pos[a.id] });
          });
        });
        if (keys.length < 2) return;
        const cx = g.x, cy = g.y;
        const contacts = keys.map(function (k) {
          const e = edgePoint(g, k.p, g);
          return { x: e.x, y: e.y, ang: Math.atan2(k.p.y - cy, k.p.x - cx), k: k };
        }).sort(function (m, n) { return m.ang - n.ang; });
        function outward(x, y) {
          const dx = x - cx, dy = y - cy;
          const l = Math.hypot(dx, dy) || 1;
          return { x: dx / l, y: dy / l };
        }
        function keyPath(x1, y1, x2, y2, bow) {
          const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
          const o = outward(mx, my);
          const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          path.setAttribute('d', 'M' + x1.toFixed(1) + ',' + y1.toFixed(1) + ' Q' + (mx + o.x * bow).toFixed(1) + ',' + (my + o.y * bow).toFixed(1) + ' ' + x2.toFixed(1) + ',' + y2.toFixed(1));
          path.setAttribute('class', 'e-line keychain');
          path.setAttribute('fill', 'none');
          edgesEl.appendChild(path);
        }
        for (let i = 1; i < contacts.length; i++) {
          keyPath(contacts[i - 1].x, contacts[i - 1].y, contacts[i].x, contacts[i].y, 14);
        }
        contacts.forEach(function (c) {
          if (c.k.kind !== 'child' || !c.k.parent) return;
          const f = edgePoint(c.k.p, c.k.parent, c.k.p);
          keyPath(f.x, f.y, c.x, c.y, 18);
        });
        const head = contacts[0];
        const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        dot.setAttribute('cx', head.x.toFixed(1));
        dot.setAttribute('cy', head.y.toFixed(1));
        dot.setAttribute('r', 3.2);
        dot.setAttribute('class', 'e-keydot');
        edgesEl.appendChild(dot);
      }
            state.model.entities.forEach(function (ent) { drawKeyChains(ent, 'entity', ent.id); });
      state.model.relationships.forEach(function (rel) { drawKeyChains(rel, 'relationship', rel.id); });
      /* 连线遇到其它元素时改用弧线绕开 */
      const entSet = {}, relSet = {};
      state.model.entities.forEach(function (e) { entSet[e.id] = 1; });
      state.model.relationships.forEach(function (r) { relSet[r.id] = 1; });
      function segHitsBoxes(x1, y1, x2, y2, skip) {
        const ids = Object.keys(geo);
        for (let i = 0; i < ids.length; i++) {
          const id = ids[i];
          if (skip.indexOf(id) >= 0) continue;
          const g = geo[id];
          if (!g) continue;
          const isEnt = !!entSet[id], isRel = !!relSet[id];
          if (!isEnt && !isRel) continue;
          const hw = isEnt ? g.w / 2 + 10 : 86;
          const hh = isEnt ? g.h / 2 + 8 : 52;
          for (let k = 2; k <= 18; k++) {
            const t = k / 20;
            const px = x1 + (x2 - x1) * t, py = y1 + (y2 - y1) * t;
            if (Math.abs(px - g.x) < hw && Math.abs(py - g.y) < hh) return true;
          }
        }
        return false;
      }
      function segHitScore(x1, y1, x2, y2, skip) {
        let n = 0;
        const ids = Object.keys(geo);
        for (let i = 0; i < ids.length; i++) {
          const id = ids[i];
          if (skip.indexOf(id) >= 0) continue;
          const g = geo[id];
          if (!g) continue;
          const isEnt = !!entSet[id], isRel = !!relSet[id];
          if (!isEnt && !isRel) continue;
          const hw = isEnt ? g.w / 2 + 10 : 86;
          const hh = isEnt ? g.h / 2 + 8 : 52;
          for (let k = 2; k <= 18; k++) {
            const t = k / 20;
            const px = x1 + (x2 - x1) * t, py = y1 + (y2 - y1) * t;
            if (Math.abs(px - g.x) < hw && Math.abs(py - g.y) < hh) { n++; break; }
          }
        }
        return n;
      }
      function drawRelationLink(pa, pb, relId, entId, double) {
        const blocked = segHitsBoxes(pa.x, pa.y, pb.x, pb.y, [relId, entId]);
        if (!blocked) {
          edgesEl.appendChild(svgLine(pa.x, pa.y, pb.x, pb.y, double ? 'total' : ''));
          if (double) {
            const ox = -pa.uy * 3, oy = pa.ux * 3;
            edgesEl.appendChild(svgLine(pa.x + ox, pa.y + oy, pb.x + ox, pb.y + oy, 'total'));
          }
          return;
        }
        const mx = (pa.x + pb.x) / 2, my = (pa.y + pb.y) / 2;
        let ctrl = null;
        let best = null;
        const straightScore = segHitScore(pa.x, pa.y, pb.x, pb.y, [relId, entId]);
        [90, 140, 190, 250, 320, 400, 480, 560].forEach(function (bow) {
          for (let k = 0; k < 16; k++) {
            const ang = (Math.PI * 2 * k) / 16;
            const cx = mx + Math.cos(ang) * bow, cy = my + Math.sin(ang) * bow;
            const sc = segHitScore(pa.x, pa.y, cx, cy, [relId, entId]) + segHitScore(cx, cy, pb.x, pb.y, [relId, entId]);
            if (!best || sc < best.sc) best = { sc: sc, x: cx, y: cy };
          }
        });
        if (best && best.sc < straightScore) ctrl = { x: best.x, y: best.y };
        if (!ctrl) {
          edgesEl.appendChild(svgLine(pa.x, pa.y, pb.x, pb.y, double ? 'total' : ''));
          return;
        }
        const mk = function (off) {
          const d = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          d.setAttribute('d', 'M' + (pa.x + off) + ',' + (pa.y + off) + ' Q' + ctrl.x + ',' + ctrl.y + ' ' + (pb.x + off) + ',' + (pb.y + off));
          d.setAttribute('class', 'e-line route' + (double ? ' total' : ''));
          d.setAttribute('fill', 'none');
          return d;
        };
        edgesEl.appendChild(mk(0));
        if (double) edgesEl.appendChild(mk(3));
      }
      state.model.relationships.forEach(function (rel) {
        const a = geo[rel.id];
        if (!a) return;
        rel.participants.forEach(function (p) {
          const b = geo[p.entityId];
          if (!b) return;
          const pa = edgePoint(a, b, a);
          const pb = edgePoint(b, a, b);
          drawRelationLink(pa, pb, rel.id, p.entityId, p.min >= 1);
          // 标签放在连线中点并向垂线方向偏一点，避免压在实体边框上
          const t = 0.58;
          const mx = pa.x + (pb.x - pa.x) * t, my = pa.y + (pb.y - pa.y) * t;
          const lx = mx - pa.uy * 13;
          const ly = my + pa.ux * 13;
          addCardLabel(lx, ly, '(' + p.min + ',' + p.max + ')', p.min >= 1, rel.id, p.id);
        });
      });
      state.model.isas.forEach(function (isa) {
        if (!isa.parentId) return;
        const par = geo[isa.parentId];
        if (!par) return;
        const kids = isa.childIds.map(function (cid) { return geo[cid]; }).filter(Boolean);
        let vx = 0, vy = 0;
        kids.forEach(function (k) { vx += k.x - par.x; vy += k.y - par.y; });
        if (!kids.length) { vx = 0; vy = 1; }
        const vertical = Math.abs(vy) >= Math.abs(vx);
        const sign = (vertical ? vy : vx) >= 0 ? 1 : -1;
        const ux = vertical ? 0 : sign, uy = vertical ? sign : 0;
        const px = -uy, py = ux;
        // 接点：父实体边界的中心轴
        const ax = par.x + (vertical ? 0 : sign * (par.w / 2 + 1));
        const ay = par.y + (vertical ? sign * (par.h / 2 + 1) : 0);
        // 空心三角形（IS-A 符号），贴在父实体边界上
        const TW = 9, TD = 16;
        const tri = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        tri.setAttribute('points', [
          ax + ',' + ay,
          (ax + ux * TD + px * TW) + ',' + (ay + uy * TD + py * TW),
          (ax + ux * TD - px * TW) + ',' + (ay + uy * TD - py * TW)
        ].join(' '));
        tri.setAttribute('class', 'e-isa-tri');
        edgesEl.appendChild(tri);
        // 各子实体在主方向上的投影，决定总线位置与长度
        const projs = kids.map(function (k) {
          return {
            k: k,
            along: (k.x - ax) * ux + (k.y - ay) * uy,
            off: (k.x - ax) * px + (k.y - ay) * py
          };
        });
        let busDist = 58;
        if (projs.length) {
          const minAlong = Math.min.apply(null, projs.map(function (o) { return o.along; }));
          busDist = util.clamp(Math.min(minAlong - 26, 170), TD + 16, 170);
        }
        const bx = ax + ux * busDist, by = ay + uy * busDist;
        edgesEl.appendChild(svgLine(ax + ux * TD, ay + uy * TD, bx, by, 'thick'));
        // 每个子实体的落点：沿总线方向平移 30px 再垂直 / 水平落到实体边界，
        // 全部是直线段（不画斜线），同时避开边界正中的属性小球
        const drops = projs.map(function (o) {
          const t = o.off;
          const k = o.k;
          const hw = (k.w || 160) / 2, hh = (k.h || 92) / 2;
          let tx, ty;
          if (vertical) {
            tx = k.x;
            ty = sign > 0 ? k.y - hh : k.y + hh;
          } else {
            ty = k.y;
            tx = sign > 0 ? k.x - hw : k.x + hw;
          }
          return { t: t, x: tx, y: ty };
        });
        const span = [0].concat(drops.map(function (d) { return d.t; }));
        const tMin = Math.min.apply(null, span), tMax = Math.max.apply(null, span);
        edgesEl.appendChild(svgLine(bx + px * tMin, by + py * tMin, bx + px * tMax, by + py * tMax, 'thick'));
        drops.forEach(function (d) {
          edgesEl.appendChild(svgLine(bx + px * d.t, by + py * d.t, d.x, d.y, 'thick'));
        });
        // 约束标签 (t,e)：可点选 ISA，改全参与/排他
        const selected = state.selected && state.selected.ntype === 'isa' && state.selected.id === isa.id;
        const lab = document.createElement('button');
        lab.type = 'button';
        lab.className = 'isa-label' + (selected ? ' selected' : '');
        lab.setAttribute('data-node', isa.id);
        lab.setAttribute('data-ntype', 'isa');
        lab.setAttribute('aria-label', '选择泛化约束 ' + isaConstraint(isa));
        lab.textContent = '(' + isaConstraint(isa) + ')';
        const lm = TD + (busDist - TD) * 0.55;
        lab.style.left = Math.round(ax + ux * lm + px * 16) + 'px';
        lab.style.top = Math.round(ay + uy * lm + py * 16) + 'px';
        overlayEl.appendChild(lab);
        if (!kids.length) {
          edgesEl.appendChild(svgLine(bx, by, bx + px * 26, by + py * 26, 'thick'));
        }
      });
    }
    function isaConstraint(isa) {
      return (isa.totality || 't') + ',' + (isa.exclusivity || 'e');
    }

    /* ---------- 渲染：左侧结构树 ---------- */
    function renderOutline() {
      const box = $('#erOutline');
      const items = [];
      state.model.entities.forEach(function (ent) {
        const sel = state.selected && state.selected.ntype === 'entity' && state.selected.id === ent.id;
        items.push('<button class="outline-item' + (sel ? ' active' : '') + '" data-act="locate" data-ntype="entity" data-id="' + ent.id + '">' +
          '<span class="oi-name">' + esc(ent.name) + '</span><span class="oi-meta">' + ent.attributes.length + '</span></button>');
      });
      state.model.relationships.forEach(function (rel) {
        const sel = state.selected && state.selected.ntype === 'relationship' && state.selected.id === rel.id;
        items.push('<button class="outline-item' + (sel ? ' active' : '') + '" data-act="locate" data-ntype="relationship" data-id="' + rel.id + '">' +
          '<span class="oi-name">◇ ' + esc(rel.name) + '</span><span class="oi-meta">' + rel.participants.length + '端</span></button>');
      });
      state.model.isas.forEach(function (isa) {
        const sel = state.selected && state.selected.ntype === 'isa' && state.selected.id === isa.id;
        items.push('<button class="outline-item' + (sel ? ' active' : '') + '" data-act="locate" data-ntype="isa" data-id="' + isa.id + '">' +
          '<span class="oi-name">△ ' + esc(isa.name) + '</span><span class="oi-meta">' + isa.childIds.length + ' 子</span></button>');
      });
      box.innerHTML = items.length ? items.join('') : '<div class="hint" style="padding:6px 8px">还没有元素，点击上方按钮添加。</div>';
      const cnt = $('#erCount');
      if (cnt) cnt.textContent = state.model.entities.length + ' 个实体 · ' + state.model.relationships.length + ' 个关系';
    }

    /* ---------- 渲染：属性面板 ---------- */
    function b(spec) { return "data-bind='" + JSON.stringify(spec) + "'"; }
    function typeOptions(sel) {
      return TYPES.map(function (t) {
        return '<option value="' + t + '"' + (t === sel ? ' selected' : '') + '>' + (t === 'AUTO' ? '自动' : t) + '</option>';
      }).join('');
    }
    function attrTagList(a, isWeakOwner) {
      const tags = [];
      if (a.key) tags.push(isWeakOwner ? '部分键' : 'PK');
      if (a.multi) tags.push('多值');
      if (a.children && a.children.length) tags.push('复合');
      return tags.map(function (t) { return '<span class="tag">' + t + '</span>'; }).join('');
    }
    function attrListHTML(attrs, ownerKind, ownerId, isWeakOwner, rootKind, rootId) {
      if (!attrs.length) return '<div class="hint">还没有属性，用上方「＋ 属性」添加。</div>';
      return '<div class="attr-editor">' + attrs.map(function (a) {
        const sel = state.selectedAttr === a.id ? ' sel' : '';
        return '<div class="attr-row' + sel + '" data-act="sel-attr" data-nk="' + rootKind + '" data-nid="' + rootId + '"' +
          ' data-owner="' + ownerKind + '" data-owner-id="' + ownerId + '" data-attr-id="' + a.id + '">' +
          '<span class="an">' + esc(a.name) + '</span><span class="tags">' + attrTagList(a, isWeakOwner) + '</span></div>';
      }).join('') + '</div>';
    }
    function attrDetailHTML(ownerKind, ownerId, attrId, isWeakOwner, rootKind, rootId) {
      const owner = ownerKind === 'entity' ? getEntity(ownerId) : getRel(ownerId);
      if (!owner) return '';
      let a = owner.attributes.find(function (x) { return x.id === attrId; });
      let child = null;
      if (!a) {
        owner.attributes.forEach(function (x) {
          (x.children || []).forEach(function (c) { if (c.id === attrId) { a = x; child = c; } });
        });
      }
      if (!a) return '';
      const back = '<div class="insp-actions" style="margin-bottom:10px"><button class="btn btn--sm" data-act="attr-close">← 返回属性列表</button></div>';
      if (child) {
        const otherKey = owner.attributes.some(function (x) { return x.key && x.id !== a.id; });
        return '<div class="insp-section">' +
          '<div class="insp-title">子属性 <span class="badge">' + (child.key ? '复合主键成员' : '普通') + '</span></div>' +
          back +
          '<label class="field"><span>名称</span><input type="text" ' + b({ t: 'child', owner: ownerKind, ownerId: ownerId, attrId: a.id, childId: child.id, f: 'name' }) + ' value="' + esc(child.name) + '"></label>' +
          '<div class="hint">属于属性「' + esc(a.name) + '」 · 实体 ' + esc(owner.name) + '</div>' +
          '<label class="check"><input type="checkbox" ' + b({ t: 'child', owner: ownerKind, ownerId: ownerId, attrId: a.id, childId: child.id, f: 'key' }) + (child.key ? ' checked' : '') + (otherKey ? '' : ' disabled') + '> 作为复合主键的一部分</label>' +
          '<div class="hint">' + (otherKey ? '和其它主键属性一起组成复合键。' : '先在实体里设置一个主键属性，子属性才能加入复合键。') + '</div>' +
          '<div class="insp-actions"><button class="btn btn--sm btn--danger" data-act="del-child" data-owner="' + ownerKind + '" data-owner-id="' + ownerId + '" data-attr-id="' + a.id + '" data-child-id="' + child.id + '">删除子属性</button></div>' +
          '</div>';
      }
      const comp = !!(a.children && a.children.length);
      const ownerLabel = ownerKind === 'entity' ? '实体 ' + owner.name : '关系 ' + owner.name;
      let rows = '';
      if (comp) {
        const otherKey = owner.attributes.some(function (x) { return x.key && x.id !== a.id; });
        rows = '<div class="insp-title" style="margin-top:14px">子属性</div><div class="attr-children">' + a.children.map(function (c) {
          return '<div class="attr-child-row">' +
            '<input type="text" ' + b({ t: 'child', owner: ownerKind, ownerId: ownerId, attrId: a.id, childId: c.id, f: 'name' }) + ' value="' + esc(c.name) + '" placeholder="子属性">' +
            '<label class="check check--mini" title="' + (otherKey ? '作为复合主键的一部分' : '需要同一所有者下另有主键') + '"><input type="checkbox" ' + b({ t: 'child', owner: ownerKind, ownerId: ownerId, attrId: a.id, childId: c.id, f: 'key' }) + (c.key ? ' checked' : '') + (otherKey ? '' : ' disabled') + '> PK</label>' +
            '<button class="icon-x" title="编辑子属性" data-act="sel-child" data-nk="' + rootKind + '" data-nid="' + rootId + '" data-attr-id="' + a.id + '" data-child-id="' + c.id + '">›</button>' +
            '<button class="icon-x" title="删除子属性" data-act="del-child" data-owner="' + ownerKind + '" data-owner-id="' + ownerId + '" data-attr-id="' + a.id + '" data-child-id="' + c.id + '">✕</button>' +
            '</div>';
        }).join('') + '</div>';
      }
      return '<div class="insp-section">' +
        '<div class="insp-title">属性 <span class="badge">' + esc(a.name) + '</span></div>' +
        back +
        '<label class="field"><span>名称</span><input type="text" ' + b({ t: 'attr', owner: ownerKind, ownerId: ownerId, attrId: a.id, f: 'name' }) + ' value="' + esc(a.name) + '"></label>' +
        '<div class="hint" style="margin-bottom:8px">属于 ' + esc(ownerLabel) + '</div>' +
        '<label class="field"><span>基数 Cardinality</span><select data-act="attr-card" data-owner="' + ownerKind + '" data-owner-id="' + ownerId + '" data-attr-id="' + a.id + '">' +
        '<option value="1"' + ((!a.nocard && !a.multi) ? ' selected' : '') + '>1 — 单值属性</option>' +
        '<option value="N"' + (!a.nocard && a.multi ? ' selected' : '') + '>N — 多值属性</option>' +
        '<option value="none"' + (a.nocard ? ' selected' : '') + '>普通属性（不显示基数）</option>' +
        '</select></label>' +
        (comp
          ? '<div class="hint">有子属性的属性不能作主键；主键可由子属性组成。</div>'
          : '<label class="check"><input type="checkbox" ' + b({ t: 'attr', owner: ownerKind, ownerId: ownerId, attrId: a.id, f: 'key' }) + (a.key ? ' checked' : '') + '> ' + (isWeakOwner ? '部分键（弱实体标识）' : '主键 / 标识属性') + '</label>') +
        '<div class="hint">单主键为黑球；多主键为白球并连成复合键。</div>' +
        rows +
        '<div class="insp-actions" style="margin-top:10px">' +
        '<button class="btn btn--sm" data-act="add-child" data-owner="' + ownerKind + '" data-owner-id="' + ownerId + '" data-attr-id="' + a.id + '">＋ 添加子属性</button>' +
        '<button class="btn btn--sm btn--danger" data-act="del-attr" data-owner="' + ownerKind + '" data-owner-id="' + ownerId + '" data-attr-id="' + a.id + '">删除属性</button>' +
        '</div></div>';
    }

    function normalizeKeys(owner) {
      if (!owner || !owner.attributes) return;
      owner.attributes.forEach(function (a) {
        if (a.children && a.children.length) a.key = false;
        (a.children || []).forEach(function (c) {
          if (!c.key) return;
          const other = owner.attributes.some(function (x) { return x.key && x.id !== a.id; });
          if (!other) c.key = false;
        });
      });
    }

    function inspEmpty() {
      return '<div class="insp">' +
        '<div class="insp-empty">未选中元素。点击画布元素查看属性。</div>' +
        '<div class="insp-section"><div class="insp-title">当前模型</div>' +
        '<div class="kv-list">' +
        '<div class="kv"><span class="k">模型名</span><span class="v">' + esc(state.model.name) + '</span></div>' +
        '<div class="kv"><span class="k">实体</span><span class="v">' + state.model.entities.length + '</span></div>' +
        '<div class="kv"><span class="k">关系</span><span class="v">' + state.model.relationships.length + '</span></div>' +
        '<div class="kv"><span class="k">ISA</span><span class="v">' + state.model.isas.length + '</span></div>' +
        (isFull ? '<div class="kv"><span class="k">检查</span><span class="v">' + (ERSCHEMA.checks(state.model).length) + '</span></div>' : '') +
        '</div></div>' +
        '<div class="insp-section"><div class="insp-title">提示</div>' +
        '<div class="hint">属性以小球围绕实体；「🔗 链接实体」可建 ISA 或加参与端。</div></div>' +
        '</div>';
    }

    /* ---------- 链接（ISA / 关系参与端） ---------- */
    function startLink(mode, node) {
      if (state.linking === mode && state.linkFrom && node && state.linkFrom.id === node.id) {
        cancelLink();
        ui.toast('已取消链接');
        return;
      }
      state.linking = mode;
      state.linkFrom = node ? { ntype: node.type, id: node.id, name: node.name } : null;
      updateLinkHint();
      refresh({ keepInspector: false });
    }
    function cancelLink() {
      state.linking = null;
      state.linkFrom = null;
      updateLinkHint();
      refresh({ keepView: true });
    }
    function resolveLink(ntype, id) {
      const from = state.linkFrom;
      if (!from) return;
      if (from.id === id) { ui.toast('不能链接到自身', 'err'); return; }
      if (state.linking === 'isa') {
        if (from.ntype !== 'entity' || ntype !== 'entity') { ui.toast('ISA 链接需要两个实体', 'err'); return; }
        const child = getEntity(from.id), parent = getEntity(id);
        if (!parent || !child) return;
        const childHas = state.model.isas.find(function (i) { return i.childIds.indexOf(child.id) >= 0; });
        if (childHas) { ui.toast('已有父实体：ISA 不允许继承多个实体', 'err'); return; }
        if (isaWouldCycle(child.id, parent.id)) { ui.toast('不能形成循环继承（实体不能成为自己后代的子类）', 'err'); return; }
        let isa = state.model.isas.find(function (i) { return i.parentId === parent.id; });
        if (!isa) {
          isa = { id: uid('isa'), type: 'isa', name: 'ISA', x: (parent.x + child.x) / 2, y: (parent.y + child.y) / 2 - 40, parentId: parent.id, childIds: [] };
          state.model.isas.push(isa);
        }
        isa.childIds.push(child.id);
        cancelLink();
        pushNow();
        select('entity', parent.id, null);
        ui.toast(parent.name + ' ⇢ ' + child.name + '：ISA 链接已创建');
      } else if (state.linking === 'part') {
        if (from.ntype !== 'relationship' || ntype !== 'entity') { ui.toast('关系链接需要选择实体', 'err'); return; }
        const rel = getRel(from.id), ent = getEntity(id);
        if (!rel || !ent) return;
        if (rel.participants.some(function (p) { return p.entityId === ent.id; })) {
          ui.toast(ent.name + ' 已经是该关系的参与端', 'err'); return;
        }
        rel.participants.push({ id: uid('part'), entityId: ent.id, min: 0, max: 'N', role: '' });
        cancelLink();
        pushNow();
        select('relationship', rel.id, null);
        ui.toast(rel.name + ' ⇤ ' + ent.name + '：参与端已添加（默认 (0,N)，可在右侧改基数）');
      }
    }

    function renderInspector() {
      const box = $('#erTabInsp');
      state.inspScroll = box.scrollTop;
      const sel = state.selected;
      if (!sel) { box.innerHTML = inspEmpty(); box.scrollTop = 0; return; }
      let html = '<div class="insp">';
      if (sel.ntype === 'entity') {
        const ent = getEntity(sel.id);
        if (!ent) { box.innerHTML = inspEmpty(); return; }
        html += '<div class="insp-section">' +
          '<div class="insp-title">实体 <span class="badge">' + (ent.weak ? '弱实体' : '强实体') + '</span></div>' +
          '<label class="field"><span>名称</span><input type="text" ' + b({ t: 'entity', id: ent.id, f: 'name' }) + ' value="' + esc(ent.name) + '"></label>' +
          '<label class="check"><input type="checkbox" ' + b({ t: 'entity', id: ent.id, f: 'weak' }) + (ent.weak ? ' checked' : '') + '> 弱实体（由所有者实体标识）</label>' +
          '<div class="hint">' + (ent.weak ? '弱实体主键 = 所有者实体主键 + 部分键。' : '强实体至少需要一个主键属性。') + '</div>' +
          '</div>';
        const entAttrSel = state.selectedAttr && ent.attributes.some(function (x) {
          return x.id === state.selectedAttr || (x.children || []).some(function (c) { return c.id === state.selectedAttr; });
        });
        const focusAttr = !!entAttrSel;
        if (entAttrSel) {
          html += attrDetailHTML('entity', ent.id, state.selectedAttr, ent.weak, 'entity', ent.id);
        } else {
          html += '<div class="insp-section"><div class="insp-title">属性 <span class="hint">' + ent.attributes.length + '</span></div>' +
            attrListHTML(ent.attributes, 'entity', ent.id, ent.weak, 'entity', ent.id) +
            '<div class="hint">点小球可编辑；用上方「＋ 属性」新增。</div>' +
            '</div>';
        }
        if (focusAttr) { html += '</div>'; box.innerHTML = html; box.scrollTop = 0; return; }
        html += fkInspHTML(ent);
        const asParent = state.model.isas.find(function (i) { return i.parentId === ent.id; });
        const asChild = state.model.isas.find(function (i) { return i.childIds.indexOf(ent.id) >= 0; });
        const sup = asChild ? getEntity(asChild.parentId) : null;
        html += '<div class="insp-section"><div class="insp-title">ISA 泛化</div>' +
          '<button class="btn btn--sm btn--block ' + (state.linking === 'isa' ? 'btn--on' : 'btn--primary') + '" data-act="link-isa" data-id="' + ent.id + '">' +
          (state.linking === 'isa' ? '🔗 正在链接…点击另一个实体' : '🔗 链接实体（连成 ISA）') + '</button>' +
          (asParent ? '<div class="kv"><span class="k">子类</span><span class="v">' + asParent.childIds.map(function (cid) {
            const e = getEntity(cid);
            return esc(e ? e.name : '（已删除）');
          }).join('、') + '</span></div>' : '') +
          (sup ? '<div class="kv"><span class="k">超类</span><span class="v">' + esc(sup.name) +
            ' <button class="icon-x" title="解除继承" data-act="unlink-isa" data-id="' + ent.id + '">✕</button></span></div>' : '') +
          '<div class="hint">' + (state.linking === 'isa'
            ? '再点击另一个实体，它将成为「' + esc(ent.name) + '」的子类。'
            : '点按钮后再点另一个实体，对方成为子类。') + '</div>' +
          '</div>';
        const parts = state.model.relationships.filter(function (r) {
          return r.participants.some(function (p) { return p.entityId === ent.id; });
        });
        html += '<div class="insp-section"><div class="insp-title">参与的关系</div>' +
          (parts.length ? parts.map(function (r) {
            const p = r.participants.find(function (x) { return x.entityId === ent.id; });
            return '<div class="kv"><span class="k">' + esc(r.name) + '</span><span class="v">(' + p.min + ',' + p.max + ')</span></div>';
          }).join('') : '<div class="hint">尚未参与任何关系。</div>') + '</div>';
        html += '<div class="insp-section"><div class="insp-actions">' +
          '<button class="btn btn--sm" data-act="locate" data-ntype="entity" data-id="' + ent.id + '">居中显示</button>' +
          '<button class="btn btn--sm btn--danger" data-act="del-node" data-ntype="entity" data-id="' + ent.id + '">删除实体</button></div></div>';
      } else if (sel.ntype === 'relationship') {
        const rel = getRel(sel.id);
        if (!rel) { box.innerHTML = inspEmpty(); return; }
        html += '<div class="insp-section">' +
          '<div class="insp-title">关系 <span class="badge">' + rel.participants.length + ' 端</span></div>' +
          '<label class="field"><span>名称</span><input type="text" ' + b({ t: 'relationship', id: rel.id, f: 'name' }) + ' value="' + esc(rel.name) + '"></label>' +
          '</div>';
        const relAttrSel = state.selectedAttr && rel.attributes.some(function (x) {
          return x.id === state.selectedAttr || (x.children || []).some(function (c) { return c.id === state.selectedAttr; });
        });
        const focusAttr = !!relAttrSel;
        if (!focusAttr) {
        html += '<div class="insp-section"><div class="insp-title">参与实体</div><div class="participant-list">' +
          (rel.participants.length ? rel.participants.map(function (p) {
            return '<div class="participant">' +
              '<div class="participant-top">' +
              '<select style="width:auto;flex:1" ' + b({ t: 'part', relId: rel.id, pid: p.id, f: 'entityId' }) + '>' +
              state.model.entities.map(function (e) {
                return '<option value="' + e.id + '"' + (e.id === p.entityId ? ' selected' : '') + '>' + esc(e.name) + '</option>';
              }).join('') +
              '</select>' +
              '<button class="icon-x" title="移除该端" data-act="del-part" data-rel-id="' + rel.id + '" data-pid="' + p.id + '">✕</button>' +
              '</div>' +
              '<div class="participant-card">' +
              '<label>最小基数<select ' + b({ t: 'part', relId: rel.id, pid: p.id, f: 'min' }) + '>' +
              '<option value="0"' + (p.min === 0 ? ' selected' : '') + '>0</option>' +
              '<option value="1"' + (p.min === 1 ? ' selected' : '') + '>1</option></select></label>' +
              '<label>最大基数<select ' + b({ t: 'part', relId: rel.id, pid: p.id, f: 'max' }) + '>' +
              '<option value="1"' + (p.max === '1' ? ' selected' : '') + '>1</option>' +
              '<option value="N"' + (p.max === 'N' ? ' selected' : '') + '>N</option></select></label>' +
              '</div></div>';
          }).join('') : '<div class="hint">还没有参与实体。</div>') +
          '</div>' +
          '<div class="insp-actions" style="margin-top:8px">' +
          '<button class="btn btn--sm ' + (state.linking === 'part' ? 'btn--on' : 'btn--primary') + '" data-act="link-part" data-rel-id="' + rel.id + '">' +
          (state.linking === 'part' ? '🔗 正在链接…点击实体' : '🔗 链接实体（添加参与端）') + '</button>' +
          '<button class="btn btn--sm" data-act="add-part" data-rel-id="' + rel.id + '">＋ 添加参与端</button>' +
          '</div>' +
          '<div class="hint">参与端 (min,max)：N 表示多；min=1 为完全参与（双线）。</div>' +
          '</div>';
        }
        if (relAttrSel) {
          html += attrDetailHTML('rel', rel.id, state.selectedAttr, false, 'relationship', rel.id);
        } else {
          html += '<div class="insp-section"><div class="insp-title">关系属性 <span class="hint">' + rel.attributes.length + '</span></div>' +
            attrListHTML(rel.attributes, 'rel', rel.id, false, 'relationship', rel.id) +
            (rel.participants.length === 2 ? '<div class="hint">两端的最大基数决定重构方式：<br>' + cardHint(rel) + '</div>' : '') +
            '</div>';
        }
        if (focusAttr) { html += '</div>'; box.innerHTML = html; box.scrollTop = 0; return; }
        html += '<div class="insp-section"><div class="insp-actions">' +
          '<button class="btn btn--sm" data-act="locate" data-ntype="relationship" data-id="' + rel.id + '">居中显示</button>' +
          '<button class="btn btn--sm btn--danger" data-act="del-node" data-ntype="relationship" data-id="' + rel.id + '">删除关系</button></div></div>';
      } else if (sel.ntype === 'isa') {
        const isa = getIsa(sel.id);
        if (!isa) { box.innerHTML = inspEmpty(); return; }
        html += '<div class="insp-section">' +
          '<div class="insp-title">ISA 泛化</div>' +
          '<label class="field"><span>父实体（超类）</span><select ' + b({ t: 'isa', id: isa.id, f: 'parentId' }) + '>' +
          '<option value="">— 未设置 —</option>' +
          state.model.entities.map(function (e) {
            return '<option value="' + e.id + '"' + (e.id === isa.parentId ? ' selected' : '') + '>' + esc(e.name) + '</option>';
          }).join('') +
          '</select></label>' +
          (function () {
            const cur = (isa.totality || 't') + ',' + (isa.exclusivity || 'e');
            const opts = [
              ['t,e', '全参与 · 排他（t, e）'],
              ['t,o', '全参与 · 重叠（t, o）'],
              ['p,e', '部分参与 · 排他（p, e）'],
              ['p,o', '部分参与 · 重叠（p, o）']
            ];
            return '<label class="field"><span>泛化类别</span><select ' + b({ t: 'isa', id: isa.id, f: 'preset' }) + '>' +
              opts.map(function (o) {
                return '<option value="' + o[0] + '"' + (o[0] === cur ? ' selected' : '') + '>' + o[1] + '</option>';
              }).join('') +
              '</select></label>' +
              '<div class="hint">约束显示在连接线上，点击也可选中。全参与＝每个父类实例必须有子类；排他＝只能属于一个子类。</div>';
          })() +
          '</div>';
        html += '<div class="insp-section"><div class="insp-title">子实体（子类） <span class="hint">' + isa.childIds.length + '</span></div>' +
          (isa.childIds.length ? isa.childIds.map(function (cid) {
            const e = getEntity(cid);
            return '<div class="kv"><span class="k">' + (e ? esc(e.name) : '（已删除）') + '</span>' +
              '<span class="v"><button class="icon-x" data-act="del-isa-child" data-isa-id="' + isa.id + '" data-child-id="' + cid + '">✕</button></span></div>';
          }).join('') : '<div class="hint">还没有子类。</div>') +
          '</div>';
        html += '<div class="insp-section"><div class="insp-actions">' +
          '<button class="btn btn--sm" data-act="locate" data-ntype="isa" data-id="' + isa.id + '">居中显示</button>' +
          '<button class="btn btn--sm btn--danger" data-act="del-isa" data-id="' + isa.id + '">删除 ISA</button></div></div>';
      }
      html += '</div>';
      box.innerHTML = html;
      box.scrollTop = state.inspScroll;
    }

    function cardHint(rel) {
      if (rel.participants.length !== 2) return '';
      const ps = rel.participants;
      const m1 = ps[0].max, m2 = ps[1].max;
      if (m1 === '1' && m2 === '1') return '两端最大值均为 1 → 1:1 关系，外键放在完全参与的一侧（并加唯一约束）。';
      if (m1 === 'N' && m2 === 'N') return '两端最大值均为 N → N:M 关系，需要新建关联表。';
      const one = ps[0].max === '1' ? ps[0] : ps[1];
      const many = one === ps[0] ? ps[1] : ps[0];
      const e1 = getEntity(one.entityId), e2 = getEntity(many.entityId);
      return '1:N 关系 → 外键放在 ' + (e1 ? e1.name : '1 端') + '（最大基数为 1 的一侧），引用 ' + (e2 ? e2.name : 'N 端') + ' 的主键。';
    }

    /* ---------- 渲染：检查与输出 ---------- */
    function renderChecks() {
      const box = $('#erTabChecks');
      const cnt = $('#erCheckCnt');
      let checks = [];
      try { checks = ERSCHEMA.checks(state.model); } catch (e) { checks = []; }
      const issues = checks.filter(function (c) { return c.level !== 'info'; });
      if (cnt) {
        cnt.textContent = issues.length;
        cnt.style.background = issues.length ? 'var(--danger-soft)' : 'var(--surface-2)';
        cnt.style.color = issues.length ? 'var(--danger)' : 'var(--muted)';
      }
      let html = '<div class="insp">';
      html += '<div class="insp-section"><div class="insp-title">模型检查 <span class="hint">' + checks.length + '</span></div>';
      if (!checks.length) {
        html += '<div class="check-ok">✓ 没有发现问题。</div>';
      } else {
        html += '<div class="check-list">' + checks.map(function (c) {
          const go = c.target ? '<button class="cgo" data-act="locate" data-ntype="' + c.target.ntype + '" data-id="' + c.target.id + '">定位</button>' : '';
          return '<div class="check-item ' + c.level + '"><span class="cdot"></span><span class="cmsg">' + esc(c.msg) + '</span>' + go + '</div>';
        }).join('') + '</div>';
      }
      html += '</div>';
      html += '<div class="insp-section"><div class="insp-title">模型概况</div>' + modelStatsHTML() + '</div>';
      html += '</div>';
      box.innerHTML = html;
    }
    function modelStatsHTML() {
      const m = state.model;
      const attrCount = m.entities.reduce(function (s, e) { return s + e.attributes.length; }, 0);
      return '<div class="kv-list">' +
        '<div class="kv"><span class="k">实体</span><span class="v">' + m.entities.length + '</span></div>' +
        '<div class="kv"><span class="k">关系</span><span class="v">' + m.relationships.length + '</span></div>' +
        '<div class="kv"><span class="k">ISA</span><span class="v">' + m.isas.length + '</span></div>' +
        '<div class="kv"><span class="k">属性</span><span class="v">' + attrCount + '</span></div>' +
        '<div class="kv"><span class="k">生成表</span><span class="v">' + (state.schema ? state.schema.tables.length : 0) + '</span></div>' +
        '</div>';
    }

    function renderSchema() {
      const box = $('#erTabSchema');
      let html = '<div class="insp">';
      if (!state.schema || !state.schema.tables.length) {
        html += '<div class="insp-empty">还没有实体；先添加实体与属性。</div>';
        box.innerHTML = html + '</div>';
        return;
      }
      html += '<div class="insp-section"><div class="insp-title">逻辑关系模式 <span class="hint">' + state.schema.tables.length + '</span></div>';
      html += state.schema.tables.map(function (t) {
        return '<div class="schema-table">' +
          '<div class="schema-table-head">' + esc(t.name) + '<span class="src">' + esc(t.sourceLabel || '') + '</span></div>' +
          t.columns.map(function (c) {
            const badges = [];
            if (c.pk) badges.push('<span class="badge badge--pk">PK</span>');
            if (c.fk) badges.push('<span class="badge badge--fk">FK</span>');
            if (c.uniq) badges.push('<span class="badge badge--uniq">UNIQUE</span>');
            if (c.nn && !c.pk) badges.push('<span class="badge">NOT NULL</span>');
            return '<div class="schema-col"><span class="cn">' + esc(c.name) + '</span>' +
              (c.fk ? '<span class="hint" style="font-size:10px">→ ' + esc(c.fk.table) + '.' + esc(c.fk.column) + '</span>' : '') +
              '<span class="badges">' + badges.join('') + '</span>' +
              '<span class="ct">' + esc(c.type) + '</span></div>';
          }).join('') +
          '</div>';
      }).join('');
      html += '</div>';
      if (state.schema.notes.length) {
        html += '<div class="insp-section"><div class="insp-title">重构步骤</div><div class="schema-notes">' +
          state.schema.notes.map(function (n, i) {
            return '<div class="schema-note"><span class="n">' + (i + 1) + '.</span><span>' + esc(n) + '</span></div>';
          }).join('') + '</div></div>';
      }
      box.innerHTML = html + '</div>';
    }

    /* ---------- 刷新 ---------- */
    function rebuildOutputs() {
      try {
        state.schema = ERSCHEMA.build(state.model);
      } catch (e) {
        state.schema = null;
        console.error(e);
      }
    }
    function refresh(opts) {
      opts = opts || {};
      normalizeSelection();
      pruneFks();
      renderNodes();
      drawEdges();
      renderOutline();
      rebuildOutputs();
      renderChecks();
      renderSchema();
      if (!opts.keepInspector) renderInspector();
      updateToolbar();
      updateLinkHint();
      hintEl.style.display = allNodes().length ? 'none' : 'block';
      saveDraft();
    }
    function updateToolbar() {
      const u = root.querySelector('[data-act="undo"]');
      const r = root.querySelector('[data-act="redo"]');
      if (u) u.disabled = !history.canUndo();
      if (r) r.disabled = !history.canRedo();
    }
    function updateLinkHint() {
      let el = root.querySelector('.er-link-toast');
      if (!state.linking) { if (el) el.remove(); canvasEl.classList.remove('linking'); return; }
      canvasEl.classList.add('linking');
      if (!el) {
        el = document.createElement('div');
        el.className = 'er-link-toast';
        canvasEl.parentNode.appendChild(el);
      }
      if (state.linkFrom) {
        const n = getNode(state.linkFrom.ntype, state.linkFrom.id);
        el.innerHTML = '<b>' + esc(nodeName(n)) + '</b>' +
          '<span>' + (state.linking === 'part'
            ? '　已选中 · 点击实体添加参与端 · Esc 取消'
            : '　已选中 · 点击另一个实体设为子类 · Esc 取消') + '</span>';
      } else {
        el.textContent = '链接模式 · 先点击起点，再点击目标 · Esc 取消';
      }
    }
    function setTab(name) {
      state.tab = name;
      root.querySelectorAll('#erTabs .tab').forEach(function (t) {
        t.classList.toggle('active', t.dataset.tab === name);
      });
      [['insp', '#erTabInsp'], ['checks', '#erTabChecks'], ['schema', '#erTabSchema']].forEach(function (p) {
        const el = root.querySelector(p[1]);
        if (el) el.classList.toggle('hidden', p[0] !== name);
      });
    }

    /* ---------- 元素小菜单：改名 / 删除 / 链接 ---------- */
    function hideNodeMenu(animate) {
      if (!menuEl || menuEl.hidden) return;
      clearTimeout(menuCloseTimer);
      if (animate === false) {
        menuEl.hidden = true;
        menuEl.classList.remove('closing');
        return;
      }
      menuEl.classList.add('closing');
      menuCloseTimer = setTimeout(function () {
        menuEl.hidden = true;
        menuEl.classList.remove('closing');
      }, 150);
    }
    function hideEdgeMenu(animate) {
      if (!edgeMenuEl || edgeMenuEl.hidden) return;
      clearTimeout(edgeCloseTimer);
      if (animate === false) {
        edgeMenuEl.hidden = true;
        edgeMenuEl.classList.remove('closing');
        return;
      }
      edgeMenuEl.classList.add('closing');
      edgeCloseTimer = setTimeout(function () {
        edgeMenuEl.hidden = true;
        edgeMenuEl.classList.remove('closing');
      }, 150);
    }
    function placeMenu(el, rect) {
      if (!el) return;
      const cr = canvasEl.getBoundingClientRect();
      let x = rect ? rect.left - cr.left : 40;
      let y = rect ? rect.bottom - cr.top + 8 : 40;
      el.hidden = false;
      el.classList.remove('closing');
      const mw = el.offsetWidth || 190, mh = el.offsetHeight || 140;
      x = util.clamp(x, 8, Math.max(8, cr.width - mw - 8));
      y = util.clamp(y, 8, Math.max(8, cr.height - mh - 8));
      el.style.left = Math.round(x) + 'px';
      el.style.top = Math.round(y) + 'px';
    }
    function showCardMenu(relId, pid, rect) {
      const rel = getRel(relId);
      if (!rel) return;
      const p = rel.participants.find(function (x) { return x.id === pid; });
      if (!p) return;
      hideNodeMenu(false);
      if (edgeMenuEl && !edgeMenuEl.hidden && edgeMenuEl.dataset.kind === 'card' && edgeMenuEl.dataset.pid === pid) { hideEdgeMenu(true); return; }
      clearTimeout(edgeCloseTimer);
      edgeMenuEl.dataset.kind = 'card';
      edgeMenuEl.dataset.relId = relId;
      edgeMenuEl.dataset.pid = pid;
      const opt = function (act, v, label, on) {
        return '<button type="button" class="edge-menu-opt' + (on ? ' on' : '') + '" data-act="' + act + '" data-v="' + v + '" data-rel-id="' + relId + '" data-pid="' + pid + '">' + label + '</button>';
      };
      edgeMenuEl.innerHTML =
        '<div class="edge-menu-head">基数 <b>(' + p.min + ',' + p.max + ')</b></div>' +
        '<div class="edge-menu-row"><span>最少</span>' + opt('set-min', '0', '0', p.min === 0) + opt('set-min', '1', '1', p.min === 1) + '</div>' +
        '<div class="edge-menu-row"><span>最多</span>' + opt('set-max', '1', '1', p.max === '1') + opt('set-max', 'N', 'N', p.max === 'N') + '</div>' +
        '<div class="edge-menu-foot"><button type="button" class="node-menu-item danger" data-act="del-part" data-rel-id="' + relId + '" data-pid="' + pid + '">删除该参与端</button></div>';
      placeMenu(edgeMenuEl, rect);
    }
    function showIsaMenu(isaId, rect) {
      const isa = getIsa(isaId);
      if (!isa) return;
      hideNodeMenu(false);
      if (edgeMenuEl && !edgeMenuEl.hidden && edgeMenuEl.dataset.kind === 'isa' && edgeMenuEl.dataset.id === isaId) { hideEdgeMenu(true); return; }
      clearTimeout(edgeCloseTimer);
      edgeMenuEl.dataset.kind = 'isa';
      edgeMenuEl.dataset.id = isaId;
      const opts = [
        ['t,e', '全参与 · 排他（t, e）'],
        ['t,o', '全参与 · 重叠（t, o）'],
        ['p,e', '部分参与 · 排他（p, e）'],
        ['p,o', '部分参与 · 重叠（p, o）']
      ];
      edgeMenuEl.innerHTML = '<div class="edge-menu-head">泛化类别 <b>(' + isa.totality + ',' + isa.exclusivity + ')</b></div>' +
        opts.map(function (o) {
          const on = isa.totality === o[0][0] && isa.exclusivity === o[0][2];
          return '<button type="button" class="node-menu-item' + (on ? ' on' : '') + '" data-act="set-isa" data-v="' + o[0] + '" data-id="' + isaId + '">' + o[1] + '</button>';
        }).join('') +
        '<div class="edge-menu-foot"><button type="button" class="node-menu-item danger" data-act="del-isa" data-id="' + isaId + '">删除泛化</button></div>';
      placeMenu(edgeMenuEl, rect);
    }
    function showNodeMenu(ntype, id) {
      if (!menuEl) return;
      if (!menuEl.hidden && menuEl.dataset.ntype === ntype && menuEl.dataset.node === id) { hideNodeMenu(true); return; }
      let n = null;
      try { n = getNode(ntype, id); } catch (e) { n = null; }
      if (!n) { hideNodeMenu(false); return; }
      hideEdgeMenu(false);
      clearTimeout(menuCloseTimer);
      menuEl.classList.remove('closing');
      menuEl.dataset.ntype = ntype;
      menuEl.dataset.node = id;
      const items = ['<button type="button" class="node-menu-item" data-act="menu-rename" data-ntype="' + ntype + '" data-id="' + id + '">改名</button>'];
      if (ntype === 'entity') items.push('<button type="button" class="node-menu-item" data-act="menu-link-isa" data-id="' + id + '">🔗 链接（ISA）</button>');
      if (ntype === 'relationship') items.push('<button type="button" class="node-menu-item" data-act="menu-link-part" data-rel-id="' + id + '">🔗 链接（参与端）</button>');
      items.push('<button type="button" class="node-menu-item danger" data-act="menu-del" data-ntype="' + ntype + '" data-id="' + id + '">删除</button>');
      menuEl.innerHTML = items.join('');
      const cr = canvasEl.getBoundingClientRect();
      let x = 40, y = 40;
      if (ntype === 'isa') {
        const lab = overlayEl.querySelector('.isa-label[data-node="' + id + '"]');
        if (lab) { const r = lab.getBoundingClientRect(); x = r.left - cr.left; y = r.bottom - cr.top + 6; }
      } else {
        const el = nodesEl.querySelector('[data-node="' + id + '"]');
        if (el) { const r = el.getBoundingClientRect(); x = r.left - cr.left; y = r.bottom - cr.top + 6; }
      }
      menuEl.hidden = false;
      const mw = menuEl.offsetWidth || 120, mh = menuEl.offsetHeight || 110;
      x = util.clamp(x, 8, Math.max(8, cr.width - mw - 8));
      y = util.clamp(y, 8, Math.max(8, cr.height - mh - 8));
      menuEl.style.left = Math.round(x) + 'px';
      menuEl.style.top = Math.round(y) + 'px';
    }
    /* ---------- 选择 ---------- */
    /* 只切换选中类，避免整块 DOM 重建造成一次闪烁 */
    function paintSelection() {
      const sel = state.selected;
      nodesEl.querySelectorAll('.er-node').forEach(function (el) {
        const on = !!sel && !sel.attrOnly && sel.ntype === el.getAttribute('data-ntype') && sel.id === el.getAttribute('data-node');
        el.classList.toggle('selected', on);
      });
      attrNodesEl.querySelectorAll('[data-attr-node]').forEach(function (el) {
        const on = !!sel && !!state.selectedAttr && el.getAttribute('data-attr-id') === state.selectedAttr && el.getAttribute('data-nid') === sel.id;
        el.classList.toggle('selected', on);
      });
      overlayEl.querySelectorAll('.isa-label').forEach(function (el) {
        const on = !!sel && sel.ntype === 'isa' && sel.id === el.getAttribute('data-node');
        el.classList.toggle('selected', on);
      });
    }
    function select(ntype, id, attrId) {
      if (ntype && id) {
        state.selected = { ntype: ntype, id: id, attrOnly: !!attrId };
        state.selectedAttr = attrId || null;
      } else {
        state.selected = null;
        state.selectedAttr = null;
      }
      paintSelection();
      renderOutline();
      renderInspector();
      updateToolbar();
    }

    /* ---------- 新建元素 ---------- */
    function uniqueFrom(list, base) {
      return util.uniqueName(base, list.map(function (x) { return x.name; }));
    }
    function addEntity(opts) {
      opts = opts || {};
      const c = viewCenter();
      const name = uniqueFrom(state.model.entities, 'Entity');
      const ent = {
        id: uid('ent'), type: 'entity', name: name,
        x: Math.round(c.x - 100 + (state.model.entities.length % 4) * 18),
        y: Math.round(c.y - 60 + (state.model.entities.length % 4) * 14),
        weak: false,
        attributes: []
      };
      state.model.entities.push(ent);
      pushNow();
      refresh();
      select('entity', ent.id);
      if (opts.focusName) focusInspectorName();
      return ent;
    }
    function addRelationship() {
      const c = viewCenter();
      const rel = {
        id: uid('rel'), type: 'relationship',
        name: uniqueFrom(state.model.relationships, 'Relationship'),
        x: Math.round(c.x - 75), y: Math.round(c.y - 54),
        participants: [], attributes: []
      };
      state.model.relationships.push(rel);
      pushNow();
      refresh();
      select('relationship', rel.id);
      return rel;
    }
    function addIsa() {
      const c = viewCenter();
      const isa = {
        id: uid('isa'), type: 'isa', name: 'ISA',
        x: Math.round(c.x - 65), y: Math.round(c.y - 48),
        parentId: null, childIds: []
      };
      state.model.isas.push(isa);
      pushNow();
      refresh();
      select('isa', isa.id);
      return isa;
    }
    function focusInspectorName() {
      setTimeout(function () {
        const list = root.querySelectorAll('#erTabInsp input[data-bind]');
        for (let i = 0; i < list.length; i += 1) {
          if (list[i].getAttribute('data-bind').indexOf('"f":"name"') >= 0) {
            list[i].focus();
            list[i].select();
            return;
          }
        }
      }, 20);
    }

    function addAttribute(ownerKind, ownerId) {
      const owner = ownerKind === 'entity' ? getEntity(ownerId) : getRel(ownerId);
      if (!owner) return;
      const names = owner.attributes.map(function (a) { return a.name; });
      const attr = newAttr(util.uniqueName('attr', names));
      owner.attributes.push(attr);
      state.selectedAttr = attr.id;
      dirty = true;
      pushNow();
      refresh();
      focusInspectorName();
    }
    /* 工具栏 / 左栏的「＋ 属性」：按当前选中推断归属 */
    function addAttributeFromSelection() {
      const sel = state.selected;
      if (!sel) { ui.toast('先选中一个实体或关系，再添加属性'); return; }
      if (sel.ntype === 'entity') { addAttribute('entity', sel.id); return; }
      if (sel.ntype === 'relationship') { addAttribute('rel', sel.id); return; }
      ui.toast('ISA 上不能直接加属性，选中它下面的实体试试', 'warn');
    }

    function deleteSelected() {
      if (!state.selected) return;
      const sel = state.selected;
      delNode(sel.ntype, sel.id);
    }
    function delNode(ntype, id) {
      const n = getNode(ntype, id);
      if (!n) return;
      const isEntity = ntype === 'entity';
      if (isEntity) {
        const related = state.model.relationships.filter(function (r) {
          return r.participants.some(function (p) { return p.entityId === id; });
        });
        const del = function () {
          state.model.entities = state.model.entities.filter(function (e) { return e.id !== id; });
          state.model.relationships.forEach(function (r) {
            r.participants = r.participants.filter(function (p) { return p.entityId !== id; });
          });
          state.model.relationships = state.model.relationships.filter(function (r) { return r.participants.length > 0; });
          state.model.isas = state.model.isas.filter(function (i) { return i.parentId !== id; });
          state.model.isas.forEach(function (i) {
            i.childIds = i.childIds.filter(function (c) { return c !== id; });
          });
          state.selected = null; state.selectedAttr = null;
          pushNow();
          refresh();
          ui.toast('已删除实体 ' + n.name, 'ok');
        };
        if (related.length) {
          ui.confirm({ title: '删除实体', message: '删除「' + n.name + '」会同时移除它在 ' + related.length + ' 个关系中的参与端。确定继续？', okLabel: '删除', danger: true }).then(function (ok) { if (ok) del(); });
        } else del();
        return;
      }
      if (ntype === 'relationship') {
        state.model.relationships = state.model.relationships.filter(function (r) { return r.id !== id; });
      } else if (ntype === 'isa') {
        state.model.isas = state.model.isas.filter(function (i) { return i.id !== id; });
      }
      state.selected = null; state.selectedAttr = null;
      pushNow();
      refresh();
    }

    function delAttribute(ownerKind, ownerId, attrId) {
      const owner = ownerKind === 'entity' ? getEntity(ownerId) : getRel(ownerId);
      if (!owner) return;
      owner.attributes = owner.attributes.filter(function (a) { return a.id !== attrId; });
      normalizeKeys(owner);
      state.selectedAttr = null;
      pushNow();
      refresh();
    }

    /* ---------- 几何位置 ---------- */
    function geoOf(id) {
      const geo = computeGeo();
      return geo[id] || { x: 0, y: 0 };
    }

    /* ---------- 自动布局 ---------- */
    function autoLayout() {
      const ents = state.model.entities;
      if (!ents.length) return;
      const geo = computeGeo();
      const byId = {};
      ents.forEach(function (e) {
        const g = geo[e.id];
        byId[e.id] = { id: e.id, w: g ? g.w : 200, h: g ? g.h : 64 };
      });

      /* 1. ISA 层级：父在上、子在下，同层横排 */
      const parentOf = {}, childrenOf = {};
      state.model.isas.forEach(function (isa) {
        if (!isa.parentId || !byId[isa.parentId]) return;
        isa.childIds.forEach(function (cid) {
          if (!byId[cid] || parentOf[cid]) return;
          parentOf[cid] = isa.parentId;
          (childrenOf[isa.parentId] = childrenOf[isa.parentId] || []).push(cid);
        });
      });
      const depth = {};
      function setDepth(id, d) {
        if (depth[id] != null) return;
        depth[id] = d;
        (childrenOf[id] || []).forEach(function (cid) { setDepth(cid, d + 1); });
      }
      const roots = ents.filter(function (e) { return !parentOf[e.id]; }).map(function (e) { return e.id; });
      roots.forEach(function (id) { setDepth(id, 0); });
      ents.forEach(function (e) { if (depth[e.id] == null) depth[e.id] = 0; });

      /* 2. 按层摆位：根节点等距横排，子类挂在父类下方居中 */
      const tight = state.model.entities.length <= 6;
      const ROW = tight ? 300 : 340;
      const PITCH = tight ? 320 : 360;
      const pos = {};
      let row0x = 0;
      roots.forEach(function (id) {
        pos[id] = { x: row0x, y: 0 };
        row0x += PITCH;
      });
      const allDepths = Object.keys(depth).map(function (k) { return depth[k]; });
      const maxDepth = allDepths.length ? Math.max.apply(null, allDepths) : 0;
      for (let d = 1; d <= maxDepth; d++) {
        ents.forEach(function (e) {
          if (depth[e.id] !== d || pos[e.id]) return;
          const par = parentOf[e.id] ? pos[parentOf[e.id]] : null;
          const base = par ? par.x : row0x + PITCH;
          const sibs = (childrenOf[parentOf[e.id]] || []).filter(function (cid) { return depth[cid] === d; });
          const idx = Math.max(0, sibs.indexOf(e.id));
          const span = (sibs.length - 1) * PITCH * 0.9;
          pos[e.id] = { x: base + idx * PITCH * 0.9 - span / 2, y: d * ROW };
        });
      }
      ents.forEach(function (e) { if (!pos[e.id]) pos[e.id] = { x: row0x, y: depth[e.id] * ROW }; });

      /* 3. 盒子模型：把属性环与名字一起算进包围盒，先做一次腾挪 */
      const boxes = ents.map(function (e) {
        const b = byId[e.id];
        const p0 = pos[e.id];
        return { id: e.id, w: b.w, h: b.h, hw: b.w / 2 + 92, hh: b.h / 2 + 58, cx: p0.x + b.w / 2, cy: p0.y + b.h / 2 };
      });
      const boxOf = {};
      boxes.forEach(function (b) { boxOf[b.id] = b; });
      for (let pass = 0; pass < 200; pass++) {
        let moved = false;
        for (let a = 0; a < boxes.length; a++) {
          for (let b2 = a + 1; b2 < boxes.length; b2++) {
            const A = boxes[a], B = boxes[b2];
            const dx = B.cx - A.cx, dy = B.cy - A.cy;
            const ox = A.hw + B.hw + 18 - Math.abs(dx);
            const oy = A.hh + B.hh + 18 - Math.abs(dy);
            if (ox <= 0 || oy <= 0) continue;
            moved = true;
            if (ox < oy) {
              const sg = dx >= 0 ? 1 : -1;
              A.cx -= sg * ox / 2; B.cx += sg * ox / 2;
            } else {
              const sg = dy >= 0 ? 1 : -1;
              A.cy -= sg * oy / 2; B.cy += sg * oy / 2;
            }
          }
        }
        if (!moved) break;
      }

      /* 4. 关系放在参与实体重心；候选位置避开实体、其它关系，并惩罚连线穿过其它元素 */
      const rw = 160 / 2 + 78, rh = 92 / 2 + 64;
      const taken = boxes.map(function (b) {
        return { cx: b.cx, cy: b.cy, hw: b.w / 2 + 64, hh: b.h / 2 + 50 };
      });
      function segHits(x1, y1, x2, y2, cx, cy, hw, hh) {
        for (let i = 1; i < 30; i++) {
          const t = i / 30;
          const px = x1 + (x2 - x1) * t, py = y1 + (y2 - y1) * t;
          if (Math.abs(px - cx) < hw && Math.abs(py - cy) < hh) return true;
        }
        return false;
      }
      function score(cx, cy, ox0, oy0, ids) {
        let sc = 0;
        taken.forEach(function (b) {
          const ox = b.hw + rw - Math.abs(cx - b.cx);
          const oy = b.hh + rh - Math.abs(cy - b.cy);
          if (ox > 0 && oy > 0) sc += ox * oy * 2.2;
        });
        sc += Math.hypot(cx - ox0, cy - oy0) * 70;
        ids.forEach(function (id) {
          const target = boxOf[id];
          if (!target) return;
          boxes.forEach(function (o) {
            if (o.id === id) return;
            if (segHits(cx, cy, target.cx, target.cy, o.cx, o.cy, o.w / 2 + 30, o.h / 2 + 26)) sc += 5200;
          });
          taken.forEach(function (tb) {
            if (segHits(cx, cy, target.cx, target.cy, tb.cx, tb.cy, tb.hw + 10, tb.hh + 10)) sc += 1200;
          });
        });
        return sc;
      }
      const relBoxes = [];
      state.model.relationships.forEach(function (rel) {
        const ids = rel.participants.map(function (p) { return p.entityId; }).filter(function (id) { return boxOf[id]; });
        let cx = 0, cy = 0;
        if (ids.length) {
          ids.forEach(function (id) { cx += boxOf[id].cx; cy += boxOf[id].cy; });
          cx /= ids.length; cy /= ids.length;
        } else { cx = 140; cy = 90; }
        let best = null;
        const steps = tight ? [0, 1, -1, 2, -2] : [0, 1, -1, 2, -2, 3, -3];
        steps.forEach(function (mx) {
          steps.forEach(function (my) {
            const px = cx + mx * (tight ? 96 : 116), py = cy + my * (tight ? 84 : 102);
            const sc = score(px, py, cx, cy, ids);
            if (!best || sc < best.s - 0.5) best = { x: px, y: py, s: sc };
          });
        });
        rel.x = Math.round(best.x - 160 / 2);
        rel.y = Math.round(best.y - 92 / 2);
        taken.push({ cx: best.x, cy: best.y, hw: rw, hh: rh });
        relBoxes.push({ rel: rel, cx: best.x, cy: best.y });
      });

      /* 4b. 关系盒子之间、关系与实体之间再推一轮，保证互不重叠 */
      for (let pass = 0; pass < 120; pass++) {
        let moved = false;
        for (let i = 0; i < relBoxes.length; i++) {
          for (let j = i + 1; j < relBoxes.length; j++) {
            const A = relBoxes[i], B = relBoxes[j];
            const dx = B.cx - A.cx, dy = B.cy - A.cy;
            const ox = rw * 2 + 30 - Math.abs(dx), oy = rh * 2 + 30 - Math.abs(dy);
            if (ox <= 0 || oy <= 0) continue;
            moved = true;
            if (ox < oy) { const sg = dx >= 0 ? 1 : -1; A.cx -= sg * ox / 2; B.cx += sg * ox / 2; }
            else { const sg = dy >= 0 ? 1 : -1; A.cy -= sg * oy / 2; B.cy += sg * oy / 2; }
          }
        }
        relBoxes.forEach(function (R) {
          boxes.forEach(function (B) {
            const dx = R.cx - B.cx, dy = R.cy - B.cy;
            const ox = rw + B.hw + 16 - Math.abs(dx), oy = rh + B.hh + 12 - Math.abs(dy);
            if (ox <= 0 || oy <= 0) return;
            moved = true;
            if (ox < oy) { const sg = dx >= 0 ? 1 : -1; R.cx += sg * ox; }
            else { const sg = dy >= 0 ? 1 : -1; R.cy += sg * oy; }
          });
        });
        if (!moved) break;
      }
      function overlapAt(cx, cy) {
        let hit = 0;
        boxes.forEach(function (B) {
          if (Math.abs(cx - B.cx) < rw + B.w / 2 + 30 && Math.abs(cy - B.cy) < rh + B.h / 2 + 24) hit++;
        });
        relBoxes.forEach(function (O) {
          if (O.cx === cx && O.cy === cy) return;
          if (Math.abs(cx - O.cx) < rw * 2 + 20 && Math.abs(cy - O.cy) < rh * 2 + 20) hit++;
        });
        return hit;
      }
      function crossesAt(rel, cx, cy) {
        let n = 0;
        rel.participants.forEach(function (pp) {
          const target = boxOf[pp.entityId];
          if (!target) return;
          boxes.forEach(function (B) {
            if (B.id === pp.entityId) return;
            if (segHits(cx, cy, target.cx, target.cy, B.cx, B.cy, B.w / 2 + 24, B.h / 2 + 20)) n++;
          });
          relBoxes.forEach(function (O) {
            if (O.rel === rel) return;
            if (segHits(cx, cy, target.cx, target.cy, O.cx, O.cy, rw, rh)) n++;
          });
        });
        return n;
      }
      for (let pass = 0; pass < 6; pass++) {
        let improved = false;
        relBoxes.forEach(function (R) {
          const base = crossesAt(R.rel, R.cx, R.cy);
          if (!base) return;
          let best = { x: R.cx, y: R.cy, n: base };
          [[70, 0], [-70, 0], [0, 70], [0, -70], [100, 100], [-100, 100], [100, -100], [-100, -100], [150, 0], [-150, 0], [0, 150], [0, -150]].forEach(function (d) {
            const nx = R.cx + d[0], ny = R.cy + d[1];
            if (overlapAt(nx, ny)) return;
            const n = crossesAt(R.rel, nx, ny);
            if (n < best.n) best = { x: nx, y: ny, n: n };
          });
          if (best.n < base) { R.cx = best.x; R.cy = best.y; improved = true; }
        });
        if (!improved) break;
      }
      relBoxes.forEach(function (R) {
        R.rel.x = Math.round(R.cx - 160 / 2);
        R.rel.y = Math.round(R.cy - 92 / 2);
      });
      /* 5. 回写坐标，属性回到环上 */
      boxes.forEach(function (b) {
        const e = getEntity(b.id);
        if (!e) return;
        e.x = Math.round(b.cx - b.w / 2);
        e.y = Math.round(b.cy - b.h / 2);
      });
      function resetAttrPos(list) {
        (list || []).forEach(function (a) { a.x = null; a.y = null; resetAttrPos(a.children); });
      }
      state.model.entities.forEach(function (e) { resetAttrPos(e.attributes); });
      state.model.relationships.forEach(function (r) { resetAttrPos(r.attributes); });
      /* 4c. 依据最终画出的连线做两轮避让：把被线穿过的节点挪开 */
      function worldBoxes() {
        const geo = computeGeo();
        const items = [];
        state.model.entities.forEach(function (e) {
          const g = geo[e.id];
          if (g) items.push({ kind: 'entity', id: e.id, cx: g.x, cy: g.y, hw: g.w / 2 + 42, hh: g.h / 2 + 32, halfW: g.w / 2, halfH: g.h / 2 });
        });
        state.model.relationships.forEach(function (r) {
          const g = geo[r.id];
          if (g) items.push({ kind: 'relationship', id: r.id, cx: g.x, cy: g.y, hw: 80 + 34, hh: 46 + 26, halfW: 80, halfH: 46 });
        });
        return items;
      }
      function edgeLines() {
        return Array.prototype.slice.call(edgesEl.querySelectorAll('line.e-line')).filter(function (l) {
          const c = l.getAttribute('class') || '';
          return c.indexOf('attr') < 0 && c.indexOf('keychain') < 0;
        }).map(function (l) {
          return { x1: +l.getAttribute('x1'), y1: +l.getAttribute('y1'), x2: +l.getAttribute('x2'), y2: +l.getAttribute('y2') };
        });
      }
      function hitCount(box, lines) {
        let n = 0;
        lines.forEach(function (L) {
          for (let k = 1; k < 20; k++) {
            const t = k / 20;
            const px = L.x1 + (L.x2 - L.x1) * t, py = L.y1 + (L.y2 - L.y1) * t;
            if (Math.abs(px - box.cx) < box.hw && Math.abs(py - box.cy) < box.hh) { n++; break; }
          }
        });
        return n;
      }
      function overlapsAny(box, items) {
        for (let i = 0; i < items.length; i++) {
          const B = items[i];
          if (B === box) continue;
          if (B.kind === box.kind && B.id === box.id) continue;
          if (Math.abs(box.cx - B.cx) < box.hw + B.hw + 12 && Math.abs(box.cy - B.cy) < box.hh + B.hh + 10) return true;
        }
        return false;
      }
      function reduceCrossings() {
        let items = worldBoxes();
        let lines = edgeLines();
        if (!lines.length) return;
        const deltas = [[48, 0], [-48, 0], [0, 48], [0, -48], [72, 64], [-72, 64], [72, -64], [-72, -64], [110, 0], [-110, 0], [0, 110], [0, -110]];
        for (let round = 0; round < 6; round++) {
          let changed = false;
          items = worldBoxes();
          lines = edgeLines();
          items.forEach(function (box) {
            /* 只微调关系形状：移动实体会把 ISA 总线拉成巨型方框 */
            if (box.kind !== 'relationship') return;
            if (!hitCount(box, lines)) return;
            let best = null;
            deltas.forEach(function (d) {
              const probe = { cx: box.cx + d[0], cy: box.cy + d[1], hw: box.hw, hh: box.hh, kind: box.kind, id: box.id };
              if (overlapsAny(probe, items)) return;
              const n = hitCount(probe, lines);
              if (!best || n < best.n) best = { n: n, dx: d[0], dy: d[1] };
            });
            if (!best || best.n >= hitCount(box, lines)) return;
            if (box.kind === 'entity') {
              const e = getEntity(box.id);
              if (e) { e.x = Math.round(e.x + best.dx); e.y = Math.round(e.y + best.dy); changed = true; }
            } else {
              const r = getRel(box.id);
              if (r) { r.x = Math.round(r.x + best.dx); r.y = Math.round(r.y + best.dy); changed = true; }
            }
          });
          if (!changed) break;
          refresh();
          lines = edgeLines();
        }
      }
      refresh();
      reduceCrossings();
      fitView(0.42);
      setTimeout(function () { fitView(0.42); }, 30);
      ui.toast('已重新排布', 'ok');
    }

    /* ---------- 保存 / 打开 / 导入导出 ---------- */
    function saveModel() {
      ui.prompt({ title: '保存模型', label: '模型名称', value: state.model.name, hint: '保存在浏览器中，可随时从「打开」加载。' }).then(function (name) {
        if (!name) return;
        state.model.name = name;
        const ok = store.save(STORE_KIND, name, state.model);
        if (ok) { ui.toast('已保存：' + name, 'ok'); refresh(); }
        else ui.toast('保存失败（localStorage 不可用）', 'err');
      });
    }
    function openModal() {
      const list = store.list(STORE_KIND);
      const body = list.length ? '<div class="store-list">' + list.map(function (rec) {
        return '<div class="store-item"><div><div class="si-name">' + esc(rec.name) + '</div>' +
          '<div class="si-meta">' + util.fmtAgo(rec.savedAt) + '</div></div>' +
          '<div class="si-actions"><button class="btn btn--sm btn--primary" data-open="' + esc(rec.name) + '">打开</button>' +
          '<button class="btn btn--sm btn--danger" data-del="' + esc(rec.name) + '">删除</button></div></div>';
      }).join('') + '</div>' : '<div class="store-empty">还没有保存过模型。先点击工具栏「保存」。</div>';
      const m = ui.modal({
        title: '打开已保存的模型', body: body,
        actions: [{ label: '关闭', onClick: function (close) { close(); } }],
        wide: true
      });
      m.querySelectorAll('[data-open]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          const rec = store.load(STORE_KIND, btn.dataset.open);
          if (!rec) { ui.toast('读取失败', 'err'); return; }
          state.model = normalize(rec.model);
          history.reset();
          state.selected = null; state.selectedAttr = null;
          refresh();
          setTimeout(fitView, 30);
          ui.toast('已打开：' + rec.name, 'ok');
          const back = document.querySelector('.modal-backdrop');
          if (back) back.remove();
        });
      });
      m.querySelectorAll('[data-del]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          store.remove(STORE_KIND, btn.dataset.del);
          ui.toast('已删除', 'ok');
          btn.closest('.store-item').remove();
        });
      });
    }
    function exportJson() {
      const name = (state.model.name || 'er-model').replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, '-');
      io.download(name + '.json', JSON.stringify(state.model, null, 2), 'application/json');
      ui.toast('已导出 JSON', 'ok');
    }
    function importJson() {
      io.pickFile('.json,.er,application/json').then(function (f) {
        if (!f) return;
        try {
          var raw = JSON.parse(f.text);
          state.model = normalize(adaptModel(raw));
          if (/^Imported/.test(String(state.model.name))) {
            state.model.name = f.name.replace(/\.(json|er)$/i, '');
          }
          history.reset();
          state.selected = null; state.selectedAttr = null;
          refresh();
          setTimeout(fitView, 30);
          ui.toast('已导入：' + f.name, 'ok');
        } catch (e) {
          ui.toast('导入失败：不是有效的 JSON', 'err');
        }
      });
    }
    function newModel() {
      const go = function () {
        state.model = emptyModel();
        history.reset();
        state.selected = null; state.selectedAttr = null;
        state.linkFrom = null; state.linking = null;
        state.view = { x: 40, y: 30, s: 1 };
        applyView();
        refresh();
      };
      if (allNodes().length) ui.confirm({ title: '新建模型', message: '当前模型尚未保存的修改会丢失。确定新建空白模型？', okLabel: '新建', danger: true }).then(function (ok) { if (ok) go(); });
      else go();
    }

    /* ---------- 画布交互 ---------- */
    function pointerDown(e) {
      if (e.button === 2) return;
      if (menuEl && !menuEl.hidden && !e.target.closest('#erMenu, [data-node], [data-attr-node], .isa-label')) hideNodeMenu(true);
      if (edgeMenuEl && !edgeMenuEl.hidden && !e.target.closest('#erEdgeMenu, [data-act="edit-card"], .isa-label')) hideEdgeMenu(true);
      const isaLabel = e.target.closest('.isa-label');
      if (isaLabel) {
        select('isa', isaLabel.dataset.node, null);
        showIsaMenu(isaLabel.dataset.node, isaLabel.getBoundingClientRect());
        e.preventDefault();
        return;
      }
      const ctrlEl = e.target.closest('[data-act], button, a, input, select, textarea');
      if (ctrlEl) return; // 让按钮 / 输入控件自己拿到 click
      const attrEl = e.target.closest('[data-attr-node]');
      const nodeEl = e.target.closest('[data-node]');
      if (state.linking && e.button === 0) {
        if (nodeEl) resolveLink(nodeEl.dataset.ntype, nodeEl.dataset.node);
        else if (attrEl) ui.toast('请点击实体或关系本身来建立链接', 'warn');
        else { cancelLink(); ui.toast('已取消链接'); }
        return;
      }
      if (attrEl) {
        if (e.button !== 0) return;
        const attrId = attrEl.dataset.attrId;
        const a = findAttrModel(attrId);
        if (!a) return;
        const m = /translate\((-?[\d.]+)px,\s*(-?[\d.]+)px\)/.exec(attrEl.style.transform || '');
        const half = attrEl.getAttribute('data-owner-kind') === 'attr' ? 13 : 17;
        const cx = m ? parseFloat(m[1]) + half : 0;
        const cy = m ? parseFloat(m[2]) + half : 0;
        const ownKind = attrEl.getAttribute('data-owner-kind');
        const ownId = attrEl.getAttribute('data-owner-id');
        const anchor = ownerCentre(ownKind, ownId);
        a.ox = anchor.x; a.oy = anchor.y;
        attrDrag = {
          el: attrEl, attrId: attrId, sx: e.clientX, sy: e.clientY,
          ox: cx, oy: cy, ax: anchor.x, ay: anchor.y, moved: false,
          nk: attrEl.dataset.nk, nid: attrEl.dataset.nid
        };
        return;
      }
      if (e.button === 1 || (e.button === 0 && !nodeEl)) {
        pan = { sx: e.clientX, sy: e.clientY, vx: state.view.x, vy: state.view.y, moved: false };
        canvasEl.classList.add('panning');
        e.preventDefault();
        return;
      }
      if (!nodeEl) return;
      const id = nodeEl.dataset.node;
      const n = getNode(nodeEl.dataset.ntype, id);
      if (!n) return;
      drag = {
        el: nodeEl, ntype: nodeEl.dataset.ntype, id: id,
        sx: e.clientX, sy: e.clientY, ox: n.x, oy: n.y, moved: false
      };
    }
    function pointerMove(e) {
      if (attrDrag) {
        const dx = (e.clientX - attrDrag.sx) / state.view.s;
        const dy = (e.clientY - attrDrag.sy) / state.view.s;
        if (Math.abs(e.clientX - attrDrag.sx) > 3 || Math.abs(e.clientY - attrDrag.sy) > 3) attrDrag.moved = true;
        const a = findAttrModel(attrDrag.attrId);
        if (!a) return;
        const cx = Math.round(attrDrag.ox + dx), cy = Math.round(attrDrag.oy + dy);
        a.x = cx; a.y = cy; a.ox = attrDrag.ax; a.oy = attrDrag.ay;
        const half = attrDrag.el.getAttribute('data-owner-kind') === 'attr' ? 13 : 17;
        attrDrag.el.style.transform = 'translate(' + (cx - half) + 'px,' + (cy - half) + 'px)';
        drawEdges();
        return;
      }
      if (drag) {
        const dx = (e.clientX - drag.sx) / state.view.s;
        const dy = (e.clientY - drag.sy) / state.view.s;
        if (Math.abs(e.clientX - drag.sx) > 3 || Math.abs(e.clientY - drag.sy) > 3) drag.moved = true;
        const n = getNode(drag.ntype, drag.id);
        if (!n) return;
        n.x = Math.round(drag.ox + dx);
        n.y = Math.round(drag.oy + dy);
        drag.el.style.transform = 'translate(' + n.x + 'px,' + n.y + 'px)';
        if (!pendingFrame) {
          pendingFrame = true;
          requestAnimationFrame(function () { pendingFrame = false; layoutAttrs(); drawEdges(); });
        }
        return;
      }
      if (pan) {
        state.view.x = pan.vx + (e.clientX - pan.sx);
        state.view.y = pan.vy + (e.clientY - pan.sy);
        pan.moved = true;
        applyView();
      }
    }
    function pointerUp(e) {
      if (attrDrag) {
        const d = attrDrag;
        attrDrag = null;
        dirty = true;
        select(d.nk, d.nid, d.attrId);
        if (d.moved) pushNow();
        drawEdges();
      }
      if (drag) {
        const d = drag;
        drag = null;
        if (d.moved) {
          dirty = true;
          pushNow();
          renderOutline();
          rebuildOutputs(); renderChecks(); renderSchema();
          drawEdges();
        } else {
          select(d.ntype, d.id, null);
          showNodeMenu(d.ntype, d.id);
        }
      }
      if (pan) {
        const wasPan = pan.moved;
        pan = null;
        canvasEl.classList.remove('panning');
        if (!wasPan) {
          hideNodeMenu(true);
          hideEdgeMenu(true);
          select(null);
        }
      }
    }
    function inlineRename(span, old, apply) {
      if (!span) return;
      span.setAttribute('contenteditable', 'true');
      span.focus();
      const r = document.createRange();
      r.selectNodeContents(span);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(r);
      let finished = false;
      const finish = function (commit) {
        if (finished) return;
        finished = true;
        span.removeAttribute('contenteditable');
        const v = span.textContent.trim();
        if (commit && v && v !== old) {
          apply(v);
          dirty = true;
          pushNow();
          refresh();
        } else {
          span.textContent = old;
        }
      };
      span.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter') { ev.preventDefault(); span.blur(); }
        else if (ev.key === 'Escape') { ev.preventDefault(); finish(false); }
        ev.stopPropagation();
      });
      span.addEventListener('blur', function () { finish(true); }, { once: true });
    }
    function dblClick(e) {
      const attrEl = e.target.closest('[data-attr-node]');
      if (attrEl) {
        const a = findAttrModel(attrEl.dataset.attrId);
        if (!a) return;
        inlineRename(attrEl.querySelector('.er-attr-name'), a.name, function (v) { a.name = v; });
        return;
      }
      const span = e.target.closest('[data-edit-name]');
      if (!span) return;
      const nodeEl = e.target.closest('[data-node]');
      if (!nodeEl) return;
      const n = getNode(nodeEl.dataset.ntype, nodeEl.dataset.node);
      if (!n) return;
      span.textContent = n.name;
      inlineRename(span, n.name, function (v) { n.name = v; });
    }
    function wheel(e) {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      zoomAt(factor, e.clientX, e.clientY);
    }

    /* ---------- 绑定 ---------- */
    function bindInputs(e) {
      const t = e.target.closest('[data-bind]');
      if (!t) return;
      let spec;
      try { spec = JSON.parse(t.getAttribute('data-bind')); } catch (err) { return; }
      let value;
      if (t.type === 'checkbox') value = t.checked;
      else value = t.value;
      applyBind(spec, value, t);
    }
    function applyBind(spec, value, el) {
      const model = state.model;
      if (spec.t === 'entity') {
        const ent = getEntity(spec.id);
        if (!ent) return;
        if (spec.f === 'weak') ent.weak = !!value;
        else ent.name = String(value);
      } else if (spec.t === 'relationship') {
        const rel = getRel(spec.id);
        if (!rel) return;
        rel.name = String(value);
      } else if (spec.t === 'attr') {
        const owner = spec.owner === 'entity' ? getEntity(spec.ownerId) : getRel(spec.ownerId);
        if (!owner) return;
        const a = owner.attributes.find(function (x) { return x.id === spec.attrId; });
        if (!a) return;
        if (spec.f === 'key') {
          if (value && a.children && a.children.length) {
            if (typeof ui !== 'undefined') ui.toast('有子属性的属性不能作为主键', 'warn');
            return;
          }
          a.key = !!value;
          normalizeKeys(owner);
        } else if (spec.f === 'multi' || spec.f === 'composite') a[spec.f] = !!value;
        else if (spec.f === 'type') a.type = String(value);
        else a.name = String(value);
      } else if (spec.t === 'child') {
        const owner = spec.owner === 'entity' ? getEntity(spec.ownerId) : getRel(spec.ownerId);
        if (!owner) return;
        const a = owner.attributes.find(function (x) { return x.id === spec.attrId; });
        if (!a) return;
        const c = a.children.find(function (x) { return x.id === spec.childId; });
        if (!c) return;
        if (spec.f === 'key') {
          const other = owner.attributes.some(function (x) { return x.key && x.id !== a.id; });
          if (value && !other) {
            if (typeof ui !== 'undefined') ui.toast('先给这个实体设一个主键，再给子属性设主键', 'warn');
            return;
          }
          c.key = !!value;
          normalizeKeys(owner);
        } else if (spec.f === 'type') c.type = String(value);
        else c.name = String(value);
      } else if (spec.t === 'part') {
        const rel = getRel(spec.relId);
        if (!rel) return;
        const p = rel.participants.find(function (x) { return x.id === spec.pid; });
        if (!p) return;
        if (spec.f === 'min') p.min = String(value) === '1' ? 1 : 0;
        else if (spec.f === 'max') p.max = String(value) === 'N' ? 'N' : '1';
        else if (spec.f === 'entityId') p.entityId = String(value);
        else p.role = String(value);
      } else if (spec.t === 'isa') {
        const isa = getIsa(spec.id);
        if (!isa) return;
        if (spec.f === 'preset') {
          const parts = String(value).split(',');
          isa.totality = parts[0] === 'p' ? 'p' : 't';
          isa.exclusivity = parts[1] === 'o' ? 'o' : 'e';
        } else if (spec.f === 'totality') isa.totality = String(value) === 'p' ? 'p' : 't';
        else if (spec.f === 'exclusivity') isa.exclusivity = String(value) === 'o' ? 'o' : 'e';
        else isa.parentId = value ? String(value) : null;
      }
      schedulePush();
      refresh({ keepInspector: true });
    }

    function command(act, btn) {
      const d = btn ? btn.dataset : {};
      switch (act) {
        case 'new': newModel(); break;
        case 'sample':
          state.model = sampleModel();
          history.reset();
          state.selected = null; state.selectedAttr = null;
          autoLayout();
          setTimeout(function () { fitView(0.42); }, 80);
          setTimeout(function () { fitView(0.42); }, 240);
          ui.toast('已载入示例：选课系统', 'ok');
          break;
        case 'save': saveModel(); break;
        case 'open': openModal(); break;
        case 'export-json': exportJson(); break;
        case 'import-json': importJson(); break;
        case 'undo': undo(); break;
        case 'redo': redo(); break;
        case 'add-entity': addEntity({ focusName: true }); break;
        case 'add-rel': addRelationship(); break;
        case 'link-isa': {
          const ent = getEntity(d.id);
          if (!ent) break;
          if (state.linking === 'isa' && state.linkFrom && state.linkFrom.id === ent.id) { cancelLink(); ui.toast('已取消链接'); break; }
          startLink('isa', ent);
          break;
        }
        case 'link-part': {
          const rel = getRel(d.relId);
          if (!rel) break;
          if (state.linking === 'part' && state.linkFrom && state.linkFrom.id === rel.id) { cancelLink(); ui.toast('已取消链接'); break; }
          startLink('part', rel);
          break;
        }
        case 'attr-close':
          state.selectedAttr = null;
          renderInspector();
          drawEdges();
          break;
        case 'sel-child':
          select(btn.dataset.nk || 'entity', btn.dataset.nid, btn.dataset.childId);
          break;
        case 'sel-attr':
          select(d.nk, d.nid, d.attrId);
          break;
        case 'edit-card':
          showCardMenu(d.relId, d.pid, btn.getBoundingClientRect());
          break;
        case 'set-min':
        case 'set-max': {
          const rel = getRel(d.relId);
          if (!rel) break;
          const part = rel.participants.find(function (x) { return x.id === d.pid; });
          if (!part) break;
          if (act === 'set-min') part.min = d.v === '1' ? 1 : 0;
          else part.max = d.v === 'N' ? 'N' : '1';
          pushNow();
          refresh({ keepInspector: true });
          hideEdgeMenu(false);
          (function (relId, pid) {
            setTimeout(function () {
              var lbl = canvasEl.querySelector('[data-act="edit-card"][data-rel-id="' + relId + '"][data-pid="' + pid + '"]');
              if (lbl) showCardMenu(relId, pid, lbl.getBoundingClientRect());
            }, 0);
          })(d.relId, d.pid);
          break;
        }
        case 'set-isa': {
          const isa = getIsa(d.id);
          if (!isa) break;
          const bits = String(d.v).split(',');
          isa.totality = bits[0] === 'p' ? 'p' : 't';
          isa.exclusivity = bits[1] === 'o' ? 'o' : 'e';
          pushNow();
          refresh({ keepInspector: true });
          hideEdgeMenu(false);
          break;
        }
        case 'unlink-isa': {
          const ent = getEntity(d.id);
          if (!ent) break;
          state.model.isas.forEach(function (i) { i.childIds = i.childIds.filter(function (c) { return c !== ent.id; }); });
          state.model.isas = state.model.isas.filter(function (i) { return i.childIds.length || i.parentId; });
          pushNow(); refresh(); ui.toast('已解除继承关系');
          break;
        }
        case 'attr-card': {
          const owner = d.owner === 'entity' ? getEntity(d.ownerId) : getRel(d.ownerId);
          const a = owner && owner.attributes.find(function (x) { return x.id === d.attrId; });
          if (!a) break;
          a.nocard = btn.value === 'none';
          a.multi = btn.value === 'N';
          pushNow(); refresh();
          ui.toast(a.nocard ? '已设为普通属性（不显示基数）' : (a.multi ? '已设为多值属性（cardinality N）' : '已设为单值属性（cardinality 1）'));
          break;
        }
        case 'layout': autoLayout(); break;
        case 'zoom-in': zoomAt(1.15); break;
        case 'zoom-out': zoomAt(1 / 1.15); break;
        case 'zoom-fit': fitView(); break;
        case 'locate':
          select(d.ntype, d.id);
          centerNode(d.ntype, d.id);
          break;
        case 'del-node': select(d.ntype, d.id); delNode(d.ntype, d.id); break;
        case 'add-attr': addAttribute(d.kind === 'rel' ? 'rel' : 'entity', d.id); break;
        case 'add-attr-sel': addAttributeFromSelection(); break;
        case 'add-fk': {
          const ent = getEntity(d.entityId);
          if (!ent) break;
          const pick = root.querySelector('[data-act="fk-pick"][data-entity-id="' + ent.id + '"]');
          if (!pick || !pick.value) { ui.toast('没有可用的外键来源（另一端实体需要主键）', 'warn'); break; }
          const parts = pick.value.split('|');
          const refEntityId = parts[0], refAttrId = parts[1], relId = parts[2];
          const target = getEntity(refEntityId);
          const ref = findAttrById(target, refAttrId);
          if (!target || !ref) break;
          if (!Array.isArray(ent.fks)) ent.fks = [];
          if (ent.fks.some(function (f) { return f.refEntityId === refEntityId && f.refAttrId === refAttrId && f.relId === relId; })) {
            ui.toast('这个外键已经存在', 'warn'); break;
          }
          ent.fks.push({ id: uid('fk'), refEntityId: refEntityId, refAttrId: refAttrId, relId: relId });
          pushNow(); refresh();
          ui.toast('已添加外键 ' + ref.name + ' → ' + target.name, 'ok');
          break;
        }
        case 'del-fk': {
          const ent = getEntity(d.entityId);
          if (!ent) break;
          ent.fks = (ent.fks || []).filter(function (f) { return f.id !== d.fkId; });
          pushNow(); refresh();
          ui.toast('已删除外键', 'ok');
          break;
        }
        case 'menu-rename': {
          hideNodeMenu();
          const ntype = d.ntype, nid = d.id;
          if (ntype === 'isa') {
            const isa = getIsa(nid);
            if (!isa) break;
            ui.prompt({ title: '重命名泛化', label: '名称', value: isa.name }).then(function (v) {
              if (!v) return;
              isa.name = v;
              pushNow(); refresh();
            });
            break;
          }
          const sel = ntype === 'entity' ? '.er-entity[data-node="' + nid + '"] .er-entity-name' : '.er-rel[data-node="' + nid + '"] .er-rel-title';
          const span = nodesEl.querySelector(sel);
          const node = getNode(ntype, nid);
          if (!span || !node) break;
          inlineRename(span, node.name, function (v) {
            node.name = v;
            pushNow(); refresh();
          });
          break;
        }
        case 'menu-del': hideNodeMenu(); delNode(d.ntype, d.id); break;
        case 'menu-link-isa': {
          const ent = getEntity(d.id);
          if (!ent) break;
          startLink('isa', ent);
          break;
        }
        case 'menu-link-part': {
          const rel = getRel(d.relId);
          if (!rel) break;
          startLink('part', rel);
          break;
        }
        case 'del-attr': delAttribute(d.owner, d.ownerId, d.attrId); break;
        case 'add-child': addChild(d.owner, d.ownerId, d.attrId); break;
        case 'del-child': delChild(d.owner, d.ownerId, d.attrId, d.childId); break;
        case 'add-part': addParticipant(d.relId); break;
        case 'del-part': hideEdgeMenu(false); delParticipant(d.relId, d.pid); break;
        case 'del-isa-child': delIsaChild(d.isaId, d.childId); break;
        case 'del-isa': removeIsa(d.id || d.isaId); break;
        default: break;
      }
    }
    function addChild(ownerKind, ownerId, attrId) {
      const owner = ownerKind === 'entity' ? getEntity(ownerId) : getRel(ownerId);
      if (!owner) return;
      const a = owner.attributes.find(function (x) { return x.id === attrId; });
      if (!a) return;
      a.children.push({ id: uid('c'), name: util.uniqueName('child', a.children.map(function (c) { return c.name; })), type: 'AUTO' });
      if (a.key) { a.key = false; ui.toast('属性有了子属性，已取消它的主键标记', 'warn'); }
      a.composite = true; // 属性上再加属性 → 自动复合
      state.selectedAttr = a.id;
      dirty = true; pushNow(); refresh();
      ui.toast('已添加子属性，「' + a.name + '」现在是复合属性');
    }
    function delChild(ownerKind, ownerId, attrId, childId) {
      const owner = ownerKind === 'entity' ? getEntity(ownerId) : getRel(ownerId);
      if (!owner) return;
      const a = owner.attributes.find(function (x) { return x.id === attrId; });
      if (!a) return;
      a.children = a.children.filter(function (c) { return c.id !== childId; });
      normalizeKeys(owner);
      a.composite = a.children.length > 0;
      state.selectedAttr = a.id;
      dirty = true; pushNow(); refresh();
    }
    function addParticipant(relId) {
      const rel = getRel(relId);
      if (!rel) return;
      const used = rel.participants.map(function (p) { return p.entityId; });
      const free = state.model.entities.find(function (e) { return used.indexOf(e.id) < 0; });
      if (!free) { ui.toast('没有可添加的实体了', 'warn'); return; }
      rel.participants.push({ id: uid('p'), entityId: free.id, min: 0, max: 'N', role: '' });
      dirty = true; pushNow(); refresh();
    }
    function delParticipant(relId, pid) {
      const rel = getRel(relId);
      if (!rel) return;
      rel.participants = rel.participants.filter(function (p) { return p.id !== pid; });
      dirty = true; pushNow(); refresh();
    }
    /* 删除整个泛化：子实体自动变回普通实体 */
    function isaWouldCycle(childId, parentId) {
      var cur = parentId, guard = 0;
      while (cur && guard < 64) {
        if (cur === childId) return true;
        var up = state.model.isas.find(function (i) { return i.childIds.indexOf(cur) >= 0; });
        cur = up ? up.parentId : null;
        guard += 1;
      }
      return false;
    }

    function removeIsa(isaId) {
      const isa = getIsa(isaId);
      if (!isa) return;
      const kids = isa.childIds.map(function (id) { return getEntity(id); }).filter(Boolean);
      state.model.isas = state.model.isas.filter(function (i) { return i.id !== isaId; });
      if (state.selected && state.selected.ntype === 'isa' && state.selected.id === isaId) {
        state.selected = null;
        state.selectedAttr = null;
      }
      hideEdgeMenu(false);
      hideNodeMenu(false);
      pushNow();
      refresh();
      ui.toast('泛化已删除，实体已恢复为普通实体');
    }

    function delIsaChild(isaId, childId) {
      const isa = getIsa(isaId);
      if (!isa) return;
      isa.childIds = isa.childIds.filter(function (c) { return c !== childId; });
      dirty = true; pushNow(); refresh();
    }

    function onClick(e) {
      if (menuEl && !menuEl.hidden && !e.target.closest('#erMenu') && !e.target.closest('[data-node]') && !e.target.closest('.isa-label')) {
        hideNodeMenu(true);
      }
      if (edgeMenuEl && !edgeMenuEl.hidden && !e.target.closest('#erEdgeMenu') && !e.target.closest('[data-act="edit-card"]') && !e.target.closest('.isa-label')) {
        hideEdgeMenu(true);
      }
      const tabBtn = e.target.closest('#erTabs .tab');
      if (tabBtn) { setTab(tabBtn.dataset.tab); return; }
      const actBtn = e.target.closest('[data-act]');
      if (!actBtn) return;
      const act = actBtn.dataset.act;
      if (!act) return;
      if (actBtn.tagName === 'SELECT') return;
      command(act, actBtn);
    }

    function onKeyDown(e) {
      if (!root.isConnected || !root.offsetParent) return;
      if (util.inField(e)) {
        if (e.key === 'Escape' && e.target && e.target.isContentEditable) return;
        if (!((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 's'))) return;
      }
      const k = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && k === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
      if ((e.ctrlKey || e.metaKey) && k === 'y') { e.preventDefault(); redo(); return; }
      if ((e.ctrlKey || e.metaKey) && k === 's') { e.preventDefault(); saveModel(); return; }
      if (k === 'delete' || k === 'backspace') { if (state.selected) { e.preventDefault(); deleteSelected(); } return; }
      if (k === 'escape') {
        if (edgeMenuEl && !edgeMenuEl.hidden) { hideEdgeMenu(true); return; }
        if (menuEl && !menuEl.hidden) { hideNodeMenu(true); return; }
        if (state.linking) cancelLink();
        else select(null);
        return;
      }
    }

    canvasEl.addEventListener('pointerdown', pointerDown);
    window.addEventListener('pointermove', pointerMove);
    window.addEventListener('pointerup', pointerUp);
    window.addEventListener('pointercancel', pointerUp);
    canvasEl.addEventListener('dblclick', dblClick);
    canvasEl.addEventListener('wheel', wheel, { passive: false });
    root.addEventListener('click', onClick);
    root.addEventListener('input', bindInputs);
    root.addEventListener('change', function (e) {
      const sel = e.target && e.target.closest ? e.target.closest('select[data-act]') : null;
      if (sel) { command(sel.getAttribute('data-act'), sel); return; }
      bindInputs(e);
    });
    document.addEventListener('keydown', onKeyDown);

    /* ---------- 启动 ---------- */
    if (loadDraft()) history.reset();
    applyView();
    refresh();
    updateToolbar();
    if (allNodes().length) setTimeout(function () { if (!state.view.s || state.view.s === 1) fitView(); }, 60);

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
        const ns = Math.max(0.2, Math.min(2.4, startS * (d / startDist)));
        const wx = (startMid.x - startVX) / startS;
        const wy = (startMid.y - startVY) / startS;
        state.view.s = ns;
        state.view.x = m.x - wx * ns;
        state.view.y = m.y - wy * ns;
        applyView();
        drawEdges();
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
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('pointermove', pointerMove);
      window.removeEventListener('pointerup', pointerUp);
      window.removeEventListener('pointercancel', pointerUp);
      clearTimeout(histTimer);
      clearTimeout(draftTimer);
      root.innerHTML = '';
    };
  }

  DDB.tools.er = { mount: mount };
})();
