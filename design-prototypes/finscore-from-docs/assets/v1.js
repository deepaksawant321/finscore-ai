/* Screens 1-3 and Memory: Ask FinScore, Conversation (adaptive interview), FinScore Home (first reveal), Profile & Memory. */
(function (root) {
  'use strict';
  var A = root.FSApp, E = root.FSEngine, M = root.FSModel, S = root.FSStore, esc = A.esc, $ = A.$, $$ = A.$$;
  var st = function () { return S.state; };

  /* ---- shared helpers used by several screens ---- */
  A.topActions = function (n) { return M.proposeActions(S.values(), st().opts, st().intents, S.evaluate().confidence).slice(0, n || 5); };
  A.applyActions = function (facts, acts) { var f = {}; Object.keys(facts).forEach(function (k) { f[k] = facts[k]; }); acts.forEach(function (a) { Object.keys(a.to).forEach(function (k) { f[k] = a.to[k]; }); }); return f; };
  A.afterSave = function (reason) {
    var before = st().scores[st().scores.length - 1], v = S.snapshot(reason); S.touchWeek();
    if (v && before && v !== before) { var d = Math.round((v.total - before.total) * 10) / 10; if (Math.abs(d) >= 0.1) A.toast('Score ' + (d > 0 ? '+' : '') + d + ' (' + Math.round(v.total) + '). See why.', d > 0 ? '▲' : '▼'); }
    var earned = S.badges().filter(function (b) { return b.earned && !st().seen['b_' + b.id]; }); earned.forEach(function (b) { st().seen['b_' + b.id] = 1; A.toast('Badge: ' + b.name, '🏅'); }); S.save(); return v;
  };
  A.saveFact = function (key, value, reason) {
    var prev = st().facts[key] ? st().facts[key].value : null, r = S.setFact(key, value, 'USER_STATED', reason); var xp = S.award('confirm_fact', key); A.afterSave(reason || ('You confirmed ' + M.FDEF[key].label));
    if (xp) A.toast('+' + xp.xp + ' XP · ' + xp.label, '✦'); return { prev: prev, changed: r.changed };
  };
  var EX = [['Can I retire by 50?', 'Retirement'], ['My salary is high but I save nothing.', 'Cash flow'], ['How do I reduce my tax?', 'Tax'], ['Should I buy a ₹1.5 crore house?', 'Major purchase'], ['I have 4 loans and I am stressed.', 'Debt'], ['I have SIPs but don\'t know if they are enough.', 'Investment']];

  /* ---------------- 1. Ask FinScore ---------------- */
  A.register('ask', {
    render: function () {
      var s = st();
      return '<div class="stack-l"><section class="card hero" style="padding:32px"><p class="xs" style="letter-spacing:.1em;text-transform:uppercase;color:#a9bdcd">Start with your problem, not a questionnaire</p><h2 style="font-size:clamp(26px,4vw,38px);margin:8px 0 16px">What is the one money problem you want to solve right now?</h2>' +
        '<form id="askF" class="stack"><label class="sr" for="prob">Your money problem</label><textarea id="prob" class="inp sq" rows="3" style="width:100%;border-radius:12px;color:#0b1b2b;background:#fff" placeholder="For example: I earn well but never seem to save, and I want to retire early.">' + esc(s.problem || '') + '</textarea>' +
        '<div class="row wrap"><button class="btn" type="submit" style="background:#2dd4c4">Ask FinScore</button><button class="btn sec" type="button" id="full" style="color:#fff;border-color:#47627a">Do the 5-minute full assessment instead</button><button class="btn sec" type="button" id="demo" style="color:#fff;border-color:#47627a">Load a sample profile</button></div></form></section>' +
        '<section><h3 style="margin-bottom:10px">Or start from one of these</h3><div class="row wrap">' + EX.map(function (x, i) { return '<button class="chip" data-ex="' + i + '">' + esc(x[0]) + '</button>'; }).join('') + '</div></section>' +
        (s.problem ? '<section class="card t row between wrap"><div><b>Your current question</b><p class="small muted">' + esc(s.problem) + '</p><p class="xs muted">I think this is about: ' + esc(s.intents.join(', ')) + '</p></div><a class="btn sm" href="#/chat">Continue the conversation</a></section>' : '') +
        '<section class="grid g3"><div class="card t"><b>🧠 The AI understands</b><p class="small muted">It reads your words and asks one question at a time, always saying why.</p></div><div class="card t"><b>🧮 Engines calculate</b><p class="small muted">Every number comes from deterministic rules you can inspect, never from the AI.</p></div><div class="card t"><b>🔒 You own your data</b><p class="small muted">Nothing is saved until you confirm it, and you can correct anything.</p></div></section></div>';
    },
    bind: function (m) {
      function begin(text, mode) { if (!text.trim() && mode !== 'full') { A.toast('Tell me a little about your problem first.', 'ℹ️'); return; } st().mode = mode || 'problem'; A.startConversation(text.trim() || 'I want a complete picture of my finances.'); A.go('#/chat'); }
      $('#askF', m).addEventListener('submit', function (e) { e.preventDefault(); begin($('#prob', m).value); });
      $('#full', m).addEventListener('click', function () { begin($('#prob', m).value || 'I want a complete picture of my finances.', 'full'); });
      $('#demo', m).addEventListener('click', function () { S.loadDemo(); A.toast('Sample profile loaded (dummy data)', '🧪'); A.go('#/home'); });
      $$('[data-ex]', m).forEach(function (b) { b.addEventListener('click', function () { $('#prob', m).value = EX[+b.dataset.ex][0]; $('#prob', m).focus(); }); });
    }
  });

  /* ---------------- 2. Conversation ---------------- */
  var RISKQ = [['If your investments fell 20% in a month, you would…', ['Sell everything at once', 'Sell some to limit the loss', 'Do nothing, but worry', 'Hold calmly', 'Buy more']], ['When will you need most of this money?', ['In under a year', 'In 1 to 3 years', 'In 3 to 5 years', 'In 5 to 10 years', 'In more than 10 years']], ['Which range of yearly outcomes would you accept?', ['A steady 5%, no dips', 'Between 3% and 8%', 'Between 0% and 12%', 'Between -8% and 18%', 'Between -20% and 30%']], ['How experienced are you with investing?', ['None', 'A little', 'Some', 'Good', 'Very experienced']], ['How stable is your income?', ['Very unstable', 'Somewhat unstable', 'Fairly stable', 'Stable', 'Very stable']], ['How much of your income could you invest without strain?', ['Under 5%', '5 to 10%', '10 to 20%', '20 to 30%', 'More than 30%']], ['How do you usually react to a loss?', ['Very upset', 'Quite upset', 'Mixed', 'Calm', 'Take it in stride']]];
  function riskOptions(q) { var sc = E.rules.risk_profile.question_option_scores[String(q + 1)], texts = RISKQ[q][1]; return sc.map(function (level) { return texts[level - 1]; }); }
  function ai(text, extra) { var m = { who: 'ai', text: text, ts: S.now() }; if (extra) Object.keys(extra).forEach(function (k) { m[k] = extra[k]; }); st().chat.push(m); S.save(); }
  A.startConversation = function (text) {
    var s = st(); s.problem = text; s.intents = M.classify(text); s.chat = [{ who: 'me', text: text, ts: S.now() }]; s.pendingKey = null; s.skipped = []; s.proposals = [];
    var props = M.extract(text); s.proposals = props.filter(function (p) { return M.FDEF[p.key]; });
    ai('I heard: "' + text + '". It sounds like this is about ' + s.intents.join(' and ') + '. I will ask one question at a time and tell you why each one matters. Nothing is saved until you confirm it.');
    if (s.proposals.length) ai('I already picked up ' + s.proposals.length + ' detail' + (s.proposals.length > 1 ? 's' : '') + ' from what you wrote. Please confirm them on the right, or tell me if I got one wrong.');
    S.save(); A.askNext();
  };
  A.askNext = function () {
    var s = st(), vals = S.values(), n = Object.keys(s.facts).length, res = S.evaluate();
    if (res.enough && !s.seen.firstReading) { s.seen.firstReading = 1; ai('I can now give you a first reading: ' + Math.round(res.total) + ' out of 900, an early estimate with ' + Math.round(res.confidence * 100) + '% of your score measured. Open Home to see it explained. I will keep going so the estimate gets firmer.', { link: ['#/home', 'See my first reading'] }); }
    var c = M.nextQuestions(vals, s.intents, s.mode, s.skipped);
    var relevantLeft = c.filter(function (x) { return x.gain > 0; });
    if (!c.length || (s.mode === 'problem' && res.enough && (!relevantLeft.length || relevantLeft[0].gain < 2 && n >= 8))) { s.pendingKey = null; if (!s.seen.wrapped) { s.seen.wrapped = 1; ai('That covers what I need for your question. Use "Wrap up this session" for a summary, or switch to Full FinScore Mode to complete the rest of your picture.'); } S.save(); return; }
    var top = c[0], d = M.FDEF[top.key]; s.pendingKey = top.key;
    ai(d.ask, { key: top.key, chips: d.chips, why: 'Why I ask: ' + d.why + ' (' + top.reasons[0] + ')' }); S.save();
  };
  function reflectAnswer(key, v, prev) { var d = M.FDEF[key]; return 'Got it: ' + d.label.toLowerCase() + ' is ' + A.fmtFact(key, v) + (prev != null && prev !== v ? ' (was ' + A.fmtFact(key, prev) + ')' : '') + '.'; }
  function handleAnswer(text) {
    var s = st(), key = s.pendingKey; s.chat.push({ who: 'me', text: text, ts: S.now() });
    if (/^\s*(skip|not sure|i don'?t know|dont know|later)\s*$/i.test(text)) { if (key) s.skipped.push(key); ai('No problem, we can come back to that. I will leave it out and will not guess.'); S.save(); A.askNext(); return; }
    var v = key ? M.answerFor(key, text) : null;
    if (v !== null) { var r = A.saveFact(key, v); ai(reflectAnswer(key, v, r.prev)); }
    var more = M.extract(text).filter(function (p) { return M.FDEF[p.key] && p.key !== key && !s.proposals.some(function (q) { return q.key === p.key; }); });
    if (more.length) { s.proposals = s.proposals.concat(more); ai('You also mentioned ' + more.length + ' other detail' + (more.length > 1 ? 's' : '') + '. Please confirm on the right.'); }
    if (v === null && !more.length) { ai('I could not read a value from that. Try an amount like "1.2 lakh" or "45,000", pick a button, or say "skip".'); S.save(); return; }
    S.save(); A.askNext();
  }
  A.confirmProposal = function (p) { var r = A.saveFact(p.key, p.value, 'Confirmed from your own words'); st().proposals = st().proposals.filter(function (x) { return x.key !== p.key; }); if (st().pendingKey === p.key) st().pendingKey = null; ai(reflectAnswer(p.key, p.value, r.prev)); S.save(); };
  function chatHTML() {
    var s = st(); return s.chat.map(function (m, i) {
      var last = i === s.chat.length - 1;
      return '<div class="msg ' + m.who + '">' + esc(m.text) + (m.why ? '<div class="why">' + esc(m.why) + '</div>' : '') + (m.link ? '<div style="margin-top:8px"><a class="btn sm" href="' + m.link[0] + '">' + esc(m.link[1]) + '</a></div>' : '') + '</div>' + (last && m.chips && s.pendingKey === m.key ? '<div class="qr">' + m.chips.map(function (c, k) { return '<button class="chip" data-chip="' + k + '">' + esc(c[0]) + '</button>'; }).join('') + '<button class="chip" data-skip="1">Skip</button></div>' : '');
    }).join('');
  }
  A.register('chat', {
    render: function () {
      var s = st(); if (!s.problem && !s.chat.length) return '<div class="empty"><b>No conversation yet</b>Start with your money problem and I will take it from there.<div style="margin-top:12px"><a class="btn" href="#/ask">Ask FinScore</a></div></div>';
      var res = S.evaluate(), cov = M.coverage(S.values(), S.meta(), S.now()), cur = s.pendingKey ? M.FDEF[s.pendingKey] : null;
      var props = s.proposals.map(function (p, i) { var d = M.FDEF[p.key], ex = s.facts[p.key]; return '<div class="fchip prop"><div class="grow"><b>' + esc(d.label) + ': ' + esc(A.fmtFact(p.key, p.value)) + '</b>' + (ex && ex.value !== p.value ? ' <span class="xs muted">(you said ' + esc(A.fmtFact(p.key, ex.value)) + ' before)</span>' : '') + '<div class="xs muted">from "' + esc(p.evidence) + '" · ' + Math.round(p.confidence * 100) + '% sure</div></div><button class="btn sm" data-ok="' + i + '" aria-label="Confirm ' + esc(d.label) + '">✓</button><button class="btn sm sec" data-no="' + i + '" aria-label="Dismiss">✕</button></div>'; }).join('');
      var saved = Object.keys(s.facts).slice(-6).reverse().map(function (k) { return '<div class="fchip"><div class="grow"><b>' + esc(M.FDEF[k].label) + ': ' + esc(A.fmtFact(k, s.facts[k].value)) + '</b></div>' + A.src(s.facts[k].source) + '</div>'; }).join('');
      return '<div class="split"><section class="card"><div class="row between wrap" style="margin-bottom:8px"><div><h3 style="margin:0">Conversation</h3><p class="xs muted">I think this is about: ' + esc(s.intents.join(', ')) + '</p></div><span class="badge ai">AI assistant · answers come from the rules engine</span></div><div class="chatbox"><div class="msgs" id="msgs" aria-live="polite">' + chatHTML() + '</div><form class="composer" id="cf"><label class="sr" for="ci">Your reply</label><input id="ci" autocomplete="off" placeholder="' + esc(cur ? 'Type an answer, e.g. ' + (cur.unit === 'inr' ? '1.2 lakh' : cur.unit === 'flag' ? 'yes' : '32') : 'Type anything about your finances…') + '"><button class="btn" type="submit">Send</button></form></div></section>' +
        '<aside class="stack"><section class="card t"><div class="row between"><b>Captured facts</b><span class="badge">' + Object.keys(s.facts).length + ' saved</span></div><div class="stack" style="margin-top:8px">' + (props ? '<p class="xs muted">Waiting for your OK</p>' + props + '<button class="btn sm sec" id="okAll">Confirm all</button>' : '') + (saved || '<p class="small muted">Nothing saved yet. Facts appear here with where they came from.</p>') + '</div></section>' +
        '<section class="card t"><div class="row between"><b>Coverage map</b><span class="xs muted">' + Math.round(res.confidence * 100) + '% measured</span></div><div class="bar" style="margin:8px 0"><i style="width:' + Math.round(res.confidence * 100) + '%"></i></div><div class="cov">' + cov.map(function (c) { return '<div class="' + c.state.split(' ')[0] + '" title="' + esc(c.name + ': ' + c.state) + '"><span>' + esc(c.name) + '</span><b>' + (c.state === 'Verified' ? '✓' : c.state === 'Unknown' ? '·' : c.state === 'Stale' ? '⏳' : '◐') + '</b></div>'; }).join('') + '</div><p class="xs muted" style="margin-top:6px">Unknown · Partially known · Verified · Stale</p></section>' +
        '<section class="card t stack"><b>Next steps</b><div class="row wrap"><button class="btn sm sec" id="risk">' + (s.riskAnswers ? 'Redo risk questions' : 'Answer 7 risk questions') + '</button><button class="btn sm sec" id="wrap">Wrap up this session</button><a class="btn sm" href="#/home">See Home</a></div><p class="xs muted">Mode: ' + (s.mode === 'problem' ? 'Problem Mode (I focus on your question)' : 'Full FinScore Mode (I complete the picture)') + '. Switch at the top.</p></section></aside></div>';
    },
    bind: function (m) {
      var s = st(), box = $('#msgs', m); if (box) box.scrollTop = 1e6; var f = $('#cf', m); if (!f) return;
      f.addEventListener('submit', function (e) { e.preventDefault(); var i = $('#ci', m), t = i.value.trim(); if (!t) return; i.value = ''; thinking(function () { handleAnswer(t); }); });
      $$('[data-chip]', m).forEach(function (b) { b.addEventListener('click', function () { var last = s.chat[s.chat.length - 1], c = last.chips[+b.dataset.chip]; s.chat.push({ who: 'me', text: c[0], ts: S.now() }); var r = A.saveFact(last.key, c[1]); ai(reflectAnswer(last.key, c[1], r.prev)); S.save(); thinking(function () { A.askNext(); }); }); });
      $$('[data-skip]', m).forEach(function (b) { b.addEventListener('click', function () { thinking(function () { handleAnswer('skip'); }); }); });
      $$('[data-ok]', m).forEach(function (b) { b.addEventListener('click', function () { A.confirmProposal(s.proposals[+b.dataset.ok]); A.askNext(); A.rerender(); }); });
      $$('[data-no]', m).forEach(function (b) { b.addEventListener('click', function () { s.proposals.splice(+b.dataset.no, 1); S.save(); A.rerender(); }); });
      var ok = $('#okAll', m); if (ok) ok.addEventListener('click', function () { s.proposals.slice().forEach(function (p) { A.confirmProposal(p); }); A.askNext(); A.rerender(); });
      $('#risk', m).addEventListener('click', riskModal); $('#wrap', m).addEventListener('click', wrapUp);
      function thinking(fn) { var d = document.createElement('div'); d.className = 'msg ai'; d.innerHTML = '<span class="spin"></span>'; box.appendChild(d); box.scrollTop = 1e6; setTimeout(function () { fn(); A.rerender(); var b2 = $('#msgs'); if (b2) b2.scrollTop = 1e6; var i = $('#ci'); if (i) i.focus(); }, root.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches ? 40 : 450); }
    }
  });
  function riskModal() {
    var h = '<p class="small muted">Seven quick questions. <span class="tag">Placeholder wording</span> The scoring table is from the rules spec; the approved questionnaire is still pending (D-B12).</p>' + RISKQ.map(function (q, i) { var o = riskOptions(i); return '<fieldset style="border:0;padding:0;margin:12px 0 0"><legend class="small"><b>' + (i + 1) + '. ' + esc(q[0]) + '</b></legend><select class="inp sq" data-q="' + i + '" style="width:100%;margin-top:4px"><option value="">Choose…</option>' + o.map(function (t, k) { return '<option value="' + k + '"' + (st().riskAnswers && st().riskAnswers[i] === k ? ' selected' : '') + '>' + esc(t) + '</option>'; }).join('') + '</select></fieldset>'; }).join('');
    A.modal({ title: 'Your risk profile', html: h, actions: [{ label: 'Cancel', cls: 'sec' }, { label: 'Save answers', fn: function (m) { var a = $$('select[data-q]', m).map(function (x) { return x.value === '' ? null : +x.value; }); if (a.some(function (x) { return x === null; })) { A.toast('Please answer all seven questions.', 'ℹ️'); return true; } st().riskAnswers = a; var p = E.riskProfile(a); S.save(); var xp = S.award('answer_risk'); A.afterSave('You answered the risk questions'); ai('Your risk answers suggest a ' + p.name.toLowerCase() + ' profile (score ' + p.total + ' of 35). I now use this instead of assuming Balanced.'); A.toast('Risk profile: ' + p.name.toLowerCase() + (xp ? ' · +' + xp.xp + ' XP' : ''), '🧭'); A.rerender(); } }] });
  }
  function wrapUp() {
    var s = st(), top = A.topActions(1)[0], goal = s.goals.length ? s.goals[s.goals.length - 1].name : null, c = M.nextQuestions(S.values(), s.intents, s.mode, s.skipped)[0];
    A.modal({ title: 'Session summary', html: '<div class="stack"><div><b>Decision</b><p class="small muted">' + (top ? 'The change with the biggest estimated effect on your score is: ' + esc(top.text) + '.' : 'Not enough information yet for a recommendation.') + '</p></div><div><b>Action</b><p class="small muted">' + (top ? 'Open the Action Plan to mark it done once you have actually done it.' : 'Keep answering a few more questions.') + '</p></div><div><b>Saved goal</b><p class="small muted">' + (goal ? esc(goal) : 'None yet. Goals are only created when you confirm them (Wealth Timeline).') + '</p></div><div><b>Next question</b><p class="small muted">' + (c ? esc(M.FDEF[c.key].ask) : 'Nothing pending.') + '</p></div></div>', actions: [{ label: 'Close', cls: 'sec' }, { label: 'Open Action Plan', fn: function () { A.go('#/actions'); } }] });
  }

  /* ---------------- 3. FinScore Home (first reveal) ---------------- */
  function strongestWeakest(res) { var sc = res.factors.filter(function (f) { return f.status === 'scored'; }).slice().sort(function (a, b) { return b.ratio - a.ratio; }); return { best: sc[0], worst: sc[sc.length - 1] }; }
  A.register('home', {
    render: function () {
      var s = st(), res = S.evaluate(); if (!res.scoredCount) return '<div class="empty"><b>No score yet</b>I only score what you tell me, so I need a few facts first.<div class="row wrap" style="margin-top:12px;justify-content:center"><a class="btn" href="#/ask">Start with your problem</a><button class="btn sec" id="demo2">Load a sample profile</button></div></div>';
      var v = S.values(), hist = s.scores, last = hist[hist.length - 1], prev = hist[hist.length - 2], trend = prev ? Math.round((last.total - prev.total) * 10) / 10 : null, sw = strongestWeakest(res), acts = A.topActions(5), top3 = acts.slice(0, 3);
      var after = top3.length ? E.score(A.applyActions(v, top3), s.opts) : null, tr = M.dna(v, ctxDNA()), traits = tr.filter(function (t) { return t.value; }).slice(0, 7), per = M.persona(tr);
      var stg = res.stage, ladder = '<div class="ladder" aria-label="Eight wealth stages">' + E.STAGES.map(function (x) { return '<i class="' + (stg && x.n < stg.n ? 'on' : stg && x.n === stg.n ? 'cur' : '') + '"></i>'; }).join('') + '</div>';
      var conf = Math.round(res.confidence * 100);
      return '<div class="stack-l"><section class="card hero"><div class="row wrap" style="align-items:flex-start;gap:24px"><div style="flex:0 0 300px;max-width:100%">' + A.gauge(res.total, { dark: true, showStage: res.enough }) + '</div><div class="grow stack" style="min-width:240px"><div class="row wrap"><span class="badge" style="background:#143a46;color:#7ff0e4">Current score</span><span class="badge" style="background:#26275f;color:#bdbaff">' + conf + '% measured</span>' + (trend !== null ? '<span class="badge" style="background:' + (trend >= 0 ? '#12392d' : '#41191c') + ';color:' + (trend >= 0 ? '#6ff0b5' : '#ff9a9e') + '">' + (trend > 0 ? '▲ +' : trend < 0 ? '▼ ' : '● ') + trend + ' vs last version</span>' : '<span class="badge" style="background:#26275f;color:#bdbaff">First version</span>') + (s.demo ? '<span class="badge demo">Demo data</span>' : '') + '</div>' +
        (res.enough ? '<div><p class="xs muted" style="color:#a9bdcd">Wealth stage (provisional)</p><h2 style="font-size:28px">' + stg.name + ' <span style="font-weight:500;font-size:18px;color:#a9bdcd">· ' + stg.nick + '</span></h2></div>' + ladder + '<p class="small" style="color:#cfe0ec">' + esc(res.message) + '</p>' : '<div class="card t" style="background:rgb(255 255 255/.08);border:0"><b>Early estimate</b><p class="small muted">Only ' + conf + '% of your score is measured, so I am not showing a stage yet. At 50% I will.</p></div>') +
        '<p class="xs" style="color:#a9bdcd">Score, confidence and trend are separate on purpose. Stage is band-only until the age × score matrix is approved.</p></div></div></section>' +
        '<section class="grid g4 k2"><div class="card t"><p class="xs muted">Where am I</p><div class="stat"><b>' + Math.round(res.total) + '</b><span>' + (stg ? stg.name : 'early estimate') + '</span></div></div><div class="card t"><p class="xs muted">What is good</p><b>' + esc(sw.best.name) + '</b><p class="xs muted">' + sw.best.fscore + '/10 · ' + esc(sw.best.bandLabel) + '</p></div><div class="card t"><p class="xs muted">What is weak</p><b>' + esc(sw.worst.name) + '</b><p class="xs muted">' + sw.worst.fscore + '/10 · ' + esc(sw.worst.bandLabel) + '</p></div><div class="card t"><p class="xs muted">What next</p><b>' + (acts[0] ? esc(acts[0].label) : 'Add more facts') + '</b><p class="xs muted">' + (acts[0] ? '+' + acts[0].delta + ' points (estimate)' : '') + '</p></div></section>' +
        '<section class="split"><div class="card stack"><h3>Why your score is ' + Math.round(res.total) + '</h3><p class="small muted">Every point traces to a rule. Open the full explanation to drill from factor to evidence to action.</p>' + res.factors.filter(function (f) { return f.status === 'scored'; }).slice().sort(function (a, b) { return Math.abs(b.contribution) - Math.abs(a.contribution); }).slice(0, 4).map(function (f) { return '<div class="row between small"><span>' + esc(f.name) + ' <span class="muted">(' + esc(f.bandLabel) + ')</span></span><b class="' + (f.contribution >= 0 ? '' : '') + '" style="color:' + (f.contribution >= 0 ? 'var(--pos)' : 'var(--neg)') + '">' + (f.contribution >= 0 ? '+' : '') + f.contribution.toFixed(1) + '</b></div>'; }).join('') + '<a class="btn sm sec" href="#/score" style="width:fit-content">Full explanation</a></div>' +
        '<div class="card stack"><h3>What your score could look like</h3><div class="row between"><span class="small">If you do nothing</span><b>' + Math.round(res.total) + '</b></div><p class="xs muted">No decay or growth model is approved yet, so I show it unchanged rather than invent a forecast.</p><div class="row between"><span class="small">If you complete your top ' + top3.length + ' actions</span><b>' + (after ? Math.round(after.total) : '-') + '</b></div><p class="xs muted">A scenario computed by the engine, not a prediction. <a href="#/actions">See the actions</a>.</p></div></section>' +
        '<section class="card"><div class="row between wrap"><h3 style="margin:0">Your Financial DNA <span class="tag pl">Placeholder rules</span></h3><a class="btn sm sec" href="#/dna">Open DNA & persona</a></div><p class="small muted" style="margin:6px 0 10px">Your behaviour suggests (not "you are"):</p><div class="row wrap">' + (traits.map(function (t) { return '<span class="badge ai">' + esc(t.dim) + ': ' + esc(t.value) + '</span>'; }).join('') || '<span class="muted small">Traits appear once there is evidence.</span>') + '</div>' + (per.primary ? '<p class="small" style="margin-top:10px"><b>Persona:</b> ' + esc(per.primary.id) + (per.modifier ? ' with a touch of ' + esc(per.modifier.id) : '') + '. ' + esc(per.primary.text) + '</p>' : '') + '</section>' +
        (res.assumptions.length ? '<details class="card t"><summary><b>Assumptions I made (' + res.assumptions.length + ')</b></summary><ul class="small muted">' + res.assumptions.map(function (a) { return '<li>' + esc(a) + '</li>'; }).join('') + '</ul></details>' : '') + '</div>';
    },
    bind: function (m) { var d = $('#demo2', m); if (d) d.addEventListener('click', function () { S.loadDemo(); A.go('#/home'); }); }
  });
  function ctxDNA() { var a = st().actions, sug = Object.keys(a.suggested).length; return { meta: S.meta(), now: S.now(), risk: S.riskInfo(), actions: { suggested: sug, done: Object.keys(a.done).length, snoozes: a.snoozes } }; }
  A.dnaCtx = ctxDNA;

  /* ---------------- Profile & Memory ---------------- */
  A.register('memory', {
    render: function () {
      var s = st(), groups = {}; M.FACTS.forEach(function (d) { (groups[d.group] = groups[d.group] || []).push(d); });
      return '<div class="ph"><h2>Profile & Financial Memory</h2><p>Everything I know about you, where it came from and when. You can correct or remove any fact. Facts are versioned, never silently overwritten.</p></div><div class="row wrap" style="margin-bottom:14px"><span class="badge">' + Object.keys(s.facts).length + ' of ' + M.FACTS.length + ' facts known</span><button class="btn sm sec" id="exp">Copy my data as JSON</button><button class="btn sm sec" id="rst">Erase everything</button></div><div class="stack-l">' + Object.keys(groups).map(function (g) {
        return '<section class="card"><h3>' + g + '</h3><div class="scroll-x"><table class="t"><thead><tr><th>Fact</th><th>Value</th><th>Source</th><th>Updated</th><th></th></tr></thead><tbody>' + groups[g].map(function (d) { var f = s.facts[d.key], stl = f && S.stale(d.key); return '<tr><td>' + esc(d.label) + (f && f.version > 1 ? ' <span class="xs muted">v' + f.version + '</span>' : '') + '</td><td class="num"><b>' + (f ? esc(A.fmtFact(d.key, f.value)) : '<span class="muted">not provided</span>') + '</b></td><td>' + (f ? A.src(stl ? 'STALE' : f.source) : '') + '</td><td class="small muted">' + (f ? A.ago(f.ts) : '') + '</td><td style="white-space:nowrap">' + (f ? '<button class="btn sm sec" data-ed="' + d.key + '">' + (stl ? 'Refresh' : 'Correct') + '</button> <button class="btn sm ghost" data-rm="' + d.key + '" aria-label="Remove ' + esc(d.label) + '">Remove</button>' : '<button class="btn sm sec" data-ed="' + d.key + '">Add</button>') + '</td></tr>'; }).join('') + '</tbody></table></div></section>';
      }).join('') + '<section class="card t small muted"><b>Consent and retention.</b> This prototype stores your answers only in this browser. In the product, sensitive data would be stored with explicit consent, a stated purpose and a retention period (decisions D-B16, D-B23 are pending).</section></div>';
    },
    bind: function (m) {
      $$('[data-ed]', m).forEach(function (b) { b.addEventListener('click', function () { editFact(b.dataset.ed); }); });
      $$('[data-rm]', m).forEach(function (b) { b.addEventListener('click', function () { S.removeFact(b.dataset.rm); A.afterSave('You removed ' + M.FDEF[b.dataset.rm].label); A.toast('Removed. I will not guess it.', '🗑'); A.rerender(); }); });
      $('#exp', m).addEventListener('click', function () { var j = JSON.stringify(S.values(), null, 2); try { navigator.clipboard.writeText(j).catch(function () { /* blocked */ }); } catch (e) { /* blocked */ } A.toast('Copied (if the browser allowed it)', '📋'); });
      $('#rst', m).addEventListener('click', function () { A.modal({ title: 'Erase everything?', html: '<p class="muted">This removes all facts, score history, XP and settings from this browser. It cannot be undone.</p>', actions: [{ label: 'Cancel', cls: 'sec' }, { label: 'Erase', cls: 'ai', fn: function () { S.reset(); A.toast('Erased', '🗑'); A.go('#/ask'); } }] }); });
    }
  });
  function editFact(key) {
    var d = M.FDEF[key], f = st().facts[key], stl = f && S.stale(key);
    A.modal({ title: (f ? (stl ? 'Refresh: ' : 'Correct: ') : 'Add: ') + d.label, html: '<p class="small muted">' + esc(d.ask) + '</p>' + (f ? '<p class="small">Currently <b>' + esc(A.fmtFact(key, f.value)) + '</b> (' + A.src(stl ? 'STALE' : f.source) + ', ' + A.ago(f.ts) + ')</p>' : '') + (f && f.history.length ? '<p class="xs muted">Earlier: ' + f.history.slice(-3).map(function (h) { return esc(A.fmtFact(key, h.value)); }).join(', ') + '</p>' : '') + '<input class="inp sq" id="ev" style="width:100%;margin-top:10px" placeholder="' + (d.unit === 'inr' ? 'e.g. 1.2 lakh' : d.unit === 'flag' ? 'yes or no' : 'a number') + '" value="' + (f ? (d.unit === 'flag' ? (f.value ? 'yes' : 'no') : f.value) : '') + '"><div class="qr">' + d.chips.map(function (c, i) { return '<button class="chip" data-c="' + i + '">' + esc(c[0]) + '</button>'; }).join('') + '</div>', actions: [{ label: 'Cancel', cls: 'sec' }].concat(stl ? [{ label: 'Still correct', cls: 'sec', fn: function () { S.setFact(key, f.value, 'USER_STATED', 'Re-confirmed'); var x = S.award('fix_stale', key); A.afterSave('You re-confirmed ' + d.label); if (x) A.toast('+' + x.xp + ' XP · refreshed', '✦'); A.rerender(); } }] : []).concat([{ label: 'Save', fn: function (m) { var v = M.answerFor(key, $('#ev', m).value); if (v === null) { A.toast('I could not read that value.', 'ℹ️'); return true; } var wasStale = stl; A.saveFact(key, v, f ? 'You corrected it' : 'You added it'); if (wasStale) { var x = S.award('fix_stale', key); if (x) A.toast('+' + x.xp + ' XP · refreshed', '✦'); } A.rerender(); } }]),
      onOpen: function (m) { $$('[data-c]', m).forEach(function (b) { b.addEventListener('click', function () { var c = d.chips[+b.dataset.c]; $('#ev', m).value = d.unit === 'flag' ? (c[1] ? 'yes' : 'no') : c[1]; }); }); }
    });
  }
})(window);
