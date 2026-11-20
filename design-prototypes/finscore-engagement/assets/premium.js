/* premium-fintech.html behaviour. Dummy data. */
(function () {
  'use strict';
  var FS = window.FS, $ = FS.$, $$ = FS.$$, esc = FS.esc;
  var BN = { first_score: ['◎', 'First Score'], protected: ['⛨', 'Protected'], steady_4: ['◷', 'Steady 4'], fine_tuned: ['✎', 'Fine-tuned'], tax_smart: ['₹', 'Tax-smart'], full_picture: ['★', 'Full Picture'], quiz_ace: ['🏆', 'Quiz Ace'], self_aware: ['🪞', 'Self-aware'], steady_hands: ['🤲', 'Steady Hands'], curious_mind: ['🧠', 'Curious Mind'], goal_getter: ['🎯', 'Goal Getter'] };
  var CH = [
    { id: 'buffer', ico: '🛡️', t: 'Check your safety buffer', d: '2 min · Goals', body: 'Your emergency fund covers about <b>2.9 months</b> of essentials (₹60,000 a month). You are only <b>₹6,000</b> away from the common 3-month target.', pts: 10 },
    { id: 'dues', ico: '💳', t: 'Confirm card dues are scheduled', d: '1 min · Health check', body: 'Paying dues on time is the biggest lever on a credit score. Confirm that your due date reminder is on.', pts: 10 },
    { id: 'learn', ico: '📘', t: 'Read one 1-minute lesson', d: '1 min · Knowledge Cards', body: '<b>Rule of 72:</b> divide 72 by the yearly return to estimate years to double. At 8% it is about 9 years. An estimate only.', pts: 10 }
  ];
  var st = { done: {}, checkup: false };
  var DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  function renderWeek() { var todayDone = Object.keys(st.done).length > 0; $('#weekDots').innerHTML = DAYS.map(function (d, i) { var on = i < 3 || (i === 3 && todayDone); return '<i class="sq ' + (on ? 'on' : '') + '" title="' + d + (on ? ' done' : '') + '"></i>'; }).join(''); }
  function renderCh() {
    $('#challenges').innerHTML = CH.map(function (c) { var d = st.done[c.id]; return '<div class="ch ' + (d ? 'done' : '') + '"><span class="ico" aria-hidden="true">' + (d ? '✓' : c.ico) + '</span><div><b>' + c.t + '</b><span class="small muted">' + c.d + ' · +' + c.pts + ' pts</span></div><div class="go"><button class="btn sm ' + (d ? 'ghost' : '') + '" data-id="' + c.id + '">' + (d ? 'Review' : 'Start') + '</button></div></div>'; }).join('');
    $$('#challenges button').forEach(function (b) {
      b.addEventListener('click', function () {
        var c = CH.filter(function (x) { return x.id === b.dataset.id; })[0], done = st.done[c.id];
        FS.modal({ title: c.t, icon: c.ico, html: '<p class="muted">' + c.body + '</p>', actions: done ? [{ label: 'Close' }] : [{ label: 'Not now' }, { label: 'Mark as done', cls: '', fn: function () { st.done[c.id] = true; FS.addPoints(c.pts, 'challenge done'); renderCh(); renderWeek(); weekly(); if (Object.keys(st.done).length === 3) { FS.confetti(); FS.toast('All of today\'s challenges complete', '🎉'); } } }] });
      });
    });
  }
  function weekly() { var n = 1 + (Object.keys(st.done).length === 3 ? 1 : 0) + (st.checkup ? 1 : 0); $('#wkDone').textContent = n; $('#wkBar').style.width = Math.round(n / 3 * 100) + '%'; }

  var H = [612, 618, 621, 630, 628, 634, 639, 641, 644, 646, 648], M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'];
  function trend(n) {
    var data = H.slice(-n), mon = M.slice(-n), W = 560, Ht = 220, l = 38, r = 12, t = 14, b = 28, mn = 590, mx = 690, x = function (i) { return l + i * (W - l - r) / (data.length - 1); }, y = function (v) { return t + (mx - v) / (mx - mn) * (Ht - t - b); };
    var line = data.map(function (v, i) { return x(i).toFixed(1) + ',' + y(v).toFixed(1); }).join(' '), area = 'M' + x(0) + ',' + (Ht - b) + ' L' + line.replace(/ /g, ' L') + ' L' + x(data.length - 1) + ',' + (Ht - b) + 'Z';
    var s = '<defs><linearGradient id="ar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--brand)" stop-opacity=".35"/><stop offset="1" stop-color="var(--brand)" stop-opacity="0"/></linearGradient></defs>';
    [600, 675].forEach(function (g, i) { s += '<line x1="' + l + '" x2="' + (W - r) + '" y1="' + y(g) + '" y2="' + y(g) + '" stroke="var(--line)" stroke-dasharray="4 4"/><text x="' + (l - 4) + '" y="' + (y(g) + 4) + '" text-anchor="end" font-size="11" fill="var(--muted)">' + g + '</text><text x="' + (W - r) + '" y="' + (y(g) - 5) + '" text-anchor="end" font-size="10" fill="var(--ai)">' + (i ? 'Independence ▲' : 'Accumulation ▲') + '</text>'; });
    s += '<path d="' + area + '" fill="url(#ar)"/><polyline points="' + line + '" fill="none" stroke="var(--brand)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" pathLength="1" style="stroke-dasharray:1;stroke-dashoffset:1;animation:draw 1.2s var(--ease) forwards"/>';
    data.forEach(function (v, i) { s += '<g tabindex="0" class="pt" data-i="' + i + '"><circle cx="' + x(i) + '" cy="' + y(v) + '" r="' + (i === data.length - 1 ? 6 : 4) + '" fill="' + (i === data.length - 1 ? 'var(--ai)' : 'var(--surface)') + '" stroke="var(--brand)" stroke-width="2.5"/><title>' + mon[i] + ': ' + v + '</title></g><text x="' + x(i) + '" y="' + (Ht - 8) + '" text-anchor="middle" font-size="10" fill="var(--muted)">' + mon[i] + '</text>'; });
    $('#trend').innerHTML = s; $('#trendNote').textContent = 'Up ' + (data[data.length - 1] - data[0]) + ' points over ' + n + ' months. Stage lines are illustrative. Tap a point for the month.';
    $$('#trend .pt').forEach(function (g) { g.addEventListener('click', function () { var i = +g.dataset.i; FS.toast(mon[i] + ': ' + data[i] + (i ? ' (' + (data[i] - data[i - 1] >= 0 ? '+' : '') + (data[i] - data[i - 1]) + ' vs ' + mon[i - 1] + ')' : ''), '📍'); }); });
  }
  var sty = document.createElement('style'); sty.textContent = '@keyframes draw{to{stroke-dashoffset:0}}.pt{cursor:pointer}'; document.head.appendChild(sty);
  $$('#rangeTabs button').forEach(function (b) { b.addEventListener('click', function () { $$('#rangeTabs button').forEach(function (x) { x.setAttribute('aria-selected', x === b); }); trend(+b.dataset.r); }); });

  var GOALS = [['Emergency fund', 58, '₹1,74,000 of ₹3,00,000'], ['Trip to Japan', 31, '₹62,000 of ₹2,00,000'], ['Home down payment', 27, '₹4,10,000 of ₹15,00,000']];
  $('#goals').innerHTML = GOALS.map(function (g) { return '<div><div class="row between small"><b>' + g[0] + '</b><span>' + g[1] + '%</span></div><div class="bar" style="margin:6px 0 2px"><i data-w="' + g[1] + '"></i></div><span class="xs muted">' + g[2] + '</span></div>'; }).join('');
  var LAD = [['Safety net', 'Emergency fund of 3 months', 'now'], ['Debt-free', 'Clear the personal loan', ''], ['First ₹10 lakh', 'Invested towards goals', ''], ['Retirement-ready', 'On track at 58', '']];
  $('#ladder').innerHTML = '<li class="done"><i>✓</i><b>Started saving</b><span class="xs muted">First Finscore completed</span></li>' + LAD.map(function (l, i) { return '<li class="' + l[2] + '"><i>' + (i + 2) + '</i><b>' + l[0] + '</b><span class="xs muted">' + l[1] + '</span></li>'; }).join('');
  var P = [['Safety', 62], ['Debt', 78], ['Protection', 45], ['Growth', 70]];
  function pillars() { $('#pillars').innerHTML = P.map(function (p) { return '<div class="pill-row"><span>' + p[0] + '</span><div class="bar"><i data-w="' + p[1] + '"></i></div><b>' + p[1] + '</b></div>'; }).join(''); FS.animateIn($('#pillars')); }
  $('#recent').innerHTML = FS.state().badges.slice(-3).map(function (id) { var b = BN[id] || ['🏅', id]; return '<span class="mini-badge"><i>' + b[0] + '</i>' + esc(b[1]) + '</span>'; }).join('');
  $('#checkup').addEventListener('click', function () {
    var btn = $('#checkup'); btn.innerHTML = '<span class="spinner"></span> Reviewing…'; btn.disabled = true; $('#pillars').innerHTML = '<div class="skeleton" style="height:18px"></div><div class="skeleton" style="height:18px"></div><div class="skeleton" style="height:18px"></div><div class="skeleton" style="height:18px"></div>';
    setTimeout(function () {
      btn.textContent = 'Run check-up'; btn.disabled = false; st.checkup = true; weekly(); pillars(); FS.addPoints(15, 'check-up done');
      FS.modal({ title: 'Check-up complete', icon: '🩺', html: '<p class="muted">Your weakest pillar is <b>Protection (45)</b>. Reviewing term cover is the single most useful next step. Estimated effect is illustrative.</p><p class="small muted" style="margin-top:8px">Dummy data. Educational, not advice.</p>', actions: [{ label: 'Later' }, { label: 'Open Coach', cls: 'ai', fn: function () { window.location.href = 'ai-futuristic.html'; } }] });
    }, FS.reduce ? 100 : 1600);
  });
  renderCh(); renderWeek(); weekly(); pillars(); trend(11);
})();
