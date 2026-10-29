/* translatER: hand-write the relational schema of an ER model (load a model or type it yourself) */
(function () {
  'use strict';
  var util = DDB.util, ui = DDB.ui, store = DDB.store, esc = util.esc, uid = util.uid;
  var KIND = 'er';

  function sampleModel() {
    function at(id, name, key) { return { id: id, name: name, type: 'VARCHAR(64)', key: !!key }; }
    return {
      version: 1, name: 'Vendita',
      entities: [
        { id: 'e1', type: 'entity', name: 'PuntoVendita', x: 100, y: 100, attributes: [at('a1', 'ID', true), at('a2', 'nomeResponsabile'), at('a3', 'Indirizzo'), at('a4', 'Telefono')] },
        { id: 'e2', type: 'entity', name: 'Cucina', x: 400, y: 100, attributes: [at('a5', 'Nome', true), at('a6', 'Materiale'), at('a7', 'Prezzo'), at('a8', 'tipoStile'), at('a9', 'nomeDesigner'), at('a10', 'Epoca')] },
        { id: 'e3', type: 'entity', name: 'Cliente', x: 700, y: 100, attributes: [at('a11', 'CF', true), at('a12', 'Indirizzo'), at('a13', 'Nome'), at('a14', 'Cognome')] }
      ],
      relationships: [{
        id: 'r1', type: 'relationship', name: 'Ordinare', x: 400, y: 400, attributes: [at('a15', 'modPagamento'), at('a16', 'Data')],
        participants: [
          { id: 'p1', entityId: 'e1', min: 0, max: 'N', role: '' },
          { id: 'p2', entityId: 'e3', min: 0, max: 'N', role: '' },
          { id: 'p3', entityId: 'e2', min: 0, max: 'N', role: '' }
        ]
      }],
      isas: []
    };
  }

  function norm(m) {
    if (!m || typeof m !== 'object') return null;
    var x = util.clone(m);
    x.entities = Array.isArray(x.entities) ? x.entities : [];
    x.relationships = Array.isArray(x.relationships) ? x.relationships : [];
    return x;
  }

  function textOf(tables) {
    return tables.map(function (t) {
      return (t.name || '?') + ' (' + t.attrs.map(function (a) {
        return a.name + (a.pk ? '(PK)' : '') + (a.fk ? '(FK)' : '');
      }).join(', ') + ')';
    }).join('\n');
  }

  function ddlType(a) {
    if (a._type) return String(a._type).toUpperCase();
    if (window.ERSCHEMA && ERSCHEMA.inferType) return ERSCHEMA.inferType(a.name);
    return 'VARCHAR(255)';
  }

  function sqlName(name) { return String(name || '').replace(/[^A-Za-z0-9_]+/g, '_').toUpperCase(); }

  /* Real CREATE TABLE DDL: types and FK targets travel with the translated schema. */
  function ddlOf(tables) {
    var stmts = tables.filter(function (t) { return t.name && t.attrs.length; }).map(function (t) {
      var name = sqlName(t.name), pkCount = t.attrs.filter(function (a) { return a.pk; }).length, lines = [], fks = [];
      t.attrs.forEach(function (a) {
        var col = '  ' + a.name + ' ' + ddlType(a);
        if (a.pk && pkCount === 1) col += ' PRIMARY KEY';
        if (a._nn) col += ' NOT NULL';
        lines.push(col);
        if (a._fk && a._fk.table && a._fk.column) {
          fks.push('  CONSTRAINT fk_' + String(t.name).toLowerCase() + '_' + String(a.name).toLowerCase() +
            ' FOREIGN KEY (' + a.name + ') REFERENCES ' + sqlName(a._fk.table) + ' (' + a._fk.column + ')');
        }
      });
      if (pkCount > 1) lines.push('  PRIMARY KEY (' + t.attrs.filter(function (a) { return a.pk; }).map(function (a) { return a.name; }).join(', ') + ')');
      if (fks.length) lines = lines.concat(fks);
      return 'CREATE TABLE ' + name + ' (\n' + lines.join(',\n') + '\n);';
    });
    return stmts.join('\n\n');
  }

  function mount(root) {
    var state = { model: null, tables: [], issues: [], checked: false };
    root.innerHTML = [
      '<div class="tool tr-tool">',
      '<div class="tool-bar">',
      '<div class="tool-title">translatER <span class="tool-mode">ER → schema</span></div>',
      '<span class="sep"></span>',
      '<button class="btn btn--sm" data-tr="new">New</button>',
      '<button class="btn btn--sm btn--primary" data-tr="translate">Translate</button>',
      '<button class="btn btn--sm" data-tr="sample">Sample ER</button>',
      '<button class="btn btn--sm" data-tr="open">Open saved ER</button>',
      '<button class="btn btn--sm" data-tr="import">Import JSON</button>',
      '<span class="spacer"></span>',
      '<button class="btn btn--sm" data-tr="done">Done</button>',
      '</div>',
      '<div class="tr-body">',
      '<section class="tr-pane tr-src"><div class="tr-pane-head"><h2>Source ER model</h2><span class="tr-badge" id="trModelName">—</span></div><div class="tr-src-body" id="trSrc"></div></section>',
      '<section class="tr-pane tr-editor-pane"><div class="tr-pane-head"><h2>Relational schema</h2><div class="tr-head-actions">',
      '<button class="btn btn--sm" data-tr="add-table">+ Table</button>',
      '<button class="btn btn--sm" data-tr="copy">Copy</button>',
      '<button class="btn btn--sm" data-tr="download">Download</button>',
      '<button class="btn btn--sm" data-tr="download-sql" title="Download SQL DDL">SQL</button>',
      '</div></div>',
      '<div class="tr-table-list" id="trTables"></div>',
      '<div class="tr-done" id="trDone"></div>',
      '<pre class="tr-out" id="trOut"></pre>',
      '</section></div></div>',
      '<div class="tr-chip-menu" id="trMenu" hidden></div>'
    ].join('');
    var $ = function (s) { return root.querySelector(s); };
    var srcEl = $('#trSrc'), tablesEl = $('#trTables'), doneEl = $('#trDone'), outEl = $('#trOut'), nameEl = $('#trModelName'), menuEl = $('#trMenu');
    var CHIP_POP = { scale: 0.18, shift: 1, open: 220, close: 180 };

    function tableById(id) { return state.tables.filter(function (t) { return t.id === id; })[0] || null; }
    function names() {
      var out = [];
      if (!state.model) return out;
      state.model.entities.forEach(function (e) { out.push({ name: e.name || '', kind: 'entity', attrs: e.attributes || [] }); });
      state.model.relationships.forEach(function (r) { out.push({ name: r.name || '', kind: 'relationship', attrs: r.attributes || [] }); });
      return out.filter(function (x) { return x.name; });
    }
    function match(name) {
      var up = String(name || '').trim().toUpperCase();
      if (!up) return null;
      var all = names();
      for (var i = 0; i < all.length; i++) if (all[i].name.toUpperCase() === up) return all[i];
      return null;
    }

    function renderSrc() {
      nameEl.textContent = state.model ? (state.model.name || '—') : '—';
      if (!state.model) {
        srcEl.innerHTML = '<div class="tr-empty"><b>No model loaded yet</b><span>Load a sample, open a saved ER, import JSON, or press New to start from scratch.</span></div>';
        return;
      }
      var html = '';
      state.model.entities.forEach(function (e) {
        html += '<div class="tr-src-block"><div class="tr-src-head"><span class="tr-src-kind">Entity</span><b>' + esc(e.name) + '</b></div><div class="tr-src-attrs">' +
          ((e.attributes || []).map(function (a) { return '<span class="tr-src-attr' + (a.key ? ' pk' : '') + '">' + esc(a.name) + (a.key ? '<i>PK</i>' : '') + '</span>'; }).join('') || '<span class="tr-dim">no attributes</span>') + '</div></div>';
      });
      state.model.relationships.forEach(function (r) {
        var parts = (r.participants || []).map(function (p) {
          var e = state.model.entities.filter(function (x) { return x.id === p.entityId; })[0];
          return (e ? e.name : '?') + '(' + p.min + ',' + p.max + ')';
        });
        html += '<div class="tr-src-block"><div class="tr-src-head"><span class="tr-src-kind rel">Relationship</span><b>' + esc(r.name || '(unnamed relationship)') + '</b></div><div class="tr-src-attrs">' +
          (parts.map(function (p) { return '<span class="tr-src-attr">' + esc(p) + '</span>'; }).join('') || '<span class="tr-dim">no participants</span>') +
          ((r.attributes || []).map(function (a) { return '<span class="tr-src-attr">' + esc(a.name) + '</span>'; }).join('')) + '</div></div>';
      });
      srcEl.innerHTML = html || '<div class="tr-empty"><b>The model is empty</b></div>';
    }

    function addTable(name) { var t = { id: uid('t'), name: name || '', attrs: [] }; state.tables.push(t); state.checked = false; return t; }
    function addAttrs(t, raw) {
      String(raw || '').split(/[,，]/).map(function (s) { return s.trim(); }).filter(Boolean).forEach(function (n) {
        if (t.attrs.some(function (a) { return a.name.toUpperCase() === n.toUpperCase(); })) return;
        t.attrs.push({ id: uid('a'), name: n, pk: false, fk: false });
      });
      state.checked = false;
      orderAttrs(t);
    }
    function orderAttrs(t) {
      var pk = [], fk = [], rest = [];
      (t.attrs || []).forEach(function (a, i) {
        a._ord = typeof a._ord === 'number' ? a._ord : i;
        if (a.pk) pk.push(a); else if (a.fk) fk.push(a); else rest.push(a);
      });
      pk.sort(function (a, b) { return a._ord - b._ord; });
      fk.sort(function (a, b) { return a._ord - b._ord; });
      rest.sort(function (a, b) { return a._ord - b._ord; });
      t.attrs = pk.concat(fk, rest);
    }

    function chips(t) {
      if (!t.attrs.length) return '<span class="tr-chips-empty">type attribute names, comma separated</span>';
      return t.attrs.map(function (a) {
        return '<button type="button" class="tr-chip' + (a.pk ? ' pk' : '') + (a.fk ? ' fk' : '') + '" data-chip="' + a.id + '" data-table="' + t.id + '">' + esc(a.name) + (a.fk ? '<i>(FK)</i>' : '') + '</button>';
      }).join('');
    }
    function renderTables() {
      if (!state.tables.length) {
        tablesEl.innerHTML = '<div class="tr-empty tr-empty-editor"><b>No tables yet</b><span>Press + Table, then type an entity name (case-insensitive) — brackets are added for you.</span></div>';
        requestAnimationFrame(pkLines); return;
      }
      tablesEl.innerHTML = state.tables.map(function (t, i) {
        var m = match(t.name);
        return '<div class="tr-table" data-table="' + t.id + '"><div class="tr-table-head"><span class="tr-table-idx">' + (i + 1) + '</span>' +
          '<input class="tr-table-name" data-table-name="' + t.id + '" value="' + esc(t.name) + '" placeholder="table name (entity name)" spellcheck="false">' +
          (m ? '<span class="tr-match">= ' + esc(m.name) + '</span>' : '') +
          '<button class="btn btn--sm tr-del-table" data-del-table="' + t.id + '">Delete</button></div>' +
          '<div class="tr-paren">(<div class="tr-chips" data-chips="' + t.id + '">' + chips(t) + '<span class="tr-pk-line"></span></div>' +
          '<input class="tr-attr-input" data-attr-input="' + t.id + '" placeholder="attributes, comma separated, Enter to add" spellcheck="false">)</div></div>';
      }).join('');
      bind();
      requestAnimationFrame(pkLines);
    }

    function bind() {
      tablesEl.querySelectorAll('[data-table-name]').forEach(function (inp) {
        inp.addEventListener('input', function () {
          var t = tableById(inp.getAttribute('data-table-name')); if (!t) return;
          t.name = inp.value; state.checked = false; clear();
        });
        inp.addEventListener('change', function () { commit(tableById(inp.getAttribute('data-table-name')), inp); });
        inp.addEventListener('keydown', function (e) {
          if (e.key !== 'Enter') return;
          e.preventDefault();
          var t = tableById(inp.getAttribute('data-table-name')); if (!t) return;
          commit(t, inp);
          var next = tablesEl.querySelector('[data-attr-input="' + t.id + '"]'); if (next) next.focus();
        });
      });
      tablesEl.querySelectorAll('[data-attr-input]').forEach(function (inp) {
        inp.addEventListener('keydown', function (e) {
          if (e.key !== 'Enter' && e.key !== ',') return;
          e.preventDefault();
          var t = tableById(inp.getAttribute('data-attr-input')); if (!t) return;
          var raw = inp.value + (e.key === ',' ? ',' : '');
          addAttrs(t, raw); inp.value = '';
          renderTables();
          var again = tablesEl.querySelector('[data-attr-input="' + t.id + '"]'); if (again) again.focus();
        });
        inp.addEventListener('blur', function () {
          var t = tableById(inp.getAttribute('data-attr-input'));
          if (!t || !inp.value.trim()) return;
          addAttrs(t, inp.value); inp.value = ''; renderTables();
        });
      });
      tablesEl.querySelectorAll('[data-chip]').forEach(function (chip) {
        chip.addEventListener('dblclick', function (e) {
          e.preventDefault(); e.stopPropagation();
          var t = tableById(chip.getAttribute('data-table')); if (!t) return;
          var a = t.attrs.filter(function (x) { return x.id === chip.getAttribute('data-chip'); })[0]; if (!a) return;
          hideMenu();
          ui.prompt({ title: 'Rename attribute', label: 'Name', value: a.name }).then(function (v) {
            if (v == null) return;
            var name = String(v).trim();
            if (!name) return;
            a.name = name; state.checked = false;
            renderTables(); renderOut(); clear();
          });
        });
        chip.addEventListener('click', function (e) {
          e.stopPropagation();
          var t = tableById(chip.getAttribute('data-table')); if (!t) return;
          var a = t.attrs.filter(function (x) { return x.id === chip.getAttribute('data-chip'); })[0]; if (!a) return;
          if (menuFor && menuFor.t === t && menuFor.a === a && !menuEl.hidden) { hideMenu(); return; }
          openMenu(t, a, chip);
        });
      });
      tablesEl.querySelectorAll('[data-del-table]').forEach(function (b) {
        b.addEventListener('click', function () {
          var tid = b.getAttribute('data-del-table');
          var tb = tableById(tid);
          ui.confirm({ title: 'Delete table', message: 'Delete table "' + (tb ? tb.name : '') + '"? Its attributes will be removed too.', okLabel: 'Delete', danger: true }).then(function (ok) {
            if (!ok) return;
            state.tables = state.tables.filter(function (t) { return t.id !== tid; });
            state.checked = false; renderTables(); renderOut(); clear();
          });
        });
      });
    }

    function commit(t, inp) {
      if (!t) return;
      var raw = String(t.name || '').trim(); if (!raw) return;
      var m = match(raw);
      t.name = (m ? m.name : raw).toUpperCase();
      inp.value = t.name;
      renderTables(); renderOut(); clear();
    }

    function pkLines() {
      tablesEl.querySelectorAll('.tr-chips').forEach(function (box) {
        var line = box.querySelector('.tr-pk-line'); if (!line) return;
        var chipsEl = Array.prototype.slice.call(box.querySelectorAll('.tr-chip.pk'));
        if (!chipsEl.length) { line.style.display = 'none'; return; }
        var b = box.getBoundingClientRect(), f = chipsEl[0].getBoundingClientRect(), l = chipsEl[chipsEl.length - 1].getBoundingClientRect();
        line.style.display = 'block';
        line.style.left = (f.left - b.left) + 'px';
        line.style.width = Math.max(10, l.right - f.left) + 'px';
        line.style.top = (f.bottom - b.top + 3) + 'px';
      });
    }

    var menuFor = null;
    function openMenu(t, a, anchor) {
      menuFor = { t: t, a: a };
      menuEl.hidden = false;
      menuEl.innerHTML = '<div class="tr-chip-menu-head">' + esc(a.name) + '</div>' +
        '<button type="button" class="tr-menu-item' + (a.pk ? ' on' : '') + '" data-chip-act="pk">' + (a.pk ? 'Unset PK' : 'Set PK') + '</button>' +
        '<button type="button" class="tr-menu-item' + (a.fk ? ' on' : '') + '" data-chip-act="fk">' + (a.fk ? 'Unset FK' : 'Set FK') + '</button>' +
        '<button type="button" class="tr-menu-item danger" data-chip-act="del">Delete attribute</button>';
      menuEl.hidden = false;
      var r = anchor.getBoundingClientRect();
      var mw = menuEl.offsetWidth || 210, mh = menuEl.offsetHeight || 150;
      var left = Math.min(Math.max(10, r.left - 6), window.innerWidth - mw - 10);
      var below = r.bottom + 8;
      var above = r.top - mh - 8;
      var top = (below + mh <= window.innerHeight - 10) ? below : above;
      top = Math.max(10, Math.min(top, window.innerHeight - mh - 10));
      menuEl.style.left = left + 'px';
      menuEl.style.top = top + 'px';
      menuEl.classList.remove('open');
      menuEl._anchor = anchor;
      if (ui.popFrom) ui.popFrom(menuEl, anchor, 'open', null, CHIP_POP);
    }
    function hideMenu(immediate) {
      if (!menuEl || menuEl.hidden) return;
      const anchor = menuEl._anchor || null;
      menuFor = null;
      menuEl.classList.remove('open');
      if (immediate === true || !ui.popFrom) { menuEl.hidden = true; return; }
      ui.popFrom(menuEl, anchor, 'close', function () { menuEl.hidden = true; }, CHIP_POP);
    }
    menuEl.addEventListener('click', function (e) {
      var b = e.target.closest('[data-chip-act]'); if (!b || !menuFor) return;
      var act = b.getAttribute('data-chip-act'), t = menuFor.t, a = menuFor.a;
      if (act === 'pk') { a.pk = !a.pk; if (a.pk) a._ord = Date.now(); } else if (act === 'fk') { a.fk = !a.fk; if (a.fk) a._ord = Date.now(); }
      else if (act === 'del') {
        hideMenu();
        ui.confirm({ title: 'Delete attribute', message: 'Delete attribute "' + a.name + '"?', okLabel: 'Delete', danger: true }).then(function (ok) {
          if (!ok) return;
          t.attrs = t.attrs.filter(function (x) { return x.id !== a.id; });
          orderAttrs(t); state.checked = false; renderTables(); renderOut(); clear();
        });
        return;
      }
      orderAttrs(t); state.checked = false; hideMenu(); renderTables(); renderOut(); clear();
    });
    root.addEventListener('click', function (e) {
      if (!menuEl.hidden && !e.target.closest('#trMenu') && !e.target.closest('[data-chip]')) hideMenu();
    });

    function translateAll() {
      if (!state.model || !state.model.entities || !state.model.entities.length) { ui.toast('Load an ER model first', 'warn'); return; }
      var built;
      try { built = ERSCHEMA.build(state.model); } catch (e) { ui.toast('Translate failed', 'err'); return; }
      state.tables = (built.tables || []).map(function (t) {
        var tb = { id: uid('t'), name: String(t.name || '').toUpperCase(), attrs: [] };
        (t.columns || []).forEach(function (c) {
          tb.attrs.push({
            id: uid('a'),
            name: c.name,
            pk: !!c.pk,
            fk: !!c.fk,
            _type: c.type || '',
            _nn: !!c.nn,
            _fk: (c.fk && typeof c.fk === 'object') ? { table: c.fk.table || '', column: c.fk.column || '' } : null,
            _ord: tb.attrs.length
          });
        });
        orderAttrs(tb);
        return tb;
      });
      state.checked = false;
      renderTables(); renderOut(); clear();
      ui.toast('Translated ' + state.tables.length + ' tables', 'ok');
    }

    function renderOut() {
      var txt = textOf(state.tables);
      outEl.textContent = txt || '(empty)';
      outEl.classList.toggle('is-empty', !txt);
    }
    function clear() { state.issues = []; state.checked = false; doneEl.innerHTML = ''; }

    function validate() {
      var iss = [], seen = {}, idx = names();
      state.tables.forEach(function (t, i) {
        var label = t.name || ('Table ' + (i + 1)), up = (t.name || '').toUpperCase();
        if (!t.name) iss.push({ lv: 'err', msg: 'Table ' + (i + 1) + ' has no name.' });
        else if (seen[up]) iss.push({ lv: 'err', msg: 'Table name "' + t.name + '" is duplicated.' });
        seen[up] = true;
        if (state.model && !match(t.name)) iss.push({ lv: 'warn', msg: 'Table "' + label + '" has no matching entity or relationship in the ER model (case-insensitive).' });
        if (!t.attrs.length) iss.push({ lv: 'err', msg: 'Table "' + label + '" has no attributes yet.' });
        var as = {};
        t.attrs.forEach(function (a) {
          var au = (a.name || '').toUpperCase();
          if (!a.name) iss.push({ lv: 'err', msg: 'Table "' + label + '" contains an empty attribute name.' });
          else if (as[au]) iss.push({ lv: 'err', msg: 'Table "' + label + '": attribute "' + a.name + '" is duplicated.' });
          as[au] = true;
        });
        if (!t.attrs.some(function (a) { return a.pk; })) iss.push({ lv: 'warn', msg: 'Table "' + label + '" has no primary key (PK) yet.' });
        /* 与 ER 模型对比：多出的属性报错（FK 属性名例外），缺少的属性报错 */
        var m = state.model ? match(t.name) : null;
        if (m && m.attrs && m.attrs.length) {
          var modelNames = {};
          m.attrs.forEach(function (ma) { modelNames[String(ma.name || '').toUpperCase()] = ma.name; });
          var own = {};
          t.attrs.forEach(function (a) {
            var au = String(a.name || '').toUpperCase();
            own[au] = true;
            if (!modelNames[au] && !a.fk) iss.push({ lv: 'err', msg: 'Table "' + label + '": attribute "' + a.name + '" does not exist in the ER entity/relationship. (FK columns are exempt.)' });
          });
          Object.keys(modelNames).forEach(function (k) {
            if (!own[k]) iss.push({ lv: 'err', msg: 'Table "' + label + '" is missing attribute "' + modelNames[k] + '" from the ER model.' });
          });
        }
      });
      if (state.model) {
        var miss = idx.filter(function (x) { return !state.tables.some(function (t) { return t.name.toUpperCase() === x.name.toUpperCase(); }); });
        if (miss.length) iss.push({ lv: 'info', msg: 'The model has ' + miss.length + ' names not present in the schema: ' + miss.map(function (x) { return x.name; }).join(', ') + '.' });
      }
      if (!state.tables.length) iss.push({ lv: 'err', msg: 'No tables yet — press + Table or import a model.' });
      return iss;
    }

    function renderDone() {
      if (!state.checked) { doneEl.innerHTML = ''; return; }
      var errs = state.issues.filter(function (x) { return x.lv === 'err'; }).length;
      var warns = state.issues.filter(function (x) { return x.lv === 'warn'; }).length;
      var head = errs ? '<div class="tr-done-head err">Errors: ' + errs + '' + (warns ? ', ' + warns + ' warnings' : '') + '</div>'
        : warns ? '<div class="tr-done-head warn">No errors, ' + warns + ' warnings</div>'
          : '<div class="tr-done-head ok">Looks good — ready to export</div>';
      doneEl.innerHTML = head + '<ul class="tr-issues">' + state.issues.map(function (x) {
        return '<li class="tr-issue ' + x.lv + '"><span class="tr-dot"></span><span>' + esc(x.msg) + '</span></li>';
      }).join('') + '</ul>';
    }

    function loadModel(m) {
      state.model = norm(m);
      state.tables = [];
      addTable('');
      state.checked = false;
      renderSrc(); renderTables(); renderOut(); clear();
    }

    function openSaved() {
      var list = store.list(KIND);
      if (!list.length) { ui.toast('No saved ER models yet — save one in designER first', 'warn'); return; }
      var m = ui.modal({
        title: 'Open saved ER model', wide: true,
        body: '<div class="store-list">' + list.map(function (r) {
          return '<div class="store-item"><div><div class="si-name">' + esc(r.name) + '</div><div class="si-meta">' + util.fmtAgo(r.savedAt) + '</div></div>' +
          '<div class="si-actions"><button class="btn btn--sm btn--primary" data-open="' + esc(r.name) + '">Load</button></div></div>';
        }).join('') + '</div>',
        actions: [{ label: 'Close', onClick: function (close) { close(); } }]
      });
      m.querySelectorAll('[data-open]').forEach(function (b) {
        b.addEventListener('click', function () {
          var rec = store.load(KIND, b.getAttribute('data-open'));
          if (!rec) { ui.toast('Could not read the model', 'err'); return; }
          loadModel(rec.model);
          ui.toast('Loaded: ' + b.getAttribute('data-open'), 'ok');
          var c = m.querySelector('.icon-btn'); if (c) c.click();
        });
      });
    }

    async function importJson() {
      var f = await DDB.io.pickFile('.json,.er,application/json');
      if (!f) return;
      try {
        var data = JSON.parse(f.text);
        if (window.DDB_ER_ADAPT) data = window.DDB_ER_ADAPT(data);
        var model = norm(data && data.model ? data.model : data);
        if (!model || (!model.entities.length && !model.relationships.length)) { ui.toast('This JSON does not contain an ER model', 'err'); return; }
        model.name = model.name || f.name.replace(/\.json$/i, '');
        loadModel(model);
        ui.toast('Imported: ' + model.name, 'ok');
      } catch (e) { ui.toast('Could not parse the JSON', 'err'); }
    }

    root.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-tr]'); if (!btn) return;
      var act = btn.getAttribute('data-tr');
      if (act === 'new') { state.tables = []; clear(); renderTables(); renderOut(); ui.toast('New empty schema', 'ok'); }
      else if (act === 'sample') { loadModel(sampleModel()); ui.toast('Sample ER model loaded', 'ok'); }
      else if (act === 'translate') translateAll();
      else if (act === 'add-table') {
        addTable(''); renderTables();
        requestAnimationFrame(function () { var a = tablesEl.querySelectorAll('[data-table-name]'); if (a.length) a[a.length - 1].focus(); });
      }
      else if (act === 'open') openSaved();
      else if (act === 'import') importJson();
      else if (act === 'done') { state.issues = validate(); state.checked = true; renderTables(); renderDone(); var n = state.issues.filter(function (x) { return x.lv === 'err'; }).length; ui.toast(n ? 'There are ' + n + ' errors to fix' : 'Check passed', n ? 'warn' : 'ok'); }
      else if (act === 'copy') DDB.io.copy(textOf(state.tables)).then(function (ok) { ui.toast(ok ? 'Schema copied' : 'Copy failed', ok ? 'ok' : 'err'); });
      else if (act === 'download') {
        var txt = textOf(state.tables);
        if (!txt) { ui.toast('Nothing to export yet', 'warn'); return; }
        DDB.io.download('schema.txt', txt + '\n', 'text/plain');
      }
      else if (act === 'download-sql') {
        var ddl = ddlOf(state.tables);
        if (!ddl) { ui.toast('Nothing to export yet', 'warn'); return; }
        DDB.io.download('schema.sql', ddl + '\n', 'application/sql');
        ui.toast('SQL DDL exported', 'ok');
      }
    });

    addTable('');
    renderTables(); renderSrc(); renderOut();
  }

  if (window.DDB && DDB.registerTool) DDB.registerTool('translater', { title: 'translatER · ER → schema', mount: mount });
})();
