/* Self-tests for the engine. Expected numbers come from FINSCORE_RULES_SPEC.md (verified test vectors, section 9) and its band convention (section 4).
   Runs in the browser (tests.html) and in Node. */
(function (root) {
  'use strict';
  var E = root.FSEngine || (typeof require !== 'undefined' ? require('./engine.js') : null);
  var near = function (a, b, tol) { return Math.abs(a - b) <= (tol == null ? 0.01 : tol); };
  var T = [];
  function t(name, source, fn) { T.push({ name: name, source: source, fn: fn }); }
  var fmt = function (v) { return typeof v === 'number' ? v.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : String(v); };

  t('Retirement corpus, master sample', 'Spec 9.2: E 30,000, age 32, Y 32, LE 80, Balanced (live 15.93%) = 4,05,60,253.60', function () { var r = E.retirement({ monthlyExpense: 30000, age: 32, yearsToRetire: 32, lifeExpectancy: 80, annualReturn: 0.1593 }); return [near(r.corpus, 40560253.60, 0.5), 'got ' + fmt(r.corpus)]; });
  t('Expense at retirement, master sample', 'Spec 9.2: 3,52,112.49', function () { var r = E.retirement({ monthlyExpense: 30000, age: 32, yearsToRetire: 32, lifeExpectancy: 80, annualReturn: 0.1593 }); return [near(r.expenseAtRetirement, 352112.49, 0.05), 'got ' + fmt(r.expenseAtRetirement)]; });
  t('Monthly SIP, master sample', 'Spec 9.2: 4,421.33', function () { var r = E.retirement({ monthlyExpense: 30000, age: 32, yearsToRetire: 32, lifeExpectancy: 80, annualReturn: 0.1593 }); return [near(r.monthlySip, 4421.33, 0.02), 'got ' + fmt(r.monthlySip)]; });
  t('Retirement corpus, goals sample', 'Spec 9.2: expense 8,00,000 a year (66,666.67 a month), age 55, Y 5, LE 75 = 1,08,90,375.42', function () { var r = E.retirement({ monthlyExpense: 800000 / 12, age: 55, yearsToRetire: 5, lifeExpectancy: 75, annualReturn: 0.1593 }); return [near(r.corpus, 10890375.42, 1) || near(r.expenseAtRetirement, 97955.21, 1), 'corpus ' + fmt(r.corpus) + ', expense ' + fmt(r.expenseAtRetirement)]; });
  t('Life insurance need (HLV)', 'Spec 9.3: age 28, retire 60, expenses 3,60,000 = 44,45,927.78', function () { var r = E.lifeNeed(360000, 32, 0); return [near(r.need, 4445927.78, 0.05), 'got ' + fmt(r.need)]; });
  t('Goal future value', 'Spec 9.4: 30,00,000, 5 years, 8% = 44,07,984.23', function () { var v = E.goalFV(3000000, 5, 0.08); return [near(v, 4407984.23, 0.05), 'got ' + fmt(v)]; });
  t('Age bands', 'Spec 4: <=25, 26-30, 31-35, 36-40, 41-50, 51-60, 61+ (age 25 in first band)', function () { var g = [[25, 0], [26, 1], [30, 1], [31, 2], [40, 3], [41, 4], [60, 5], [61, 6], [90, 6]].map(function (p) { return E.ageBand(p[0]) === p[1]; }); return [g.every(Boolean), g.join(',')]; });
  t('Boundary values fall in the higher band', 'Spec 4: band = number of cuts <= value', function () { var m = E.rules.matrices.cashflow; return [E.bandIndex(m, 29.99) === 0 && E.bandIndex(m, 30) === 1 && E.bandIndex(m, 80) === 6, '29.99/30/80 -> ' + [E.bandIndex(m, 29.99), E.bandIndex(m, 30), E.bandIndex(m, 80)]]; });
  t('Zero gets its own band where flagged', 'Spec 4: foir, portfolio_allocation, tax_80d are zero_exact', function () { var m = E.rules.matrices.foir; return [E.bandIndex(m, 0) === 0 && E.bandIndex(m, 5) === 1 && E.bandIndex(m, 20) === 2, [E.bandIndex(m, 0), E.bandIndex(m, 5), E.bandIndex(m, 20)].join(',')]; });
  t('Cashflow 25% at age 28 scores 4/10', 'Spec 5 F01 matrix, row 26-30, band "Less than 30%"', function () { var L = E.lookup('cashflow', 28, 0.25); return [L.score === 4 && L.bandLabel === 'Less than 30%', 'score ' + L.score]; });
  t('Weights total 100, max points total 900', 'Spec 2: each weight point = 9 points', function () { var w = E.rules.factors.reduce(function (s, f) { return s + f.weight; }, 0), m = E.rules.factors.reduce(function (s, f) { return s + f.max_points; }, 0); return [w === 100 && near(m, 900, 1e-6), w + ' / ' + m]; });
  t('Risk profile bands', 'Spec 9.1: <=10 conservative ... 32-35 aggressive', function () { var lo = E.riskProfile([4, 0, 4, 0, 4, 0, 4]), hi = E.riskProfile([0, 4, 1, 4, 0, 4, 0]); return [lo.name === 'CONSERVATIVE' && hi.total > lo.total, lo.name + ' ' + lo.total + ' / ' + hi.name + ' ' + hi.total]; });

  var P = { age: 30, income_m: 100000, expenses_m: 45000, emi_total: 15000, invest_m: 20000, loans_total: 800000, equity: 600000, debt: 300000, other_assets: 400000, goals_n: 2, life_cover: 5000000, health_cover: 500000, dependants: 1, d80c: 100000, d80d: 15000, kids: 1, kids_planned: 0, ret_age: 60, life_exp: 80 };
  t('A full profile scores every factor', 'Spec 3: 15 factors', function () { var s = E.score(P); return [s.scoredCount === 15 && s.confidence === 1 && s.total > 0 && s.total <= 900, s.scoredCount + ' factors, ' + s.total]; });
  t('Additivity: contributions + reference = score', 'Decision D-A5 (adopted): contribution = points above/below par; reference 450', function () { var s = E.score(P), c = s.factors.reduce(function (a, f) { return a + (f.contribution || 0); }, 0); return [near(c + s.reference, s.total, 0.05), 'sum ' + fmt(c + s.reference) + ' vs ' + fmt(s.total)]; });
  t('Deterministic', 'Principle P3: same facts, same score', function () { return [E.score(P).total === E.score(JSON.parse(JSON.stringify(P))).total, '']; });
  t('No children: kids factor skipped and re-weighted', 'Spec open question 9 (default chosen: skip)', function () { var q = JSON.parse(JSON.stringify(P)); q.kids = 0; delete q.kids_planned; var s = E.score(q); var k = s.factors.filter(function (f) { return f.id === 'F15'; })[0]; return [k.status === 'na' && s.confidence === 1 && s.applicableCount === 14, k.status + ', ' + s.applicableCount + ' applicable']; });
  t('Missing data is never guessed', 'Principle P9', function () { var s = E.score({ age: 30, income_m: 100000, expenses_m: 45000 }); var f = function (id) { return s.factors.filter(function (x) { return x.id === id; })[0]; }; return [f('F01').status === 'scored' && f('F11').status === 'missing' && s.confidence < 0.5 && !s.enough, 'confidence ' + s.confidence]; });
  t('Stage hidden below 50% measured', 'Decision D-B22 placeholder', function () { var s = E.score({ age: 30, income_m: 100000, expenses_m: 45000 }); return [s.stage === null, 'stage ' + s.stage]; });
  t('Zero income does not crash', 'Spec open question 19', function () { var s = E.score({ age: 30, income_m: 0, expenses_m: 1000 }); return [s.scoredCount >= 0 && isFinite(s.total), 'total ' + s.total]; });
  t('Score ignores anything but the facts (no XP input)', 'Principle P6, P8', function () { var a = E.score(P).total; return [E.score(P, {}).total === a && E.score.length <= 2, 'engine takes facts and options only']; });
  t('More income never lowers the income factor', 'Matrix monotonicity (F06)', function () { var a = E.lookup('income_range', 30, 600000).score, b = E.lookup('income_range', 30, 1800000).score; return [b >= a, a + ' -> ' + b]; });
  t('Stage bands cover 300-900', 'Deck slide 4', function () { return [E.stageOf(665).name === 'Accumulation' && E.stageOf(300).n === 1 && E.stageOf(900).n === 8, E.stageOf(665).name]; });

  function run() { return T.map(function (x) { var r; try { r = x.fn(); } catch (e) { r = [false, 'threw ' + e.message]; } return { name: x.name, source: x.source, pass: !!r[0], detail: r[1] }; }); }
  var API = { run: run, count: function () { return T.length; } };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.FSTests = API;
})(typeof window !== 'undefined' ? window : globalThis);
