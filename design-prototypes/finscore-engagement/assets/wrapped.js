/* monthly-wrapped.html: story-style monthly summary + privacy-first shareable card. Dummy data. */
(function () {
  'use strict';
  var FS = window.FS, $ = FS.$, $$ = FS.$$, esc = FS.esc;
  var D = { name: 'Aarav', month: 'November', before: 636, now: 648, stage: 'Accumulation', cards: 18, quizzes: 4, acc: 82, goal: 'Emergency fund', goalPct: 58, goalDelta: 8, weeks: 6, badges: ['Curious Mind', 'Steady Hands'], persona: 'The Steady Builder' };
  var DUR = 6000;
  var SL = [
    function () { return '<span class="sparkle" style="top:90px;right:30px">✨</span><span class="sparkle" style="bottom:120px;left:24px;animation-delay:.8s">🌟</span><p class="pill">Finscore Wrapped</p><h2>Your ' + D.month + ', ' + D.name + '</h2><p>A month of small, steady moves. Here is what you did.</p><p class="sm">Tap to continue →</p>'; },
    function () { return '<p class="pill">Your score</p><div class="big"><span data-c="' + D.now + '" data-from="' + D.before + '">' + D.before + '</span></div><p><b>+' + (D.now - D.before) + ' points</b> this month. You are in <b>' + D.stage + '</b>, 27 points from the next stage (illustrative).</p><a href="financial-journey.html#score">See your Score Journey →</a>'; },
    function () { return '<p class="pill">Learning</p><h2><span data-c="' + D.cards + '">0</span> cards read<br><span data-c="' + D.quizzes + '">0</span> quizzes played</h2><p>You answered <b>' + D.acc + '%</b> correctly and earned <b>' + D.badges.length + ' new badges</b>: ' + esc(D.badges.join(' and ')) + '.</p><a href="financial-games.html#cards">Learn something new →</a>'; },
    function () { return '<p class="pill">Goals</p><div class="ring" data-p="' + D.goalPct + '" style="--size:150px"><div><b>' + D.goalPct + '%</b><small>' + esc(D.goal) + '</small></div></div><p>Your <b>' + esc(D.goal.toLowerCase()) + '</b> moved <b>+' + D.goalDelta + '</b> points of progress. One more month like this gets you past the 75% flag.</p><a href="financial-journey.html#savings">Open your goal trail →</a>'; },
    function () { return '<p class="pill">Habits</p><h2>🔥 <span data-c="' + D.weeks + '">0</span> active weeks</h2><p>Your cadence is intact. Life gets busy, so it <b>pauses instead of resetting</b> when you miss a week.</p><div class="list"><div>Best day: Sunday</div><div>Favourite activity: Knowledge Cards</div></div>'; },
    function () { return '<p class="pill">Insights for you</p><div class="list"><div>💡 Your emergency fund is now 2.9 months. 3 months is just ₹6,000 away.</div><div>💡 Card dues were paid in full all month.</div><div>💡 You have not reviewed insurance cover yet this quarter.</div></div><a href="financial-journey.html#independence">Plan your next step →</a><p class="sm">Insights are educational, not advice.</p>'; },
    function () { return '<p class="pill">Your money personality</p><div class="big" style="font-size:72px">🧱</div><h2>' + D.persona + '</h2><p>You save regularly, plan ahead and balance risk. Keep it simple and consistent.</p><div class="list"><div>🏅 ' + esc(D.badges[0]) + '</div><div>🏅 ' + esc(D.badges[1]) + '</div></div>'; },
    function () { return '<p class="pill">That\'s a wrap</p><h2>See you in December ✨</h2><p>Your next Wrapped is built from what you do next month. Pick one thing today.</p><button class="act-btn" id="wrapShare">Share my card</button><button class="act-btn" id="wrapAgain" style="background:rgb(255 255 255/.25);color:#fff">Replay</button>'; }
  ];
  var cur = 0, timer = null, paused = false, started = 0, remaining = DUR, reduce = FS.reduce;
  $('#slides').innerHTML = SL.map(function (f, i) { return '<div class="slide s' + (i + 1) + '" data-i="' + i + '" role="group" aria-label="Slide ' + (i + 1) + ' of ' + SL.length + '"></div>'; }).join('');
  $('#segs').innerHTML = SL.map(function () { return '<i><b></b></i>'; }).join('');
  if (reduce) { paused = true; $('#pauseBtn').textContent = '▶ Play'; $('#pauseBtn').setAttribute('aria-pressed', 'true'); }

  function go(i, user) {
    if (i < 0) i = 0; if (i >= SL.length) { i = SL.length - 1; if (user) { FS.confetti(); return; } }
    clearTimeout(timer); cur = i; remaining = DUR; var sl = $$('.slide');
    sl.forEach(function (s, k) { s.classList.toggle('on', k === i); }); var el = sl[i]; el.innerHTML = SL[i]();
    $$('#segs i').forEach(function (s, k) { s.className = k < i ? 'done' : ''; if (k === i) { void s.offsetWidth; s.className = 'run'; s.style.setProperty('--dur', DUR + 'ms'); } });
    $('#slideLbl').textContent = (i + 1) + ' / ' + SL.length; $('#story').classList.toggle('paused', paused);
    $$('[data-c]', el).forEach(function (c) { FS.count(c, +c.dataset.c, { from: +c.dataset.from || 0, dur: 1100 }); }); FS.animateIn(el);
    var sh = $('#wrapShare', el); if (sh) sh.addEventListener('click', function () { $('#shareCard').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' }); FS.toast('Customise your card on the right', '🎴'); });
    var ag = $('#wrapAgain', el); if (ag) ag.addEventListener('click', function () { go(0, true); });
    if (i === SL.length - 1) FS.confetti();
    schedule();
  }
  function schedule() { clearTimeout(timer); if (paused || cur >= SL.length - 1) return; started = Date.now(); timer = setTimeout(function () { go(cur + 1); }, remaining); }
  function setPaused(p) {
    paused = p; var b = $('#pauseBtn'); b.setAttribute('aria-pressed', p); b.textContent = p ? '▶ Play' : '⏸ Pause'; $('#story').classList.toggle('paused', p);
    if (p) { clearTimeout(timer); remaining = Math.max(500, remaining - (Date.now() - started)); } else schedule();
  }
  $('#pauseBtn').addEventListener('click', function () { setPaused(!paused); });
  $('#nextHit').addEventListener('click', function () { go(cur + 1, true); }); $('#prevHit').addEventListener('click', function () { go(cur - 1, true); });
  $('#nextBtn').addEventListener('click', function () { go(cur + 1, true); }); $('#prevBtn').addEventListener('click', function () { go(cur - 1, true); }); $('#replayBtn').addEventListener('click', function () { go(0, true); });
  $('#story').addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') go(cur + 1, true); if (e.key === 'ArrowLeft') go(cur - 1, true); if (e.key === ' ') { e.preventDefault(); setPaused(!paused); } });

  /* ---- share card ---- */
  function opts() { return { score: $('#shScore').checked, badges: $('#shBadges').checked, name: $('#shName').checked }; }
  function renderShare() {
    var o = opts();
    $('#shareCard').innerHTML = '<div><p class="small" style="opacity:.85">Finscore · ' + D.month + ' Wrapped</p><p style="margin-top:6px;font-weight:700">' + (o.name ? esc(D.name) + '\'s' : 'My') + ' month</p></div><div>' + (o.score ? '<b class="n">+' + (D.now - D.before) + '</b><p class="small">score points this month</p>' : '<b class="n">✓</b><p class="small">steady progress this month</p>') + '</div><div><p class="small" style="margin-bottom:8px">' + esc(D.persona) + ' · ' + D.weeks + ' active weeks</p><div class="tags">' + (o.badges ? D.badges.map(function (b) { return '<span>🏅 ' + esc(b) + '</span>'; }).join('') : '') + '</div></div>';
  }
  function shareText() { var o = opts(); return 'My Finscore ' + D.month + ' Wrapped: ' + (o.score ? '+' + (D.now - D.before) + ' score points, ' : '') + D.weeks + ' active weeks' + (o.badges ? ', badges: ' + D.badges.join(', ') : '') + '. (Prototype, dummy data)'; }
  ['#shScore', '#shBadges', '#shName'].forEach(function (s) { $(s).addEventListener('change', renderShare); });
  $('#copyTxt').addEventListener('click', function () { try { navigator.clipboard.writeText(shareText()).catch(function () { /* blocked */ }); } catch (e) { /* blocked */ } FS.toast('Text copied (demo)', '📋'); });
  $('#saveImg').addEventListener('click', function () {
    var btn = $('#saveImg'), o = opts(); btn.innerHTML = '<span class="spinner"></span> Creating…'; btn.disabled = true;
    setTimeout(function () {
      var c = document.createElement('canvas'); c.width = 864; c.height = 1080; var x = c.getContext('2d'), g = x.createLinearGradient(0, 0, 864, 1080); g.addColorStop(0, '#066a60'); g.addColorStop(1, '#4f46e5'); x.fillStyle = g; x.fillRect(0, 0, 864, 1080);
      x.fillStyle = '#fff'; x.font = '600 34px system-ui, sans-serif'; x.fillText('Finscore · ' + D.month + ' Wrapped', 64, 110); x.font = '700 48px system-ui, sans-serif'; x.fillText((o.name ? D.name + '\'s' : 'My') + ' month', 64, 180);
      x.font = '800 220px system-ui, sans-serif'; x.fillText(o.score ? '+' + (D.now - D.before) : '✓', 64, 560); x.font = '600 38px system-ui, sans-serif'; x.fillText(o.score ? 'score points this month' : 'steady progress this month', 64, 620);
      x.font = '600 36px system-ui, sans-serif'; x.fillText(D.persona + ' · ' + D.weeks + ' active weeks', 64, 900); if (o.badges) { x.font = '700 32px system-ui, sans-serif'; x.fillText('Badges: ' + D.badges.join(' · '), 64, 960); }
      x.font = '500 24px system-ui, sans-serif'; x.globalAlpha = .75; x.fillText('Prototype · dummy data · no amounts shown', 64, 1030);
      c.toBlob(function (b) { var a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'finscore-wrapped-demo.png'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000); btn.textContent = 'Save image'; btn.disabled = false; FS.toast('Image saved (demo)', '🖼️'); FS.addPoints(10, 'shared milestone'); });
    }, 500);
  });

  renderShare(); go(0);
})();
