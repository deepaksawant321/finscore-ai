/* Daily / weekly / monthly activities, AI coach plan, knowledge cards */
(function () {
  const F = window.FS, D = F.D; let tab = "daily";
  const plan = () => { const e = F.S.extra; e.plan = e.plan || {}; return (e.plan[F.S.profile] = e.plan[F.S.profile] || []); };
  const WHY = { daily: "A few minutes a day builds the habit. Pick one.", weekly: "A slower weekly rhythm for review and reflection.", monthly: "Step back, see the month, plan the next." };
  F.init({
    id: "daily-activities", title: "Daily Activities",
    render(p) {
      const list = D.activities.filter(a => a.type === tab), done = F.doneList(), nd = list.filter(a => done.includes(a.id)).length, rec = F.act(p.activity), pl = plan();
      return `${F.head("Daily Activities", "A reason to return that's actually useful. Short, meaningful activities — never points for the sake of points.", `<div class="row"><span class="tag">${F.icon("flame", 12)} ${F.streak(p)}-day streak</span><span class="tag ai">${F.icon("star", 12)} ${F.xpTotal(p)} pts</span></div>`)}
      <section class="card" aria-label="Recommended" style="border:1.5px solid color-mix(in srgb,var(--brand) 45%,var(--line))"><div class="row wrap between" style="gap:16px"><div class="row" style="gap:14px"><span class="ico lg">${F.icon(rec.icon, 26)}</span><div><span class="tag">Recommended for ${p.tag}</span><h3 style="margin-top:6px">${rec.title}</h3><p class="sm muted">${rec.desc}</p></div></div><button class="btn" data-run="${rec.id}">${done.includes(rec.id) ? "Revisit" : "Start"} · ${rec.mins} min</button></div></section>

      <div class="row between wrap" style="margin:22px 0 14px;gap:12px"><div class="tabs" role="tablist">${["daily", "weekly", "monthly"].map(t => `<button role="tab" aria-selected="${t === tab}" data-t="${t}">${t[0].toUpperCase() + t.slice(1)}</button>`).join("")}</div><div class="sm muted" style="min-width:200px;flex:0 1 260px"><div class="row between"><span>${WHY[tab]}</span></div></div></div>
      <div class="row" style="margin-bottom:12px"><div style="flex:1">${F.bar(list.length ? nd / list.length * 100 : 0)}</div><span class="sm muted num">${nd}/${list.length} completed</span></div>
      <div class="grid g-auto" id="alist" style="grid-template-columns:repeat(auto-fill,minmax(280px,1fr))">${list.map(a => `<article class="card pad-s" style="display:flex;flex-direction:column;gap:10px"><div class="row"><span class="ico ${done.includes(a.id) ? "pos" : ""}">${F.icon(done.includes(a.id) ? "check" : a.icon, 20)}</span><div style="flex:1"><b>${a.title}</b></div></div><p class="sm muted">${a.desc}</p><div class="row wrap"><span class="tag">${F.icon("clock", 11)} ${a.mins} min</span><span class="tag ${a.diff === "Easy" ? "pos" : a.diff === "Hard" ? "neg" : "warn"}">${a.diff}</span><span class="tag ai">+${a.pts}</span></div><p class="xs muted"><strong>Value:</strong> ${a.value}</p><button class="btn ${done.includes(a.id) ? "ghost" : ""} sm" style="margin-top:auto" data-run="${a.id}">${done.includes(a.id) ? "Completed · revisit" : "Start"}</button></article>`).join("")}</div>

      <div class="grid g2" style="margin-top:22px;align-items:start">
        <section class="card" aria-label="AI coach plan"><div class="card-h"><h3>${F.icon("spark", 20)} Fin's action plan for today</h3><span class="tag ai">AI-generated · simulated</span></div>
          <p class="sm muted" style="margin-bottom:12px">Tailored to ${p.tag}: ${p.focus}.</p><div class="list">${p.actions.map((a, i) => `<label class="check" style="${pl.includes(i) ? "background:var(--pos-soft);border-color:var(--pos)" : ""}"><input type="checkbox" data-pl="${i}" ${pl.includes(i) ? "checked" : ""}><span style="flex:1">${a.t}<br><span class="xs muted">${a.mins} min · +${Math.round(a.pts / 2)} pts</span></span></label>`).join("")}</div>
          <div style="margin-top:12px">${F.bar(pl.length / 3 * 100, "ai")}<div class="xs muted" style="margin-top:6px">${pl.length} of 3 done${pl.length === 3 ? " — plan complete 🎉" : ""}</div></div></section>
        <section class="card" aria-label="Knowledge cards"><div class="card-h"><h3>${F.icon("book", 20)} One-minute knowledge cards</h3><span class="xs muted">Swipe →</span></div>
          <div class="swipe" tabindex="0" aria-label="Knowledge cards">${D.cards.map((k, i) => `<div class="kc" data-k="${i}"><span class="tag">${k.tag}</span><h3>${k.t}</h3><p style="opacity:.92">${k.b}</p><button class="btn sm" data-kq="${i}">Quick check</button></div>`).join("")}</div></section></div>`;
    },
    after(p, root) {
      F.$$("[data-t]", root).forEach(b => b.onclick = () => { tab = b.dataset.t; F.rerender(); });
      F.$$("[data-run]", root).forEach(b => b.onclick = () => F.runActivity(b.dataset.run, () => F.rerender()));
      F.$$("[data-pl]", root).forEach(c => c.onchange = () => { const L = plan(), i = +c.dataset.pl; if (c.checked && !L.includes(i)) { L.push(i); F.addXP(Math.round(p.actions[i].pts / 2), "Plan task done"); F.flag("first"); if (L.length === 3) F.confetti(); } else if (!c.checked) { L.splice(L.indexOf(i), 1); } F.save(); F.rerender(); });
      F.$$("[data-kq]", root).forEach(b => b.onclick = () => {
        const k = D.cards[+b.dataset.kq], el = b.parentElement; el.innerHTML = `<span class="tag">Check</span><h3>${k.q.q}</h3><div class="list">${k.q.o.map((o, i) => `<button class="opt" style="color:var(--ink)" data-a="${i}">${o}</button>`).join("")}</div><p class="sm" id="r" aria-live="polite"></p>`;
        F.$$("[data-a]", el).forEach(o => o.onclick = () => { const ok = +o.dataset.a === k.q.a; F.$$("[data-a]", el).forEach(x => { x.disabled = true; if (+x.dataset.a === k.q.a) x.classList.add("right"); }); if (!ok) o.classList.add("wrong"); F.$("#r", el).textContent = ok ? "Correct — nicely done!" : "Not quite — the highlighted answer is right. Come back to it later."; if (ok) F.addXP(3); });
      });
    }
  });
})();
