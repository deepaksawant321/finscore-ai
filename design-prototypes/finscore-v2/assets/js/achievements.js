/* Achievement Center */
(function () {
  const F = window.FS, D = F.D; let filter = "all";
  const heat = (p, i) => { const r = Math.sin((i + p.age) * 12.9898) * 43758.5453; return (r - Math.floor(r)) > (p.streak > 10 ? .22 : .5) ? 1 + ((i + p.age) % 3 === 0 ? 1 : 0) : 0; };
  F.init({
    id: "achievement-center", title: "Achievements",
    render(p) {
      const lv = F.lvl(p), got = D.badges.filter(b => F.unlocked(b.id)), strk = F.streak(p), list = D.badges.filter(b => filter === "all" || (filter === "got") === F.unlocked(b.id));
      const days = Array.from({ length: 35 }, (_, i) => i > 28 ? (i === 34 && F.doneToday() ? 2 : (34 - i) < p.streak ? 1 + (i % 2) : 0) : (34 - i) < p.streak ? 1 + (i % 2) : heat(p, i));
      return `${F.head("Achievement Center", "Celebrate verified progress — not app opens. Every badge maps to something that genuinely helps your finances.", `<span class="sim-badge">Simulated</span>`)}
      <div class="grid g3"><section class="card" style="text-align:center">${F.ring({ v: Math.round(lv.into / lv.next * 100), size: 130, stroke: 12, color: "var(--accent)", count: false, text: "L" + lv.n, sub: lv.name, fs: 30 })}<p class="sm muted" style="margin-top:10px">${lv.into} / ${lv.next} pts to level ${lv.n + 1}</p><p class="xs muted">${lv.xp} points total · no cash value</p></section>
        <section class="card"><div class="row between"><h3>${F.icon("flame", 20)} Streak</h3><b class="big-num" style="font-size:36px">${strk}</b></div><p class="sm muted" style="margin:4px 0 12px">Last 5 weeks of activity (simulated)</p><div style="display:grid;grid-template-columns:repeat(7,1fr);gap:5px" role="img" aria-label="Activity calendar, ${strk} day streak">${days.map(d => `<i style="aspect-ratio:1;border-radius:6px;display:block;background:${d === 0 ? "var(--line)" : d === 1 ? "color-mix(in srgb,var(--brand) 45%,var(--line))" : "var(--brand)"}"></i>`).join("")}</div><p class="xs muted" style="margin-top:10px">Missing a day isn't failure — streaks have a recovery day built in.</p></section>
        <section class="card"><h3>${F.icon("trophy", 20)} Milestones</h3><div class="stack" style="gap:10px;margin-top:12px"><div class="kpi"><b>${got.length}<span class="muted" style="font-size:15px">/${D.badges.length}</span></b><span>Badges unlocked</span></div>${F.bar(got.length / D.badges.length * 100)}<div class="kpi"><b>${F.doneList().length}</b><span>Activities completed this session</span></div><button class="btn soft sm" id="demo">Demo: unlock the next badge</button></div></section></div>
      <div class="row between wrap" style="margin:22px 0 12px"><h2>Badges</h2><div class="tabs">${[["all", "All"], ["got", "Unlocked"], ["lock", "Locked"]].map(t => `<button aria-selected="${filter === t[0]}" data-f="${t[0]}">${t[1]}</button>`).join("")}</div></div>
      <div class="grid g-auto" style="grid-template-columns:repeat(auto-fill,minmax(210px,1fr))">${list.map(b => { const u = F.unlocked(b.id); return `<article class="card pad-s" style="text-align:center;${u ? "" : "opacity:.8"}"><div class="ico lg" style="margin:0 auto 10px;${u ? "background:var(--grad-deep);color:#fff" : ""}">${F.icon(u ? b.icon : "lock", 26)}</div><b>${b.name}</b><p class="xs muted" style="margin:4px 0 8px">${b.desc}</p><span class="tag ${u ? "pos" : ""}">${u ? "Unlocked" : "+" + b.xp + " pts to earn"}</span></article>`; }).join("")}</div>
      <section class="card" style="margin-top:22px"><h3>Achievement history</h3><ul class="list" style="margin-top:12px">${got.length ? got.slice().reverse().map((b, i) => `<li class="li"><span class="ico pos">${F.icon(b.icon, 18)}</span><div style="flex:1"><b>${b.name}</b><div class="xs muted">${b.desc}</div></div><span class="xs muted">${F.ubs().includes(b.id) ? "This session" : (i + 1) * 9 + " days ago (simulated)"}</span></li>`).join("") : `<li class="muted">Nothing yet — finish an activity to unlock your first badge.</li>`}</ul></section>
      <section class="card" style="margin-top:18px"><h3>Level path</h3><div class="row wrap" style="margin-top:12px">${D.levels.map((n, i) => `<span class="tag ${i + 1 === lv.n ? "ai" : i + 1 < lv.n ? "pos" : ""}">${i + 1}. ${n}</span>`).join("")}</div></section>`;
    },
    after(p, root) {
      F.$$("[data-f]", root).forEach(b => b.onclick = () => { filter = b.dataset.f; F.rerender(); });
      F.$("#demo", root).onclick = () => { const b = D.badges.find(x => !F.unlocked(x.id)); if (!b) return F.toast("All badges unlocked!"); F.flag(b.flag); setTimeout(() => F.rerender(), 900); };
    }
  });
})();
