/* Finscore Engagement Prototypes - shared behaviour. Vanilla JS, no network calls, dummy data only.
   Persistence is browser-local (localStorage, wrapped in try/catch) and purely cosmetic. */
(function () {
  'use strict';
  var mem = {};
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem('fsp.' + k); return v === null ? (k in mem ? mem[k] : d) : JSON.parse(v); } catch (e) { return k in mem ? mem[k] : d; } },
    set: function (k, v) { mem[k] = v; try { localStorage.setItem('fsp.' + k, JSON.stringify(v)); } catch (e) { /* storage blocked: stay in memory */ } }
  };
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var inr = function (n) { return '₹' + Math.round(n).toLocaleString('en-IN'); };

  /* ---- Shared dummy "user" state ------------------------------------------------ */
  var STATE_DEFAULT = { points: 1240, streak: 6, badges: ['first_score', 'protected', 'steady_4'] };
  function state() { return { points: store.get('points', STATE_DEFAULT.points), streak: store.get('streak', STATE_DEFAULT.streak), badges: store.get('badges', STATE_DEFAULT.badges) }; }
  var LEVELS = ['Starter', 'Saver', 'Planner', 'Builder', 'Strategist', 'Navigator', 'Architect', 'Master'];
  function level(points) { var i = Math.min(LEVELS.length - 1, Math.floor(points / 400)); var base = i * 400; return { n: i + 1, name: LEVELS[i], into: points - base, need: i === LEVELS.length - 1 ? 1 : 400, next: LEVELS[Math.min(i + 1, LEVELS.length - 1)] }; }

  function renderChips() {
    var s = state(), lv = level(s.points);
    $$('[data-fs-points]').forEach(function (el) { el.textContent = s.points.toLocaleString('en-IN'); });
    $$('[data-fs-level]').forEach(function (el) { el.textContent = 'Lv ' + lv.n + ' · ' + lv.name; });
    $$('[data-fs-streak]').forEach(function (el) { el.textContent = s.streak; });
    $$('[data-fs-level-bar]').forEach(function (el) { el.style.width = Math.round(lv.into / lv.need * 100) + '%'; });
    $$('[data-fs-level-left]').forEach(function (el) { el.textContent = (lv.need - lv.into) + ' points to ' + lv.next; });
  }
  function addPoints(n, why) {
    store.set('points', state().points + n); renderChips();
    toast('+' + n + ' clarity points' + (why ? ' · ' + why : ''), '✦');
  }
  function unlockBadge(id, name) {
    var s = state(); if (s.badges.indexOf(id) > -1) return false;
    s.badges.push(id); store.set('badges', s.badges); toast('Badge unlocked: ' + name, '🏅'); confetti(); return true;
  }

  /* ---- Toast / modal / confetti -------------------------------------------------- */
  function toast(msg, icon) {
    var box = $('.fs-toasts'); if (!box) { box = document.createElement('div'); box.className = 'fs-toasts'; box.setAttribute('role', 'status'); box.setAttribute('aria-live', 'polite'); document.body.appendChild(box); }
    var t = document.createElement('div'); t.className = 'fs-toast'; t.innerHTML = (icon ? '<span aria-hidden="true">' + icon + '</span>' : '') + '<span>' + esc(msg) + '</span>';
    box.appendChild(t); setTimeout(function () { t.classList.add('out'); setTimeout(function () { t.remove(); }, 320); }, 2800);
  }
  var lastFocus = null;
  function modal(o) {
    lastFocus = document.activeElement;
    var ov = document.createElement('div'); ov.className = 'fs-overlay';
    var m = document.createElement('div'); m.className = 'fs-modal'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); m.setAttribute('aria-label', o.title || 'Dialog');
    m.innerHTML = '<h3>' + (o.icon ? '<span aria-hidden="true">' + o.icon + '</span> ' : '') + esc(o.title || '') + '</h3><div class="body">' + (o.html || '') + '</div><div class="actions"></div>';
    var acts = $('.actions', m);
    (o.actions || [{ label: 'Close' }]).forEach(function (a, i) {
      var b = document.createElement('button'); b.className = 'btn ' + (a.cls || (i ? '' : 'ghost')); b.textContent = a.label;
      b.addEventListener('click', function () { if (!a.keep) close(); if (a.fn) a.fn(close); }); acts.appendChild(b);
    });
    function close() { ov.remove(); document.removeEventListener('keydown', onKey); if (lastFocus && lastFocus.focus) lastFocus.focus(); }
    function onKey(e) {
      if (e.key === 'Escape') close();
      if (e.key === 'Tab') { var f = $$('button,[href],input,select,textarea', m).filter(function (x) { return !x.disabled; }); if (!f.length) return; var a = f[0], z = f[f.length - 1]; if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); } }
    }
    ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
    document.addEventListener('keydown', onKey); ov.appendChild(m); document.body.appendChild(ov);
    var first = $('.actions button:last-child', m); if (first) first.focus();
    if (o.onOpen) o.onOpen(m, close);
    return { close: close, el: m };
  }
  function confetti(x, y) {
    if (reduce) return;
    var cols = ['#0fb5a6', '#4f46e5', '#f5a524', '#e8447a', '#2b8be0'], cx = x == null ? innerWidth / 2 : x, cy = y == null ? innerHeight / 3 : y;
    for (var i = 0; i < 36; i++) {
      var p = document.createElement('i'); p.className = 'confetti'; p.style.left = cx + 'px'; p.style.top = cy + 'px'; p.style.background = cols[i % cols.length];
      p.style.setProperty('--dx', (Math.random() * 360 - 180) + 'px'); p.style.setProperty('--dy', (Math.random() * 300 - 80) + 'px'); p.style.setProperty('--rot', (Math.random() * 720) + 'deg');
      document.body.appendChild(p); setTimeout(function (el) { el.remove(); }.bind(null, p), 1500);
    }
  }

  /* ---- Counters, bars, rings, reveal --------------------------------------------- */
  function count(el, to, o) {
    o = o || {}; var from = o.from || 0, dur = reduce ? 0 : (o.dur || 1200), t0 = null, fmt = o.fmt || function (v) { return Math.round(v).toLocaleString('en-IN'); };
    if (!dur) { el.textContent = (o.prefix || '') + fmt(to) + (o.suffix || ''); return; }
    function step(t) { if (!t0) t0 = t; var k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3); el.textContent = (o.prefix || '') + fmt(from + (to - from) * e) + (o.suffix || ''); if (k < 1) requestAnimationFrame(step); }
    requestAnimationFrame(step);
    setTimeout(function () { el.textContent = (o.prefix || '') + fmt(to) + (o.suffix || ''); }, dur + 250); /* fallback if rAF is throttled (background tab) */
  }
  /* Matches inside root, and root itself (IntersectionObserver targets are often the element to animate). */
  function within(sel, root) { var r = $$(sel, root); if (root && root.matches && root.matches(sel)) r.unshift(root); return r; }
  function animateIn(root) {
    within('[data-count]', root).forEach(function (el) { if (el._done) return; el._done = 1; count(el, parseFloat(el.dataset.count), { prefix: el.dataset.prefix, suffix: el.dataset.suffix, dur: 1100 }); });
    within('.bar > i[data-w]', root).forEach(function (el) { if (el._a) return; el._a = 1; requestAnimationFrame(function () { el.style.width = el.dataset.w + '%'; }); setTimeout(function () { el.style.width = el.dataset.w + '%'; }, 120); });
    within('.ring[data-p]', root).forEach(function (el) { if (el._a) return; el._a = 1; el.style.setProperty('--p', 0); setTimeout(function () { el.style.setProperty('--p', el.dataset.p); }, 60); });
  }
  if (window.CSS && CSS.registerProperty) { try { CSS.registerProperty({ name: '--p', syntax: '<number>', inherits: false, initialValue: '0' }); } catch (e) { /* already registered */ } }
  function observe() {
    var els = $$('.reveal'); if (!('IntersectionObserver' in window)) { els.forEach(function (e) { e.classList.add('in'); animateIn(e); }); animateIn(document); return; }
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); animateIn(e.target); io.unobserve(e.target); } }); }, { threshold: .12 });
    els.forEach(function (e) { io.observe(e); });
    var io2 = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { animateIn(e.target); io2.unobserve(e.target); } }); }, { threshold: .1 });
    $$('[data-count],.bar > i[data-w],.ring[data-p]').forEach(function (e) { if (!e.closest('.reveal')) io2.observe(e); });
    /* Safety net: some embedded or background views never fire IntersectionObserver, so also reveal what is on screen. */
    function sweep() {
      $$('.reveal:not(.in),[data-count],.bar > i[data-w],.ring[data-p]').forEach(function (el) {
        var r = el.getBoundingClientRect(); if (r.bottom <= 0 || r.top >= innerHeight || (!r.width && !r.height)) return;
        if (el.classList.contains('reveal')) el.classList.add('in'); animateIn(el);
      });
    }
    setTimeout(sweep, 600); setTimeout(sweep, 1800); window.addEventListener('scroll', function () { clearTimeout(sweep.t); sweep.t = setTimeout(sweep, 150); }, { passive: true });
  }

  function tabs(root, onChange) {
    var list = $('[role="tablist"]', root), btns = $$('[role="tab"]', list);
    function select(id, focus) {
      btns.forEach(function (b) { var on = b.dataset.tab === id; b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1; if (on && focus) b.focus(); });
      $$('.panel', root).forEach(function (p) { var on = p.id === 'panel-' + id; p.hidden = !on; if (on) animateIn(p); });
      if (onChange) onChange(id); try { history.replaceState(null, '', '#' + id); } catch (e) { /* file:// may block */ }
    }
    btns.forEach(function (b, i) {
      b.addEventListener('click', function () { select(b.dataset.tab); });
      b.addEventListener('keydown', function (e) { var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (d) { e.preventDefault(); select(btns[(i + d + btns.length) % btns.length].dataset.tab, true); } });
    });
    var h = (location.hash || '').slice(1); var start = btns.filter(function (b) { return b.dataset.tab === h; })[0] || btns[0];
    select(start.dataset.tab);
    return select;
  }

  /* ---- Header / footer ------------------------------------------------------------- */
  var NAV = [['index.html', 'Gallery'], ['finscore-app-flow.html', 'In-app'], ['premium-fintech.html', 'Premium'], ['gamified-experience.html', 'Playful'], ['ai-futuristic.html', 'AI-first'], ['financial-games.html', 'Games'], ['financial-journey.html', 'Journey'], ['monthly-wrapped.html', 'Wrapped']];
  function buildHeader() {
    var host = $('#fs-header'); if (!host) return;
    var file = (location.pathname.split('/').pop() || 'index.html');
    var lockDir = document.body.dataset.lock;
    host.innerHTML = '<header class="fs-top"><div class="wrap"><a class="brand" href="index.html"><i aria-hidden="true">FS</i><span>Finscore<small>Engagement prototypes</small></span></a>' +
      '<nav class="fs-nav" aria-label="Prototypes">' + NAV.map(function (n) { return '<a href="' + n[0] + '"' + (n[0] === file ? ' aria-current="page"' : '') + '>' + n[1] + '</a>'; }).join('') + '</nav>' +
      '<div class="fs-tools"><span class="chip gold" title="Clarity points never change your Finscore">✦ <span data-fs-points>0</span></span><span class="chip" title="Weekly cadence, pauses instead of resetting">🔥 <span data-fs-streak>0</span></span>' +
      (lockDir ? '' : '<div class="dirswitch" role="group" aria-label="Visual direction"><button data-d="premium" aria-pressed="false">Premium</button><button data-d="play" aria-pressed="false">Playful</button><button data-d="ai" aria-pressed="false">AI</button></div>') +
      '</div></div></header>';
    $$('.dirswitch button', host).forEach(function (b) { b.addEventListener('click', function () { setDir(b.dataset.d); }); });
  }
  function setDir(d) {
    document.body.dataset.dir = d; store.set('dir', d);
    $$('.dirswitch button').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.d === d); });
    document.dispatchEvent(new CustomEvent('fs:dir', { detail: d }));
  }
  function buildFooter() {
    var f = $('#fs-footer'); if (!f) return;
    f.innerHTML = '<footer class="proto-footer"><div class="wrap">Design prototype · dummy data only · no backend, no real money, no real user data. Clarity points are virtual and never change a Finscore. Not financial advice; simulations are not predictions or guarantees. <a href="index.html">Back to gallery</a></div></footer>';
  }
  function init() {
    var lock = document.body.dataset.lock;
    document.body.dataset.dir = lock || store.get('dir', document.body.dataset.dir || 'premium');
    buildHeader(); buildFooter(); renderChips();
    $$('.dirswitch button').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.d === document.body.dataset.dir); });
    observe();
    window.addEventListener('storage', renderChips);
  }

  window.FS = { store: store, $: $, $$: $$, esc: esc, inr: inr, state: state, level: level, LEVELS: LEVELS, addPoints: addPoints, unlockBadge: unlockBadge, toast: toast, modal: modal, confetti: confetti, count: count, animateIn: animateIn, tabs: tabs, setDir: setDir, renderChips: renderChips, reduce: reduce };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
