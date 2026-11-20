/* financial-journey.html: Score Journey, Savings Adventure, Independence planner, Achievements. Dummy data; illustrative maths only. */
(function () {
  'use strict';
  var FS = window.FS, $ = FS.$, $$ = FS.$$, esc = FS.esc, inr = FS.inr;
  var lakh = function (v) { return v >= 1e7 ? '₹' + (v / 1e7).toFixed(2) + ' Cr' : '₹' + (v / 1e5).toFixed(1) + ' L'; };

  /* ===== B. SCORE JOURNEY ===== */
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'];
  var HIST = [612, 618, 621, 630, 628, 634, 639, 641, 644, 646, 648];
  var STAGES = [['Dependency', 'Relying on others for most essentials.'], ['Survival', 'Covering monthly needs with little buffer.'], ['Security', 'A basic buffer and protection are forming.'], ['Stability', 'Regular surplus and debts under control.'], ['Accumulation', 'Investing steadily towards your goals.'], ['Independence', 'Savings and income start covering core needs.'], ['Freedom', 'You choose how to spend your time.'], ['Abundance', 'Wealth supports legacy and giving.']];
  var ACTIONS = [['Build your emergency fund to 3 months', 14, 'Goals'], ['Review your term cover', 9, 'Health check'], ['Pay card dues in full for 3 months', 11, 'Money Map'], ['Run a tax-saving fit check', 6, 'AI Coach']];
  var CX = 130, CY = 124, R = 104;
  var pt = function (deg) { return [CX + R * Math.cos(deg * Math.PI / 180), CY + R * Math.sin(deg * Math.PI / 180)]; };
  var arc = function (a, b) { var p = pt(a), q = pt(b); return 'M' + p[0].toFixed(2) + ' ' + p[1].toFixed(2) + ' A' + R + ' ' + R + ' 0 ' + (b - a > 180 ? 1 : 0) + ' 1 ' + q[0].toFixed(2) + ' ' + q[1].toFixed(2); };
  var shown = 648, month = 10, picked = {};
  function stageOf(v) { return Math.max(0, Math.min(7, Math.floor((v - 300) / 75))); }
  function drawGauge(v) {
    var segs = '', i; for (i = 0; i < 8; i++) segs += '<path d="' + arc(135 + i * 33.75 + 1.5, 135 + (i + 1) * 33.75 - 1.5) + '" fill="none" stroke="var(--surface-2)" stroke-width="14" stroke-linecap="round"/>';
    var end = 135 + 270 * (v - 300) / 600, k = pt(end);
    $('#gauge').innerHTML = '<defs><linearGradient id="gg" x1="0" x2="1"><stop offset="0" stop-color="var(--brand)"/><stop offset="1" stop-color="var(--ai)"/></linearGradient></defs>' + segs + '<path d="' + arc(135, Math.max(136, end)) + '" fill="none" stroke="url(#gg)" stroke-width="14" stroke-linecap="round"/><circle cx="' + k[0].toFixed(1) + '" cy="' + k[1].toFixed(1) + '" r="9" fill="var(--surface)" stroke="var(--ai)" stroke-width="4"/>';
  }
  function setScore(v, animate) {
    var from = shown, t0 = null, dur = animate && !FS.reduce ? 700 : 0;
    function step(t) { if (!t0) t0 = t; var k = dur ? Math.min(1, (t - t0) / dur) : 1, cur = from + (v - from) * (1 - Math.pow(1 - k, 3)); drawGauge(cur); $('#gScore').textContent = Math.round(cur); if (k < 1) requestAnimationFrame(step); }
    requestAnimationFrame(step); shown = v;
    var s = stageOf(v); $('#stageName').textContent = STAGES[s][0]; $('#stageNum').textContent = 'Stage ' + (s + 1) + ' of 8';
    var d = v - HIST[0]; $('#gDelta').textContent = (d >= 0 ? '+' : '') + d + ' since Jan';
    renderStages(s);
  }
  function renderStages(cur) {
    $('#stages').innerHTML = STAGES.map(function (s, i) { return '<li><button data-i="' + i + '" class="' + (i < cur ? 'done' : i === cur ? 'now' : i === cur + 1 ? 'next' : '') + '"><span class="n">STAGE ' + (i + 1) + (i < cur ? ' ✓' : '') + '</span><b>' + s[0] + '</b><span class="xs muted">' + (300 + i * 75) + '+</span></button></li>'; }).join('');
    $$('#stages button').forEach(function (b) { b.addEventListener('click', function () { var i = +b.dataset.i; FS.modal({ title: STAGES[i][0], icon: i < cur ? '✅' : i === cur ? '📍' : '🔒', html: '<p class="muted">' + esc(STAGES[i][1]) + '</p><p class="small" style="margin-top:10px">Illustrative band: ' + (300 + i * 75) + ' to ' + (375 + i * 75 - 1) + '. ' + (i < cur ? 'You have passed this stage.' : i === cur ? 'You are here.' : 'Ahead of you: ' + (300 + i * 75 - HIST[10]) + ' points away.') + '</p>', actions: [{ label: 'Close' }] }); }); });
  }
  function drawHist() {
    var mn = 600, mx = 660, p = HIST.map(function (v, i) { return [10 + i * 30, 80 - (v - mn) / (mx - mn) * 70]; });
    $('#hist').innerHTML = '<polyline fill="none" stroke="var(--brand)" stroke-width="3" stroke-linejoin="round" points="' + p.map(function (q) { return q.join(','); }).join(' ') + '"/>' + p.map(function (q, i) { return '<circle cx="' + q[0] + '" cy="' + q[1] + '" r="' + (i === month ? 6 : 3) + '" fill="' + (i === month ? 'var(--ai)' : 'var(--brand)') + '"/>'; }).join('');
  }
  function projected() { return HIST[10] + ACTIONS.reduce(function (s, a, i) { return s + (picked[i] ? a[1] : 0); }, 0); }
  function renderMilestone() {
    var v = month === 10 ? projected() : HIST[month], s = stageOf(v), nextAt = 300 + (s + 1) * 75;
    if (s >= 7) { $('#nextMs').textContent = 'Top stage reached'; $('#msBar').style.width = '100%'; $('#msTxt').textContent = ''; return; }
    var start = 300 + s * 75; $('#nextMs').textContent = STAGES[s + 1][0] + ' at ' + nextAt;
    $('#msBar').style.width = Math.round((v - start) / 75 * 100) + '%'; $('#msTxt').textContent = (nextAt - v) + ' points to go (illustrative).';
  }
  function initScore() {
    $('#actions').innerHTML = ACTIONS.map(function (a, i) { return '<label class="act" data-i="' + i + '"><input type="checkbox"><span><b>' + esc(a[0]) + '</b><span class="xs muted">Opens: ' + esc(a[2]) + '</span></span><span class="gain">+' + a[1] + '</span></label>'; }).join('');
    $$('#actions input').forEach(function (c, i) {
      c.addEventListener('change', function () {
        picked[i] = c.checked; c.closest('.act').classList.toggle('on', c.checked); var before = stageOf(shown), v = projected(); $('#month').value = 10; month = 10; $('#monthLbl').textContent = MONTHS[10];
        setScore(v, true); $('#proj').textContent = v; drawHist(); renderMilestone();
        if (stageOf(v) > before && c.checked) { FS.confetti(); FS.toast('Preview: you could reach ' + STAGES[stageOf(v)][0], '🚀'); }
      });
    });
    $('#month').addEventListener('input', function (e) { month = +e.target.value; $('#monthLbl').textContent = MONTHS[month]; var v = month === 10 ? projected() : HIST[month]; setScore(v, true); drawHist(); renderMilestone(); });
    drawHist(); drawGauge(648); setScore(648, false); renderMilestone();
    $('#baScore1').textContent = HIST[0]; $('#baScore2').textContent = HIST[10];
  }

  /* ===== F. SAVINGS ADVENTURE ===== */
  var GOALS = [{ n: 'Emergency fund', t: 300000, s: 174000, e: '🛡️' }, { n: 'Trip to Japan', t: 200000, s: 62000, e: '✈️' }, { n: 'Home down payment', t: 1500000, s: 410000, e: '🏠' }];
  var CHAL = [{ n: 'No-spend weekend', d: 'Skip non-essentials for 2 days', v: 2000 }, { n: 'Round-up week', d: 'Round each spend to the next ₹50', v: 420 }, { n: 'Pause one subscription', d: 'Cancel or pause one for a month', v: 599 }];
  var gi = 0, gDone = {}, trailLen = 0;
  function renderGoalPick() {
    $('#goalPick').innerHTML = GOALS.map(function (g, i) { return '<button data-i="' + i + '" aria-selected="' + (i === gi) + '">' + g.e + ' ' + esc(g.n.split(' ')[0]) + '</button>'; }).join('');
    $$('#goalPick button').forEach(function (b) { b.addEventListener('click', function () { gi = +b.dataset.i; renderGoal(true); renderGoalPick(); }); });
  }
  function drawTrail() {
    $('#trail').innerHTML = '<defs><linearGradient id="tg" x1="0" x2="1"><stop offset="0" stop-color="var(--brand)"/><stop offset="1" stop-color="var(--ai)"/></linearGradient></defs><path id="tp" class="trail-path" d="M25 175 C 90 175 100 95 165 100 S 240 175 300 130 S 380 40 435 45"/><path id="td" class="trail-done" stroke="url(#tg)" d="M25 175 C 90 175 100 95 165 100 S 240 175 300 130 S 380 40 435 45"/><g id="flags"></g><g id="avatar"><circle r="17" fill="var(--surface)" stroke="var(--ai)" stroke-width="3"/><text text-anchor="middle" y="6" font-size="18">🚶</text></g>';
    var tp = $('#tp'); trailLen = tp.getTotalLength(); var td = $('#td'); td.style.strokeDasharray = trailLen; td.style.strokeDashoffset = trailLen; td.style.transition = FS.reduce ? 'none' : 'stroke-dashoffset .9s cubic-bezier(.2,.8,.2,1)';
    $('#flags').innerHTML = [0.25, 0.5, 0.75, 1].map(function (f) { var p = tp.getPointAtLength(trailLen * f); return '<text class="flag" id="fl' + (f * 100) + '" x="' + (p.x - 8) + '" y="' + (p.y - 16) + '">' + (f === 1 ? '🏁' : '🚩') + '</text>'; }).join('');
  }
  function renderGoal(first) {
    var g = GOALS[gi], p = Math.min(1, g.s / g.t), tp = $('#tp'), pnt = tp.getPointAtLength(trailLen * p);
    $('#gName').textContent = g.n; $('#gTarget').textContent = inr(g.t); FS.count($('#gSaved'), g.s, { prefix: '₹', dur: first ? 600 : 500, from: first ? 0 : undefined });
    $('#gPct').textContent = Math.round(p * 100) + '%'; $('#gRing').dataset.p = Math.round(p * 100); $('#gRing').style.setProperty('--p', Math.round(p * 100));
    $('#td').style.strokeDashoffset = trailLen * (1 - p); $('#avatar').style.transform = 'translate(' + pnt.x + 'px,' + pnt.y + 'px)';
    $$('#flags text').forEach(function (t) { var f = +t.id.slice(2) / 100; t.style.opacity = p >= f ? 1 : .35; });
    $('#msList').innerHTML = [25, 50, 75, 100].map(function (m) { var hit = p * 100 >= m; return '<li><span>' + (hit ? '✅' : '⬜') + ' ' + m + '% · ' + inr(g.t * m / 100) + '</span><span class="muted">' + (hit ? 'reached' : inr(g.t * m / 100 - g.s) + ' to go') + '</span></li>'; }).join('');
    renderChal();
  }
  function addSaved(a) {
    var g = GOALS[gi], before = g.s / g.t * 100; g.s = Math.min(g.t, g.s + a); var after = g.s / g.t * 100; renderGoal();
    [25, 50, 75, 100].forEach(function (m) {
      if (before < m && after >= m) {
        FS.addPoints(m === 100 ? 100 : 20, m + '% milestone');
        if (m === 100) { FS.confetti(); FS.unlockBadge('goal_getter', 'Goal Getter'); FS.modal({ title: 'Goal reached!', icon: '🏁', html: '<p>You completed <b>' + esc(g.n) + '</b> in this simulation. In the real product this is where we would suggest the next goal, never a purchase.</p>', actions: [{ label: 'Nice' }] }); renderBadges(); }
        else FS.toast(m + '% of ' + g.n + ' reached', '🚩');
      }
    });
  }
  function renderChal() {
    $('#chal').innerHTML = CHAL.map(function (c, i) { var k = gi + '-' + i, st = gDone[k] || 'todo'; return '<div class="card flat tight"><div class="row between"><div><b>' + esc(c.n) + '</b><p class="xs muted">' + esc(c.d) + ' · est. ' + inr(c.v) + '</p></div><button class="btn sm ' + (st === 'done' ? 'ghost' : '') + '" data-i="' + i + '" ' + (st !== 'todo' ? 'disabled' : '') + '>' + (st === 'todo' ? 'Start' : st === 'run' ? '<span class="spinner"></span>' : 'Done ✓') + '</button></div></div>'; }).join('');
    $$('#chal button').forEach(function (b) {
      b.addEventListener('click', function () { var i = +b.dataset.i, k = gi + '-' + i, goal = gi; gDone[k] = 'run'; renderChal(); setTimeout(function () { gDone[k] = 'done'; FS.addPoints(15, CHAL[i].n); if (goal === gi) { addSaved(CHAL[i].v); } else { GOALS[goal].s = Math.min(GOALS[goal].t, GOALS[goal].s + CHAL[i].v); } }, FS.reduce ? 100 : 1400); });
    });
  }
  function initSavings() { renderGoalPick(); drawTrail(); renderGoal(true); $$('[data-add]').forEach(function (b) { b.addEventListener('click', function () { addSaved(+b.dataset.add); }); }); $('#gReset').addEventListener('click', function () { GOALS[gi].s = [174000, 62000, 410000][gi]; gDone = {}; renderGoal(); }); }

  /* ===== K. INDEPENDENCE ===== */
  function loan(extra) { var P = 300000, r = .14 / 12, N = 36, emi = P * r / (1 - Math.pow(1 + r, -N)), b = P, m = 0, int = 0; while (b > 0.5 && m < 600) { var i = b * r; int += i; b = b + i - emi - extra; m++; } return { emi: emi, months: m, interest: int }; }
  function renderDebt() {
    var e = +$('#extra').value, base = loan(0), x = loan(e); $('#extraO').textContent = inr(e);
    $('#debtOut').innerHTML = 'EMI ' + inr(base.emi) + '. ' + (e ? 'Debt-free in <b>' + x.months + ' months</b>, ' + (base.months - x.months) + ' sooner, saving about <b>' + inr(base.interest - x.interest) + '</b> interest.' : 'Debt-free in <b>' + base.months + ' months</b>. Move the slider to try extra payments.');
  }
  function corpus(g, y, sip) { var rm = Math.pow(1 + g, 1 / 12) - 1; return 800000 * Math.pow(1 + g, y) + sip * (Math.pow(1 + rm, 12 * y) - 1) / rm; }
  function renderRet() {
    var sip = +$('#sip').value, age = +$('#rage').value, y = age - 31; $('#sipO').textContent = inr(sip) + '/mo'; $('#rageO').textContent = 'age ' + age;
    var need = 25 * 60000 * 12 * Math.pow(1.06, y), vals = [.08, .10, .12].map(function (g) { return corpus(g, y, sip); }), pct = Math.round(vals[1] / need * 100);
    $('#retPct').textContent = pct + '%'; $('#retRing').dataset.p = Math.min(100, pct); $('#retRing').style.setProperty('--p', Math.min(100, pct));
    $('#retTxt').textContent = 'Base case covers ' + pct + '% of the corpus needed at ' + age + ' (' + lakh(need) + ').';
    var mx = Math.max(need, vals[2]) * 1.08, w = function (v) { return 90 + v / mx * 240; }, names = ['Low 8%', 'Base 10%', 'High 12%'], cols = ['#8aa0b4', 'var(--brand)', 'var(--ai)'];
    $('#range').innerHTML = vals.map(function (v, i) { return '<text x="0" y="' + (28 + i * 32) + '" font-size="11" fill="var(--muted)">' + names[i] + '</text><rect x="90" y="' + (14 + i * 32) + '" width="' + (w(v) - 90).toFixed(1) + '" height="20" rx="6" fill="' + cols[i] + '"/><text x="' + (w(v) - 4).toFixed(1) + '" y="' + (28 + i * 32) + '" font-size="11" font-weight="700" text-anchor="end" fill="#fff">' + lakh(v) + '</text>'; }).join('') + '<line x1="' + w(need).toFixed(1) + '" x2="' + w(need).toFixed(1) + '" y1="4" y2="112" stroke="var(--negative)" stroke-dasharray="4 3" stroke-width="2"/><text x="' + (w(need) - 4).toFixed(1) + '" y="118" font-size="10" text-anchor="end" fill="var(--negative)">needed ' + lakh(need) + '</text>';
  }
  var LEARN = [['What is an emergency fund?', 'Money set aside for surprises such as a job gap or medical bill. 3 to 6 months of essential costs is a common target. Keep it accessible and separate from investments.'], ['Why does starting early matter?', 'Compounding needs time. With the same monthly amount, someone who starts 10 years earlier can end up with well over double the corpus, because growth earns growth.'], ['What does "25×" mean?', 'A rule of thumb: the corpus needed is about 25 times your first-year expenses at retirement, based on withdrawing around 4% a year. It is a starting point, not a guarantee. Your plan may differ.']];
  function initInd() {
    $('#learn').innerHTML = LEARN.map(function (l, i) { return '<button class="card flat tight interactive" data-i="' + i + '"><b>📘 ' + esc(l[0]) + '</b></button>'; }).join('');
    $$('#learn button').forEach(function (b) { b.addEventListener('click', function () { var l = LEARN[+b.dataset.i]; FS.modal({ title: l[0], icon: '📘', html: '<p class="muted">' + esc(l[1]) + '</p>', actions: [{ label: 'Got it', cls: '', fn: function () { FS.addPoints(5, 'lesson read'); } }] }); }); });
    $('#extra').addEventListener('input', renderDebt); $('#sip').addEventListener('input', renderRet); $('#rage').addEventListener('input', renderRet); renderDebt(); renderRet();
  }

  /* ===== I. ACHIEVEMENTS ===== */
  var COLL = [
    ['Foundations', [['first_score', '◎', 'First Score', 'See your first Finscore.', 'Complete the quick start.', 1], ['protected', '⛨', 'Protected', 'Review your protection cover.', 'Answer the insurance chapter in Money Map.', 1], ['fine_tuned', '✎', 'Fine-tuned', 'Correct a detail Finscore got wrong.', 'Edit a fact in your profile.', 1], ['full_picture', '★', 'Full Picture', 'Complete every chapter.', 'Finish all Money Map chapters.', 1]]],
    ['Habits', [['steady_4', '◷', 'Steady 4', 'Active four weeks.', 'Be active in 4 weeks, they needn\'t be in a row.', 1], ['curious_mind', '🧠', 'Curious Mind', 'Learn 5 cards in a day.', 'Finish five Knowledge Cards.', 0], ['quiz_ace', '🏆', 'Quiz Ace', 'Perfect quiz round.', 'Score 5/5 in Quiz Arena.', 0], ['self_aware', '🪞', 'Self-aware', 'Know your money personality.', 'Complete the personality test.', 0]]],
    ['Planner', [['tax_smart', '₹', 'Tax-smart', 'Check tax-saving fit.', 'Complete the tax chapter.', 1], ['goal_getter', '🎯', 'Goal Getter', 'Complete a savings goal.', 'Reach 100% on any goal in the Savings Adventure.', 0], ['steady_hands', '🤲', 'Steady Hands', 'Finish the investing simulation.', 'Play all five years in the Investing Sim.', 0], ['debt_slayer', '⚔️', 'Debt Slayer', 'Plan to clear a debt early.', 'Try an extra payment plan in Independence.', 0]]]
  ];
  var filter = 'all';
  function renderBadges() {
    var own = FS.state().badges; FS.renderChips();
    $('#collections').innerHTML = COLL.map(function (c) {
      var items = c[1].filter(function (b) { var on = own.indexOf(b[0]) > -1; return filter === 'all' || (filter === 'on') === on; }), have = c[1].filter(function (b) { return own.indexOf(b[0]) > -1; }).length;
      return '<div><div class="row between"><h3>' + c[0] + '</h3><span class="badge">' + have + ' / ' + c[1].length + '</span></div><div class="bar" style="margin:8px 0 14px"><i data-w="' + Math.round(have / c[1].length * 100) + '" style="width:' + Math.round(have / c[1].length * 100) + '%"></i></div>' + (items.length ? '<div class="bgrid">' + items.map(function (b) { var on = own.indexOf(b[0]) > -1; return '<button class="badge-t ' + (on ? '' : 'locked') + '" data-id="' + b[0] + '"><span class="ico" aria-hidden="true">' + b[1] + '</span><b>' + esc(b[2]) + '</b><small>' + (on ? 'Unlocked' : 'Locked') + '</small>' + (b[5] ? '<span class="badge ex xs">Exists</span>' : '<span class="badge new ex xs">New</span>') + '</button>'; }).join('') + '</div>' : '<div class="empty">Nothing here. ' + (filter === 'on' ? 'Earn your first badge!' : 'You have them all! 🎉') + '</div>') + '</div>';
    }).join('');
    $$('.badge-t').forEach(function (el) {
      el.addEventListener('click', function () {
        var b = null; COLL.forEach(function (c) { c[1].forEach(function (x) { if (x[0] === el.dataset.id) b = x; }); }); var on = FS.state().badges.indexOf(b[0]) > -1;
        FS.modal({ title: b[2], icon: b[1], html: '<p class="muted">' + esc(b[3]) + '</p><p style="margin-top:10px"><b>How to earn:</b> ' + esc(b[4]) + '</p><p class="small muted" style="margin-top:8px">' + (b[5] ? 'Exists today in the Money Map.' : 'Proposed new badge.') + ' Badges never affect your Finscore.</p><p class="small" style="margin-top:8px"><b>Status:</b> ' + (on ? 'Unlocked ✓' : 'Locked') + '</p>', actions: on ? [{ label: 'Close' }] : [{ label: 'Close' }, { label: 'Preview unlock', cls: 'ai', fn: function () { FS.unlockBadge(b[0], b[2]); renderBadges(); } }] });
      });
    });
  }
  function initRewards() {
    $$('#bFilter button').forEach(function (b) { b.addEventListener('click', function () { filter = b.dataset.f; $$('#bFilter button').forEach(function (x) { x.setAttribute('aria-selected', x === b); }); renderBadges(); }); });
    $('#rewardsReset').addEventListener('click', function () { FS.store.set('badges', ['first_score', 'protected', 'steady_4']); FS.store.set('points', 1240); renderBadges(); FS.toast('Prototype state reset', '↺'); });
    renderBadges();
  }

  initScore(); initSavings(); initInd(); initRewards();
  FS.tabs($('#panels').parentNode, function (id) { if (id === 'rewards') renderBadges(); if (id === 'savings') renderGoal(); });
})();
