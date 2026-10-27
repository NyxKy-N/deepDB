(function () {
  'use strict';

  var ATTRS = ['student_id', 'name', 'email', 'birth_date', 'enrolled_at'];
  var moved = [];

  function cardHTML(cls, title, sub, rows) {
    return '<div class="lab-card ' + cls + '">' +
      '<div class="lab-card-head"><span class="lab-dot"></span><b>' + title + '</b><span class="lab-card-sub">' + sub + '</span></div>' +
      '<div class="lab-card-body">' + rows.map(function (r) {
        return '<span class="lab-pill">' + r + '</span>';
      }).join('') + '</div></div>';
  }

  function html() {
    return '' +
      '<div class="lab">' +
      '  <section class="lab-hero">' +
      '    <div class="lab-copy">' +
      '      <p class="lab-eyebrow">Interface preview · Motion lab</p>' +
      '      <h1 class="lab-title">A model<br><em>in motion</em></h1>' +
      '      <p class="lab-lede">Watch the pieces of an ER model glide into a relational schema. Everything on this page is plain CSS motion — no video, no libraries.</p>' +
      '      <div class="lab-actions">' +
      '        <button class="btn btn--primary" type="button" data-lab="replay">Replay the animation</button>' +
      '        <a class="btn btn--ghost" href="#/">Back to home</a>' +
      '      </div>' +
      '      <div class="lab-stats">' +
      '        <div class="lab-stat"><b data-count="4">0</b><span>tools</span></div>' +
      '        <div class="lab-stat"><b data-count="3">0</b><span>languages</span></div>' +
      '        <div class="lab-stat"><b data-count="0">0</b><span>dependencies</span></div>' +
      '      </div>' +
      '    </div>' +
      '    <div class="lab-stage" id="labStage">' +
      '      <div class="lab-glow"></div>' +
      '      <svg class="lab-links" viewBox="0 0 520 460" aria-hidden="true">' +
      '        <path class="lab-link l1" d="M150 120 C 210 120, 210 210, 270 210" />' +
      '        <path class="lab-link l2" d="M270 250 C 320 250, 330 330, 390 330" />' +
      '        <path class="lab-link l3" d="M150 150 C 150 230, 90 250, 90 330" />' +
      '      </svg>' +
      '      <div class="lab-node n1" data-tilt>' + cardHTML('c-ent', 'Entity', 'students', ['student_id PK', 'name', 'email']) + '</div>' +
      '      <div class="lab-node n2" data-tilt>' + cardHTML('c-rel', 'Relationship', 'enrolls', ['(0,N) · (1,1)']) + '</div>' +
      '      <div class="lab-node n3" data-tilt>' + cardHTML('c-attr', 'Attribute', 'birth_date', ['DATE']) + '</div>' +
      '      <div class="lab-node n4" data-tilt>' + cardHTML('c-sch', 'Schema', 'STUDENTS', ['student_id PK', 'name', 'email']) + '</div>' +
      '      <div class="lab-badge b1">staggered</div>' +
      '      <div class="lab-badge b2">stroke draw</div>' +
      '      <div class="lab-badge b3">parallax</div>' +
      '    </div>' +
      '  </section>' +

      '  <section class="lab-section">' +
      '    <h2 class="lab-h2">Click an attribute, watch it move</h2>' +
      '    <p class="lab-note">Each chip travels from the entity into the schema card. The list of chips below is the live model.</p>' +
      '    <div class="lab-demo" id="labDemo">' +
      '      <div class="lab-panel lab-panel--src">' +
      '        <div class="lab-panel-head">students · attributes</div>' +
      '        <div class="lab-chips" id="labChips">' + ATTRS.map(function (a) {
              return '<button class="lab-chip" type="button" data-attr="' + a + '">' + a + '</button>';
            }).join('') + '</div>' +
      '      </div>' +
      '      <div class="lab-arrow" aria-hidden="true">→</div>' +
      '      <div class="lab-panel lab-panel--dst">' +
      '        <div class="lab-panel-head">STUDENTS · schema</div>' +
      '        <div class="lab-chips lab-chips--dst" id="labDst"><span class="lab-empty">Nothing moved yet</span></div>' +
      '      </div>' +
      '    </div>' +
      '    <div class="lab-demo-foot">' +
      '      <span class="lab-count" id="labCount">0 / ' + ATTRS.length + ' moved</span>' +
      '      <button class="btn btn--sm" type="button" data-lab="reset">Reset</button>' +
      '    </div>' +
      '  </section>' +

      '  <section class="lab-section">' +
      '    <h2 class="lab-h2">Three motions, one system</h2>' +
      '    <div class="lab-tiles">' +
      '      <article class="lab-tile"><span class="lab-tile-num">01</span><h3>Enter with a stagger</h3><p>Sections and cards arrive in sequence, 70 ms apart, moving only transform and opacity.</p></article>' +
      '      <article class="lab-tile"><span class="lab-tile-num">02</span><h3>Connect with a draw</h3><p>SVG paths animate their dash offset, so relationships look like they are being wired.</p></article>' +
      '      <article class="lab-tile"><span class="lab-tile-num">03</span><h3>Leave the way you came</h3><p>Every overlay returns along the same path it entered. Motion is courtesy, not decoration.</p></article>' +
      '    </div>' +
      '  </section>' +
      '</div>';
  }

  function animateCounts(root) {
    root.querySelectorAll('[data-count]').forEach(function (el) {
      var target = parseInt(el.getAttribute('data-count'), 10);
      if (!target) { el.textContent = '0'; return; }
      var start = performance.now();
      function tick(now) {
        var t = Math.min(1, (now - start) / 900);
        el.textContent = Math.round(target * (1 - Math.pow(1 - t, 3)));
        if (t < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
  }

  function mount(root) {
    var stage = root.querySelector('#labStage');
    var chips = root.querySelector('#labChips');
    var dst = root.querySelector('#labDst');
    var count = root.querySelector('#labCount');
    moved = [];

    function renderDst() {
      if (!moved.length) {
        dst.innerHTML = '<span class="lab-empty">Nothing moved yet</span>';
      } else {
        dst.innerHTML = moved.map(function (a) {
          return '<span class="lab-chip is-dst">' + a + '</span>';
        }).join('');
      }
      count.innerHTML = moved.length + ' / ' + ATTRS.length + ' <span class="lab-mv">moved</span>';
    }

    function move(chip) {
      var name = chip.getAttribute('data-attr');
      if (moved.indexOf(name) >= 0) return;
      moved.push(name);
      chip.classList.add('is-gone');
      renderDst();
      var last = dst.lastElementChild;
      if (last) { last.classList.add('is-in'); }
    }

    chips.addEventListener('click', function (e) {
      var chip = e.target.closest('.lab-chip');
      if (chip) move(chip);
    });

    root.addEventListener('click', function (e) {
      var act = e.target.closest('[data-lab]');
      if (!act) return;
      var a = act.getAttribute('data-lab');
      if (a === 'reset') {
        moved = [];
        chips.querySelectorAll('.lab-chip').forEach(function (c) { c.classList.remove('is-gone'); });
        renderDst();
        chips.querySelectorAll('.lab-chip')[0].focus();
      } else if (a === 'replay') {
        root.querySelectorAll('.lab-node, .lab-badge, .lab-link').forEach(function (el) {
          el.classList.remove('is-play');
        });
        void root.offsetWidth;
        root.querySelectorAll('.lab-node, .lab-badge, .lab-link').forEach(function (el) {
          el.classList.add('is-play');
        });
        animateCounts(root);
      }
    });

    if (stage) {
      stage.addEventListener('pointermove', function (e) {
        var r = stage.getBoundingClientRect();
        var dx = (e.clientX - r.left) / r.width - 0.5;
        var dy = (e.clientY - r.top) / r.height - 0.5;
        stage.querySelectorAll('[data-tilt]').forEach(function (el, i) {
          var k = (i % 2 ? -1 : 1) * 10;
          el.style.transform = 'translate3d(' + (dx * k).toFixed(2) + 'px,' + (dy * k).toFixed(2) + 'px,0) rotateX(' + (-dy * 4).toFixed(2) + 'deg) rotateY(' + (dx * 4).toFixed(2) + 'deg)';
        });
      });
      stage.addEventListener('pointerleave', function () {
        stage.querySelectorAll('[data-tilt]').forEach(function (el) { el.style.transform = ''; });
      });
    }

    renderDst();
    animateCounts(root);
    if (stage) {
      requestAnimationFrame(function () {
        stage.querySelectorAll('.lab-node, .lab-badge, .lab-link').forEach(function (el) { el.classList.add('is-play'); });
      });
    }
    return function () {
      moved = [];
    };
  }

  window.DDB_LAB = { html: html, mount: mount };
})();
