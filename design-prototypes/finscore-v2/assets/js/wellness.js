/* Financial Wellness + Score Journey */
(function () {
  const F = window.FS, D = F.D, COL = ["#C23B3B", "#D9692B", "#E0962B", "#C2A82B", "#7BBF4A", "#2FB57A", "#1DBA8C", "#0F8F8D"];
  const WHY = {
    savings: ["You save part of income regularly.", "Automate a fixed % on salary day; give each goal its own pot."],
    debt: ["How manageable and costly your loans are.", "Rank debts by interest rate and send extras to the costliest."],
    invest: ["Whether long-term money is working and diversified.", "Learn the basics, then build a regular habit; review allocation twice a year."],
    protection: ["Whether a setback could derail your plans.", "Walk through a protection checklist; talk to a licensed advisor for specifics."],
    goals: ["How clearly your goals are named, dated and funded.", "Name each goal, set a date, and assign a monthly amount."],
    emergency: ["Months of essentials you could cover.", "Build toward 3–6 months in an easy-access, low-risk place."]
  };
  const MAP = [
    ["income", "Income", "wallet", null, "Everything starts here. Stable, growing income widens every other option.", "Feeds your spending and savings."],
    ["spend", "Spending", "chart", "spend", "Where money goes each month. Awareness here frees money for goals.", "Leaves the surplus that becomes savings."],
    ["savings", "Savings", "piggy", "savings", "The monthly surplus you set aside.", "Funds your emergency fund, goals and investments."],
    ["emergency", "Emergency fund", "shield", "emergency", "Months of essentials you could cover.", "Keeps a surprise from forcing debt or selling investments."],
    ["protection", "Protection", "umbrella", "protection", "Cover that shields your plans from big shocks.", "Protects every goal downstream."],
    ["invest", "Investing", "trend", "invest", "Money working over long horizons (returns never guaranteed).", "Grows toward goals and retirement."],
    ["goals", "Goals", "target", "goals", "Named targets with dates and amounts.", "Give your savings and investing a purpose."],
    ["retire", "Retirement", "sun", "retire", "Long-term independence.", "The destination all of the above supports."]
  ];
  let sel = "savings";
  const months = () => { const o = [], d = new Date(); for (let i = 5; i >= 0; i--) { const x = new Date(d.getFullYear(), d.getMonth() - i, 1); o.push(x.toLocaleString("en", { month: "short" })); } return o; };
  const pt = (cx, cy, r, a) => [cx + r * Math.cos(a), cy - r * Math.sin(a)];
  const arc = (a0, a1, r, cx, cy) => { const [x0, y0] = pt(cx, cy, r, a0), [x1, y1] = pt(cx, cy, r, a1); return `M${x0.toFixed(1)} ${y0.toFixed(1)}A${r} ${r} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`; };
  const col = v => v < 40 ? "#D9892B" : v < 65 ? "var(--brand)" : "var(--pos)";

  function gauge(p) {
    const cx = 160, cy = 160, r = 130, st = F.stageOf(p.score), fr = (p.score - 300) / 600;
    const segs = D.stages.map((s, i) => { const a0 = Math.PI - (s.lo - 300) / 600 * Math.PI, a1 = Math.PI - (s.hi + 1 - 300) / 600 * Math.PI; return `<path d="${arc(a0 - .008, a1 + .008, r, cx, cy)}" fill="none" stroke="${COL[i]}" stroke-width="${s === st ? 24 : 16}" stroke-linecap="butt" opacity="${s === st ? 1 : .55}"><title>${s.name}: ${s.lo}–${s.hi}</title></path>`; }).join("");
    return `<svg viewBox="0 0 320 190" width="100%" style="max-width:420px" role="img" aria-label="Score ${p.score} of 900, stage ${st.name}">${segs}<g id="needle" style="transform-origin:${cx}px ${cy}px;transform:rotate(-90deg);transition:transform 1.4s cubic-bezier(.22,.8,.3,1)" data-deg="${-90 + fr * 180}"><path d="M${cx} ${cy - r + 22}L${cx - 6} ${cy}L${cx + 6} ${cy}z" fill="var(--ink)"/><circle cx="${cx}" cy="${cy}" r="9" fill="var(--ink)"/></g><text x="${cx - r}" y="${cy + 22}" text-anchor="middle" font-size="11" fill="var(--muted)">300</text><text x="${cx + r}" y="${cy + 22}" text-anchor="middle" font-size="11" fill="var(--muted)">900</text></svg>`;
  }
  function trend(p) {
    const W = 560, H = 190, pad = 34, h = p.history, mn = Math.min(...h) - 12, mx = Math.max(...h) + 12, X = i => pad + i * (W - pad * 2) / 5, Y = v => H - 30 - (v - mn) / (mx - mn) * (H - 60), ms = months();
    const d = h.map((v, i) => (i ? "L" : "M") + X(i).toFixed(1) + " " + Y(v).toFixed(1)).join("");
    return `<div style="position:relative"><svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Simulated score over six months: ${h.join(", ")}"><defs><linearGradient id="ag" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--brand)" stop-opacity=".28"/><stop offset="1" stop-color="var(--brand)" stop-opacity="0"/></linearGradient></defs>
      <path d="${d}L${X(5)} ${H - 30}L${X(0)} ${H - 30}z" fill="url(#ag)"/><path d="${d}" fill="none" stroke="var(--brand)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1" id="tl"><animate attributeName="stroke-dashoffset" from="1" to="0" dur="1.2s" fill="freeze"/></path>
      ${h.map((v, i) => `<g tabindex="0" class="tp" data-i="${i}" aria-label="${ms[i]} ${v}"><circle cx="${X(i)}" cy="${Y(v)}" r="14" fill="transparent"/><circle cx="${X(i)}" cy="${Y(v)}" r="5" fill="var(--card)" stroke="var(--brand)" stroke-width="3"/></g><text x="${X(i)}" y="${H - 8}" text-anchor="middle" font-size="12" fill="var(--muted)">${ms[i]}</text>`).join("")}</svg><div id="tt" class="pop" style="display:none;pointer-events:none;min-width:0;padding:8px 12px"></div></div>`;
  }

  F.init({
    id: "financial-wellness", title: "Wellness & Score",
    render(p, c) {
      const st = F.stageOf(p.score), nx = D.stages[st.n] || st, dg = F.dims(p), dn = p.score - p.prev;
      const contrib = dg.map(d => ({ l: d.label, v: Math.round((d.v - 50) / 50 * 14) })); const mxv = Math.max(...contrib.map(x => Math.abs(x.v)), 1);
      return `${F.head("Financial Wellness & Score Journey", "One connected picture of your financial health — what's strong, what needs care and what to do next.", `<span class="sim-badge">Simulated score · not an official FinScore</span>`)}
      <div class="grid g2" id="wgrid" style="grid-template-columns:1.1fr 1fr">
        <section class="card" aria-label="Score"><div class="row wrap" style="gap:20px;justify-content:center"><div style="text-align:center;flex:1;min-width:260px">${gauge(p)}<div class="big-num" style="margin-top:-48px"><span data-count="${p.score}">0</span></div><div class="sm muted">out of 900</div></div>
          <div style="flex:1;min-width:220px"><span class="tag">Stage ${st.n} of 8</span><h2 style="margin:8px 0 2px">${st.name}</h2><p class="muted">${st.nick} · band ${st.lo}–${st.hi}</p>
          <div class="split" style="margin-top:14px;gap:10px"><div class="kpi"><b class="${dn >= 0 ? "" : ""}">${dn >= 0 ? "▲" : "▼"} ${Math.abs(dn)}</b><span>vs last month</span></div><div class="kpi"><b>Medium</b><span>Confidence (simulated)</span></div></div>
          ${st.n < 8 ? `<p class="sm" style="margin-top:14px"><strong>${nx.lo - p.score} points</strong> to <strong>${nx.name}</strong>. At this simulated pace, a range of <strong>${Math.max(2, Math.round((nx.lo - p.score) / Math.max(dn, 5)))}–${Math.max(4, Math.round((nx.lo - p.score) / Math.max(dn, 5) * 2))} months</strong>, not guaranteed.</p>` : ""}</div></div></section>
        <section class="card" aria-label="Trend"><div class="card-h"><h3>${F.icon("trend", 20)} Six-month trend</h3><span class="sim-badge">Simulated</span></div>${trend(p)}<p class="xs muted">Hover or focus a point. The score changes from verified actions, never from opening the app.</p></section></div>

      <section class="card" style="margin-top:18px" aria-label="Six dimensions"><div class="card-h"><h3>${F.icon("ring", 20)} Six dimensions of health</h3><span class="xs muted">Select one for the why and how</span></div>
        <div class="grid g3" id="dimgrid">${dg.map(d => `<button class="li" style="flex-direction:column;align-items:stretch;text-align:left;cursor:pointer;border:1px solid var(--line)" data-d="${d.k}" id="dim-${d.k}" aria-expanded="false"><div class="row">${F.ring({ v: d.v, size: 64, stroke: 7, color: col(d.v), fs: 16 })}<div><b>${d.label}</b><br><span class="delta ${d.d > 0 ? "up" : d.d < 0 ? "down" : "flat"}">${d.d > 0 ? "▲" : d.d < 0 ? "▼" : "•"} ${Math.abs(d.d)} vs last month</span></div></div><div class="more sm" hidden style="margin-top:10px"><p><strong>What it is:</strong> ${WHY[d.k][0]}</p><p style="margin-top:6px"><strong>How to improve:</strong> ${WHY[d.k][1]}</p></div></button>`).join("")}</div></section>

      <section class="card" style="margin-top:18px" aria-label="Life map"><div class="card-h"><h3>${F.icon("route", 20)} Your connected financial life</h3><span class="xs muted">Select a node to see how it connects</span></div>
        <div class="row wrap" id="map" style="gap:8px;align-items:stretch">${MAP.map((n, i) => { const v = n[3] === "spend" ? Math.round(100 - p.expenses / p.income * 100 + 20) : n[3] === "retire" ? Math.round((p.dims.invest[0] + p.dims.savings[0]) / 2) : n[3] ? p.dims[n[3]][0] : null; return `<button class="chip" data-n="${n[0]}" style="flex-direction:column;align-items:flex-start;gap:4px;padding:12px 14px;min-width:118px;border-radius:16px;border-color:${v == null ? "var(--line)" : col(v)}">${F.icon(n[2], 20)}<b>${n[1]}</b><span class="xs muted">${v == null ? F.inr(p.income) + "/mo" : v + "/100"}</span></button>${i < MAP.length - 1 ? `<span class="muted hide-s" aria-hidden="true" style="align-self:center">${F.icon("arrow", 16)}</span>` : ""}`; }).join("")}</div>
        <div class="li" id="mapinfo" style="margin-top:14px" aria-live="polite"></div></section>

      <div class="grid g2" style="margin-top:18px">
        <section class="card" aria-label="Score drivers"><div class="card-h"><h3>Why your score is ${p.score}</h3><span class="sim-badge">Simulated</span></div><ul class="list">${contrib.map(x => `<li><div class="row between sm"><span>${x.l}</span><b class="num" style="color:${x.v >= 0 ? "var(--pos)" : "var(--neg)"}">${x.v >= 0 ? "+" : ""}${x.v}</b></div><div style="display:flex;height:10px;border-radius:99px;background:var(--line);overflow:hidden"><div style="width:50%;display:flex;justify-content:flex-end">${x.v < 0 ? `<i style="width:${Math.abs(x.v) / mxv * 100}%;background:var(--neg);display:block"></i>` : ""}</div><div style="width:50%">${x.v > 0 ? `<i style="width:${x.v / mxv * 100}%;background:var(--pos);display:block"></i>` : ""}</div></div></li>`).join("")}</ul><p class="xs muted" style="margin-top:10px">Illustrative contributions relative to an average. Every driver maps to evidence in the real product.</p></section>
        <section class="card" aria-label="What-if"><div class="card-h"><h3>${F.icon("spark", 20)} What if I save a little more?</h3><span class="sim-badge">Simulated</span></div><label class="f">Extra monthly saving: <b id="wv">${F.inr(2000)}</b><input type="range" id="wi" min="0" max="20000" step="500" value="2000" aria-label="Extra monthly saving"></label>
          <div class="li" style="margin-top:14px" aria-live="polite"><span class="ico pos">${F.icon("trend")}</span><div><b id="wo"></b><div class="xs muted">Estimated 3-month effect on the score. A range, not a promise.</div></div></div></section></div>

      <section class="card" style="margin-top:18px" aria-label="Stage ladder"><div class="card-h"><h3>${F.icon("trophy", 20)} Score journey — eight stages</h3><span class="xs muted">Stage names from the product's rulebook</span></div>
        <ol class="list" style="gap:8px">${D.stages.map((s, i) => `<li class="li" style="${s.n === st.n ? "border:1.5px solid " + COL[i] : ""};opacity:${s.n > st.n ? .7 : 1}"><span class="ico" style="background:${COL[i]};color:#fff">${s.n < st.n ? F.icon("check", 18) : s.n === st.n ? F.icon("star", 18) : F.icon("lock", 16)}</span><div style="flex:1"><b>${s.name}</b> <span class="muted sm">· ${s.nick}</span><div class="xs muted">${s.lo}–${s.hi}${s.n === st.n ? " · you are here" : s.n === st.n + 1 ? ` · next unlock in ${s.lo - p.score} points` : ""}</div></div></li>`).join("")}</ol></section>

      <section class="card" style="margin-top:18px" aria-label="Suggestions"><div class="card-h"><h3>${F.icon("check", 20)} Best next steps for ${p.first}</h3><span class="sim-badge">Simulated estimates</span></div><ul class="list">${p.actions.map(a => `<li><a class="li" href="${F.url("daily-activities.html")}"><span class="ico">${F.icon("spark")}</span><span style="flex:1"><b>${a.t}</b><br><span class="xs muted">${a.mins} min · ≈ +${a.pts} pts (range)</span></span>${F.icon("arrow", 16)}</a></li>`).join("")}</ul></section>`;
    },
    after(p, root) {
      requestAnimationFrame(() => requestAnimationFrame(() => { const n = F.$("#needle", root); n.style.transform = `rotate(${n.dataset.deg}deg)`; }));
      const tt = F.$("#tt", root), ms = months();
      F.$$(".tp", root).forEach(g => { const show = () => { const i = +g.dataset.i, c = g.querySelector("circle:last-child"); tt.style.display = "block"; tt.innerHTML = `<b>${ms[i]}</b> · ${p.history[i]} <span class="xs muted">(simulated)</span>`; tt.style.left = (c.cx.baseVal.value / 560 * 100) + "%"; tt.style.top = "0"; tt.style.transform = "translateX(-50%)"; tt.style.right = "auto"; }; g.onmouseenter = show; g.onfocus = show; g.onmouseleave = g.onblur = () => tt.style.display = "none"; });
      F.$$("[data-d]", root).forEach(b => b.onclick = () => { const m = F.$(".more", b); m.hidden = !m.hidden; b.setAttribute("aria-expanded", String(!m.hidden)); });
      const h = location.hash.slice(1); if (h && F.$("#dim-" + h, root)) { const b = F.$("#dim-" + h, root); b.click(); b.scrollIntoView({ block: "center" }); }
      const show = id => { sel = id; const n = MAP.find(x => x[0] === id); F.$$("#map .chip", root).forEach(c => c.classList.toggle("on", c.dataset.n === id)); const i = MAP.indexOf(n); F.$("#mapinfo", root).innerHTML = `<span class="ico">${F.icon(n[2])}</span><div><b>${n[1]}</b><div class="sm">${n[4]}</div><div class="sm muted" style="margin-top:4px">${i > 0 ? "← Fed by " + MAP[i - 1][1] + " · " : ""}${n[5]}</div></div>`; };
      F.$$("[data-n]", root).forEach(b => b.onclick = () => show(b.dataset.n)); show(sel);
      const wi = F.$("#wi", root), upd = () => { const x = +wi.value, e = Math.round(x / p.income * 55), lo = Math.max(0, Math.round(e * .6)), hi = Math.round(e * 1.4) + (x ? 1 : 0); F.$("#wv", root).textContent = F.inr(x); F.$("#wo", root).textContent = x ? `≈ +${lo} to +${hi} points` : "No change"; }; wi.oninput = upd; upd();
    }
  });
})();
