/* Domain logic written from docs/PRODUCT_REQUIREMENTS.md and the Product Blueprint (sections 2-3, 7-8, 11-14).
   Everything that touches money calls FSEngine. The "AI" here is rule-based and has no model or network (principle P2).
   Items the documents leave open are marked PLACEHOLDER and listed in the Rules & tests screen. */
(function (root) {
  'use strict';
  var E = root.FSEngine;
  var inr = function (n) { return '₹' + Math.round(n).toLocaleString('en-IN'); };
  function compact(n) { var a = Math.abs(n), s = n < 0 ? '-' : ''; if (a >= 1e7) return s + '₹' + (a / 1e7).toFixed(2).replace(/\.?0+$/, '') + ' Cr'; if (a >= 1e5) return s + '₹' + (a / 1e5).toFixed(2).replace(/\.?0+$/, '') + ' L'; return s + inr(a); }

  /* ---- fact registry (blueprint section 5: every important field has source, timestamp, confidence, freshness) ---- */
  var D = function (key, label, group, unit, days, ask, chips, why) { return { key: key, label: label, group: group, unit: unit, days: days, ask: ask, chips: chips || [], why: why }; };
  var M = function (a) { return a.map(function (v) { return [compact(v), v]; }); };
  var FACTS = [
    D('age', 'Age', 'Identity', 'years', 365, 'How old are you?', [['25', 25], ['30', 30], ['35', 35], ['40', 40], ['45', 45], ['55', 55]], 'Age decides which peer band your numbers are compared with.'),
    D('income_m', 'Monthly income (take-home)', 'Income', 'inr', 90, 'What is your monthly take-home income?', M([40000, 75000, 125000, 200000]), 'Almost every ratio in your score is measured against income.'),
    D('expenses_m', 'Monthly expenses', 'Expenses', 'inr', 90, 'Roughly how much do you spend in a normal month, not counting loan EMIs or investments?', M([25000, 45000, 70000, 100000]), 'It shows how much room you have left each month.'),
    D('emi_total', 'Total monthly EMIs', 'Liabilities', 'inr', 90, 'What do your loan EMIs add up to each month? Enter 0 if none.', [['None', 0]].concat(M([10000, 25000, 50000])), 'EMIs against income is one of the strongest signals of strain.'),
    D('loans_total', 'Total loans outstanding', 'Liabilities', 'inr', 90, 'How much do you still owe across all loans? Enter 0 if none.', [['None', 0]].concat(M([200000, 800000, 2500000, 6000000])), 'It is needed to work out your net worth.'),
    D('invest_m', 'Monthly investments', 'Assets', 'inr', 90, 'How much do you invest each month, through SIPs or otherwise?', [['None', 0]].concat(M([5000, 15000, 30000, 60000])), 'Regular investing is a direct driver of two score factors.'),
    D('equity', 'Equity holdings', 'Assets', 'inr', 90, 'What is the current value of your shares and equity mutual funds? Enter 0 if none.', [['None', 0]].concat(M([100000, 500000, 2000000, 5000000])), 'It shapes your assets, net worth and how balanced your portfolio is.'),
    D('debt', 'Debt investments (FD, PPF, EPF, debt funds)', 'Assets', 'inr', 90, 'What is the value of your fixed deposits, PPF, EPF and debt funds? Enter 0 if none.', [['None', 0]].concat(M([100000, 500000, 2000000, 5000000])), 'It balances the equity side of your portfolio.'),
    D('other_assets', 'Other assets (gold, property, cash)', 'Assets', 'inr', 90, 'What do you hold in other assets such as gold, property or savings cash? Enter 0 if none.', [['None', 0]].concat(M([100000, 500000, 2500000, 10000000])), 'It completes the picture of what you own.'),
    D('goals_n', 'Pending goals', 'Goals', 'count', 365, 'How many money goals are you still working towards?', [['0', 0], ['1', 1], ['2', 2], ['3', 3], ['4+', 4]], 'More open goals need more of your surplus.'),
    D('life_cover', 'Life insurance cover', 'Protection', 'inr', 365, 'What is your total life insurance cover? Enter 0 if none.', [['None', 0]].concat(M([500000, 2500000, 10000000, 20000000])), 'It shows how protected your dependants are.'),
    D('health_cover', 'Health insurance cover', 'Protection', 'inr', 365, 'What is your total health insurance cover? Enter 0 if none.', [['None', 0]].concat(M([200000, 500000, 1000000, 2000000])), 'Medical costs are a leading cause of financial shocks.'),
    D('dependants', 'Financial dependants', 'Identity', 'count', 365, 'How many people depend on you financially?', [['0', 0], ['1', 1], ['2', 2], ['3+', 3]], 'The right health cover depends on it.'),
    D('kids', 'Children', 'Identity', 'count', 365, 'How many children do you have?', [['0', 0], ['1', 1], ['2', 2], ['3+', 3]], 'It decides whether the children-goal factor applies to you.'),
    D('kids_planned', 'Planning for children\'s goals', 'Goals', 'flag', 365, 'Have you started planning for your children\'s education or future?', [['Yes', 1], ['Not yet', 0]], 'It is one factor of your score.'),
    D('d80c', 'Section 80C investments (per year)', 'Taxes', 'inr', 365, 'How much do you put into Section 80C options in a year? Enter 0 if none.', [['None', 0]].concat(M([25000, 75000, 150000])), 'It shows how well you use tax-saving options.'),
    D('d80d', 'Section 80D premiums (per year)', 'Taxes', 'inr', 365, 'How much do you pay in Section 80D health premiums in a year? Enter 0 if none.', [['None', 0]].concat(M([10000, 20000, 30000])), 'It is the tax side of your health cover.'),
    D('ret_age', 'Planned retirement age', 'Goals', 'years', 365, 'At what age would you like to retire?', [['50', 50], ['55', 55], ['58', 58], ['60', 60], ['65', 65]], 'It sets the retirement corpus and SIP.'),
    D('life_exp', 'Life expectancy to plan for', 'Goals', 'years', 730, 'Up to what age should I plan your money to last?', [['75', 75], ['80', 80], ['85', 85], ['90', 90]], 'It decides how long retirement savings must last.'),
    D('ret_invest', 'Savings already tagged to retirement', 'Assets', 'inr', 90, 'How much have you already set aside for retirement?', [['None', 0]].concat(M([500000, 2500000, 10000000])), 'It reduces the SIP you still need.')
  ];
  var FDEF = {}; FACTS.forEach(function (d) { FDEF[d.key] = d; });
  var OPTIONAL = { ret_age: 1, life_exp: 1, ret_invest: 1 };
  var FACTOR_NEEDS = { F01: ['age', 'income_m', 'expenses_m'], F02: ['age', 'income_m', 'expenses_m', 'emi_total', 'invest_m'], F03: ['age', 'equity', 'debt', 'other_assets'], F04: ['age', 'equity', 'debt', 'other_assets', 'loans_total'], F05: ['age', 'equity', 'debt'], F06: ['age', 'income_m'], F07: ['age', 'goals_n'], F08: ['age', 'income_m', 'expenses_m'], F09: ['age', 'income_m', 'emi_total'], F10: ['age', 'income_m', 'invest_m'], F11: ['age', 'life_cover'], F12: ['age', 'health_cover', 'dependants'], F13: ['age', 'd80c'], F14: ['age', 'd80d'], F15: ['age', 'kids', 'kids_planned'] };

  /* ---- intents (FR-INT-02, multi-label) and the factors each one makes relevant ---- */
  var INTENTS = [
    { id: 'Goal', re: /\bgoal|save for|dream|plan for\b/i, f: ['F07', 'F15', 'F02'] }, { id: 'Cash flow / savings', re: /\bsave|saving|salary|spend|expens|budget|nothing left|cash ?flow/i, f: ['F01', 'F02', 'F10'] },
    { id: 'Investment', re: /\binvest|sip|mutual fund|stocks?|shares|equity|returns?\b/i, f: ['F03', 'F05', 'F10', 'F08'] }, { id: 'Debt / loan', re: /\bloan|emi|debt|credit card|borrow|owe\b/i, f: ['F09', 'F04'] },
    { id: 'Tax', re: /\btax|80c|80d|deduction|itr\b/i, f: ['F13', 'F14'] }, { id: 'Insurance / risk', re: /\binsur|cover|term plan|mediclaim|protect\b/i, f: ['F11', 'F12'] },
    { id: 'Retirement', re: /\bretire|pension|corpus|financial independence|fire\b/i, f: ['F08', 'F10', 'F03'] }, { id: 'Major purchase', re: /\bbuy|purchase|house|home|flat|car|wedding|down ?payment\b/i, f: ['F01', 'F09', 'F02'] },
    { id: 'Family / dependants', re: /\bkid|child|children|parents|spouse|wife|husband|family|dependant|dependent\b/i, f: ['F15', 'F12'] }, { id: 'Portfolio', re: /\bportfolio|holdings|diversif|allocation\b/i, f: ['F03', 'F05'] },
    { id: 'Behaviour / habit', re: /\bhabit|discipline|impulse|overspend|procrastinat|stress|anxious\b/i, f: ['F01', 'F02', 'F10'] }
  ];
  function classify(text) { var hit = INTENTS.filter(function (i) { return i.re.test(text); }).map(function (i) { return i.id; }); return hit.length ? hit : ['General financial health']; }
  function relevance(intentIds) { var f = {}; INTENTS.forEach(function (i) { if (intentIds.indexOf(i.id) > -1) i.f.forEach(function (x) { f[x] = (f[x] || 0) + 1; }); }); return f; }

  /* ---- extraction: free text -> candidate facts (never persisted until the user confirms) ---- */
  function parseAmount(s) {
    var m = /(?:₹|rs\.?|inr)?\s*(\d[\d,]*(?:\.\d+)?)\s*(crores?|cr|lakhs?|lacs?|lpa|l|k|thousand)?\b/i.exec(s); if (!m) return null;
    var v = parseFloat(m[1].replace(/,/g, '')), u = (m[2] || '').toLowerCase();
    if (/^cr/.test(u)) v *= 1e7; else if (/^(lakh|lac|lpa|l$)/.test(u)) v *= 1e5; else if (u === 'k' || u === 'thousand') v *= 1e3; return { v: v, unit: u, raw: m[0].trim() };
  }
  var RULES = [
    { k: 'emi_total', re: /\bemis?\b/i, t: 'inr' }, { k: 'loans_total', re: /\b(loans?|owe|outstanding|liabilit)/i, t: 'inr' },
    { k: 'life_cover', re: /\b(term (plan|insurance|cover)|life (insurance|cover))/i, t: 'inr' }, { k: 'health_cover', re: /\b(health (insurance|cover)|mediclaim)/i, t: 'inr' },
    { k: 'd80c', re: /\b80 ?c\b/i, t: 'inr' }, { k: 'd80d', re: /\b80 ?d\b/i, t: 'inr' },
    { k: 'invest_m', re: /\b(sips?|invest(ing|ment)?s?)\b/i, t: 'inr' }, { k: 'expenses_m', re: /\b(expens|spend|spending|living cost)/i, t: 'inr' },
    { k: 'income_m', re: /\b(salary|income|earn|earning|take-?home|ctc|lpa)\b/i, t: 'inr' },
    { k: 'equity', re: /\b(equity|stocks?|shares|mutual funds?)\b/i, t: 'inr' }, { k: 'debt', re: /\b(fds?|fixed deposits?|ppf|epf|bonds?|debt funds?)\b/i, t: 'inr' }, { k: 'other_assets', re: /\b(gold|property|real estate|savings account|cash)\b/i, t: 'inr' }
  ];
  function extract(text) {
    var out = [], seen = {}, add = function (k, v, ev, c) { if (seen[k]) return; seen[k] = 1; out.push({ key: k, value: v, evidence: ev, confidence: c }); };
    var low = text, m;
    if ((m = /\b(?:i am|i'm|age[d]?|aged)\s*(\d{2})\b/i.exec(low)) || (m = /\b(\d{2})\s*(?:years? old|yrs? old|yo)\b/i.exec(low))) add('age', +m[1], m[0], 0.95);
    if ((m = /retire\s*(?:at|by|when i am)?\s*(\d{2})\b/i.exec(low))) add('ret_age', +m[1], m[0], 0.9);
    if ((m = /\b(\d)\s*(?:kids?|children|child)\b/i.exec(low))) add('kids', +m[1], m[0], 0.9); else if (/\bno (kids|children)\b/i.test(low)) add('kids', 0, 'no kids', 0.9);
    if ((m = /\b(\d)\s*dependants?|dependents?\b/i.exec(low)) && m[1]) add('dependants', +m[1], m[0], 0.85);
    if ((m = /\b(\d)\s*goals?\b/i.exec(low))) add('goals_n', +m[1], m[0], 0.85);
    low.split(/(?<!\d)[,.]|[,.](?!\d)|[;\n]|\band\b|\bbut\b/i).forEach(function (cl) {
      var amt = parseAmount(cl.replace(/\b80\s?[cd]\b/ig, '')); if (!amt) return;
      for (var i = 0; i < RULES.length; i++) {
        if (RULES[i].re.test(cl)) {
          var v = amt.v, k = RULES[i].k, annual = /\b(per year|a year|annual|yearly|lpa|p\.a\.)/i.test(cl) || amt.unit === 'lpa';
          if ((k === 'income_m' || k === 'expenses_m' || k === 'emi_total' || k === 'invest_m') && annual) v = v / 12;
          if (k === 'income_m' && /\bctc\b/i.test(cl) && annual) { /* gross, not take-home */ }
          add(k, Math.round(v), cl.trim(), (k === 'income_m' && /ctc/i.test(cl)) ? 0.6 : 0.85); break;
        }
      }
    });
    return out;
  }
  /** A reply to a specific question: accept a bare amount, count, or yes/no for that fact. */
  function answerFor(key, text) {
    var d = FDEF[key], s = text.trim();
    if (d.unit === 'flag') { if (/^(y|yes|yeah|started|done|planned)/i.test(s)) return 1; if (/^(n|no|not yet|nope|none)/i.test(s)) return 0; return null; }
    if (/^(none|no|nil|zero|nothing|0)$/i.test(s)) return 0;
    var a = parseAmount(s); if (!a) return null; var v = a.v; if (d.unit === 'inr' && /(?:^|\s)(lpa)/i.test(s)) v = v / 12; return Math.round(v);
  }

  /* ---- adaptive next question (blueprint section 3 Stage B, PROPOSED algorithm) ---- */
  var FRICTION = { age: 0.5, kids: 0.5, kids_planned: 0.6, dependants: 0.5, goals_n: 0.7, income_m: 1, expenses_m: 1.1, emi_total: 1, loans_total: 1, invest_m: 1, equity: 1.3, debt: 1.3, other_assets: 1.3, life_cover: 1.1, health_cover: 1.1, d80c: 1.3, d80d: 1.3, ret_age: 0.8, life_exp: 0.8, ret_invest: 1.2 };
  var FACT_FACTORS = {}; Object.keys(FACTOR_NEEDS).forEach(function (f) { FACTOR_NEEDS[f].forEach(function (k) { (FACT_FACTORS[k] = FACT_FACTORS[k] || []).push(f); }); });
  function nextQuestions(facts, intents, mode, skip) {
    skip = skip || []; var res = E.score(facts), rel = relevance(intents || []), W = {}; E.rules.factors.forEach(function (f) { W[f.id] = f.weight; });
    var cands = [];
    FACTS.forEach(function (d) {
      if (typeof facts[d.key] === 'number' || skip.indexOf(d.key) > -1) return; if (OPTIONAL[d.key] && !(res.factors.some(function (r) { return r.id === 'F08' && r.status === 'scored'; }))) return;
      if (d.key === 'kids_planned' && facts.kids === 0) return;
      var gain = 0, reasons = [], relv = 0;
      (FACT_FACTORS[d.key] || []).forEach(function (fid) { var row = res.factors.filter(function (r) { return r.id === fid; })[0]; if (row && row.status === 'missing') { var left = FACTOR_NEEDS[fid].filter(function (k) { return typeof facts[k] !== 'number'; }).length || 1; gain += W[fid] / left; if (rel[fid]) relv += rel[fid]; } });
      var dep = d.key === 'age' ? 100 : d.key === 'income_m' ? 50 : 0, optional = OPTIONAL[d.key] ? 2 : 0;
      var s = (mode === 'problem' ? relv * 12 : relv * 4) + gain * 1.5 + dep + optional - (FRICTION[d.key] || 1) * 2;
      if (dep) reasons.push(d.key === 'age' ? 'dependency: age picks the peer band for every other number' : 'dependency: most ratios are measured against income');
      if (relv && mode === 'problem') reasons.push('relevance: it bears on what you asked'); if (gain) reasons.push('information gain: it can unlock ' + Math.round(gain) + ' points of weight'); if (!reasons.length) reasons.push('it refines an assumption I had to make');
      cands.push({ key: d.key, score: s, reasons: reasons, gain: gain });
    });
    return cands.sort(function (a, b) { return b.score - a.score; });
  }
  /** Coverage map per scoring factor: Unknown / Partially Known / Verified / Stale (FR-INT-04). */
  function coverage(facts, meta, now) {
    return E.rules.factors.map(function (f) {
      var need = FACTOR_NEEDS[f.id].filter(function (k) { return k !== 'age'; }), have = need.filter(function (k) { return typeof facts[k] === 'number'; });
      if (f.id === 'F15' && facts.kids === 0) return { id: f.id, name: f.name, state: 'Verified', note: 'does not apply' };
      var state = have.length === 0 ? 'Unknown' : have.length < need.length ? 'Partially Known' : 'Verified';
      if (have.length && have.some(function (k) { return meta[k] && isStale(k, meta[k], now); })) state = 'Stale';
      return { id: f.id, name: f.name, state: state };
    });
  }
  function isStale(k, m, now) { var d = FDEF[k]; return d && m && (now - m.ts) / 864e5 > d.days; }

  /* ---- Financial DNA (blueprint section 7): trait = value + confidence + evidence_count + recency + history. Thresholds PLACEHOLDER (D-B5). ---- */
  var DIMS = ['Savings identity', 'Debt behaviour', 'Investment style', 'Risk behaviour', 'Protection mindset', 'Decision style', 'Goal orientation', 'Liquidity preference', 'Financial confidence', 'Execution discipline'];
  function dna(facts, ctx) {
    var I = facts.income_m, t = [], n = function (k) { return typeof facts[k] === 'number'; }, ago = function (keys) { var l = keys.map(function (k) { return ctx.meta[k] ? ctx.meta[k].ts : 0; }).filter(Boolean); return l.length ? Math.max(0, Math.round((ctx.now - Math.max.apply(null, l)) / 864e5)) : null; };
    function T(dim, value, conf, keys, note) { t.push({ dim: dim, value: value, confidence: value ? conf : 0, evidence: keys.filter(n).length + (note ? 1 : 0), recencyDays: ago(keys), basis: keys }); }
    if (n('income_m') && n('expenses_m') && n('emi_total') && I > 0) { var r = (I - facts.expenses_m - facts.emi_total) / I; T('Savings identity', r >= 0.4 ? 'Saver' : r >= 0.2 ? 'Balanced' : 'Spender', 0.7, ['income_m', 'expenses_m', 'emi_total']); } else T('Savings identity', null, 0, ['income_m', 'expenses_m', 'emi_total']);
    if (n('income_m') && n('emi_total') && I > 0) { var fo = facts.emi_total / I; T('Debt behaviour', fo === 0 ? 'Avoidant' : fo <= 0.3 ? 'Controlled' : 'Leveraged', 0.7, ['income_m', 'emi_total']); } else T('Debt behaviour', null, 0, ['income_m', 'emi_total']);
    if (n('income_m') && n('invest_m') && I > 0) { var ir = facts.invest_m / I; T('Investment style', ir >= 0.1 ? 'Disciplined' : ir > 0 ? 'Opportunistic' : 'Not investing yet', 0.4, ['income_m', 'invest_m']); } else T('Investment style', null, 0, ['income_m', 'invest_m']);
    if (ctx.risk) T('Risk behaviour', ctx.risk.name.charAt(0) + ctx.risk.name.slice(1).toLowerCase(), 0.6, [], 'risk answers'); else T('Risk behaviour', null, 0, []);
    if (n('life_cover') && n('expenses_m') && n('age')) { var ra = n('ret_age') ? facts.ret_age : E.defaults.defaultRetAge, ln = E.lifeNeed(facts.expenses_m * 12, Math.max(0, ra - facts.age), facts.life_cover), q = ln.need ? facts.life_cover / ln.need : 1; T('Protection mindset', q >= 1 ? 'Protected' : q >= 0.5 ? 'Partial' : 'Underinsured', 0.65, ['life_cover', 'expenses_m', 'age']); } else T('Protection mindset', null, 0, ['life_cover', 'expenses_m', 'age']);
    var ac = ctx.actions || { suggested: 0, done: 0, snoozes: 0 };
    if (ac.suggested >= 2) T('Decision style', ac.snoozes > ac.done ? 'Postponer' : ac.done > 0 ? 'Planner' : 'Deciding', 0.35, [], 'action history'); else T('Decision style', null, 0, []);
    if (n('goals_n')) T('Goal orientation', facts.goals_n >= 2 ? 'Goal-led' : facts.goals_n === 1 ? 'Flexible' : 'Present-focused', 0.45, ['goals_n']); else T('Goal orientation', null, 0, ['goals_n']);
    T('Liquidity preference', null, 0, []); T('Financial confidence', null, 0, []);
    if (ac.suggested >= 2) T('Execution discipline', ac.done / ac.suggested >= 0.6 ? 'High' : ac.done / ac.suggested >= 0.25 ? 'Variable' : 'Low', 0.35, [], 'action completion'); else T('Execution discipline', null, 0, []);
    return t;
  }
  var PERSONAS = [ // PLACEHOLDER catalogue (D-B5 pending). Scored against DNA + state; one primary, optional modifier.
    { id: 'Steady Builder', w: { 'Savings identity': ['Saver', 'Balanced'], 'Investment style': ['Disciplined'], 'Debt behaviour': ['Controlled', 'Avoidant'] }, text: 'You save and invest steadily and keep debt in check.' },
    { id: 'Guardian', w: { 'Protection mindset': ['Protected'], 'Risk behaviour': ['Conservative', 'Moderately conservative'], 'Debt behaviour': ['Avoidant'] }, text: 'You put safety first and protect what you have.' },
    { id: 'Optimiser', w: { 'Investment style': ['Disciplined'], 'Risk behaviour': ['Moderately aggressive', 'Aggressive', 'Balanced'], 'Goal orientation': ['Goal-led'] }, text: 'You invest with purpose and accept measured risk.' },
    { id: 'Stretched Achiever', w: { 'Debt behaviour': ['Leveraged'], 'Savings identity': ['Spender', 'Balanced'] }, text: 'You are building a lot at once, and loans take a large share of income.' },
    { id: 'Present-Focused', w: { 'Savings identity': ['Spender'], 'Investment style': ['Not investing yet', 'Opportunistic'], 'Goal orientation': ['Present-focused'] }, text: 'You value today, and a small automatic habit could protect your future.' },
    { id: 'Fresh Starter', w: {}, text: 'There is not enough evidence yet. A few more answers will sharpen this.' }
  ];
  function persona(traits) {
    var by = {}; traits.forEach(function (x) { by[x.dim] = x; });
    var sc = PERSONAS.map(function (p) { var s = 0, why = []; Object.keys(p.w).forEach(function (d) { var x = by[d]; if (x && x.value && p.w[d].indexOf(x.value) > -1) { s += x.confidence; why.push(d + ': ' + x.value); } }); return { p: p, s: s, why: why }; }).filter(function (x) { return x.p.id !== 'Fresh Starter'; }).sort(function (a, b) { return b.s - a.s; });
    if (!sc.length || sc[0].s < 0.6) return { primary: PERSONAS[PERSONAS.length - 1], why: [], modifier: null, placeholder: true };
    return { primary: sc[0].p, why: sc[0].why, modifier: sc[1] && sc[1].s >= 0.6 ? sc[1].p : null, placeholder: true };
  }
  var LEVELS = [0, 50, 120, 210, 320, 450, 600, 780, 980, 1200]; // 10 ladder levels per persona (blueprint section 8); XP values PROPOSED

  /* ---- action prioritiser (blueprint section 12, PROPOSED formula). Deltas are computed by re-running the engine, never typed in. ---- */
  var LEVERS = [
    { id: 'invest_up', label: 'Invest a little more each month', effort: 6, factors: ['F10', 'F02'], mk: function (f) { if (!f.income_m || typeof f.invest_m !== 'number') return null; var add = Math.max(2000, Math.round(f.income_m * 0.05 / 1000) * 1000); return { to: { invest_m: f.invest_m + add }, text: 'Add ' + inr(add) + ' a month to your investments', amount: add * 12, kind: 'flow' }; } },
    { id: 'cut_exp', label: 'Trim monthly expenses', effort: 4, factors: ['F01', 'F02', 'F08'], mk: function (f) { if (typeof f.expenses_m !== 'number') return null; var cut = Math.round(f.expenses_m * 0.1 / 500) * 500; if (cut < 500) return null; return { to: { expenses_m: f.expenses_m - cut }, text: 'Bring monthly spending down by ' + inr(cut) + ' (about 10%)', amount: cut * 12, kind: 'flow' }; } },
    { id: 'life_up', label: 'Raise life cover', effort: 5, factors: ['F11'], mk: function (f) { return stepUp(f, 'life_insurance', 'life_cover', 1e5, function (v) { return 'Raise life cover to ' + compact(v) + ' (a protection decision to make with your dependants in mind)'; }); } },
    { id: 'health_up', label: 'Raise health cover', effort: 5, factors: ['F12'], mk: function (f) { if (typeof f.dependants !== 'number') return null; var m = f.dependants === 0 ? 'health_dep0' : f.dependants <= 2 ? 'health_dep1_2' : 'health_dep3p'; return stepUp(f, m, 'health_cover', 1e5, function (v) { return 'Raise health cover to ' + compact(v); }); } },
    { id: 'tax80c', label: 'Use more of Section 80C', effort: 6, factors: ['F13'], mk: function (f) { return stepUp(f, 'tax_80c', 'd80c', 1e3, function (v) { return 'Invest up to ' + compact(v) + ' a year under 80C, in options that fit your goals'; }); } },
    { id: 'tax80d', label: 'Claim Section 80D', effort: 7, factors: ['F14'], mk: function (f) { return stepUp(f, 'tax_80d', 'd80d', 1e3, function (v) { return 'Pay health premiums of ' + compact(v) + ' a year to use 80D'; }); } },
    { id: 'emi_down', label: 'Prepay part of your loans', effort: 3, factors: ['F09', 'F04'], mk: function (f) { if (!f.emi_total || !f.loans_total) return null; var pay = Math.round(f.loans_total * 0.2 / 1000) * 1000; return { to: { emi_total: Math.round(f.emi_total * 0.8), loans_total: f.loans_total - pay }, text: 'Prepay about ' + compact(pay) + ' of loans, cutting EMIs by roughly 20%', amount: pay, kind: 'lump' }; } },
    { id: 'kids_plan', label: 'Start planning for your children', effort: 7, factors: ['F15'], mk: function (f) { if (!(f.kids > 0) || f.kids_planned === 1) return null; return { to: { kids_planned: 1 }, text: 'Start a dedicated plan for your children\'s goals', amount: 0, kind: 'plan' }; } },
    { id: 'rebalance', label: 'Rebalance equity and debt', effort: 5, factors: ['F05'], mk: function (f) { if (!(f.equity + f.debt > 0) || typeof f.age !== 'number') return null; var tot = f.equity + f.debt, best = null, cur = E.lookup('portfolio_allocation', f.age, f.equity / tot).score; for (var p = 0; p <= 100; p += 5) { var s = E.lookup('portfolio_allocation', f.age, p / 100).score; if (s > cur && (!best || s > best.s || (s === best.s && Math.abs(p - f.equity / tot * 100) < Math.abs(best.p - f.equity / tot * 100)))) best = { p: p, s: s }; } if (!best) return null; return { to: { equity: Math.round(tot * best.p / 100), debt: tot - Math.round(tot * best.p / 100) }, text: 'Move your equity share from ' + Math.round(f.equity / tot * 100) + '% to about ' + best.p + '% of equity plus debt', amount: 0, kind: 'plan' }; } }
  ];
  function stepUp(f, matrixId, key, unit, textFn) {
    if (typeof f[key] !== 'number') return null; var m = E.rules.matrices[matrixId], cur = f[key] / unit, next = null; for (var i = 0; i < m.cuts.length; i++) if (m.cuts[i] > cur) { next = m.cuts[i]; break; }
    if (next === null) return null; var to = {}; to[key] = next * unit; return { to: to, text: textFn(next * unit), amount: next * unit - f[key], kind: 'cover' };
  }
  function proposeActions(facts, opts, intents, conf) {
    var base = E.score(facts, opts); if (!base.scoredCount) return []; var rel = relevance(intents || []), out = [], annual = (facts.income_m || 0) * 12;
    LEVERS.forEach(function (L) {
      var r = L.mk(facts); if (!r) return; var nf = {}; Object.keys(facts).forEach(function (k) { nf[k] = facts[k]; }); Object.keys(r.to).forEach(function (k) { nf[k] = r.to[k]; });
      var after = E.score(nf, opts), delta = round1(after.total - base.total), rows = base.factors.filter(function (x) { return L.factors.indexOf(x.id) > -1 && x.status === 'scored'; });
      if (delta <= 0.05) return;
      var worst = rows.reduce(function (m, x) { return Math.min(m, x.ratio); }, 1), fl = rows.some(function (x) { return x.actionArea; });
      var parts = { impact: Math.min(30, Math.round(delta * 3)), financial: annual ? Math.min(25, Math.round(Math.abs(r.amount) / annual * 25 * 2)) : 5, urgency: fl ? 20 : worst < 0.7 ? 10 : 4, ease: L.effort, confidence: Math.round((conf != null ? conf : base.confidence) * 10), alignment: L.factors.some(function (x) { return rel[x]; }) ? 5 : 0 };
      var total = Object.keys(parts).reduce(function (s, k) { return s + parts[k]; }, 0);
      out.push({ id: L.id, label: L.label, text: r.text, to: r.to, delta: delta, before: base.total, after: after.total, parts: parts, priority: total, amount: r.amount, kind: r.kind, factors: L.factors, also: alsoImpacts(rows.map(function (x) { return x.name; })) });
    });
    return out.sort(function (a, b) { return b.priority - a.priority || b.delta - a.delta; });
  }
  var round1 = function (v) { return Math.round(v * 10) / 10; };
  function alsoImpacts(names) { var m = E.rules.action_areas.impacted_by, s = []; names.forEach(function (n) { (m[n] || []).forEach(function (x) { if (s.indexOf(x) < 0 && names.indexOf(x) < 0) s.push(x); }); }); return s; }

  /* ---- scenarios (blueprint section 11): variables -> deterministic engine -> old vs new ---- */
  function emiFor(P, rate, years) { var r = rate / 12, n = years * 12; return P * r / (1 - Math.pow(1 + r, -n)); }
  function applyScenario(f, s) {
    var n = {}; Object.keys(f).forEach(function (k) { n[k] = f[k]; }); var notes = [];
    if (s.incomePct) { n.income_m = Math.round(f.income_m * (1 + s.incomePct / 100)); notes.push('Income ' + (s.incomePct > 0 ? '+' : '') + s.incomePct + '%'); }
    if (s.expPct) { n.expenses_m = Math.round(f.expenses_m * (1 + s.expPct / 100)); notes.push('Expenses ' + (s.expPct > 0 ? '+' : '') + s.expPct + '%'); }
    if (s.investAdd) { n.invest_m = (f.invest_m || 0) + s.investAdd; notes.push('Invest ' + inr(s.investAdd) + ' more a month'); }
    if (s.retAge) { n.ret_age = s.retAge; notes.push('Retire at ' + s.retAge); }
    if (s.purchase) { var down = s.purchase * (s.downPct != null ? s.downPct : 20) / 100, loan = s.purchase - down, emi = emiFor(loan, s.rate || 0.09, s.years || 5); n.emi_total = (f.emi_total || 0) + Math.round(emi); n.loans_total = (f.loans_total || 0) + Math.round(loan); notes.push('Buy for ' + compact(s.purchase) + ' with ' + (s.downPct != null ? s.downPct : 20) + '% down: loan ' + compact(loan) + ', EMI about ' + inr(emi)); }
    if (s.jobLoss) { n.income_m = 0; notes.push('Income stops'); }
    return { facts: n, notes: notes };
  }
  function metrics(f, opts) {
    var sc = E.score(f, opts), I = f.income_m || 0, surplus = I - (f.expenses_m || 0) - (f.emi_total || 0), assets = (f.equity || 0) + (f.debt || 0) + (f.other_assets || 0), r = { score: sc, surplus: surplus, annualSavings: surplus * 12, netWorth: assets - (f.loans_total || 0) };
    if (typeof f.age === 'number' && typeof f.expenses_m === 'number') {
      var ra = typeof f.ret_age === 'number' ? f.ret_age : E.defaults.defaultRetAge, le = typeof f.life_exp === 'number' ? f.life_exp : E.defaults.defaultLifeExp, Y = ra - f.age;
      if (Y > 0) { r.retire = {}; ['CONSERVATIVE', 'BALANCED', 'AGGRESSIVE'].forEach(function (p) { r.retire[p] = E.retirement({ monthlyExpense: f.expenses_m, yearsToRetire: Y, age: f.age, lifeExpectancy: le, annualReturn: E.annualReturn(p, (opts && opts.returnSet) || 'live'), fvTagged: f.ret_invest || 0 }); }); r.retAge = ra; r.years = Y; }
    }
    return r;
  }
  /** Natural-language scenario -> variables (the LLM step in the documents, here rule-based). */
  function parseScenario(text) {
    var s = {}, m, t = text.toLowerCase();
    if ((m = /invest\s*(?:₹|rs\.?)?\s*([\d,.]+)\s*(k|thousand|lakh|l)?\s*more/.exec(t))) { var v = parseFloat(m[1].replace(/,/g, '')) * (m[2] === 'k' || m[2] === 'thousand' ? 1e3 : m[2] ? 1e5 : 1); s.investAdd = Math.round(v); }
    if ((m = /retire\s*(?:at|by)\s*(\d{2})/.exec(t))) s.retAge = +m[1];
    if ((m = /(?:income|salary)\s*(?:up|rises?|increases?|\+)?\s*(?:by)?\s*(\d{1,3})\s*%/.exec(t))) s.incomePct = (/(down|cut|falls?|drops?|reduce)/.test(t) ? -1 : 1) * +m[1];
    if ((m = /(?:expenses?|spending)\s*(?:up|down|rise|fall|cut|reduce)?\s*(?:by)?\s*(\d{1,3})\s*%/.exec(t))) s.expPct = (/(down|cut|fall|reduce|lower)/.test(t) ? -1 : 1) * +m[1];
    if ((m = /(?:buy|purchase|afford)[^\d₹]*(?:₹|rs\.?)?\s*([\d,.]+)\s*(crore|cr|lakh|lakhs|l|k)?/.exec(t)) && /car|house|home|flat|bike|₹|rs/.test(t)) { var p = parseFloat(m[1].replace(/,/g, '')); var u = m[2] || ''; p *= /^cr/.test(u) ? 1e7 : /^l/.test(u) ? 1e5 : u === 'k' ? 1e3 : 1; if (p >= 50000) s.purchase = Math.round(p); }
    if (/lose (my )?job|job loss|income stops|laid off/.test(t)) s.jobLoss = true;
    return s;
  }

  root.FSModel = { FACTS: FACTS, FDEF: FDEF, FACTOR_NEEDS: FACTOR_NEEDS, INTENTS: INTENTS, classify: classify, relevance: relevance, extract: extract, answerFor: answerFor, parseAmount: parseAmount, nextQuestions: nextQuestions, coverage: coverage, isStale: isStale, DIMS: DIMS, dna: dna, persona: persona, PERSONAS: PERSONAS, LEVELS: LEVELS, proposeActions: proposeActions, applyScenario: applyScenario, metrics: metrics, parseScenario: parseScenario, emiFor: emiFor, inr: inr, compact: compact, OPTIONAL: OPTIONAL };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.FSModel;
})(typeof window !== 'undefined' ? window : globalThis);
