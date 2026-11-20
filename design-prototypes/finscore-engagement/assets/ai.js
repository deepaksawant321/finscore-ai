/* ai-futuristic.html behaviour. The "AI" is scripted: no model, no network. Dummy data. */
(function () {
  'use strict';
  var FS = window.FS, $ = FS.$, $$ = FS.$$, esc = FS.esc;
  var PILLARS = [['Safety', 62, '#2dd4c4'], ['Debt', 78, '#a5a1ff'], ['Protection', 45, '#f5b648'], ['Growth', 70, '#ff7a9c']];
  var PLANS = [
    [{ id: 'a1', t: 'Top up your emergency fund by ₹6,000', time: '3 min', fx: 'Safety +4', pillar: 0, why: 'Your fund covers 2.9 months of essentials. 3 months is the common first milestone, and you are ₹6,000 short.', facts: ['Emergency fund ₹1,74,000 · you entered', 'Essentials ₹60,000/mo · from your budget', 'Confidence: High'] },
     { id: 'a2', t: 'Review your term insurance cover', time: '5 min', fx: 'Protection +6', pillar: 2, why: 'Protection is your lowest pillar (45). A review shows if cover matches your dependants and loans.', facts: ['No policy on file · Money Map answer', 'Dependants: 2 · profile', 'Confidence: Medium'] },
     { id: 'a3', t: 'Pay ₹2,000 extra on your personal loan', time: '2 min', fx: 'Debt +2', pillar: 1, why: 'At 14% this loan is your costliest debt. Extra payments reduce interest over time.', facts: ['Loan ₹3,00,000 at 14% · you entered', 'Debt ratio 28% · calculated by the engine', 'Confidence: High'] }],
    [{ id: 'b1', t: 'Set a salary-day auto-save of ₹5,000', time: '4 min', fx: 'Safety +3', pillar: 0, why: 'Paying yourself first turns saving into a default. It is the habit most linked with hitting goals.', facts: ['Salary credited on the 1st · profile', 'Surplus ≈ ₹14,000/mo · engine', 'Confidence: Medium'] },
     { id: 'b2', t: 'Check which SIP matches your Japan trip goal', time: '5 min', fx: 'Growth +3', pillar: 3, why: 'A 14-month goal is short. Lower-volatility options usually fit better than shares. Educational view only.', facts: ['Goal: ₹2,00,000 by Jan 2028 · goals', 'Horizon 14 months · calculated', 'Confidence: Medium'] },
     { id: 'b3', t: 'Read: why 30% credit utilisation matters', time: '1 min', fx: 'Debt +1', pillar: 1, why: 'Your card utilisation was 41% last cycle. Lower usage is generally viewed as healthier.', facts: ['Card limit ₹1,00,000 · you entered', 'Utilisation 41% · engine', 'Confidence: High'] }]
  ];
  var pi = 0, st = {}, scoreBonus = 0;
  var MSG = 'Good morning Aarav. I looked at your goals, buffer and loan and picked three small actions, about ten minutes in total. Each one shows why I chose it.';
  function typeIt() { var el = $('#typed'), i = 0; el.classList.remove('fin'); el.textContent = ''; if (FS.reduce) { el.textContent = MSG; el.classList.add('fin'); return; } var t = setInterval(function () { el.textContent = MSG.slice(0, ++i); if (i >= MSG.length) { clearInterval(t); el.classList.add('fin'); } }, 22); }

  function drawOrbit() {
    var s = '<defs><radialGradient id="cg"><stop offset="0" stop-color="#4f46e5" stop-opacity=".55"/><stop offset="1" stop-color="#4f46e5" stop-opacity="0"/></radialGradient></defs><circle r="60" fill="url(#cg)"/>';
    s += '<circle r="70" fill="none" stroke="var(--line)" stroke-dasharray="2 6"/><circle r="118" fill="none" stroke="var(--line)" stroke-dasharray="2 6"/>';
    s += '<g class="spin1">' + PILLARS.slice(0, 2).map(function (p, i) { var a = i * Math.PI, r = 70, x = r * Math.cos(a), y = r * Math.sin(a), rad = 8 + p[1] / 12; return '<g transform="translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ')"><circle r="' + rad.toFixed(1) + '" fill="' + p[2] + '" opacity=".9"/><title>' + p[0] + ' ' + p[1] + '</title></g>'; }).join('') + '</g>';
    s += '<g class="spin2">' + PILLARS.slice(2).map(function (p, i) { var a = i * Math.PI + 1, r = 118, x = r * Math.cos(a), y = r * Math.sin(a), rad = 8 + p[1] / 12; return '<g transform="translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ')"><circle r="' + rad.toFixed(1) + '" fill="' + p[2] + '" opacity=".9"/><title>' + p[0] + ' ' + p[1] + '</title></g>'; }).join('') + '</g>';
    $('#orbit').innerHTML = s;
    $('#orbLegend').innerHTML = PILLARS.map(function (p) { return '<span><i style="background:' + p[2] + '"></i>' + p[0] + ' <b>' + p[1] + '</b></span>'; }).join('');
  }

  function renderPlan() {
    var plan = PLANS[pi]; $('#planTotal').textContent = plan.length;
    $('#plan').innerHTML = plan.map(function (a) {
      var s = st[a.id] || '';
      return '<article class="acard ' + s + '" data-id="' + a.id + '"><div class="row between wrapx"><b style="font-size:17px">' + esc(a.t) + '</b><span class="badge ai">AI suggested</span></div><div class="meta"><span class="badge">⏱ ' + a.time + '</span><span class="badge gold">' + a.fx + ' (estimate)</span></div><button class="btn ghost sm" data-w="' + a.id + '" aria-expanded="false">Why this?</button><div class="why-box" hidden></div>' +
        (s ? '<p class="small" style="margin-top:10px"><b>' + ({ done: '✓ Done', snoozed: '⏰ Snoozed to tomorrow', skipped: 'Skipped, I won\'t suggest this again soon' }[s]) + '</b></p>' : '<div class="acts"><button class="btn sm" data-a="done" data-id="' + a.id + '">Accept &amp; do it</button><button class="btn ghost sm" data-a="snoozed" data-id="' + a.id + '">Snooze</button><button class="btn ghost sm" data-a="skipped" data-id="' + a.id + '">Not for me</button></div>') + '</article>';
    }).join('');
    $$('#plan [data-w]').forEach(function (b) { b.addEventListener('click', function () { var a = plan.filter(function (x) { return x.id === b.dataset.w; })[0], box = b.nextElementSibling, open = box.hidden; box.hidden = !open; b.setAttribute('aria-expanded', open); b.textContent = open ? 'Hide reasoning' : 'Why this?'; if (open) box.innerHTML = '<b>Why I suggested this</b><p style="margin:4px 0">' + esc(a.why) + '</p><b class="small">Grounded on</b><br>' + a.facts.map(function (f) { return '<span class="gchip">' + esc(f) + '</span>'; }).join('') + '<p class="xs muted" style="margin-top:8px">Numbers come from the Finscore engine. This is educational, not advice.</p>'; }); });
    $$('#plan [data-a]').forEach(function (b) { b.addEventListener('click', function () { act(b.dataset.id, b.dataset.a); }); });
    progress();
  }
  function act(id, a) {
    st[id] = a; var plan = PLANS[pi], item = plan.filter(function (x) { return x.id === id; })[0];
    if (a === 'done') { FS.addPoints(15, 'plan action'); FS.confetti(); PILLARS[item.pillar][1] = Math.min(100, PILLARS[item.pillar][1] + 3); scoreBonus += 3; $('#coreScore').textContent = 648 + scoreBonus; FS.toast('Preview only: score effect shown is an estimate', 'ℹ️'); drawOrbit(); }
    renderPlan(); if (plan.every(function (x) { return st[x.id] === 'done'; })) { FS.unlockBadge('plan_pro', 'Plan Pro'); FS.toast('Full plan completed!', '🎉'); }
  }
  function progress() { var plan = PLANS[pi], n = plan.filter(function (x) { return st[x.id] === 'done'; }).length; $('#planDone').textContent = n; $('#planBar').style.width = Math.round(n / plan.length * 100) + '%'; $('#planMeta').textContent = 'Plan ' + (pi + 1) + ' · refreshed just now'; }
  $('#regen').addEventListener('click', function () {
    var b = $('#regen'); b.disabled = true; b.innerHTML = '<span class="spinner"></span> Thinking…'; $('#plan').innerHTML = '<div class="skeleton" style="height:120px"></div><div class="skeleton" style="height:120px"></div><div class="skeleton" style="height:120px"></div>';
    setTimeout(function () { pi = (pi + 1) % PLANS.length; PLANS[pi].forEach(function (x) { delete st[x.id]; }); renderPlan(); b.disabled = false; b.textContent = '✨ New plan'; FS.toast('New plan ready', '✨'); typeIt(); }, FS.reduce ? 100 : 1500);
  });

  var TL = [['Week 1', 'Close the ₹6,000 buffer gap'], ['Week 2', 'Review insurance cover'], ['Week 3', 'Set up salary-day auto-save'], ['Week 4', 'Monthly check-up and Wrapped']];
  $('#timeline').innerHTML = TL.map(function (t, i) { return '<li class="' + (i === 0 ? 'now' : '') + '"><span class="wk">' + t[0] + '</span><span>' + t[1] + '</span></li>'; }).join('');

  var HAB = [['Weekly 5-minute money check', 'Every Sunday'], ['Round up spends to save', 'Daily, simulated'], ['One lesson a day', 'Knowledge Cards']], adopted = {};
  function renderHabits() {
    $('#habits').innerHTML = HAB.map(function (h, i) { var a = adopted[i]; return '<div class="habit"><div><b class="small">' + h[0] + '</b><br><span class="xs muted">' + h[1] + '</span>' + (a ? '<div class="hd">' + [0, 1, 2, 3, 4, 5, 6].map(function (d) { return '<i data-h="' + i + '" data-d="' + d + '" class="' + (a[d] ? 'on' : '') + '" title="Day ' + (d + 1) + '"></i>'; }).join('') + '</div>' : '') + '</div><button class="btn sm ' + (a ? 'ghost' : '') + '" data-h="' + i + '">' + (a ? 'Added ✓' : 'Adopt') + '</button></div>'; }).join('');
    $$('#habits button').forEach(function (b) { b.addEventListener('click', function () { var i = +b.dataset.h; if (adopted[i]) return; adopted[i] = [0, 0, 0, 0, 0, 0, 0]; FS.toast('Habit added: ' + HAB[i][0], '🌱'); renderHabits(); }); });
    $$('#habits i[data-h]').forEach(function (c) { c.addEventListener('click', function () { var h = +c.dataset.h, d = +c.dataset.d; adopted[h][d] = adopted[h][d] ? 0 : 1; if (adopted[h][d]) FS.addPoints(3, 'habit check-in'); renderHabits(); }); });
  }

  var ANS = [
    [/emergency|buffer/i, 'Your emergency fund is about 2.9 months of essentials. The common first target is 3 months, which is ₹6,000 away. Check the Goals page to see a plan. (Calculated by the engine, explained by me.)'],
    [/loan|emi|debt/i, 'Your personal loan is ₹3,00,000 at 14%. Paying extra reduces interest. Try the sliders in Independence to see how many months you could save.'],
    [/score|finscore/i, 'Your demo Finscore is 648 (Accumulation). It is built from your pillars: Safety, Debt, Protection and Growth. Points and badges never change it.'],
    [/tax/i, 'A good rule: don\'t buy a product only to save tax. Check goal fit and lock-in first. For tax advice please consult a qualified professional.'],
    [/sip|invest|mutual|fund/i, 'I can explain how SIPs work and show hypothetical scenarios in the Investing Sim. I can\'t say which fund to buy; that needs a regulated adviser.']
  ], REG = /(which|what).*(stock|share|crypto|fund|coin).*(buy|best|pick)|should i (buy|sell)|guaranteed|double my money|hot tip/i;
  function say(t, cls) { var m = document.createElement('div'); m.className = 'msg ' + cls; m.textContent = t; $('#msgs').appendChild(m); $('#msgs').scrollTop = 1e6; return m; }
  function ask(q) {
    q = q.trim(); if (!q) return; say(q, 'me'); var th = document.createElement('div'); th.className = 'msg bot think'; th.innerHTML = '<i></i><i></i><i></i>'; $('#msgs').appendChild(th); $('#msgs').scrollTop = 1e6;
    setTimeout(function () {
      th.remove(); var r; if (REG.test(q)) r = 'I can\'t recommend specific investments or promise returns; that is regulated advice. I can explain the concept, or I can connect you to a human adviser. (Prototype: no real hand-off.)'; else { var hit = ANS.filter(function (a) { return a[0].test(q); })[0]; r = hit ? hit[1] : 'I\'m not sure about that yet. Try asking about your emergency fund, loan, score, SIPs or tax. In the real product I would ground answers in your data.'; }
      say(r, 'bot');
    }, FS.reduce ? 100 : 900);
  }
  $('#chips').innerHTML = ['How is my emergency fund?', 'Should I prepay my loan?', 'Which stock should I buy?'].map(function (c) { return '<button class="sugg" type="button">' + c + '</button>'; }).join('');
  $$('.sugg').forEach(function (b) { b.addEventListener('click', function () { ask(b.textContent); }); });
  $('#askForm').addEventListener('submit', function (e) { e.preventDefault(); var i = $('#ask'); ask(i.value); i.value = ''; });
  drawOrbit(); renderPlan(); renderHabits(); typeIt();
})();
