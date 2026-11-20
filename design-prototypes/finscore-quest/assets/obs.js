/* Observatory: your FinScore as a living constellation. Fifteen factor stars in five branches around the score orb, with the
   eight wealth realms as a ring. Tap a star for factor, evidence, band, quest. */
(function (root) {
  'use strict';
  var E = root.FSEngine, M = root.FSModel, S = root.FSStore, Q = root.Q, esc = Q.esc, $ = Q.$, $$ = Q.$$, st = function () { return S.state; };
  var BR = [{ id: 'cash', name: 'Cash flow', f: ['F01', 'F02', 'F10', 'F09'] }, { id: 'wealth', name: 'Wealth', f: ['F03', 'F04', 'F05', 'F06'] }, { id: 'protect', name: 'Protection', f: ['F11', 'F12'] }, { id: 'tax', name: 'Tax', f: ['F13', 'F14'] }, { id: 'plan', name: 'Planning', f: ['F07', 'F08', 'F15'] }];
  Q.BRANCHES = BR;
  var REALM = ['#ff7b86', '#ff9a6b', '#ffb65c', '#e8c47c', '#b6dc7c', '#3ddca9', '#46c8e8', '#9b8cff'];
  var col = function (r) { return r >= 0.7 ? 'var(--em)' : r >= 0.5 ? 'var(--gold)' : 'var(--cor)'; };

  /** Position of every factor star, shared by the big and the mini constellation. */
  function layout(cx, cy, R, spread) {
    var pos = {}; BR.forEach(function (b, bi) { var th = (-90 + bi * 72) * Math.PI / 180, n = b.f.length; b.f.forEach(function (id, i) { var off = (i - (n - 1) / 2) * spread * Math.PI / 180, a = th + off, rr = R + (i % 2 ? 16 : -12) * (R / 265); pos[id] = { x: cx + rr * Math.cos(a), y: cy + rr * Math.sin(a), a: a, bi: bi }; }); }); return pos;
  }

  /** Text shown next to a star: its name, plus a word when it is not strong. */
  function labelText(f) { return f.name + (f.status === 'scored' ? (f.ratio >= 0.7 ? '' : ' · ' + (f.ratio >= 0.5 ? 'middling' : 'low')) : f.status === 'missing' ? ' · unknown' : ''); }
  /** Choose where each star label goes so it does not sit on a star, another label, a branch name or the score ring. */
  function placeLabels(res, pos, cx, cy) {
    var CW = 7.6, LH = 16, rects = [], stars = [], out = {};
    BR.forEach(function (b, bi) { var th = (-90 + bi * 72) * Math.PI / 180, x = cx + 332 * Math.cos(th), y = cy + 318 * Math.sin(th) + (Math.sin(th) > .5 ? 30 : 0), w = b.name.length * 7.6, c = Math.cos(th), a = Math.abs(c) < .3 ? 'm' : c > 0 ? 's' : 'e'; rects.push({ l: a === 's' ? x : a === 'e' ? x - w : x - w / 2, r: a === 's' ? x + w : a === 'e' ? x : x + w / 2, t: y - 13, b: y + 4 }); });
    res.factors.forEach(function (f) { var q = pos[f.id]; stars.push({ l: q.x - 20, r: q.x + 20, t: q.y - 20, b: q.y + 20 }); });
    var ov = function (a, b) { var w = Math.min(a.r, b.r) - Math.max(a.l, b.l), h = Math.min(a.b, b.b) - Math.max(a.t, b.t); return w > 0 && h > 0 ? w * h : 0; };
    res.factors.forEach(function (f) {
      var q = pos[f.id], u = [Math.cos(q.a), Math.sin(q.a)], w = labelText(f).length * CW, cands = [];
      [28, 42, 58].forEach(function (d) { var x = q.x + u[0] * d, y = q.y + u[1] * d + (u[1] > .3 ? 14 : u[1] < -.3 ? -2 : 5); cands.push({ x: x, y: y, a: u[0] > .25 ? 's' : u[0] < -.25 ? 'e' : 'm' }); });
      cands.push({ x: q.x + 26, y: q.y + 5, a: 's' }, { x: q.x - 26, y: q.y + 5, a: 'e' }, { x: q.x, y: q.y - 28, a: 'm' }, { x: q.x, y: q.y + 40, a: 'm' });
      var best = null, bestScore = 1e9;
      cands.forEach(function (c, i) {
        var r = { l: c.a === 's' ? c.x : c.a === 'e' ? c.x - w : c.x - w / 2, r: c.a === 's' ? c.x + w : c.a === 'e' ? c.x : c.x + w / 2, t: c.y - 17, b: c.y + 7 }, sc = i * 4;
        rects.forEach(function (o) { sc += ov(r, o) * 3; });
        stars.forEach(function (o) { sc += ov(r, o) * 3; });
        var dx = Math.max(Math.abs((r.l + r.r) / 2 - cx) - (r.r - r.l) / 2, 0), dy = Math.max(Math.abs((r.t + r.b) / 2 - cy) - (r.b - r.t) / 2, 0); if (Math.sqrt(dx * dx + dy * dy) < 140) sc += 4000;
        if (r.l < 6 || r.r > 894 || r.t < 6 || r.b > 694) sc += 8000;
        if (sc < bestScore) { bestScore = sc; best = { c: c, r: r }; }
      });
      rects.push(best.r); out[f.id] = { x: best.c.x, y: best.c.y, anc: best.c.a === 's' ? 'start' : best.c.a === 'e' ? 'end' : 'middle' };
    });
    return out;
  }
  Q.constellation = function (res, o) {
    o = o || {}; var cx = 450, cy = 340, pos = layout(cx, cy, 262, 17), s = '', rows = {}; res.factors.forEach(function (f) { rows[f.id] = f; });
    s += '<defs><radialGradient id="orbg" cx="38%" cy="32%"><stop offset="0" stop-color="#d9d2ff"/><stop offset="45%" stop-color="#7d6dff"/><stop offset="100%" stop-color="#2b2478"/></radialGradient><radialGradient id="halo"><stop offset="0" stop-color="#9b8cff" stop-opacity=".35"/><stop offset="1" stop-color="#9b8cff" stop-opacity="0"/></radialGradient></defs>';
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="190" fill="url(#halo)"/>';
    BR.forEach(function (b, bi) { var th = (-90 + bi * 72) * Math.PI / 180, lx = cx + 332 * Math.cos(th), ly = cy + 318 * Math.sin(th) + (Math.sin(th) > .5 ? 30 : 0), anc = Math.abs(Math.cos(th)) < .3 ? 'middle' : Math.cos(th) > 0 ? 'start' : 'end'; s += '<text class="sl br" x="' + lx.toFixed(0) + '" y="' + ly.toFixed(0) + '" text-anchor="' + anc + '">' + b.name + '</text>'; });
    // links to the orb
    res.factors.forEach(function (f) { var p = pos[f.id]; if (f.status === 'scored') s += '<line x1="' + cx + '" y1="' + cy + '" x2="' + p.x.toFixed(1) + '" y2="' + p.y.toFixed(1) + '" stroke="' + col(f.ratio) + '" stroke-width="' + (0.6 + f.ratio * 1.2).toFixed(1) + '" opacity="' + (0.14 + f.ratio * 0.3).toFixed(2) + '"/>'; else if (f.status === 'missing') s += '<line x1="' + cx + '" y1="' + cy + '" x2="' + p.x.toFixed(1) + '" y2="' + p.y.toFixed(1) + '" stroke="var(--mut)" stroke-width=".6" stroke-dasharray="3 6" opacity=".25"/>'; });
    // realm ring
    var cur = res.enough ? res.stage.n - 1 : -1;
    for (var i = 0; i < 8; i++) { var a0 = (-90 + i * 45 + 2) * Math.PI / 180, a1 = (-90 + (i + 1) * 45 - 2) * Math.PI / 180, r = 128; s += '<path d="M' + (cx + r * Math.cos(a0)).toFixed(1) + ' ' + (cy + r * Math.sin(a0)).toFixed(1) + ' A' + r + ' ' + r + ' 0 0 1 ' + (cx + r * Math.cos(a1)).toFixed(1) + ' ' + (cy + r * Math.sin(a1)).toFixed(1) + '" fill="none" stroke="' + REALM[i] + '" stroke-width="' + (i === cur ? 10 : 5) + '" stroke-linecap="round" opacity="' + (cur < 0 ? .2 : i === cur ? 1 : i < cur ? .55 : .2) + '"/>'; }
    if (cur >= 0) { var am = (-90 + cur * 45 + 22.5) * Math.PI / 180; s += '<circle cx="' + (cx + 128 * Math.cos(am)).toFixed(1) + '" cy="' + (cy + 128 * Math.sin(am)).toFixed(1) + '" r="7" fill="#fff" stroke="' + REALM[cur] + '" stroke-width="3"/>'; }
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="98" fill="url(#orbg)" stroke="rgba(255,255,255,.35)" stroke-width="1"/>';
    s += '<text id="orbScore" x="' + cx + '" y="' + (cy + 16) + '" text-anchor="middle" font-family="Iowan Old Style,Palatino Linotype,Georgia,serif" font-size="68" fill="#fff">' + Math.round(res.total) + '</text><text x="' + cx + '" y="' + (cy + 42) + '" text-anchor="middle" font-size="12" fill="#e6e0ff" opacity=".85" letter-spacing="2">OUT OF 900</text>';
    s += '<text class="sl" x="' + cx + '" y="' + (cy + 164) + '" text-anchor="middle" style="font-size:13px;fill:var(--ink)">' + (res.enough ? 'Realm ' + res.stage.n + ' · ' + res.stage.name + ' (provisional)' : 'Early estimate: no realm yet') + '</text>';
    // stars
    var k = 0, lpos = placeLabels(res, pos, cx, cy);
    res.factors.forEach(function (f) {
      var p = pos[f.id], d = o.reveal ? ' style="animation-delay:' + (350 + k * 130) + 'ms"' : '', cl = o.reveal ? 'ign' : '', lab = '', r;
      var lp = lpos[f.id];
      lab = '<text class="sl' + ((f.status === 'scored' && f.ratio < .7) || f.status === 'missing' ? ' attn' : '') + '" x="' + lp.x.toFixed(0) + '" y="' + lp.y.toFixed(0) + '" text-anchor="' + lp.anc + '">' + esc(labelText(f)) + '</text>';
      var body;
      if (f.status === 'scored') { r = 7 + f.ratio * 9; body = '<circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="' + (r + 9).toFixed(1) + '" fill="' + col(f.ratio) + '" opacity=".16"/><circle class="st" style="animation-delay:' + (k * 230 % 3400) + 'ms" cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="' + r.toFixed(1) + '" fill="' + col(f.ratio) + '"/>'; }
      else if (f.status === 'missing') body = '<circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="9" fill="none" stroke="var(--mut)" stroke-width="1.5" stroke-dasharray="3 3"/>';
      else body = '<circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="4" fill="var(--mut)" opacity=".5"/>';
      s += '<g class="starb ' + cl + '"' + d + ' tabindex="0" role="button" data-f="' + f.id + '" aria-label="' + esc(f.name) + ': ' + (f.status === 'scored' ? f.fscore + ' out of 10' : f.status === 'na' ? 'not applicable' : 'not lit yet') + '. Open details"><circle class="ring2" cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="40" fill="transparent" stroke="var(--vio)" stroke-width="0" opacity="0"/>' + body + lab + '</g>'; k++;
    });
    return '<svg viewBox="0 0 900 700" role="group" aria-label="Your score constellation: fifteen factor stars around the score orb">' + s + '</svg>';
  };
  Q.mini = function (cov) {
    var pos = layout(130, 112, 80, 24), st2 = {}, s = '<circle cx="130" cy="112" r="22" fill="none" stroke="var(--vio)" stroke-width="1" opacity=".5"/>'; cov.forEach(function (c) { st2[c.id] = c.state; });
    BR.forEach(function (b) { b.f.forEach(function (id) { var p = pos[id], z = st2[id] || 'Unknown'; s += z === 'Verified' ? '<circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="7" fill="var(--gold)"/><circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="12" fill="var(--gold)" opacity=".18"/>' : z === 'Partially Known' ? '<circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="7" fill="none" stroke="var(--gold)" stroke-width="2"/><circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="3" fill="var(--gold)"/>' : z === 'Stale' ? '<circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="7" fill="none" stroke="var(--cor)" stroke-width="2"/>' : '<circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="5" fill="none" stroke="var(--mut)" stroke-width="1.2" stroke-dasharray="2 3" opacity=".7"/>'; }); });
    return '<svg viewBox="0 0 260 224" role="img" aria-label="Star map of what Fin knows so far">' + s + '</svg>';
  };

  /** Trend compares like with like: only versions measured to the same extent. Early estimates scale differently, so they are never compared. */
  Q.trend = function () { var h = st().scores, last = h[h.length - 1]; if (!last) return null; for (var i = h.length - 2; i >= 0; i--) if (h[i].confidence === last.confidence) return { delta: Math.round((last.total - h[i].total) * 10) / 10, prev: h[i] }; return null; };
  /* ---- briefing: one thing for today ---- */
  Q.briefing = function () {
    var res = S.evaluate(); if (!res.scoredCount) return { h: 'Let us light your first stars', d: 'Tell Fin your money problem and answer a few questions. Nothing is saved until you confirm it.', cta: ['intro', 'Begin'] };
    var a = Q.topActions(1)[0], tn = Q.trend(), d = tn ? tn.delta : null, stale = Object.keys(st().facts).filter(function (k) { return S.stale(k); });
    var since = d !== null && Math.abs(d) >= 0.1 ? 'Since last time your score moved ' + (d > 0 ? '+' : '') + d + '. ' : '';
    if (stale.length && res.confidence < 1) return { h: 'Refresh what has gone stale', d: since + stale.length + ' fact' + (stale.length > 1 ? 's' : '') + ' look out of date, so your score is less reliable than it could be.', cta: ['intro', 'Ask Fin to refresh'] };
    if (a) return { h: a.label, d: since + a.text + '. Worth about +' + a.delta + ' points (an estimate from the rules engine).', cta: ['quests', 'See the quest'], a: a };
    return { h: 'You are in good shape', d: since + 'No action in the current library would raise your score further. Come back when something changes.', cta: ['studio', 'Talk to Fin'] };
  };

  /* ---- star detail sheet ---- */
  Q.drill = function (id) {
    var res = S.evaluate(), f = res.factors.filter(function (x) { return x.id === id; })[0], vals = S.values(), br = BR.filter(function (b) { return b.f.indexOf(id) > -1; })[0], fac = E.rules.factors.filter(function (x) { return x.id === id; })[0];
    var xp = S.award('review_why'); if (xp) Q.toast('+' + xp.xp + ' XP · you looked closer', '✦'); st().seen.score = 1; S.save(); Q.hud();
    var ev = (M.FACTOR_NEEDS[id] || []).filter(function (k) { return k !== 'age'; }).map(function (k) { var fa = st().facts[k]; return '<div class="kv"><span>' + esc(M.FDEF[k].label) + '</span><span><b>' + esc(Q.fmt(k, vals[k])) + '</b> ' + (fa ? Q.src(S.stale(k) ? 'STALE' : fa.source) : '') + '</span></div>'; }).join('');
    var head = '<button class="btn ghost sm" data-close style="float:right">Close</button><p class="eyebrow">' + esc(br.name) + ' · weight ' + fac.weight + '</p><h2>' + esc(f.name) + '</h2>';
    if (f.status !== 'scored') { Q.sheet(head + '<p class="mut" style="margin-top:8px">' + (f.status === 'na' ? esc(f.note) : (f.note ? esc(f.note) + ' ' : '') + 'This star is not lit yet. To light it Fin needs: <b>' + f.needs.filter(function (k) { return k !== 'age'; }).map(function (k) { return esc(M.FDEF[k].label.toLowerCase()); }).join(', ') + '</b>. Fin will not guess it.') + '</p><h4>What Fin knows</h4>' + ev + '<div class="row wrap" style="margin-top:20px"><button class="btn" data-go="intro">Light this star with Fin</button></div>', function (sh, close) { $$('[data-go]', sh).forEach(function (b) { b.addEventListener('click', function () { close(); Q.go(b.dataset.go); }); }); }); return; }
    var m = E.rules.matrices[f.matrix], ar = E.rules.age_bands.labels.indexOf(f.ageLabel), row = m.rows_by_age_band[ar], acts = Q.topActions(20).filter(function (a) { return a.factors.indexOf(id) > -1; }), next = row[f.band + 1] != null ? (row[f.band + 1] - f.fscore) / 10 * f.scaledMax : 0;
    var pips = '<div class="pips" aria-label="' + f.fscore + ' of 10">' + Array.apply(null, Array(10)).map(function (_, i) { return '<i class="' + (i < f.fscore ? 'on' : '') + '"></i>'; }).join('') + '</div>';
    Q.sheet(head + '<p class="mut" style="margin:6px 0 14px">' + f.scaledPoints.toFixed(1) + ' of ' + f.scaledMax.toFixed(1) + ' points · ' + (f.contribution >= 0 ? '+' : '') + f.contribution.toFixed(1) + ' versus par</p>' + pips + '<p class="sm" style="margin-top:6px">Level <b>' + f.fscore + '</b> of 10' + (next > 0.05 ? ' · next band is worth about <b>+' + next.toFixed(1) + '</b> points' : f.fscore >= 10 ? ' · top band' : '') + '</p>' +
      '<h4>Evidence</h4>' + ev + '<p class="xs mut" style="margin-top:6px">Measured: <b>' + (Math.round(f.unitValue * 100) / 100) + '</b> (' + esc(m.unit) + ')</p>' +
      '<h4>Where you stand</h4><div style="overflow-x:auto"><table class="mx"><thead><tr>' + m.band_labels.map(function (b) { return '<th>' + esc(b) + '</th>'; }).join('') + '</tr></thead><tbody><tr>' + row.map(function (x, i) { return '<td class="' + (i === f.band ? 'on' : '') + '">' + x + '</td>'; }).join('') + '</tr></tbody></table></div><p class="xs mut" style="margin-top:6px">Peer band ' + esc(f.ageLabel) + '. You are in "' + esc(f.bandLabel) + '", which scores ' + f.fscore + '/10.</p>' +
      '<h4>Quest</h4>' + (acts.length ? acts.slice(0, 2).map(function (a) { return '<p class="sm">' + esc(a.text) + ' <span class="badge">+' + a.delta + ' est.</span></p>'; }).join('') : '<p class="sm mut">' + (f.fscore >= 10 ? 'Already at the top band.' : 'No single quest in the current library moves this star.') + '</p>') +
      '<div class="row wrap" style="margin-top:20px">' + (acts.length ? '<button class="btn" data-go="quests">Open the quest</button>' : '') + '<button class="btn ghost" data-ask="What does ' + esc(f.name) + ' mean?">Ask Fin about this</button></div>' + (f.note ? '<p class="xs mut" style="margin-top:12px">' + esc(f.note) + '</p>' : ''),
      function (sh, close) { $$('[data-go]', sh).forEach(function (b) { b.addEventListener('click', function () { close(); Q.go(b.dataset.go); }); }); $$('[data-ask]', sh).forEach(function (b) { b.addEventListener('click', function () { close(); Q.pendingAsk = b.dataset.ask; Q.go('studio'); }); }); });
  };

  Q.register('observatory', {
    render: function () {
      var res = S.evaluate(), s = st();
      if (!res.scoredCount) return '<div class="empty" style="max-width:560px;margin:8vh auto"><b>The sky is still dark</b>Fin only lights a star once you have told it something real. Start a short conversation, or open a sample profile to look around.<div class="row wrap" style="justify-content:center;margin-top:18px"><button class="btn" data-go="intro">Talk to Fin</button><button class="btn ghost" data-demo>Open a sample profile</button></div></div>';
      var tn = Q.trend(), tr = tn ? tn.delta : null, br = Q.briefing(), reveal = !s.seen.revealDone;
      return '<h1 class="sr">Your score, factor by factor</h1><div class="obs"><div class="viz">' + Q.constellation(res, { reveal: reveal }) + '<div class="tip" id="tip" hidden></div></div><div class="wk"><p class="sm mut">Needs a look. Tap one to see why.</p><div class="row wrap" style="gap:8px;margin-top:8px">' + res.factors.filter(function (f) { return (f.status === 'scored' && f.ratio < .7) || f.status === 'missing'; }).map(function (f) { return '<button class="chip" data-wf="' + f.id + '">' + esc(labelText(f)) + '</button>'; }).join('') + '</div></div><aside class="stack"><div class="read"><div><b>' + Math.round(res.total) + '</b><span>Score</span></div><div><b>' + Math.round(res.confidence * 100) + '%</b><span>Measured</span></div><div><b style="color:' + (tr === null ? 'var(--mut)' : tr >= 0 ? 'var(--em)' : 'var(--cor)') + '">' + (tr === null ? '–' : (tr > 0 ? '+' : '') + tr) + '</b><span>Trend</span></div></div>' +
        '<div class="glass brief"><p class="eyebrow">Fin\'s briefing</p><h3>' + esc(br.h) + '</h3><p class="mut sm">' + esc(br.d) + '</p><div class="row wrap" style="margin-top:14px"><button class="btn" data-go="' + br.cta[0] + '">' + esc(br.cta[1]) + '</button><button class="btn ghost" data-ask="Why is my score what it is?">Why this score?</button></div></div>' +
        (res.message ? '<div class="glass sm">' + esc(res.message) + '</div>' : '') + '<details class="xs mut"><summary style="cursor:pointer">How to read this map</summary><p style="margin:6px 0 0">Bigger, greener stars are stronger. Dashed circles are not lit yet. The ring shows the eight realms; where you stand is provisional until the age × score matrix is approved.</p></details>' +
        (res.assumptions.length ? '<details class="xs mut"><summary style="cursor:pointer">Assumptions Fin made (' + res.assumptions.length + ')</summary><ul style="margin:6px 0 0;padding-left:18px">' + res.assumptions.map(function (a) { return '<li>' + esc(a) + '</li>'; }).join('') + '</ul></details>' : '') + '</aside></div>';
    },
    bind: function (m) {
      var s = st(), res = S.evaluate();
      $$('[data-go]', m).forEach(function (b) { b.addEventListener('click', function () { Q.go(b.dataset.go); }); }); $$('[data-ask]', m).forEach(function (b) { b.addEventListener('click', function () { Q.pendingAsk = b.dataset.ask; Q.go('studio'); }); });
      var d = $('[data-demo]', m); if (d) d.addEventListener('click', function () { S.loadDemo(); s.seen.revealDone = 0; Q.toast('Sample profile loaded (dummy data)', '🧪'); Q.render(); });
      if (!res.scoredCount) return; var tip = $('#tip', m), viz = $('.viz', m), rows = {}; res.factors.forEach(function (f) { rows[f.id] = f; });
      $$('[data-wf]', m).forEach(function (b) { b.addEventListener('click', function () { Q.drill(b.dataset.wf); }); });
      $$('.starb', m).forEach(function (g) { var f = rows[g.dataset.f]; function open() { Q.drill(f.id); } g.addEventListener('click', open); g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
        g.addEventListener('pointerenter', function () { var c = g.querySelector('circle:not(.ring2)').getBoundingClientRect(), v = viz.getBoundingClientRect(); tip.hidden = false; tip.innerHTML = '<b>' + esc(f.name) + '</b><br>' + (f.status === 'scored' ? f.fscore + '/10 · ' + esc(f.bandLabel) : f.status === 'na' ? 'Does not apply' : 'Not lit yet'); tip.style.left = (c.left + c.width / 2 - v.left) + 'px'; tip.style.top = (c.top - v.top) + 'px'; }); g.addEventListener('pointerleave', function () { tip.hidden = true; }); });
      if (!s.seen.revealDone) { s.seen.revealDone = 1; S.save(); var o = $('#orbScore', m); if (o) Q.count(o, Math.round(res.total), { dur: 1800, from: 300 }); if (res.enough) setTimeout(function () { Q.toast('Your first reading: realm ' + res.stage.n + ', ' + res.stage.name + ' (provisional)', '✨'); Q.confetti(); }, Q.motion() ? 2200 : 100); }
    }
  });
})(window);
