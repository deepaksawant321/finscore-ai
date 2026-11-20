/* financial-games.html: Spin & Learn, Quiz Arena, Personality, Investment Simulator, Knowledge Cards. Dummy content only. */
(function () {
  'use strict';
  var FS = window.FS, $ = FS.$, $$ = FS.$$, esc = FS.esc, store = FS.store;
  var today = function () { return new Date().toISOString().slice(0, 10); };
  var shuffle = function (a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
  var LINKS = { goals: 'Goals', sim: 'What-if simulator', coach: 'AI Wealth Coach', journey: 'Money Map', health: 'Health check' };

  /* ============ C. SPIN & LEARN ============ */
  var TOPICS = [
    { n: 'Emergency fund', c: '#0fb5a6', tip: 'Aim for 3 to 6 months of essential expenses, kept somewhere easy to reach.', q: 'Where is the best place for an emergency fund?', o: ['Easy-access savings or liquid option', 'A 5-year locked product', 'One volatile stock'], a: 0, x: 'Emergency money must be available fast and shouldn\'t swing in value.', link: 'goals' },
    { n: 'Credit score', c: '#4f46e5', tip: 'Paying every EMI and card bill on time is the biggest lever on a credit score.', q: 'Which habit helps a credit score most?', o: ['Applying for many loans at once', 'Paying dues on time, every time', 'Closing every old account'], a: 1, x: 'Repayment history is the largest factor in most scoring models.', link: 'health' },
    { n: 'SIP basics', c: '#e8447a', tip: 'A SIP invests a fixed amount regularly. It builds a habit; it does not guarantee returns.', q: 'What does a SIP do?', o: ['Invests a fixed amount at regular intervals', 'Guarantees profit', 'Removes all market risk'], a: 0, x: 'SIPs spread your entry points over time. Value can still go down as well as up.', link: 'sim' },
    { n: 'Insurance', c: '#f5a524', tip: 'Insurance moves a big financial risk off you. Keep protection and investing as separate decisions.', q: 'Term insurance is mainly for…', o: ['Beating inflation', 'Protecting dependants\' income', 'Earning market returns'], a: 1, x: 'Term cover pays your family if you are not around. It is protection, not investment.', link: 'health' },
    { n: 'Tax smartness', c: '#2b8be0', tip: 'Don\'t buy a product only to save tax. First ask whether it fits a goal of yours.', q: 'Before a tax-saving purchase, check…', o: ['Only the deadline', 'Goal fit and lock-in period', 'What a friend bought'], a: 1, x: 'A mismatched lock-in can cost more than the tax you save.', link: 'coach' },
    { n: 'Inflation', c: '#7c3aed', tip: '₹100 buys less each year if prices rise. Growth must beat inflation to build real wealth.', q: 'Your money earns 5% while prices rise 6%. Your purchasing power…', o: ['Rises', 'Stays the same', 'Falls'], a: 2, x: 'Real return is roughly 5% − 6% = about −1% a year.', link: 'sim' },
    { n: 'Debt & EMI', c: '#c5292f', tip: 'Paying off the highest-interest debt first usually saves the most money.', q: 'Which loan should you prepay first?', o: ['The one with the highest interest rate', 'The smallest EMI', 'The oldest loan'], a: 0, x: 'The highest rate costs you the most each month. This is called the avalanche method.', link: 'goals' },
    { n: 'Digital safety', c: '#0a8579', tip: 'Never share an OTP or UPI PIN. You only enter a PIN to pay, never to receive money.', q: 'A stranger sends a "collect request" to "send you a refund". You…', o: ['Approve it with your PIN', 'Decline: receiving never needs a PIN', 'Share the OTP to check'], a: 1, x: 'Approving a collect request sends money out of your account.', link: 'coach' }
  ];
  var rot = 0, spinning = false;
  function pt(r, deg) { var a = (deg - 90) * Math.PI / 180; return [r * Math.cos(a), r * Math.sin(a)]; }
  function drawWheel() {
    var g = $('#wheelSegs'), html = '';
    TOPICS.forEach(function (t, i) {
      var a0 = i * 45, a1 = a0 + 45, p0 = pt(100, a0), p1 = pt(100, a1), mid = a0 + 22.5;
      html += '<path d="M0 0 L' + p0[0].toFixed(2) + ' ' + p0[1].toFixed(2) + ' A100 100 0 0 1 ' + p1[0].toFixed(2) + ' ' + p1[1].toFixed(2) + ' Z" fill="' + t.c + '" stroke="#fff" stroke-width="1.5"/>';
      html += '<text class="seg-label" transform="rotate(' + (mid - 90) + ') translate(30 3)">' + esc(t.n) + '</text>';
    });
    g.innerHTML = html + '<circle r="102" fill="none" stroke="rgb(255 255 255/.5)" stroke-width="2"/>';
  }
  function spinState() { return store.get('spinDay', '') === today(); }
  function renderSpin() {
    var done = spinState(), btn = $('#spinBtn'); btn.disabled = done;
    $('#spinStatus').textContent = done ? 'You have spun today. Come back tomorrow for a new topic. 🌙' : 'One free spin a day. Land on a topic, learn a tip, answer one question.';
    var h = store.get('spinHist', []); $('#spinEmpty').hidden = h.length > 0;
    $('#spinHistory').innerHTML = h.slice(-5).reverse().map(function (r) { return '<li><span>' + esc(r.t) + '</span><span class="muted">' + (r.ok ? '✓ +25' : '+10') + '</span></li>'; }).join('');
  }
  function spin() {
    if (spinning || spinState()) return; spinning = true;
    var idx = Math.floor(Math.random() * TOPICS.length), centre = idx * 45 + 22.5, jitter = (Math.random() - .5) * 26;
    var cur = ((rot % 360) + 360) % 360, delta = ((360 - centre + jitter - cur) % 360 + 360) % 360 + 360 * 5;
    rot += delta; $('#wheelRot').style.transform = 'rotate(' + rot + 'deg)';
    $('#spinBtn').disabled = true; $('#spinStatus').innerHTML = '<span class="spinner"></span> Spinning…';
    setTimeout(function () { spinning = false; store.set('spinDay', today()); FS.addPoints(10, 'daily spin'); showTopic(TOPICS[idx]); renderSpin(); }, FS.reduce ? 200 : 4700);
  }
  function showTopic(t) {
    var chosen = false;
    FS.modal({
      title: t.n, icon: '🎡', html: '<p class="muted">' + esc(t.tip) + '</p><p style="margin:14px 0 8px"><b>' + esc(t.q) + '</b></p><div class="stack" id="spinOpts">' + t.o.map(function (o, i) { return '<button class="opt" data-i="' + i + '"><span class="k">' + 'ABC'[i] + '</span>' + esc(o) + '</button>'; }).join('') + '</div><div id="spinFb"></div>',
      actions: [{ label: 'Done' }],
      onOpen: function (m) {
        $$('#spinOpts .opt', m).forEach(function (b) {
          b.addEventListener('click', function () {
            if (chosen) return; chosen = true; var i = +b.dataset.i, ok = i === t.a;
            $$('#spinOpts .opt', m).forEach(function (x, k) { x.disabled = true; if (k === t.a) x.classList.add('right'); });
            if (!ok) b.classList.add('wrong');
            $('#spinFb', m).innerHTML = '<div class="explain">' + (ok ? '<b>Nice!</b> ' : '<b>Good try.</b> ') + esc(t.x) + '<br><a href="financial-journey.html">Explore ' + LINKS[t.link] + ' in Finscore →</a></div>';
            var h = store.get('spinHist', []); h.push({ t: t.n, ok: ok }); store.set('spinHist', h);
            if (ok) { FS.addPoints(15, 'correct answer'); FS.confetti(); } renderSpin();
          });
        });
      }
    });
  }

  /* ============ D. QUIZ ARENA ============ */
  var BANK = {
    Beginner: [
      { q: 'How many months of essential expenses is a common emergency-fund target?', o: ['1 week', '3 to 6 months', '5 years', 'None, use credit'], a: 1, x: 'Three to six months covers most job gaps or surprises.' },
      { q: 'In the 50/30/20 guide, the "20" is for…', o: ['Shopping', 'Savings and debt repayment', 'Rent', 'Gifts'], a: 1, x: '50% needs, 30% wants, 20% savings and extra debt repayment.' },
      { q: 'SIP stands for…', o: ['Savings Interest Plan', 'Systematic Investment Plan', 'Secure Income Policy', 'Single Invested Payment'], a: 1, x: 'A Systematic Investment Plan invests a set amount on a schedule.' },
      { q: 'What affects your credit score the most?', o: ['Your age', 'Repayment history', 'Your employer name', 'Number of bank visits'], a: 1, x: 'Paying on time, consistently, matters most.' },
      { q: 'Inflation means…', o: ['Prices rise, money buys less', 'Prices fall', 'Interest rates are zero', 'Taxes are lower'], a: 0, x: 'Rising prices reduce what each rupee can buy.' }
    ],
    Intermediate: [
      { q: 'Compounding works best when you…', o: ['Start early and stay invested', 'Withdraw every year', 'Switch products often', 'Avoid investing'], a: 0, x: 'Time lets growth earn its own growth.' },
      { q: 'A commonly used guide for credit-card utilisation is to stay below about…', o: ['100%', '75%', '30% of your limit', '90%'], a: 2, x: 'Lower utilisation signals you are not stretched.' },
      { q: 'On a reducing-balance loan, the interest share of each EMI…', o: ['Rises over time', 'Falls over time', 'Stays fixed', 'Is always zero'], a: 1, x: 'As principal falls, interest on the remaining balance falls too.' },
      { q: 'Which product is pure protection with no maturity investment?', o: ['Term insurance', 'Endowment plan', 'Recurring deposit', 'Gold ETF'], a: 0, x: 'Term plans pay only if the insured event occurs.' },
      { q: 'Diversification mainly reduces…', o: ['All market risk', 'Concentration risk', 'Taxes', 'Inflation'], a: 1, x: 'It limits damage from any single holding but can\'t remove market risk.' }
    ],
    Pro: [
      { q: 'A 8% nominal return with 5% inflation gives a real return of about…', o: ['13%', '8%', '3%', '−3%'], a: 2, x: 'Real return ≈ nominal − inflation (more exactly 2.9%).' },
      { q: 'Rule of 72: at 8% a year, money roughly doubles in…', o: ['3 years', '9 years', '18 years', '72 years'], a: 1, x: '72 ÷ 8 = 9 years (an approximation).' },
      { q: 'Sequence-of-returns risk matters most…', o: ['Never', 'When you start withdrawing from savings', 'Only for children', 'In your first job'], a: 1, x: 'Early losses while withdrawing hurt more than the same losses later.' },
      { q: 'EMIs of ₹30,000 on a ₹1,00,000 monthly income is a debt-to-income ratio of…', o: ['3%', '13%', '30%', '70%'], a: 2, x: '30,000 ÷ 1,00,000 = 30%.' },
      { q: 'Which factor most shapes how much investment risk may suit you?', o: ['Your friends\' choices', 'Time horizon and ability to absorb losses', 'Last month\'s returns', 'A product\'s popularity'], a: 1, x: 'Longer horizons and stable finances can handle more ups and downs.' }
    ]
  };
  var quiz = null;
  function renderQuizHome() {
    $('#quizBox').innerHTML = '<p class="eyebrow">Choose your level</p><h2 style="margin:6px 0 14px">Quiz Arena</h2><div class="diff">' +
      [['Beginner', '🌱', 'Everyday money basics'], ['Intermediate', '🌿', 'Credit, loans, investing'], ['Pro', '🌳', 'Real returns, risk, planning']].map(function (d) { return '<button data-lvl="' + d[0] + '"><b>' + d[1] + ' ' + d[0] + '</b><span class="small muted">' + d[2] + '</span></button>'; }).join('') +
      '</div><p style="margin-top:16px"><label class="toggle"><input type="checkbox" id="timerOn" ' + (store.get('timerOn', true) ? 'checked' : '') + '> 15-second timer per question</label></p><p class="small muted">Timer is optional. Five questions per round.</p>';
    $$('#quizBox .diff button').forEach(function (b) { b.addEventListener('click', function () { startQuiz(b.dataset.lvl, BANK[b.dataset.lvl]); }); });
    $('#timerOn').addEventListener('change', function (e) { store.set('timerOn', e.target.checked); });
    renderRuns();
  }
  function renderRuns() {
    var runs = store.get('runs', []), best = {}; runs.forEach(function (r) { best[r.l] = Math.max(best[r.l] || 0, r.s); });
    $('#runsEmpty').hidden = runs.length > 0;
    $('#runsTbl tbody').innerHTML = runs.slice(-5).reverse().map(function (r) { return '<tr><td>' + esc(r.l) + '</td><td>' + r.s + '/5</td><td>' + best[r.l] + '/5</td></tr>'; }).join('');
  }
  function startQuiz(lvl, qs) { quiz = { lvl: lvl, qs: shuffle(qs).slice(0, 5), i: 0, s: 0, res: [], timed: $('#timerOn') ? $('#timerOn').checked : store.get('timerOn', true) }; showQ(); }
  var tmr = null;
  function showQ() {
    clearInterval(tmr); var q = quiz.qs[quiz.i], box = $('#quizBox'), answered = false;
    box.innerHTML = '<div class="qmeta"><span>' + esc(quiz.lvl) + ' · Question ' + (quiz.i + 1) + ' of 5</span><span class="dots">' + quiz.qs.map(function (_, i) { return '<i class="' + (quiz.res[i] === true ? 'on' : quiz.res[i] === false ? 'bad' : '') + '"></i>'; }).join('') + '</span></div>' +
      (quiz.timed ? '<div class="timer" style="margin:12px 0" role="progressbar" aria-label="Time left"><i id="tbar"></i></div>' : '<div style="height:12px"></div>') +
      '<h2 style="font-size:22px;margin-bottom:14px">' + esc(q.q) + '</h2><div class="stack">' + q.o.map(function (o, i) { return '<button class="opt" data-i="' + i + '"><span class="k">' + 'ABCD'[i] + '</span>' + esc(o) + '</button>'; }).join('') + '</div><div id="qfb"></div>';
    function answer(i) {
      if (answered) return; answered = true; clearInterval(tmr);
      var ok = i === q.a; quiz.res[quiz.i] = ok; if (ok) quiz.s++;
      $$('.opt', box).forEach(function (b, k) { b.disabled = true; if (k === q.a) b.classList.add('right'); else if (k === i) b.classList.add('wrong'); });
      $('#qfb', box).innerHTML = '<div class="explain">' + (i < 0 ? '<b>Time\'s up.</b> ' : ok ? '<b>Correct!</b> ' : '<b>Not quite.</b> ') + esc(q.x) + '</div><div class="row" style="justify-content:flex-end;margin-top:14px"><button class="btn" id="qnext">' + (quiz.i === 4 ? 'See results' : 'Next question') + '</button></div>';
      $('#qnext', box).focus(); $('#qnext', box).addEventListener('click', function () { quiz.i++; quiz.i > 4 ? finishQuiz() : showQ(); });
    }
    $$('.opt', box).forEach(function (b) { b.addEventListener('click', function () { answer(+b.dataset.i); }); });
    if (quiz.timed) { var t0 = Date.now(), bar = $('#tbar'); tmr = setInterval(function () { var left = Math.max(0, 15000 - (Date.now() - t0)); bar.style.transform = 'scaleX(' + (left / 15000) + ')'; bar.parentNode.classList.toggle('low', left < 5000); if (!left) answer(-1); }, 100); }
  }
  function finishQuiz() {
    var runs = store.get('runs', []), prev = Math.max.apply(null, [0].concat(runs.filter(function (r) { return r.l === quiz.lvl; }).map(function (r) { return r.s; })));
    runs.push({ l: quiz.lvl, s: quiz.s }); store.set('runs', runs); renderRuns();
    var pts = quiz.s * 10 + (quiz.s === 5 ? 20 : 0); FS.addPoints(pts, 'quiz round'); if (quiz.s >= 4) FS.confetti();
    if (quiz.s === 5) FS.unlockBadge('quiz_ace', 'Quiz Ace');
    $('#quizBox').innerHTML = '<div style="text-align:center;padding:10px"><span style="font-size:56px" class="archetype-emoji">' + (quiz.s >= 4 ? '🏆' : quiz.s >= 2 ? '👏' : '🌱') + '</span><h2 style="margin:8px 0">' + quiz.s + ' out of 5</h2><p class="muted">' + (quiz.s > prev ? 'A new personal best at ' + esc(quiz.lvl) + '!' : quiz.s >= 4 ? 'Strong round. Try the next level?' : 'Every wrong answer taught you something. Play again anytime.') + '</p><p class="stat" style="margin-top:12px"><b>+' + pts + '</b><span>clarity points</span></p><div class="row wrapx" style="justify-content:center;margin-top:16px"><button class="btn" id="again">Play again</button><button class="btn ghost" id="home">Change level</button></div></div>';
    $('#again').addEventListener('click', function () { startQuiz(quiz.lvl, BANK[quiz.lvl]); }); $('#home').addEventListener('click', renderQuizHome);
  }
  function dailyMix() { return shuffle([].concat(BANK.Beginner.slice(0, 2), BANK.Intermediate.slice(0, 2), BANK.Pro.slice(0, 1))); }

  /* ============ E. PERSONALITY ============ */
  var PQ = [
    { q: 'A surprise ₹20,000 bonus lands. You…', o: [['Save it all', 2, 1, 0], ['Invest most of it', 1, 1, 2], ['Spend a little, save the rest', 1, 0, 0], ['Treat yourself first', -1, -1, 0]] },
    { q: 'How do you keep track of your spending?', o: [['A budget I review weekly', 1, 2, 0], ['I check my balance now and then', 0, 0, 0], ['I don\'t really track it', -1, -2, 0]] },
    { q: 'Your investments fall 15% in a month. You…', o: [['Sell to stop the pain', 0, -1, -2], ['Hold and wait', 0, 1, 1], ['Buy more if it fits my plan', 0, 1, 2], ['Avoid looking at it', 0, -1, -1]] },
    { q: 'A friend shares a "hot" investment tip. You…', o: [['Research it before deciding', 0, 2, 1], ['Put in a small amount', 0, 0, 2], ['Politely ignore it', 1, 1, -1]] },
    { q: 'For a big purchase (say a ₹60,000 phone) you…', o: [['Save up, then buy', 2, 1, 0], ['Use a no-cost EMI', -1, 0, 0], ['Put it on a credit card', -2, -1, 0]] },
    { q: 'Retirement feels…', o: [['Planned, I know my number', 1, 2, 0], ['Far away, I\'ll think later', 0, -2, 0], ['Something family will help with', -1, -1, -1]] },
    { q: 'If your income stopped, your savings would last…', o: [['6+ months', 2, 1, 0], ['2 to 5 months', 1, 0, 0], ['Less than a month', -2, -1, 0]] },
    { q: 'Your money goals are…', o: [['Written down with dates', 1, 2, 0], ['In my head', 0, 0, 0], ['I don\'t have any yet', 0, -2, 0]] }
  ];
  var ARCH = [
    { n: 'The Steady Builder', e: '🧱', v: [75, 75, 50], d: 'You save regularly and plan ahead, with a balanced view of risk.', s: 'Consistency and clear goals.', w: 'Make sure your plan is reviewed after big life changes.', nx: ['Goals', 'What-if simulator'] },
    { n: 'The Careful Guardian', e: '🛡️', v: [80, 50, 15], d: 'You protect what you have. Safety comes first.', s: 'Strong buffer and low stress.', w: 'Too little growth can let inflation quietly erode savings.', nx: ['What-if simulator', 'AI Wealth Coach'] },
    { n: 'The Bold Explorer', e: '🧭', v: [45, 35, 85], d: 'You like opportunity and aren\'t scared of volatility.', s: 'Comfort with growth assets.', w: 'Without a buffer and a plan, a bad year can force bad choices.', nx: ['Health check', 'Goals'] },
    { n: 'The Strategist', e: '♟️', v: [65, 85, 80], d: 'You plan carefully and accept risk on purpose.', s: 'Discipline plus growth mindset.', w: 'Beware of over-optimising; keep it simple enough to follow.', nx: ['What-if simulator', 'Goals'] },
    { n: 'The Present-Moment Enjoyer', e: '🎈', v: [20, 35, 50], d: 'You value experiences today, which is healthy in moderation.', s: 'You live well and are flexible.', w: 'A small automatic saving can protect future you without hurting today.', nx: ['Money Map', 'Goals'] },
    { n: 'The Balanced Navigator', e: '⚖️', v: [50, 50, 50], d: 'You are in the middle on most things, with room to choose your focus.', s: 'Flexibility.', w: 'Pick one habit to strengthen first.', nx: ['Money Map', 'AI Wealth Coach'] }
  ];
  var pState = { i: 0, a: [] };
  function renderP() {
    var box = $('#pBox'); if (pState.i >= PQ.length) return pResult();
    var q = PQ[pState.i]; box.innerHTML = '<div class="qmeta"><span>Question ' + (pState.i + 1) + ' of ' + PQ.length + '</span><span class="small">No right answers</span></div><div class="bar" style="margin:10px 0 16px"><i style="width:' + (pState.i / PQ.length * 100) + '%"></i></div><h2 style="font-size:22px">' + esc(q.q) + '</h2><div class="pq">' + q.o.map(function (o, i) { return '<button class="opt" data-i="' + i + '"><span class="k">' + 'ABCD'[i] + '</span>' + esc(o[0]) + '</button>'; }).join('') + '</div>' + (pState.i ? '<button class="btn ghost sm" id="pBack" style="margin-top:14px">← Back</button>' : '');
    $$('.opt', box).forEach(function (b) { b.addEventListener('click', function () { pState.a[pState.i] = +b.dataset.i; b.classList.add('sel'); setTimeout(function () { pState.i++; renderP(); }, 220); }); });
    var back = $('#pBack'); if (back) back.addEventListener('click', function () { pState.i--; renderP(); });
  }
  function pResult() {
    var S = 0, P = 0, R = 0; pState.a.forEach(function (ai, qi) { var o = PQ[qi].o[ai]; S += o[1]; P += o[2]; R += o[3]; });
    var norm = function (v, lo, hi) { return Math.max(0, Math.min(100, Math.round((v - lo) / (hi - lo) * 100))); };
    var vals = [norm(S, -5, 8), norm(P, -6, 11), norm(R, -3, 8)];
    var best = ARCH.slice().sort(function (a, b) { var d = function (x) { return Math.pow(x.v[0] - vals[0], 2) + Math.pow(x.v[1] - vals[1], 2) + Math.pow(x.v[2] - vals[2], 2); }; return d(a) - d(b); })[0];
    FS.addPoints(40, 'personality result'); FS.unlockBadge('self_aware', 'Self-aware'); FS.confetti();
    $('#pBox').innerHTML = '<div style="text-align:center"><div class="archetype-emoji">' + best.e + '</div><p class="eyebrow">Your money personality</p><h2 style="margin:4px 0 8px">' + esc(best.n) + '</h2><p class="muted">' + esc(best.d) + '</p></div><div class="stack" style="margin-top:18px">' +
      [['Saving habit', vals[0]], ['Planning', vals[1]], ['Risk comfort', vals[2]]].map(function (a) { return '<div class="axis"><span>' + a[0] + '</span><div class="bar"><i data-w="' + a[1] + '"></i></div><b>' + a[1] + '</b></div>'; }).join('') + '</div>' +
      '<div class="grid g2" style="margin-top:18px"><div class="card flat tight"><b>💪 Strength</b><p class="small muted">' + esc(best.s) + '</p></div><div class="card flat tight"><b>👀 Watch-out</b><p class="small muted">' + esc(best.w) + '</p></div></div>' +
      '<p style="margin-top:14px"><b>Suggested next steps</b> <span class="small muted">(existing Finscore features)</span></p><div class="row wrapx" style="margin-top:8px">' + best.nx.map(function (n) { return '<span class="badge ai">' + esc(n) + '</span>'; }).join('') + '</div><div class="row wrapx" style="margin-top:16px"><button class="btn" id="pRetake">Retake</button><button class="btn ghost" id="pShare">Copy result</button></div><p class="xs muted" style="margin-top:10px">Educational, not advice. Habits can change.</p>';
    FS.animateIn($('#pBox'));
    $('#pRetake').addEventListener('click', function () { pState = { i: 0, a: [] }; renderP(); });
    $('#pShare').addEventListener('click', function () { var t = 'My Finscore money personality: ' + best.n + ' (demo prototype)'; try { navigator.clipboard.writeText(t).catch(function () { /* clipboard blocked */ }); } catch (e) { /* clipboard blocked */ } FS.toast('Result copied (demo)', '📋'); });
  }

  /* ============ G. INVESTMENT SIMULATOR (HYPOTHETICAL) ============ */
  var YEARS = [
    { t: 'Year 1: A calm, steady year', d: 'Markets drift upward and nothing dramatic happens.', r: [12, 7, 4, 3.5], lesson: 'Calm years reward patience, but they are the exception, not the rule.' },
    { t: 'Year 2: A sharp correction', d: 'Shares fall about a fifth in three months. Headlines turn scary.', r: [-22, 6, 14, 3.5], lesson: 'Different assets behave differently in a fall. That is what diversification is for.' },
    { t: 'Year 3: Rates rise unexpectedly', d: 'Higher interest rates pressure both shares and some bonds.', r: [-8, -2, 3, 4], lesson: 'Even "safe" assets can dip. Cash helps when many things fall together.' },
    { t: 'Year 4: A strong recovery', d: 'Markets bounce back faster than almost anyone expected.', r: [28, 8, -3, 3.5], lesson: 'Recoveries often start while the news is still bad. Those who sold in Year 2 may have missed it.' },
    { t: 'Year 5: A surprise inflation spike', d: 'Prices jump. Gold does well and cash loses purchasing power.', r: [5, 1, 18, 3.5], lesson: 'No single asset wins every year. A mix helps you stay invested.' }
  ];
  var NAMES = ['Shares', 'Debt', 'Gold', 'Cash'], CLS = ['c-eq', 'c-db', 'c-gd', 'c-cs'];
  var sim = null;
  function simStart() { sim = { r: 0, v: 100000, hist: [100000], alloc: [40, 30, 10, 20], log: [] }; simRender(); simSide(); }
  function simSide() { $('#simValue').textContent = FS.inr(sim.v); $('#simRound').textContent = sim.r; var h = sim.hist, mx = Math.max.apply(null, h) * 1.05, mn = Math.min.apply(null, h) * .95; var pts = h.map(function (v, i) { return (10 + i * (280 / 5)).toFixed(1) + ',' + (110 - (v - mn) / (mx - mn || 1) * 100).toFixed(1); }); $('#simChart').innerHTML = '<polyline fill="none" stroke="var(--brand)" stroke-width="3" stroke-linejoin="round" points="' + pts.join(' ') + '"/>' + pts.map(function (p) { var xy = p.split(','); return '<circle cx="' + xy[0] + '" cy="' + xy[1] + '" r="4" fill="var(--ai)"/>'; }).join('') + '<line x1="10" x2="290" y1="' + (110 - (100000 - mn) / (mx - mn || 1) * 100).toFixed(1) + '" y2="' + (110 - (100000 - mn) / (mx - mn || 1) * 100).toFixed(1) + '" stroke="var(--muted)" stroke-dasharray="3 4"/>'; }
  function simRender() {
    var box = $('#simBox'); if (sim.r >= 5) return simEnd();
    var y = YEARS[sim.r];
    box.innerHTML = '<p class="eyebrow">Year ' + (sim.r + 1) + ' of 5 · set your mix, then play the year</p><div class="scenario" style="margin:10px 0"><b>' + esc(y.t) + '</b><p class="small" style="margin-top:4px">' + esc(y.d) + '</p><p class="xs muted" style="margin-top:6px">Hypothetical year. Your mix is hidden from the outcome until you play.</p></div>' +
      '<div class="stackbar" id="sbar"></div><div class="legend" style="margin:8px 0">' + NAMES.map(function (n, i) { return '<span><i class="' + CLS[i] + '"></i>' + n + '</span>'; }).join('') + '</div>' +
      NAMES.map(function (n, i) { return '<div class="alloc"><label for="al' + i + '">' + n + '</label><input id="al' + i + '" type="range" min="0" max="100" step="5" value="' + sim.alloc[i] + '"><output id="ao' + i + '">' + sim.alloc[i] + '%</output></div>'; }).join('') +
      '<p id="allocMsg" class="small" aria-live="polite"></p><div class="row between wrapx" style="margin-top:10px"><span class="small muted">Tip: allocations must total 100%.</span><button class="btn" id="play">Play the year</button></div>';
    function upd(changed) {
      var vals = NAMES.map(function (_, i) { return +$('#al' + i).value; }), tot = vals.reduce(function (a, b) { return a + b; }, 0);
      vals.forEach(function (v, i) { $('#ao' + i).textContent = v + '%'; }); sim.alloc = vals;
      $('#sbar').innerHTML = vals.map(function (v, i) { return '<i class="' + CLS[i] + '" style="width:' + (tot ? v / tot * 100 : 0) + '%"></i>'; }).join('');
      var msg = $('#allocMsg'), warn = vals[0] > 70 ? 'Heads up: more than 70% in one asset is concentrated.' : (vals[1] + vals[2] + vals[3] > 0 ? '' : 'Heads up: 100% in shares has no cushion.');
      if (vals.some(function (v) { return v > 70; })) warn = 'Heads up: more than 70% in one asset is concentrated.';
      msg.className = 'small ' + (tot === 100 ? 'muted' : 'neg'); msg.textContent = tot === 100 ? warn : 'Total is ' + tot + '%. Adjust to reach 100%.';
      $('#play').disabled = tot !== 100;
    }
    $$('input[type=range]', box).forEach(function (r) { r.addEventListener('input', upd); }); upd();
    $('#play').addEventListener('click', function () {
      var btn = $('#play'); btn.innerHTML = '<span class="spinner"></span> Playing year…'; btn.disabled = true;
      setTimeout(function () {
        var ret = y.r.reduce(function (s, r, i) { return s + r * sim.alloc[i] / 100; }, 0), before = sim.v; sim.v = Math.round(sim.v * (1 + ret / 100));
        sim.hist.push(sim.v); sim.log.push({ alloc: sim.alloc.slice(), ret: ret }); sim.r++; simSide(); FS.addPoints(10, 'year completed');
        $('#simBox').innerHTML = '<p class="eyebrow">Year ' + sim.r + ' result (hypothetical)</p><h2 style="margin:6px 0">' + (ret >= 0 ? '<span class="pos">+' : '<span class="neg">') + ret.toFixed(1) + '%</span> <span class="muted small">' + FS.inr(before) + ' → ' + FS.inr(sim.v) + '</span></h2>' +
          '<div class="grid g4 keep2" style="margin:12px 0">' + NAMES.map(function (n, i) { var r = y.r[i]; return '<div class="card flat tight"><span class="small muted">' + n + '</span><br><b class="' + (r < 0 ? 'neg' : 'pos') + '">' + (r > 0 ? '+' : '') + r + '%</b></div>'; }).join('') + '</div>' +
          '<div class="explain"><b>What to learn:</b> ' + esc(y.lesson) + '</div><div class="row" style="justify-content:flex-end;margin-top:14px"><button class="btn" id="simNext">' + (sim.r >= 5 ? 'See review' : 'Adjust & continue →') + '</button></div>';
        $('#simNext').addEventListener('click', simRender);
      }, FS.reduce ? 100 : 900);
    });
  }
  function simEnd() {
    var drop = sim.log[1] ? sim.log[1].ret : 0, eq1 = sim.log[1].alloc[0], eq0 = sim.log[0].alloc[0], eq2 = sim.log[2].alloc[0], panic = eq2 < eq1 - 15, eqMax = Math.max.apply(null, sim.log.map(function (l) { return l.alloc[0]; }));
    var worst = Math.min.apply(null, sim.log.map(function (l) { return l.ret; })), gain = sim.v - 100000;
    var notes = []; notes.push(panic ? 'After the Year 2 correction you cut shares from ' + eq1 + '% to ' + eq2 + '%. Many real investors do this, and it can lock in losses before a recovery. Having a plan in advance helps.' : 'You kept your mix steady through the Year 2 correction. Staying with a plan is hard and valuable.');
    notes.push(eqMax > 70 ? 'You went above 70% in shares at some point. Your worst year was ' + worst.toFixed(1) + '%. Ask: could I live with that loss in real life?' : 'Your worst year was ' + worst.toFixed(1) + '%. A spread across assets kept dips moderate.');
    notes.push('Remember: these were made-up years. Real markets differ, and past results never guarantee future ones.');
    FS.unlockBadge('steady_hands', 'Steady Hands'); FS.addPoints(30, 'simulation complete');
    $('#simBox').innerHTML = '<span class="sim-tag">Simulation review</span><h2 style="margin:10px 0">Your practice portfolio ended at ' + FS.inr(sim.v) + '</h2><p class="muted">That is ' + (gain >= 0 ? '+' : '−') + FS.inr(Math.abs(gain)) + ' of virtual money. The number matters less than what you noticed.</p><div class="stack" style="margin-top:14px">' + notes.map(function (n) { return '<div class="explain">' + esc(n) + '</div>'; }).join('') + '</div><div class="row wrapx" style="margin-top:16px"><button class="btn" id="simAgain">Try again with a new plan</button><a class="btn ghost" href="financial-journey.html#independence">See real planning tools →</a></div>';
    $('#simAgain').addEventListener('click', simStart);
  }

  /* ============ H. KNOWLEDGE CARDS ============ */
  var CARDS = [
    { c: 'Growth', t: 'The magic of compounding', b: 'Returns earn their own returns. ₹1,000 growing 10% a year becomes about ₹2,594 after 10 years, but about ₹6,727 after 20.', f: 'Starting 10 years earlier often matters more than investing more later.', q: 'What helps compounding most?', o: ['Time', 'Luck'], a: 0 },
    { c: 'Safety', t: 'Your emergency buffer', b: 'Keep 3 to 6 months of essential costs where you can reach them in a day or two. It stops a surprise from becoming a debt.', f: 'It is not an investment. Its job is to be there.', q: 'Emergency money should be…', o: ['Easy to access', 'Locked for 5 years'], a: 0 },
    { c: 'Credit', t: 'Credit utilisation', b: 'If your card limit is ₹1,00,000 and you use ₹30,000, utilisation is 30%. Lower is generally seen as healthier.', f: 'Paying before the statement date can lower the reported usage.', q: 'Using ₹60,000 of a ₹1,00,000 limit is…', o: ['60% utilisation', '6% utilisation'], a: 0 },
    { c: 'Maths', t: 'The Rule of 72', b: 'Divide 72 by the yearly return to estimate years to double. At 6% it takes about 12 years; at 12%, about 6.', f: 'It is an estimate and ignores tax and costs.', q: '72 ÷ 9% is about…', o: ['8 years', '18 years'], a: 0 },
    { c: 'Habits', t: '50 / 30 / 20 budget', b: 'Roughly half of take-home pay for needs, 30% for wants, 20% for saving and extra debt repayment. Adjust it to fit your life.', f: 'A starting point, not a law.', q: 'Where does the 20% go?', o: ['Savings & debt', 'Fun money'], a: 0 },
    { c: 'Risk', t: 'Don\'t put all eggs in one basket', b: 'Spreading across shares, debt, gold and cash means one bad asset hurts less. It lowers concentration risk, not all risk.', f: 'Diversification can\'t guarantee against loss.', q: 'Diversification reduces…', o: ['Concentration risk', 'All risk'], a: 0 },
    { c: 'Inflation', t: 'The silent cost', b: 'At 6% inflation, ₹100 of groceries today costs about ₹179 in 10 years. Your savings need to grow faster than that.', f: 'Cash in a drawer loses purchasing power every year.', q: 'Rising prices make money…', o: ['Buy less', 'Buy more'], a: 0 },
    { c: 'Protection', t: 'Term vs. investment plans', b: 'Term insurance is pure cover at a low cost. Mixing insurance and investment often means paying more for both. Compare before buying.', f: 'Match cover to dependants and debts, not to a sales pitch.', q: 'Pure protection is…', o: ['Term insurance', 'A savings plan'], a: 0 }
  ];
  var K = { i: 0, learned: store.get('kDay', '') === today() ? store.get('kCount', 0) : 0, seen: {}, answered: {} };
  function kRender() {
    var st = $('#kStage'); st.innerHTML = '';
    for (var n = 2; n >= 0; n--) {
      var idx = K.i + n; if (idx >= CARDS.length) continue;
      var c = CARDS[idx], el = document.createElement('article'); el.className = 'kcard' + (n === 1 ? ' under1' : n === 2 ? ' under2' : '');
      el.innerHTML = '<span class="cat">' + esc(c.c) + ' · 1 min</span><h3>' + esc(c.t) + '</h3><p class="muted">' + esc(c.b) + '</p><div class="fact">💡 ' + esc(c.f) + '</div>' +
        (n === 0 ? '<p style="margin-top:12px"><b class="small">' + esc(c.q) + '</b></p><div class="mini">' + c.o.map(function (o, i) { return '<button class="opt" data-i="' + i + '">' + esc(o) + '</button>'; }).join('') + '</div>' : '');
      st.appendChild(el);
      if (n === 0) {
        $$('.opt', el).forEach(function (b) { b.addEventListener('click', function () { var ok = +b.dataset.i === c.a; $$('.opt', el).forEach(function (x, k) { x.disabled = true; if (k === c.a) x.classList.add('right'); }); if (!ok) b.classList.add('wrong'); learn(idx, ok); }); });
        drag(el);
      }
    }
    if (K.i >= CARDS.length) st.innerHTML = '<div class="empty" style="height:100%;display:grid;place-content:center"><span class="big">🎉</span><b>You\'ve seen every card today</b><p class="small">New cards tomorrow. Your cadence is safe.</p><button class="btn sm" id="kRestart" style="margin:12px auto 0">Review again</button></div>';
    var r = $('#kRestart'); if (r) r.addEventListener('click', function () { K.i = 0; kRender(); });
    $('#kDots').innerHTML = CARDS.map(function (_, i) { return '<i class="' + (K.seen[i] ? 'on' : '') + '"></i>'; }).join(''); $('#kDone').textContent = K.learned;
    $('#kPrev').disabled = K.i === 0; $('#kNext').disabled = K.i >= CARDS.length;
  }
  function learn(idx, ok) {
    if (K.seen[idx]) return; K.seen[idx] = true; K.answered[idx] = ok; K.learned = Math.min(5, K.learned + 1); store.set('kDay', today()); store.set('kCount', K.learned);
    FS.addPoints(ok ? 8 : 4, ok ? 'card learned' : 'card read'); $('#kDone').textContent = K.learned;
    if (K.learned === 5) { FS.confetti(); FS.toast('Daily knowledge goal reached!', '🎯'); FS.unlockBadge('curious_mind', 'Curious Mind'); }
    $('#kDots').innerHTML = CARDS.map(function (_, i) { return '<i class="' + (K.seen[i] ? 'on' : '') + '"></i>'; }).join('');
  }
  function kGo(d) { var top = $('#kStage .kcard:last-child'); if (d > 0 && K.i < CARDS.length) { if (top) { top.style.transform = 'translateX(120%) rotate(12deg)'; top.classList.add('gone'); } setTimeout(function () { K.i++; kRender(); }, 250); } else if (d < 0 && K.i > 0) { K.i--; kRender(); } }
  function drag(el) {
    var x0 = null, dx = 0;
    el.addEventListener('pointerdown', function (e) { if (e.target.closest('button')) return; x0 = e.clientX; el.setPointerCapture(e.pointerId); el.style.transition = 'none'; });
    el.addEventListener('pointermove', function (e) { if (x0 == null) return; dx = e.clientX - x0; el.style.transform = 'translateX(' + dx + 'px) rotate(' + dx / 20 + 'deg)'; });
    function end() { if (x0 == null) return; el.style.transition = ''; var d = dx; x0 = null; dx = 0; if (Math.abs(d) > 90) { if (d < 0) kGo(1); else { el.style.transform = ''; kGo(-1); } } else el.style.transform = ''; }
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
  }

  /* ---- boot ---- */
  drawWheel(); renderSpin(); renderQuizHome(); renderP(); simStart(); kRender();
  $('#spinBtn').addEventListener('click', spin);
  $('#spinReset').addEventListener('click', function () { store.set('spinDay', ''); renderSpin(); FS.toast('Prototype day reset: spin again', '🌅'); });
  $('#dailyBtn').addEventListener('click', function () { startQuiz('Daily challenge', dailyMix()); });
  $('#kNext').addEventListener('click', function () { kGo(1); }); $('#kPrev').addEventListener('click', function () { kGo(-1); });
  $('#kStage').addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') kGo(1); if (e.key === 'ArrowLeft') kGo(-1); });
  FS.tabs($('#panels').parentNode, function (id) { if (id !== 'quiz') clearInterval(tmr); });
})();
