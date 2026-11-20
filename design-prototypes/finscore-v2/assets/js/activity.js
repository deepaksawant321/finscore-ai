/* Shared activity runner: lesson → question → takeaway, or checklist, with completion animation. Simulated. */
(function () {
  const F = window.FS;
  F.runActivity = function (id, onDone) {
    const a = F.act(id), done = F.doneList().includes(id), p = F.prof();
    const head = `<div class="row" style="margin-bottom:12px"><span class="ico lg">${F.icon(a.icon, 26)}</span><div><span class="tag">${a.type}</span> <span class="sim-badge">Simulated</span><h2 style="margin-top:6px">${a.title}</h2></div></div>
      <div class="row wrap sm muted" style="margin-bottom:12px"><span>${F.icon("clock", 15)} ${a.mins} min</span><span>· ${a.diff}</span><span>· +${a.pts} virtual points</span></div>`;
    const finish = (m) => {
      const first = F.complete(id);
      m.el.innerHTML = `<button class="icon-btn x" aria-label="Close">${F.icon("x")}</button><div style="text-align:center;padding:12px 0">
        <svg width="96" height="96" viewBox="0 0 96 96" aria-hidden="true"><circle cx="48" cy="48" r="42" fill="var(--pos-soft)" stroke="var(--pos)" stroke-width="4" stroke-dasharray="264" stroke-dashoffset="264"><animate attributeName="stroke-dashoffset" to="0" dur=".7s" fill="freeze"/></circle><path d="M30 50l12 12 24-26" fill="none" stroke="var(--pos)" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="70" stroke-dashoffset="70"><animate attributeName="stroke-dashoffset" to="0" begin=".5s" dur=".5s" fill="freeze"/></path></svg>
        <h2 style="margin:10px 0 4px">${first ? "Nicely done" : "Revisited"}, ${p.first}</h2><p class="muted">${a.take}</p>
        <p style="margin-top:12px"><span class="tag pos">${first ? "+" + a.pts + " virtual points" : "Already counted today"}</span></p>
        <p class="xs muted" style="margin-top:6px">Why this mattered: ${a.value}</p><button class="btn" style="margin-top:18px" data-close>Continue</button></div>`;
      m.el.querySelector(".x").onclick = m.close; m.el.querySelector("[data-close]").onclick = m.close; if (first) F.confetti(); onDone && onDone();
    };
    let m;
    if (a.flow === "link") {
      m = F.modal(head + `<p>${a.desc}</p><p class="sm muted" style="margin:10px 0 16px">${a.value}</p><button class="btn" data-go>Open ${a.title}</button>`, { label: a.title });
      m.el.querySelector("[data-go]").onclick = () => { F.complete(id); location.href = F.url(a.href); }; return;
    }
    if (a.flow === "check") {
      m = F.modal(head + `<p class="muted" style="margin-bottom:10px">${a.desc}</p><div class="list">${a.items.map((t, i) => `<label class="check"><input type="checkbox" data-i="${i}"> ${t}</label>`).join("")}</div><button class="btn" style="margin-top:16px" data-fin disabled>Finish activity</button>`, { label: a.title });
      const chk = F.$$("input", m.el), fin = m.el.querySelector("[data-fin]"); chk.forEach(c => c.onchange = () => fin.disabled = !chk.some(x => x.checked)); fin.onclick = () => finish(m); return;
    }
    const step1 = `${head}<div class="card flat" style="background:var(--card-2)"><h3>${a.lesson.h}</h3><p style="margin-top:8px">${a.lesson.b}</p></div><button class="btn" style="margin-top:16px" data-next>I've read it — quick check</button>`;
    m = F.modal(step1, { label: a.title });
    m.el.querySelector("[data-next]").onclick = () => {
      m.el.innerHTML = `<button class="icon-btn x" aria-label="Close">${F.icon("x")}</button>${head}<h3 style="margin-bottom:10px">${a.q.q}</h3><div class="list" id="opts">${a.q.o.map((o, i) => `<button class="opt" data-i="${i}">${o}</button>`).join("")}</div><div id="fb" aria-live="polite" style="margin-top:14px"></div>`;
      m.el.querySelector(".x").onclick = m.close;
      F.$$(".opt", m.el).forEach(b => b.onclick = () => {
        const ok = +b.dataset.i === a.q.a; F.$$(".opt", m.el).forEach(x => { x.disabled = true; if (+x.dataset.i === a.q.a) x.classList.add("right"); }); if (!ok) b.classList.add("wrong");
        m.el.querySelector("#fb").innerHTML = `<p><span class="tag ${ok ? "pos" : "warn"}">${ok ? "Correct" : "Not quite — and that's fine"}</span></p><p class="sm" style="margin:8px 0 14px">${a.q.why}</p><button class="btn" data-fin>Finish activity</button>`;
        m.el.querySelector("[data-fin]").onclick = () => finish(m);
      });
    };
  };
})();
