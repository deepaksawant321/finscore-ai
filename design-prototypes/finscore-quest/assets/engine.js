/* Deterministic FinScore engine, written from docs/rules/FINSCORE_RULES_SPEC.md (DRAFT v0.1, not business-approved).
   Pure functions: no DOM, no storage, no network, and no knowledge of XP or the AI layer (principle P2, P6).
   Money is in rupees. Matrices work in lakh / thousand / percent, so values are converted at lookup. */
(function (root) {
  'use strict';
  var R = (root.FSDOC && root.FSDOC.rules) || {};
  var round = function (v, d) { var p = Math.pow(10, d || 0); return Math.round(v * p) / p; };

  var STAGES = [
    { n: 1, name: 'Dependency', min: 300, max: 374, nick: 'The Starter' }, { n: 2, name: 'Survival', min: 375, max: 449, nick: 'The Stabiliser' },
    { n: 3, name: 'Security', min: 450, max: 524, nick: 'The Protector' }, { n: 4, name: 'Stability', min: 525, max: 599, nick: 'The Balancer' },
    { n: 5, name: 'Accumulation', min: 600, max: 674, nick: 'The Builder' }, { n: 6, name: 'Independence', min: 675, max: 749, nick: 'The Accelerator' },
    { n: 7, name: 'Freedom', min: 750, max: 824, nick: 'The Liberator' }, { n: 8, name: 'Abundance', min: 825, max: 900, nick: 'The Legacy Maker' }
  ];
  /** Band-only stage from the strategy deck. The age x score matrix is PENDING (D-A3), so every result is provisional. */
  function stageOf(score) { var s = Math.max(300, Math.min(900, score)); for (var i = 0; i < STAGES.length; i++) if (s <= STAGES[i].max) return STAGES[i]; return STAGES[7]; }
  function message(score) { var m = R.score_messages || []; for (var i = 0; i < m.length; i++) if (score <= m[i].max) return m[i].text; return m.length ? m[m.length - 1].text : ''; }

  /* ---- bands ---- */
  function ageBand(age) { var u = R.age_bands.upper_inclusive; for (var i = 0; i < u.length; i++) if (u[i] === null || age <= u[i]) return i; return u.length - 1; }
  function bandIndex(m, v) {
    if (m.zero_exact) { if (v <= 0) return 0; }
    var n = 0; for (var i = 0; i < m.cuts.length; i++) if (m.cuts[i] <= v) n++;
    return (m.zero_exact ? 1 : 0) + n;
  }
  function toUnit(m, raw) { // raw: rupees, ratio (0..1) or count/flag
    if (m.kind === 'rupees_lakh') return round(raw / 1e5, 6);
    if (m.kind === 'rupees_thousand') return round(raw / 1e3, 6);
    if (m.kind === 'percent') return round(raw * 100, 6);
    return raw;
  }
  function lookup(matrixId, age, raw) {
    var m = R.matrices[matrixId], v = toUnit(m, raw), b = bandIndex(m, v), a = ageBand(age);
    return { unitValue: v, band: b, bandLabel: m.band_labels[b], score: m.rows_by_age_band[a][b], ageBand: a, ageLabel: R.age_bands.labels[a] };
  }

  /* ---- calculators (spec section 9) ---- */
  var RISK_BANDS = function () { return R.risk_profile.bands; };
  function riskProfile(answers) { // answers: array of 7 option indexes 0..4
    var t = 0; for (var q = 0; q < 7; q++) t += R.risk_profile.question_option_scores[String(q + 1)][answers[q]];
    var b = RISK_BANDS(); for (var i = 0; i < b.length; i++) if (t <= b[i].max_score) return { total: t, name: b[i].name };
    return { total: t, name: b[b.length - 1].name };
  }
  function annualReturn(profileName, set) { return (set === 'uat' ? R.risk_profile.annual_return_uat : R.risk_profile.annual_return_live)[profileName]; }
  /** Retirement corpus and monthly SIP: monthly compounding, annuity-due (spec 9.2). */
  function retirement(o) {
    var i = o.inflation != null ? o.inflation : R.retirement.inflation, a = o.annuityRate != null ? o.annuityRate : R.retirement.annuity_rate;
    var E = o.monthlyExpense, Y = o.yearsToRetire, age = o.age, LE = o.lifeExpectancy, M = o.medical || 0, p = o.annualReturn;
    var im = Math.pow(1 + i, 1 / 12) - 1, n = 12 * Y, Eret = E * Math.pow(1 + im, n), rr = Math.pow((1 + a) / (1 + i), 1 / 12) - 1, Nret = 12 * LE - 12 * (age + Y);
    var corpus = Eret * (1 - Math.pow(1 + rr, -Nret)) / rr * (1 + rr) + M * Math.pow(1 + im, n);
    var rp = Math.pow(1 + p, 1 / 12) - 1, existing = (o.fvSavings || 0) + (o.fvTagged || 0);
    var sip = n > 0 ? (corpus - existing) * rp / (Math.pow(1 + rp, n) - 1) / (1 + rp) : Infinity;
    return { expenseAtRetirement: Eret, corpus: corpus, monthlySip: Math.max(0, sip), months: n, retirementMonths: Nret };
  }
  /** Human life value: annuity-due PV of annual expenses to retirement, discounted at 8% (spec 9.3). */
  function lifeNeed(annualExpenses, years, existingCover) {
    var r = R.retirement.insurance_discount_rate, need = years > 0 ? annualExpenses * (1 - Math.pow(1 + r, -years)) / r * (1 + r) : 0;
    return { need: need, gap: Math.max(need - (existingCover || 0), 0) };
  }
  function goalFV(amountToday, years, inflation) { return amountToday * Math.pow(1 + (inflation != null ? inflation : R.retirement.inflation), years); }
  /** Monthly SIP to reach a target value (annuity-due, monthly compounding). */
  function sipFor(target, years, annualReturnRate, existing) {
    var rp = Math.pow(1 + annualReturnRate, 1 / 12) - 1, n = 12 * years; if (n <= 0) return Infinity;
    return Math.max(0, (target - (existing || 0)) * rp / (Math.pow(1 + rp, n) - 1) / (1 + rp));
  }

  /* ---- scoring ---- */
  var DEFAULT_OPTS = { savingsVariant: 'master', kidsMode: 'skip', returnSet: 'live', defaultRetAge: R.retirement ? R.retirement.default_retirement_age : 60, defaultLifeExp: R.retirement ? R.retirement.default_life_expectancy : 80 };
  function num(v) { return typeof v === 'number' && isFinite(v); }
  function has(f, keys) { var miss = []; keys.forEach(function (k) { if (!num(f[k])) miss.push(k); }); return miss; }

  /** Score a set of facts (plain key -> number map). Returns factor detail, total, confidence and every assumption made. */
  function score(f, optsIn) {
    var o = {}; Object.keys(DEFAULT_OPTS).forEach(function (k) { o[k] = DEFAULT_OPTS[k]; }); Object.keys(optsIn || {}).forEach(function (k) { o[k] = optsIn[k]; });
    var assumptions = [], out = [], age = f.age, I = f.income_m, ageKnown = num(age) && age >= 18 && age <= 100;
    function addAssump(t) { if (assumptions.indexOf(t) < 0) assumptions.push(t); }
    var risk = f.risk_profile_name || null, retAge = num(f.ret_age) ? f.ret_age : null, LE = num(f.life_exp) ? f.life_exp : null;

    R.factors.forEach(function (fac) {
      var row = { id: fac.id, name: fac.name, weight: fac.weight, maxPoints: fac.max_points, status: 'scored', needs: [], raw: null, unitValue: null, band: null, bandLabel: null, fscore: null, points: null, note: '' };
      var miss = [], raw = null, mid = fac.matrix, incOk = num(I) && I > 0;
      if (!ageKnown) miss.push('age');
      switch (fac.id) {
        case 'F01': miss = miss.concat(has(f, ['income_m', 'expenses_m'])); if (!miss.length) { if (!incOk) { miss.push('income_m'); } else raw = (I - f.expenses_m) / I; } break;
        case 'F02': { var need = o.savingsVariant === 'master' ? ['income_m', 'expenses_m', 'emi_total', 'invest_m'] : ['income_m', 'expenses_m', 'emi_total']; miss = miss.concat(has(f, need)); if (!miss.length) { if (!incOk) miss.push('income_m'); else raw = (I - (f.expenses_m + f.emi_total + (o.savingsVariant === 'master' ? f.invest_m : 0))) / I; } break; }
        case 'F03': { var known = ['equity', 'debt', 'other_assets'].filter(function (k) { return num(f[k]); }); if (!known.length) miss = miss.concat(['equity', 'debt', 'other_assets']); else { raw = (f.equity || 0) + (f.debt || 0) + (f.other_assets || 0); if (known.length < 3) addAssump('Assets: holdings you have not mentioned are counted as zero.'); } break; }
        case 'F04': { var k3 = ['equity', 'debt', 'other_assets'].filter(function (k) { return num(f[k]); }); if (!k3.length) miss = miss.concat(['equity', 'debt', 'other_assets']); if (!num(f.loans_total)) miss.push('loans_total'); if (!miss.length) raw = (f.equity || 0) + (f.debt || 0) + (f.other_assets || 0) - f.loans_total; break; }
        case 'F05': { var e = f.equity, d = f.debt; if (!num(e) && !num(d)) miss = miss.concat(['equity', 'debt']); else { e = e || 0; d = d || 0; if (e + d === 0) { row.status = 'missing'; row.note = 'No equity or debt holdings, so the mix is undefined (open question 11).'; row.needs = ['equity', 'debt']; out.push(row); return; } raw = e / (e + d); } break; }
        case 'F06': if (!incOk) miss.push('income_m'); else raw = I * 12; break;
        case 'F07': miss = miss.concat(has(f, ['goals_n'])); if (!miss.length) { raw = Math.min(4, Math.max(0, f.goals_n)); if (f.goals_n >= 5) addAssump('Five or more pending goals are treated as four (spec open question 10).'); } break;
        case 'F08': {
          miss = miss.concat(has(f, ['income_m', 'expenses_m'])); if (!incOk && !miss.length) miss.push('income_m');
          if (!miss.length) {
            var ra = retAge != null ? retAge : o.defaultRetAge, le = LE != null ? LE : o.defaultLifeExp;
            if (retAge == null) addAssump('Retirement age assumed ' + o.defaultRetAge + ' (documented default; please confirm).');
            if (LE == null) addAssump('Life expectancy assumed ' + o.defaultLifeExp + ' (documented default; please confirm).');
            var prof = risk || 'BALANCED'; if (!risk) addAssump('Risk profile assumed BALANCED until you answer the risk questions.');
            var Y = ra - age, surplus = I - f.expenses_m;
            if (Y <= 0) { raw = 10; row.note = 'Retirement age is not after today, so no SIP can close the gap.'; }
            else { var r = retirement({ monthlyExpense: f.expenses_m, yearsToRetire: Y, age: age, lifeExpectancy: le, annualReturn: annualReturn(prof, o.returnSet), fvSavings: 0, fvTagged: f.ret_invest || 0 }); row.sip = r.monthlySip; row.corpus = r.corpus; raw = surplus > 0 ? r.monthlySip / surplus : 10; if (surplus <= 0) row.note = 'No monthly surplus, so the retirement SIP ratio is treated as above 200%.'; }
            if (!num(f.ret_invest)) addAssump('No existing savings are counted towards retirement unless you tag them.');
          }
          break;
        }
        case 'F09': miss = miss.concat(has(f, ['income_m', 'emi_total'])); if (!miss.length) { if (!incOk) miss.push('income_m'); else raw = f.emi_total / I; } break;
        case 'F10': miss = miss.concat(has(f, ['income_m', 'invest_m'])); if (!miss.length) { if (!incOk) miss.push('income_m'); else raw = f.invest_m / I; } break;
        case 'F11': miss = miss.concat(has(f, ['life_cover'])); if (!miss.length) raw = f.life_cover; break;
        case 'F12': miss = miss.concat(has(f, ['health_cover', 'dependants'])); if (!miss.length) { raw = f.health_cover; mid = f.dependants === 0 ? 'health_dep0' : f.dependants <= 2 ? 'health_dep1_2' : 'health_dep3p'; } break;
        case 'F13': miss = miss.concat(has(f, ['d80c'])); if (!miss.length) raw = f.d80c; break;
        case 'F14': miss = miss.concat(has(f, ['d80d'])); if (!miss.length) raw = f.d80d; break;
        case 'F15':
          if (num(f.kids) && f.kids === 0) { if (o.kidsMode === 'skip') { row.status = 'na'; row.note = 'No children, so this factor is left out and the others are re-weighted (spec open question 9).'; out.push(row); return; } }
          miss = miss.concat(has(f, ['kids'])); if (!miss.length) { if (f.kids === 0) raw = 0; else { if (!num(f.kids_planned)) miss.push('kids_planned'); else raw = f.kids_planned ? 0 : 1; } } break;
      }
      if (miss.length || raw === null) { row.status = 'missing'; row.needs = miss; out.push(row); return; }
      var L = lookup(mid, age, raw);
      row.raw = raw; row.unitValue = L.unitValue; row.band = L.band; row.bandLabel = L.bandLabel; row.fscore = L.score; row.ageLabel = L.ageLabel; row.matrix = mid;
      row.points = round(L.score / 10 * fac.max_points, 4); out.push(row);
    });

    var applicable = out.filter(function (r) { return r.status !== 'na'; }), scored = out.filter(function (r) { return r.status === 'scored'; });
    var appW = applicable.reduce(function (s, r) { return s + r.weight; }, 0), scW = scored.reduce(function (s, r) { return s + r.weight; }, 0);
    var scoredMax = scored.reduce(function (s, r) { return s + r.maxPoints; }, 0), pts = scored.reduce(function (s, r) { return s + r.points; }, 0);
    var scale = scoredMax ? 900 / scoredMax : 0, total = round(pts * scale, 2), confidence = appW ? round(scW / appW, 4) : 0;
    scored.forEach(function (r) { r.scaledPoints = round(r.points * scale, 3); r.scaledMax = round(r.maxPoints * scale, 3); r.contribution = round((r.points - 0.5 * r.maxPoints) * scale, 3); r.ratio = r.points / r.maxPoints; });
    if (scored.length && scored.length < applicable.length) addAssump('Early estimate: only the factors you have answered are scored, scaled to 900 (placeholder rule D-B22).');
    var cut = 0.5; // placeholder thresholds for P / N flags (spec gives none; open question 17)
    scored.forEach(function (r) { var fl = (R.action_areas.flags_positive_negative_action[r.name] || '-'); r.flag = r.ratio >= 0.7 && fl.indexOf('P') > -1 ? 'P' : r.ratio <= cut && fl.indexOf('N') > -1 ? 'N' : ''; r.actionArea = r.ratio <= cut && fl.indexOf('A') > -1; });
    var meets = confidence >= 0.5 && scored.length > 0, st = meets ? stageOf(total) : null;
    return { total: total, confidence: confidence, factors: out, scoredCount: scored.length, applicableCount: applicable.length, reference: scored.length ? 450 : 0, assumptions: assumptions, stage: st, stageProvisional: true, early: confidence < 1, enough: meets, message: meets ? message(total) : null, options: o, ageBand: ageKnown ? R.age_bands.labels[ageBand(age)] : null, missing: unique(out.filter(function (r) { return r.status === 'missing'; }).reduce(function (a, r) { return a.concat(r.needs); }, [])) };
  }
  function unique(a) { return a.filter(function (v, i) { return a.indexOf(v) === i; }); }

  var API = { STAGES: STAGES, stageOf: stageOf, message: message, ageBand: ageBand, bandIndex: bandIndex, lookup: lookup, riskProfile: riskProfile, annualReturn: annualReturn, retirement: retirement, lifeNeed: lifeNeed, goalFV: goalFV, sipFor: sipFor, score: score, defaults: DEFAULT_OPTS, rules: R };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.FSEngine = API;
})(typeof window !== 'undefined' ? window : globalThis);
