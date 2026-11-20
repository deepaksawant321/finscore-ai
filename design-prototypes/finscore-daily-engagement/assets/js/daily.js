/* Daily activities: Money Monday → Sunday Review. Every activity works offline with simulated content. */
(function(){
var FD = window.FD, D = FD.D, h = FD.h;
var sel = (function(){ var q = FD.qs("day"); return q && FD.dayById(q) ? q : FD.todayDay().id; })();
var runs = [], satTab = "spin", cardIdx = 0, cardSeen = {}, deck = null;
function akey(id){ return "a:" + FD.wk() + ":" + id; }
function dayIdx(id){ return D.days.map(function(d){ return d.id; }).indexOf(id); }
function seedDone(id){ var d = FD.P().done[akey(id)]; return d && d.seed; }

function render(){
  var td = FD.todayDay();
  return '<div class="page-h"><div><p class="eyebrow">Daily activities</p><h1 class="h1">Something small, every day</h1><p class="muted">A different activity each day. Explore any day, skip any day. XP is earned for real learning, once per activity each week.</p></div></div>' +
   '<div class="daytabs" role="tablist" aria-label="Days of the week">' + D.days.map(function(d){ var done = FD.dayDone(d.id); return '<button role="tab" class="dt' + (d.id === sel ? " on" : "") + (done ? " done" : "") + '" data-d="' + d.id + '" aria-selected="' + (d.id === sel) + '" id="tab-' + d.id + '" aria-controls="panel"><span class="dt-ic">' + FD.icon(done ? "check" : d.icon) + '</span><span class="dt-s">' + d.short + '</span>' + (d.id === td.id ? '<i class="dt-today">Today</i>' : "") + '</button>'; }).join("") + '</div>' +
   '<section class="card pad panel" id="panel" role="tabpanel" aria-labelledby="tab-' + sel + '"><div id="phead"></div><div id="act" class="act"></div></section>';
}

function head(){
  var d = FD.dayById(sel), td = FD.todayDay(), done = FD.dayDone(d.id), seed = seedDone(d.id);
  var xp = d.id === "sat" ? "10–15 XP" : d.xp + " XP";
  return '<div class="ph"><span class="ph-ic">' + FD.icon(d.icon) + '</span><div class="sp"><p class="eyebrow">' + d.short + (d.id === td.id ? " · Today" : "") + '</p><h2 class="h2">' + d.name + '</h2><p class="muted">' + d.sub + ' · ~' + d.mins + ' min</p></div><div class="ph-r">' + (done ? '<span class="pill pos">' + FD.icon("check") + ' ' + (seed ? "Done earlier (demo)" : "Completed this week") + '</span>' : '<span class="pill gold">+' + xp + '</span>') + '</div></div>' +
   (d.id !== td.id ? '<p class="sm muted note">' + FD.icon("info") + ' Not today\'s activity, but open any time. Nothing is compulsory.</p>' : "") +
   (done ? '<p class="sm muted note">' + FD.icon("info") + ' XP for this activity is already counted this week. You can replay it as practice.</p>' : "");
}

function nextBtns(){
  var i = dayIdx(sel), nx = D.days[(i + 1) % 7];
  return '<button class="btn btn-primary" data-go="' + nx.id + '">Explore ' + nx.name + FD.icon("arrow") + '</button><a class="btn btn-ghost" href="companion-home.html">Back to home</a>';
}
function refreshTabs(){
  FD.$$(".dt").forEach(function(b){ var id = b.getAttribute("data-d"), done = FD.dayDone(id); b.classList.toggle("done", done); FD.$(".dt-ic", b).innerHTML = FD.icon(done ? "check" : FD.dayById(id).icon); });
  FD.$("#phead").innerHTML = head();
}
function finish(el, o){
  var r = FD.award(o.key, { xp: o.xp, type: o.type, title: o.title, id: o.id, stat: o.stat });
  if (r.gained) FD.confetti();
  el.innerHTML = FD.doneCard({ title: o.doneTitle || "Nicely done", text: o.text, gained: r.gained, repeat: r.repeat, extra: o.extra, btns: o.btns || nextBtns() });
  FD.animate(el); refreshTabs(); el.scrollIntoView({ behavior: FD.reduced() ? "auto" : "smooth", block: "nearest" });
}

/* ---------- Monday: financial health review ---------- */
function runMon(el){
  var i = 0, yes = 0, ans = [];
  function show(){
    var c = D.healthChecks[i];
    el.innerHTML = '<div class="quiz"><div class="quiz-top"><span class="pill">Check ' + (i + 1) + ' of ' + D.healthChecks.length + '</span></div>' + FD.bar(i / D.healthChecks.length * 100) + '<h3 class="q-t">' + h(c.q) + '</h3><div class="opts"><button class="opt" data-a="1"><span class="opt-l">' + FD.icon("check") + '</span><span>Yes</span></button><button class="opt" data-a="0"><span class="opt-l">…</span><span>Not yet</span></button></div></div>';
    FD.animate(el);
    FD.$$(".opt", el).forEach(function(b){ b.addEventListener("click", function(){ var a = b.getAttribute("data-a") === "1"; if (a) yes++; ans.push(a); i++; if (i < D.healthChecks.length) show(); else end(); }); });
  }
  function end(){
    var pr = FD.profile(), tips = D.healthChecks.map(function(c, k){ return '<li class="' + (ans[k] ? "ok" : "todo") + '">' + FD.icon(ans[k] ? "check" : "plus") + '<span><b>' + h(c.q) + '</b><br>' + h(ans[k] ? c.yes : c.no) + '</span></li>'; }).join("");
    var extra = '<div class="hc"><div class="hc-s">' + FD.ring(yes / 4 * 100, { size: 110, html: '<b class="big">' + yes + '/4</b>' }) + '<div><p class="eyebrow">Weekly habit score</p><p>' + (yes >= 3 ? "Strong habits this week." : yes >= 2 ? "A solid base to build on." : "A clear starting point. That's useful.") + '</p></div></div><ul class="hc-l">' + tips + '</ul><p class="fin-tip">' + FD.icon("sparkle") + ' <b>Fin\'s tip for ' + h(pr.first) + ':</b> ' + h(pr.focusWhy) + '</p></div>';
    finish(el, { key: akey("mon"), xp: 15, type: "habit", title: "Money Monday review", id: "mon", stat: "healthChecks", doneTitle: "Health review complete", text: "Honest check-ins are the first step to better habits.", extra: extra });
  }
  show();
}

/* ---------- Tuesday: trivia ---------- */
function runTue(el){
  var pr = FD.profile();
  el.innerHTML = '<div class="intro"><div class="intro-ic">' + FD.icon("brain") + '</div><h3 class="h3">Five questions, picked for a ' + h(pr.tag.toLowerCase()) + '</h3><p class="muted">Focus areas: ' + pr.quiz.map(function(c){ return D.cats[c]; }).join(" · ") + '. Score 60% or more for 20 XP.</p><label class="toggle"><input type="checkbox" id="tmr"> <span>Add a 20-second timer per question</span></label><button class="btn btn-primary" id="go">' + FD.icon("play") + ' Start trivia</button></div>';
  FD.$("#go", el).addEventListener("click", function(){
    var timed = FD.$("#tmr", el).checked;
    FD.runQuiz(el, { questions: FD.pickQuestions(5), key: akey("tue"), xp: 20, title: "Trivia Tuesday", id: "tue", timed: timed, after: nextBtns().replace("btn-primary", "btn-ghost"), again: function(){ runTue(el); }, onDone: refreshTabs });
  });
}

/* ---------- Wednesday: lesson + simulator ---------- */
function simChart(path, col){
  var W = 320, H = 150, pad = 26, max = Math.max.apply(null, path.concat([D.sim.start * 1.05])), min = Math.min.apply(null, path.concat([D.sim.start * 0.9]));
  function X(i){ return pad + i * (W - pad - 8) / (path.length - 1); } function Y(v){ return 10 + (1 - (v - min) / (max - min)) * (H - 36); }
  var pts = path.map(function(v, i){ return X(i).toFixed(1) + "," + Y(v).toFixed(1); }).join(" "), base = Y(D.sim.start).toFixed(1);
  return '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Simulated portfolio value over five years"><line x1="' + pad + '" x2="' + (W - 8) + '" y1="' + base + '" y2="' + base + '" stroke="var(--line)" stroke-dasharray="4 4"/><polygon points="' + X(0) + ',' + (H - 26) + ' ' + pts + ' ' + X(path.length - 1) + ',' + (H - 26) + '" fill="' + col + '" opacity=".14"/><polyline points="' + pts + '" fill="none" stroke="' + col + '" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" class="draw"/>' + path.map(function(v, i){ return '<circle cx="' + X(i) + '" cy="' + Y(v) + '" r="3.5" fill="var(--card)" stroke="' + col + '" stroke-width="2"/>'; }).join("") + ["Start"].concat(D.sim.years).map(function(t, i){ return '<text x="' + X(i) + '" y="' + (H - 8) + '" text-anchor="middle" font-size="10" fill="var(--muted)">' + t + '</text>'; }).join("") + '</svg>';
}
function simRun(a, sc){ var v = D.sim.start, path = [v], peak = v, dd = 0; for (var i = 0; i < 5; i++){ var r = 0; D.sim.assets.forEach(function(x){ r += a[x.k] / 100 * sc.r[x.k][i]; }); v = v * (1 + r / 100); path.push(v); peak = Math.max(peak, v); dd = Math.min(dd, (v - peak) / peak); } return { path: path, final: v, dd: dd }; }

function runWed(el){
  var pr = FD.profile(), steps = D.journey.filter(function(m){ return m.id === "invest"; })[0].steps;
  el.innerHTML = '<div class="intro"><div class="intro-ic">' + FD.icon("trend") + '</div><h3 class="h3">' + h(pr.wed) + '</h3><p class="muted">A two-step lesson, then a sandbox with <b>virtual money</b>. Returns are illustrative, not predictions. ' + FD.simTag("Simulated, not advice") + '</p><button class="btn btn-primary" id="go">' + FD.icon("play") + ' Start the lesson</button></div>';
  FD.$("#go", el).addEventListener("click", function(){ FD.runLesson(el, { steps: steps, onDone: function(){ sandbox(el); } }); });
}
function sandbox(el){
  var L = FD.level().n, alloc = { equity: 50, debt: 30, gold: 10, cash: 10 }, scs = D.sim.scenarios; runs = [];
  el.innerHTML = '<div class="sim"><div class="sim-note">' + FD.simTag("Virtual ₹1,00,000 · illustrative returns") + '<span class="sm muted">Not a recommendation. Real markets can behave very differently.</span></div>' +
   '<div class="grid g2 sim-g"><div><p class="eyebrow">1 · Choose a mix</p><div class="chips" id="pre">' + D.sim.presets.map(function(p, i){ return '<button class="chip" data-i="' + i + '">' + p.n + '</button>'; }).join("") + '</div><div id="sl"></div><p class="eyebrow mt">2 · Choose a market story</p><div class="scn" id="scn">' + scs.map(function(s){ var lock = s.lvl && L < s.lvl; return '<button class="scn-i" data-id="' + s.id + '" ' + (lock ? "disabled" : "") + '><b>' + h(s.n) + (lock ? " " + FD.icon("lock") : "") + '</b><span class="sm muted">' + (lock ? "Unlocks at level " + s.lvl : h(s.d)) + '</span></button>'; }).join("") + '</div></div>' +
   '<div class="sim-out" id="out"><div class="sim-empty">' + FD.illo("empty") + '<p class="muted">Pick a market story to run your mix through five virtual years.</p></div></div></div><div id="fin"></div></div>';
  var sl = FD.$("#sl", el);
  function sliders(){
    sl.innerHTML = D.sim.assets.map(function(a){ return '<div class="slr"><label for="s-' + a.k + '"><i style="background:' + a.c + '"></i>' + a.n + '</label><input type="range" min="0" max="100" step="5" id="s-' + a.k + '" value="' + alloc[a.k] + '" ' + (a.k === "cash" ? "disabled" : "") + ' aria-label="' + a.n + ' percent"><b id="v-' + a.k + '">' + alloc[a.k] + '%</b></div>'; }).join("") + '<div class="alloc" aria-hidden="true">' + D.sim.assets.map(function(a){ return '<i style="flex:' + alloc[a.k] + ';background:' + a.c + '"></i>'; }).join("") + '</div>';
    ["equity", "debt", "gold"].forEach(function(k){ FD.$("#s-" + k, sl).addEventListener("input", function(e){ var v = parseInt(e.target.value, 10), others = ["equity", "debt", "gold"].filter(function(x){ return x !== k; }).reduce(function(s, x){ return s + alloc[x]; }, 0); v = Math.min(v, 100 - others); alloc[k] = v; alloc.cash = 100 - alloc.equity - alloc.debt - alloc.gold; sliders(); var f = FD.$("#s-" + k, sl); if (f) f.focus(); }); });
  }
  sliders();
  FD.$$("#pre .chip", el).forEach(function(b){ b.addEventListener("click", function(){ var p = D.sim.presets[parseInt(b.getAttribute("data-i"), 10)].a; for (var k in p) alloc[k] = p[k]; sliders(); FD.$$("#pre .chip", el).forEach(function(x){ x.classList.toggle("on", x === b); }); }); });
  FD.$$(".scn-i", el).forEach(function(b){ b.addEventListener("click", function(){
    var sc = scs.filter(function(s){ return s.id === b.getAttribute("data-id"); })[0], r = simRun(alloc, sc);
    runs.push({ sc: sc.id, r: r }); FD.$$(".scn-i", el).forEach(function(x){ x.classList.toggle("on", x === b); });
    var gain = (r.final / D.sim.start - 1) * 100, col = gain >= 0 ? "var(--brand)" : "var(--neg)";
    FD.$("#out", el).innerHTML = '<div class="sim-res"><p class="eyebrow">' + h(sc.n) + '</p>' + simChart(r.path, col) + '<div class="sim-k"><div><span class="sm muted">Ending value</span><b>₹' + FD.inr(r.final) + '</b></div><div><span class="sm muted">Change</span><b class="' + (gain >= 0 ? "up" : "dn") + '">' + (gain >= 0 ? "+" : "") + gain.toFixed(1) + '%</b></div><div><span class="sm muted">Biggest fall</span><b class="dn">' + (r.dd * 100).toFixed(1) + '%</b></div></div><p class="fin-tip">' + FD.icon("sparkle") + ' ' + takeaway(alloc, sc, r) + '</p></div>';
    FD.animate(FD.$("#out", el));
    var distinct = {}; runs.forEach(function(x){ distinct[x.sc] = 1; }); var n = Object.keys(distinct).length;
    FD.$("#fin", el).innerHTML = n >= 2 ? '<div class="btn-row"><button class="btn btn-primary" id="fl">' + FD.icon("check") + ' Finish lesson</button></div>' : '<p class="sm muted center mt">Run ' + (2 - n) + ' more market ' + (n === 1 ? "story" : "stories") + ' to compare and finish.</p>';
    var fl = FD.$("#fl", el); if (fl) fl.addEventListener("click", function(){ finish(el, { key: akey("wed"), xp: 10, type: "learn", title: "Wealth Wednesday", id: "wed", stat: "sims", doneTitle: "Simulation complete", text: "You compared " + n + " market stories with virtual money. Spreading across assets softened the falls. Real results will differ." }); });
  }); });
}
function takeaway(a, sc, r){
  if (r.dd < -0.15) return "A big drop (" + Math.abs(r.dd * 100).toFixed(0) + "%) feels harsh. Ask yourself: could I stay calm and not sell here? Time horizon and mix both matter.";
  if (a.equity >= 90) return "An all-equity mix is a bold bet in this simulation. Diversifying changes the ride, not just the result.";
  if (a.cash >= 40) return "Lots of cash feels safe, but over time inflation can outpace it. Balance matters.";
  return "A spread mix softened the swings here. Try the same mix in another market story to compare.";
}

/* ---------- Thursday: AI challenge ---------- */
function runThu(el){
  var pr = FD.profile(), sc = D.scenarios[pr.thu];
  el.innerHTML = '<div class="thu"><div class="fin-msg flat"><div class="fin-av">' + FD.fin(52, "think") + '</div><div><p class="fm-n">Fin\'s challenge ' + FD.simTag("Scripted scenario") + '</p><h3 class="h3">' + h(sc.title) + '</h3><p>' + h(sc.setup) + '</p></div></div><div class="opts" id="o">' + sc.opts.map(function(o, i){ return '<button class="opt" data-i="' + i + '"><span class="opt-l">' + "ABC"[i] + '</span><span>' + h(o.t) + '</span></button>'; }).join("") + '</div><div id="fbk"></div></div>';
  FD.$$(".opt", el).forEach(function(b){ b.addEventListener("click", function(){
    var i = parseInt(b.getAttribute("data-i"), 10), o = sc.opts[i];
    FD.$$(".opt", el).forEach(function(x, n){ x.disabled = true; if (n === i) x.classList.add(o.s >= 70 ? "right" : "wrong"); });
    var best = sc.opts.reduce(function(m, x, k){ return x.s > sc.opts[m].s ? k : m; }, 0);
    FD.$("#fbk", el).innerHTML = '<div class="fb-i ' + (o.s >= 70 ? "ok" : "no") + '"><div class="row between"><b>' + (o.s >= 70 ? "Strong thinking" : "Worth a second look") + '</b><span class="pill">Thinking score ' + o.s + '</span></div>' + FD.bar(o.s, o.s >= 70 ? "" : "warn") + '<p>' + h(o.f) + '</p><details class="cmp"><summary>Compare all choices</summary>' + sc.opts.map(function(x, k){ return '<div class="cmp-i' + (k === best ? " best" : "") + '"><b>' + h(x.t) + '</b><span class="sm muted">' + x.s + '/100 · ' + h(x.f) + '</span></div>'; }).join("") + '</details><p class="fin-tip">' + FD.icon("sparkle") + ' <b>Takeaway:</b> ' + h(sc.lesson) + '</p><button class="btn btn-primary" id="tdone">Complete challenge</button></div>';
    FD.$("#tdone", el).addEventListener("click", function(){ finish(el, { key: akey("thu"), xp: 15, type: "habit", title: "Think Smart Thursday", id: "thu", stat: "challenges", doneTitle: "Challenge complete", text: "Thinking through trade-offs before they happen is a financial superpower." }); });
  }); });
}

/* ---------- Friday: goal review ---------- */
function runFri(el){
  var pr = FD.profile(), P = FD.P(), intent = null;
  function draw(){
    if (!pr.goals.length){ el.innerHTML = FD.empty("empty", "No goals to review yet", "Set one goal first, then Friday becomes your weekly check-in.", '<a class="btn btn-primary" href="financial-journey.html#goals">Set a goal</a>'); return; }
    el.innerHTML = '<div class="fri">' + pr.goals.map(function(g){ var sv = FD.goalSaved(g), pct = Math.min(100, Math.round(sv / g.target * 100)), left = g.target - sv, mo = g.monthly ? Math.ceil(left / g.monthly) : null;
      return '<div class="goal-rv"><div class="row"><span class="goal-ic">' + FD.icon(g.icon) + '</span><div class="sp"><h3 class="h3">' + h(g.name) + '</h3><p class="sm muted">Due ' + h(g.due) + (mo ? ' · about ' + mo + ' months at ₹' + FD.inr(g.monthly) + '/mo' : "") + '</p></div><b class="goal-p">' + pct + '%</b></div>' + FD.bar(pct, "thick") + '<div class="row between wrap"><span class="sm muted">' + (g.unit === "%" ? pct + "% complete" : FD.inrS(sv) + " of " + FD.inrS(g.target)) + '</span>' + (g.unit === "%" ? '<button class="btn btn-ghost btn-sm" data-g="' + g.id + '" data-v="-5">Progress +5%</button>' : '<button class="btn btn-ghost btn-sm" data-g="' + g.id + '" data-v="' + (g.monthly || Math.round(g.target * 0.02)) + '">' + FD.icon("plus") + ' Add simulated ₹' + FD.inr(g.monthly || Math.round(g.target * 0.02)) + '</button>') + '</div></div>'; }).join("") +
     '<div class="intent"><p class="eyebrow">Your intention for the week</p><div class="chips" id="int">' + ["Increase a contribution", "Keep going as planned", "Adjust a date or target"].map(function(t, i){ return '<button class="chip' + (intent === i ? " on" : "") + '" data-i="' + i + '" aria-pressed="' + (intent === i) + '">' + t + '</button>'; }).join("") + '</div></div><div class="btn-row"><button class="btn btn-primary" id="fdone" ' + (intent == null ? "disabled" : "") + '>Complete goal review</button></div><p class="sm muted center">Top-ups are simulated pretend money for the demo.</p></div>';
    FD.$$("[data-g]", el).forEach(function(b){ b.addEventListener("click", function(){ var g = pr.goals.filter(function(x){ return x.id === b.getAttribute("data-g"); })[0], v = parseInt(b.getAttribute("data-v"), 10); P.goalAdd[g.id] = (P.goalAdd[g.id] || 0) + (v < 0 ? 5 : v); FD.save(); FD.toast("Added to " + g.name + " (simulated)", "ok"); draw(); }); });
    FD.$$("#int .chip", el).forEach(function(b){ b.addEventListener("click", function(){ intent = parseInt(b.getAttribute("data-i"), 10); draw(); }); });
    FD.$("#fdone", el).addEventListener("click", function(){ finish(el, { key: akey("fri"), xp: 15, type: "goal", title: "Goal review", id: "fri", stat: "goalReviews", doneTitle: "Goals reviewed", text: "Your intention: “" + ["Increase a contribution", "Keep going as planned", "Adjust a date or target"][intent] + "”. Reviewing weekly is how goals stay alive." }); });
  }
  draw();
}

/* ---------- Saturday: games ---------- */
function runSat(el){
  var tabs = [["spin", "Spin & Learn", "dice"], ["cards", "Knowledge cards", "book"], ["save", "Savings challenge", "coins"]];
  el.innerHTML = '<div class="subtabs" role="tablist">' + tabs.map(function(t){ var done = FD.isDone(akey("sat-" + t[0])); return '<button role="tab" class="st' + (t[0] === satTab ? " on" : "") + (done ? " done" : "") + '" data-t="' + t[0] + '" aria-selected="' + (t[0] === satTab) + '">' + FD.icon(done ? "check" : t[2]) + ' ' + t[1] + '</button>'; }).join("") + '</div><div id="sub"></div>';
  FD.$$(".st", el).forEach(function(b){ b.addEventListener("click", function(){ satTab = b.getAttribute("data-t"); runSat(el); }); });
  var sub = FD.$("#sub", el);
  if (satTab === "spin") spin(sub, el); else if (satTab === "cards") cards(sub, el); else saving(sub, el);
}
function satFinish(sub, host, o){
  var r = FD.award(o.key, { xp: o.xp, type: o.type, title: o.title, id: o.id, stat: o.stat });
  if (r.gained) FD.confetti();
  sub.innerHTML = FD.doneCard({ title: o.doneTitle, text: o.text, gained: r.gained, repeat: r.repeat, extra: o.extra, btns: '<button class="btn btn-ghost" id="rep">Play again</button>' + nextBtns().replace("btn-primary", "btn-ghost") });
  FD.$("#rep", sub).addEventListener("click", function(){ runSat(host); }); refreshTabs();
  var done = FD.$$(".st", host); done.forEach(function(b){ if (b.getAttribute("data-t") === satTab){ b.classList.add("done"); } });
}
function spin(sub, host){
  var L = FD.level().n, topics = D.spin.filter(function(t){ return !t.bonus || L >= 2; }), n = topics.length, seg = 360 / n, R = 100, rot = 0, busy = false;
  function pt(a){ var r = a * Math.PI / 180; return [(R * Math.sin(r)).toFixed(2), (-R * Math.cos(r)).toFixed(2)]; }
  var segs = topics.map(function(t, i){ var a1 = pt(i * seg), a2 = pt((i + 1) * seg), c = (i + .5) * seg, lab = t.t.replace("Bonus: ", ""); return '<path d="M0,0 L' + a1[0] + ',' + a1[1] + ' A' + R + ',' + R + ' 0 0 1 ' + a2[0] + ',' + a2[1] + 'Z" fill="' + (i % 2 ? "var(--soft)" : "var(--soft-2)") + '" stroke="var(--card)" stroke-width="1.5"/><text transform="rotate(' + c + ') translate(0,-64)" text-anchor="middle" font-size="9.5" font-weight="700" fill="var(--brand-ink)">' + h(lab.length > 13 ? lab.slice(0, 12) + "…" : lab) + '</text>'; }).join("");
  sub.innerHTML = '<div class="spin"><div class="wheel-w"><svg class="wheel-p" viewBox="-110 -118 220 228" aria-hidden="true"><path d="M-9,-118 L9,-118 L0,-100Z" fill="var(--ai)"/></svg><svg class="wheel" id="wheel" viewBox="-110 -110 220 220" role="img" aria-label="Spin wheel with ' + n + ' money topics"><g id="wg">' + segs + '</g><circle r="16" fill="var(--card)" stroke="var(--brand)" stroke-width="3"/></svg></div><div class="spin-r" id="sr"><h3 class="h3">Spin to learn one thing</h3><p class="muted">' + n + ' topics' + (L >= 2 ? " (bonus topics unlocked at level 2)" : "") + '. Land on one, read a quick lesson, answer one question.</p><button class="btn btn-primary" id="spinb">' + FD.icon("dice") + ' Spin</button></div></div>';
  var g = FD.$("#wg", sub), btn = FD.$("#spinb", sub);
  btn.addEventListener("click", function(){
    if (busy) return; busy = true; btn.disabled = true;
    var idx = Math.floor(Math.random() * n), jitter = (Math.random() - .5) * seg * .6, target = 360 * 5 + (360 - ((idx + .5) * seg)) + jitter;
    rot = Math.ceil(rot / 360) * 360 + target; g.style.transition = FD.reduced() ? "none" : "transform 3.4s cubic-bezier(.12,.7,.1,1)"; g.style.transformOrigin = "0 0"; g.style.transform = "rotate(" + rot + "deg)";
    setTimeout(function(){ result(topics[idx]); }, FD.reduced() ? 80 : 3500);
  });
  function result(t){
    busy = false; var sr = FD.$("#sr", sub);
    sr.innerHTML = '<span class="pill ai">' + FD.icon(t.i) + ' ' + h(t.t.replace("Bonus: ", "")) + '</span><p class="lead">' + h(t.l) + '</p><p class="q-t sm-q" id="sq">' + h(t.q) + '</p><div class="opts" role="group" aria-labelledby="sq">' + t.o.map(function(x, k){ return '<button class="opt" data-k="' + k + '"><span class="opt-l">' + "ABC"[k] + '</span><span>' + h(x) + '</span></button>'; }).join("") + '</div><div class="fb" id="sfb" role="status" aria-live="polite"></div>';
    FD.$$(".opt", sr).forEach(function(b){ b.addEventListener("click", function(){
      var k = parseInt(b.getAttribute("data-k"), 10), ok = k === t.a; FD.$$(".opt", sr).forEach(function(x, n2){ x.disabled = true; if (n2 === t.a) x.classList.add("right"); else if (n2 === k) x.classList.add("wrong"); });
      var P = FD.P(); P.spinSeen = P.spinSeen || {}; if (!P.spinSeen[t.t]){ P.spinSeen[t.t] = 1; FD.bump("spins"); }
      FD.$("#sfb", sr).innerHTML = '<div class="fb-i ' + (ok ? "ok" : "no") + '"><b>' + (ok ? "Correct" : "Good try") + '</b><p>' + h(t.w) + '</p><div class="btn-row left"><button class="btn btn-primary" id="spdone">Finish this spin</button><button class="btn btn-ghost" id="spagain">Spin again</button></div></div>';
      FD.$("#spdone", sr).addEventListener("click", function(){ satFinish(sub, host, { key: akey("sat-spin"), xp: 10, type: "learn", title: "Spin & Learn", id: "sat", doneTitle: "Spin complete", text: "You learned about " + t.t.replace("Bonus: ", "").toLowerCase() + ". Come back for a new topic any time." }); });
      FD.$("#spagain", sr).addEventListener("click", function(){ spin(sub, host); });
    }); });
  }
}
function cards(sub, host){
  if (!deck){ var pr = FD.profile(); deck = FD.shuffle(D.cards); cardIdx = 0; cardSeen = {}; }
  var need = 5;
  function draw(){
    var c = deck[cardIdx], P = FD.P(), got = Object.keys(cardSeen).length, saw = !!cardSeen[c.id];
    sub.innerHTML = '<div class="kc"><div class="row between"><span class="sm muted">Card ' + (cardIdx + 1) + ' of ' + deck.length + '</span><span class="pill ' + (got >= need ? "pos" : "") + '">' + got + ' / ' + need + ' read this round</span></div>' + FD.bar(got / need * 100) +
     '<article class="kcard" id="kcard" tabindex="0" aria-live="polite"><span class="pill ai">' + h(c.tag) + '</span><h3 class="kc-t">' + h(c.t) + '</h3><p class="lead">' + h(c.b) + '</p><p class="try">' + FD.icon("bolt") + ' <b>Try:</b> ' + h(c.try) + '</p></article>' +
     '<div class="kc-nav"><button class="btn btn-ghost" id="kp" aria-label="Previous card">' + FD.icon("arrowl") + '</button><button class="btn ' + (saw ? "btn-ghost" : "btn-primary") + '" id="kg">' + (saw ? "Read" + "" : "Got it") + FD.icon("check") + '</button><button class="btn btn-ghost" id="kn" aria-label="Next card">' + FD.icon("arrow") + '</button></div><p class="sm muted center">Swipe, use arrow keys, or tap the buttons.</p>' +
     (got >= need ? '<div class="btn-row"><button class="btn btn-primary" id="kdone">' + FD.icon("check") + ' Complete card round</button></div>' : "") + '</div>';
    var card = FD.$("#kcard", sub);
    function go(d){ cardIdx = (cardIdx + d + deck.length) % deck.length; card.classList.add(d > 0 ? "out-l" : "out-r"); setTimeout(draw, FD.reduced() ? 0 : 160); }
    FD.$("#kp", sub).addEventListener("click", function(){ go(-1); }); FD.$("#kn", sub).addEventListener("click", function(){ go(1); });
    FD.$("#kg", sub).addEventListener("click", function(){ if (!cardSeen[c.id]){ cardSeen[c.id] = 1; P.cardsSeen = P.cardsSeen || {}; if (!P.cardsSeen[c.id]){ P.cardsSeen[c.id] = 1; FD.bump("cards"); } FD.toast("Card saved to your knowledge", "ok"); } go(1); });
    var kd = FD.$("#kdone", sub); if (kd) kd.addEventListener("click", function(){ satFinish(sub, host, { key: akey("sat-cards"), xp: 10, type: "learn", title: "Knowledge cards", id: "sat", doneTitle: "Card round complete", text: "You read " + got + " knowledge cards. Pick one 'Try' action and do it today." }); });
    var x0 = null; card.addEventListener("pointerdown", function(e){ x0 = e.clientX; }); card.addEventListener("pointerup", function(e){ if (x0 == null) return; var dx = e.clientX - x0; x0 = null; if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1); });
    card.addEventListener("keydown", function(e){ if (e.key === "ArrowRight") go(1); if (e.key === "ArrowLeft") go(-1); });
  }
  draw();
}
function saving(sub, host){
  var pr = FD.profile(), f = FD.clamp(pr.income / 50000, .5, 3), rounds = D.savingsRounds, i = 0, saved = 0, spent = 0, pot = 0;
  function amt(b){ return Math.max(10, Math.round(b * f / 10) * 10); }
  function show(){
    var r = rounds[i], base = amt(r.base);
    sub.innerHTML = '<div class="sv"><div class="row between"><span class="pill">Moment ' + (i + 1) + ' of ' + rounds.length + '</span><span class="pill pos">' + FD.icon("coins") + ' Kept ₹' + FD.inr(saved) + '</span></div>' + FD.bar(i / rounds.length * 100) + '<h3 class="h3">' + h(r.t) + '</h3><p class="lead">' + h(r.d) + ' <b>₹' + FD.inr(base) + '</b>.</p><div class="opts">' + r.opts.map(function(o, k){ var kept = o[1] === "save" ? Math.round(base * o[2] / 10) * 10 : 0; return '<button class="opt" data-k="' + k + '"><span class="opt-l">' + "ABC"[k] + '</span><span>' + h(o[0]) + '</span><em class="opt-r ' + (kept ? "up" : "dn") + '">' + (kept ? "keep ₹" + FD.inr(kept) : "spend ₹" + FD.inr(base)) + '</em></button>'; }).join("") + '</div><p class="sm muted">' + FD.simTag("Pretend rupees") + ' Scaled to the ' + h(pr.tag.toLowerCase()) + ' demo profile.</p></div>';
    FD.$$(".opt", sub).forEach(function(b){ b.addEventListener("click", function(){ var o = r.opts[parseInt(b.getAttribute("data-k"), 10)]; if (o[1] === "save"){ var k = Math.round(base * o[2] / 10) * 10; saved += k; } else spent += base; pot += o[1] === "save" ? 1 : 0; i++; FD.$$(".opt", sub).forEach(function(x){ x.disabled = true; }); b.classList.add(o[1] === "save" ? "right" : "wrong"); setTimeout(function(){ if (i < rounds.length) show(); else end(); }, FD.reduced() ? 0 : 450); }); });
    FD.animate(sub);
  }
  function end(){
    var smart = Math.round(pot / rounds.length * 100), yr = Math.round(saved * 52 / 1);
    var extra = '<div class="sv-sum"><div><span class="sm muted">Kept this round</span><b>₹' + FD.inr(saved) + '</b></div><div><span class="sm muted">Smart moves</span><b>' + pot + ' / ' + rounds.length + '</b></div><div><span class="sm muted">If weekly for a year</span><b>₹' + FD.inr(yr) + '</b></div></div><p class="fin-tip">' + FD.icon("sparkle") + ' ' + (smart >= 80 ? "Excellent instincts. Automating one of these will make it effortless." : smart >= 50 ? "A good balance. Joy and saving can coexist." : "No judgement. Spending on what you value is fine. Try a 24-hour pause on the next impulse.") + '</p>';
    satFinish(sub, host, { key: akey("sat-save"), xp: 15, type: "habit", title: "Savings challenge", id: "sat", stat: "savingsGames", doneTitle: "Challenge complete", text: "Small choices, repeated, are what savings are made of.", extra: extra });
  }
  show();
}

/* ---------- Sunday: weekly review ---------- */
function runSun(el){
  var P = FD.P(), wa = FD.weekAwards(), pr = FD.profile(), st = FD.stats(), win = null, focus = null;
  var wins = wa.list.map(function(d){ return d.title; }); if (!wins.length) wins = ["Showing up to learn", "Staying aware of my money", "Starting a good habit"];
  var focuses = ["Build my safety net", "Learn one investing basic", "Review my goals", "Cut one needless spend"];
  function draw(){
    el.innerHTML = '<div class="sun"><div class="sun-sum"><div><b data-count="' + wa.n + '">0</b><span class="sm muted">actions this week</span></div><div><b data-count="' + wa.xp + '">0</b><span class="sm muted">XP earned</span></div><div><b data-count="' + st.activeDays + '">0</b><span class="sm muted">active days</span></div><div><b>' + FD.streak() + '</b><span class="sm muted">day streak</span></div></div>' +
     '<p class="eyebrow">Your biggest win this week</p><div class="chips" id="w">' + wins.slice(0, 5).map(function(t, i){ return '<button class="chip' + (win === i ? " on" : "") + '" data-i="' + i + '" aria-pressed="' + (win === i) + '">' + h(t) + '</button>'; }).join("") + '</div>' +
     '<p class="eyebrow mt">One focus for next week</p><div class="chips" id="f">' + focuses.map(function(t, i){ return '<button class="chip' + (focus === i ? " on" : "") + '" data-i="' + i + '" aria-pressed="' + (focus === i) + '">' + t + '</button>'; }).join("") + '</div>' +
     '<div class="btn-row"><button class="btn btn-primary" id="sdone" ' + (win == null || focus == null ? "disabled" : "") + '>Complete weekly review</button><a class="btn btn-ghost" href="weekly-engagement.html">See full week report</a></div><p class="sm muted center">Quiet week? That\'s fine. Reflecting still counts.</p></div>';
    FD.animate(el);
    FD.$$("#w .chip", el).forEach(function(b){ b.addEventListener("click", function(){ win = parseInt(b.getAttribute("data-i"), 10); draw(); }); });
    FD.$$("#f .chip", el).forEach(function(b){ b.addEventListener("click", function(){ focus = parseInt(b.getAttribute("data-i"), 10); draw(); }); });
    FD.$("#sdone", el).addEventListener("click", function(){ FD.P().focusNext = focuses[focus]; finish(el, { key: akey("sun"), xp: 30, type: "weekly", title: "Sunday review", id: "sun", stat: "weeklyReviews", doneTitle: "Week reviewed", text: "Next week's focus: “" + focuses[focus] + "”. Fin will tailor your recommendations.", btns: '<a class="btn btn-primary" href="weekly-engagement.html">View weekly report</a><a class="btn btn-ghost" href="companion-home.html">Back to home</a>' }); });
  }
  draw();
}

var RUN = { mon: runMon, tue: runTue, wed: runWed, thu: runThu, fri: runFri, sat: runSat, sun: runSun };
function open(id){
  sel = id; runs = []; deck = null;
  try { history.replaceState(null, "", "?day=" + id); } catch(e){}
  FD.$$(".dt").forEach(function(b){ var on = b.getAttribute("data-d") === id; b.classList.toggle("on", on); b.setAttribute("aria-selected", on); });
  FD.$("#panel").setAttribute("aria-labelledby", "tab-" + id);
  FD.$("#phead").innerHTML = head();
  var act = FD.$("#act"); act.classList.remove("fade2"); void act.offsetWidth; act.classList.add("fade2");
  RUN[id](act);
}
function bind(root){
  FD.$$(".dt", root).forEach(function(b){ b.addEventListener("click", function(){ open(b.getAttribute("data-d")); }); b.addEventListener("keydown", function(e){ var k = e.key, i = dayIdx(b.getAttribute("data-d")), n = k === "ArrowRight" ? 1 : k === "ArrowLeft" ? -1 : 0; if (n){ e.preventDefault(); var nb = FD.$$(".dt", root)[(i + n + 7) % 7]; nb.focus(); open(nb.getAttribute("data-d")); } }); });
  if (!root._go){ root._go = 1; root.addEventListener("click", function(e){ var g = e.target.closest && e.target.closest("[data-go]"); if (g){ open(g.getAttribute("data-go")); window.scrollTo({ top: 0, behavior: FD.reduced() ? "auto" : "smooth" }); } }); }
  open(sel);
  var cur = FD.$(".dt.on", root); if (cur && cur.scrollIntoView) try { cur.scrollIntoView({ inline: "center", block: "nearest" }); } catch(e){}
}
FD.page({ title: "Daily Activities", render: render, bind: bind, skel: 2 });
})();
