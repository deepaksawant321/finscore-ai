/* FinScore Quest core: starfield, HUD, dock, command bar (Ask Fin), settings, router, shared helpers. */
(function (root) {
  'use strict';
  var E = root.FSEngine, M = root.FSModel, S = root.FSStore;
  var $ = function (s, r) { return (r || document).querySelector(s); }, $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var Q = { scenes: {}, $: $, $$: $$, esc: esc, pendingAsk: null };
  var st = function () { return S.state; };
  var mq = root.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };

  /* ---- preferences (theme, intensity) ---- */
  var prefs = { theme: 'midnight', intensity: 'balanced', view: 'full' };
  try { var p = JSON.parse(localStorage.getItem('fsq.ui') || '{}'); if (p.theme) prefs.theme = p.theme; if (p.intensity) prefs.intensity = p.intensity; } catch (e) { /* blocked */ }
  function applyPrefs() { document.documentElement.dataset.theme = prefs.theme === 'ivory' ? 'ivory' : 'midnight'; document.documentElement.dataset.intensity = prefs.intensity; document.documentElement.dataset.view = prefs.view; try { localStorage.setItem('fsq.ui', JSON.stringify(prefs)); } catch (e) { /* blocked */ } sky.paint(); }
  Q.prefs = prefs; Q.motion = function () { return prefs.intensity !== 'calm' && !mq.matches; };
  /** Simple view is the default: three tabs, one score, one next step, plain words. Full view keeps every scene. */
  Q.simple = function () { return false; }; /* Simple view is switched off: Full detail is the only view */
  Q.home = function () { return Q.simple() ? 'home' : 'observatory'; };
  Q.plan = function () { return Q.simple() ? 'plan' : 'quests'; };

  /* ---- starfield ---- */
  var sky = (function () {
    var cv, cx, W, H, stars = [], mx = 0, my = 0, raf = null, t0 = 0;
    function init() { cv = document.createElement('canvas'); $('#sky').appendChild(cv); cx = cv.getContext('2d'); resize(); addEventListener('resize', resize); addEventListener('pointermove', function (e) { mx = (e.clientX / innerWidth - .5); my = (e.clientY / innerHeight - .5); }, { passive: true }); document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else paint(); }); }
    function resize() { var d = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight; cv.width = W * d; cv.height = H * d; cx.setTransform(d, 0, 0, d, 0, 0); var n = Math.round(W * H / 9000); stars = []; for (var i = 0; i < n; i++) stars.push({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.3 + .3, z: Math.random() * .9 + .1, ph: Math.random() * 6.28, hue: Math.random() < .12 ? 1 : 0 }); paint(); }
    function draw(t) { cx.clearRect(0, 0, W, H); var ivory = prefs.theme === 'ivory'; for (var i = 0; i < stars.length; i++) { var s = stars[i], a = (ivory ? .22 : .35 + .5 * Math.sin(t / 1100 + s.ph) * .5 + .15) * s.z + .1; cx.globalAlpha = Math.max(.05, Math.min(1, a)); cx.fillStyle = ivory ? (s.hue ? '#9a6b12' : '#1b2233') : (s.hue ? '#e8c47c' : '#cfd8ff'); cx.beginPath(); cx.arc(s.x + mx * 22 * s.z, s.y + my * 22 * s.z, s.r, 0, 6.283); cx.fill(); } cx.globalAlpha = 1; }
    function loop(t) { draw(t); raf = requestAnimationFrame(loop); }
    function stop() { if (raf) cancelAnimationFrame(raf); raf = null; }
    function paint() { if (!cv) return; stop(); if (Q.motion() && !document.hidden) raf = requestAnimationFrame(loop); else draw(0); }
    return { init: init, paint: paint };
  })();

  /* ---- helpers ---- */
  Q.toast = function (msg, icon) { var b = $('.toasts') || (function () { var d = document.createElement('div'); d.className = 'toasts'; d.setAttribute('role', 'status'); d.setAttribute('aria-live', 'polite'); document.body.appendChild(d); return d; })(); var t = document.createElement('div'); t.className = 'toast'; t.textContent = (icon ? icon + ' ' : '') + msg; b.appendChild(t); setTimeout(function () { t.remove(); }, 3600); };
  Q.confetti = function (x, y) { if (prefs.intensity !== 'playful' || mq.matches) return; var cols = ['#e8c47c', '#3ddca9', '#9b8cff', '#ff7b86'], cx = x == null ? innerWidth / 2 : x, cy = y == null ? innerHeight / 3 : y; for (var i = 0; i < 40; i++) { var p = document.createElement('i'); p.className = 'confetti'; p.style.left = cx + 'px'; p.style.top = cy + 'px'; p.style.background = cols[i % 4]; p.style.setProperty('--dx', (Math.random() * 420 - 210) + 'px'); p.style.setProperty('--dy', (Math.random() * 320 - 60) + 'px'); p.style.setProperty('--rot', Math.random() * 720 + 'deg'); document.body.appendChild(p); setTimeout(function (el) { el.remove(); }.bind(null, p), 1600); } };
  Q.count = function (el, to, o) { o = o || {}; var from = o.from || 0, dur = Q.motion() ? (o.dur || 1400) : 0, fmt = o.fmt || function (v) { return Math.round(v).toLocaleString('en-IN'); }, t0 = null; if (!dur) { el.textContent = fmt(to); return; } function step(t) { if (!t0) t0 = t; var k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3); el.textContent = fmt(from + (to - from) * e); if (k < 1) requestAnimationFrame(step); } requestAnimationFrame(step); setTimeout(function () { el.textContent = fmt(to); }, dur + 300); };
  var lastFocus = null;
  Q.modal = function (o) {
    lastFocus = document.activeElement; var ov = document.createElement('div'), m = document.createElement('div'); ov.className = 'mov'; m.className = 'modal'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); m.setAttribute('aria-label', o.title); m.innerHTML = '<h3>' + esc(o.title) + '</h3><div>' + (o.html || '') + '</div><div class="act"></div>';
    (o.actions || [{ label: 'Close', cls: 'ghost' }]).forEach(function (a) { var b = document.createElement('button'); b.className = 'btn ' + (a.cls || ''); b.textContent = a.label; b.addEventListener('click', function () { var keep = a.fn ? a.fn(m, close) : false; if (keep !== true) close(); }); $('.act', m).appendChild(b); });
    function close() { ov.remove(); document.removeEventListener('keydown', key); if (lastFocus && lastFocus.focus) lastFocus.focus(); }
    function key(e) { if (e.key === 'Escape') close(); if (e.key === 'Tab') { var f = $$('button,input,select,textarea,a[href]', m).filter(function (x) { return !x.disabled; }); if (!f.length) return; var a = f[0], z = f[f.length - 1]; if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); } } }
    ov.addEventListener('click', function (e) { if (e.target === ov) close(); }); document.addEventListener('keydown', key); ov.appendChild(m); document.body.appendChild(ov); var f = $('input,select,.act .btn:last-child', m); if (f) f.focus(); if (o.onOpen) o.onOpen(m, close); return { close: close };
  };
  Q.sheet = function (html, onOpen) {
    lastFocus = document.activeElement; var ov = document.createElement('div'); ov.className = 'sov'; ov.innerHTML = '<aside class="sheet" role="dialog" aria-modal="true" aria-label="Details">' + html + '</aside>'; function close() { ov.remove(); document.removeEventListener('keydown', key); if (lastFocus && lastFocus.focus) lastFocus.focus(); }
    function key(e) { if (e.key === 'Escape') close(); } ov.addEventListener('click', function (e) { if (e.target === ov || e.target.closest('[data-close]')) close(); }); document.addEventListener('keydown', key); document.body.appendChild(ov); var c = $('[data-close]', ov); if (c) c.focus(); if (onOpen) onOpen($('.sheet', ov), close); return { close: close };
  };
  Q.src = function (s) { var l = { USER_STATED: 'You told me', CONNECTED: 'Connected', DERIVED: 'Calculated', INFERRED: 'Inferred', ESTIMATED: 'Estimated', STALE: 'Out of date' }; return '<span class="src ' + esc(s) + '">' + (l[s] || s) + '</span>'; };
  Q.fmt = function (key, v) { var d = M.FDEF[key]; if (typeof v !== 'number') return 'not provided'; if (d.unit === 'inr') return M.compact(v); if (d.unit === 'flag') return v ? 'Yes' : 'Not yet'; if (d.unit === 'years') return v + ' yrs'; return String(v); };
  Q.ago = function (ts) { var d = Math.round((S.now() - ts) / S.DAY); return d <= 0 ? 'today' : d === 1 ? '1 day ago' : d < 60 ? d + ' days ago' : Math.round(d / 30) + ' months ago'; };
  Q.topActions = function (n) { return M.proposeActions(S.values(), st().opts, st().intents, S.evaluate().confidence).slice(0, n || 5); };
  Q.applyActions = function (facts, acts) { var f = {}; Object.keys(facts).forEach(function (k) { f[k] = facts[k]; }); acts.forEach(function (a) { Object.keys(a.to).forEach(function (k) { f[k] = a.to[k]; }); }); return f; };
  Q.titleName = function () { var r = S.evaluate(); if (r.enough) return r.stage.nick.replace('The ', ''); return 'Fresh Starter'; };
  Q.afterSave = function (reason) {
    var before = st().scores[st().scores.length - 1], v = S.snapshot(reason); S.touchWeek();
    if (v && before && v !== before) { var d = Math.round((v.total - before.total) * 10) / 10; if (Math.abs(d) >= 0.1) { Q.toast('Score ' + (d > 0 ? '+' : '') + d + ' → ' + Math.round(v.total), d > 0 ? '▲' : '▼'); if (d >= 5) Q.confetti(); } }
    S.badges().filter(function (b) { return b.earned && !st().seen['b_' + b.id]; }).forEach(function (b) { st().seen['b_' + b.id] = 1; Q.toast('Badge: ' + b.name, '🏅'); }); S.save(); return v;
  };
  Q.saveFact = function (key, value, reason) { var prev = st().facts[key] ? st().facts[key].value : null; S.setFact(key, value, 'USER_STATED', reason); var xp = S.award('confirm_fact', key); Q.afterSave(reason || ('You confirmed ' + M.FDEF[key].label)); if (xp) Q.toast('+' + xp.xp + ' XP', '✦'); return { prev: prev }; };

  /* ---- HUD, settings, dock ---- */
  var ICON = { home: 'M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z', plan: 'M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2', user: 'M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8M4 21c0-4 4-6 8-6s8 2 8 6', more: 'M5 10.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3M12 10.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3M19 10.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3', obs: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6M3 12c0-3 4-5 9-5s9 2 9 5-4 5-9 5-9-2-9-5', tree: 'M12 21V11M12 11l-5-4M12 11l5-4M7 7V4M17 7V4M12 16l-4-2M12 16l4-2', ask: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM18 16l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z', quest: 'M6 21V4M6 5h11l-2 4 2 4H6', studio: 'M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z', gear: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6M19 12l2 1-1 3-2.2-.4a7 7 0 0 1-1.6 1.6L16.6 20l-3 1-1-2a7 7 0 0 1-2.2 0l-1 2-3-1 .4-2.2a7 7 0 0 1-1.6-1.6L3 16l-1-3 2-1a7 7 0 0 1 0-2.2l-2-1 1-3 2.2.4a7 7 0 0 1 1.6-1.6L7.4 4l3-1 1 2a7 7 0 0 1 2.2 0l1-2 3 1-.4 2.2a7 7 0 0 1 1.6 1.6L21 8l1 3-2 1z' };
  var svg = function (n) { return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + ICON[n] + '"/></svg>'; };
  var DOCK = [['observatory', 'Overview', 'obs'], ['quests', 'Quests', 'quest'], ['ask', 'Ask Fin', 'ask'], ['tree', 'Skills', 'tree'], ['more', 'More', 'more']];
  var GROUPS = [['Add your information', ['link', 'intro']], ['Explore', ['realms', 'time']], ['Look after it', ['vault', 'crew', 'quiet', 'studio']]];
  var EXTRA = [['link', 'Link hub', 'Connect accounts, scan documents, read a statement or speak'], ['realms', 'Realm map', 'Your path through the eight realms, with goals'], ['time', 'Time machine', 'Try a change and compare Now with Then'], ['vault', 'Vault', 'Everything Fin knows, with sources'], ['crew', 'Crew', 'Household view and permissions'], ['quiet', 'Quiet hours', 'Daily briefing and nudge controls'], ['intro', 'Talk to Fin', 'Start or redo the conversation'], ['studio', 'Chat with Fin', 'Ask, diagnose, simulate or act, with the work shown']];
  Q.EXTRA = EXTRA;
  function buildSimple() {
    $('#hud').innerHTML = '<a class="logo" href="#/home" aria-label="FinScore, home"><i aria-hidden="true"></i><span>FinScore</span></a><span class="sp"></span><button class="gear" id="gear" aria-label="Settings" aria-haspopup="true" aria-expanded="false">' + svg('gear') + '</button>';
    $('#strip').innerHTML = '<b>Draft</b> · an illustration, not an official FinScore';
    $('#dock').innerHTML = [['home', 'Home', 'home'], ['plan', 'My plan', 'plan'], ['ask'], ['info', 'My info', 'user']].map(function (d) { return d[0] === 'ask' ? '<button class="dk ask" id="askBtn" aria-label="Ask Fin">' + svg('ask') + '<span>Ask Fin</span></button>' : '<a class="dk" href="#/' + d[0] + '" data-s="' + d[0] + '">' + svg(d[2]) + d[1] + '</a>'; }).join('');
    $('#askBtn').addEventListener('click', function () { Q.go('studio'); }); $('#gear').addEventListener('click', settings); bindGlobal();
  }
  function bindGlobal() {
    if (Q._bound) return; Q._bound = 1;
    addEventListener('keydown', function (e) { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); Q.palette(); } });
    document.addEventListener('click', function (e) { var p = $('.pop'); if (p && !e.target.closest('.pop') && !e.target.closest('#gear')) { p.remove(); var g = $('#gear'); if (g) g.setAttribute('aria-expanded', 'false'); } });
  }
  function buildChrome() { if (Q.simple()) buildSimple(); else buildFull(); }
  Q.rebuild = buildChrome;
  Q.setView = function (v) { prefs.view = v; applyPrefs(); buildChrome(); Q.toast(v === 'simple' ? 'Simple view' : 'Full detail view', '👁'); Q.go(v === 'simple' ? 'home' : 'observatory'); };
  function buildFull() {
    $('#hud').innerHTML = '<a class="logo" href="#/intro" aria-label="FinScore Quest, start"><i aria-hidden="true"></i><span>FinScore Quest</span></a><span class="sp"></span><span class="pill gold hide-s" id="hCad" title="Weekly cadence pauses, it never resets" style="display:none"></span><div class="lvl" title="XP is separate from your FinScore and never changes it"><div class="ring" id="hRing"><b id="hLv"></b></div><div class="xs"><b id="hTitle" style="display:block;font-size:13px"></b><span class="mut" id="hXp"></span></div></div><button class="gear" id="gear" aria-label="Settings" aria-haspopup="true" aria-expanded="false">' + svg('gear') + '</button>';
    $('#strip').innerHTML = '<b>Draft rules</b> · not an official FinScore · stage is provisional';
    $('#dock').innerHTML = DOCK.map(function (d) { return d[0] === 'ask' ? '<button class="dk ask" id="askBtn" aria-label="Ask Fin (Ctrl K)">' + svg(d[2]) + '<span>Ask Fin</span></button>' : d[0] === 'more' ? '<button class="dk" id="moreBtn" data-s="more" aria-haspopup="dialog">' + svg(d[2]) + 'More</button>' : '<a class="dk" href="#/' + d[0] + '" data-s="' + d[0] + '">' + svg(d[2]) + d[1] + '</a>'; }).join('');
    $('#askBtn').addEventListener('click', function () { Q.palette(); }); $('#moreBtn').addEventListener('click', function () { Q.sheet('<button class="btn ghost sm" data-close style="float:right">Close</button><p class="eyebrow">More worlds</p><h2>Where to next?</h2>' + GROUPS.map(function (g) { return '<p class="eyebrow" style="margin:18px 0 8px">' + g[0] + '</p><div class="stack">' + g[1].map(function (k) { var e = EXTRA.filter(function (x) { return x[0] === k; })[0]; return '<button class="node" data-go="' + e[0] + '" style="margin-bottom:0"><span><span class="nm">' + esc(e[1]) + '</span><br><span class="sb">' + esc(e[2]) + '</span></span></button>'; }).join('') + '</div>'; }).join(''), function (sh, close) { $$('[data-go]', sh).forEach(function (b) { b.addEventListener('click', function () { close(); Q.go(b.dataset.go); }); }); }); }); $('#gear').addEventListener('click', settings); bindGlobal();
  }
  Q.hud = function () { if (!$('#hRing')) return; var lv = S.level(); $('#hRing').style.setProperty('--p', Math.round(lv.into / lv.need * 100)); $('#hLv').textContent = lv.n; $('#hTitle').textContent = Q.titleName() + ' ' + lv.n; $('#hXp').textContent = lv.total + ' XP'; var lvl = $('.lvl'); if (lvl) lvl.style.display = lv.total > 0 || lv.n > 1 ? '' : 'none'; $('#hCad').textContent = '◷ ' + st().weeksActive.length + ' wk' + (st().demo ? ' · demo data' : ''); };
  function settings() {
    var ex = $('.pop'); if (ex) { ex.remove(); $('#gear').setAttribute('aria-expanded', 'false'); return; } var p = document.createElement('div'); p.className = 'pop'; p.setAttribute('role', 'dialog'); p.setAttribute('aria-label', 'Settings');
    var seg = function (id, items, cur) { return '<div class="seg" role="group" aria-label="' + id + '">' + items.map(function (i) { return '<button data-' + id + '="' + i[0] + '" aria-pressed="' + (cur === i[0]) + '">' + i[1] + '</button>'; }).join('') + '</div>'; };
    p.innerHTML = (Q.simple() ? '' : '<h4>How playful</h4>' + seg('int', [['calm', 'Calm'], ['balanced', 'Balanced'], ['playful', 'Playful']], prefs.intensity) + '<p class="xs mut" style="margin-top:6px">Calm turns motion and rewards right down.</p>') + '<h4>Theme</h4>' + seg('thm', [['midnight', 'Midnight'], ['ivory', 'Ivory']], prefs.theme) + (Q.simple() ? '' : '<h4>Interview mode</h4>' + seg('mod', [['problem', 'My problem'], ['full', 'Full picture']], st().mode)) + '<h4>Prototype</h4><button class="lnk" data-act="demo">Load a sample profile</button><button class="lnk" data-act="tests">Run engine checks</button><button class="lnk" data-act="reset">Erase everything</button>';
    document.body.appendChild(p); $('#gear').setAttribute('aria-expanded', 'true');
    $$('[data-int]', p).forEach(function (b) { b.addEventListener('click', function () { prefs.intensity = b.dataset.int; applyPrefs(); p.remove(); $('#gear').setAttribute('aria-expanded', 'false'); Q.render(true); }); });
    $$('[data-thm]', p).forEach(function (b) { b.addEventListener('click', function () { prefs.theme = b.dataset.thm; applyPrefs(); p.remove(); $('#gear').setAttribute('aria-expanded', 'false'); Q.render(true); }); });
    $$('[data-mod]', p).forEach(function (b) { b.addEventListener('click', function () { st().mode = b.dataset.mod; S.save(); p.remove(); Q.toast(b.dataset.mod === 'problem' ? 'I will focus on your question' : 'I will fill in your whole picture', 'ℹ️'); }); });
    $$('[data-act]', p).forEach(function (b) { b.addEventListener('click', function () { p.remove(); ACT[b.dataset.act](); }); });
  }
  var ACT = {
    demo: function () { S.loadDemo(); st().seen.revealDone = 0; Q.toast('Sample profile loaded (dummy data)', '🧪'); Q.go(Q.home()); },
    tests: function () { var r = root.FSTests.run(), ok = r.filter(function (x) { return x.pass; }).length; Q.modal({ title: 'Engine checks: ' + ok + ' of ' + r.length + ' passing', html: '<p class="sm mut">Expected values come from the rules specification in the documents.</p><div style="max-height:46vh;overflow:auto;margin-top:8px">' + r.map(function (x) { return '<div class="kv"><span>' + (x.pass ? '✅ ' : '❌ ') + esc(x.name) + '</span><span class="xs mut" style="text-align:right">' + esc(x.detail) + '</span></div>'; }).join('') + '</div>' }); },
    reset: function () { Q.modal({ title: 'Erase everything?', html: '<p class="mut">Removes all facts, score history and XP from this browser. This cannot be undone.</p>', actions: [{ label: 'Cancel', cls: 'ghost' }, { label: 'Erase', fn: function () { S.reset(); Q.toast('Erased', '🗑'); Q.go('intro'); } }] }); },
    calm: function () { prefs.intensity = 'calm'; applyPrefs(); Q.render(true); }, theme: function () { prefs.theme = prefs.theme === 'ivory' ? 'midnight' : 'ivory'; applyPrefs(); Q.render(true); }
  };

  /* ---- command bar: Ask Fin ---- */
  Q.palette = function () {
    if ($('.pov')) return; lastFocus = document.activeElement; var ov = document.createElement('div'); ov.className = 'pov'; ov.innerHTML = '<div class="pal" role="dialog" aria-modal="true" aria-label="Ask Fin"><input id="pin" placeholder="Ask Fin, or jump anywhere…" autocomplete="off" aria-label="Ask Fin or choose a command"><ul id="pl" role="listbox"></ul></div>'; document.body.appendChild(ov);
    var items = [['Go to the Observatory', 'scene', function () { Q.go('observatory'); }], ['Open the skill tree', 'scene', function () { Q.go('tree'); }], ['Open the quest board', 'scene', function () { Q.go('quests'); }], ['Open Fin Studio', 'scene', function () { Q.go('studio'); }], ['Talk to Fin about my situation', 'interview', function () { Q.go('intro'); }], ['Open the Link hub (connect or upload)', 'scene', function () { Q.go('link'); }], ['Open the Realm map', 'scene', function () { Q.go('realms'); }], ['Open the Time machine', 'scene', function () { Q.go('time'); }], ['Open the Vault', 'scene', function () { Q.go('vault'); }], ['Open Crew (household)', 'scene', function () { Q.go('crew'); }], ['Open Quiet hours', 'scene', function () { Q.go('quiet'); }], ['Load a sample profile', 'demo', ACT.demo], ['Switch to Calm', 'mode', ACT.calm], ['Switch theme (Midnight / Ivory)', 'theme', ACT.theme], ['Run engine checks', 'tests', ACT.tests]], sel = 0, cur = [];
    if (Q.simple()) items = [['Go to Home', 'screen', function () { Q.go('home'); }], ['See my plan', 'screen', function () { Q.go('plan'); }], ['My information', 'screen', function () { Q.go('info'); }], ['Talk to Fin', 'screen', function () { Q.go('studio'); }], ['Connect or upload my data', 'screen', function () { Q.go('link'); }], ['Open a sample profile', 'demo', ACT.demo], ['Switch theme', 'theme', ACT.theme]];
    var inp = $('#pin', ov), list = $('#pl', ov);
    function paint() { var q = inp.value.trim().toLowerCase(); cur = items.filter(function (i) { return !q || i[0].toLowerCase().indexOf(q) > -1; }); if (q) cur.push(['Ask Fin: "' + inp.value.trim() + '"', 'ask', function () { Q.pendingAsk = inp.value.trim(); Q.go('studio'); }]); if (sel >= cur.length) sel = 0; list.innerHTML = cur.map(function (i, k) { return '<li><button role="option" data-k="' + k + '" aria-selected="' + (k === sel) + '"><span>' + esc(i[0]) + '</span><span class="xs mut">' + i[1] + '</span></button></li>'; }).join(''); $$('button', list).forEach(function (b) { b.addEventListener('click', function () { run(+b.dataset.k); }); }); }
    function close() { ov.remove(); removeEventListener('keydown', key, true); if (lastFocus && lastFocus.focus) lastFocus.focus(); }
    function run(k) { var it = cur[k]; close(); if (it) it[2](); }
    function key(e) { if (e.key === 'Escape') close(); else if (e.key === 'ArrowDown') { e.preventDefault(); sel = (sel + 1) % cur.length; paint(); } else if (e.key === 'ArrowUp') { e.preventDefault(); sel = (sel - 1 + cur.length) % cur.length; paint(); } else if (e.key === 'Enter') { e.preventDefault(); run(sel); } }
    addEventListener('keydown', key, true); ov.addEventListener('click', function (e) { if (e.target === ov) close(); }); inp.addEventListener('input', function () { sel = 0; paint(); }); paint(); inp.focus();
  };

  /* ---- router ---- */
  Q.register = function (name, def) { Q.scenes[name] = def; };
  var SIMPLE_ALIAS = { home: 'observatory', plan: 'quests', info: 'vault' };
  Q.route = function () { var h = (location.hash || '').replace('#/', '').split('?')[0]; if (SIMPLE_ALIAS[h]) { h = SIMPLE_ALIAS[h]; try { history.replaceState(null, '', '#/' + h); } catch (e) { /* blocked */ } } if (Q.scenes[h]) return h; return (st().problem || Object.keys(st().facts).length) ? Q.home() : 'intro'; };
  Q.go = function (n) { if (location.hash === '#/' + n) Q.render(); else location.hash = '#/' + n; };
  Q.render = function (keep) {
    var n = Q.route(), sc = Q.scenes[n], y = window.scrollY; $('#stage').innerHTML = '<section class="scene" aria-live="polite">' + sc.render() + '</section>'; if (sc.bind) sc.bind($('#stage'));
    var isExtra = ['link', 'realms', 'time', 'vault', 'crew', 'quiet'].indexOf(n) > -1; $$('.dk[data-s]').forEach(function (a) { if (a.dataset.s === n || (a.dataset.s === 'more' && isExtra)) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); }); Q.hud(); document.title = 'FinScore Quest · ' + n.charAt(0).toUpperCase() + n.slice(1); window.scrollTo(0, keep ? y : 0);
  };
  Q.init = function () { applyPrefs(); sky.init(); buildChrome(); sky.paint(); addEventListener('hashchange', function () { Q.render(); }); Q.render(); };
  root.Q = Q;
})(window);
