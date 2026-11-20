/* index.html: concept cards, filters, direction comparison. */
(function () {
  'use strict';
  var FS = window.FS, $ = FS.$, $$ = FS.$$, esc = FS.esc;
  // [letter, name, kind(build|new), summary, hook, link, linkLabel, direction]
  var C = [
    ['A', 'Financial Fitness Challenge', 'build', 'Daily challenges, weekly goals, a check-up and a cadence that pauses instead of resetting.', 'Return tomorrow: a fresh 5-minute checklist and a weekly goal to finish.', 'premium-fintech.html', 'Premium dashboard', 'Premium'],
    ['B', 'Financial Score Journey', 'build', 'Stage ladder, time-travel slider, before/after and "what could move my score".', 'Return: a visible next milestone and a short action list.', 'financial-journey.html#score', 'Score Journey', 'All'],
    ['C', 'Spin & Learn', 'new', 'One daily spin lands on a money topic, a tip and one question. Virtual rewards only.', 'Return: one spin a day, a different topic each time.', 'financial-games.html#spin', 'Spin wheel', 'Playful'],
    ['D', 'Financial Quiz Arena', 'new', 'Three difficulty levels, optional timer, instant explanations, a daily challenge.', 'Return: beat your own personal best. No public leaderboard.', 'financial-games.html#quiz', 'Quiz Arena', 'Playful'],
    ['E', 'Financial Personality Test', 'build', 'Eight scenarios reveal a money personality with strengths and watch-outs. Extends Financial DNA.', 'Return: retake in 3 months and compare.', 'financial-games.html#persona', 'Personality test', 'All'],
    ['F', 'Savings Goal Adventure', 'build', 'A trail map with milestone flags, goal challenges and a walking avatar. Simulated amounts.', 'Return: every small top-up visibly moves you forward.', 'financial-journey.html#savings', 'Savings trail', 'Playful'],
    ['G', 'Investment Learning Simulator', 'new', 'Five hypothetical market years. Rebalance and learn about diversification and staying calm.', 'Return: five different years to experience. Points reward learning, never profit.', 'financial-games.html#sim', 'Investing Sim', 'AI'],
    ['H', 'Financial Knowledge Cards', 'new', 'Swipeable one-minute lessons with a mini quiz and a daily goal.', 'Return: five fresh cards daily, no sign-up friction.', 'financial-games.html#cards', 'Swipe cards', 'Playful'],
    ['I', 'Achievement & Rewards Center', 'build', 'Badges grouped into collections, levels and progress. Builds on Money Map badges.', 'Return: close a collection, reach the next level.', 'financial-journey.html#rewards', 'Badge center', 'Playful'],
    ['J', 'AI Financial Coach Activities', 'build', 'Daily action plan with "why this?", grounded facts, accept/snooze/skip and habits.', 'Return: a ready plan every day, no blank-page decisions.', 'ai-futuristic.html', 'AI Coach', 'AI'],
    ['K', 'Financial Independence Journey', 'build', 'Safety, debt and growth ladder with an extra-payment slider and a retirement range.', 'Return: concrete next steps for a vague long-term worry.', 'financial-journey.html#independence', 'Independence planner', 'Premium'],
    ['L', 'Monthly Financial Wrapped', 'new', 'Eight-slide story of the month and a privacy-safe shareable card.', 'Return: next month\'s story must be earned by acting this month.', 'monthly-wrapped.html', 'Wrapped story', 'All']
  ];
  var filter = 'all';
  function render() {
    var items = C.filter(function (c) { return filter === 'all' || c[2] === filter; });
    $('#concepts-grid').innerHTML = items.map(function (c) { return '<article class="card concept reveal in"><div class="row between"><span class="L" aria-hidden="true">' + c[0] + '</span><span class="badge ' + (c[2] === 'new' ? 'new' : '') + '">' + (c[2] === 'new' ? 'New' : 'Builds on existing') + '</span></div><h3>' + esc(c[1]) + '</h3><p class="small muted">' + esc(c[3]) + '</p><p class="hook">' + esc(c[4]) + '</p><div class="row between"><a class="go" href="' + c[5] + '">Open: ' + esc(c[6]) + ' →</a><span class="xs muted">' + c[7] + '</span></div></article>'; }).join('');
    $('#cEmpty').hidden = items.length > 0;
  }
  $$('#cf button').forEach(function (b) { b.addEventListener('click', function () { filter = b.dataset.f; $$('#cf button').forEach(function (x) { x.setAttribute('aria-selected', x === b); }); render(); }); });
  render();
  $$('#cmpTbl thead button').forEach(function (b) { b.addEventListener('click', function () { var c = +b.dataset.c, on = b.dataset.on !== '1'; $$('#cmpTbl [data-hl]').forEach(function (x) { x.classList.remove('hl'); }); $$('#cmpTbl thead button').forEach(function (x) { x.dataset.on = ''; }); if (on) { b.dataset.on = '1'; $$('#cmpTbl tr').forEach(function (r) { var cell = r.children[c]; if (cell) { cell.classList.add('hl'); cell.dataset.hl = 1; } }); } }); });
  var REC = {
    beginner: 'Gamified & Playful for the first weeks, because quests and the mascot lower the fear of money topics. Layer in Premium views as confidence grows.',
    regular: 'Premium Fintech as the home screen, with the AI coach plan as the daily entry point. Playful games stay one tap away.',
    investor: 'Premium Fintech with the Investing Sim and Independence planner. Keep playfulness minimal and put data and ranges first.',
    simple: 'Premium Fintech with all games switched off by default and only the weekly goal visible. Everything gamified must be optional.'
  };
  $$('#pickBtns button').forEach(function (b) { b.addEventListener('click', function () { $('#pickOut').textContent = REC[b.dataset.k]; $$('#pickBtns button').forEach(function (x) { x.classList.toggle('ghost', x !== b); }); }); });
})();
