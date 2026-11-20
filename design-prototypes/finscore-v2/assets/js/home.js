/* Home — companion-first homepage */
(function () {
  const F = window.FS, D = F.D;
  const REPLY = { beginner: ["act", "emergency", "healthy"], young: ["act", "score", "focus"], investor: ["invest", "invest", "invest"], family: ["act", "healthy", "emergency"], saver: ["act", "focus", "none"] };
  const EXIST = { "Mutual Funds": "Existing Finscore product area", Equity: "Existing Finscore product area", Insurance: "Existing Finscore product area", Loans: "Existing Finscore product area" };
  const weekDots = p => { const L = "SMTWTFS", t = new Date().getDay(); return Array.from({ length: 7 }, (_, i) => { const back = 6 - i, d = (t - back + 7) % 7; return { l: L[d], on: back === 0 ? F.doneToday() : back - 1 < p.streak, today: back === 0 }; }); };
  const status = p => { const d = p.score - p.prev; return d >= 15 ? ["Improving fast", "trend"] : d > 0 ? ["Growing steadily", "trend"] : d === 0 ? ["Holding steady", "check"] : ["Needs attention", "bell"]; };
  let typed = null;

  function qa() {
    const prim = [["ai-companion", "AI Coach", "Ask anything", "chat", "ai"], ["financial-games", "Learn & Play", "Games, spins, cards", "gamepad"], ["financial-wellness", "Financial Score", "Your simulated score", "ring"], ["goals-planning", "Goals", "Plan & track", "target"]];
    const mid = [["financial-wellness", "My Money", "Income, spend, savings", "wallet"], ["investment-simulator", "Investments", "Practice safely", "trend"], ["goals-planning", "Financial Planning", "Roadmaps", "route"], ["goals-planning#retirement", "Retirement Planning", "Long-term view", "sun"]];
    const ex = [["Mutual Funds", "layers"], ["Equity", "chart"], ["Insurance", "umbrella"], ["Loans", "bank"]];
    return `<div class="qa">${prim.map(x => `<a class="prim" href="${F.url(x[0] + ".html")}"><span class="ico ${x[4] || ""}">${F.icon(x[3])}</span><b>${x[1]}</b><span>${x[2]}</span></a>`).join("")}</div>
      <h4 class="muted sm" style="margin:18px 0 10px">Manage your money</h4><div class="qa">${mid.map(x => { const [f, h] = x[0].split("#"); return `<a href="${F.url(f + ".html")}${h ? "#" + h : ""}"><span class="ico">${F.icon(x[3])}</span><b>${x[1]}</b><span>${x[2]}</span></a>`; }).join("")}</div>
      <button class="chip" id="more-qa" aria-expanded="false" style="margin-top:16px">${F.icon("plus", 14)} Existing Finscore products</button>
      <div id="qa-more" hidden><div class="qa" style="margin-top:12px">${ex.map(x => `<a href="#" data-ex="${x[0]}"><span class="ico">${F.icon(x[1])}</span><b>${x[0]}</b><span>Existing product</span></a>`).join("")}</div></div>`;
  }

  F.init({
    id: "home-companion", title: "Companion Home",
    render(p, c) {
      const [st, si] = status(p), stg = F.stageOf(p.score), lv = F.lvl(p), a = F.act(p.activity), done = F.doneList().includes(a.id), dg = F.dims(p), dn = p.score - p.prev;
      const avg = Math.round(dg.reduce((s, d) => s + d.v, 0) / 6), avgPrev = Math.round(dg.reduce((s, d) => s + d.prev, 0) / 6);
      const nb = D.badges.find(b => !F.unlocked(b.id)), strk = F.streak(p);
      const nbp = !nb ? 100 : nb.flag === "streak7" ? strk / 7 * 100 : nb.flag === "streak30" ? strk / 30 * 100 : nb.flag === "learner" ? 40 : 0;
      return `
      <section class="hero" aria-label="Greeting"><div class="row between wrap" style="gap:24px;position:relative;z-index:1">
        <div style="max-width:560px"><div class="row wrap"><span class="tag">${F.icon(si, 14)} Wellness: ${st}</span><span class="sim-badge" style="background:rgba(255,255,255,.2);color:#fff;border-color:transparent">Simulated</span></div>
          <h1 style="margin:14px 0 8px">${F.greet()}, ${p.first}!</h1><p>${p.line}</p>
          <div class="row wrap" style="margin-top:16px"><span class="tag">${F.icon("flame", 14)} ${strk}-day streak</span><span class="tag">${F.icon("star", 14)} Level ${lv.n} · ${lv.name}</span><span class="tag">${p.tag}</span></div></div>
        <div style="text-align:right"><div class="xs" style="opacity:.85">Simulated Finscore · stage ${stg.n} of 8</div><div class="big-num"><span data-count="${p.score}">0</span><span style="font-size:.35em;opacity:.7">/900</span></div>
          <div style="margin-top:4px" class="sm"><strong>${stg.name}</strong> · ${stg.nick} · <span aria-label="${dn >= 0 ? "up" : "down"} ${Math.abs(dn)} points">${dn >= 0 ? "▲" : "▼"} ${Math.abs(dn)}</span> vs last month</div></div></div></section>

      <div class="home-cols" style="margin-top:18px"><div class="stack">
        <section class="card o1" aria-label="AI companion" style="border:1.5px solid color-mix(in srgb,var(--ai) 35%,var(--line))"><div class="row" style="align-items:flex-start;gap:14px"><div class="orb talk" id="orb" aria-hidden="true"></div>
          <div style="flex:1;min-width:0"><div class="row between wrap"><div class="row"><h3>Fin · your companion</h3><span class="tag ai">${F.icon("spark", 12)} Simulated AI</span></div><a class="sm b" href="${F.url("ai-companion.html")}" style="color:var(--ai-ink)">Open conversation →</a></div>
            <div class="bub" style="margin:12px 0;background:var(--ai-soft);border-color:transparent;border-bottom-left-radius:6px" aria-live="polite"><span id="aimsg" class="cursor"></span></div>
            <div class="row wrap" id="qr">${p.ai.quick.map((q, i) => `<button class="chip" data-q="${i}">${q}</button>`).join("")}</div>
            <form class="composer" id="ask" style="border:0;padding-top:12px"><input aria-label="Ask Fin anything" placeholder="Ask Fin about this simulated profile…" id="askin"><button class="btn ai" type="submit" aria-label="Ask">${F.icon("send", 18)} <span class="hide-s">Ask AI</span></button></form>
            <p class="xs muted" style="margin-top:8px">Fin only knows what's in this demo profile. Educational, not investment advice.</p></div></div></section>

        <section class="card o2" aria-label="Today's activity"><div class="card-h"><h3>${F.icon("spark", 20)} Today's financial activity</h3><span class="tag">Recommended for ${p.first}</span></div>
          <div class="row" style="align-items:flex-start;gap:16px"><span class="ico lg">${F.icon(a.icon, 28)}</span><div style="flex:1"><h3>${a.title}</h3><p class="muted sm" style="margin:4px 0 10px">${a.desc}</p>
            <div class="row wrap sm"><span class="tag">${F.icon("clock", 12)} ${a.mins} min</span><span class="tag ${a.diff === "Easy" ? "pos" : "warn"}">${a.diff}</span><span class="tag ai">+${a.pts} virtual points</span></div>
            <p class="xs muted" style="margin-top:10px"><strong>Why it matters:</strong> ${a.value}</p></div></div>
          <div class="row between wrap" style="margin-top:16px;gap:12px"><div style="flex:1;min-width:160px">${F.bar(done ? 100 : 0)}<div class="xs muted" style="margin-top:6px">${done ? "Completed today" : "0 of 1 recommended today"}</div></div>
            ${done ? `<span class="tag pos">${F.icon("check", 12)} Done</span><a class="btn ghost sm" href="${F.url("daily-activities.html")}">More activities</a>` : `<button class="btn" id="startact">Start · ${a.mins} min</button>`}</div></section>

        <section class="card o5" aria-label="Insights"><div class="card-h"><h3>${F.icon("brain", 20)} Personalised insights</h3><span class="sim-badge">Simulated</span></div>
          <ul class="list">${D.insights[p.id].map(i => `<li><a class="li" href="${F.url(i.href)}"><span class="ico ${i.type === "watch" ? "warn" : i.type === "good" ? "pos" : ""}">${F.icon(i.type === "watch" ? "bell" : i.type === "good" ? "check" : "info", 18)}</span><span style="flex:1"><b>${i.t}</b><br><span class="sm muted">${i.b}</span></span><span class="sm b hide-s" style="color:var(--brand-ink);white-space:nowrap">${i.cta} →</span></a></li>`).join("")}</ul></section>
      </div>

      <div class="stack">
        <section class="card o3" aria-label="Financial wellness"><div class="card-h"><h3>${F.icon("ring", 20)} Financial wellness</h3><span class="sim-badge">Simulated</span></div>
          <div class="row" style="margin-bottom:14px"><div class="kpi"><b>${avg}<span class="muted" style="font-size:14px">/100</span></b><span>Wellness index</span></div><span class="delta ${avg >= avgPrev ? "up" : "down"}">${avg >= avgPrev ? "▲" : "▼"} ${Math.abs(avg - avgPrev)} vs last month</span></div>
          <div class="rings6">${dg.map(d => `<button class="ring-w" data-dim="${d.k}" aria-label="${d.label} ${d.v} of 100">${F.ring({ v: d.v, size: 74, stroke: 8, color: d.v < 40 ? "#D9892B" : d.v < 65 ? "var(--brand)" : "var(--pos)", fs: 18 })}<span class="xs b">${d.label}</span><span class="delta ${d.d > 0 ? "up" : d.d < 0 ? "down" : "flat"}">${d.d > 0 ? "▲" : d.d < 0 ? "▼" : "•"} ${Math.abs(d.d)}</span></button>`).join("")}</div>
          <a class="btn soft sm" style="margin-top:14px;width:100%" href="${F.url("financial-wellness.html")}">Full wellness breakdown</a></section>

        <section class="card o4" aria-label="Your financial journey"><div class="card-h"><h3>${F.icon("compass", 20)} Your financial journey</h3><a class="sm b" style="color:var(--brand-ink)" href="${F.url("achievement-center.html")}">Achievements →</a></div>
          <div class="row" style="gap:16px">${F.ring({ v: Math.round(lv.into / lv.next * 100), size: 84, stroke: 9, color: "var(--accent)", label: "level progress", count: false, text: lv.n, fs: 22 })}<div><div class="b" style="font-size:17px">${lv.name}</div><div class="sm muted">${lv.into} / ${lv.next} points to level ${lv.n + 1}</div><div class="xs muted">Points track progress — no cash value.</div></div></div>
          <h4 class="sm muted" style="margin:16px 0 8px">Weekly streak</h4><div class="week" role="img" aria-label="${strk} day streak">${weekDots(p).map(d => `<span class="${d.on ? "on" : ""} ${d.today ? "today" : ""}"><i>${d.on ? F.icon("check", 14) : ""}</i>${d.l}</span>`).join("")}</div>
          ${nb ? `<div class="li" style="margin-top:16px"><span class="ico ai">${F.icon(nb.icon)}</span><div style="flex:1"><div class="xs muted">Next to unlock</div><b>${nb.name}</b><div class="xs muted">${nb.desc}</div>${F.bar(nbp, "ai")}</div></div>` : ""}</section>

        <section class="card o6" aria-label="Goals and learning"><div class="card-h"><h3>${F.icon("target", 20)} Goals & learning</h3></div>
          <ul class="list">${p.goals.slice(0, 3).map(g => { const v = Math.round(g.saved / g.target * 100); return `<li><div class="row between sm"><b>${g.name}</b><span class="num">${v}%</span></div>${F.bar(v)}<div class="xs muted">${F.cpt(g.saved)} of ${F.cpt(g.target)} · ${g.due}</div></li>`; }).join("")}</ul>
          <h4 class="sm muted" style="margin:16px 0 8px">Learn next (for ${p.tag})</h4><div class="row wrap">${p.learn.map(l => `<a class="chip" href="${F.url("daily-activities.html")}">${l}</a>`).join("")}</div></section>
      </div></div>

      <section class="card o7" style="margin-top:18px" aria-label="Quick access"><div class="card-h"><h3>${F.icon("grid", 20)} Quick access</h3><span class="xs muted">Grouped by what you'd do next</span></div>${qa()}</section>`;
    },
    after(p, root) {
      const el = F.$("#aimsg", root), msg = p.ai.msg.replace(/^Good morning/, F.greet()), reduce = F.reduce();
      clearInterval(typed); if (reduce) { el.textContent = msg; el.classList.remove("cursor"); F.$("#orb", root).classList.remove("talk"); } else { let i = 0; typed = setInterval(() => { el.textContent = msg.slice(0, ++i); if (i >= msg.length) { clearInterval(typed); el.classList.remove("cursor"); F.$("#orb", root).classList.remove("talk"); } }, 16); }
      const start = F.$("#startact", root); if (start) start.onclick = () => F.runActivity(p.activity, () => F.rerender());
      F.$$("[data-q]", root).forEach(b => b.onclick = () => { const k = REPLY[p.id][+b.dataset.q]; if (k === "act") F.runActivity(p.activity, () => F.rerender()); else if (k === "none") F.toast("No problem — I'll check in tomorrow."); else location.href = F.url("ai-companion.html") + "?ask=" + k; });
      F.$("#ask", root).onsubmit = e => { e.preventDefault(); const v = F.$("#askin", root).value.trim(); location.href = F.url("ai-companion.html") + "?q=" + encodeURIComponent(v || "What should I focus on this month?"); };
      F.$$("[data-dim]", root).forEach(b => b.onclick = () => location.href = F.url("financial-wellness.html") + "#" + b.dataset.dim);
      const mq = F.$("#more-qa", root); mq.onclick = () => { const h = F.$("#qa-more", root); h.hidden = !h.hidden; mq.setAttribute("aria-expanded", String(!h.hidden)); };
      F.$$("[data-ex]", root).forEach(a => a.onclick = e => { e.preventDefault(); const n = a.dataset.ex; F.modal(`<span class="tag warn">Existing product · not rebuilt in this prototype</span><h2 style="margin:10px 0">${n}</h2><p>In the integrated app, this tile would open the existing <strong>${n}</strong> experience. V2 only changes how users <em>arrive</em> there: the companion surfaces a reason first (e.g. an insight or recommended activity), then deep-links in.</p><p class="sm muted" style="margin-top:10px">Assumption: these product areas exist outside this prototype; nothing about their features is shown or invented here.</p>`, { label: n }); });
    }
  });
})();
