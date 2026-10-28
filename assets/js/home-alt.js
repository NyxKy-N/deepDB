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
    ['ONE-PAGE TOOLS', 'OFFLINE', 'Four tools in one static page — no build step, no upload.']
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
        '</div>' +
        '<a class="ah-mark" href="#/" aria-label="deepDB home"><span>DB</span></a>' +
        '<div class="ah-nav-right">' +
          '<div class="ah-menu-wrap" data-ahmenu>' +
            '<a class="ah-menu-link" href="#works" data-ah-scroll="works"><span>Works</span><i>↗</i></a>' +
            '<a class="ah-menu-link" href="#/about"><span>Contact</span><i>↗</i></a>' +
            '<button class="ah-pill ah-menu" data-ahmenu-toggle aria-expanded="false" aria-haspopup="menu"><span>Menu</span><i class="ah-dots"><b></b><b></b></i></button>' +
          '</div>' +
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

      '<section class="ah-works" id="works" data-sec="works">' +
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
          '<div><h4>MORE</h4><a href="#/about">ABOUT</a><a href="https://github.com/NyxKy-N/deepDB" target="_blank" rel="noopener">GITHUB</a><a href="README.md" target="_blank" rel="noopener">README</a></div>' +
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
    var copyEl = root.querySelector('.ah-copy');

    function clamp(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

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
      var stTop = statement.offsetTop;
      var sp = clamp((y - stTop) / Math.max(1, statement.offsetHeight - vh));
      lines.forEach(function (ln, i) {
        var t = clamp((sp - i * 0.09) * 2.6);
        ln.style.setProperty('--ha', String(0.35 + t * 0.65));
      });
      hwords.forEach(function (w, i) {
        var step = 0.78 / Math.max(1, hwords.length - 1);
        var t = clamp((sp - i * step) / 0.085);
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
    }

    /* m12924 — keycap physics: gravity, drag, collisions */
    function setupKeyPhysics() {
      if (!keys.length || !footer || !copyEl) return null;
      var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
      var bodies = [];
      var byEl = [];
      var raf2 = 0, last = 0, loopOn = false, started = false;
      var io2 = null, drag = null;
      var W = 0, H = 0, floorY = 0, wallL = 0, wallR = 0;
      var G = 2600, REST = 0.34, WALLS = 0.42;
      var ANGLES = [-9, 3, -4];
      var RADIUS_FACTOR = 0.70711;
      var MAX_SPIN = 420;

      function radiusOf(size) { return Math.max(24, size * RADIUS_FACTOR); }
      function refreshRadius(b) {
        b.size = b.el.offsetWidth || b.size;
        b.r = radiusOf(b.size);
      }
      function clampSpin(v) { return Math.max(-MAX_SPIN, Math.min(MAX_SPIN, v)); }

      function metrics() {
        W = footer.clientWidth;
        H = footer.clientHeight;
        wallL = W * 0.54;
        wallR = W - W * 0.03 - 8;
        floorY = (copyEl.offsetTop || H - 90) - 20;
        if (floorY < H * 0.4) floorY = H * 0.4;
      }

      function clampBody(b) {
        b.x = Math.max(wallL + b.r, Math.min(wallR - b.r, b.x));
        if (b.y > floorY - b.size / 2) b.y = floorY - b.size / 2;
        if (b.y < b.size / 2) b.y = b.size / 2;
      }

      function paintBody(b) {
        b.el.style.transform = 'translate3d(' + (b.x - b.size / 2).toFixed(2) + 'px,' + (b.y - b.size / 2).toFixed(2) + 'px,0) rotate(' + b.ang.toFixed(2) + 'deg)';
      }

      function makeBody(el, i) {
        var w = el.offsetWidth || 100;
        var b = { el: el, size: w, r: radiusOf(w), ang: ANGLES[i % ANGLES.length], av: [-26, 22, -18][i % 3], x: 0, y: 0, vx: 0, vy: 0, drag: false, sleep: 0 };
        byEl.push({ el: el, b: b });
        bodies.push(b);
        return b;
      }

      function layoutInitial() {
        metrics();
        var gap = 14;
        bodies.forEach(refreshRadius);
        var cx = wallR - bodies[bodies.length - 1].r - 2;
        for (var i = bodies.length - 1; i >= 0; i--) {
          var b = bodies[i];
          b.x = cx;
          b.y = Math.max(b.r + 6, H * (0.18 + i * 0.055));
          b.vx = 0; b.vy = 0; b.sleep = 0; b.ang = ANGLES[i % ANGLES.length];
          clampBody(b);
          paintBody(b);
          if (i > 0) cx -= (bodies[i].r + bodies[i - 1].r + gap);
        }
      }

      function restInitial() {
        metrics();
        var gap = 14;
        bodies.forEach(refreshRadius);
        var cx = wallR - bodies[bodies.length - 1].r - 2;
        for (var i = bodies.length - 1; i >= 0; i--) {
          var b = bodies[i];
          b.x = cx; b.y = floorY - b.size / 2; b.vx = 0; b.vy = 0; b.av = 0; b.ang = ANGLES[i % ANGLES.length];
          clampBody(b); paintBody(b);
          if (i > 0) cx -= (bodies[i].r + bodies[i - 1].r + gap);
        }
      }

      function wake(b) { b.sleep = 0; }

      function solvePair(a, b) {
        var dx = b.x - a.x, dy = b.y - a.y;
        var min = a.r + b.r;
        var d2 = dx * dx + dy * dy;
        if (d2 >= min * min) return false;
        if (d2 < 0.0001) { dx = 1; dy = 0; d2 = 1; }
        var d = Math.sqrt(d2);
        var nx = dx / d, ny = dy / d;
        var overlap = min - d;
        var am = a.drag ? 0 : 1, bm = b.drag ? 0 : 1;
        var sum = am + bm;
        if (!sum) return false;
        a.x -= nx * overlap * (am / sum); a.y -= ny * overlap * (am / sum);
        b.x += nx * overlap * (bm / sum); b.y += ny * overlap * (bm / sum);
        var rvn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (rvn < 0) {
          var j = -(1 + REST) * rvn / sum;
          if (am) { a.vx -= j * nx; a.vy -= j * ny; }
          if (bm) { b.vx += j * nx; b.vy += j * ny; }
          if (am) a.av = clampSpin(a.av - rvn * 0.09);
          if (bm) b.av = clampSpin(b.av + rvn * 0.09);
        }
        return true;
      }


      function step(now) {
        raf2 = 0;
        var t = Math.min(0.032, Math.max(0.008, (now - last) / 1000 || 0.016));
        last = now;
        var active = false;
        bodies.forEach(function (b) {
          if (b.drag) { active = true; return; }
          b.vy += G * t;
          b.ang += b.av * t;
          b.av *= Math.max(0, 1 - 0.5 * t);
          b.x += b.vx * t;
          b.y += b.vy * t;
          if (b.y >= floorY - b.size / 2) {
            b.y = floorY - b.size / 2;
            if (b.vy > 90) {
              b.vy = -b.vy * REST;
              b.av = clampSpin(b.av + b.vx * 0.04);
            } else { b.vy = 0; }
            b.vx *= Math.pow(0.0009, t);
            b.av *= Math.pow(0.03, t);
            if (Math.abs(b.vx) < 6) b.vx = 0;
            if (Math.abs(b.av) < 6) b.av = 0;
          }
          if (b.x <= wallL + b.r) { b.x = wallL + b.r; if (b.vx < 0) b.vx = -b.vx * WALLS; b.av = -b.av * 0.5; }
          if (b.x >= wallR - b.r) { b.x = wallR - b.r; if (b.vx > 0) b.vx = -b.vx * WALLS; b.av = -b.av * 0.5; }
          if (b.y <= b.size / 2 && b.vy < 0) { b.y = b.size / 2; b.vy = 0; }
        });
        for (var it = 0; it < 5; it++) {
          for (var i = 0; i < bodies.length; i++) {
            for (var j = i + 1; j < bodies.length; j++) solvePair(bodies[i], bodies[j]);
          }
          bodies.forEach(clampBody);
        }
        bodies.forEach(function (b) {
          paintBody(b);
          var speed = Math.abs(b.vx) + Math.abs(b.vy);
          if (!b.drag && speed < 9 && Math.abs(b.av) < 7 && b.y >= floorY - b.size / 2 - 0.6) {
            b.sleep += t;
            b.vx = 0; b.vy = 0; b.av = 0;
          } else {
            b.sleep = 0;
            active = true;
          }
        });
        if (drag) active = true;
        if (active) raf2 = requestAnimationFrame(step); else loopOn = false;
      }

      function start() {
        if (loopOn) return;
        loopOn = true;
        last = performance.now();
        raf2 = requestAnimationFrame(step);
      }

      function stop() {
        if (raf2) cancelAnimationFrame(raf2);
        raf2 = 0;
        loopOn = false;
      }

      function onDown(e) {
        if (e.button !== undefined && e.button !== 0) return;
        var rec = null;
        for (var i = 0; i < byEl.length; i++) { if (byEl[i].el === e.currentTarget) rec = byEl[i]; }
        if (!rec) return;
        e.preventDefault();
        e.stopPropagation();
        var b = rec.b;
        var r = footer.getBoundingClientRect();
        b.drag = true;
        b.sleep = 0;
        b.el.classList.add('is-dragging');
        if (b.el.setPointerCapture) { try { b.el.setPointerCapture(e.pointerId); } catch (err) {} }
        drag = {
          b: b,
          id: e.pointerId,
          dx: e.clientX - r.left - b.x,
          dy: e.clientY - r.top - b.y,
          lx: e.clientX, ly: e.clientY, lt: performance.now(), vx: 0, vy: 0
        };
        window.addEventListener('pointermove', onDragMove, { passive: false });
        window.addEventListener('pointerup', onUp);
        start();
      }

      function onDragMove(e) {
        if (!drag) return;
        e.preventDefault();
        var r = footer.getBoundingClientRect();
        var b = drag.b;
        var nx = e.clientX - r.left - drag.dx;
        var ny = e.clientY - r.top - drag.dy;
        var beforeX = b.x;
        b.x = Math.max(wallL + b.r, Math.min(wallR - b.r, nx));
        b.y = Math.max(b.size / 2, Math.min(floorY - b.size / 2, ny));
        var ddx = b.x - beforeX;
        b.ang += ddx * 0.55;
        drag.spin = (drag.spin || 0) * 0.7 + ddx * 0.4;
        var now = performance.now();
        var dt = Math.max(8, now - drag.lt);
        drag.vx = (e.clientX - drag.lx) / dt * 1000;
        drag.vy = (e.clientY - drag.ly) / dt * 1000;
        drag.lx = e.clientX; drag.ly = e.clientY; drag.lt = now;
        for (var pass = 0; pass < 60; pass++) {
          var moved = false;
          for (var i = 0; i < bodies.length; i++) {
            for (var j = i + 1; j < bodies.length; j++) {
              if (solvePair(bodies[i], bodies[j])) moved = true;
            }
          }
          for (var k = 0; k < bodies.length; k++) if (bodies[k] !== b) clampBody(bodies[k]);
          for (var m = 0; m < bodies.length; m++) {
            var o = bodies[m];
            if (o === b) continue;
            var ox = b.x - o.x, oy = b.y - o.y, need = b.r + o.r;
            var od = Math.sqrt(ox * ox + oy * oy) || 0.01;
            if (od < need) {
              b.x += (ox / od) * (need - od);
              b.y += (oy / od) * (need - od);
              moved = true;
            }
          }
          clampBody(b);
          if (!moved) break;
        }
        var others = [];
        for (var q = 0; q < bodies.length; q++) if (bodies[q] !== b) others.push(bodies[q]);
        others.sort(function (p, q) { return p.x - q.x; });
        for (var qi = 0; qi < others.length - 1; qi++) {
          var left = others[qi], right = others[qi + 1];
          var needLR = left.r + right.r;
          if (right.x - left.x < needLR) {
            right.x = Math.min(wallR - right.r, left.x + needLR);
            clampBody(right);
            if (right.x - left.x < needLR) {
              left.x = Math.max(wallL + left.r, right.x - needLR);
              clampBody(left);
            }
          }
        }
        var squeeze = false;
        for (var oi = 0; oi < bodies.length; oi++) {
          var ob = bodies[oi];
          if (ob === b) continue;
          var ox3 = b.x - ob.x, oy3 = b.y - ob.y;
          if (ox3 * ox3 + oy3 * oy3 < (b.r + ob.r) * (b.r + ob.r)) { squeeze = true; break; }
        }
        if (squeeze && others.length) {
          if (b.x >= others[others.length - 1].x) {
            b.x = Math.max(b.x, others[others.length - 1].x + b.r + others[others.length - 1].r);
          } else if (b.x <= others[0].x) {
            b.x = Math.min(b.x, others[0].x - b.r - others[0].r);
          } else {
            var midX = (others[0].x + others[others.length - 1].x) / 2;
            if (b.x >= midX) {
              b.x = Math.max(b.x, others[others.length - 1].x + b.r + others[others.length - 1].r);
            } else {
              b.x = Math.min(b.x, others[0].x - b.r - others[0].r);
            }
          }
          clampBody(b);
        }
        bodies.forEach(paintBody);
        bodies.forEach(function (o) { if (o !== b) o.sleep = 0; });
        start();
      }

      function onUp() {
        if (!drag) return;
        var b = drag.b;
        b.drag = false;
        b.el.classList.remove('is-dragging');
        b.vx = Math.max(-1400, Math.min(1400, drag.vx * 0.55));
        b.vy = Math.max(-1400, Math.min(1400, drag.vy * 0.55));
        b.av = clampSpin(b.av + (drag.spin || 0) * 1.15);
        if (b.el.releasePointerCapture) { try { b.el.releasePointerCapture(drag.id); } catch (err) {} }
        drag = null;
        window.removeEventListener('pointermove', onDragMove);
        window.removeEventListener('pointerup', onUp);
        start();
      }

      function onResize() {
        metrics();
        bodies.forEach(function (b) { refreshRadius(b); clampBody(b); paintBody(b); });
        start();
      }

      keys.forEach(function (el, i) {
        var b = makeBody(el, i);
        el.addEventListener('pointerdown', onDown);
        el.style.cursor = 'grab';
      });
      layoutInitial();
      if (reduce) { restInitial(); return function () { keys.forEach(function (el) { el.removeEventListener('pointerdown', onDown); }); }; }

      if (window.IntersectionObserver) {
        io2 = new IntersectionObserver(function (entries) {
          entries.forEach(function (en) {
            if (!started && en.isIntersecting) {
              started = true;
              bodies.forEach(wake);
              start();
            }
          });
        }, { threshold: 0.08 });
        io2.observe(footer);
      } else {
        started = true;
        start();
      }
      window.addEventListener('resize', onResize);

      return function () {
        stop();
        if (io2) { io2.disconnect(); io2 = null; }
        window.removeEventListener('resize', onResize);
        window.removeEventListener('pointermove', onDragMove);
        window.removeEventListener('pointerup', onUp);
        keys.forEach(function (el) { el.removeEventListener('pointerdown', onDown); });
      };
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

    /* in-pill home menu: Works / Contact unfold inside the same capsule */
    var ahWrap = root.querySelector('[data-ahmenu]');
    var ahBtn = ahWrap && ahWrap.querySelector('[data-ahmenu-toggle]');
    function setAhMenu(open) {
      if (!ahWrap) return;
      ahWrap.classList.toggle('open', open);
      if (ahBtn) ahBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
    function onAhDocClick(e) {
      if (!ahWrap || !ahWrap.classList.contains('open')) return;
      if (!e.target.closest('[data-ahmenu]')) setAhMenu(false);
    }
    function onAhKey(e) { if (e.key === 'Escape') setAhMenu(false); }
    if (ahWrap) {
      ahWrap.addEventListener('pointerenter', function (e) { if (e.pointerType !== 'touch') setAhMenu(true); });
      ahWrap.addEventListener('pointerleave', function (e) { if (e.pointerType !== 'touch') setAhMenu(false); });
      if (ahBtn) ahBtn.addEventListener('click', function (e) {
        e.preventDefault(); e.stopPropagation();
        setAhMenu(!ahWrap.classList.contains('open'));
      });
      ahWrap.addEventListener('click', function (e) {
        var trg = e.target.closest('[data-ah-scroll]');
        if (trg) {
          e.preventDefault();
          var sec = document.getElementById(trg.getAttribute('data-ah-scroll'));
          if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
          setAhMenu(false);
        }
      });
      document.addEventListener('click', onAhDocClick);
      document.addEventListener('keydown', onAhKey);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    window.addEventListener('pointermove', onMove, { passive: true });
    tickClock();
    clockTimer = setInterval(tickClock, 1000);
    onScroll();
    paint();
    var keyPhys = setupKeyPhysics();

    return function unmount() {
      if (ahWrap) {
        document.removeEventListener('click', onAhDocClick);
        document.removeEventListener('keydown', onAhKey);
        setAhMenu(false);
      }
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      window.removeEventListener('pointermove', onMove);
      clearInterval(clockTimer);
      if (keyPhys) keyPhys();
      if (raf) cancelAnimationFrame(raf);
      if (io) io.disconnect();
      document.documentElement.style.removeProperty('--ah-scroll');
    };
  }

  window.DDB_HOMEALT = { html: html, mount: mount };
})();
