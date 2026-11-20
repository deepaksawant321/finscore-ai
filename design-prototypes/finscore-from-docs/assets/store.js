/* Prototype state: financial memory (versioned facts with provenance), score versions, XP ledger, nudges, goals, family.
   Browser-local only (localStorage in try/catch). No network. XP lives here and is never an input to FSEngine (principle P6). */
(function (root) {
  'use strict';
  var E = root.FSEngine, M = root.FSModel, KEY = 'fsd.v1';
  var RANK = { USER_STATED: 5, CONNECTED: 5, DERIVED: 3, ESTIMATED: 2, INFERRED: 1, STALE: 0 };
  var DAY = 864e5;
  function fresh() {
    return { facts: {}, chat: [], problem: '', intents: [], mode: 'problem', pendingKey: null, skipped: [], proposals: [], scores: [], opts: { savingsVariant: 'master', kidsMode: 'skip', returnSet: 'live' }, riskAnswers: null,
      actions: { suggested: {}, done: {}, snoozes: 0 }, xp: [], badges: [], weeksActive: [], nudges: { dismissed: {}, snoozed: {}, log: [], limit: 1, shown: {} }, goals: [], family: [], daysShift: 0, demo: false, dnaHistory: {}, revealed: false, seen: {}, ledgerNote: '' };
  }
  var S = fresh(), mem = null;
  function load() { try { var raw = localStorage.getItem(KEY); if (raw) { var o = JSON.parse(raw), f = fresh(); Object.keys(f).forEach(function (k) { S[k] = o[k] !== undefined ? o[k] : f[k]; }); return; } } catch (e) { /* blocked */ } if (mem) S = mem; }
  function save() { mem = S; try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* storage blocked: keep in memory */ } }
  function reset() { S = fresh(); mem = null; try { localStorage.removeItem(KEY); } catch (e) { /* blocked */ } save(); }
  var now = function () { return Date.now() + S.daysShift * DAY; };
  var today = function () { return new Date(now()).toISOString().slice(0, 10); };

  function values() { var v = {}; Object.keys(S.facts).forEach(function (k) { v[k] = S.facts[k].value; }); var r = riskInfo(); if (r) v.risk_profile_name = r.name; return v; }
  function riskInfo() { return S.riskAnswers ? E.riskProfile(S.riskAnswers) : null; }
  function setFact(key, value, source, reason) {
    var cur = S.facts[key], src = source || 'USER_STATED';
    if (cur && cur.value !== value && RANK[src] < RANK[cur.source]) return { conflict: true, existing: cur };
    if (cur && cur.value === value) { cur.ts = now(); cur.source = RANK[src] >= RANK[cur.source] ? src : cur.source; save(); return { changed: false }; }
    var f = cur || { history: [], version: 0 }; if (cur) f.history.push({ value: cur.value, ts: cur.ts, source: cur.source, reason: reason || '' });
    f.value = value; f.source = src; f.ts = now(); f.version = (f.version || 0) + 1; S.facts[key] = f; save(); return { changed: true, previous: cur ? cur.value : null };
  }
  function removeFact(key) { delete S.facts[key]; save(); }
  function meta() { return S.facts; }
  function stale(key) { return M.isStale(key, S.facts[key], now()); }

  function evaluate(extra) { return E.score(extra || values(), S.opts); }
  /** Store a score version with factor-level contributions (FR-SCORE-04) whenever the result materially changed. */
  function snapshot(reason, force) {
    var r = evaluate(); if (!r.scoredCount) return null; var last = S.scores[S.scores.length - 1];
    var pts = {}; r.factors.forEach(function (f) { if (f.status === 'scored') pts[f.id] = { points: f.points, scaled: f.scaledPoints, fscore: f.fscore, band: f.bandLabel, name: f.name, contribution: f.contribution }; });
    if (!force && last && last.total === r.total && last.confidence === r.confidence) return last;
    var v = { ts: now(), total: r.total, confidence: r.confidence, reason: reason || 'Update', factors: pts, version: S.scores.length + 1 }; S.scores.push(v); save(); return v;
  }
  /** FR-EXP-02: compare two versions and list only material changes (|change| >= 3 points or a factor entering or leaving). */
  function diff(a, b) {
    var out = [], ids = {}; Object.keys(a.factors).concat(Object.keys(b.factors)).forEach(function (k) { ids[k] = 1; });
    Object.keys(ids).forEach(function (id) { var x = a.factors[id], y = b.factors[id]; if (x && y) { var d = y.scaled - x.scaled; if (Math.abs(d) >= 3) out.push({ id: id, name: y.name, delta: Math.round(d * 10) / 10, why: x.band !== y.band ? 'moved from "' + x.band + '" to "' + y.band + '"' : 'scale changed with how much is measured' }); } else if (y && !x) out.push({ id: id, name: y.name, delta: y.scaled, why: 'now scored (new information)' }); else if (x && !y) out.push({ id: id, name: x.name, delta: -x.scaled, why: 'no longer scored' }); });
    return out.sort(function (p, q) { return Math.abs(q.delta) - Math.abs(p.delta); });
  }

  /* ---- XP ledger: idempotent, capped, never an input to the score (FR-GAME-01, P6). Point values are PROPOSED. ---- */
  var XPT = { confirm_fact: { xp: 10, cap: 3, label: 'Confirmed a fact' }, answer_risk: { xp: 20, cap: 1, label: 'Completed the risk questions' }, complete_action: { xp: 40, cap: 2, label: 'Completed an action' }, review_why: { xp: 5, cap: 1, label: 'Reviewed why your score is what it is' }, fix_stale: { xp: 10, cap: 2, label: 'Refreshed an out-of-date fact' }, weekly_check: { xp: 15, cap: 1, label: 'Weekly check-in' } };
  function award(type, uniq) {
    var def = XPT[type]; if (!def) return false; var id = type + ':' + (uniq || today()), day = today();
    if (S.xp.some(function (x) { return x.id === id; })) return false;
    var cnt = S.xp.filter(function (x) { return x.type === type && x.day === day; }).length; if (cnt >= def.cap) return false;
    S.xp.push({ id: id, type: type, xp: def.xp, label: def.label, ts: now(), day: day }); save(); return def;
  }
  function xpTotal() { return S.xp.reduce(function (s, x) { return s + x.xp; }, 0); }
  function level() { var t = xpTotal(), L = M.LEVELS, i = 0; while (i + 1 < L.length && t >= L[i + 1]) i++; var next = L[i + 1]; return { n: i + 1, total: t, into: t - L[i], need: next ? next - L[i] : 1, max: i === L.length - 1 }; }
  var BADGES = [['truth', 'Truth Teller', 'Confirm your first fact', function () { return Object.keys(S.facts).length >= 1; }], ['firstscore', 'First FinScore', 'See your first score', function () { return S.scores.length >= 1; }], ['risk', 'Know Thyself', 'Answer the risk questions', function () { return !!S.riskAnswers; }], ['action', 'Doer', 'Complete a recommended action', function () { return Object.keys(S.actions.done).length >= 1; }], ['full', 'Full Picture', 'Measure all applicable factors', function () { var r = evaluate(); return r.scoredCount > 0 && r.confidence === 1; }], ['fresh', 'Fresh Facts', 'Refresh an out-of-date fact', function () { return S.xp.some(function (x) { return x.type === 'fix_stale'; }); }]];
  function badges() { return BADGES.map(function (b) { return { id: b[0], name: b[1], how: b[2], earned: b[3]() }; }); }
  function touchWeek() { var d = new Date(now()), y = d.getUTCFullYear(), w = Math.floor((d - Date.UTC(y, 0, 1)) / (7 * DAY)), k = y + '-W' + w; if (S.weeksActive.indexOf(k) < 0) { S.weeksActive.push(k); save(); } }
  /** Weekly cadence: a missed week pauses the count, it never resets it (D-B19). */
  function cadence() { return { weeks: S.weeksActive.length, paused: false }; }

  /** Sample profile, clearly marked as demo data. */
  function loadDemo() {
    reset(); S.demo = true; var D = { age: 32, income_m: 140000, expenses_m: 52000, emi_total: 24000, loans_total: 1800000, invest_m: 18000, equity: 900000, debt: 600000, other_assets: 350000, goals_n: 3, life_cover: 5000000, health_cover: 500000, dependants: 2, kids: 1, kids_planned: 0, d80c: 90000, d80d: 12000 };
    S.problem = 'Can I retire at 55 and still afford my child\'s education?'; S.intents = M.classify(S.problem); S.revealed = true;
    Object.keys(D).forEach(function (k) { setFact(k, D[k], 'USER_STATED', 'Sample profile'); S.facts[k].ts = now() - 20 * DAY; }); setFact('ret_age', 55, 'USER_STATED'); snapshot('Sample profile loaded', true);
    S.chat.push({ who: 'ai', text: 'Sample profile loaded (dummy data). Your question: "' + S.problem + '". Open Home to see your reveal.', ts: now() });
    S.weeksActive = ['w1', 'w2', 'w3']; save();
  }

  load();
  root.FSStore = { get state() { return S; }, save: save, reset: reset, now: now, today: today, values: values, meta: meta, setFact: setFact, removeFact: removeFact, stale: stale, evaluate: evaluate, snapshot: snapshot, diff: diff, award: award, xpTotal: xpTotal, level: level, badges: badges, touchWeek: touchWeek, cadence: cadence, riskInfo: riskInfo, loadDemo: loadDemo, XPT: XPT, RANK: RANK, DAY: DAY };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.FSStore;
})(typeof window !== 'undefined' ? window : globalThis);
