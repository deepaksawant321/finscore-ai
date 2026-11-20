/* Learn & Play hub: Fitness Challenge, Spin & Learn, Personality Test */
(function () {
  const F = window.FS, D = F.D; let tab = new URLSearchParams(location.search).get("tab") || "fit", rot = 0, spinning = false, pq = null;
  const fit = () => { const e = F.S.extra; e.fit = e.fit || {}; return (e.fit[F.S.profile] = e.fit[F.S.profile] || {}); };
  const spins = () => { const e = F.S.extra; e.sp = e.sp || {}; const k = F.S.profile + new Date().toDateString(); e.sp[k] = e.sp[k] || 0; return [e.sp, k]; };
  const CH = [
    { g: "Daily challenges", items: [{ id: "c1", t: "Log today's spending once", n: 1, pts: 5 }, { id: "c2", t: "Move any amount toward a goal", n: 1, pts: 8 }, { id: "c3", t: "Read one knowledge card", n: 1, pts: 4 }] },
    { g: "Weekly missions", items: [{ id: "m1", t: "Save on 5 days this week", n: 5, pts: 30 }, { id: "m2", t: "Finish 3 learning activities", n: 3, pts: 25 }, { id: "m3", t: "A week without impulse buys", n: 7, pts: 40 }] },
    { g: "Improvement goals", items: [{ id: "i1", t: "Raise emergency cover by half a month", n: 4, pts: 60 }, { id: "i2", t: "Review top 3 expense categories", n: 3, pts: 20 }] }
  ];
  const COLS = ["#0F8F8D", "#5A55D6", "#1DBA8C", "#B87820", "#0A6665", "#7A76F0", "#14A97D", "#9A5A12"];

  function wheel() {
    const n = D.spin.length, R = 150, a = 360 / n;
    return `<div style="position:relative;width:min(340px,100%);margin:0 auto"><svg viewBox="-160 -160 320 320" width="100%" role="img" aria-label="Spin and learn wheel"><g id="wheel" style="transition:transform 4s cubic-bezier(.12,.7,.1,1)">${D.spin.map((s, i) => { const a0 = (i * a - 90 - a / 2) * Math.PI / 180, a1 = ((i + 1) * a - 90 - a / 2) * Math.PI / 180, x0 = R * Math.cos(a0), y0 = R * Math.sin(a0), x1 = R * Math.cos(a1), y1 = R * Math.sin(a1), mid = (i * a), tx = 96 * Math.cos((mid - 90) * Math.PI / 180), ty = 96 * Math.sin((mid - 90) * Math.PI / 180); return `<path d="M0 0L${x0.toFixed(1)} ${y0.toFixed(1)}A${R} ${R} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}z" fill="${COLS[i]}" stroke="var(--card)" stroke-width="3"/><text x="${tx.toFixed(1)}" y="${ty.toFixed(1)}" fill="#fff" font-size="13" font-weight="700" text-anchor="middle" dominant-baseline="middle" transform="rotate(${mid} ${tx.toFixed(1)} ${ty.toFixed(1)})">${s.label}</text>`; }).join("")}</g><circle r="26" fill="var(--card)" stroke="var(--line)" stroke-width="3"/><text y="1" text-anchor="middle" dominant-baseline="middle" font-size="11" font-weight="800" fill="var(--ink)">SPIN</text></svg><svg style="position:absolute;top:-8px;left:50%;transform:translateX(-50%)" width="30" height="36" viewBox="0 0 30 36" aria-hidden="true"><path d="M15 34L3 8a14 14 0 0 1 24 0z" fill="var(--ink)"/></svg></div>`;
  }

  function fitView(p) {
    const f = fit();
    return CH.map(g => `<section class="card" style="margin-bottom:16px"><div class="card-h"><h3>${g.g}</h3>${g.g === "Daily challenges" ? `<span class="tag">${F.icon("flame", 12)} ${F.streak(p)}-day streak</span>` : ""}</div><ul class="list">${g.items.map(c => { const v = f[c.id] || 0, d = v >= c.n; return `<li class="li" style="align-items:center"><span class="ico ${d ? "pos" : ""}">${F.icon(d ? "check" : "target", 18)}</span><div style="flex:1;min-width:0"><b>${c.t}</b><div class="row" style="margin-top:6px">${F.bar(v / c.n * 100, d ? "" : "ai")}<span class="xs muted num" style="white-space:nowrap">${v}/${c.n}</span></div><span class="xs muted">Reward: +${c.pts} points (progress only, no cash)</span></div><button class="btn sm ${d ? "ghost" : ""}" data-fit="${c.id}" ${d ? "disabled" : ""}>${d ? "Done" : "+1 check-in"}</button></li>`; }).join("")}</ul></section>`).join("");
  }
  function spinView(p) { const [sp, k] = spins(); return `<div class="grid g2" style="align-items:center"><div class="card" style="text-align:center">${wheel()}<button class="btn" id="spin" style="margin-top:14px" ${sp[k] >= 3 ? "disabled" : ""}>${sp[k] >= 3 ? "Come back tomorrow" : "Spin & learn"}</button><p class="xs muted" style="margin-top:8px">${3 - sp[k]} spins left today · learning rewards only, no prizes or cash</p></div><div class="card" id="spinres" aria-live="polite"><h3>${F.icon("spark", 20)} What will you learn?</h3><p class="muted" style="margin-top:8px">Spin the wheel for a tip, concept, mini quiz or challenge. Healthy by design: three spins a day.</p></div></div>`; }
  function persView(p) {
    const done = (F.S.extra.persona || {})[F.S.profile];
    if (pq && pq.i < D.personality.q.length) { const q = D.personality.q[pq.i]; return `<section class="card" style="max-width:640px;margin:0 auto"><div class="row between"><span class="tag">Question ${pq.i + 1} of ${D.personality.q.length}</span><span class="sim-badge">Simulated</span></div>${F.bar((pq.i) / D.personality.q.length * 100)}<h2 style="margin:18px 0">${q.q}</h2><div class="list">${q.o.map((o, i) => `<button class="opt" data-po="${i}">${o[0]}</button>`).join("")}</div></section>`; }
    const key = pq ? Object.entries(pq.s).sort((a, b) => b[1] - a[1])[0][0] : done;
    if (key) { const r = D.personality.r[key]; return `<section class="card" style="max-width:640px;margin:0 auto;text-align:center"><span class="tag ai">Your simulated money personality</span><h2 style="margin:12px 0">${r.n}</h2><p>${r.d}</p><p class="sm muted" style="margin:10px 0 16px">${r.tip}</p><div class="row wrap" style="justify-content:center"><a class="btn" href="${F.url(r.href)}">${r.cta}</a><button class="btn ghost" id="retake">Retake</button></div><p class="xs muted" style="margin-top:12px">A light-hearted learning tool — not a clinical or financial assessment.</p></section>`; }
    return `<section class="card" style="max-width:640px;margin:0 auto;text-align:center"><div class="ico lg" style="margin:0 auto">${F.icon("user", 28)}</div><h2 style="margin:12px 0 6px">Financial Personality Test</h2><p class="muted">Five quick questions about how you handle money. You'll get a friendly profile with a learning suggestion.</p><button class="btn" id="pstart" style="margin-top:16px">Start · 1 minute</button></section>`;
  }

  F.init({
    id: "financial-games", title: "Learn & Play",
    render(p) {
      return `${F.head("Learn & Play", "Mature, useful play: challenges, spins and assessments that teach — no cash prizes, no gambling mechanics.", `<span class="sim-badge">Simulated</span>`)}
      <div class="grid g4" style="margin-bottom:20px">${[["quiz-arena", "Quiz Arena", "Timed MCQs with explanations", "brain"], ["savings-adventure", "Savings Adventure", "A goal path with milestones", "route"], ["investment-simulator", "Investment Simulator", "Practice with virtual money", "trend"], ["daily-activities", "Knowledge Cards", "One-minute swipeable lessons", "book"]].map(x => `<a class="card pad-s" style="text-decoration:none" href="${F.url(x[0] + ".html")}"><span class="ico">${F.icon(x[3])}</span><h4 style="margin-top:10px">${x[1]}</h4><p class="xs muted">${x[2]}</p></a>`).join("")}</div>
      <div class="tabs" role="tablist" style="margin-bottom:18px">${[["fit", "Fitness Challenge"], ["spin", "Spin & Learn"], ["pers", "Personality Test"]].map(t => `<button role="tab" aria-selected="${tab === t[0]}" data-t="${t[0]}">${t[1]}</button>`).join("")}</div>
      <div id="pane">${tab === "fit" ? fitView(p) : tab === "spin" ? spinView(p) : persView(p)}</div>`;
    },
    after(p, root) {
      F.$$("[data-t]", root).forEach(b => b.onclick = () => { tab = b.dataset.t; F.rerender(); });
      F.$$("[data-fit]", root).forEach(b => b.onclick = () => { const c = CH.flatMap(g => g.items).find(x => x.id === b.dataset.fit), f = fit(); f[c.id] = (f[c.id] || 0) + 1; if (f[c.id] >= c.n) { F.addXP(c.pts, c.t); F.confetti(); if (c.id === "m2") F.flag("weekly"); } F.flag("first"); F.save(); F.rerender(); });
      const sp = F.$("#spin", root);
      if (sp) sp.onclick = () => {
        if (spinning) return; spinning = true; sp.disabled = true; const [S, k] = spins(); S[k]++; const idx = Math.floor(Math.random() * D.spin.length), seg = D.spin[idx], a = 360 / D.spin.length;
        const target = rot + 360 * 5 + ((360 - (idx * a) - (rot % 360) + 360) % 360), w = F.$("#wheel", root);
        const show = () => { rot = target; spinning = false; F.save(); F.flag("spin"); F.addXP(5, "Spin & Learn"); const r = F.$("#spinres", root);
          r.innerHTML = `<span class="tag ai">${seg.label}</span><h3 style="margin:8px 0">${seg.t}</h3><p>${seg.b}</p>` + (seg.q ? `<div class="list" style="margin-top:12px">${seg.q.o.map((o, i) => `<button class="opt" data-a="${i}">${o}</button>`).join("")}</div><p class="sm" id="sr" aria-live="polite" style="margin-top:10px"></p>` : "") + (seg.href ? `<a class="btn" style="margin-top:12px" href="${F.url(seg.href)}">Open lesson</a>` : "") + `<button class="btn ghost sm" style="margin-top:12px" id="again">${S[k] >= 3 ? "That's all for today" : "Spin again"}</button>`;
          F.$$("[data-a]", r).forEach(o => o.onclick = () => { const ok = +o.dataset.a === seg.q.a; F.$$("[data-a]", r).forEach(x => { x.disabled = true; if (+x.dataset.a === seg.q.a) x.classList.add("right"); }); if (!ok) o.classList.add("wrong"); F.$("#sr", r).textContent = (ok ? "Correct! " : "Not quite. ") + seg.q.why; });
          F.$("#again", r).onclick = () => F.rerender(); };
        if (F.reduce()) { w.style.transition = "none"; w.style.transform = `rotate(${target}deg)`; show(); } else { w.style.transform = `rotate(${target}deg)`; setTimeout(show, 4100); }
      };
      if (tab === "spin") { const w = F.$("#wheel", root); if (w) { w.style.transition = "none"; w.style.transform = `rotate(${rot}deg)`; requestAnimationFrame(() => requestAnimationFrame(() => w.style.transition = "")); } }
      const ps = F.$("#pstart", root); if (ps) ps.onclick = () => { pq = { i: 0, s: { planner: 0, spender: 0, saver: 0, risk: 0 } }; F.rerender(); };
      F.$$("[data-po]", root).forEach(b => b.onclick = () => { const o = D.personality.q[pq.i].o[+b.dataset.po]; pq.s[o[1]]++; pq.i++; if (pq.i >= D.personality.q.length) { const key = Object.entries(pq.s).sort((a, b) => b[1] - a[1])[0][0]; (F.S.extra.persona = F.S.extra.persona || {})[F.S.profile] = key; F.flag("persona"); F.save(); } F.rerender(); });
      const rt = F.$("#retake", root); if (rt) rt.onclick = () => { delete (F.S.extra.persona || {})[F.S.profile]; pq = { i: 0, s: { planner: 0, spender: 0, saver: 0, risk: 0 } }; F.rerender(); };
    }
  });
})();
