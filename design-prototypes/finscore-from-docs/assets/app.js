/* App shell: journey rail (the closed loop from blueprint section 32), hash router, shared helpers. */
(function (root) {
  'use strict';
  var E = root.FSEngine, M = root.FSModel, S = root.FSStore;
  var $ = function (s, r) { return (r || document).querySelector(s); }, $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var App = { views: {}, esc: esc, $: $, $$: $$ };

  /* ---- formatting ---- */
  App.money = function (n) { return '<span title="' + esc(M.inr(n)) + '">' + esc(M.compact(n)) + '</span>'; };
  App.fmtFact = function (key, v) { var d = M.FDEF[key]; if (typeof v !== 'number') return 'not provided'; if (d.unit === 'inr') return M.compact(v); if (d.unit === 'flag') return v ? 'Yes' : 'Not yet'; if (d.unit === 'years') return v + ' yrs'; return String(v); };
  var SRC = { USER_STATED: ['💬', 'You told me'], CONNECTED: ['🔗', 'Connected'], DERIVED: ['🧮', 'Calculated'], INFERRED: ['🔍', 'Inferred'], ESTIMATED: ['≈', 'Estimated'], STALE: ['⏳', 'Out of date'] };
  App.src = function (s) { var x = SRC[s] || SRC.ESTIMATED; return '<span class="src ' + esc(s) + '"><span aria-hidden="true">' + x[0] + '</span>' + x[1] + '</span>'; };
  App.ago = function (ts) { var d = Math.round((S.now() - ts) / S.DAY); return d <= 0 ? 'today' : d === 1 ? '1 day ago' : d < 60 ? d + ' days ago' : Math.round(d / 30) + ' months ago'; };
  var STAGE_COL = ['#c5292f', '#d9622b', '#e08a1e', '#d9b01e', '#8fbf3a', '#34b873', '#0fb5a6', '#4f46e5'];
  App.gauge = function (v, o) {
    o = o || {}; var W = 300, H = 170, cx = 150, cy = 150, r = 120, a = function (val) { return Math.PI * (1 - val / 900); }, pt = function (val, rr) { return [cx + (rr || r) * Math.cos(a(val)), cy - (rr || r) * Math.sin(a(val))]; };
    var arc = function (v0, v1, rr) { var p = pt(v0, rr), q = pt(v1, rr); return 'M' + p[0].toFixed(1) + ' ' + p[1].toFixed(1) + ' A' + (rr || r) + ' ' + (rr || r) + ' 0 0 1 ' + q[0].toFixed(1) + ' ' + q[1].toFixed(1); };
    var s = '<path d="' + arc(0, 300) + '" stroke="' + (o.dark ? 'rgb(255 255 255/.15)' : 'var(--card2)') + '" stroke-width="16" fill="none" stroke-linecap="butt"/>';
    for (var i = 0; i < 8; i++) { var lo = 300 + i * 75, hi = lo + 75; s += '<path d="' + arc(lo + 1.5, hi - 1.5) + '" stroke="' + STAGE_COL[i] + '" stroke-width="16" fill="none" opacity="' + (o.showStage === false ? .25 : (v >= lo ? .95 : .3)) + '"/>'; }
    if (v != null) { var k = pt(Math.max(0, Math.min(900, v)), r); s += '<circle cx="' + k[0].toFixed(1) + '" cy="' + k[1].toFixed(1) + '" r="10" fill="' + (o.dark ? '#0b1b2b' : 'var(--card)') + '" stroke="' + (o.dark ? '#fff' : 'var(--ink)') + '" stroke-width="4"/>'; }
    s += '<text x="30" y="168" font-size="10" fill="currentColor" opacity=".6">0</text><text x="262" y="168" font-size="10" fill="currentColor" opacity=".6">900</text>';
    return '<div class="gauge"><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="FinScore ' + (v == null ? 'not available' : Math.round(v) + ' out of 900') + '">' + s + '</svg><div class="gv"><b class="num">' + (v == null ? '-' : Math.round(v)) + '</b><span>out of 900</span></div></div>';
  };
  App.spark = function (vals, w, h) { if (vals.length < 2) return '<div class="muted xs">Trend appears after a second score version.</div>'; var mn = Math.min.apply(null, vals) - 5, mx = Math.max.apply(null, vals) + 5, p = vals.map(function (v, i) { return (4 + i * (w - 8) / (vals.length - 1)).toFixed(1) + ',' + (h - 4 - (v - mn) / (mx - mn) * (h - 8)).toFixed(1); }); return '<svg class="spark" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="Score trend"><polyline fill="none" stroke="var(--teal)" stroke-width="2.5" points="' + p.join(' ') + '"/><circle cx="' + p[p.length - 1].split(',')[0] + '" cy="' + p[p.length - 1].split(',')[1] + '" r="4" fill="var(--indigo)"/></svg>'; };

  /* ---- toast, modal ---- */
  App.toast = function (msg, icon) { var b = $('.toasts') || (function () { var d = document.createElement('div'); d.className = 'toasts'; d.setAttribute('role', 'status'); d.setAttribute('aria-live', 'polite'); document.body.appendChild(d); return d; })(); var t = document.createElement('div'); t.className = 'toast'; t.textContent = (icon ? icon + ' ' : '') + msg; b.appendChild(t); setTimeout(function () { t.remove(); }, 3200); };
  var lastFocus = null;
  App.modal = function (o) {
    lastFocus = document.activeElement; var ov = document.createElement('div'), m = document.createElement('div'); ov.className = 'ov'; m.className = 'modal'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); m.setAttribute('aria-label', o.title);
    m.innerHTML = '<h3>' + esc(o.title) + '</h3><div>' + (o.html || '') + '</div><div class="act"></div>'; var acts = $('.act', m);
    (o.actions || [{ label: 'Close', cls: 'sec' }]).forEach(function (a) { var b = document.createElement('button'); b.className = 'btn ' + (a.cls || ''); b.textContent = a.label; b.addEventListener('click', function () { var keep = a.fn ? a.fn(m, close) : false; if (keep !== true) close(); }); acts.appendChild(b); });
    function close() { ov.remove(); document.removeEventListener('keydown', key); if (lastFocus && lastFocus.focus) lastFocus.focus(); }
    function key(e) { if (e.key === 'Escape') close(); if (e.key === 'Tab') { var f = $$('button,input,select,textarea,a[href]', m).filter(function (x) { return !x.disabled; }); if (!f.length) return; var a = f[0], z = f[f.length - 1]; if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); } } }
    ov.addEventListener('click', function (e) { if (e.target === ov) close(); }); document.addEventListener('keydown', key); ov.appendChild(m); document.body.appendChild(ov);
    var f = $('input,textarea,select,.act .btn:last-child', m); if (f) f.focus(); if (o.onOpen) o.onOpen(m, close); return { el: m, close: close };
  };

  /* ---- navigation ---- */
  var NAV = [
    ['Start', [['#/ask', 'Ask FinScore', '1'], ['#/chat', 'Conversation', '2']]], ['Understand', [['#/home', 'FinScore Home', '3'], ['#/score', 'Why this score', '4'], ['#/dna', 'DNA & Persona', '5']]],
    ['Advise', [['#/coach', 'AI Wealth Coach', '6'], ['#/whatif', 'What-If', '7']]], ['Act', [['#/actions', 'Action Plan', '8'], ['#/timeline', 'Wealth Timeline', '9']]],
    ['Stay on track', [['#/companion', 'Daily Companion', '10'], ['#/missions', 'Missions & levels', '11'], ['#/family', 'Family', '12']]], ['Trust', [['#/memory', 'Profile & Memory', 'M'], ['#/rules', 'Rules & tests', 'R']]]
  ];
  var ALL = []; NAV.forEach(function (g) { g[1].forEach(function (i) { ALL.push(i); }); });
  var TABS = [['#/home', 'Home', '◎'], ['#/chat', 'Talk', '💬'], ['#/score', 'Score', '📊'], ['#/actions', 'Actions', '✓']];
  function done(h) { var st = S.state; return h === '#/ask' ? !!st.problem : h === '#/chat' ? Object.keys(st.facts).length > 0 : h === '#/home' ? st.scores.length > 0 : h === '#/score' ? !!st.seen.score : h === '#/actions' ? Object.keys(st.actions.done).length > 0 : false; }
  function buildNav() {
    $('#nav').innerHTML = NAV.map(function (g) { return '<h6>' + g[0] + '</h6>' + g[1].map(function (i) { return '<a class="nv" href="' + i[0] + '"><span class="st" data-st="' + i[0] + '">' + i[2] + '</span>' + i[1] + '</a>'; }).join(''); }).join('');
    $('#tabm').innerHTML = TABS.map(function (t) { return '<a href="' + t[0] + '"><span class="ic" aria-hidden="true">' + t[2] + '</span>' + t[1] + '</a>'; }).join('') + '<button id="moreBtn" aria-haspopup="dialog"><span class="ic" aria-hidden="true">⋯</span>More</button>';
    $('#moreBtn').addEventListener('click', function () { var sh = document.createElement('div'); sh.className = 'sheet'; sh.innerHTML = '<div class="in" role="dialog" aria-modal="true" aria-label="All screens">' + NAV.map(function (g) { return '<h6 class="xs muted" style="margin:10px 8px 2px;text-transform:uppercase;letter-spacing:.08em">' + g[0] + '</h6>' + g[1].map(function (i) { return '<a class="nv" href="' + i[0] + '">' + i[1] + '</a>'; }).join(''); }).join('') + '</div>'; document.body.appendChild(sh); sh.addEventListener('click', function (e) { if (e.target === sh || e.target.closest('a')) sh.remove(); }); });
  }
  App.route = function () { var h = (location.hash || '#/ask').split('?')[0]; return App.views[h.slice(2)] ? h : '#/ask'; };
  App.go = function (h) { if (location.hash === h) App.render(); else location.hash = h; };
  var firstRender = true;
  App.render = function (keepScroll) {
    var r = App.route(), v = App.views[r.slice(2)], y = window.scrollY; $('#main').innerHTML = '<div class="view">' + v.render() + '</div>'; if (v.bind) v.bind($('#main'));
    $$('.nv[href]').forEach(function (a) { if (a.getAttribute('href') === r) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    $$('#tabm a').forEach(function (a) { if (a.getAttribute('href') === r) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    $$('.st[data-st]').forEach(function (el) { var d = done(el.dataset.st); el.classList.toggle('done', d); if (d) el.textContent = '✓'; else el.textContent = (ALL.filter(function (i) { return i[0] === el.dataset.st; })[0] || [])[2]; });
    var t = ALL.filter(function (i) { return i[0] === r; })[0]; $('#ttl').textContent = t ? t[1] : ''; document.title = 'FinScore AI (from docs) - ' + (t ? t[1] : '');
    $('#demoB').hidden = !S.state.demo; var lv = S.level(); $('#xpB').textContent = '✦ ' + lv.total + ' XP · Lv ' + lv.n; $('#modeB').textContent = S.state.mode === 'problem' ? 'Problem Mode' : 'Full FinScore Mode';
    if (!keepScroll) window.scrollTo(0, 0); else window.scrollTo(0, y); firstRender = false;
  };
  App.register = function (name, def) { App.views[name] = def; };
  App.rerender = function () { App.render(true); };

  App.init = function () {
    buildNav(); var th = null; try { th = localStorage.getItem('fsd.theme'); } catch (e) { /* blocked */ } document.documentElement.dataset.theme = th || 'light';
    $('#themeB').addEventListener('click', function () { var d = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = d; try { localStorage.setItem('fsd.theme', d); } catch (e) { /* blocked */ } App.rerender(); });
    $('#modeB').addEventListener('click', function () { S.state.mode = S.state.mode === 'problem' ? 'full' : 'problem'; S.save(); App.toast(S.state.mode === 'problem' ? 'Problem Mode: I focus on your question' : 'Full FinScore Mode: I fill the whole picture', 'ℹ️'); App.rerender(); });
    window.addEventListener('hashchange', function () { App.render(); }); App.render();
  };
  root.FSApp = App;
})(window);
