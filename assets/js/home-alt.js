/* deepDB · Alt Shift-style homepage (home-alt.js)
   Static markup + scroll/pointer driven interactions. Mounted by app.js on #/ . */
(function () {
  'use strict';

  var TOOLS = [
    {
      key: 'er', route: '#/tools/er', name: 'designER',
      tag: 'RELATIONAL MODEL', year: 'FULL',
      meta: 'ENTITIES · ATTRIBUTES · GENERALISATION',
      desc: 'Draw the concept, then let the checks refactor it into a logical schema.',
      badge: 'ER'
    },
    {
      key: 'tr', route: '#/tools/translater', name: 'translatER',
      tag: 'SCHEMA TRANSLATION', year: 'ONE-CLICK',
      meta: 'ER → TABLES · PK / FK · VALIDATION',
      desc: 'Type the translation by hand or convert the whole ER model in one click.',
      badge: 'TR'
    },
    {
      key: 'noer', route: '#/tools/noer', name: 'noER',
      tag: 'DOCUMENT MODEL', year: 'SCHEMA',
      meta: 'COLLECTIONS · NESTING · REFERENCES',
      desc: 'Describe a document database with collections, fields and references.',
      badge: 'NO'
    },
    {
      key: 'ra', route: '#/tools/ra', name: 'designQT',
      tag: 'RELATIONAL ALGEBRA', year: 'BASIC',
      meta: 'σ π ρ ⋈ × ∪ ∩ − γ ÷',
      desc: 'Build an expression tree, infer output fields and export the expression.',
      badge: 'RA'
    }
  ];

  var CAPS = [
    ['ER MODELING', 'CANVAS', 'Entities, attributes, relationships and generalisations on an infinite canvas.'],
    ['AUTO CHECKS', 'VALIDATION', 'Every problem explains why it matters and jumps to the element.'],
    ['LOGICAL SCHEMA', 'REFACTOR', 'Weak entities, ISA and multi-valued attributes become clean tables.'],
    ['DOCUMENT MODELS', 'NOER', 'Collections, nested objects, arrays and references with JSON Schema export.'],
    ['RELATIONAL ALGEBRA', 'DESIGNQT', 'σ π ρ ⋈ × ∪ ∩ − γ ÷ in a visual expression tree.'],
    ['ONE-CLICK TRANSLATION', 'TRANSLATER', 'Turn the finished ER model into relational schema text.'],
    ['THREE LANGUAGES', 'I18N', 'Chinese, English and Italiano — switch without losing the model.'],
    ['DARK / LIGHT', 'THEME', 'Two themes, one system follow, and a radial reveal in between.']
  ];

  var TECHS = ['PostgreSQL', 'MySQL', 'SQLite', 'JSON Schema', 'MongoDB', 'Mongoose', 'Prisma', 'Supabase', 'Figma', 'Git'];

  var REEL = [
    { k: 'er', label: 'ENTITY', html: '<div class="ah-mini er"><span class="ahm-tag">ENTITY</span><b>Student( sid, sname, dept )</b><span class="ahm-row"><i class="ahm-pk">PK</i> sid</span><span class="ahm-row"><i class="ahm-b">U</i> sname</span></div>' },
    { k: 'tr', label: 'SCHEMA', html: '<div class="ah-mini tr"><span class="ahm-tag">RELATIONAL SCHEMA</span><b>STUDENT (sid(PK), sname, dept)</b><b>COURSE (cid(PK), title)</b><b>ENROLLS (sid(PK), cid(PK), grade)</b></div>' },
    { k: 'noer', label: 'COLLECTION', html: '<div class="ah-mini no"><span class="ahm-tag">COLLECTION · users</span><span class="ahm-row">id · objectId</span><span class="ahm-row">email · string</span><span class="ahm-row">profile · object</span></div>' },
    { k: 'ra', label: 'ALGEBRA', html: '<div class="ah-mini ra"><span class="ahm-tag">RELATIONAL ALGEBRA</span><b>π sname, dept (σ score &gt; 90 (Student ⋈ Enrolls))</b><span class="ahm-row">output: sname, dept</span></div>' }
  ];

  var mq = function (items, cls) {
    var line = items.map(function (t, i) {
      return '<span>' + t + '</span><i class="ah-star" aria-hidden="true">✳</i>';
    }).join('');
    return '<div class="ah-mq ' + cls + '"><div class="ah-mq-in">' + line + line + '</div></div>';
  };

  function html() {
    var slides = TOOLS.map(function (t, i) {
      return '' +
        '<a class="ah-slide" href="' + t.route + '" data-tool="' + t.key + '" data-idx="' + i + '">' +
          '<div class="ah-slide-copy">' +
            '<span class="ah-slide-idx">0' + (i + 1) + '</span>' +
            '<h3 class="ah-slide-name" data-i18n-skip>' + t.name + '</h3>' +
            '<div class="ah-slide-meta"><span>' + t.tag + '</span><span>' + t.year + '</span></div>' +
            '<p class="ah-slide-desc">' + t.desc + '</p>' +
            '<span class="ah-slide-open">OPEN <i>↗</i></span>' +
          '</div>' +
          '<div class="ah-slide-visual"><div class="ah-slide-window">' +
            '<div class="ah-winbar"><i></i><i></i><i></i><span>' + t.name + ' · preview</span></div>' +
            '<div class="ah-winbody">' + REEL[i].html.replace(/class="ah-mini [a-z]+"/, 'class="ah-mini ' + t.key + '"') + '</div>' +
          '</div></div>' +
        '</a>';
    }).join('');

    var caps = CAPS.map(function (r, i) {
      var mark = String.fromCharCode(97 + i) + '.';
      return '<div class="ah-cap ah-reveal">' +
        '<span class="ah-cap-a">' + r[0] + '</span>' +
        '<span class="ah-cap-b">' + r[1] + '</span>' +
        '<span class="ah-cap-c">(' + mark + ')</span>' +
        '<span class="ah-cap-d">' + r[2] + '</span>' +
      '</div>';
    }).join('');

    var tech = TECHS.map(function (t) { return '<span>' + t + '</span><i>✳</i>'; }).join('');

    var words = [
      ['ER', 'DRAW IT', '#/tools/er'],
      ['SCHEMAS', 'REFACTOR IT', '#/tools/er'],
      ['DOCUMENTS', 'MODEL IT', '#/tools/noer'],
      ['ALGEBRA', 'QUERY IT', '#/tools/ra']
    ].map(function (w) {
      return '<a class="ah-service" href="' + w[2] + '"><span class="ah-service-word">' + w[0] + '</span><span class="ah-service-sub">' + w[1] + '</span></a>';
    }).join('');

    var keys = ['D', 'D', 'B'].map(function (c, i) {
      return '<span class="ah-key" data-k="' + i + '"><span>' + c + '</span></span>';
    }).join('');

    return '' +
    '<div class="althome" id="althome">' +
      '<nav class="ah-nav">' +
        '<div class="ah-nav-left">' +
          '<a class="ah-pill" href="#/tools/er"><span>Let\'s build</span><i class="ah-arrow">↗</i></a>' +
          '<a class="ah-round" href="#/lab" aria-label="Motion lab">↻</a>' +
        '</div>' +
        '<a class="ah-mark" href="#/" aria-label="deepDB home"><span>DB</span></a>' +
        '<div class="ah-nav-right">' +
          '<button class="ah-pill ah-menu" data-menu-trigger aria-haspopup="dialog"><span>Menu</span><i class="ah-dots"><b></b><b></b></i></button>' +
        '</div>' +
      '</nav>' +

      '<section class="ah-hero" data-sec="hero">' +
        '<div class="ah-hero-sticky">' +
          '<div class="ah-hero-bg"></div><div class="ah-grain" aria-hidden="true"></div>' +
          '<div class="ah-hero-orbit" aria-hidden="true"><i></i><i></i><i></i></div>' +
          '<h1 class="ah-word" data-i18n-skip>DEEP<span class="ah-word-dot">.</span>DB</h1>' +
          '<div class="ah-hero-meta">' +
            '<span class="ah-tiny">RELATIONAL · DOCUMENT · ALGEBRA</span>' +
            '<span class="ah-tiny">EST. 2026 — IN THE BROWSER</span>' +
          '</div>' +
          '<div class="ah-reel" aria-hidden="true">' +
            REEL.map(function (r, i) {
              return '<figure class="ah-frame' + (i === 0 ? ' on' : '') + '" data-frame="' + i + '">' + r.html + '</figure>';
            }).join('') +
            '<div class="ah-reel-label"><span id="ahReelLabel">' + REEL[0].label + '</span><i>0</i></div>' +
          '</div>' +
          '<div class="ah-tagline">' +
            '<strong>Database design studio</strong>' +
            '<em>for models ready to ship</em>' +
          '</div>' +
          '<div class="ah-scroll"><span>SCROLL</span><i></i></div>' +
        '</div>' +
      '</section>' +

      '<section class="ah-marquee" data-sec="marquee">' +
        '<div class="ah-info">' +
          '<span>IN THE BROWSER</span>' +
          '<span class="ah-clock" id="ahClock">00:00:00</span>' +
          '<span>NO INSTALL — NO UPLOAD</span>' +
        '</div>' +
        mq(['SKETCH IT.', 'CHECK IT.', 'SHIP IT.'], 'ah-mq-1') +
        mq(['ER.', 'SCHEMAS.', 'DOCUMENTS.', 'ALGEBRA.'], 'ah-mq-2') +
        '<span class="ah-sec-label">( THE WORKFLOW )</span>' +
      '</section>' +

      '<section class="ah-works" data-sec="works">' +
        '<div class="ah-works-sticky">' +
          '<a class="ah-pill ah-pill-ghost ah-see" href="#/tools/er"><span>SEE ALL TOOLS</span><i>↗</i></a>' +
          '<div class="ah-slides">' + slides + '</div>' +
          '<div class="ah-work-foot"><span id="ahWorkIdx">01</span><i>/</i><span>04</span><b class="ah-work-bar"><i id="ahWorkBar"></i></b></div>' +
        '</div>' +
      '</section>' +

      '<section class="ah-statement" data-sec="statement">' +
        '<div class="ah-statement-sticky">' +
          '<div class="ah-halftone" aria-hidden="true">' +
            '<span data-line="0"><i class="ah-hw">MODELS</i> <i class="ah-hw">DRIFT.</i></span>' +
            '<span data-line="1"><i class="ah-hw">SCHEMAS</i> <i class="ah-hw">ALIGN.</i></span>' +
            '<span data-line="2"><i class="ah-hw">DEEP.DB</i> <i class="ah-hw">MAKES</i></span>' +
            '<span data-line="3"><i class="ah-hw">THEM</i> <i class="ah-hw">TALK.</i></span>' +
          '</div>' +
          '<div class="ah-objs" aria-hidden="true">' +
            '<div class="ah-obj ah-obj-1"><span>ENTITY</span><b>Student( sid, sname, dept )</b><i>PK · sid</i></div>' +
            '<div class="ah-obj ah-obj-2"><span>SCHEMA</span><b>STUDENT (sid(PK), sname, dept)</b><i>5 tables · 3 FKs</i></div>' +
            '<div class="ah-obj ah-obj-3"><span>ALGEBRA</span><b>π sname (σ dept = CS (Student))</b><i>output: sname</i></div>' +
          '</div>' +
        '</div>' +
      '</section>' +

      '<section class="ah-capssec">' +
        '<div class="ah-caps">' +
          '<span class="ah-sec-label">( CAPABILITIES )</span>' +
          caps +
        '</div>' +
      '</section>' +

      '<section class="ah-clients" data-sec="clients">' +
        '<span class="ah-sec-label">( BUILT ON / EXPORTS TO )</span>' +
        '<div class="ah-tech"><div class="ah-tech-in">' + tech + tech + '</div></div>' +
      '</section>' +

      '<section class="ah-services" data-sec="services">' +
        '<div class="ah-services-sticky">' +
          '<span class="ah-sec-label">( TOOLS )</span>' +
          '<div class="ah-service-words">' + words + '</div>' +
        '</div>' +
      '</section>' +

      '<footer class="ah-footer" data-sec="footer">' +
        '<div class="ah-cross" aria-hidden="true"></div>' +
        '<div class="ah-coords">X : <span id="ahX">000</span> Y : <span id="ahY">000</span></div>' +
        '<div class="ah-hello">' +
          '<div class="ah-hello-mail" data-i18n-skip>HELLO@<br>DEEPDB.APP</div>' +
          '<em class="ah-hello-sub">Let\'s build the next model</em>' +
        '</div>' +
        '<div class="ah-keys" aria-hidden="true">' + keys + '</div>' +
        '<div class="ah-fcols">' +
          '<div><h4>OUR LINKS</h4><a href="#/">HOME</a><a href="#/tools/er">DESIGNER</a><a href="#/tools/translater">TRANSLATER</a><a href="#/tools/noer">NOER</a><a href="#/tools/ra">DESIGNQT</a></div>' +
          '<div><h4>MORE</h4><a href="#/lab">MOTION LAB</a><a href="#/about">ABOUT</a><a href="https://github.com/NyxKy-N/deepDB" target="_blank" rel="noopener">GITHUB</a><a href="README.md" target="_blank" rel="noopener">README</a></div>' +
          '<div><h4>CONTACT</h4><a href="https://github.com/NyxKy-N/deepDB" target="_blank" rel="noopener">GITHUB / NYXKY-N</a><a href="#/" data-alt-settings>SETTINGS</a><a href="https://www.deepseek.com" target="_blank" rel="noopener">HELPER · DEEPSEEK</a></div>' +
        '</div>' +
        '<div class="ah-copy"><span>© 2026 DEEPDB®</span><span class="ah-copy-r">MODELS DESIGNED DIFFERENTLY</span></div>' +
      '</footer>' +
    '</div>';
  }

  var STOPS = [
    [233, 228, 216],
    [243, 183, 160],
    [238, 116, 142],
    [204, 138, 233],
    [151, 111, 226]
  ];
  function mix(a, b, t) {
    return 'rgb(' + Math.round(a[0] + (b[0] - a[0]) * t) + ',' + Math.round(a[1] + (b[1] - a[1]) * t) + ',' + Math.round(a[2] + (b[2] - a[2]) * t) + ')';
  }
  function grad(stops, p) {
    var n = stops.length - 1;
    var x = Math.max(0, Math.min(n - 0.0001, p * n));
    var i = Math.floor(x);
    var t = x - i;
    var c1 = mix(stops[i], stops[i + 1], t);
    var j = Math.min(n, i + 1);
    var k = Math.min(n, j + 1);
    var c2 = mix(stops[j], stops[k], t);
    return 'linear-gradient(178deg,' + c1 + ' 0%,' + c2 + ' 100%)';
  }

  function mount(root) {
    var body = document.body;
    var vh = window.innerHeight;
    var latestY = window.scrollY;
    var raf = 0;
    var clockTimer = 0;
    var io = null;
    var deskStop = null;

    var hero = root.querySelector('.ah-hero');
    var heroBg = root.querySelector('.ah-hero-bg');
    var word = root.querySelector('.ah-word');
    var frames = Array.prototype.slice.call(root.querySelectorAll('.ah-frame'));
    var reelLabel = root.querySelector('#ahReelLabel');
    var works = root.querySelector('.ah-works');
    var slides = Array.prototype.slice.call(root.querySelectorAll('.ah-slide'));
    var workIdxEl = root.querySelector('#ahWorkIdx');
    var workBar = root.querySelector('#ahWorkBar');
    var statement = root.querySelector('.ah-statement');
    var lines = Array.prototype.slice.call(root.querySelectorAll('.ah-halftone span'));
    var hwords = Array.prototype.slice.call(root.querySelectorAll('.ah-hw'));
    var objs = Array.prototype.slice.call(root.querySelectorAll('.ah-obj'));
    var services = root.querySelector('.ah-services');
    var serviceEls = Array.prototype.slice.call(root.querySelectorAll('.ah-service'));
    var footer = root.querySelector('.ah-footer');
    var xEl = root.querySelector('#ahX');
    var yEl = root.querySelector('#ahY');
    var clockEl = root.querySelector('#ahClock');
    var keys = Array.prototype.slice.call(root.querySelectorAll('.ah-key'));
    var reel = root.querySelector('.ah-reel');

    function clamp(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
    function progress(el, offset) {
      if (!el) return 0;
      var r = el.getBoundingClientRect();
      var span = el.offsetHeight - vh;
      if (span <= 0) return clamp((offset || 0) - r.top / vh);
      return clamp(((offset || 0) - r.top) / span);
    }

    function frame(p) {
      var n = frames.length;
      var idx = Math.min(n - 1, Math.floor(p * n + 0.15));
      for (var i = 0; i < n; i++) frames[i].classList.toggle('on', i === idx);
      if (reelLabel) reelLabel.textContent = REEL[idx].label;
    }

    function paint() {
      raf = 0;
      var y = window.scrollY;
      var vh2 = window.innerHeight;
      if (vh2 !== vh) { vh = vh2; }
      /* hero */
      var heroH = hero.offsetHeight;
      var hp = clamp(y / Math.max(1, heroH - vh));
      var stops = STOPS;
      if (heroBg) heroBg.style.background = grad(stops, hp * 0.9);
      if (word) {
        word.style.transform = 'translate3d(0,' + (-hp * 14) + 'vh,0)';
        word.style.opacity = String(1 - hp * 0.25);
      }
      if (reel) frame(clamp(y / Math.max(1, heroH * 0.9)));

      /* works */
      var wr = works.getBoundingClientRect();
      var wp = clamp((y - (works.offsetTop - vh * 0.15)) / Math.max(1, works.offsetHeight - vh));
      var wi = Math.min(3, Math.floor(wp * 4 + 0.0001));
      for (var i = 0; i < slides.length; i++) {
        var d = i - wi;
        slides[i].classList.toggle('on', d === 0);
        slides[i].classList.toggle('past', d < 0);
        slides[i].style.setProperty('--d', String(d));
      }
      if (workIdxEl) workIdxEl.textContent = '0' + (wi + 1);
      if (workBar) workBar.style.transform = 'scaleX(' + (0.25 + wp * 0.75) + ')';

      /* statement */
      var sr = statement.getBoundingClientRect();
      var sp = clamp((vh - sr.top) / (vh + sr.height * 0.35));
      lines.forEach(function (ln, i) {
        var t = clamp((sp - i * 0.09) * 2.6);
        ln.style.setProperty('--ha', String(0.35 + t * 0.65));
      });
      hwords.forEach(function (w, i) {
        var t = clamp((sp - i * 0.075) * 3.4);
        w.style.opacity = String(0.06 + t * 0.94);
        w.style.transform = 'translate3d(0,' + (1 - t) * 34 + 'px,0)';
      });
      objs.forEach(function (o, i) {
        var t = clamp(sp * 1.2);
        o.style.transform = 'translate3d(0,' + (1 - t) * (60 + i * 20) + 'px,0)';
        o.style.opacity = String(0.25 + t * 0.75);
      });

      /* services */
      var svr = services.getBoundingClientRect();
      var svp = clamp((vh - svr.top) / (vh + svr.height * 0.4));
      var si = Math.min(serviceEls.length - 1, Math.floor(svp * serviceEls.length + 0.0001));
      serviceEls.forEach(function (el, i) {
        el.style.setProperty('--o', i === si ? '1' : '0.24');
      });

      /* footer keys parallax handled by pointer */
    }

    function onScroll() {
      latestY = window.scrollY;
      if (!raf) raf = requestAnimationFrame(paint);
    }

    function pad(n) { return ('00' + n).slice(-3); }
    function onMove(e) {
      var x = e.clientX, y = e.clientY;
      if (xEl) xEl.textContent = pad(x);
      if (yEl) yEl.textContent = pad(y);
      var nx = (x / window.innerWidth - 0.5);
      var ny = (y / window.innerHeight - 0.5);
      if (reel) reel.style.setProperty('--mx', (nx * 10).toFixed(2) + 'px');
      if (reel) reel.style.setProperty('--my', (ny * 8).toFixed(2) + 'px');
      keys.forEach(function (k, i) {
        var f = 1 + i * 0.35;
        k.style.transform = 'translate3d(' + (nx * 18 * f).toFixed(1) + 'px,' + (ny * 14 * f).toFixed(1) + 'px,0) rotate(' + (nx * 6 * f).toFixed(1) + 'deg)';
      });
    }

    function tickClock() {
      if (!clockEl) return;
      var d = new Date();
      var p = function (n) { return ('0' + n).slice(-2); };
      clockEl.textContent = p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
    }

    /* reveal caps rows */
    if (window.IntersectionObserver) {
      io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
        });
      }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });
      Array.prototype.forEach.call(root.querySelectorAll('.ah-reveal'), function (el) { io.observe(el); });
    } else {
      Array.prototype.forEach.call(root.querySelectorAll('.ah-reveal'), function (el) { el.classList.add('in'); });
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    window.addEventListener('pointermove', onMove, { passive: true });
    tickClock();
    clockTimer = setInterval(tickClock, 1000);
    onScroll();
    paint();

    return function unmount() {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      window.removeEventListener('pointermove', onMove);
      clearInterval(clockTimer);
      if (raf) cancelAnimationFrame(raf);
      if (io) io.disconnect();
      document.documentElement.style.removeProperty('--ah-scroll');
    };
  }

  window.DDB_HOMEALT = { html: html, mount: mount };
})();
