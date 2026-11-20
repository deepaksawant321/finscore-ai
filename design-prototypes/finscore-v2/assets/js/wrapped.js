/* Monthly Financial Wrapped — story format, simulated */
(function () {
  const F = window.FS; let i = 0, tm = null;
  const BG = ["linear-gradient(160deg,#0A5E5C,#0E8C70)", "linear-gradient(160deg,#2B2A8E,#5A55D6)", "linear-gradient(160deg,#7A4A12,#C98A2B)", "linear-gradient(160deg,#0B4B6B,#1A8FB0)", "linear-gradient(160deg,#0A6665,#1DBA8C)", "linear-gradient(160deg,#4A2A7A,#8F4FD0)", "linear-gradient(160deg,#0B2B33,#0C8068)"];
  const data = p => { const st = F.stageOf(p.score), done = 12 + Math.round(p.streak * .7) + F.doneList().length, saved = p.goals.reduce((a, g) => a + g.monthly, 0), g = p.goals.slice().sort((a, b) => b.saved / b.target - a.saved / a.target).find(x => x.saved < x.target) || p.goals[0], gp = Math.round(g.saved / g.target * 100), top = F.D.badges.filter(b => F.unlocked(b.id)).pop(); return { st, done, learn: Math.round(p.xp / 90) + 2, saved, g, gp, top, dn: p.score - p.prev }; };
  const text = (p, d) => `My Finscore Wrapped (simulated demo) — ${F.D.wrapped.month}\n• Score ${p.score}/900 (${d.dn >= 0 ? "+" : ""}${d.dn})\n• ${d.done} activities completed\n• ${d.g.name}: ${d.gp}%\n• ${F.streak(p)}-day streak\nNext focus: ${p.focus}`;
  F.init({
    id: "financial-wrapped", title: "Monthly Wrapped",
    render(p) {
      const d = data(p), S = [
        `<span class="tag" style="background:rgba(255,255,255,.2);color:#fff">${F.D.wrapped.month}</span><h1 style="font-size:clamp(34px,6vw,46px);margin:18px 0 10px">Your month in money, ${p.first}</h1><p style="opacity:.9">A look back at what you actually did — not what you opened.</p>`,
        `<p style="opacity:.85">Your simulated Finscore</p><div class="big-num" style="font-size:88px;margin:8px 0"><span data-count="${p.score}">0</span></div><p><strong>${d.dn >= 0 ? "▲ " + d.dn : "▼ " + Math.abs(d.dn)} points</strong> this month</p><p style="opacity:.9;margin-top:10px">Now in <strong>${d.st.name}</strong> (${d.st.nick}). ${d.dn >= 0 ? "That's real momentum." : "Dips happen — your plan is what matters."}</p>`,
        `<p style="opacity:.85">You completed</p><div class="big-num" style="font-size:96px;margin:8px 0"><span data-count="${d.done}">0</span></div><p>financial activities</p><p style="opacity:.9;margin-top:10px">Longest streak: <strong>${F.streak(p)} days</strong>. Consistency beats intensity.</p>`,
        `<p style="opacity:.85">Learning</p><div class="big-num" style="font-size:96px;margin:8px 0"><span data-count="${d.learn}">0</span></div><p>new concepts learned</p><p style="opacity:.9;margin-top:10px">From: ${p.learn.join(" · ")}</p>`,
        `<p style="opacity:.85">${d.g.name}</p><div style="margin:10px auto">${F.ring({ v: d.gp, size: 170, stroke: 16, color: "#fff", fs: 44 }).replace('class="trk"', 'class="trk" style="stroke:rgba(255,255,255,.25)"').replace('class="mid"', 'class="mid" style="color:#fff"')}</div><p>${F.cpt(d.g.saved)} of ${F.cpt(d.g.target)}</p><p style="opacity:.9;margin-top:6px">${F.inr(d.saved)} moved toward goals each month (simulated).</p>`,
        `<p style="opacity:.85">Highlight</p>${d.top ? `<div class="unlock-badge" style="margin:16px auto;background:rgba(255,255,255,.2)">${F.icon(d.top.icon, 46)}</div><h2>${d.top.name}</h2><p style="opacity:.9">${d.top.desc}</p>` : `<h2 style="margin:16px 0">Your first badge awaits</h2>`}`,
        `<p style="opacity:.85">Next month's focus</p><h2 style="margin:12px 0 18px;font-size:26px">${p.focus[0].toUpperCase() + p.focus.slice(1)}</h2><div class="row wrap" style="justify-content:center"><button class="btn" id="share">${F.icon("share", 16)} Copy share card</button></div><p class="xs" style="opacity:.8;margin-top:12px">Simulated data · shareable card contains no real personal information.</p>`
      ];
      return `${F.head("Monthly Financial Wrapped", "A calm, shareable monthly story: progress, learning and one focus for next month.", `<span class="sim-badge">Simulated</span>`)}
      <div style="max-width:440px;margin:0 auto"><div class="row" style="gap:4px;margin-bottom:10px" aria-hidden="true">${S.map((_, k) => `<i style="flex:1;height:4px;border-radius:4px;background:${k <= i ? "var(--brand)" : "var(--line)"}"></i>`).join("")}</div>
        <section class="card" id="story" aria-live="polite" style="padding:0;border-radius:28px;overflow:hidden;color:#fff;min-height:min(560px,70vh);background:${BG[i]};display:flex;flex-direction:column"><div style="flex:1;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:32px 26px;animation:pop .5s var(--ease)" key="${i}">${S[i]}</div><div class="row between" style="padding:14px 18px;background:rgba(0,0,0,.18)"><button class="btn ghost sm" id="pv" style="color:#fff;border-color:rgba(255,255,255,.4)" ${i === 0 ? "disabled" : ""}>${F.icon("back", 16)} Back</button><span class="xs">${i + 1} / ${S.length}</span><button class="btn sm" id="nx" style="background:#fff;color:#0B1220" ${i === S.length - 1 ? "disabled" : ""}>Next ${F.icon("arrow", 16)}</button></div></section>
        <p class="xs muted" style="text-align:center;margin-top:10px">Use ← → keys or the buttons.</p></div>`;
    },
    after(p, root) {
      if (i === 6) F.flag("wrapped");
      const go = n => { i = Math.max(0, Math.min(6, i + n)); F.rerender(); };
      F.$("#pv", root).onclick = () => go(-1); F.$("#nx", root).onclick = () => go(1);
      document.onkeydown = e => { if (e.key === "ArrowRight") go(1); if (e.key === "ArrowLeft") go(-1); };
      const sh = F.$("#share", root); if (sh) sh.onclick = () => { const t = text(p, data(p)); (navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => F.toast("Share card copied (simulated data)"), () => F.modal(`<h3>Share card</h3><pre style="white-space:pre-wrap;margin-top:10px">${t}</pre>`, { label: "Share card" })); };
    }
  });
})();
