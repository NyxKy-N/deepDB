/* ================================================================
   core.js · 公共基础设施
   - util   工具函数
   - ui     toast / modal / confirm / prompt
   - store  localStorage 存档
   - io     导入导出 / 剪贴板
   - hist   快照式撤销重做
   - tools  工具注册表（由 er.js / noer.js / ra.js 填充）
   ================================================================ */
window.DDB = (function () {
  'use strict';

  /* ---------------- util ---------------- */
  let seq = 0;
  const KEYS = {
    prefix: 'designerdb:v1:',
    accent: 'designerdb:v1:accent',
    panels: 'designerdb:v1:panels',
    lbw: 'designerdb:v1:lbw',
    lang: 'designerdb:v1:lang'
  };

  const util = {
    uid(prefix) {
      seq += 1;
      return (prefix || 'n') + '_' + Date.now().toString(36) + '_' + seq.toString(36) + Math.floor(Math.random() * 1296).toString(36);
    },
    esc(s) {
      return String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    },
    clone(o) { return o == null ? o : JSON.parse(JSON.stringify(o)); },
    clamp(v, a, b) { return Math.max(a, Math.min(b, v)); },

    pad2(n) { return n < 10 ? '0' + n : '' + n; },
    fmtTime(ts) {
      if (!ts) return '';
      const d = new Date(ts);
      return d.getFullYear() + '-' + util.pad2(d.getMonth() + 1) + '-' + util.pad2(d.getDate()) +
        ' ' + util.pad2(d.getHours()) + ':' + util.pad2(d.getMinutes());
    },
    fmtAgo(ts) {
      const diff = Date.now() - ts;
      if (diff < 60e3) return '刚刚';
      if (diff < 3600e3) return Math.floor(diff / 60e3) + ' 分钟前';
      if (diff < 86400e3) return Math.floor(diff / 3600e3) + ' 小时前';
      return util.fmtTime(ts).slice(0, 10);
    },
    /** 标识符安全化：去空格、非法字符替换为下划线 */
    ident(s) {
      let v = String(s == null ? '' : s).trim().replace(/[^\p{L}\p{N}_]+/gu, '_').replace(/^_+|_+$/g, '');
      if (!v) v = 'unnamed';
      if (/^\d/.test(v)) v = 'x_' + v;
      return v;
    },
    lowerFirst(s) { return s ? s.charAt(0).toLowerCase() + s.slice(1) : s; },
    uniqueName(base, taken) {
      const used = new Set((taken || []).map(function (x) { return String(x).toLowerCase(); }));
      if (!used.has(String(base).toLowerCase())) return base;
      let i = 2;
      while (used.has((base + i).toLowerCase())) i += 1;
      return base + i;
    },
    closest(el, sel) {
      while (el && el !== document) {
        if (el.matches && el.matches(sel)) return el;
        el = el.parentNode;
      }
      return null;
    },
    /** 支持键盘输入判断，避免在输入框里触发快捷键 */
    inField(e) {
      const t = e.target;
      if (!t) return false;
      const tag = (t.tagName || '').toLowerCase();
      return tag === 'input' || tag === 'textarea' || tag === 'select' || t.isContentEditable;
    }
  };

  /* ---------------- ui ---------------- */
  const toastHost = function () { return document.getElementById('toastHost'); };

  /* 记住最近一次按下的按钮：所有弹窗默认从它里面长出来 */
  let lastTrigger = null;
  let lastTriggerRect = null;
  document.addEventListener('pointerdown', function (e) {
    const t = e.target && e.target.closest ? e.target.closest('button, a, [role="button"]') : null;
    if (t) {
      lastTrigger = t;
      try { lastTriggerRect = t.getBoundingClientRect(); } catch (err) { lastTriggerRect = null; }
    }
  }, true);
  document.addEventListener('click', function (e) {
    const t = e.target && e.target.closest ? e.target.closest('button, a, [role="button"]') : null;
    if (!t) return;
    lastTrigger = t;
    try { lastTriggerRect = t.getBoundingClientRect(); } catch (err) { lastTriggerRect = null; }
  }, true);

  const ui = {
    toast(msg, type, ms) {
      const host = toastHost();
      if (!host) return;
      const el = document.createElement('div');
      el.className = 'toast toast--' + (type || 'info');
      el.innerHTML = '<span>' + util.esc(msg) + '</span><span class="x">✕</span>';
      el.querySelector('.x').addEventListener('click', function () { el.remove(); });
      host.appendChild(el);
      setTimeout(function () {
        el.style.transition = 'opacity .2s, transform .2s';
        el.style.opacity = '0';
        el.style.transform = 'translateY(-4px)';
        setTimeout(function () { el.remove(); }, 220);
      }, ms || 2600);
    },

    confirm(opts) {
      const o = opts || {};
      return new Promise(function (resolve) {
        let settled = false;
        const done = function (v) { if (!settled) { settled = true; resolve(v); } };
        ui.modal({
          origin: o.origin || lastTrigger,
          title: o.title || '请确认',
          body: '<p style="font-size:13.5px;color:var(--ink-2)">' + util.esc(o.message || '') + '</p>',
          actions: [
            { label: o.cancelLabel || '取消', onClick: function (close) { done(false); close(); } },
            { label: o.okLabel || '确定', primary: o.danger ? false : true, danger: o.danger, onClick: function (close) { done(true); close(); } }
          ],
          onDismiss: function () { done(false); }
        });
      });
    },

    prompt(opts) {
      const o = opts || {};
      return new Promise(function (resolve) {
        let settled = false;
        const done = function (v) { if (!settled) { settled = true; resolve(v); } };
        const m = ui.modal({
          origin: o.origin || lastTrigger,
          title: o.title || '请输入',
          body: '<label class="field"><span>' + util.esc(o.label || '名称') + '</span>' +
            '<input type="text" id="uiPromptInput" value="' + util.esc(o.value || '') + '" placeholder="' + util.esc(o.placeholder || '') + '"></label>' +
            (o.hint ? '<div class="hint">' + util.esc(o.hint) + '</div>' : ''),
          actions: [
            { label: '取消', onClick: function (close) { done(null); close(); } },
            { label: o.okLabel || '确定', primary: true, onClick: function (close) {
              const input = document.getElementById('uiPromptInput');
              const v = input ? input.value.trim() : '';
              if (!v) { input && input.focus(); return; }
              done(v); close();
            } }
          ],
          onDismiss: function () { done(null); }
        });
        const input = m.querySelector('#uiPromptInput');
        if (input) { input.focus(); input.select(); input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); m.querySelector('.modal-foot .btn--primary').click(); } }); }
      });
    },

    modal(opts) {
      const o = opts || {};
      const host = document.getElementById('modalHost');
      host.innerHTML = '';
      const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const noMotion = document.documentElement.getAttribute('data-motion') === 'off';
      const back = document.createElement('div');
      back.className = 'modal-backdrop';
      const actions = (o.actions || []).map(function (a, i) {
        return '<button class="btn ' + (a.primary ? 'btn--primary' : '') + (a.danger ? 'btn--danger' : '') + '" data-act="' + i + '">' + util.esc(a.label) + '</button>';
      }).join('');
      back.innerHTML =
        '<div class="modal' + (o.wide ? ' modal--wide' : '') + '" role="dialog" aria-modal="true">' +
          '<div class="modal-head"><h3>' + util.esc(o.title || '') + '</h3><button class="icon-btn" data-close aria-label="关闭">✕</button></div>' +
          '<div class="modal-body">' + (o.body || '') + '</div>' +
          (actions ? '<div class="modal-foot">' + actions + '</div>' : '') +
        '</div>';
      host.appendChild(back);

      /* 从触发元素（设置按钮等）非线性放大出来，关闭时原路缩回去 */
      let originRect = null;
      const trigger = o.origin || lastTrigger;
      if (trigger && trigger.getBoundingClientRect) originRect = trigger.getBoundingClientRect();
      else if (!o.origin && lastTriggerRect) originRect = lastTriggerRect;
      const panel = back.querySelector('.modal');
      let closed = false;
    
      /* 把“按钮中心 → 弹窗中心”的位移拆成几段：先从按钮里向下掉出来，再滑到中间 */
      /* 从触发按钮里长出来：中心→中心的弧形路径，全程慢-快-慢 */
      const EASE = 'cubic-bezier(.45,0,.55,1)';
      const OPEN_MS = 390;
      const CLOSE_MS = 390;
      function motionVectors() {
        if (!panel) return { dx: 0, dy: 0, sc: 1, cx: 0, cy: 0 };
        const r = panel.getBoundingClientRect();
        const px = r.left + r.width / 2, py = r.top + r.height / 2;
        const ox = originRect ? originRect.left + originRect.width / 2 : px;
        const oy = originRect ? originRect.top + originRect.height / 2 : py - 80;
        const dx = ox - px, dy = oy - py;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const sc = Math.max(0.16, Math.min(0.46, (originRect ? originRect.width : 120) / Math.max(120, r.width)));
        /* 先从按钮中心往下掉，再滑向屏幕中心 */
        const bow = Math.max(52, 0.3 * len);
        return { dx: dx, dy: dy, sc: sc, cx: dx / 2, cy: dy / 2 + bow };
      }
      function frameAt(t, v, dir) {
        const u = 1 - t;
        const x = u * u * v.dx + 2 * u * t * v.cx;
        const y = u * u * v.dy + 2 * u * t * v.cy;
        const k = t * t * (3 - 2 * t);
        const sc = dir > 0 ? v.sc + (1 - v.sc) * k : 1 - (1 - v.sc) * k;
        const op = dir > 0 ? 0.4 + 0.6 * Math.min(1, t * 1.7) : 1 - k;
        return { transform: 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) scale(' + sc.toFixed(3) + ')', opacity: op };
      }
      function buildFrames(v, dir) {
        const out = []; const n = 10;
        for (let i = 0; i <= n; i++) out.push(frameAt(i / n, v, dir));
        return out;
      }
      function animateIn() {
        if (!panel) return;
        if (noMotion) return;
        const v = motionVectors();
        if (reduceMotion) {
          panel.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 140, easing: 'ease-out', fill: 'both' });
          return;
        }
        back.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260, easing: 'ease-out', fill: 'both' });
        panel.animate(buildFrames(v, 1), { duration: OPEN_MS, easing: EASE, fill: 'both' });
      }
      let finished = false;
      function close() {
        if (closed) return;
        closed = true;
        document.removeEventListener('keydown', onKey);
        const finish = function () {
          if (finished) return;
          finished = true;
          host.innerHTML = '';
          if (o.onDismiss) o.onDismiss();
          document.dispatchEvent(new CustomEvent('ddb:modal-close'));
        };
        if (!panel) { finish(); return; }
        if (noMotion) { finish(); return; }
        if (reduceMotion) {
          panel.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 140, easing: 'ease-in', fill: 'both' });
          setTimeout(finish, 160);
          return;
        }
        const v = motionVectors();
        const frames = buildFrames(v, 1).reverse();
        frames.forEach(function (f) { delete f.opacity; });
        /* 透明度单独走一个线性轨迹：在 58% 之前几乎不透明，最后 40% 才慢慢淡出 */
        back.animate([{ opacity: 1 }, { opacity: 0 }], { duration: CLOSE_MS, easing: 'ease-in', fill: 'both' });
        /* 回收时的淡出：等回收运动走到第 390ms 时开始，到 480ms 完全透明 */
        panel.animate([
          { opacity: 1 },
          { opacity: 0 }
        ], { duration: CLOSE_MS - 300, delay: 300, easing: 'linear', fill: 'both' });
        const anim = panel.animate(frames, { duration: CLOSE_MS, easing: EASE, fill: 'both' });
        anim.onfinish = finish;
        anim.oncancel = finish;
        setTimeout(finish, CLOSE_MS + 140);
      }
      function onKey(e) { if (e.key === 'Escape') close(); }
      document.addEventListener('keydown', onKey);
      back.addEventListener('mousedown', function (e) { if (e.target === back) close(); });
      const closeBtn = back.querySelector('[data-close]');
      if (closeBtn) closeBtn.addEventListener('click', close);
      (o.actions || []).forEach(function (a, i) {
        const btn = back.querySelector('[data-act="' + i + '"]');
        if (btn) btn.addEventListener('click', function () { a.onClick(close, back); });
      });
      const modalEl = back.querySelector('.modal');
      animateIn();
      if (o.onMount) o.onMount(modalEl, close);
      return modalEl;
    }
  };

  /* m13662: anchor-origin pop animation shared by secondary menus */
  const POP_EASE = 'cubic-bezier(.45,0,.55,1)';
  ui.popFrom = function (el, anchor, mode, done, opts) {
    if (!el) { if (done) done(); return; }
    var o = opts || {};
    if (el._popAnim) { try { el._popAnim.cancel(); } catch (e) {} el._popAnim = null; }
    if (document.documentElement.getAttribute('data-motion') === 'off') {
      el.style.transformOrigin = ''; el.style.transform = ''; el.style.opacity = '';
      if (done) done();
      return;
    }
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var rect = el.getBoundingClientRect();
    var ax = rect.left + rect.width / 2;
    var ay = rect.top + rect.height / 2;
    if (anchor) {
      if (typeof anchor.getBoundingClientRect === 'function') {
        var ar = anchor.getBoundingClientRect();
        if (ar.width || ar.height) { ax = ar.left + ar.width / 2; ay = ar.top + ar.height / 2; }
      } else if (typeof anchor.x === 'number') { ax = anchor.x; ay = anchor.y; }
    }
    var ox = rect.width ? Math.max(0, Math.min(100, ((ax - rect.left) / rect.width) * 100)) : 50;
    var oy = rect.height ? Math.max(0, Math.min(100, ((ay - rect.top) / rect.height) * 100)) : 0;
    var dx = ax - (rect.left + rect.width * ox / 100);
    var dy = ay - (rect.top + rect.height * oy / 100);
    var scale = typeof o.scale === 'number' ? o.scale : 0.86;
    var shift = typeof o.shift === 'number' ? o.shift : 0.55;
    var dur = reduce ? 100 : (mode === 'open' ? (o.open || 240) : (o.close || 200));
    el.style.transformOrigin = ox + '% ' + oy + '%';
    var start = 'translate(' + (dx * shift).toFixed(2) + 'px,' + (dy * shift).toFixed(2) + 'px) scale(' + scale + ')';
    var frames = mode === 'open'
      ? [{ opacity: 0, transform: start }, { opacity: 1, transform: 'translate(0,0) scale(1)' }]
      : [{ opacity: 1, transform: 'translate(0,0) scale(1)' }, { opacity: 0, transform: start }];
    var anim;
    try { anim = el.animate(frames, { duration: dur, easing: POP_EASE, fill: 'both' }); }
    catch (err) { if (done) done(); return; }
    el._popAnim = anim;
    var settled = false;
    var finish = function () {
      if (settled) return;
      settled = true;
      try { anim.cancel(); } catch (e) {}
      if (el._popAnim === anim) el._popAnim = null;
      el.style.transformOrigin = ''; el.style.transform = ''; el.style.opacity = '';
      if (done) done();
    };
    if (anim.finished && anim.finished.then) anim.finished.then(finish, finish);
    else setTimeout(finish, dur + 20);
  };

  /* ---------------- store ---------------- */
  const PREFIX = 'designerdb:v1:';
  const store = {
    key(kind, name) { return PREFIX + kind + ':' + name; },
    save(kind, name, model) {
      try {
        const rec = { kind: kind, name: name, model: model, savedAt: Date.now() };
        localStorage.setItem(store.key(kind, name), JSON.stringify(rec));
        const idx = store.list(kind).filter(function (r) { return r.name !== name; });
        idx.push({ name: name, savedAt: rec.savedAt });
        localStorage.setItem(PREFIX + 'index:' + kind, JSON.stringify(idx));
        return true;
      } catch (e) { return false; }
    },
    list(kind) {
      try {
        const raw = localStorage.getItem(PREFIX + 'index:' + kind);
        const arr = raw ? JSON.parse(raw) : [];
        return (Array.isArray(arr) ? arr : []).sort(function (a, b) { return (b.savedAt || 0) - (a.savedAt || 0); });
      } catch (e) { return []; }
    },
    load(kind, name) {
      try {
        const raw = localStorage.getItem(store.key(kind, name));
        return raw ? JSON.parse(raw) : null;
      } catch (e) { return null; }
    },
    remove(kind, name) {
      try {
        localStorage.removeItem(store.key(kind, name));
        const idx = store.list(kind).filter(function (r) { return r.name !== name; });
        localStorage.setItem(PREFIX + 'index:' + kind, JSON.stringify(idx));
        return true;
      } catch (e) { return false; }
    }
  };

  /* ---------------- draft：刷新后自动恢复 ---------------- */
  const draft = {
    key(kind) { return PREFIX + 'draft:' + kind; },
    save(kind, data) {
      try {
        localStorage.setItem(draft.key(kind), JSON.stringify({ kind: kind, data: data, savedAt: Date.now() }));
        return true;
      } catch (e) { return false; }
    },
    load(kind) {
      try {
        const raw = localStorage.getItem(draft.key(kind));
        if (!raw) return null;
        const rec = JSON.parse(raw);
        return rec && rec.data ? rec.data : null;
      } catch (e) { return null; }
    },
    clear(kind) {
      try { localStorage.removeItem(draft.key(kind)); return true; } catch (e) { return false; }
    }
  };

  /* ---------------- io ---------------- */
  const io = {
    download(filename, text, mime) {
      const type = (mime || 'text/plain') + ';charset=utf-8';
      const blob = new Blob([text], { type: type });
      const ext = (String(filename).split('.').pop() || 'txt').toLowerCase();
      const save = function () {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 300);
      };
      /* Chrome / Edge: the save dialog writes the file directly, so Windows does not
         attach the "downloaded from the internet" mark that blocks opening it later. */
      if (window.showSaveFilePicker) {
        try {
          window.showSaveFilePicker({
            suggestedName: filename,
            types: [{ description: ext.toUpperCase() + ' file', accept: (function () { var m = {}; m[(mime || 'text/plain')] = ['.' + ext]; return m; })() }]
          }).then(function (handle) {
            return handle.createWritable().then(function (w) {
              return w.write(blob).then(function () { return w.close(); });
            });
          }).catch(function (err) {
            if (err && err.name === 'AbortError') return;
            save();
          });
          return;
        } catch (e) { /* fall through to the classic download */ }
      }
      save();
    },
    pickFile(accept) {
      return new Promise(function (resolve) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = accept || '.json,application/json';
        input.style.display = 'none';
        document.body.appendChild(input);
        input.addEventListener('change', function () {
          const f = input.files && input.files[0];
          if (!f) { input.remove(); resolve(null); return; }
          const reader = new FileReader();
          reader.onload = function () { input.remove(); resolve({ name: f.name, text: String(reader.result || '') }); };
          reader.onerror = function () { input.remove(); resolve(null); };
          reader.readAsText(f, 'utf-8');
        });
        input.click();
      });
    },
    async copy(text) {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text);
          return true;
        }
      } catch (e) { /* 退回到 textarea 方案 */ }
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand('copy');
        ta.remove();
        return ok;
      } catch (e) { return false; }
    }
  };

  /* ---------------- history ---------------- */
  function registerTool(id, def) {
    const root = window.DDB;
    if (!root || !id) return null;
    const prev = (root.tools && root.tools[id]) || {};
    root.tools[id] = Object.assign({ id: id, title: '' }, prev, def || {});
    return root.tools[id];
  }

  function createHistory(opts) {
    const get = opts.get;
    const set = opts.set;
    const limit = opts.limit || 60;
    const onChange = opts.onChange || function () {};
    let past = [];
    let future = [];
    let current = util.clone(get());
    const h = {
      push() {
        past.push(current);
        if (past.length > limit) past.shift();
        future = [];
        current = util.clone(get());
        onChange();
      },
      undo() {
        if (!past.length) return false;
        future.push(util.clone(get()));
        current = past.pop();
        set(util.clone(current));
        onChange();
        return true;
      },
      redo() {
        if (!future.length) return false;
        past.push(util.clone(get()));
        current = future.pop();
        set(util.clone(current));
        onChange();
        return true;
      },
      reset() {
        past = []; future = []; current = util.clone(get());
        onChange();
      },
      canUndo() { return past.length > 0; },
      canRedo() { return future.length > 0; }
    };
    return h;
  }

  /* ---------------- 代码块复制（全局委托） ---------------- */
  document.addEventListener('click', function (e) {
    const btn = e.target.closest('[data-copy]');
    if (!btn) return;
    const wrap = btn.closest('.code-wrap');
    const pre = wrap ? wrap.querySelector('pre.code, pre') : null;
    if (!pre) return;
    io.copy(pre.textContent).then(function (ok) { ui.toast(ok ? '已复制到剪贴板' : '复制失败，请手动选择', ok ? 'ok' : 'err'); });
  });

  return {
    util: util,
    ui: ui,
    store: store,
    draft: draft,
    io: io,

    keys: KEYS,
    createHistory: createHistory,
    registerTool: registerTool,
    tools: {}
  };
})();


