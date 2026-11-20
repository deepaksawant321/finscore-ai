/* Simple view: the default. Three tabs (Home, My plan, My info) plus Ask Fin. One score in plain words, one next step, nothing else.
   Same engine and same rules underneath; the detail lives in Full view. */
(function (root) {
  'use strict';
  var E = root.FSEngine, M = root.FSModel, S = root.FSStore, Q = root.Q, esc = Q.esc, $ = Q.$, $$ = Q.$$, st = function () { return S.state; };
  var word = function (t) { return t >= 700 ? ['Strong', 'var(--em)'] : t >= 500 ? ['Doing well', 'var(--gold)'] : ['Needs attention', 'var(--cor)']; };
  function gauge(v, color) {
    var cx = 150, cy = 140, r = 112, ang = function (x) { return Math.PI * (1 - x / 900); }, pt = function (x) { return [cx + r * Math.cos(ang(x)), cy - r * Math.sin(ang(x))]; }, arc = function (a, b) { var p = pt(a), q = pt(b); return 'M' + p[0].toFixed(1) + ' ' + p[1].toFixed(1) + ' A' + r + ' ' + r + ' 0 0 1 ' + q[0].toFixed(1) + ' ' + q[1].toFixed(1); }, k = pt(Math.max(1, Math.min(900, v)));
    return '<div class="sg"><svg viewBox="0 0 300 160" role="img" aria-label="Score ' + Math.round(v) + ' out of 900"><path d="' + arc(0, 900) + '" fill="none" stroke="var(--line)" stroke-width="16" stroke-linecap="round"/><path d="' + arc(0, Math.max(2, v)) + '" fill="none" stroke="' + color + '" stroke-width="16" stroke-linecap="round"/><circle cx="' + k[0].toFixed(1) + '" cy="' + k[1].toFixed(1) + '" r="9" fill="var(--bg2)" stroke="' + color + '" stroke-width="4"/></svg><div class="sv"><b id="sScore" class="num">' + Math.round(v) + '</b><span>out of 900</span></div></div>';
  }
  var empty = function (t) { return '<div class="empty" style="max-width:560px;margin:8vh auto"><b>Let us check your money health</b>' + t + '<div class="row wrap" style="justify-content:center;margin-top:18px"><button class="btn" data-go="intro">Get started</button><button class="btn ghost" data-demo>Open a sample</button></div></div>'; };
  function wire(m) {
    $$('[data-go]', m).forEach(function (b) { b.addEventListener('click', function () { Q.go(b.dataset.go); }); });
    var d = $('[data-demo]', m); if (d) d.addEventListener('click', function () { S.loadDemo(); st().seen.revealDone = 1; Q.toast('Sample profile loaded (dummy data)', '🧪'); Q.render(); });
    var f = $('[data-full]', m); if (f) f.addEventListener('click', function () { Q.setView('full'); });
  }

  /* ---------------- Home ---------------- */
  Q.register('home', {
    render: function () {
      var res = S.evaluate(); if (!res.scoredCount) return empty('Answer a few easy questions, or link your accounts, and Fin will show your score and one thing to do next.');
      var w = word(res.total), conf = Math.round(res.confidence * 100), sure = conf >= 90 ? 'High' : conf >= 60 ? 'Medium' : 'Low', top = Q.visibleQuests()[0], v = S.values(), t = Q.tally();
      var inc = v.income_m, spend = typeof v.expenses_m === 'number' ? v.expenses_m + (v.emi_total || 0) : null, left = typeof inc === 'number' && spend !== null ? inc - spend : null;
      var tile = function (k, val, sub, c) { return '<div class="stile"><span>' + k + '</span><b class="num" style="' + (c ? 'color:' + c : '') + '">' + (val === null || val === undefined ? '–' : M.compact(val)) + '</b><small>' + sub + '</small></div>'; };
      return '<div class="shome"><section class="sscore"><p class="eyebrow">Your money health</p>' + gauge(res.total, w[1]) + '<h1 style="color:' + w[1] + '">' + w[0] + '</h1><p class="mut">' + esc(res.message || 'Early estimate') + '</p><p class="xs mut" style="margin-top:6px">' + (conf === 100 ? 'Based on all of your information' : 'Based on ' + conf + '% of your information') + ' · ' + sure + ' confidence</p></section>' +
        (top ? '<section class="snext"><p class="eyebrow">Your next step</p><h2>' + esc(top.label) + '</h2><p class="mut">' + esc(top.text) + '. This could raise your score by about <b style="color:var(--em)">' + top.delta + ' points</b>.</p><div class="row wrap" style="margin-top:16px"><button class="btn" data-go="plan">Show me how</button></div></section>' : '<section class="snext"><p class="eyebrow">Your next step</p><h2>You are all set for now</h2><p class="mut">Nothing in the current list would raise your score. Come back when something changes.</p></section>') +
        '<section class="stiles" aria-label="Your month">' + tile('Comes in', inc, 'each month') + tile('Goes out', spend, 'spending and EMIs') + tile('Left over', left, 'each month', left === null ? '' : left >= 0 ? 'var(--em)' : 'var(--cor)') + '</section>' +
        (t.missing > 0 || conf < 100 ? '<section class="sinfo"><div class="grow"><b>Make your score more accurate</b><p class="sm mut">Add a few details. Linking your accounts takes under a minute.</p></div><button class="btn ghost" data-go="info">Add my info</button></section>' : '') +
        '<p class="xs mut" style="text-align:center;margin-top:18px">Want every detail, like skills and levels? <button class="btn ghost sm" data-full>Switch to Full detail</button></p></div>';
    },
    bind: function (m) { wire(m); var s = $('#sScore', m); if (s) Q.count(s, +s.textContent, { from: Math.max(300, +s.textContent - 120), dur: 1200 }); }
  });

  /* ---------------- My plan ---------------- */
  Q.register('plan', {
    render: function () {
      var res = S.evaluate(); if (!res.scoredCount) return empty('Your plan is built from your own numbers, so Fin needs a few of them first.');
      var a = st().actions, steps = Q.visibleQuests().slice(0, 3), done = Object.keys(a.done).length; steps.forEach(function (x) { if (!a.suggested[x.id]) a.suggested[x.id] = S.now(); }); S.save();
      return '<div class="shead"><h1>Small steps, big difference</h1><p class="mut">Do them in any order. Mark a step done only once it is really true.</p></div>' +
        (steps.length ? steps.map(function (x, i) { return '<article class="sstep"><div class="num2" aria-hidden="true">✦</div><div class="grow"><h3>' + esc(x.label) + '</h3><p class="mut sm">' + esc(x.text) + '.</p>' + (x.delta >= 20 ? '<p class="warn" style="margin-top:8px"><b>Big jump.</b> In the rules this is a yes-or-no step, so it moves many points at once. Only mark it done when it is true.</p>' : '') + '<div class="row wrap" style="margin-top:12px"><span class="pill gold">About +' + x.delta + ' points</span><button class="btn sm" data-do="' + x.id + '">I have done this</button><button class="btn ghost sm" data-later="' + x.id + '">Not now</button></div></div></article>'; }).join('') : '<div class="empty"><b>You are all caught up</b>No step in the current list would raise your score further.</div>') +
        (done ? '<p class="mut sm" style="margin-top:16px">You have completed ' + done + ' step' + (done > 1 ? 's' : '') + ' so far. Nice work.</p>' : '') + '<p class="xs mut" style="margin-top:14px">Estimates only. The effect on your score is worked out by Fin\'s rules, not guessed.</p>';
    },
    bind: function (m) {
      wire(m); var steps = Q.visibleQuests().slice(0, 3), a = st().actions, one = function (id) { return steps.filter(function (x) { return x.id === id; })[0]; };
      $$('[data-do]', m).forEach(function (b) { b.addEventListener('click', function () { Q.completeQuest(one(b.dataset.do)); }); });
      $$('[data-later]', m).forEach(function (b) { b.addEventListener('click', function () { a.snoozed = a.snoozed || {}; a.snoozed[b.dataset.later] = S.now() + 7 * S.DAY; a.snoozes++; S.save(); Q.toast('Fin will remind you in a week', '⏰'); Q.render(true); }); });
    }
  });

  /* ---------------- My info ---------------- */
  Q.register('info', {
    render: function () {
      var t = Q.tally(), s = st(), known = t.data + t.typed, pct = Math.round(known / t.total * 100), keys = Object.keys(s.facts).filter(function (k) { return M.FDEF[k]; }).slice(0, 8), miss = M.FACTS.filter(function (d) { return !M.OPTIONAL[d.key] && !s.facts[d.key]; }).slice(0, 4);
      return '<div class="shead"><h1>What Fin knows about you</h1><p class="mut">The more Fin knows, the more accurate your score. You always see and approve what is saved.</p></div>' +
        '<section class="glass"><div class="row between wrap"><b>' + known + ' of ' + t.total + ' things known</b><span class="mut sm">' + pct + '%</span></div><div class="bar2s"><i style="width:' + pct + '%"></i></div>' + (miss.length ? '<p class="xs mut" style="margin-top:8px">Still missing: ' + miss.map(function (d) { return esc(d.label.toLowerCase().replace(/ \(.*/, '')); }).join(', ') + (t.missing > miss.length ? ' and more' : '') + '.</p>' : '<p class="xs mut" style="margin-top:8px">Fin has everything it needs.</p>') + '</section>' +
        '<div class="qrow" style="margin-top:14px"><button class="qc" data-go="link" style="text-align:left"><b>Connect my accounts</b><span class="sm mut">Fin finds your numbers. You approve them.</span></button><button class="qc" data-stmt style="text-align:left"><b>Upload a bank statement</b><span class="sm mut">Read privately in your browser.</span></button><button class="qc" data-say style="text-align:left"><b>Tell Fin in my own words</b><span class="sm mut">Type or speak. Fin picks out the numbers.</span></button></div>' +
        '<section class="glass" style="margin-top:18px"><div class="row between wrap"><b>What Fin knows</b><button class="btn ghost sm" data-go="vault">See and edit everything</button></div>' + (keys.length ? keys.map(function (k) { return '<div class="kv"><span>' + esc(M.FDEF[k].label) + '</span><span><b>' + esc(Q.fmt(k, s.facts[k].value)) + '</b> ' + Q.src(S.stale(k) ? 'STALE' : s.facts[k].source) + '</span></div>'; }).join('') : '<p class="sm mut" style="margin-top:8px">Nothing yet.</p>') + '</section>';
    },
    bind: function (m) {
      wire(m); var sm = $('[data-stmt]', m); if (sm) sm.addEventListener('click', function () { location.hash = '#/link?stmt'; });
      var sy = $('[data-say]', m); if (sy) sy.addEventListener('click', function () { Q.modal({ title: 'Tell Fin in your own words', html: '<p class="sm mut">For example: "I earn 1.4 lakh a month, spend 52,000 and have 5 lakh of life cover." Fin picks out the numbers and asks you to confirm.</p><textarea class="inp" id="tx" rows="4" style="margin-top:10px;font-size:15px;border-radius:14px" placeholder="Type here"></textarea>', actions: [{ label: 'Cancel', cls: 'ghost' }, { label: 'Speak instead', cls: 'ghost', fn: function (mm, close) { close(); Q.listen(function (t) { Q.fromSpoken(t); }); } }, { label: 'Read it', fn: function (mm) { var t = $('#tx', mm).value.trim(); if (!t) { Q.toast('Please write something first.', 'ℹ️'); return true; } Q.fromSpoken(t); } }] }); });
    }
  });
})(window);
