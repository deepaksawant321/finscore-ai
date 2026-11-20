/* AI Companion — scripted conversation using only the simulated profile. No AI API. */
(function () {
  const F = window.FS, A = F.D.aiScripts;
  const hist = () => (F.S.chat[F.S.profile] = F.S.chat[F.S.profile] || []);
  const cardHtml = (cs, c) => cs && cs.length ? `<div class="acts">${cs.map(k => `<a class="act" href="${F.url(k.href)}"><span class="ico ai">${F.icon(k.icon, 18)}</span><span style="flex:1"><b class="sm">${F.fill(k.t, c)}</b><br><span class="xs muted">${F.fill(k.d, c)}</span></span>${F.icon("arrow", 16)}</a>`).join("")}</div>` : "";
  const msgHtml = (m, c) => m.r === "u" ? `<div class="m u"><div class="bub">${m.t.replace(/</g, "&lt;")}</div></div>` : `<div class="m"><div class="orb" style="--o:34px" aria-hidden="true"></div><div style="min-width:0"><div class="bub">${F.md(m.t)}</div>${cardHtml(m.cards, c)}<div class="xs muted" style="margin:4px 4px 0">${A.disclosure}</div></div></div>`;

  function reply(q, p, c) {
    const s = A.suggested.find(x => x.q === q), low = q.toLowerCase();
    if (s) { const a = A.answers[s.id]; return { t: F.fill(a.text, c), cards: a.cards }; }
    const t = A.topics.find(t => t.k.some(k => new RegExp("\\b" + k, "i").test(low)));
    if (t) return { t: F.fill(t.a, c) };
    const m = low.match(/emergency|save|saving|house|home|invest|score|retire|focus|health/);
    const map = { emergency: "emergency", save: "save", saving: "save", house: "house", home: "house", invest: "invest", score: "score", retire: "retire", focus: "focus", health: "healthy" };
    if (m) { const a = A.answers[map[m[0]]]; return { t: F.fill(a.text, c), cards: a.cards }; }
    return { t: F.fill(A.fallback, c) };
  }

  F.init({
    id: "ai-companion", title: "AI Companion",
    render(p, c) {
      return `${F.head("AI Companion", "Your friendly guide. It answers from the simulated profile only, explains in plain language and never guesses.", `<span class="sim-badge">Simulated · scripted replies</span>`)}
      <div class="grid" style="grid-template-columns:minmax(0,1.7fr) minmax(260px,1fr);align-items:start" id="aigrid">
        <section class="card chat" aria-label="Conversation"><div class="row" style="padding-bottom:12px;border-bottom:1px solid var(--line)"><div class="orb" id="orb" style="--o:46px" aria-hidden="true"></div><div style="flex:1"><b>Fin</b> <span class="tag ai">Simulated AI</span><div class="xs muted">Talking about ${p.name} · ${p.tag}</div></div><button class="icon-btn" id="voice" aria-label="Voice mode concept">${F.icon("mic")}</button></div>
          <div class="msgs" id="msgs" role="log" aria-live="polite" aria-label="Messages"></div>
          <div class="swipe" id="sug" style="padding:8px 0;scroll-snap-type:none;gap:8px">${A.suggested.map(s => `<button class="chip" style="flex:none;width:auto" data-s="${s.id}">${s.q}</button>`).join("")}</div>
          <form class="composer" id="form"><input id="inp" placeholder="Ask about your simulated finances…" aria-label="Message Fin" autocomplete="off"><button type="button" class="icon-btn" id="mic2" aria-label="Voice concept">${F.icon("mic")}</button><button class="btn ai" type="submit" aria-label="Send">${F.icon("send", 18)}</button></form></section>
        <aside class="stack" aria-label="Context">
          <section class="card pad-s"><h4 style="margin-bottom:6px">What Fin knows <span class="sim-badge">Simulated</span></h4><p class="xs muted" style="margin-bottom:10px">Transparency: only these demo facts are used.</p>
            <ul class="list sm" style="gap:6px"><li>• Age ${p.age}, ${p.tag}</li><li>• Income ${F.inr(p.income)}/mo · spend ${F.inr(p.expenses)}</li><li>• Score ${p.score}/900 · ${c.stage}</li><li>• Emergency cover ${p.emMonths} months</li><li>• ${p.goals.length} goal${p.goals.length > 1 ? "s" : ""}: ${p.goals.map(g => g.name).join(", ")}</li></ul>
            <p class="xs muted" style="margin-top:10px">Fin doesn't know: your real accounts, tax situation or market views.</p></section>
          <section class="card pad-s"><h4 style="margin-bottom:10px">Suggested for ${p.first}</h4><a class="li" href="${F.url("daily-activities.html")}"><span class="ico">${F.icon(F.act(p.activity).icon)}</span><span><b class="sm">${F.act(p.activity).title}</b><br><span class="xs muted">${F.act(p.activity).mins} min · +${F.act(p.activity).pts} pts</span></span></a></section>
          <section class="card pad-s"><h4 style="margin-bottom:10px">Previous conversations <span class="sim-badge">Demo</span></h4><ul class="list">${["Yesterday · Emergency fund basics", "Mon · Why my score moved", "Last week · Goal planning"].map(h => `<li><button class="li" style="width:100%;text-align:left;border:0;cursor:pointer" data-h="${h}">${F.icon("chat", 16)}<span class="sm">${h}</span></button></li>`).join("")}</ul></section>
        </aside></div>`;
    },
    after(p, root) {
      const c = F.ctx(p), box = F.$("#msgs", root), inp = F.$("#inp", root), orb = F.$("#orb", root);
      const scroll = () => box.scrollTo({ top: box.scrollHeight, behavior: F.reduce() ? "auto" : "smooth" });
      const H = hist(); if (!H.length) H.push({ r: "a", t: F.fill(A.welcome, c), cards: [] });
      box.innerHTML = H.map(m => msgHtml(m, c)).join(""); scroll();
      function ask(q) {
        if (!q) return; H.push({ r: "u", t: q }); box.insertAdjacentHTML("beforeend", msgHtml({ r: "u", t: q }, c));
        const ty = document.createElement("div"); ty.className = "m"; ty.innerHTML = `<div class="orb talk" style="--o:34px" aria-hidden="true"></div><div class="bub"><span class="typing" aria-label="Fin is typing"><i></i><i></i><i></i></span></div>`; box.appendChild(ty); scroll(); orb.classList.add("talk");
        setTimeout(() => { ty.remove(); orb.classList.remove("talk"); const r = reply(q, p, c); const m = { r: "a", t: r.t, cards: r.cards }; H.push(m); box.insertAdjacentHTML("beforeend", msgHtml(m, c)); F.save(); scroll(); F.flag("askAI"); }, F.reduce() ? 50 : 900);
        F.save();
      }
      F.$$("[data-s]", root).forEach(b => b.onclick = () => ask(A.suggested.find(s => s.id === b.dataset.s).q));
      F.$("#form", root).onsubmit = e => { e.preventDefault(); const v = inp.value.trim(); inp.value = ""; ask(v); };
      F.$$("[data-h]", root).forEach(b => b.onclick = () => F.toast("Demo history — previous chats are simulated"));
      const voice = () => { const m = F.modal(`<div class="voice" style="position:relative;border-radius:20px;margin:-26px;padding:36px 20px"><div><div class="orb talk" style="--o:96px;margin:0 auto" aria-hidden="true"></div><div class="wave" aria-hidden="true">${"<i></i>".repeat(14)}</div><h2>I'm listening… (concept)</h2><p style="opacity:.8;margin:8px 0 18px">Voice is a visual concept only — no microphone is used in this prototype.</p><button class="btn" data-ok>Got it</button></div></div>`, { label: "Voice concept" }); m.el.querySelector("[data-ok]").onclick = () => { m.close(); ask("What should I focus on this month?"); }; };
      F.$("#voice", root).onclick = voice; F.$("#mic2", root).onclick = voice;
      const q = new URLSearchParams(location.search); const pre = q.get("ask") && A.suggested.find(s => s.id === q.get("ask")); const pt = q.get("q");
      if ((pre || pt) && !F.S.extra.asked) { F.S.extra.asked = 1; setTimeout(() => { ask(pre ? pre.q : pt); }, 400); setTimeout(() => { F.S.extra.asked = 0; F.save(); }, 3000); }
    }
  });
})();
