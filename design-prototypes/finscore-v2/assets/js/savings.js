/* Savings Goal Adventure */
(function () {
  const F = window.FS; let gi = 0, lastKey = '';
  const add = () => { const e = F.S.extra; e.sv = e.sv || {}; return (e.sv[F.S.profile] = e.sv[F.S.profile] || {}); };
  const D0 = "M40 240C130 240 120 170 210 170S290 90 370 90S450 40 520 40";
  const MS = [[0, "Start"], [25, "Quarter way"], [50, "Halfway"], [75, "Nearly there"], [100, "Goal reached"]];
  const saved = (g) => Math.min(g.target, g.saved + (add()[g.id] || 0));
  const months = (g, p) => { const rem = g.target - saved(g); if (rem <= 0) return null; const m = g.monthly || 1000; return [Math.max(1, Math.floor(rem / m * .8)), Math.ceil(rem / m * 1.2)]; };
  const fut = n => { const d = new Date(); d.setMonth(d.getMonth() + n); return d.toLocaleString("en", { month: "short", year: "numeric" }); };
  let pos = 0;
  function place(root, pct, instant) {
    const path = F.$("#route", root), L = path.getTotalLength(), w = F.$("#walker", root);
    const set = v => { const pt = path.getPointAtLength(L * v / 100); w.setAttribute("transform", `translate(${pt.x},${pt.y})`); };
    F.$("#fill", root).setAttribute("stroke-dashoffset", String(L * (1 - pct / 100)));
    if (instant || F.reduce()) { pos = pct; set(pct); return; } const from = pos, t0 = performance.now(); (function s(t) { const k = Math.min(1, (t - t0) / 1100), e = 1 - Math.pow(1 - k, 3); pos = from + (pct - from) * e; set(pos); if (k < 1) requestAnimationFrame(s); })(t0);
  }
  F.init({
    id: "savings-adventure", title: "Savings Adventure",
    render(p) {
      gi = Math.min(gi, p.goals.length - 1); const g = p.goals[gi], s = saved(g), pct = Math.round(s / g.target * 100), mo = months(g, p);
      return `${F.head("Savings Goal Adventure", "Turn a goal into a journey you can see. Add a simulated deposit and watch your progress move.", `<span class="sim-badge">Simulated · no real money moves</span>`)}
      <div class="tabs" role="tablist" style="margin-bottom:16px">${p.goals.map((x, i) => `<button role="tab" aria-selected="${i === gi}" data-g="${i}">${x.name}</button>`).join("")}</div>
      <div class="grid" style="grid-template-columns:1.7fr 1fr;align-items:start" id="sgrid"><section class="card" aria-label="Goal path"><div class="row between wrap"><div class="row"><span class="ico lg">${F.icon(g.icon, 26)}</span><div><h2>${g.name}</h2><p class="muted sm">Target date: ${g.due}</p></div></div><div style="text-align:right"><div class="big-num" style="font-size:40px"><span data-count="${pct}" data-suf="%">0</span></div><div class="sm muted">${F.inr(s)} of ${F.inr(g.target)}</div></div></div>
        <svg viewBox="0 0 560 280" width="100%" role="img" aria-label="Goal path, ${pct} percent complete" style="margin-top:8px"><path d="${D0}" fill="none" stroke="var(--line)" stroke-width="16" stroke-linecap="round"/><path id="route" d="${D0}" fill="none" stroke="transparent" stroke-width="1"/><path id="fill" d="${D0}" fill="none" stroke="url(#sg)" stroke-width="16" stroke-linecap="round" stroke-dasharray="2000" stroke-dashoffset="2000" style="transition:stroke-dashoffset 1.1s cubic-bezier(.22,.8,.3,1)"/><defs><linearGradient id="sg" x1="0" x2="1"><stop offset="0" stop-color="#0F8F8D"/><stop offset="1" stop-color="#1DBA8C"/></linearGradient></defs><g id="nodes"></g><g id="walker"><circle r="15" fill="var(--accent)" opacity=".25"/><circle r="9" fill="var(--accent)" stroke="var(--card)" stroke-width="3"/></g></svg>
        <div class="row wrap" style="margin-top:6px"><button class="btn" data-dep="1000">+ ₹1,000</button><button class="btn" data-dep="5000">+ ₹5,000</button>${g.monthly ? `<button class="btn soft" data-dep="${g.monthly}">+ monthly ${F.inr(g.monthly)}</button>` : ""}<button class="btn ghost sm" id="undo">Reset path</button></div></section>
      <aside class="stack"><section class="card pad-s"><h4>Pace & projection <span class="sim-badge">Simulated</span></h4>${mo ? `<p class="sm" style="margin-top:8px">At ${F.inr(g.monthly)}/month, this goal would complete between <strong>${fut(mo[0])}</strong> and <strong>${fut(mo[1])}</strong>.</p><p class="xs muted" style="margin-top:6px">A range, not a promise. Assumes steady deposits and no returns.</p>` : `<p class="sm" style="margin-top:8px"><strong>Goal reached.</strong> Consider where the monthly amount goes next.</p>`}</section>
        <section class="card pad-s"><h4>Milestones</h4><ul class="list" style="margin-top:10px">${MS.map(m => `<li class="row"><span class="ico ${pct >= m[0] ? "pos" : ""}" style="width:32px;height:32px">${F.icon(pct >= m[0] ? "check" : "lock", 14)}</span><span class="sm"><b>${m[1]}</b><br><span class="xs muted">${F.inr(g.target * m[0] / 100)}</span></span></li>`).join("")}</ul></section></aside></div>`;
    },
    after(p, root) {
      const g = p.goals[gi], pct = Math.round(saved(g) / g.target * 100), path = F.$("#route", root), L = path.getTotalLength(); F.$("#fill", root).setAttribute("stroke-dasharray", L); F.$("#fill", root).setAttribute("stroke-dashoffset", L);
      F.$("#nodes", root).innerHTML = MS.map(m => { const pt = path.getPointAtLength(L * m[0] / 100); return `<g transform="translate(${pt.x},${pt.y})"><circle r="11" fill="${pct >= m[0] ? "var(--brand)" : "var(--card)"}" stroke="${pct >= m[0] ? "var(--brand)" : "var(--line)"}" stroke-width="3"/><text y="-20" text-anchor="middle" font-size="11" font-weight="700" fill="var(--muted)">${m[0]}%</text></g>`; }).join("");
      const kk = p.id + gi; pos = 0; place(root, pct, lastKey === kk); lastKey = kk;
      F.$$("[data-g]", root).forEach(b => b.onclick = () => { gi = +b.dataset.g; F.rerender(); });
      F.$$("[data-dep]", root).forEach(b => b.onclick = () => {
        const before = Math.round(saved(g) / g.target * 100), A = add(); A[g.id] = (A[g.id] || 0) + (+b.dataset.dep); F.save(); const after = Math.round(saved(g) / g.target * 100);
        F.$("#route", root); place(root, after); F.$("[data-count]", root).textContent = after + "%"; F.addXP(2); F.flag("first");
        const hit = MS.filter(m => m[0] > 0 && before < m[0] && after >= m[0]).pop();
        setTimeout(() => { if (hit) { F.flag("milestone"); F.confetti(); F.modal(`<div style="text-align:center"><div class="unlock-badge">${F.icon("target", 44)}</div><span class="tag pos">Milestone</span><h2 style="margin:8px 0">${hit[1]}!</h2><p class="muted">${hit[0]}% of <strong>${g.name}</strong> reached in this simulation. Real progress comes from real, consistent deposits.</p><button class="btn" style="margin-top:16px" data-ok>Keep going</button></div>`, { label: "Milestone" }).el.querySelector("[data-ok]").onclick = () => F.$(".scrim").remove(); } F.rerender(); }, F.reduce() ? 0 : 1200);
      });
      F.$("#undo", root).onclick = () => { delete add()[g.id]; F.save(); F.rerender(); };
    }
  });
})();
