/* Data layer for "ask less, confirm more": simulated connectors, a real in-browser bank-statement reader with a deterministic categoriser,
   and a parser for pasted bank messages. No network. Connector payloads are DUMMY data; the statement reader works on whatever CSV you give it. */
(function (root) {
  'use strict';
  var round = function (v, d) { var p = Math.pow(10, d || 0); return Math.round(v * p) / p; };

  /* ---- simulated sources (what a real integration would return, as dummy data) ---- */
  var SOURCES = [
    { id: 'aa', name: 'Bank accounts', via: 'Account Aggregator', kind: 'consent', shares: 'Income, spending, EMIs and SIPs from 6 months of transactions (read-only)', scope: '6 months of transactions, read-only, for 12 months', facts: [['income_m', 140000], ['expenses_m', 52000], ['emi_total', 24000], ['invest_m', 18000]], prov: 'Bank accounts via Account Aggregator (simulated)' },
    { id: 'bureau', name: 'Credit report', via: 'Credit bureau (soft check)', kind: 'consent', shares: 'Your loans, balances and EMIs. A soft check does not affect your credit score', scope: 'One-time report', facts: [['loans_total', 1800000], ['emi_total', 24000]], prov: 'Credit bureau report (simulated)' },
    { id: 'cas', name: 'Mutual funds and demat', via: 'Consolidated account statement', kind: 'document', shares: 'Value of your equity and debt fund holdings', scope: 'Latest statement', facts: [['equity', 900000], ['debt', 250000, true]], prov: 'Mutual fund statement (simulated)' },
    { id: 'epf', name: 'EPF and NPS', via: 'Passbook', kind: 'document', shares: 'Your provident fund and pension balances', scope: 'Latest passbook', facts: [['debt', 350000, true]], prov: 'EPF and NPS passbook (simulated)' },
    { id: 'policy', name: 'Insurance policies', via: 'Policy documents', kind: 'document', shares: 'Life and health cover amounts and premiums', scope: 'Policies you choose', facts: [['life_cover', 5000000], ['health_cover', 500000]], prov: 'Insurance policy documents (simulated)' },
    { id: 'tax', name: 'Tax documents', via: 'Form 16 or annual tax statement', kind: 'document', shares: 'Section 80C and 80D amounts for the year', scope: 'Latest financial year', facts: [['d80c', 90000], ['d80d', 12000]], prov: 'Tax documents (simulated)' },
    { id: 'id', name: 'Identity', via: 'Government document wallet', kind: 'document', shares: 'Your date of birth, to work out your age', scope: 'Date of birth only', facts: [['age', 32]], prov: 'Identity document (simulated)' }
  ];

  /* ---- CSV ---- */
  function splitLine(line) { var out = [], cur = '', q = false; for (var i = 0; i < line.length; i++) { var c = line[i]; if (c === '"') { if (q && line[i + 1] === '"') { cur += '"'; i++; } else q = !q; } else if ((c === ',' || c === '\t') && !q) { out.push(cur.trim()); cur = ''; } else cur += c; } out.push(cur.trim()); return out; }
  function num(s) { if (s == null) return null; var t = String(s).replace(/[₹,]|rs\.?|inr|\s/gi, '').replace(/(cr|dr)$/i, ''); if (t === '' || t === '-') return null; var v = parseFloat(t); return isNaN(v) ? null : v; }
  var MON = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
  function pdate(s) { s = String(s || '').trim(); var m; if ((m = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/.exec(s))) return Date.UTC(+m[1], +m[2] - 1, +m[3]); if ((m = /^(\d{1,2})[-/ ](\d{1,2})[-/ ](\d{2,4})/.exec(s))) return Date.UTC(+m[3] < 100 ? 2000 + +m[3] : +m[3], +m[2] - 1, +m[1]); if ((m = /^(\d{1,2})[-/ ]([A-Za-z]{3})[a-z]*[-/ ,]*(\d{2,4})/.exec(s))) return Date.UTC(+m[3] < 100 ? 2000 + +m[3] : +m[3], MON[m[2].toLowerCase()], +m[1]); return null; }
  function parseCSV(text) {
    var lines = String(text || '').split(/\r?\n/).filter(function (l) { return l.trim(); }); if (lines.length < 2) return { rows: [], err: 'I need a header row and at least one transaction.' };
    var hi = 0; for (var i = 0; i < Math.min(lines.length, 8); i++) if (/date/i.test(lines[i]) && /(desc|narr|partic|detail|remark)/i.test(lines[i])) { hi = i; break; }
    var H = splitLine(lines[hi]).map(function (h) { return h.toLowerCase(); }), ix = function (re) { for (var k = 0; k < H.length; k++) if (re.test(H[k])) return k; return -1; };
    var d = ix(/date/), n = ix(/(desc|narr|partic|detail|remark)/), dr = ix(/(debit|withdraw|\bdr\b)/), cr = ix(/(credit|deposit|\bcr\b)/), am = ix(/^amount|amt/), ty = ix(/(type|dr\/cr|cr\/dr)/);
    if (d < 0 || n < 0 || (dr < 0 && cr < 0 && am < 0)) return { rows: [], err: 'I could not find date, description and amount columns. Expected headers like Date, Description, Debit, Credit.' };
    var rows = []; for (var j = hi + 1; j < lines.length; j++) { var c = splitLine(lines[j]), t = pdate(c[d]); if (t === null) continue; var debit = dr > -1 ? num(c[dr]) : null, credit = cr > -1 ? num(c[cr]) : null; if (debit === null && credit === null && am > -1) { var a = num(c[am]), isCr = ty > -1 ? /cr/i.test(c[ty]) : a > 0; if (a !== null) { if (isCr) credit = Math.abs(a); else debit = Math.abs(a); } } if ((debit || 0) === 0 && (credit || 0) === 0) continue; rows.push({ t: t, desc: c[n] || '', debit: debit && debit > 0 ? debit : 0, credit: credit && credit > 0 ? credit : 0 }); }
    return { rows: rows, err: rows.length ? null : 'I could not read any transactions from that.' };
  }

  /* ---- deterministic categoriser (rules, not an AI guess) ---- */
  var RE = { salary: /(salary|\bsal\b|payroll|wages)/i, selfx: /(self transfer|own account|transfer to (savings|fd|rd)|sweep|fd (booking|creation)|a\/c transfer)/i, emi: /(\bemi\b|loan (repay|instal)|ach d.*(loan|finance)|nach.*(loan|finance)|home loan|car loan|personal loan)/i, invest: /(\bsip\b|mutual fund|\bmf\b|bse star|zerodha|groww|coin|\bppf\b|\bnps\b|systematic)/i, ins: /(insurance|\blic\b|premium|star health|hdfc life|icici pru|max life|policy)/i, card: /(credit card|cc payment|card payment|cred club)/i, othercr: /(interest|refund|cashback|reversal|dividend|reward)/i };
  function categorise(r) { if (r.credit) return RE.selfx.test(r.desc) ? 'transfer' : RE.salary.test(r.desc) ? 'salary' : 'other_credit'; if (RE.selfx.test(r.desc)) return 'transfer'; if (RE.emi.test(r.desc)) return 'emi'; if (RE.invest.test(r.desc)) return 'invest'; if (RE.ins.test(r.desc)) return 'insurance'; if (RE.card.test(r.desc)) return 'card'; return 'spend'; }
  var LAB = { salary: 'Salary credits', emi: 'Loan EMIs', invest: 'Investments (SIPs)', insurance: 'Insurance premiums', card: 'Credit card bills', spend: 'Everyday spending', other_credit: 'Other credits (not counted as income)', transfer: 'Own-account transfers (ignored)' };
  function readStatement(text) {
    var p = parseCSV(text); if (p.err) return { ok: false, err: p.err }; var rows = p.rows, tot = {}, cnt = {}, min = Infinity, max = -Infinity;
    rows.forEach(function (r) { r.cat = categorise(r); var amt = r.credit || r.debit; tot[r.cat] = (tot[r.cat] || 0) + amt; cnt[r.cat] = (cnt[r.cat] || 0) + 1; if (r.t < min) min = r.t; if (r.t > max) max = r.t; });
    var seen = {}; rows.forEach(function (r) { var d = new Date(r.t); seen[d.getUTCFullYear() * 12 + d.getUTCMonth()] = 1; });
    var months = Math.max(1, Object.keys(seen).length), pm = function (k) { return (tot[k] || 0) / months; }, conf = months >= 3 ? .9 : months >= 2 ? .75 : .55, facts = [], notes = [];
    if (tot.salary) facts.push({ key: 'income_m', value: Math.round(pm('salary') / 100) * 100, confidence: conf, evidence: cnt.salary + ' salary credit' + (cnt.salary > 1 ? 's' : '') + ' over ' + months + ' months' }); else notes.push('No salary credits were recognised, so I did not guess your income.');
    var exp = pm('spend') + pm('insurance') + pm('card'); facts.push({ key: 'expenses_m', value: Math.round(exp / 100) * 100, confidence: conf - .05, evidence: (cnt.spend || 0) + ' everyday, ' + (cnt.insurance || 0) + ' insurance and ' + (cnt.card || 0) + ' card payments, averaged over ' + months + ' months' });
    facts.push({ key: 'emi_total', value: Math.round(pm('emi') / 100) * 100, confidence: tot.emi ? conf : .6, evidence: tot.emi ? cnt.emi + ' EMI debit' + (cnt.emi > 1 ? 's' : '') + ' over ' + months + ' months' : 'No EMI debits seen in this account' });
    facts.push({ key: 'invest_m', value: Math.round(pm('invest') / 100) * 100, confidence: tot.invest ? conf : .6, evidence: tot.invest ? cnt.invest + ' investment debit' + (cnt.invest > 1 ? 's' : '') + ' over ' + months + ' months' : 'No SIP debits seen in this account (you may invest elsewhere)' });
    if (months < 2) notes.push('Only about ' + months + ' month of data, so these averages are less reliable.'); if (tot.other_credit) notes.push('Credits that are not salary were left out of income.');
    return { ok: true, months: months, rows: rows, tot: tot, cnt: cnt, labels: LAB, facts: facts, notes: notes };
  }
  /** A realistic dummy statement for the last three months, so people can try the reader without a file. */
  function sampleStatement(nowTs) {
    var d0 = new Date(nowTs), L = ['Date,Description,Debit,Credit'], f = function (y, m, d) { return String(d).padStart(2, '0') + '/' + String(m + 1).padStart(2, '0') + '/' + y; };
    for (var k = 3; k >= 1; k--) { var dt = new Date(Date.UTC(d0.getUTCFullYear(), d0.getUTCMonth() - k, 1)), y = dt.getUTCFullYear(), m = dt.getUTCMonth(), r = function (d, s, a, c) { L.push(f(y, m, d) + ',"' + s + '",' + (a || '') + ',' + (c || '')); };
      r(1, 'SALARY CR ACME TECH PVT LTD', 0, 140000); r(2, 'RENT TRANSFER TO LANDLORD', 25000); r(3, 'ACH D HDFC HOME LOAN EMI', 16000); r(3, 'ACH D BAJAJ AUTO LOAN EMI', 8000); r(5, 'SIP BSE STAR MF 7788', 18000); r(6, 'UPI GROCERIES BIGBASKET', 4200); r(9, 'ELECTRICITY AND BROADBAND BILL', 4500); r(11, 'UPI SWIGGY ZOMATO DINING', 5500); r(14, 'FUEL PUMP CARD SWIPE', 3000); r(17, 'UPI GROCERIES DMART', 4800); r(20, 'SHOPPING AMAZON ONLINE', 5000); r(26, 'INTEREST CREDIT SAVINGS', 0, 640); if (k === 2) r(15, 'STAR HEALTH INSURANCE PREMIUM', 12000); }
    return L.join('\n');
  }

  /* ---- pasted bank messages (optional, off by default in the UI) ---- */
  var SAMPLE_MSGS = ['Rs 1,40,000.00 credited to your A/c XX4821 on 01-Nov by SALARY ACME TECH. Avl bal Rs 2,31,442.', 'Rs 18,000.00 debited from A/c XX4821 on 05-Nov towards SIP BSE STAR MF. Not you? Call your bank.', 'Your premium of Rs 14,200 for policy 3319XXXX is due on 28-Nov. Please keep funds ready.'];
  function parseMessages(text) {
    var out = { signals: [], facts: [] }, lines = String(text || '').split(/\n+/).filter(function (l) { return l.trim(); });
    lines.forEach(function (l) { var m = /(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d+)?)/i.exec(l); if (!m) return; var a = Math.round(parseFloat(m[1].replace(/,/g, '')));
      if (/credited/i.test(l) && RE.salary.test(l)) { out.signals.push('Salary credit of ' + a.toLocaleString('en-IN')); out.facts.push({ key: 'income_m', value: a, confidence: .6, evidence: 'One salary message. Please confirm it is your monthly take-home.' }); }
      else if (/debited/i.test(l) && RE.invest.test(l)) { out.signals.push('Investment debit of ' + a.toLocaleString('en-IN')); out.facts.push({ key: 'invest_m', value: a, confidence: .5, evidence: 'One investment debit. Please confirm your monthly total.' }); }
      else if (/debited/i.test(l) && RE.emi.test(l)) out.signals.push('EMI debit of ' + a.toLocaleString('en-IN') + ' (one loan, not your total)');
      else if (/premium/i.test(l)) out.signals.push('Insurance premium of ' + a.toLocaleString('en-IN') + ' (a reminder, not a cover amount)'); });
    return out;
  }

  var API = { SOURCES: SOURCES, parseCSV: parseCSV, readStatement: readStatement, sampleStatement: sampleStatement, parseMessages: parseMessages, SAMPLE_MSGS: SAMPLE_MSGS, LAB: LAB };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.FSData = API;
})(typeof window !== 'undefined' ? window : globalThis);
