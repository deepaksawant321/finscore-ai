/* Finscore V2 core: state, theme, shell, helpers. Vanilla JS, no network calls. */
(function () {
  const D = window.FS_DATA, KEY = "fsv2";
  const reduce = () => window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (s, r) => (r || document).querySelector(s), $$ = (s, r) => [...(r || document).querySelectorAll(s)];

  /* ---------- state (localStorage with window.name fallback; always try/catch) ---------- */
  let S = { profile: "saver", theme: "auto", dir: "blend", done: {}, xpx: {}, flags: {}, ub: {}, chat: {}, extra: {} };
  try { Object.assign(S, JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (e) {}
  try { const w = JSON.parse(window.name || "{}"); if (w.fsv2 && !localStorage.getItem(KEY)) Object.assign(S, w.fsv2); } catch (e) {}
  try { const q = new URLSearchParams(location.search); ["profile:p", "theme:theme", "dir:dir"].forEach(x => { const [k, a] = x.split(":"); if (q.get(a)) S[k] = q.get(a); }); } catch (e) {}
  if (!D.profiles.some(p => p.id === S.profile)) S.profile = "saver";
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} try { window.name = JSON.stringify({ fsv2: S }); } catch (e) {} };
  const mq = window.matchMedia ? matchMedia("(prefers-color-scheme: dark)") : null;
  function applyTheme() {
    const t = S.theme === "auto" ? (mq && mq.matches ? "dark" : "light") : S.theme;
    document.documentElement.dataset.theme = t;
    if (S.dir === "blend") delete document.documentElement.dataset.dir; else document.documentElement.dataset.dir = S.dir;
  }
  applyTheme(); if (mq) mq.addEventListener && mq.addEventListener("change", applyTheme);

  /* ---------- icons ---------- */
  const P = {
    home: "M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z", chat: "M21 12a8 8 0 0 1-11.5 7.2L4 20l1-4.6A8 8 0 1 1 21 12z",
    ring: '<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 9 9"/><circle cx="12" cy="12" r="3.5"/>', target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    route: '<circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M8 19h7a3.5 3.5 0 0 0 0-7H9a3.5 3.5 0 0 1 0-7h7"/>', calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    gamepad: '<rect x="2" y="7" width="20" height="11" rx="5"/><path d="M7 12.5h4M9 10.5v4"/><circle cx="16" cy="12" r=".8"/><circle cx="18" cy="14" r=".8"/>', brain: "M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z",
    trend: "M3 17l6-6 4 4 8-8M15 7h6v6", compass: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
    trophy: "M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3", gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M5 12v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8M12 8c-2 0-4-1-4-3a2 2 0 0 1 4 0M12 8c2 0 4-1 4-3a2 2 0 0 0-4 0"/>',
    crown: "M3 8l4 4 5-7 5 7 4-4-2 11H5z", user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>', bell: "M6 16v-5a6 6 0 0 1 12 0v5l2 2H4zM10 21h4",
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>', moon: "M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10z",
    spark: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z", shield: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z",
    wallet: '<path d="M3 7a2 2 0 0 1 2-2h13v4M3 7v11a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1H5a2 2 0 0 1-2-2"/><path d="M16 14.5h.01"/>', coins: '<circle cx="9" cy="9" r="6"/><path d="M15 9.3A6 6 0 1 1 9.3 15"/>',
    piggy: "M5 11a7 7 0 0 1 7-5h3l2-2v3.5a6 6 0 0 1 2 4.5v2l-2 1v2h-3v-1.5h-4V19H7v-3a5 5 0 0 1-2-5z", house: "M3 11l9-8 9 8M5 10v10h14V10M10 20v-6h4v6",
    book: "M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5z", bank: "M3 10l9-6 9 6M5 10v8M9 10v8M15 10v8M19 10v8M3 21h18", umbrella: "M3 12a9 9 0 0 1 18 0zM12 12v6a2 2 0 0 0 4 0",
    chart: "M4 20V10M10 20V4M16 20v-8M22 20H2", star: "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z", flame: "M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z",
    check: "M5 12l5 5L20 7", lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>', arrow: "M5 12h14M13 6l6 6-6 6", back: "M19 12H5M11 6l-6 6 6 6",
    play: "M7 4l13 8-13 8z", mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>', send: "M22 2L11 13M22 2l-7 20-4-9-9-4z", x: "M6 6l12 12M18 6L6 18", plus: "M12 5v14M5 12h14",
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>', clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    palette: '<circle cx="12" cy="12" r="9"/><circle cx="8" cy="10" r="1"/><circle cx="12" cy="7.5" r="1"/><circle cx="16" cy="10" r="1"/>', refresh: "M20 11a8 8 0 0 0-14-4L4 9M4 4v5h5M4 13a8 8 0 0 0 14 4l2-2M20 20v-5h-5",
    share: '<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.2 11l7.6-4M8.2 13l7.6 4"/>', layers: "M12 3l9 5-9 5-9-5zM3 13l9 5 9-5", users: '<circle cx="9" cy="8" r="3.5"/><path d="M2 20a7 7 0 0 1 14 0M17 5a3.5 3.5 0 0 1 0 7M18 14a7 7 0 0 1 4 6"/>'
  };
  function icon(n, s) { s = s || 20; const p = P[n] || P.info; return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p.startsWith("<") ? p : `<path d="${p}"/>`}</svg>`; }

  /* ---------- formatting ---------- */
  const inr = n => "₹" + Math.round(n).toLocaleString("en-IN");
  const cpt = n => n >= 1e7 ? "₹" + (n / 1e7).toFixed(n % 1e7 ? 2 : 0).replace(/\.?0+$/, "") + "Cr" : n >= 1e5 ? "₹" + (n / 1e5).toFixed(n % 1e5 ? 1 : 0).replace(/\.0$/, "") + "L" : inr(n);
  const prof = () => D.profiles.find(p => p.id === S.profile);
  const stageOf = sc => D.stages.find(s => sc >= s.lo && sc <= s.hi) || D.stages[7];
  const DL = { savings: "Savings", debt: "Debt", invest: "Investing", protection: "Protection", goals: "Goals", emergency: "Emergency fund" };
  const DI = { savings: "piggy", debt: "bank", invest: "trend", protection: "umbrella", goals: "target", emergency: "shield" };
  const key = () => S.profile;
  const doneList = () => (S.done[key()] = S.done[key()] || []);
  const flags = () => (S.flags[key()] = S.flags[key()] || {});
  const ubs = () => (S.ub[key()] = S.ub[key()] || []);
  const xpTotal = p => (p || prof()).xp + (S.xpx[key()] || 0);
  const lvl = p => { const x = xpTotal(p), L = Math.floor(x / 250); return { n: L + 1, name: D.levels[Math.min(L, D.levels.length - 1)], into: x % 250, next: 250, xp: x }; };
  const unlocked = id => { const p = prof(); return p.baseBadges.includes(id) || ubs().includes(id); };
  const doneToday = () => doneList().some(id => id[0] === "d");
  const streak = p => (p || prof()).streak + (doneToday() ? 1 : 0);
  const act = id => D.activities.find(a => a.id === id);
  const greet = () => { const h = new Date().getHours(); return h < 5 ? "Still up" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : h < 21 ? "Good evening" : "Good evening"; };
  const dims = p => Object.keys(p.dims).map(k => ({ k, label: DL[k], v: p.dims[k][0], prev: p.dims[k][1], d: p.dims[k][0] - p.dims[k][1] }));
  const wellness = p => Math.round(dims(p).reduce((a, d) => a + d.v, 0) / 6);

  /* ---------- AI template context ---------- */
  function ctx(p) {
    const ds = dims(p).slice().sort((a, b) => b.v - a.v), st = stageOf(p.score), a = act(p.activity), sur = p.income - p.expenses - p.emi, rate = Math.round(sur / p.income * 100);
    const hg = p.goals.find(g => /home|house|down/i.test(g.name) || g.icon === "house"), emm = p.emMonths, em3 = p.expenses * 3, em6 = p.expenses * 6;
    const lines = [];
    lines.push((emm >= 3 ? "✓" : "•") + ` Emergency cushion: about ${emm} months (common guidance 3–6).`);
    lines.push((rate >= 20 ? "✓" : "•") + ` Savings rate: about ${rate}% of income.`);
    lines.push((p.emi / p.income < .35 ? "✓" : "•") + ` Loan payments: ${Math.round(p.emi / p.income * 100)}% of income (commonly kept under ~35–40%).`);
    lines.push(hg ? `${hg.saved >= hg.target * .2 ? "✓" : "•"} Down-payment pot: ${cpt(hg.saved)} of ${cpt(hg.target)} (${Math.round(hg.saved / hg.target * 100)}%).` : "• No home-related goal is set yet in this profile — creating one would make this clearer.");
    const eq = p.alloc.equity, iv = eq > 70 ? "That is equity-heavy: higher growth potential, but bigger swings if markets fall. Drift away from your comfort level is common after strong markets." : eq > 35 ? "That is a balanced mix — a mix of growth and steadiness. Review it when your goals or time horizon change." : eq > 0 ? "That is conservative with a small growth slice. It cushions swings, but over long horizons inflation can erode idle money." : "Nothing is invested for growth yet; cash is mostly idle. Understanding basics first is a fine place to start — no rush.";
    const g = p.goals[0];
    return { name: p.name, first: p.first, tag: p.tag, score: p.score, stage: st.name, nick: st.nick, delta: Math.abs(p.score - p.prev), dir: p.score >= p.prev ? "above" : "below", trend: p.score >= p.prev ? "upward" : "softening",
      best: ds[0].label.toLowerCase(), worst: ds[5].label.toLowerCase(), rate, surplusF: inr(sur), fiveF: inr(p.income * .05), expensesF: inr(p.expenses), em3F: inr(em3), em6F: inr(em6), emMonths: emm, emStatus: emm >= 6 ? "comfortably covered" : emm >= 3 ? "within the common range" : "below the common range, so building it is a worthwhile priority",
      houseCheck: lines.join("\n"), a_equity: p.alloc.equity, a_debt: p.alloc.debt, a_gold: p.alloc.gold, a_cash: p.alloc.cash, investRead: iv, age: p.age, retireAge: p.retireAge, years: p.retireAge - p.age,
      focus: p.focus, actTitle: a.title, actMins: a.mins, actPts: a.pts, actionList: p.actions.map((x, i) => `${i + 1}. ${x.t} (≈ +${x.pts} pts, simulated estimate)`).join("\n"),
      debtScore: p.dims.debt[0], protScore: p.dims.protection[0], emiF: inr(p.emi), goalName: g.name, goalPct: Math.round(g.saved / g.target * 100) };
  }
  const fill = (s, c) => s.replace(/\{(\w+)\}/g, (m, k) => c[k] != null ? c[k] : m);
  const md = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\n/g, "<br>");

  /* ---------- visual helpers ---------- */
  function ring(o) {
    const sz = o.size || 96, st = o.stroke || 9, r = (sz - st) / 2, C = 2 * Math.PI * r;
    return `<div class="ring" style="width:${sz}px;height:${sz}px;--rs:${o.fs || Math.round(sz / 4.2)}px"><svg width="${sz}" height="${sz}" viewBox="0 0 ${sz} ${sz}" role="img" aria-label="${o.aria || (o.label || "") + " " + o.v + " percent"}"><circle class="trk" cx="${sz / 2}" cy="${sz / 2}" r="${r}" fill="none" stroke-width="${st}"/><circle class="val" cx="${sz / 2}" cy="${sz / 2}" r="${r}" fill="none" stroke="${o.color || "var(--brand)"}" stroke-width="${st}" stroke-dasharray="${C}" stroke-dashoffset="${C}" data-c="${C}" data-v="${o.v}"/></svg><div class="mid"><b ${o.count === false ? "" : `data-count="${o.v}"`}>${o.count === false ? (o.text != null ? o.text : o.v) : 0}</b>${o.sub ? `<span>${o.sub}</span>` : ""}</div></div>`;
  }
  const bar = (v, cls) => `<div class="bar ${cls || ""}" role="progressbar" aria-valuenow="${Math.round(v)}" aria-valuemin="0" aria-valuemax="100"><i data-w="${Math.min(100, v)}"></i></div>`;
  function animate(root) {
    root = root || document; const rm = reduce();
    $$(".ring .val", root).forEach(c => { const C = +c.dataset.c, v = +c.dataset.v; requestAnimationFrame(() => requestAnimationFrame(() => c.style.strokeDashoffset = C * (1 - v / 100))); });
    $$(".bar>i[data-w]", root).forEach(i => requestAnimationFrame(() => requestAnimationFrame(() => i.style.width = i.dataset.w + "%")));
    $$("[data-count]", root).forEach(el => {
      const to = +el.dataset.count, pre = el.dataset.pre || "", suf = el.dataset.suf || "", f = el.dataset.fmt === "inr" ? n => inr(n) : n => Math.round(n).toLocaleString("en-IN");
      if (rm) { el.textContent = pre + f(to) + suf; return; }
      const t0 = performance.now(), dur = 1100; (function s(t) { const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3); el.textContent = pre + f(to * e) + suf; if (k < 1) requestAnimationFrame(s); })(t0);
    });
  }
  function toast(m) { $$(".toast").forEach(t => t.remove()); const t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); t.textContent = m; document.body.appendChild(t); setTimeout(() => t.remove(), 3200); }
  function confetti() {
    if (reduce()) return; const c = document.createElement("div"); c.className = "cf"; c.setAttribute("aria-hidden", "true"); const col = ["#1DBA8C", "#0F8F8D", "#5A55D6", "#F2B04C", "#E8590C"];
    for (let i = 0; i < 46; i++) { const e = document.createElement("i"); e.style.left = Math.random() * 100 + "%"; e.style.background = col[i % 5]; e.style.animationDelay = Math.random() * .5 + "s"; e.style.animationDuration = 1.2 + Math.random() + "s"; c.appendChild(e); }
    document.body.appendChild(c); setTimeout(() => c.remove(), 3000);
  }
  let lastFocus;
  function modal(html, o) {
    o = o || {}; lastFocus = document.activeElement; const s = document.createElement("div"); s.className = "scrim"; s.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-label="${o.label || "Dialog"}"><button class="icon-btn x" aria-label="Close">${icon("x")}</button>${html}</div>`;
    document.body.appendChild(s); const close = () => { s.remove(); document.removeEventListener("keydown", esc); lastFocus && lastFocus.focus && lastFocus.focus(); o.onClose && o.onClose(); };
    const esc = e => { if (e.key === "Escape") close(); }; document.addEventListener("keydown", esc);
    s.addEventListener("click", e => { if (e.target === s) close(); }); $(".x", s).onclick = close; o.onMount && o.onMount(s.firstChild, close);
    const f = $("button:not(.x),a,input", s.firstChild) || $(".x", s); f && f.focus(); animate(s); return { el: s.firstChild, close };
  }

  /* ---------- XP, badges, completion ---------- */
  function addXP(n, why) { S.xpx[key()] = (S.xpx[key()] || 0) + n; save(); if (why) toast(`+${n} points · ${why}`); }
  function flag(name) {
    flags()[name] = true; const b = D.badges.find(x => x.flag === name); save();
    if (b && !unlocked(b.id)) { ubs().push(b.id); addXP(b.xp); save(); confetti();
      setTimeout(() => modal(`<div style="text-align:center;padding:10px 0"><div class="unlock-badge">${icon(b.icon, 46)}</div><span class="tag pos">Achievement unlocked</span><h2 style="margin:10px 0 4px">${b.name}</h2><p class="muted">${b.desc}</p><p class="sm" style="margin-top:10px"><strong>+${b.xp} points</strong> · points track your progress and have no cash value</p><div class="row" style="justify-content:center;margin-top:18px"><a class="btn soft" href="${url("achievement-center.html")}">Achievement Center</a></div></div>`, { label: "Achievement unlocked" }), 450); }
  }
  function complete(id) {
    const a = act(id), L = doneList(); if (L.includes(id)) return false; L.push(id); addXP(a.pts, a.title); flag("first");
    const st = streak(); if (st >= 3) flag("streak3"); if (st >= 7) flag("streak7"); if (st >= 30) flag("streak30");
    if (a.type === "weekly") flag("weekly"); if (L.filter(x => (act(x) || {}).flow === "learn").length >= 5 || (prof().baseBadges.includes("b-learner") && L.filter(x => (act(x) || {}).flow === "learn").length >= 2)) flag("learner");
    if (prof().score >= 675) flag("free"); if (prof().emMonths >= 3) flag("safe"); save(); return true;
  }

  /* ---------- navigation ---------- */
  const inPages = () => !document.body.dataset.root;
  const url = f => (inPages() ? "" : "pages/") + f;
  const home = () => (inPages() ? "../index.html" : "index.html");
  const NAV = [
    ["Companion", [["home-companion", "Home", "home"], ["ai-companion", "AI Companion", "chat"]]],
    ["Financial health", [["financial-wellness", "Wellness & Score", "ring"], ["goals-planning", "Goals & Planning", "target"], ["savings-adventure", "Savings Adventure", "route"], ["financial-journey", "Independence Journey", "compass"]]],
    ["Learn & play", [["daily-activities", "Daily Activities", "calendar"], ["financial-games", "Learn & Play", "gamepad"], ["quiz-arena", "Quiz Arena", "brain"], ["investment-simulator", "Investment Simulator", "trend"]]],
    ["Progress", [["achievement-center", "Achievements", "trophy"], ["financial-wrapped", "Monthly Wrapped", "gift"], ["premium-experience", "Premium", "crown"], ["onboarding", "Onboarding flow", "user"]]]
  ];
  const TABS = [["home-companion", "Home", "home"], ["ai-companion", "Coach", "chat"], ["daily-activities", "Today", "calendar"], ["financial-games", "Play", "gamepad"]];

  function pop(btn, build) {
    const w = btn.parentElement; const ex = $(".pop", w); if (ex) { ex.remove(); btn.setAttribute("aria-expanded", "false"); return; }
    $$(".pop").forEach(x => x.remove()); const el = document.createElement("div"); el.className = "pop"; el.innerHTML = build(); w.appendChild(el); btn.setAttribute("aria-expanded", "true"); return el;
  }
  document.addEventListener("click", e => { if (!e.target.closest(".rel")) $$(".pop").forEach(x => x.remove()); });

  function profileMenu(btn) {
    const el = pop(btn, () => `<h6>Demo profile (simulated)</h6>${D.profiles.map(p => `<button class="opt" role="menuitemradio" aria-checked="${p.id === S.profile}" data-p="${p.id}"><span class="avatar" style="--h:${p.hue}">${p.first[0]}</span><span><b>${p.tag}</b><br><span class="xs muted">${p.name} · ${p.blurb}</span></span></button>`).join("")}`);
    el && $$("button[data-p]", el).forEach(b => b.onclick = () => { setProfile(b.dataset.p); el.remove(); });
  }
  function styleMenu(btn) {
    const el = pop(btn, () => `<h6>Theme</h6><div class="row wrap" style="padding:4px 8px">${[["auto", "Auto"], ["light", "Light"], ["dark", "Dark"]].map(([v, l]) => `<button class="chip ${S.theme === v ? "on" : ""}" data-t="${v}">${l}</button>`).join("")}</div>
      <h6>Visual direction</h6><div class="row wrap" style="padding:4px 8px">${[["blend", "Blended (recommended)"], ["a", "A · Private Wealth"], ["b", "B · Gamified"], ["c", "C · AI-first"]].map(([v, l]) => `<button class="chip ${S.dir === v ? "on" : ""}" data-d="${v}">${l}</button>`).join("")}</div>
      <h6>Demo</h6><div style="padding:4px 8px"><button class="chip" data-reset>Reset demo progress</button></div>`);
    if (!el) return;
    $$("[data-t]", el).forEach(b => b.onclick = () => { S.theme = b.dataset.t; save(); applyTheme(); el.remove(); });
    $$("[data-d]", el).forEach(b => b.onclick = () => { S.dir = b.dataset.d; save(); applyTheme(); el.remove(); toast("Direction: " + b.textContent); });
    $("[data-reset]", el).onclick = () => { S.done = {}; S.xpx = {}; S.flags = {}; S.ub = {}; S.chat = {}; S.extra = {}; save(); el.remove(); toast("Demo progress reset"); rerender(); window.FS_ONPROFILE && window.FS_ONPROFILE(); };
  }
  function notifMenu(btn) {
    const p = prof(), ins = D.insights[p.id].slice(0, 3);
    const el = pop(btn, () => `<h6>Notifications (simulated)</h6>${ins.map(i => `<a class="opt" style="text-decoration:none;color:inherit" href="${url(i.href)}"><span class="ico ${i.type === "watch" ? "warn" : i.type === "good" ? "pos" : ""}" style="width:34px;height:34px">${icon(i.type === "watch" ? "bell" : i.type === "good" ? "check" : "info", 16)}</span><span><b class="sm">${i.t}</b><br><span class="xs muted">${i.cta} →</span></span></a>`).join("")}<p class="xs muted" style="padding:6px 10px">One calm digest per day. You control what you see.</p>`);
    const dot = $(".dot", btn); dot && dot.remove(); return el;
  }

  let CFG = null, rootEl = null;
  function setProfile(id) { S.profile = id; save(); rerender(true); window.FS_ONPROFILE && window.FS_ONPROFILE(); }
  function renderShell(c) {
    const p = prof(); document.title = c.title + " · Finscore V2";
    const nav = NAV.map(([h, items]) => `<h6>${h}</h6>` + items.map(([f, l, i]) => `<a class="item" href="${url(f + ".html")}" ${f === c.id ? 'aria-current="page"' : ""}>${icon(i, 19)}${l}</a>`).join("")).join("");
    const tabs = TABS.map(([f, l, i]) => `<a href="${url(f + ".html")}" ${f === c.id ? 'aria-current="page"' : ""}>${icon(i, 22)}${l}</a>`).join("") + `<button id="more" aria-label="More screens">${icon("grid", 22)}More</button>`;
    document.body.innerHTML = `<a class="skip" href="#main">Skip to content</a><div class="shell"><aside class="nav" aria-label="Primary"><a class="brand" href="${home()}"><span class="mark">${icon("spark", 20)}</span><span>Finscore<small>V2 · Prototype</small></span></a>${nav}<div class="grow"></div><div class="sim-note"><span class="sim-badge">Simulated</span><br>All data is dummy data for design exploration. Nothing here is real advice.</div></aside>
      <div class="content"><header class="topbar"><a class="crumb" href="${home()}" aria-label="Back to prototype gallery">${icon("back", 18)}<span>Gallery</span></a><div class="sp"></div><span class="sim-badge hide-s">Simulated data</span>
        <div class="rel"><button class="icon-btn" id="bell" aria-label="Notifications" aria-expanded="false">${icon("bell")}<i class="dot"></i></button></div>
        <div class="rel"><button class="icon-btn" id="sty" aria-label="Theme and direction" aria-expanded="false">${icon("palette")}</button></div>
        <div class="rel"><button class="chip" id="prof" aria-label="Switch demo profile" aria-expanded="false" style="padding:4px 12px 4px 4px"><span class="avatar" style="--h:${p.hue}">${p.first[0]}</span><span class="hide-s">${p.tag}</span>${icon("arrow", 14)}</button></div></header>
        <main id="main" tabindex="-1"></main></div></div><nav class="tabbar" aria-label="Mobile">${tabs}</nav>`;
    $("#prof").onclick = e => profileMenu(e.currentTarget); $("#sty").onclick = e => styleMenu(e.currentTarget); $("#bell").onclick = e => notifMenu(e.currentTarget);
    $("#more").onclick = () => modal(`<h2 style="margin-bottom:12px">All screens</h2><div class="list">${NAV.flatMap(n => n[1]).map(([f, l, i]) => `<a class="li" href="${url(f + ".html")}"><span class="ico">${icon(i)}</span><b style="align-self:center">${l}</b></a>`).join("")}<a class="li" href="${home()}"><span class="ico">${icon("layers")}</span><b style="align-self:center">Prototype gallery</b></a></div>`, { label: "All screens" });
    rootEl = $("#main");
  }
  function skeleton() { rootEl.innerHTML = `<div class="grid g-home" aria-busy="true" aria-label="Loading"><div class="stack"><div class="sk" style="height:170px"></div><div class="sk" style="height:220px"></div></div><div class="stack"><div class="sk" style="height:130px"></div><div class="sk" style="height:260px"></div></div></div>`; }
  function draw() { const p = prof(); rootEl.innerHTML = CFG.render(p, ctx(p)); animate(rootEl); CFG.after && CFG.after(p, rootEl); const pr = $("#prof"); if (pr) { pr.innerHTML = `<span class="avatar" style="--h:${p.hue}">${p.first[0]}</span><span class="hide-s">${p.tag}</span>${icon("arrow", 14)}`; } }
  function rerender(withSkel) { if (!CFG) return; if (withSkel && !reduce()) { skeleton(); setTimeout(draw, 480); } else if (withSkel) draw(); else draw(); }
  function init(c) { CFG = c; renderShell(c); draw(); }
  const head = (t, sub, right) => `<div class="page-head"><div><h1>${t}</h1>${sub ? `<p>${sub}</p>` : ""}</div>${right || ""}</div>`;

  window.FS = { D, S, save, $, $$, icon, inr, cpt, prof, stageOf, DL, DI, doneList, flags, ubs, xpTotal, lvl, unlocked, streak, doneToday, act, greet, dims, wellness, ctx, fill, md, ring, bar, animate, toast, confetti, modal, addXP, flag, complete, url, home, init, rerender, setProfile, head, applyTheme, reduce, profileMenu, styleMenu, simBadge: '<span class="sim-badge">Simulated</span>', NAV };
})();
