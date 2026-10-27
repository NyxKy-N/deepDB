/* designerDB 界面翻译引擎（DOM 级）
 * 目标：不改变各工具源码，只在渲染结果上替换文本节点与属性。
 * 词典由 i18n-dict.js 提供：window.DDB_I18N_DICT = { zh|en|it: { texts, attrs } }
 * 语言选择保存在 localStorage，刷新后保持。
 */
(function () {
  'use strict';

  var DICT = window.DDB_I18N_DICT || { zh: { texts: {}, attrs: {} }, en: { texts: {}, attrs: {} }, it: { texts: {}, attrs: {} } };
  var LANG_KEY = 'designerdb:v1:lang';
  var ATTRS = ['title', 'placeholder', 'aria-label', 'alt'];
  // 这些区域是用户数据 / 代码 / 正在内联编辑的地方，不翻译
  var SKIP_SEL = [
    '[data-i18n-skip]',
    'pre', 'code', 'kbd', 'samp', 'script', 'style', 'textarea',
    '[contenteditable="true"]',
    '[data-edit-name]', '.er-attr-name', '.er-entity-name', '.er-rel-title',
    '.noer-field .fn', '.outline-list .oi-name:not([data-i18n])', '.si-name', '.ra-cols', '.ra-info .ln'
  ].join(',');

  var lang = 'en';
  var origText = new WeakMap();
  var origAttr = new WeakMap();
  var fragCache = {};
  var scheduled = false;
  var applying = false;

  function readLang() {
    try {
      var v = localStorage.getItem(LANG_KEY);
      if (v === 'zh' || v === 'en' || v === 'it') return v;
    } catch (e) { }
    return 'en';
  }
  function saveLang(l) {
    try { localStorage.setItem(LANG_KEY, l); } catch (e) { }
  }
  function dictFor(l) { return DICT[l] || {}; }
  function mapOf(kind) {
    var d = dictFor(lang);
    return (kind === 'attrs' ? d.attrs : d.texts) || {};
  }
  function lookup(map, raw) {
    if (!raw) return null;
    if (Object.prototype.hasOwnProperty.call(map, raw)) return map[raw];
    var t = raw.trim();
    if (!t) return null;
    if (Object.prototype.hasOwnProperty.call(map, t)) return map[t];
    return null;
  }
  function skip(node) {
    var el = node.nodeType === 1 ? node : node.parentNode;
    return !!(el && el.closest && el.closest(SKIP_SEL));
  }

  /* 片段替换：处理「2 属性」「1 项提示」这类运行时拼出来的文本 */
  function fragIndex(l) {
    if (fragCache[l]) return fragCache[l];
    var map = dictFor(l).texts || {};
    var keys = Object.keys(map).filter(function (k) { return k.length >= 1; });
    keys.sort(function (a, b) { return b.length - a.length; });
    var byChar = {};
    for (var i = 0; i < keys.length; i++) {
      var c = keys[i].charAt(0);
      if (!byChar[c]) byChar[c] = [];
      byChar[c].push(keys[i]);
    }
    fragCache[l] = { map: map, byChar: byChar };
    return fragCache[l];
  }
  function fragReplace(base) {
    var idx = fragIndex(lang);
    var out = '';
    var i = 0;
    while (i < base.length) {
      var cands = idx.byChar[base.charAt(i)];
      var matched = null;
      if (cands) {
        for (var j = 0; j < cands.length; j++) {
          var k = cands[j];
          if (base.substr(i, k.length) === k) { matched = k; break; }
        }
      }
      if (matched) { out += idx.map[matched]; i += matched.length; }
      else { out += base.charAt(i); i++; }
    }
    return out;
  }

  /* 运行时拼接句子的句式模板 */
  var PATTERNS = [
    [/^(\d+) \u4e2a\u5b9e\u4f53 \u00b7 (\d+) \u4e2a\u5173\u7cfb$/, function (m, l) { return l === 'it' ? m[1] + ' entit\u00e0 \u00b7 ' + m[2] + ' relazioni' : m[1] + ' entities \u00b7 ' + m[2] + ' relationships'; }],
    [/^(\d+) \u4e2a\u5b9e\u4f53$/, function (m, l) { return l === 'it' ? m[1] + ' entit\u00e0' : m[1] + ' entities'; }],
    [/^(\d+) \u4e2a\u5173\u7cfb$/, function (m, l) { return l === 'it' ? m[1] + ' relazioni' : m[1] + ' relationships'; }],
    [/^(\d+)\u7aef$/, function (m, l) { return l === 'it' ? m[1] + ' estremi' : m[1] + ' sides'; }],
    [/^(\d+) \u5b50$/, function (m, l) { return l === 'it' ? m[1] + ' figlie' : m[1] + ' children'; }],
    [/^(\d+) \u4e2a\u5b57\u6bb5 \u00b7 (\d+) \u4e2a\u5d4c\u5957$/, function (m, l) { return l === 'it' ? m[1] + ' campi \u00b7 ' + m[2] + ' annidati' : m[1] + ' fields \u00b7 ' + m[2] + ' nested'; }],
    [/^(\d+) \u4e2a\u5b57\u6bb5$/, function (m, l) { return l === 'it' ? m[1] + ' campi' : m[1] + ' fields'; }],
    [/^(\d+) \u4e2a\u96c6\u5408$/, function (m, l) { return l === 'it' ? m[1] + ' collezioni' : m[1] + ' collections'; }],
    [/^(\d+) \u4e2a\u5c5e\u6027$/, function (m, l) { return l === 'it' ? m[1] + ' attributi' : m[1] + ' attributes'; }],
    [/^\u5b9e\u4f53\u300c(.+?)\u300d\u6ca1\u6709\u53c2\u4e0e\u4efb\u4f55\u5173\u7cfb\uff0c\u5c06\u6210\u4e3a\u72ec\u7acb\u7684\u4e00\u5f20\u8868\u3002$/, function (m, l) {
      return l === 'it' ? 'L\u2019entit\u00e0 \u00ab' + m[1] + '\u00bb non partecipa a relazioni: diventa una tabella a s\u00e9.' : 'Entity \u201c' + m[1] + '\u201d takes part in no relationship, so it becomes a standalone table.';
    }],
    [/^\u5173\u7cfb\u300c(.+?)\u300d\u662f N:M \u4e14\u6709\u5c5e\u6027\uff0c\u5c5e\u6027\u4f1a\u653e\u5165\u65b0\u5efa\u7684\u5173\u8054\u8868\u3002$/, function (m, l) {
      return l === 'it' ? 'La relazione \u00ab' + m[1] + '\u00bb \u00e8 N:M con attributi: finiscono nella nuova tabella di associazione.' : 'Relationship \u201c' + m[1] + '\u201d is N:M with attributes; they go into the new junction table.';
    }],
    [/^N:M \u5173\u7cfb (.+)$/, function (m, l) { return l === 'it' ? 'Relazione N:M ' + m[1] : 'N:M relationship ' + m[1]; }],
    [/^ISA\uff1a\u5b50\u7c7b\u300c(.+?)\u300d\u7ee7\u627f\u7236\u7c7b\u300c(.+?)\u300d\u7684\u4e3b\u952e\u4f5c\u4e3a\u81ea\u8eab\u4e3b\u952e\uff08\u4e00\u8868\u4e00\u7c7b\u7684\u6620\u5c04\uff09\u3002$/, function (m, l) {
      return l === 'it' ? 'ISA: la sottoclasse \u00ab' + m[1] + '\u00bb eredita la chiave primaria di \u00ab' + m[2] + '\u00bb (una tabella per classe).' : 'ISA: subclass \u201c' + m[1] + '\u201d inherits the primary key of \u201c' + m[2] + '\u201d (one table per class).';
    }],
    [/^ISA \u5b50\u7c7b\u300c(.+?)\u300d\u7684\u539f\u4e3b\u952e\u300c(.+?)\u300d\u6539\u4e3a\u552f\u4e00\u7ea6\u675f\u3002$/, function (m, l) {
      return l === 'it' ? 'ISA, sottoclasse \u00ab' + m[1] + '\u00bb: la chiave primaria \u00ab' + m[2] + '\u00bb diventa un vincolo di unicit\u00e0.' : 'ISA subclass \u201c' + m[1] + '\u201d: the original primary key \u201c' + m[2] + '\u201d becomes a unique constraint.';
    }],
    [/^1:N \u5173\u7cfb\u300c(.+?)\u300d\uff1a\u5916\u952e\u653e\u5728\u300c(.+?)\u300d\uff08\u6700\u5927\u57fa\u6570\u4e3a 1 \u7684\u4e00\u4fa7\uff09\uff0c\u5f15\u7528\u300c(.+?)\u300d\u7684\u4e3b\u952e(.*)$/, function (m, l) {
      var tail = m[4] || '';
      var cascade = /CASCADE/.test(tail);
      if (l === 'it') return 'Relazione 1:N \u00ab' + m[1] + '\u00bb: chiave esterna in \u00ab' + m[2] + '\u00bb (lato con cardinalit\u00e0 massima 1) che referenzia la chiave primaria di \u00ab' + m[3] + '\u00bb' + (cascade ? ', NOT NULL / ON DELETE CASCADE' : ', nullable / ON DELETE SET NULL') + '.';
      return '1:N relationship \u201c' + m[1] + '\u201d: foreign key in \u201c' + m[2] + '\u201d (the side with maximum cardinality 1) referencing the primary key of \u201c' + m[3] + '\u201d' + (cascade ? ', NOT NULL / ON DELETE CASCADE' : ', nullable / ON DELETE SET NULL') + '.';
    }],
    [/^N:M \u5173\u7cfb\u300c(.+?)\u300d\uff1a\u751f\u6210\u5173\u8054\u8868 (.+?)\uff0c\u4e3b\u952e\u7531\u4e24\u7aef\u5916\u952e\u7ec4\u6210\uff0c\u5173\u7cfb\u5c5e\u6027\u4f5c\u4e3a\u8868\u7684\u5217\u3002$/, function (m, l) {
      return l === 'it' ? 'Relazione N:M \u00ab' + m[1] + '\u00bb: crea la tabella di associazione ' + m[2] + ', chiave primaria composta dalle due chiavi esterne, attributi come colonne.' : 'N:M relationship \u201c' + m[1] + '\u201d: creates junction table ' + m[2] + ' with a composite key of both foreign keys and the relationship attributes as columns.';
    }],
    [/^\u96c6\u5408\u300c(.+?)\u300d\u7684\u552f\u4e00\u5b57\u6bb5\u4f1a\u751f\u6210\u552f\u4e00\u7d22\u5f15\uff1a(.+?)\u3002$/, function (m, l) {
      return l === 'it' ? 'I campi unici della collezione \u00ab' + m[1] + '\u00bb generano un indice unico: ' + m[2] + '.' : 'Unique fields of collection \u201c' + m[1] + '\u201d produce a unique index: ' + m[2] + '.';
    }]
  ];

  /* 英文源文案的句式（用于 translatER 这类英文界面） */
  var PATTERNS_EN = [
    [/^Table (.+) has no name\.$/, function (m, l) { return l === 'it' ? 'La tabella ' + m[1] + ' non ha nome.' : '\u8868 ' + m[1] + ' \u6ca1\u6709\u540d\u5b57\u3002'; }],
    [/^Table name "(.+)" is duplicated\.$/, function (m, l) { return l === 'it' ? 'Il nome tabella \u00ab' + m[1] + '\u00bb \u00e8 duplicato.' : '\u8868\u540d\u300c' + m[1] + '\u300d\u91cd\u590d\u3002'; }],
    [/^Table "(.+)" has no matching entity or relationship in the ER model \(case-insensitive\)\.$/, function (m, l) { return l === 'it' ? 'La tabella \u00ab' + m[1] + '\u00bb non corrisponde a nessuna entit\u00e0 o relazione del modello ER (senza distinzione di maiuscole).' : '\u8868\u300c' + m[1] + '\u300d\u5728 ER \u6a21\u578b\u91cc\u627e\u4e0d\u5230\u5bf9\u5e94\u7684\u5b9e\u4f53\u6216\u5173\u7cfb\uff08\u4e0d\u533a\u5206\u5927\u5c0f\u5199\uff09\u3002'; }],
    [/^Table "(.+)" has no attributes yet\.$/, function (m, l) { return l === 'it' ? 'La tabella \u00ab' + m[1] + '\u00bb non ha ancora attributi.' : '\u8868\u300c' + m[1] + '\u300d\u8fd8\u6ca1\u6709\u5c5e\u6027\u3002'; }],
    [/^Table "(.+)" contains an empty attribute name\.$/, function (m, l) { return l === 'it' ? 'La tabella \u00ab' + m[1] + '\u00bb contiene un attributo senza nome.' : '\u8868\u300c' + m[1] + '\u300d\u91cc\u6709\u7a7a\u540d\u5c5e\u6027\u3002'; }],
    [/^Table "(.+)": attribute "(.+)" is duplicated\.$/, function (m, l) { return l === 'it' ? 'Tabella \u00ab' + m[1] + '\u00bb: attributo \u00ab' + m[2] + '\u00bb duplicato.' : '\u8868\u300c' + m[1] + '\u300d\uff1a\u5c5e\u6027\u300c' + m[2] + '\u300d\u91cd\u590d\u3002'; }],
    [/^Table "(.+)" has no primary key \(PK\) yet\.$/, function (m, l) { return l === 'it' ? 'La tabella \u00ab' + m[1] + '\u00bb non ha ancora una chiave primaria (PK).' : '\u8868\u300c' + m[1] + '\u300d\u8fd8\u6ca1\u6709\u4e3b\u952e\uff08PK\uff09\u3002'; }],
    [/^Table "(.+)": attribute "(.+)" does not exist in the ER entity\/relationship\. \(FK columns are exempt\.\)$/, function (m, l) { return l === 'it' ? 'Tabella \u00ab' + m[1] + '\u00bb: l\u2019attributo \u00ab' + m[2] + '\u00bb non esiste nell\u2019entit\u00e0/relazione ER (le colonne FK sono escluse).' : '\u8868\u300c' + m[1] + '\u300d\uff1a\u5c5e\u6027\u300c' + m[2] + '\u300d\u5728 ER \u5b9e\u4f53/\u5173\u7cfb\u91cc\u4e0d\u5b58\u5728\uff08FK \u5217\u4e0d\u53c2\u4e0e\u6bd4\u5bf9\uff09\u3002'; }],
    [/^Table "(.+)" is missing attribute "(.+)" from the ER model\.$/, function (m, l) { return l === 'it' ? 'Alla tabella \u00ab' + m[1] + '\u00bb manca l\u2019attributo \u00ab' + m[2] + '\u00bb del modello ER.' : '\u8868\u300c' + m[1] + '\u300d\u7f3a\u5c11 ER \u6a21\u578b\u91cc\u7684\u5c5e\u6027\u300c' + m[2] + '\u300d\u3002'; }],
    [/^The model has (\d+) names not present in the schema: (.+)\.$/, function (m, l) { return l === 'it' ? 'Il modello ha ' + m[1] + ' nomi non presenti nello schema: ' + m[2] + '.' : '\u6a21\u578b\u91cc\u6709 ' + m[1] + ' \u4e2a\u540d\u5b57\u672a\u51fa\u73b0\u5728\u6a21\u5f0f\u91cc\uff1a' + m[2] + '\u3002'; }],
    [/^No tables yet \u2014 press \+ Table or import a model\.$/, function (m, l) { return l === 'it' ? 'Nessuna tabella \u2014 premi + Table o importa un modello.' : '\u8fd8\u6ca1\u6709\u8868 \u2014 \u70b9\u300c+ Table\u300d\u6216\u5bfc\u5165\u4e00\u4e2a\u6a21\u578b\u3002'; }],
    [/^Errors: (\d+)(, (\d+) warnings)?$/, function (m, l) { return l === 'it' ? 'Errori: ' + m[1] + (m[3] ? ', ' + m[3] + ' avvisi' : '') : '\u9519\u8bef ' + m[1] + ' \u5904' + (m[3] ? '\uff0c\u8b66\u544a ' + m[3] + ' \u5904' : ''); }],
    [/^No errors, (\d+) warnings$/, function (m, l) { return l === 'it' ? 'Nessun errore, ' + m[1] + ' avvisi' : '\u6ca1\u6709\u9519\u8bef\uff0c\u8b66\u544a ' + m[1] + ' \u5904'; }],
    [/^Looks good \u2014 ready to export$/, function (m, l) { return l === 'it' ? 'Tutto ok \u2014 pronto da esportare' : '\u6ca1\u6709\u95ee\u9898 \u2014 \u53ef\u4ee5\u5bfc\u51fa\u4e86'; }]
  ];
  function patternTranslateEn(base) {
    for (var i = 0; i < PATTERNS_EN.length; i++) {
      var m = PATTERNS_EN[i][0].exec(base);
      if (m) return PATTERNS_EN[i][1](m, lang);
    }
    return null;
  }

  function patternTranslate(base) {
    for (var i = 0; i < PATTERNS.length; i++) {
      var m = PATTERNS[i][0].exec(base);
      if (m) return PATTERNS[i][1](m, lang);
    }
    return null;
  }

  function doText(node) {
    var skipped = skip(node);
    var raw = node.nodeValue;
    if (!raw || !/[^\s]/.test(raw)) return;
    if (!origText.has(node)) origText.set(node, raw);
    var base = origText.get(node);
    var out = base;
    {
      var isCJK = /[\u3400-\u9fff]/.test(base);
      var val = lookup(mapOf('texts'), base);
      if (val == null && !skipped && lang !== 'zh') val = patternTranslate(base.trim());
      if (val == null && !skipped && lang !== 'en' && !isCJK) val = patternTranslateEn(base.trim());
      if (val == null && !skipped && isCJK && base.trim().length >= 2) {
        var frag = fragReplace(base);
        if (frag !== base) val = frag;
      }
      if (val != null) {
        // 沿用原文的首尾空白，避免拼接处粘连
        var lead = /^\s*/.exec(base)[0];
        var trail = /\s*$/.exec(base)[0];
        out = val;
        if (lead) out = lead + out.replace(/^\s+/, '');
        if (trail) out = out.replace(/\s+$/, '') + trail;
      }
    }
    if (node.nodeValue !== out) node.nodeValue = out;
  }

  function doAttrs(el) {
    if (skip(el)) return;
    var map = mapOf('attrs');
    var saved = null;
    for (var i = 0; i < ATTRS.length; i++) {
      var name = ATTRS[i];
      if (!el.hasAttribute || !el.hasAttribute(name)) continue;
      if (!saved) {
        saved = origAttr.get(el);
        if (!saved) { saved = {}; origAttr.set(el, saved); }
      }
      var cur = el.getAttribute(name);
      if (!saved.hasOwnProperty(name)) saved[name] = cur;
      var base = saved[name];
      var out = base;
      {
        var v = lookup(map, base);
        if (v == null && /[\u3400-\u9fff]/.test(base) && base.trim().length <= 60) {
          var fa = fragReplace(base);
          if (fa !== base) v = fa;
        }
        if (v != null) out = v;
      }
      if (cur !== out) el.setAttribute(name, out);
    }
  }

  function walk(root) {
    if (!root) return;
    if (root.nodeType === 3) { doText(root); return; }
    if (root.nodeType !== 1) return;
    doAttrs(root);
    var child = root.firstChild;
    while (child) {
      var next = child.nextSibling;
      walk(child);
      child = next;
    }
  }

  function syncSwitch() {
    var btns = document.querySelectorAll('[data-lang]');
    for (var i = 0; i < btns.length; i++) {
      btns[i].classList.toggle('active', btns[i].getAttribute('data-lang') === lang);
      btns[i].setAttribute('aria-pressed', btns[i].getAttribute('data-lang') === lang ? 'true' : 'false');
    }
  }

  function setLang(next) {
    if (next !== 'zh' && next !== 'en' && next !== 'it') return;
    var reduce = false;
    try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { }
    if (!reduce) {
      document.body.classList.add('lang-switching');
      window.clearTimeout(setLang._timer);
    }
    lang = next;
    saveLang(lang);
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : (lang === 'it' ? 'it' : 'en');
    applying = true;
    try { walk(document.body); } finally { applying = false; }
    syncSwitch();
    if (!reduce) {
      setLang._timer = window.setTimeout(function () {
        document.body.classList.remove('lang-switching');
      }, 280);
    }
    try { window.dispatchEvent(new CustomEvent('ddb:lang', { detail: { lang: lang } })); } catch (e) { }
  }

  var stats = { scheduled: 0, waked: 0 };
  function schedule() {
    stats.scheduled += 1;
    if (scheduled || applying) return;
    scheduled = true;
    setTimeout(function () {
      scheduled = false;
      stats.waked += 1;
      applying = true;
      try { walk(document.body); } finally { applying = false; }
    });
  }

  function boot() {
    lang = readLang();
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : (lang === 'it' ? 'it' : 'en');
    applying = true;
    try { walk(document.body); } finally { applying = false; }
    syncSwitch();

    if (window.MutationObserver && document.body) {
      var mo = new MutationObserver(function () { schedule(); });
      mo.observe(document.body, { childList: true, subtree: true });
    }
    document.addEventListener('click', function (e) {
      var b = e.target && e.target.closest ? e.target.closest('[data-lang]') : null;
      if (!b) return;
      e.preventDefault();
      setLang(b.getAttribute('data-lang'));
    });
    window.DDB_I18N = {
      get lang() { return lang; },
      setLang: setLang,
      translate: function () { walk(document.body); },
      available: Object.keys(DICT).filter(function (k) { return k !== 'zh' && DICT[k] && DICT[k].texts; })
    };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
