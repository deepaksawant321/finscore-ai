/* Prototype gallery (root index.html) */
(function () {
  const F = window.FS, D = F.D; let dev = "desktop", pg = "home-companion";
  const DEV = { desktop: [1440, "Desktop 1440"], laptop: [1280, "Laptop 1280"], tablet: [768, "Tablet 768"], m390: [390, "Mobile 390"], m360: [360, "Mobile 360"] };
  const PAGES = [
    ["home-companion", "Companion Home", "Greeting, wellness, Fin, today's activity, journey, insights, quick access.", "home", "Phase 1"],
    ["ai-companion", "AI Companion", "Scripted conversation grounded in the simulated profile, action cards, voice concept.", "chat", "Phase 1"],
    ["financial-wellness", "Wellness & Score Journey", "300–900 gauge, six dimensions, life map, drivers, what-if, stage ladder.", "ring", "Phase 1"],
    ["daily-activities", "Daily Activities", "Daily / weekly / monthly activities, AI action plan, knowledge cards.", "calendar", "Phase 1"],
    ["goals-planning", "Goals & Planning", "Goal builder, retirement illustration with ranges, weekly review.", "target", "Phase 1"],
    ["achievement-center", "Achievement Center", "Badges, levels, streak calendar, history.", "trophy", "Phase 1"],
    ["financial-games", "Learn & Play", "Fitness challenges, Spin & Learn wheel, personality test.", "gamepad", "Phase 2"],
    ["quiz-arena", "Quiz Arena", "Timed MCQs, three difficulty levels, instant explanations.", "brain", "Phase 2"],
    ["savings-adventure", "Savings Adventure", "Animated goal path with milestones and celebration.", "route", "Phase 2"],
    ["financial-wrapped", "Monthly Wrapped", "Story-style, shareable monthly recap.", "gift", "Phase 2"],
    ["financial-journey", "Independence Journey", "Six stations from emergency fund to freedom.", "compass", "Phase 2"],
    ["investment-simulator", "Investment Simulator", "Virtual money, five market scenarios, decision exercises.", "trend", "Phase 3"],
    ["premium-experience", "Premium Experience", "Plan comparison, roadmap preview — no payments.", "crown", "Phase 3"],
    ["onboarding", "Onboarding Flow", "First visit → profile → first check → Fin → first achievement.", "user", "Phase 1"]
  ];
  const FLOW = [["First-time visitor", "onboarding"], ["New-user onboarding", "onboarding"], ["Profile setup", "onboarding"], ["First wellness assessment", "onboarding"], ["Meet the companion", "onboarding"], ["First daily activity", "daily-activities"], ["Achievement unlock", "achievement-center"], ["Regular homepage", "home-companion"], ["AI conversation", "ai-companion"], ["Goal creation", "goals-planning"], ["Weekly review", "goals-planning"], ["Monthly wrapped", "financial-wrapped"]];
  const DIRS = [
    ["a", "Direction A · Private Wealth Premium", "Editorial serif headings, restrained gold accent, tighter radius, quiet motion.", ["Elegant layouts", "Refined data visualisation", "Calm, minimal interactions"], "Best for: HNI & investor trust"],
    ["b", "Direction B · Next-Gen Gamified Companion", "Rounder shapes, warm coral accent, bouncy easing, journey maps and badges.", ["Milestones & badges", "Playful micro-interactions", "Visual journey"], "Best for: beginners & habit-building"],
    ["c", "Direction C · AI-First Intelligence", "Indigo AI glow, conversational homepage, dynamic insight surfaces.", ["Companion-led homepage", "Smart suggestions", "Context-aware insights"], "Best for: daily engagement"]
  ];
  const src = () => `pages/${pg}.html?p=${F.S.profile}&theme=${document.documentElement.dataset.theme}&dir=${F.S.dir}`;

  function head() {
    const p = F.prof();
    return `<header class="topbar" style="position:sticky"><a class="brand" style="padding:0" href="#top"><span class="mark">${F.icon("spark", 20)}</span><span>Finscore<small>V2 · Prototype gallery</small></span></a><nav class="gal-nav hide-s" aria-label="Sections">${[["vision", "Vision"], ["directions", "Directions"], ["preview", "Live preview"], ["screens", "Screens"], ["play", "Interactions"], ["journey", "Journey"]].map(a => `<a href="#${a[0]}">${a[1]}</a>`).join("")}</nav><div class="sp"></div>
      <div class="rel"><button class="icon-btn" id="sty" aria-label="Theme and direction" aria-expanded="false">${F.icon("palette")}</button></div><div class="rel"><button class="chip" id="prof" aria-label="Switch demo profile" aria-expanded="false" style="padding:4px 12px 4px 4px"><span class="avatar" style="--h:${p.hue}">${p.first[0]}</span><span class="hide-s">${p.tag}</span>${F.icon("arrow", 14)}</button></div></header>`;
  }
  function body() {
    const p = F.prof(), c = F.ctx(p), st = F.stageOf(p.score);
    return `<main id="main" style="max-width:1240px" tabindex="-1">
      <section class="hero" id="top" style="margin-top:8px"><div style="position:relative;z-index:1;max-width:760px"><div class="row wrap"><span class="tag">Design exploration · V2</span><span class="sim-badge" style="background:rgba(255,255,255,.2);color:#fff;border-color:transparent">All data simulated</span></div>
        <h1 style="font-size:clamp(32px,5vw,56px);margin:16px 0 12px">Finscore V2 — a financial companion you'll genuinely enjoy opening.</h1><p style="font-size:17px">Not another dashboard. An AI-guided companion that helps people understand, improve, manage and grow their financial lives — with daily value that builds healthy habits, not screen time.</p>
        <div class="row wrap" style="margin-top:22px"><a class="btn" href="pages/home-companion.html">${F.icon("home", 18)} Open the companion home</a><a class="btn ghost" href="pages/ai-companion.html">${F.icon("chat", 18)} Talk to Fin</a><a class="btn ghost" href="pages/onboarding.html">Try onboarding</a></div></div></section>

      <section id="vision" style="margin-top:34px"><div class="page-head"><div><h2>Product vision</h2><p>From "check my numbers" to "what's one useful step today?" Three shifts define the V2 experience.</p></div></div>
        <div class="grid g3">${[["compass", "Companion, not dashboard", "Fin greets you, explains what changed and suggests one next step. The home screen answers: where am I, why, what's next."], ["spark", "Reasons to return that help", "Daily, weekly and monthly activities teach and build habits. Points reward verified progress, never app opens."], ["shield", "Trust by design", "Everything is labelled simulated. No guaranteed returns, no cash prizes, no dark patterns, and Fin never claims what it can't see."]].map(x => `<article class="card"><span class="ico lg">${F.icon(x[0], 26)}</span><h3 style="margin:12px 0 6px">${x[1]}</h3><p class="sm muted">${x[2]}</p></article>`).join("")}</div></section>

      <section id="directions" style="margin-top:38px"><div class="page-head"><div><h2>Three visual directions → one blended design</h2><p>Each card is rendered live with its own tokens. Apply a direction to restyle the entire prototype, or keep the blended recommendation.</p></div><button class="btn ghost" data-dir="blend">${F.icon("layers", 16)} Apply blended (recommended)</button></div>
        <div class="grid g3">${DIRS.map(d => `<article class="card" data-dir="${d[0]}" style="background:var(--card)"><div style="border-radius:var(--r);background:var(--hero);color:#fff;padding:18px;min-height:132px"><span class="tag" style="background:rgba(255,255,255,.2);color:#fff">Sample</span><h3 style="margin:10px 0 4px;font-size:22px">Good morning, ${p.first}</h3><div class="row" style="margin-top:8px">${F.ring({ v: 72, size: 46, stroke: 6, color: "#fff", count: false, text: "72", fs: 13 }).replace('class="trk"', 'class="trk" style="stroke:rgba(255,255,255,.3)"').replace('class="mid"', 'class="mid" style="color:#fff"')}<span class="sm">Wellness · ▲ 4</span></div></div>
          <h3 style="margin:14px 0 6px">${d[1]}</h3><p class="sm muted">${d[2]}</p><ul class="sm" style="padding-left:18px;margin:10px 0">${d[3].map(t => `<li>${t}</li>`).join("")}</ul><div class="row between wrap"><span class="tag" style="background:var(--accent-soft);color:var(--accent-ink)">${d[4]}</span><button class="btn sm" data-dir="${d[0]}">Apply live</button></div></article>`).join("")}</div>
        <div class="card" style="margin-top:16px;border:1.5px solid var(--brand)"><b>Recommended: blend.</b> <span class="muted">A's calm typography and restraint for money screens · B's milestones and badges in Learn & Play and Journey · C's conversational, companion-first homepage. Never childish; always financial-grade.</span></div></section>

      <section id="preview" style="margin-top:38px"><div class="page-head"><div><h2>Live responsive preview</h2><p>Real pages rendered at true viewport widths so breakpoints behave exactly as on devices. Uses the profile and theme selected above.</p></div></div>
        <div class="card"><div class="row between wrap" style="gap:10px;margin-bottom:12px"><div class="tabs" role="tablist" aria-label="Device">${Object.entries(DEV).map(([k, v]) => `<button role="tab" aria-selected="${dev === k}" data-dev="${k}">${v[1]}</button>`).join("")}</div><label class="f" style="flex-direction:row;align-items:center"><span class="sr">Page</span><select id="pgsel" aria-label="Page to preview" style="min-height:40px;border-radius:12px;border:1px solid var(--line);background:var(--card);color:var(--ink);padding:0 10px">${PAGES.map(x => `<option value="${x[0]}" ${x[0] === pg ? "selected" : ""}>${x[1]}</option>`).join("")}</select><a class="btn ghost sm" id="pgopen" href="pages/${pg}.html">Open full</a></label></div>
          <div id="frame" style="background:var(--card-2);border-radius:16px;padding:12px;overflow:hidden;display:flex;justify-content:center"><div id="fbox" style="transform-origin:top left"><iframe title="Live preview" id="ifr" style="border:0;border-radius:12px;background:var(--bg);box-shadow:var(--sh)" loading="lazy" src="${src()}"></iframe></div></div></div></section>

      <section id="screens" style="margin-top:38px"><div class="page-head"><div><h2>All screens</h2><p>Every page is fully interactive and works offline from local files.</p></div></div>
        <div class="grid g-auto" style="grid-template-columns:repeat(auto-fill,minmax(250px,1fr))">${PAGES.map(x => `<a class="card pad-s" href="pages/${x[0]}.html" style="text-decoration:none;display:flex;flex-direction:column;gap:8px"><div class="row between"><span class="ico">${F.icon(x[3], 20)}</span><span class="tag ${x[4] === "Phase 1" ? "pos" : x[4] === "Phase 2" ? "warn" : "ai"}">${x[4]}</span></div><b>${x[1]}</b><span class="sm muted">${x[2]}</span><span class="sm b" style="color:var(--brand-ink);margin-top:auto">Open →</span></a>`).join("")}</div></section>

      <section id="play" style="margin-top:38px"><div class="page-head"><div><h2>Interaction previews</h2><p>Small, working samples of the companion, wellness, gamification and activity experiences. Try them right here.</p></div></div>
        <div class="grid g2" style="align-items:start">
          <article class="card"><div class="card-h"><h3>${F.icon("ring", 20)} Wellness preview</h3><button class="chip" id="replay">${F.icon("refresh", 14)} Replay</button></div><div class="row wrap" style="gap:22px">${F.ring({ v: Math.round((p.score - 300) / 6), size: 120, stroke: 12, color: "var(--brand)", count: false, text: p.score, sub: "/ 900", fs: 28 })}<div><b>${st.name}</b><div class="sm muted">${st.nick}</div><div class="delta up" style="margin-top:6px">▲ ${Math.abs(p.score - p.prev)} vs last month</div><div class="xs muted">Simulated · ${p.tag}</div></div></div><div class="grid g3" style="gap:10px;margin-top:16px">${F.dims(p).slice(0, 3).map(d => `<div><div class="xs muted">${d.label}</div>${F.bar(d.v)}</div>`).join("")}</div></article>
          <article class="card"><div class="card-h"><h3>${F.icon("chat", 20)} AI companion preview</h3><span class="tag ai">Simulated</span></div><div class="m" style="max-width:100%"><div class="orb" style="--o:36px" aria-hidden="true"></div><div class="bub" style="background:var(--ai-soft);border-color:transparent" id="gmsg">${p.ai.msg}</div></div><div class="row wrap" style="margin-top:12px">${p.ai.quick.map(q => `<a class="chip" href="pages/ai-companion.html">${q}</a>`).join("")}</div></article>
          <article class="card"><div class="card-h"><h3>${F.icon("flame", 20)} Gamification preview</h3></div><div class="week" role="img" aria-label="Week streak">${"MTWTFSS".split("").map((d, i) => `<span class="${i < Math.min(p.streak, 6) ? "on" : ""} ${i === 6 ? "today" : ""}"><i>${i < Math.min(p.streak, 6) ? F.icon("check", 14) : ""}</i>${d}</span>`).join("")}</div><div class="row wrap" style="margin-top:14px">${D.badges.slice(0, 6).map(b => `<span class="ico ${p.baseBadges.includes(b.id) ? "pos" : ""}" title="${b.name}" style="${p.baseBadges.includes(b.id) ? "" : "opacity:.5"}">${F.icon(p.baseBadges.includes(b.id) ? b.icon : "lock", 18)}</span>`).join("")}</div><button class="btn soft sm" id="unlock" style="margin-top:14px">Play achievement-unlock animation</button></article>
          <article class="card"><div class="card-h"><h3>${F.icon("spark", 20)} Activity preview</h3><span class="tag">${F.act(p.activity).mins} min</span></div><div class="row" style="gap:14px"><span class="ico lg">${F.icon(F.act(p.activity).icon, 26)}</span><div><b>${F.act(p.activity).title}</b><div class="sm muted">${F.act(p.activity).desc}</div></div></div><div style="margin-top:14px">${F.bar(0)}</div><div class="row" style="margin-top:14px"><button class="btn" id="gact">Start activity</button><a class="btn ghost" href="pages/daily-activities.html">All activities</a></div></article></div></section>

      <section id="profiles" style="margin-top:38px"><div class="page-head"><div><h2>Personalisation (simulated profiles)</h2><p>Switch profiles and every screen — greeting, wellness, Fin's message, activity, goals and insights — updates.</p></div></div>
        <div class="grid g-auto" style="grid-template-columns:repeat(auto-fill,minmax(210px,1fr))">${D.profiles.map(q => `<button class="card pad-s" data-p="${q.id}" style="text-align:left;cursor:pointer;${q.id === p.id ? "outline:2px solid var(--brand)" : ""}" aria-pressed="${q.id === p.id}"><span class="avatar" style="--h:${q.hue}">${q.first[0]}</span><b style="display:block;margin-top:8px">${q.tag}</b><span class="xs muted">${q.name}</span><p class="xs" style="margin-top:6px">${q.blurb}</p><span class="tag" style="margin-top:8px">${q.score}/900 · ${F.stageOf(q.score).name}</span></button>`).join("")}</div></section>

      <section id="journey" style="margin-top:38px"><div class="page-head"><div><h2>The complete user journey</h2><p>Twelve moments from first visit to monthly reflection. Select a step to open the matching screen.</p></div></div><ol class="grid g4" style="list-style:none;padding:0;margin:0">${FLOW.map((f, i) => `<li><a class="card pad-s" href="pages/${f[1]}.html" style="text-decoration:none;display:flex;gap:12px;align-items:center;height:100%"><span class="avatar" style="--h:175">${i + 1}</span><span><b class="sm">${f[0]}</b><br><span class="xs muted">${f[1].replace(/-/g, " ")}</span></span></a></li>`).join("")}</ol></section>

      <section style="margin-top:38px" class="card"><h3>Documents</h3><div class="row wrap" style="margin-top:10px"><a class="chip" href="README.md">README</a><a class="chip" href="PRODUCT_STRATEGY.md">Product strategy</a><a class="chip" href="DESIGN_RECOMMENDATIONS.md">Design recommendations</a><a class="chip" href="PROTOTYPE_COMPLETION_REPORT.md">Completion report</a></div><p class="xs muted" style="margin-top:12px">Isolated prototype. No existing Finscore code, APIs, database or configuration is used or modified. All figures are dummy data.</p></section></main>`;
  }
  function fit() {
    const fr = F.$("#frame"), box = F.$("#fbox"), ifr = F.$("#ifr"); if (!fr) return; const w = DEV[dev][0], avail = fr.clientWidth - 24, sc = Math.min(1, avail / w), h = dev.startsWith("m") ? 720 : dev === "tablet" ? 900 : 820;
    ifr.style.width = w + "px"; ifr.style.height = h + "px"; box.style.transform = `scale(${sc})`; box.style.width = w * sc + "px"; box.style.height = h * sc + "px"; box.firstElementChild.style.transformOrigin = "top left"; box.style.transform = "none"; ifr.style.transform = `scale(${sc})`; ifr.style.transformOrigin = "top left";
  }
  function draw() {
    document.body.innerHTML = `${head()}${body()}`; F.animate(document.body);
    F.$("#prof").onclick = e => F.profileMenu(e.currentTarget); F.$("#sty").onclick = e => F.styleMenu(e.currentTarget);
    F.$$("[data-dir]").forEach(b => { if (b.tagName === "BUTTON") b.onclick = () => { F.S.dir = b.dataset.dir; F.save(); F.applyTheme(); F.toast("Direction applied: " + (b.dataset.dir === "blend" ? "Blended" : b.dataset.dir.toUpperCase())); reframe(); }; });
    F.$$("[data-p]").forEach(b => b.onclick = () => F.setProfile(b.dataset.p));
    F.$$("[data-dev]").forEach(b => b.onclick = () => { dev = b.dataset.dev; draw(); setTimeout(() => F.$("#preview").scrollIntoView(), 0); });
    F.$("#pgsel").onchange = e => { pg = e.target.value; F.$("#ifr").src = src(); F.$("#pgopen").href = "pages/" + pg + ".html"; };
    F.$("#replay").onclick = () => { const r = F.$("#play"); F.$$(".ring .val", r).forEach(c => { c.style.transition = "none"; c.style.strokeDashoffset = c.dataset.c; }); requestAnimationFrame(() => requestAnimationFrame(() => { F.$$(".ring .val", r).forEach(c => { c.style.transition = ""; }); F.animate(r); })); };
    F.$("#unlock").onclick = () => { F.confetti(); F.modal(`<div style="text-align:center;padding:10px 0"><div class="unlock-badge">${F.icon("trophy", 46)}</div><span class="tag pos">Achievement unlocked · demo</span><h2 style="margin:10px 0 4px">Week Warrior</h2><p class="muted">Seven days of useful financial habits.</p></div>`, { label: "Achievement demo" }); };
    F.$("#gact").onclick = () => F.runActivity(F.prof().activity, () => draw());
    fit(); setTimeout(fit, 120);
    if (location.hash && F.$(location.hash)) F.$(location.hash).scrollIntoView();
  }
  const reframe = () => { const i = F.$("#ifr"); if (i) i.src = src(); };
  window.FS_ONPROFILE = () => { draw(); };
  window.addEventListener("resize", fit); document.title = "Finscore V2 · Prototype gallery";
  document.body.dataset.root = "1"; draw();
  const m = F.$("#sty"); // theme changes: refresh preview frame when theme button used
  document.addEventListener("click", () => setTimeout(() => { const i = F.$("#ifr"); if (i && !i.src.includes("theme=" + document.documentElement.dataset.theme + "&dir=" + F.S.dir)) reframe(); }, 50));
})();
