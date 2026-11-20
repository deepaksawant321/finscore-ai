/* finscore-app-flow.html: the real Finscore shell and flow (Home, Money Map, Score, Coach, Goals, What-if) with the proposed
   engagement layer in context. Hash-routed like the real app. No network, dummy data. */
(function () {
  'use strict';
  var FS = window.FS, $ = FS.$, $$ = FS.$$, esc = FS.esc, inr = FS.inr;
  var ICON = {
    home: 'M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z', chat: 'M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z', score: 'M4 18a8 8 0 1 1 16 0M12 18l4-6',
    sim: 'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M16 4a2 2 0 1 0 0 4 2 2 0 0 0 0-4M10 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4M18 16a2 2 0 1 0 0 4 2 2 0 0 0 0-4',
    goal: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10M12 11a1 1 0 1 0 0 2 1 1 0 0 0 0-2', mem: 'M4 7c0-2 16-2 16 0s-16 2-16 0v10c0 2 16 2 16 0V7M4 12c0 2 16 2 16 0',
    more: 'M5 10.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3M12 10.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3M19 10.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3',
    sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4', moon: 'M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z',
    spark: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z', rocket: 'M5 19c0-3 1-5 3-6M14 4c4 0 6 2 6 6-2 4-5 7-9 9l-3-3c2-4 5-7 6-12zM15 7.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3M5 15l4 4',
    heart: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10z', cog: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6M19 12l2 1-1 3-2.2-.4a7 7 0 0 1-1.6 1.6L16.6 20l-3 1-1-2a7 7 0 0 1-2.2 0l-1 2-3-1 .4-2.2a7 7 0 0 1-1.6-1.6L3 16l-1-3 2-1a7 7 0 0 1 0-2.2l-2-1 1-3 2.2.4a7 7 0 0 1 1.6-1.6L7.4 4l3-1 1 2a7 7 0 0 1 2.2 0l1-2 3 1-.4 2.2a7 7 0 0 1 1.6 1.6L21 8l1 3-2 1z',
    lock: 'M7 11h10a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2zM8 11V8a4 4 0 0 1 8 0v3', check: 'm5 12 4 4 10-10', x: 'M6 6l12 12M18 6 6 18'
  };
  var svg = function (n, s) { return '<svg viewBox="0 0 24 24" aria-hidden="true"' + (s ? ' width="' + s + '" height="' + s + '"' : '') + '><path d="' + ICON[n] + '"/></svg>'; };
  /* Same groups as frontend/src/lib/nav.ts (customer), plus one proposed group. */
  var GROUPS = [
    { l: 'Your money', i: [['#/home', 'Home', 'home'], ['#/journey', 'Money Map', 'goal'], ['#/score', 'Score', 'score'], ['#/coach', 'Coach', 'spark'], ['#/talk', 'Talk', 'chat'], ['#/health', 'Health', 'heart']] },
    { l: 'Plan', i: [['#/goals', 'Goals', 'goal'], ['#/whatif', 'What-if', 'sim']] },
    { l: 'Account', i: [['#/memory', 'Memory', 'mem'], ['#/settings', 'Settings', 'cog']] },
    { l: 'Grow', prop: 1, i: [['#/play', 'Play & Learn', 'rocket', 1], ['#/rewards', 'Rewards', 'spark', 1], ['#/wrapped', 'Wrapped', 'sun', 1]] }
  ];
  var TABS = ['#/home', '#/journey', '#/score', '#/coach'];

  /* ---------- state ---------- */
  var S = {
    score: 648, measured: 78, play: null, plan: {}, plannedExtra: [], goalAdds: { 0: 0, 1: 0, 2: 0 }, picked: {}, chat: [],
    ch: [
      { k: 'snapshot', t: 'Snapshot', b: 'A handful of quick taps and your FinScore appears.', n: 8, d: 8 },
      { k: 'family', t: 'Family & protection', b: 'Who depends on you, and how well they are covered.', n: 5, d: 5 },
      { k: 'future', t: 'Future you', b: 'Your goals and the retirement you are planning for.', n: 3, d: 0 },
      { k: 'safety', t: 'Safety net', b: 'How long you could manage if income stopped.', n: 3, d: 0 },
      { k: 'tax', t: 'Tax smart', b: 'How well you use the tax-saving options you have.', n: 3, d: 0 },
      { k: 'finetune', t: 'Fine-tune', b: 'Swap my estimates for your real numbers.', n: 4, d: 0 }
    ]
  };
  var Q = {
    future: [
      { q: 'At what age would you like to retire?', c: [['50', 2], ['55', 4], ['60', 6], ['65', 5]], x: 'Retirement age shapes how long your savings must last.' },
      { q: 'How would you describe your comfort with investment ups and downs?', c: [['Cautious', 3], ['Balanced', 5], ['Bold', 4]], x: 'I used to assume Balanced. Now it is your own answer.' },
      { q: 'Is there a goal in the next 3 years?', c: [['Home', 5], ['Education', 4], ['A trip', 3], ['Not yet', 2]], x: 'Short goals need steadier money than long ones.' }
    ],
    safety: [
      { q: 'If your income stopped, how long could you manage?', c: [['Under a month', 1], ['1 to 3 months', 3], ['3 to 6 months', 5], ['6+ months', 7]], x: 'Most people aim for 3 to 6 months of essentials.' },
      { q: 'Where is your emergency money kept?', c: [['Savings account', 4], ['Liquid fund', 5], ['Fixed deposit', 3], ['None set aside', 0]], x: 'Easy access matters more than return for this money.' },
      { q: 'Do you have health insurance?', c: [['Employer only', 3], ['My own policy', 5], ['Both', 7], ['None', 0]], x: 'A cover of your own does not end when a job does.' }
    ],
    tax: [
      { q: 'Do you use any tax-saving options today?', c: [['Yes, several', 6], ['One or two', 4], ['Not yet', 1]], x: 'Fit to your goals first, tax saving second.' },
      { q: 'Do you know which tax regime you are on?', c: [['Old regime', 4], ['New regime', 4], ['Not sure', 1]], x: 'The better regime depends on your deductions.' },
      { q: 'Is your tax-saving money in products that fit your goals?', c: [['Yes', 6], ['Partly', 3], ['Not sure', 1]], x: 'A mismatched lock-in can cost more than the tax saved.' }
    ]
  };
  var BADGES = { first_score: ['◎', 'First score'], protected: ['⛨', 'Protected'], tax_smart: ['₹', 'Tax smart'], fine_tuned: ['✎', 'Fine-tuned'], full_picture: ['★', 'Full picture'], steady_4: ['◷', 'Steady 4'], quiz_ace: ['🏆', 'Quiz Ace'], self_aware: ['🪞', 'Self-aware'], steady_hands: ['🤲', 'Steady Hands'], curious_mind: ['🧠', 'Curious Mind'], goal_getter: ['🎯', 'Goal Getter'], plan_pro: ['🧭', 'Plan Pro'] };
  var PLAN = [
    { id: 'p1', t: 'Top up your emergency fund by ₹6,000', time: '3 min', why: 'Your fund covers 2.9 months of essentials. 3 months is the common first milestone, so you are ₹6,000 short.', facts: 'Emergency fund ₹1,74,000 · Essentials ₹60,000/mo · confidence High' },
    { id: 'p2', t: 'Review your term insurance cover', time: '5 min', why: 'Protection is your lowest area. A review shows whether cover matches your dependants and loans.', facts: 'No policy on file · 2 dependants · confidence Medium' },
    { id: 'p3', t: 'Pay ₹2,000 extra on your personal loan', time: '2 min', why: 'At 14% this is your costliest debt. Extra payments cut interest over time.', facts: 'Loan ₹3,00,000 at 14% · debt ratio 28% (engine) · confidence High' }
  ];

  /* ---------- helpers ---------- */
  var gid = 0;
  function gauge(value, dark) {
    var id = 'g' + (++gid), CX = 130, CY = 124, R = 104, pt = function (d) { return [CX + R * Math.cos(d * Math.PI / 180), CY + R * Math.sin(d * Math.PI / 180)]; };
    var arc = function (a, b) { var p = pt(a), q = pt(b); return 'M' + p[0].toFixed(2) + ' ' + p[1].toFixed(2) + ' A' + R + ' ' + R + ' 0 ' + (b - a > 180 ? 1 : 0) + ' 1 ' + q[0].toFixed(2) + ' ' + q[1].toFixed(2); };
    var end = 135 + 270 * Math.min(1, value / 900), k = pt(end), s = '';
    for (var i = 0; i < 8; i++) s += '<path d="' + arc(135 + i * 33.75 + 1.5, 135 + (i + 1) * 33.75 - 1.5) + '" fill="none" stroke="' + (dark ? 'rgb(255 255 255/.14)' : 'var(--surface-2)') + '" stroke-width="14" stroke-linecap="round"/>';
    return '<svg viewBox="0 0 260 230" role="img" aria-label="FinScore ' + Math.round(value) + ' out of 900"><defs><linearGradient id="' + id + '" x1="0" x2="1"><stop offset="0" stop-color="#0fb5a6"/><stop offset="1" stop-color="#6366f1"/></linearGradient></defs>' + s + '<path d="' + arc(135, Math.max(136, end)) + '" fill="none" stroke="url(#' + id + ')" stroke-width="14" stroke-linecap="round"/><circle cx="' + k[0].toFixed(1) + '" cy="' + k[1].toFixed(1) + '" r="9" fill="' + (dark ? '#0f2547' : 'var(--surface)') + '" stroke="#818cf8" stroke-width="4"/></svg>';
  }
  var scoreDelta = function (p, n) { var d = n - p; return d === 0 ? n + ' (no change)' : p + ' → ' + n + ' (' + (d > 0 ? '+' : '') + d + ')'; };
  var unlocked = function (i) { return i === 0 || S.ch[i - 1].d >= S.ch[i - 1].n; };
  var chDone = function (c) { return c.d >= c.n; };
  var nextCh = function () { for (var i = 0; i < S.ch.length; i++) if (unlocked(i) && !chDone(S.ch[i])) return S.ch[i]; return null; };
  var tag = function (s) { return '<span class="fbadge" style="background:var(--ai-soft);color:var(--ai)">' + s + '</span>'; };

  /* ---------- shared cards ---------- */
  function scoreCard() {
    return '<section class="fcard homecard"><div class="gauge" style="width:260px">' + gauge(S.score) + '<div class="gc"><b>' + Math.round(S.score) + '</b><span>out of 900</span><span>' + S.measured + '% measured</span></div></div><div class="stack-3"><h2 class="cd">Your FinScore</h2><p class="sub">' + Math.round(S.score) + ' out of 900, across fifteen areas of your finances compared with people your age.' + (S.measured < 100 ? ' Answer more on your Money Map to make it firmer.' : '') + '</p><a class="fbtn secondary" href="#/score">See what drives it</a></div></section>';
  }
  function journeyCard() {
    var n = nextCh(); if (!n) return '';
    return '<section class="fcard stack-3"><div class="row2 between2"><h2 class="cd">Continue your Money Map</h2><span class="sub">✦ ' + FS.state().points.toLocaleString('en-IN') + ' clarity points</span></div><div class="pbar big" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + S.measured + '"><i style="width:' + S.measured + '%"></i></div><p class="sub">' + S.measured + '% of your score measured. Next: <strong style="color:var(--ink)">' + n.t + '</strong>, ' + n.b.toLowerCase() + '</p><a class="fbtn primary" href="#/journey" data-start="' + n.k + '">Continue</a></section>';
  }
  function planBlock(compact) {
    var all = PLAN.concat(S.plannedExtra), done = all.filter(function (p) { return S.plan[p.id]; }).length;
    return '<div class="stack-3"><div class="row2 between2"><b>Today\'s plan <span class="sub">· from your coach</span></b><span class="fbadge">' + done + ' / ' + all.length + '</span></div>' + all.map(function (p) {
      return '<div class="plan-item ' + (S.plan[p.id] ? 'done' : '') + '"><button class="tk" data-plan="' + p.id + '" aria-pressed="' + !!S.plan[p.id] + '" aria-label="Mark done: ' + esc(p.t) + '">✓</button><div class="grow2" style="flex:1"><b>' + esc(p.t) + '</b><span class="sub">⏱ ' + p.time + '</span>' + (compact ? '' : '<details class="d" style="margin-top:6px"><summary>Why this?</summary><p class="sub" style="margin:6px 0">' + esc(p.why || 'Added from your Money Map.') + '</p><p class="xs sub">Grounded on: ' + esc(p.facts || 'your answers') + '. Numbers come from the Finscore engine; this is educational, not advice.</p></details>') + '</div></div>';
    }).join('') + '</div>';
  }
  function cadence() {
    var days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'], todayDone = Object.keys(S.plan).some(function (k) { return S.plan[k]; });
    return '<div class="stack-3"><div class="row2 between2"><b>This week</b><span class="fbadge">◷ ' + FS.state().streak + ' active weeks</span></div><div class="wk">' + days.map(function (d, i) { return '<i class="' + (i < 3 || (i === 3 && todayDone) ? 'on ' : '') + (i === 3 ? 'today' : '') + '">' + d + '</i>'; }).join('') + '</div><p class="xs sub">Miss a day and your weeks pause. They never reset to zero. Points and badges never change your FinScore.</p></div>';
  }
  function proposedHome() {
    return '<div class="prop-zone"><div class="prop-title">✨ Engagement layer <span class="sub" style="font-weight:400">(proposed; these cards do not exist in the app today)</span></div><div class="g2b"><section class="fcard prop">' + planBlock(true) + '<a class="fbtn secondary sm" style="margin-top:12px" href="#/coach">Open full plan</a></section><section class="fcard prop stack-3"><b>One minute today</b><div class="tile3"><a class="tile" href="financial-games.html#spin"><span class="e">🎡</span><b>Spin</b><span class="s">Daily topic</span></a><a class="tile" href="financial-games.html#cards"><span class="e">🃏</span><b>Cards</b><span class="s">5 lessons</span></a><a class="tile" href="financial-games.html#quiz"><span class="e">🏟️</span><b>Quiz</b><span class="s">5 questions</span></a></div>' + cadence() + '</section></div></div>';
  }

  /* ---------- views ---------- */
  var V = {};
  V.home = function () {
    return '<div class="stack-6"><h1 class="pg">Welcome, Aarav</h1>' + scoreCard() + journeyCard() + '</div>' + proposedHome();
  };
  V.journey = function () {
    if (S.play) return playView();
    var rw = FS.state(), badges = rw.badges.map(function (b) { var x = BADGES[b] || ['•', b]; return '<span class="fbadge demo">' + x[0] + ' ' + esc(x[1]) + '</span>'; }).join(' ');
    var list = S.ch.map(function (c, i) {
      var st = chDone(c) ? 'done' : !unlocked(i) ? 'locked' : (nextCh() === c ? 'current' : 'open'), act = st === 'done' ? 'Review' : st === 'locked' ? 'Locked' : c.d > 0 ? 'Continue' : 'Start';
      return '<li><div class="node ' + st + '">' + (st === 'done' ? svg('check', 20) : st === 'locked' ? svg('lock', 18) : c.d) + '</div><div class="fcard ' + (st === 'locked' ? 'locked-card' : '') + '"><div><b>' + c.t + '</b><p class="sub">' + c.b + '</p><p class="xs sub tnum">' + c.d + ' of ' + c.n + ' answered</p></div><button class="fbtn ' + (st === 'current' ? 'primary' : 'secondary') + '" data-ch="' + c.k + '" ' + (st === 'locked' ? 'disabled' : '') + '>' + act + '</button></div></li>';
    }).join('');
    return '<div class="stack-6"><div><h1 class="pg">Your Money Map</h1><p class="sub">Quick taps, one chapter at a time. Each answer makes your score firmer.</p></div><div class="stack-3"><div><div class="row2 between2 xs" style="font-weight:600;font-size:12px"><span>Score measured</span><span class="tnum">' + S.measured + '%</span></div><div class="pbar big" style="margin-top:4px"><i style="width:' + S.measured + '%"></i></div></div><div class="row2" style="font-size:14px"><span class="fbadge">✦ ' + rw.points.toLocaleString('en-IN') + ' clarity points</span><span class="fbadge">◷ ' + rw.streak + ' active weeks · this week ✓</span>' + badges + '</div></div><ol class="chapters">' + list + '</ol></div>';
  };
  function playView() {
    var p = S.play, c = S.ch.filter(function (x) { return x.k === p.k; })[0], qs = Q[p.k];
    if (p.done) {
      var nx = nextCh();
      return '<div class="qcard stack-6" style="position:relative"><section class="fcard stack-3" style="text-align:center;position:relative;overflow:hidden" id="doneCard"><p class="sub" style="font-weight:700;color:var(--brand);text-transform:uppercase;letter-spacing:.06em">Chapter complete</p><h1 class="pg">' + c.t + ' ✓</h1><p class="sub">Score ' + scoreDelta(p.start, Math.round(S.score)) + ' · ' + S.measured + '% measured</p><div class="row2" style="justify-content:center">' + (nx ? '<button class="fbtn primary" data-ch="' + nx.k + '">Next: ' + nx.t + '</button>' : '') + '<button class="fbtn secondary" id="backMap">Back to the map</button></div></section><section class="fcard prop stack-3"><b>Keep the momentum</b><p class="sub">Because you just worked on <b style="color:var(--ink)">' + c.t.toLowerCase() + '</b>:</p><div class="row2"><a class="fbtn secondary sm" href="financial-games.html#cards">1-minute lesson</a><button class="fbtn secondary sm" id="addPlan">Add a step to Today\'s plan</button></div></section></div>';
    }
    var q = qs[c.d], fb = p.fb;
    return '<div class="qcard stack-6"><button class="fbtn secondary sm" id="backMap">← Money Map</button><section class="fcard stack-3"><div class="row2 between2"><span class="sub">' + c.t + ' · question ' + (c.d + 1) + ' of ' + c.n + '</span><span class="fbadge">✦ ' + FS.state().points.toLocaleString('en-IN') + '</span></div><div class="pbar"><i style="width:' + (c.d / c.n * 100) + '%"></i></div><h2>' + q.q + '</h2><div class="chips" id="chips">' + q.c.map(function (x, i) { return '<button class="chip2" data-i="' + i + '">' + x[0] + '</button>'; }).join('') + '</div><div id="fb"></div></section></div>';
  }
  V.score = function () {
    var rows = [['Cashflow', 36, 90, 4, 'Cashflow 25.0% of income falls in "Less than 30%" for your age band.'], ['Savings', 48.6, 81, 6, 'Savings rate falls in the 20 to 30% band for your age band.']];
    var acts = [['Build your emergency fund to 3 months', 14], ['Review your term cover', 9], ['Pay card dues in full for 3 months', 11], ['Run a tax-saving fit check', 6]];
    var proj = S.score + acts.reduce(function (s, a, i) { return s + (S.picked[i] ? a[1] : 0); }, 0);
    return '<div class="stack-6"><div><h1 class="pg">Your FinScore</h1><p class="sub">Fifteen areas of your finances, each compared with people of your age, added up to a score out of 900.</p></div>' + journeyCard() +
      '<section class="card-dark"><div class="homecard"><div class="gauge">' + gauge(S.score, true) + '<div class="gc"><b>' + Math.round(S.score) + '</b><span>out of 900</span><span>' + S.measured + '% measured</span></div></div><div class="stack-3"><span class="fbadge demo">Early estimate</span><h2 class="cd" style="color:#fff">What this number means</h2><p class="sub">Built only from what you told me. Anything I do not know is left out rather than guessed.</p><p class="xs sub">WORKBOOK DRAFT RULES · NOT AN OFFICIAL FINSCORE</p></div></div></section>' +
      '<section class="fcard stack-3"><h2 class="cd">Your areas <span class="sub" style="font-weight:400">(4 of 15 shown in this prototype)</span></h2>' + rows.map(function (r) { return '<div class="factor"><div class="row2 between2"><b style="font-size:14px">' + r[0] + '</b><span class="sub tnum">' + r[1].toFixed(2) + ' of ' + r[2] + '.00 points · ' + r[3] + '/10</span></div><div class="pbar s" style="margin:6px 0"><i style="width:' + (r[1] / r[2] * 100) + '%;background:var(--brand)"></i></div><details class="d"><summary>How this was worked out</summary><p class="sub" style="margin-top:4px">' + r[4] + '</p></details></div>'; }).join('') +
      '<div class="factor-miss"><b>Assets</b> <span class="sub">not scored yet: I still need equity holdings and other assets.</span></div><div class="factor-miss"><b>Kids goal planning</b> <span class="sub">does not apply to you, so it is left out.</span></div></section>' +
      '<section class="fcard prop stack-3"><div class="row2 between2"><h2 class="cd">What could move your score?</h2><span class="sub">Preview only</span></div><p class="sub">Pick actions to see a possible effect. Estimates, never a promise. Official changes come from the rulebook.</p>' + acts.map(function (a, i) { return '<label class="act2 ' + (S.picked[i] ? 'on' : '') + '"><input type="checkbox" data-pick="' + i + '" ' + (S.picked[i] ? 'checked' : '') + '><span>' + a[0] + '</span><span class="gain">+' + a[1] + '</span></label>'; }).join('') + '<div class="row2 between2"><span class="sub">Projected</span><b class="display" style="font-size:24px;font-family:var(--font-display)">' + Math.round(proj) + '</b></div></section></div>';
  };
  V.coach = function () {
    return '<div class="stack-6"><div><h1 class="pg">Coach</h1><p class="sub">Ask about your goals, safety net and score. I explain; every number comes from the Finscore engine.</p></div><div class="g2b"><section class="fcard"><h2 class="cd" style="margin-bottom:10px">Ask your coach</h2><div class="msgs" id="msgs">' + (S.chat.length ? S.chat.map(function (m) { return '<div class="msg ' + m[0] + '">' + esc(m[1]) + '</div>'; }).join('') : '<div class="msg bot">Hi Aarav. Ask me about your emergency fund, loan, score or goals. I cannot recommend specific investments.</div>') + '</div><div class="row2" style="margin-top:8px">' + ['How is my emergency fund?', 'Which stock should I buy?'].map(function (s) { return '<button class="chip2" data-ask="' + s + '" style="min-height:34px;font-size:12px">' + s + '</button>'; }).join('') + '</div><form class="askf" id="askf"><label class="sr-only" for="ask">Question</label><input id="ask" maxlength="120" placeholder="Ask your coach anything…" autocomplete="off"><button class="fbtn ai" type="submit">Send</button></form></section><section class="fcard prop">' + planBlock(false) + '</section></div></div>';
  };
  V.goals = function () {
    var G = [['Emergency fund', 174000, 300000, 12000], ['Trip to Japan', 62000, 200000, 8000], ['Home down payment', 410000, 1500000, 20000]];
    return '<div class="stack-6"><div><h1 class="pg">Goals</h1><p class="sub">What you are saving for, and how long it takes under the assumptions you chose.</p></div>' + G.map(function (g, i) {
      var s = g[1] + S.goalAdds[i], p = Math.min(100, Math.round(s / g[2] * 100)), months = Math.max(0, Math.ceil((g[2] - s) / g[3]));
      return '<section class="fcard stack-3"><div class="row2 between2"><h2 class="cd">' + g[0] + '</h2><span class="fbadge">' + p + '%</span></div><div class="pbar big"><i style="width:' + p + '%"></i></div><p class="sub tnum">' + inr(s) + ' of ' + inr(g[2]) + ' · at ' + inr(g[3]) + ' a month you would reach it in about <b style="color:var(--ink)">' + months + ' months</b> (illustrative).</p><div class="prop stack-3" style="margin-top:20px;padding:12px"><div class="flags">' + [25, 50, 75, 100].map(function (m) { return '<span class="' + (p >= m ? 'hit' : '') + '">' + (p >= m ? '🚩' : '⚑') + ' ' + m + '%</span>'; }).join('') + '</div><div class="row2"><button class="fbtn secondary sm" data-add="' + i + '">+ ₹5,000 (simulated)</button><span class="xs sub">No money moves. This only shows how milestones would feel.</span></div></div></section>';
    }).join('') + '</div>';
  };
  V.whatif = function () {
    var sip = S.sip || 25000, yrs = S.yrs || 20, f = function (g) { var rm = Math.pow(1 + g, 1 / 12) - 1; return sip * (Math.pow(1 + rm, 12 * yrs) - 1) / rm; }, l = function (v) { return v >= 1e7 ? '₹' + (v / 1e7).toFixed(2) + ' Cr' : '₹' + (v / 1e5).toFixed(1) + ' L'; };
    return '<div class="stack-6"><div><h1 class="pg">What-if</h1><p class="sub">Try a change and see a range, not a single number.</p></div><section class="fcard stack-3"><div class="g2b"><div><label for="sip" class="sub"><b style="color:var(--ink)">Monthly SIP:</b> ' + inr(sip) + '</label><input id="sip" type="range" min="5000" max="80000" step="1000" value="' + sip + '" style="width:100%"></div><div><label for="yrs" class="sub"><b style="color:var(--ink)">Years:</b> ' + yrs + '</label><input id="yrs" type="range" min="5" max="30" value="' + yrs + '" style="width:100%"></div></div><div class="g3">' + [['Low', .08], ['Base', .10], ['High', .12]].map(function (x) { return '<div class="fcard flat tight"><span class="sub">' + x[0] + ' · ' + x[1] * 100 + '% a year</span><br><b style="font:700 22px var(--font-display)">' + l(f(x[1])) + '</b></div>'; }).join('') + '</div><p class="xs sub">Illustrative assumptions, not predictions. Real returns vary and are never guaranteed.</p></section><section class="fcard prop row2 between2"><div><b>Want to feel a market fall without risking anything?</b><p class="sub">Five hypothetical years with practice money.</p></div><a class="fbtn ai" href="financial-games.html#sim">Try the Investing Sim</a></section></div>';
  };
  V.play = function () {
    var T = [['🎡', 'Spin & Learn', 'One spin a day, one tip, one question', 'spin'], ['🏟️', 'Quiz Arena', '3 levels, optional timer, explanations', 'quiz'], ['🧭', 'Personality test', 'Your money personality, 8 scenarios', 'persona'], ['📈', 'Investing Sim', 'Hypothetical years, practice money', 'sim'], ['🃏', 'Knowledge Cards', 'One-minute swipe lessons', 'cards']];
    return '<div class="stack-6"><div><h1 class="pg">Play & Learn</h1><p class="sub">Optional one-minute activities. Points are virtual and never change your FinScore.</p></div><section class="fcard prop stack-3">' + cadence() + '</section><div class="g3">' + T.map(function (t) { return '<a class="fcard prop tile" style="padding:20px" href="financial-games.html#' + t[3] + '"><span class="e">' + t[0] + '</span><b>' + t[1] + '</b><span class="s">' + t[2] + '</span></a>'; }).join('') + '</div></div>';
  };
  V.rewards = function () {
    var own = FS.state().badges, lv = FS.level(FS.state().points);
    return '<div class="stack-6"><div><h1 class="pg">Rewards</h1><p class="sub">Badges and levels mark your progress. They never touch your FinScore.</p></div><section class="card-dark"><p class="sub">Your level</p><h2 class="cd" style="color:#fff;font-size:26px">Lv ' + lv.n + ' · ' + lv.name + '</h2><div class="pbar big" style="background:rgb(255 255 255/.2);margin:12px 0 8px"><i style="width:' + Math.round(lv.into / lv.need * 100) + '%;background:#fff"></i></div><p class="sub">' + (lv.need - lv.into) + ' points to ' + lv.next + '</p></section><section class="fcard prop"><div class="bgrid2">' + Object.keys(BADGES).map(function (k) { var on = own.indexOf(k) > -1; return '<button class="bt ' + (on ? '' : 'lock') + '" data-badge="' + k + '"><div class="ic">' + BADGES[k][0] + '</div><b>' + BADGES[k][1] + '</b><small>' + (on ? 'Unlocked' : 'Locked') + '</small></button>'; }).join('') + '</div></section></div>';
  };
  V.wrapped = function () {
    return '<div class="stack-6"><div><h1 class="pg">Wrapped</h1><p class="sub">Your month in a short story, built from what you did.</p></div><section class="card-dark prop" style="background:linear-gradient(160deg,#4f46e5,#7c3aed 60%,#e8447a)"><p class="sub" style="color:#fff">November</p><h2 class="cd" style="color:#fff;font-size:30px">+12 score points · 6 active weeks · 2 new badges</h2><p style="margin:10px 0 16px;color:#fff">Your story is ready.</p><a class="fbtn" style="background:#fff;color:#1c1740" href="monthly-wrapped.html">Watch your Wrapped</a></section></div>';
  };
  var STUB = { health: 'Health', talk: 'Talk', memory: 'Memory', settings: 'Settings' };
  Object.keys(STUB).forEach(function (k) { V[k] = function () { return '<div class="stack-6"><h1 class="pg">' + STUB[k] + '</h1><section class="fcard stubnote"><b>This screen exists in the real app.</b><p>It is not rebuilt in this prototype, so the navigation stays honest. <a href="#/home">Back to Home</a></p></section></div>'; }; });

  /* ---------- bindings ---------- */
  function addPlanPts(id) { var was = S.plan[id]; S.plan[id] = !was; if (!was) { FS.addPoints(15, 'plan step'); } var all = PLAN.concat(S.plannedExtra); if (all.every(function (p) { return S.plan[p.id]; })) { FS.confetti(); FS.unlockBadge('plan_pro', 'Plan Pro'); } render(); }
  function bind(route) {
    $$('[data-plan]').forEach(function (b) { b.addEventListener('click', function () { addPlanPts(b.dataset.plan); }); });
    $$('[data-ch]').forEach(function (b) { b.addEventListener('click', function () { var k = b.dataset.ch; if (!Q[k]) { FS.modal({ title: 'Not in this prototype', icon: '🧩', html: '<p class="muted">This chapter exists in the real Money Map but is not rebuilt here. Try Future you, Safety net or Tax smart.</p>' }); return; } var c = S.ch.filter(function (x) { return x.k === k; })[0]; if (chDone(c)) { FS.toast('Already complete: ' + c.t, '✓'); return; } S.play = { k: k, start: Math.round(S.score) }; location.hash = '#/journey'; render(); window.scrollTo(0, 0); }); });
    $$('[data-start]').forEach(function (a) { a.addEventListener('click', function () { var k = a.dataset.start; if (Q[k]) S.play = { k: k, start: Math.round(S.score) }; }); });
    var bm = $('#backMap'); if (bm) bm.addEventListener('click', function () { S.play = null; render(); });
    var ap = $('#addPlan'); if (ap) ap.addEventListener('click', function () { var id = 'x' + S.plannedExtra.length; S.plannedExtra.push({ id: id, t: 'Review your ' + S.ch.filter(function (c) { return c.k === S.play.k; })[0].t.toLowerCase() + ' answers', time: '2 min' }); ap.disabled = true; FS.toast('Added to Today\'s plan (see Home)', '✨'); });
    if (S.play && !S.play.done) {
      $$('#chips .chip2').forEach(function (b) { b.addEventListener('click', function () {
        var c = S.ch.filter(function (x) { return x.k === S.play.k; })[0], q = Q[S.play.k][c.d], opt = q.c[+b.dataset.i], before = Math.round(S.score);
        $$('#chips .chip2').forEach(function (x) { x.disabled = true; }); b.classList.add('sel');
        S.score += opt[1]; S.measured = Math.min(100, S.measured + 3); c.d++; FS.addPoints(10, 'answer saved');
        var last = c.d >= c.n;
        $('#fb').innerHTML = '<div class="feedback"><b>Saved.</b> Score ' + scoreDelta(before, Math.round(S.score)) + '. ' + esc(q.x) + '</div><div class="row2" style="justify-content:flex-end;margin-top:12px"><button class="fbtn primary" id="nextQ">' + (last ? 'Finish chapter' : 'Next question') + '</button></div>';
        $('#nextQ').focus(); $('#nextQ').addEventListener('click', function () { if (last) { S.play.done = true; render(); FS.confetti(); } else render(); });
      }); });
    }
    $$('[data-pick]').forEach(function (c) { c.addEventListener('change', function () { S.picked[c.dataset.pick] = c.checked; render(); }); });
    var f = $('#askf'); if (f) { var say = function (who, t) { S.chat.push([who, t]); }, ans = function (q) { q = q.trim(); if (!q) return; say('me', q); render(); var m = $('#msgs'); var th = document.createElement('div'); th.className = 'msg bot'; th.innerHTML = '<span class="spinner"></span>'; m.appendChild(th); setTimeout(function () { var r = /(which|what).*(stock|share|crypto|fund|coin).*(buy|best|pick)|should i (buy|sell)|guaranteed|hot tip/i.test(q) ? 'I cannot recommend specific investments or promise returns; that is regulated advice. I can explain the idea, or connect you to a human adviser. (Prototype: no real hand-off.)' : /emergency|buffer/i.test(q) ? 'Your emergency fund covers about 2.9 months of essentials. The common first target is 3 months, which is ₹6,000 away. (Calculated by the engine, explained by me.)' : /loan|emi|debt/i.test(q) ? 'Your personal loan is ₹3,00,000 at 14%. Extra payments reduce interest. Try the extra-payment idea in today\'s plan.' : /score|finscore/i.test(q) ? 'Your demo FinScore is ' + Math.round(S.score) + ' out of 900, ' + S.measured + '% measured. Answering more of your Money Map makes it firmer.' : 'I am not sure yet. Try asking about your emergency fund, loan or score.'; say('bot', r); render(); }, FS.reduce ? 80 : 800); };
      f.addEventListener('submit', function (e) { e.preventDefault(); var i = $('#ask'), v = i.value; i.value = ''; ans(v); }); $$('[data-ask]').forEach(function (b) { b.addEventListener('click', function () { ans(b.dataset.ask); }); }); var m = $('#msgs'); if (m) m.scrollTop = 1e6; }
    $$('[data-add]').forEach(function (b) { b.addEventListener('click', function () { var i = +b.dataset.add, tg = [300000, 200000, 1500000][i], base = [174000, 62000, 410000][i], pb = Math.min(100, (base + S.goalAdds[i]) / tg * 100); S.goalAdds[i] += 5000; var pa = Math.min(100, (base + S.goalAdds[i]) / tg * 100); render(); [25, 50, 75, 100].forEach(function (m) { if (pb < m && pa >= m) { FS.addPoints(m === 100 ? 100 : 20, m + '% flag'); if (m === 100) { FS.confetti(); FS.unlockBadge('goal_getter', 'Goal Getter'); } } }); }); });
    var sip = $('#sip'), yrs = $('#yrs'); if (sip) { sip.addEventListener('input', function () { S.sip = +sip.value; S.yrs = +yrs.value; render(); var s2 = $('#sip'); s2.focus(); }); yrs.addEventListener('input', function () { S.sip = +sip.value; S.yrs = +yrs.value; render(); $('#yrs').focus(); }); }
    $$('[data-badge]').forEach(function (b) { b.addEventListener('click', function () { var k = b.dataset.badge, on = FS.state().badges.indexOf(k) > -1; FS.modal({ title: BADGES[k][1], icon: BADGES[k][0], html: '<p class="muted">' + (on ? 'Unlocked.' : 'Not earned yet.') + ' Badges never change your FinScore.</p>', actions: on ? [{ label: 'Close' }] : [{ label: 'Close' }, { label: 'Preview unlock', cls: 'ai', fn: function () { FS.unlockBadge(k, BADGES[k][1]); render(); } }] }); }); });
  }

  /* ---------- shell ---------- */
  function route() { var h = (location.hash || '#/home').replace('#/', ''); return V[h] ? h : 'home'; }
  function render() {
    var r = route(), main = $('#main'), scrollY = window.scrollY; main.innerHTML = '<div class="view">' + V[r]() + '</div>';
    $$('#railNav a, #tabsM a').forEach(function (a) { var cur = a.getAttribute('href') === '#/' + r; if (cur) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    var more = $('#moreBtn'); if (more) { var inTabs = TABS.indexOf('#/' + r) > -1; more.firstChild.style.background = inTabs ? '' : 'var(--brand-soft)'; more.style.color = inTabs ? '' : 'var(--brand-strong)'; }
    bind(r); FS.renderChips(); document.title = 'Finscore In-App Flow - ' + (r[0].toUpperCase() + r.slice(1)); if (!S._first) { S._first = 1; } else window.scrollTo(0, scrollY);
  }
  function buildNav() {
    $('#railNav').innerHTML = GROUPS.map(function (g) { return '<div class="' + (g.prop ? 'prop-nav' : '') + '"><h6>' + g.l + (g.prop ? ' (proposed)' : '') + '</h6>' + g.i.map(function (i) { return '<a href="' + i[0] + '">' + svg(i[2]) + i[1] + (i[3] ? '<span class="new">NEW</span>' : '') + '</a>'; }).join('') + '</div>'; }).join('');
    var all = []; GROUPS.forEach(function (g) { g.i.forEach(function (i) { all.push(i); }); });
    $('#tabsM').innerHTML = TABS.map(function (h) { var i = all.filter(function (x) { return x[0] === h; })[0]; return '<a href="' + h + '"><span>' + svg(i[2]) + '</span>' + i[1] + '</a>'; }).join('') + '<button id="moreBtn" aria-haspopup="dialog"><span>' + svg('more') + '</span>More</button>';
    $('#moreBtn').addEventListener('click', function () {
      var sh = document.createElement('div'); sh.className = 'sheet'; sh.innerHTML = '<div class="in" role="dialog" aria-modal="true" aria-label="More"><div class="row2 between2"><b>More</b><button class="round" aria-label="Close" id="shX">' + svg('x', 18) + '</button></div>' + GROUPS.map(function (g) { var rest = g.i.filter(function (i) { return TABS.indexOf(i[0]) < 0; }); return rest.length ? '<h6>' + g.l + (g.prop ? ' (proposed)' : '') + '</h6>' + rest.map(function (i) { return '<a href="' + i[0] + '">' + svg(i[2]) + i[1] + '</a>'; }).join('') : ''; }).join('') + '</div>';
      document.body.appendChild(sh); var close = function () { sh.remove(); }; sh.addEventListener('click', function (e) { if (e.target === sh || e.target.closest('a') || e.target.closest('#shX')) close(); });
      document.addEventListener('keydown', function esc(e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); } });
    });
  }
  function theme(dark) { document.body.dataset.theme = dark ? 'dark' : 'light'; var b = $('#themeBtn'); b.innerHTML = svg(dark ? 'sun' : 'moon', 18); b.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode'); FS.store.set('appTheme', dark ? 'dark' : 'light'); }
  buildNav(); theme(FS.store.get('appTheme', 'light') === 'dark');
  $('#themeBtn').addEventListener('click', function () { theme(document.body.dataset.theme !== 'dark'); render(); });
  $('#propSw').addEventListener('change', function (e) { $('#app').classList.toggle('hide-prop', !e.target.checked); FS.toast(e.target.checked ? 'Showing proposed features' : 'Showing the app as it is today', '👁'); });
  var acct = $('#acct'), menu = $('#menu'); acct.addEventListener('click', function () { var o = menu.hidden; menu.hidden = !o; acct.setAttribute('aria-expanded', o); });
  document.addEventListener('click', function (e) { if (!menu.hidden && !e.target.closest('#menu') && e.target !== acct) { menu.hidden = true; acct.setAttribute('aria-expanded', 'false'); } });
  $('#menu [data-go]').addEventListener('click', function (e) { location.hash = e.target.dataset.go; menu.hidden = true; });
  $('#fakeOut').addEventListener('click', function () { menu.hidden = true; FS.toast('Prototype: no real sign-in, so nothing to log out of', 'ℹ️'); });
  window.addEventListener('hashchange', function () { if (route() !== 'journey') S.play = null; render(); window.scrollTo(0, 0); });
  render();
})();
