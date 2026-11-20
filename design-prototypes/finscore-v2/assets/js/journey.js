/* Financial Independence Journey */
(function () {
  const F = window.FS;
  const LOAN = { young: ["Education loan", 38, "₹9,500 EMI"], family: ["Home loan", 22, "₹48,000 EMI"] };
  const RET = [["Start early", "Time does much of the heavy lifting; small early amounts matter."], ["Contribute steadily", "Regular, automated contributions beat occasional big ones."], ["Respect inflation", "Prices rise; long-term money must outpace that, with risk."], ["Stay the course", "Staying invested through dips matters. Never guaranteed."]];
  const ret = () => { const e = F.S.extra; e.ret = e.ret || {}; return (e.ret[F.S.profile] = e.ret[F.S.profile] || []); };
  F.init({
    id: "financial-journey", title: "Independence Journey",
    render(p, c) {
      const d = p.dims, rl = ret(), em = p.emMonths;
      const S = [
        { n: "Emergency fund", ic: "shield", v: Math.min(100, Math.round(em / 6 * 100)), ms: [["1 month covered", em >= 1], ["3 months covered", em >= 3], ["6 months covered", em >= 6]], act: "d-emerg" },
        { n: "Costly debt under control", ic: "bank", v: d.debt[0], ms: [["Know every rate and EMI", d.debt[0] >= 40], ["EMI below ~35% of income", p.emi / p.income < .35], ["Extras go to costliest first", d.debt[0] >= 75]], act: "w-debt" },
        { n: "Protection basics", ic: "umbrella", v: d.protection[0], ms: [["List dependants & needs", d.protection[0] >= 30], ["Health cover reviewed", d.protection[0] >= 50], ["Life cover adequacy checked", d.protection[0] >= 70]], act: "w-insurance" },
        { n: "Savings habit & targets", ic: "piggy", v: d.savings[0], ms: [["Save something every month", d.savings[0] >= 30], ["Save ~20% of income", d.savings[0] >= 60], ["Automated & goal-labelled", d.savings[0] >= 80]], act: "d-save" },
        { n: "Investing habit", ic: "trend", v: d.invest[0], ms: [["Learn the basics", d.invest[0] >= 15], ["Regular long-term habit", d.invest[0] >= 45], ["Diversified & reviewed", d.invest[0] >= 75]], act: "d-invest" },
        { n: "Retirement & freedom plan", ic: "sun", v: Math.round((d.goals[0] + d.invest[0]) / 2), ms: [["Retirement age & need sketched", d.goals[0] >= 40], ["Projection reviewed (ranges)", d.goals[0] >= 60], ["Corpus on track", d.invest[0] >= 70 && d.goals[0] >= 65]], act: "d-goal" }
      ];
      const cur = S.findIndex(s => s.v < 70), pct = Math.round(S.reduce((a, s) => a + s.v, 0) / S.length), ln = LOAN[p.id];
      return `${F.head("Financial Independence Journey", "One route, six stations. See how emergency fund, debt, protection, savings and investing connect to freedom — in the order that usually helps most.", `<span class="sim-badge">Simulated</span>`)}
      <section class="hero"><div class="row between wrap" style="position:relative;z-index:1;gap:16px"><div><span class="tag">Journey ${pct}% complete (simulated)</span><h2 style="margin:10px 0 4px">${cur < 0 ? "All stations reached — keep reviewing" : "You're at station " + (cur + 1) + ": " + S[cur].n}</h2><p>${p.name} · ${c.stage} stage · ${p.focus}</p></div><div style="width:min(280px,100%)">${F.bar(pct)}<div class="xs" style="margin-top:6px;opacity:.9">Stage ${F.stageOf(p.score).n} of 8 on the Finscore stage ladder</div></div></div></section>
      <div class="grid" style="grid-template-columns:1.6fr 1fr;margin-top:18px;align-items:start" id="jgrid"><section class="card"><div class="timeline">${S.map((s, i) => { const st = s.v >= 70 ? "done" : i === cur ? "now" : ""; return `<div class="tl ${st}"><div class="row between wrap" style="gap:8px"><div class="row"><span class="ico ${st === "done" ? "pos" : st === "now" ? "ai" : ""}">${F.icon(st === "done" ? "check" : s.ic, 18)}</span><div><b>Station ${i + 1} · ${s.n}</b><div class="xs muted">${st === "done" ? "Reached" : st === "now" ? "You are here" : "Ahead"}</div></div></div><span class="num b">${s.v}%</span></div>${F.bar(s.v, st === "now" ? "ai" : "")}<ul class="list sm" style="margin-top:10px;gap:4px">${s.ms.map(m => `<li class="row" style="gap:8px;color:${m[1] ? "var(--ink)" : "var(--muted)"}">${F.icon(m[1] ? "check" : "lock", 14)} ${m[0]}</li>`).join("")}</ul>${s.v < 100 ? `<button class="btn soft sm" style="margin-top:10px" data-run="${s.act}">Take the next step</button>` : ""}</div>`; }).join("")}</div></section>
      <aside class="stack">
        ${ln ? `<section class="card pad-s"><h4>Debt reduction <span class="sim-badge">Simulated</span></h4><p class="sm muted">${ln[0]} · ${ln[2]}</p><div style="margin:10px 0">${F.bar(ln[1])}</div><p class="sm"><strong>${ln[1]}%</strong> repaid. Prepay vs invest is a trade-off, not a rule — learn it first.</p></section>` : `<section class="card pad-s"><h4>Debt reduction</h4><p class="sm muted">No active loan is recorded in this simulated profile.</p></section>`}
        <section class="card pad-s"><h4 id="retirement">Retirement education</h4><p class="sm muted" style="margin:4px 0 10px">Concepts only. Tap to mark learned.</p><div class="list">${RET.map((r, i) => `<button class="li" style="text-align:left;border:0;cursor:pointer;width:100%;${rl.includes(i) ? "background:var(--pos-soft)" : ""}" data-ret="${i}"><span class="ico ${rl.includes(i) ? "pos" : ""}" style="width:30px;height:30px">${F.icon(rl.includes(i) ? "check" : "book", 14)}</span><span><b class="sm">${r[0]}</b><br><span class="xs muted">${r[1]}</span></span></button>`).join("")}</div></section>
        <section class="card pad-s"><h4>Financial freedom, defined by you</h4><p class="sm muted" style="margin-top:6px">Freedom isn't a number everyone shares. It's when your essential spending is covered without depending on one paycheque. See your goals to set your own definition.</p><a class="btn ghost sm" style="margin-top:12px" href="${F.url("goals-planning.html")}">Open goals & planning</a></section></aside></div>`;
    },
    after(p, root) {
      F.$$("[data-run]", root).forEach(b => b.onclick = () => F.runActivity(b.dataset.run, () => F.rerender()));
      F.$$("[data-ret]", root).forEach(b => b.onclick = () => { const L = ret(), i = +b.dataset.ret; if (!L.includes(i)) { L.push(i); F.addXP(4, "Concept learned"); F.flag("first"); } F.save(); F.rerender(); });
    }
  });
})();
