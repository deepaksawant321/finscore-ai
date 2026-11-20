/* Financial Quiz Arena */
(function () {
  const F = window.FS, Q = F.D.quiz; let st = { phase: "setup", diff: "Easy" }, timer = null;
  const best = () => { const e = F.S.extra; e.quiz = e.quiz || {}; return e.quiz; };
  const TL = 20;
  function start(d) {
    const pool = d === "Mixed" ? Q.slice().sort(() => Math.random() - .5).slice(0, 6) : Q.filter(q => q.d === d); st = { phase: "play", diff: d, qs: pool, i: 0, score: 0, ok: 0, t: TL, ans: null, log: [], combo: 0, bestCombo: 0 }; F.rerender();
  }
  function tick() { clearInterval(timer); timer = setInterval(() => { if (st.ans != null) return; st.t--; const b = F.$("#tb>i"), n = F.$("#tn"); if (b) b.style.width = st.t / TL * 100 + "%"; if (n) n.textContent = st.t + "s"; if (st.t <= 0) answer(-1); }, 1000); }
  function answer(i) {
    if (st.ans != null) return; st.ans = i; const q = st.qs[st.i], ok = i === q.a; clearInterval(timer);
    if (ok) { st.ok++; st.combo++; st.bestCombo = Math.max(st.bestCombo, st.combo); st.score += 10 + Math.round(st.t / 4) + (st.combo > 1 ? 2 : 0); } else st.combo = 0; st.log.push({ q: q.q, ok, a: q.o[q.a], why: q.why, yours: i < 0 ? "Time ran out" : q.o[i] });
    F.$$(".opt").forEach(b => { b.disabled = true; if (+b.dataset.i === q.a) b.classList.add("right"); else if (+b.dataset.i === i) b.classList.add("wrong"); });
    F.$("#fb").innerHTML = `<div class="li" style="margin-top:14px;background:${ok ? "var(--pos-soft)" : "var(--warn-soft)"}"><span class="ico ${ok ? "pos" : "warn"}">${F.icon(ok ? "check" : i < 0 ? "clock" : "info", 18)}</span><div><b>${ok ? "Correct!" : i < 0 ? "Time's up" : "Not quite"}</b><div class="sm">${q.why}</div></div></div><button class="btn" id="nx" style="margin-top:14px">${st.i + 1 < st.qs.length ? "Next question" : "See results"}</button>`;
    F.$("#nx").onclick = () => { if (st.i + 1 < st.qs.length) { st.i++; st.t = TL; st.ans = null; F.rerender(); } else finish(); };
    const sc = F.$("#sc"); if (sc) sc.textContent = st.score; F.$("#nx").focus();
  }
  function finish() {
    clearInterval(timer); st.phase = "end"; const pct = Math.round(st.ok / st.qs.length * 100), B = best(), k = F.S.profile + st.diff; B[k] = Math.max(B[k] || 0, st.score); F.addXP(Math.round(st.ok * 3), "Quiz Arena"); F.flag("first"); if (pct >= 80) { F.flag("quizAce"); F.confetti(); } F.save(); F.rerender();
  }
  F.init({
    id: "quiz-arena", title: "Quiz Arena",
    render(p) {
      const B = best();
      if (st.phase === "setup") return `${F.head("Financial Quiz Arena", "Test what you know — with instant feedback and a one-line explanation for every answer. Wrong answers teach, never punish.", `<span class="sim-badge">Simulated</span>`)}
        <div class="grid g4">${[["Easy", "Core everyday money ideas", "pos"], ["Medium", "Debt, inflation and diversification", "warn"], ["Hard", "Risk capacity, sequence risk, returns", "neg"], ["Mixed", "Six random questions", "ai"]].map(d => `<button class="card" style="text-align:left;cursor:pointer" data-d="${d[0]}"><span class="tag ${d[2]}">${d[0]}</span><h3 style="margin:10px 0 4px">${d[0] === "Mixed" ? "Mixed round" : d[0] + " level"}</h3><p class="sm muted">${d[1]}</p><p class="xs" style="margin-top:12px">${d[0] === "Mixed" ? "6" : "4"} questions · ${TL}s each${B[p.id + d[0]] ? ` · Best <b>${B[p.id + d[0]]}</b>` : ""}</p></button>`).join("")}</div>
        <section class="card" style="margin-top:18px"><h4>How scoring works</h4><p class="sm muted" style="margin-top:6px">10 points per correct answer, a small speed bonus and a combo bonus. Scores are for fun and learning, with no rankings against real people and no rewards beyond progress points. 80%+ unlocks the <b>Quiz Ace</b> badge.</p></section>`;
      if (st.phase === "end") { const pct = Math.round(st.ok / st.qs.length * 100); return `${F.head("Round complete", "", "")}<div class="grid g2" style="align-items:start"><section class="card" style="text-align:center">${F.ring({ v: pct, size: 150, stroke: 14, color: pct >= 80 ? "var(--pos)" : "var(--brand)", sub: st.ok + "/" + st.qs.length + " correct", fs: 38 })}<h2 style="margin:14px 0 4px">${pct >= 80 ? "Brilliant, " + p.first + "!" : pct >= 50 ? "Solid work, " + p.first : "Good start — that's how learning works"}</h2><p class="muted">${st.score} points · best combo ${st.bestCombo}</p><div class="row wrap" style="justify-content:center;margin-top:16px"><button class="btn" id="again">Play again</button><button class="btn ghost" id="menu">Change level</button></div></section>
        <section class="card"><h3 style="margin-bottom:12px">Review & explanations</h3><ul class="list">${st.log.map(l => `<li class="li"><span class="ico ${l.ok ? "pos" : "warn"}">${F.icon(l.ok ? "check" : "info", 16)}</span><div><b class="sm">${l.q}</b><div class="xs muted">Answer: ${l.a}${l.ok ? "" : " · You: " + l.yours}</div><div class="xs">${l.why}</div></div></li>`).join("")}</ul></section></div>`; }
      const q = st.qs[st.i];
      return `<div style="max-width:720px;margin:0 auto"><div class="row between wrap"><span class="tag ${st.diff === "Easy" ? "pos" : st.diff === "Hard" ? "neg" : "warn"}">${q.d} · Q${st.i + 1}/${st.qs.length}</span><span class="row sm"><span class="tag ai">Score <b id="sc">${st.score}</b></span>${st.combo > 1 ? `<span class="tag">${F.icon("flame", 12)} x${st.combo}</span>` : ""}<span class="tag" id="tn" aria-live="off">${st.t}s</span></span></div>
        <div class="bar" id="tb" role="timer" aria-label="Time remaining" style="margin:12px 0"><i style="width:${st.t / TL * 100}%;transition:width 1s linear"></i></div>
        <section class="card"><h2 style="margin-bottom:16px">${q.q}</h2><div class="list">${q.o.map((o, i) => `<button class="opt" data-i="${i}"><span class="tag" style="min-width:26px;justify-content:center">${"ABCD"[i]}</span> ${o}</button>`).join("")}</div><div id="fb" aria-live="polite"></div></section></div>`;
    },
    after(p, root) {
      F.$$("[data-d]", root).forEach(b => b.onclick = () => start(b.dataset.d));
      F.$$(".opt", root).forEach(b => b.onclick = () => answer(+b.dataset.i));
      if (st.phase === "play") { if (st.ans == null) tick(); }
      const a = F.$("#again", root); if (a) a.onclick = () => start(st.diff); const m = F.$("#menu", root); if (m) m.onclick = () => { st = { phase: "setup" }; F.rerender(); };
      document.onkeydown = e => { if (st.phase === "play" && st.ans == null && /^[1-4]$/.test(e.key) && !F.$(".scrim")) answer(+e.key - 1); };
    }
  });
})();
