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
    debounce(fn, ms) {
      let t = null;
      return function () {
        const args = arguments, self = this;
        clearTimeout(t);
        t = setTimeout(function () { fn.apply(self, args); }, ms);
      };
    },
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
      function originTransform() {
        if (!originRect || !panel) return null;
        const r = panel.getBoundingClientRect();
        const ox = originRect.left + originRect.width / 2;
        const oy = originRect.top + originRect.height / 2;
        const dx = ox - (r.left + r.width / 2);
        const dy = oy - (r.top + r.height / 2);
        const sc = Math.max(0.18, Math.min(0.5, originRect.width / Math.max(120, r.width)));
        return 'translate(' + dx.toFixed(1) + 'px,' + (dy + 8).toFixed(1) + 'px) scale(' + sc.toFixed(3) + ')';
      }
      /* 把“按钮中心 → 弹窗中心”的位移拆成几段：先从按钮里向下掉出来，再滑到中间 */
      function curveVectors() {
        const r = panel.getBoundingClientRect();
        const px = r.left + r.width / 2;
        const py = r.top + r.height / 2;
        const ox = originRect ? originRect.left + originRect.width / 2 : px;
        const oy = originRect ? originRect.top + originRect.height / 2 : py - 60;
        const dx = ox - px;
        const dy = oy - py;
        const sc = Math.max(0.16, Math.min(0.46, (originRect ? originRect.width : 120) / Math.max(120, r.width)));
        return { dx: dx, dy: dy, sc: sc };
      }
      function animateIn() {
        if (!panel) return;
        const v = curveVectors();
        const mid = v.sc + (1 - v.sc) * 0.34;
        panel.animate([
          { transform: 'translate(' + v.dx.toFixed(1) + 'px,' + v.dy.toFixed(1) + 'px) scale(' + v.sc.toFixed(3) + ')' },
          { transform: 'translate(' + (v.dx * 0.78).toFixed(1) + 'px,' + (v.dy * 0.94 - 10).toFixed(1) + 'px) scale(' + mid.toFixed(3) + ')', offset: 0.34 },
          { transform: 'translate(' + (v.dx * 0.26).toFixed(1) + 'px,' + (v.dy * 0.26).toFixed(1) + 'px) scale(1.02)', offset: 0.72 },
          { transform: 'none' }
        ], { duration: 380, easing: 'cubic-bezier(.18,.86,.26,1)' });
      }
      function close() {
        if (closed) return;
        closed = true;
        document.removeEventListener('keydown', onKey);
        const finish = function () {
          host.innerHTML = '';
          if (o.onDismiss) o.onDismiss();
        };
        if (!panel) { finish(); return; }
        const v = curveVectors();
        const mid = v.sc + (1 - v.sc) * 0.34;
        const anim = panel.animate([
          { transform: 'none' },
          { transform: 'translate(' + (v.dx * 0.26).toFixed(1) + 'px,' + (v.dy * 0.26).toFixed(1) + 'px) scale(1.02)', offset: 0.28 },
          { transform: 'translate(' + (v.dx * 0.78).toFixed(1) + 'px,' + (v.dy * 0.94 - 10).toFixed(1) + 'px) scale(' + mid.toFixed(3) + ')', offset: 0.66 },
          { transform: 'translate(' + v.dx.toFixed(1) + 'px,' + v.dy.toFixed(1) + 'px) scale(' + v.sc.toFixed(3) + ')' }
        ], { duration: 300, easing: 'cubic-bezier(.5,0,.75,.4)' });
        anim.onfinish = finish;
        anim.oncancel = finish;
        setTimeout(finish, 360);
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
      const blob = new Blob([text], { type: (mime || 'text/plain') + ';charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 300);
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

    createHistory: createHistory,
    tools: {},
    version: '1.0.0'
  };
})();


