/* Premium experience — simulated, no payments */
(function () {
  const F = window.FS; let yearly = false;
  const ROWS = [
    ["Financial education & knowledge cards", 1, 1, 1], ["Daily activities, streaks & achievements", 1, 1, 1], ["Wellness score & six dimensions", 1, 1, 1], ["Basic goals & savings adventure", 1, 1, 1], ["Quiz Arena & simulator (core)", 1, 1, 1], ["AI companion — everyday questions", 1, 1, 1],
    ["Advanced AI coach (deeper follow-ups, memory)", 0, 1, 1], ["Detailed wellness analysis & drivers over time", 0, 1, 1], ["Personalised 12-month improvement roadmap", 0, 1, 1], ["Monthly financial review report (PDF)", 0, 1, 1],
    ["Goal-planning intelligence (multi-goal trade-offs)", 0, 0, 1], ["Household / family view", 0, 0, 1], ["Personalised learning journeys", 0, 0, 1]
  ];
  F.init({
    id: "premium-experience", title: "Premium",
    render(p) {
      const T = [["Essentials", "Free, always", "Everything you need to build healthy money habits.", 0], ["Companion Plus", yearly ? "₹— / yr" : "₹— / mo", "A coach that remembers and analyses deeply.", 1], ["Companion Premium", yearly ? "₹— / yr" : "₹— / mo", "Plan the whole household's financial life.", 2]];
      const on = F.S.extra.prem;
      return `${F.head("Premium Experience", "Premium adds depth and personal analysis. It never gates basic financial education or essential wellness features.", `<span class="sim-badge">Concept · no payments</span>`)}
      <section class="card" style="border:1.5px solid var(--brand)"><div class="row"><span class="ico pos lg">${F.icon("shield", 26)}</span><div><h3>Always free — our trust promise</h3><p class="sm muted">Financial education, your wellness score, daily activities, basic goals, streaks and everyday AI answers stay free. Premium is for going deeper, never for basic help.</p></div></div></section>
      <div class="row between wrap" style="margin:22px 0 14px"><h2>Compare plans</h2><div class="tabs"><button aria-selected="${!yearly}" data-y="0">Monthly</button><button aria-selected="${yearly}" data-y="1">Yearly</button></div></div>
      <div class="grid g3">${T.map((t, i) => `<article class="card" style="${i === 1 ? "border:2px solid var(--accent)" : ""}">${i === 1 ? '<span class="tag ai" style="position:absolute;top:-11px;right:18px">Most useful for most users</span>' : ""}<h3>${t[0]}</h3><div class="big-num" style="font-size:30px;margin:10px 0 4px">${t[1]}</div><p class="xs muted">${i ? "Pricing not decided — placeholder only" : ""}</p><p class="sm" style="margin:10px 0 16px">${t[2]}</p>${i ? `<button class="btn ${i === 1 ? "" : "ghost"}" data-prev="${i}">Preview ${t[0]}</button>` : `<span class="tag pos">${F.icon("check", 12)} You have this</span>`}</article>`).join("")}</div>
      <section class="card" style="margin-top:18px;overflow:auto"><table class="cmp"><thead><tr><th scope="col">Feature</th><th scope="col">Essentials</th><th scope="col">Plus</th><th scope="col">Premium</th></tr></thead><tbody>${ROWS.map(r => `<tr><td>${r[0]}</td>${r.slice(1).map(v => `<td>${v ? `<span class="sr">Included</span><span style="color:var(--pos)">${F.icon("check", 18)}</span>` : `<span class="sr">Not included</span><span class="muted">—</span>`}</td>`).join("")}</tr>`).join("")}</tbody></table></section>
      ${on ? `<section class="card" style="margin-top:18px"><div class="card-h"><h3>${F.icon("route", 20)} Personalised 12-month roadmap · preview</h3><span class="tag ai">Simulated · ${on === 2 ? "Premium" : "Plus"}</span></div><div class="timeline">${[["Months 1–3", p.actions[0].t], ["Months 4–6", p.actions[1].t], ["Months 7–9", "Review " + p.goals[0].name + " pace and adjust the monthly amount"], ["Months 10–12", "Annual review: stage, goals and protection"]].map((s, i) => `<div class="tl ${i === 0 ? "now" : ""}"><b>${s[0]}</b><div class="sm muted">${s[1]}</div></div>`).join("")}</div>${on === 2 ? `<div class="li" style="margin-top:14px"><span class="ico ai">${F.icon("users", 18)}</span><div class="sm"><b>Household view</b><br>Compare goals across members and test "what if one income pauses?" scenarios (concept).</div></div>` : ""}<p class="xs muted" style="margin-top:12px">Sample content generated from the simulated profile. Nothing was purchased.</p></section>` : ""}
      <section class="card" style="margin-top:18px"><h3>Principles</h3><ul class="sm" style="padding-left:18px;margin-top:8px;display:flex;flex-direction:column;gap:6px"><li>No countdown timers, no fake scarcity, no dark patterns.</li><li>Cancel anytime and keep everything you've earned.</li><li>Premium unlocks depth of analysis — not dignity or safety.</li></ul></section>`;
    },
    after(p, root) {
      F.$$("[data-y]", root).forEach(b => b.onclick = () => { yearly = b.dataset.y === "1"; F.rerender(); });
      F.$$("[data-prev]", root).forEach(b => b.onclick = () => { F.S.extra.prem = +b.dataset.prev; F.save(); F.toast("Previewing — no payment taken"); F.rerender(); setTimeout(() => { const s = F.$$(".card", F.$("#main")).find(c => /roadmap/.test(c.textContent)); s && s.scrollIntoView({ behavior: F.reduce() ? "auto" : "smooth", block: "center" }); }, 600); });
    }
  });
})();
