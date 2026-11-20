/* gamified-experience.html behaviour. Dummy data; virtual rewards only. */
(function () {
  'use strict';
  var FS = window.FS, $ = FS.$, $$ = FS.$$, esc = FS.esc;
  var TIPS = ['Pay yourself first: move savings the day your salary lands.', 'A 3-month buffer lets you sleep better. Small steps count!', 'Check subscriptions monthly; one forgotten plan is a free coffee lost every week.', 'Starting early beats starting big. Time does the heavy lifting.', 'Never share your OTP or UPI PIN. Not with anyone, ever.'];
  var QUESTS = [
    { id: 'q1', ring: 0, ico: '📘', c: '#e8447a', t: 'Read a 1-minute lesson', d: 'Knowledge Cards', p: 10 },
    { id: 'q2', ring: 0, ico: '🧠', c: '#e8447a', t: 'Answer one quiz question', d: 'Quiz Arena', p: 10 },
    { id: 'q3', ring: 1, ico: '🐷', c: '#0fb5a6', t: 'Add to a goal (simulated)', d: 'Savings Adventure', p: 15 },
    { id: 'q4', ring: 2, ico: '🛡️', c: '#f5a524', t: 'Check your safety buffer', d: 'Health check', p: 10 },
    { id: 'q5', ring: 2, ico: '💳', c: '#f5a524', t: 'Confirm bill reminders', d: 'Today', p: 10 }
  ];
  var RING_NEED = [2, 1, 2], RING_C = ['#e8447a', '#0fb5a6', '#f5a524'], RADII = [86, 64, 42];
  var done = {}, chestOpen = false;

  function counts() { var n = [0, 0, 0]; QUESTS.forEach(function (q) { if (done[q.id]) n[q.ring]++; }); return n; }
  function renderRings() {
    var n = counts(), closed = 0, s = '';
    RADII.forEach(function (r, i) { var C = 2 * Math.PI * r, p = Math.min(1, n[i] / RING_NEED[i]); if (p >= 1) closed++; s += '<circle class="rg-track" cx="100" cy="100" r="' + r + '"/><circle class="rg" cx="100" cy="100" r="' + r + '" stroke="' + RING_C[i] + '" stroke-dasharray="' + C.toFixed(1) + '" stroke-dashoffset="' + (C * (1 - p)).toFixed(1) + '"/>'; });
    $('#rings').innerHTML = s; $('#ringTotal').textContent = closed;
  }
  function renderQuests() {
    var total = Object.keys(done).length; $('#qDone').textContent = total;
    $('#quests').innerHTML = QUESTS.map(function (q) { var d = done[q.id]; return '<div class="quest ' + (d ? 'done' : '') + '"><span class="q-ico" style="background:' + q.c + '33">' + (d ? '✅' : q.ico) + '</span><div><b>' + q.t + '</b><br><span class="xs muted">' + q.d + '</span> <span class="xp">+' + q.p + ' pts</span></div><button class="btn sm" data-id="' + q.id + '" ' + (d ? 'disabled' : '') + '>' + (d ? 'Done!' : 'Do it') + '</button></div>'; }).join('');
    $$('#quests button').forEach(function (b) { b.addEventListener('click', function (e) { var q = QUESTS.filter(function (x) { return x.id === b.dataset.id; })[0]; done[q.id] = true; var r = b.getBoundingClientRect(); FS.confetti(r.left + r.width / 2, r.top); FS.addPoints(q.p, 'quest complete'); renderQuests(); renderRings(); renderMap(); chest(); }); });
  }
  function chest() {
    var n = Object.keys(done).length, c = $('#chest'); if (chestOpen) return;
    if (n >= 3) { c.disabled = false; c.classList.add('ready'); c.setAttribute('aria-label', 'Treasure chest, ready to open'); $('#chestMsg').textContent = 'Your chest is ready! Tap to open.'; } else { $('#chestMsg').textContent = 'Complete ' + (3 - n) + ' more quest' + (3 - n === 1 ? '' : 's') + ' to unlock today\'s chest.'; }
  }
  var PRIZES = [['🧢', 'Sticker: Cool Saver', 25], ['🏷️', 'Title: "Budget Boss"', 20], ['💡', 'Bonus tip unlocked', 15], ['🎨', 'Theme: Sunset', 20]];
  $('#chest').addEventListener('click', function () {
    var c = $('#chest'); if (chestOpen) return; chestOpen = true; c.classList.remove('ready'); c.classList.add('open'); c.textContent = '✨'; c.disabled = true;
    setTimeout(function () { var p = PRIZES[Math.floor(Math.random() * PRIZES.length)]; c.textContent = p[0]; $('#chestMsg').textContent = 'You got: ' + p[1] + ' (virtual)'; FS.addPoints(p[2], 'chest reward'); FS.confetti(); }, FS.reduce ? 100 : 900);
  });

  var DAYS = [['M', 1], ['T', 1], ['W', 1], ['T', 0], ['F', 0], ['S', 0], ['S', 2]];
  function renderMap() {
    var n = Object.keys(done).length; $('#map').innerHTML = DAYS.map(function (d, i) { var cls = d[1] === 1 ? 'done' : i === 3 ? 'today' : d[1] === 2 ? 'boss' : ''; if (i === 3 && n >= 3) cls = 'done'; return '<div class="node ' + cls + '" role="listitem"><i>' + (cls === 'done' ? '✓' : d[1] === 2 ? '👑' : i === 3 ? '📍' : '') + '</i>' + d[0] + (d[1] === 2 ? '<br><span class="xs">Review</span>' : '') + '</div>'; }).join('');
    $('#mapMsg').textContent = n >= 3 ? 'Day 4 done. Three more days to the Sunday weekly review.' : 'Finish 3 quests to light up today\'s stone. Missed a day? Your cadence pauses; it never resets.';
  }
  var SHELF = [['first_score', '◎', 'First Score'], ['protected', '⛨', 'Protected'], ['steady_4', '◷', 'Steady 4'], ['curious_mind', '🧠', 'Curious Mind'], ['quiz_ace', '🏆', 'Quiz Ace'], ['goal_getter', '🎯', 'Goal Getter'], ['steady_hands', '🤲', 'Steady Hands'], ['self_aware', '🪞', 'Self-aware']];
  function renderShelf() {
    var own = FS.state().badges; $('#shelf').innerHTML = SHELF.map(function (b) { var on = own.indexOf(b[0]) > -1; return '<button class="' + (on ? '' : 'locked') + '" data-id="' + b[0] + '"><span class="ico">' + b[1] + '</span>' + esc(b[2]) + '<br><span class="xs muted">' + (on ? 'Unlocked' : 'Locked') + '</span></button>'; }).join('');
    $$('#shelf button').forEach(function (el) { el.addEventListener('click', function () { var b = SHELF.filter(function (x) { return x[0] === el.dataset.id; })[0], on = FS.state().badges.indexOf(b[0]) > -1; FS.modal({ title: b[2], icon: b[1], html: '<p class="muted">' + (on ? 'You earned this one. Nice work!' : 'Not yet earned. Find it in the mini-games or journey. Badges never change your Finscore.') + '</p>', actions: on ? [{ label: 'Close' }] : [{ label: 'Close' }, { label: 'Preview unlock', cls: 'ai', fn: function () { FS.unlockBadge(b[0], b[2]); renderShelf(); } }] }); }); });
  }
  var ti = 0, mascot = $('#mascot');
  function tip() { ti = (ti + 1) % TIPS.length; var s = $('#speech'); s.textContent = TIPS[ti]; s.style.animation = 'none'; void s.offsetWidth; s.style.animation = ''; }
  mascot.addEventListener('click', tip); mascot.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tip(); } });
  renderQuests(); renderRings(); renderMap(); renderShelf(); chest();
})();
