/* Financial journey: learning path (7 modules), goals (+ planner), financial personality test. */
(function(){
var FD = window.FD, D = FD.D, h = FD.h;
var tab = (location.hash === "#goals") ? "goals" : "path", calc = { target: 300000, months: 24 };

function modDone(id){ return !!FD.P().jr[id]; }
function doneCount(){ return D.journey.filter(function(m){ return modDone(m.id); }).length; }

function render(){
  var pr = FD.profile(), n = doneCount(), tot = D.journey.length;
  return '<div class="page-h"><div><p class="eyebrow">Financial journey</p><h1 class="h1">Your path, at your pace</h1><p class="muted">Learn, plan and understand yourself. Every module is optional and open from the start.</p></div></div>' +
   '<div class="seg three" role="tablist" aria-label="Journey sections">' + [["path", "Learning path", "map"], ["goals", "My goals", "target"], ["self", "Know yourself", "user"]].map(function(t){ return '<button role="tab" class="' + (tab === t[0] ? "on" : "") + '" data-t="' + t[0] + '" aria-selected="' + (tab === t[0]) + '">' + FD.icon(t[2]) + ' ' + t[1] + '</button>'; }).join("") + '</div>' +
   '<div id="jb">' + (tab === "path" ? path(n, tot, pr) : tab === "goals" ? goals(pr) : self(pr)) + '</div>';
}

function path(n, tot, pr){
  var rec = pr.journeyNext;
  return '<section class="card pad jhead"><div class="row">' + FD.ring(n / tot * 100, { size: 92, stroke: 9, html: '<b class="kpi-n">' + n + '/' + tot + '</b>' }) + '<div class="sp"><h2 class="h2">Learning journey</h2><p class="muted">Finish all ' + tot + ' modules for a <b>50 XP</b> journey bonus. Each module is worth 10 XP, once.</p>' + (FD.isDone("j:all") ? '<span class="pill pos">' + FD.icon("check") + ' Journey complete</span>' : "") + '</div></div></section>' +
   '<ol class="road">' + D.journey.map(function(m, i){ var d = modDone(m.id), seed = d && FD.P().jr[m.id].seed, r = rec.indexOf(m.id) > -1; return '<li class="rd ' + (d ? "done" : "") + '"><span class="rd-n">' + (d ? FD.icon("check") : i + 1) + '</span><button class="card pad hover rd-c" data-m="' + m.id + '"><div class="row"><span class="ins-ic ' + (d ? "" : "ai") + '">' + FD.icon(m.i) + '</span><div class="sp"><h3 class="h3">' + h(m.n) + (r && !d ? ' <span class="pill ai">Recommended</span>' : "") + '</h3><p class="sm muted">' + h(m.d) + ' · ' + m.steps.length + ' steps</p></div>' + (d ? '<span class="pill pos">' + (seed ? "Done (demo)" : "Done") + '</span>' : '<span class="pill gold">+10 XP</span>') + '</div></button></li>'; }).join("") + '</ol>';
}
function goals(pr){
  var inc = pr.income, need = Math.ceil(calc.target / calc.months), share = Math.round(need / inc * 100);
  return '<div class="grid gh" id="goals"><section class="stack">' + (!pr.goals.length ? FD.empty("empty", "No goals yet", "Use the planner to size your first goal, then save it.") : "") + pr.goals.map(function(g){ var sv = FD.goalSaved(g), pct = Math.min(100, Math.round(sv / g.target * 100)), left = g.target - sv;
    return '<article class="card pad goal"><div class="row"><span class="goal-ic">' + FD.icon(g.icon) + '</span><div class="sp"><h3 class="h3">' + h(g.name) + '</h3><p class="sm muted">Due ' + h(g.due) + '</p></div><b class="goal-p">' + pct + '%</b></div>' + FD.bar(pct, "thick") + '<div class="row between wrap"><span class="sm muted">' + (g.unit === "%" ? pct + "% complete" : FD.inrS(sv) + " of " + FD.inrS(g.target) + " · " + FD.inrS(left) + " to go") + '</span>' + (g.unit === "%" ? "" : '<button class="btn btn-ghost btn-sm" data-add="' + g.id + '">' + FD.icon("plus") + ' Add simulated ₹' + FD.inr(Math.round((g.monthly || g.target * 0.02) / 100) * 100) + '</button>') + '</div></article>'; }).join("") + '<p class="sm muted">' + FD.simTag("Dummy data") + ' Top-ups here are pretend. Weekly goal reviews on Fridays earn XP.</p></section>' +
   '<section class="card pad calc"><h2 class="h2">Goal planner</h2><p class="muted sm">How much per month for a new goal?</p><label for="ct">Target amount: <b id="ctv">₹' + FD.inr(calc.target) + '</b></label><input type="range" id="ct" min="20000" max="2000000" step="10000" value="' + calc.target + '"><label for="cm">Time: <b id="cmv">' + calc.months + ' months</b></label><input type="range" id="cm" min="3" max="120" step="1" value="' + calc.months + '"><div class="calc-r"><span class="sm muted">You\'d set aside about</span><b id="cr">₹' + FD.inr(need) + '/month</b><span class="sm muted" id="cs">about ' + share + '% of the demo profile\'s income. ' + (share > 35 ? "That's a stretch. Consider a longer timeline." : share > 20 ? "Ambitious but possible." : "Comfortably within reach.") + '</span></div><p class="sm muted">Simple division. Ignores returns and inflation. Illustrative only.</p>' + (FD.P().fresh && pr.goals.length < 3 ? '<label for="gname">Goal name</label><input type="text" id="gname" class="txt" maxlength="30" value="My goal"><button class="btn btn-primary" id="savegoal">' + FD.icon("target") + ' Save as my goal</button>' : "") + '</section></div>';
}
function self(pr){
  var P = FD.P(), t = P.pers ? D.personality.types.filter(function(x){ return x.id === P.pers; })[0] : null, L = FD.level().n;
  if (t) return persResult(t, L, true);
  return '<section class="card pad"><div id="pt"><div class="intro"><div class="intro-ic">' + FD.icon("user") + '</div><h2 class="h2">Financial personality test</h2><p class="muted">Six quick questions, no right answers. Find your money style and get tips that fit it. <b>15 XP</b> for your first time.</p><button class="btn btn-primary" id="ps">' + FD.icon("play") + ' Start the test</button></div></div></section>';
}
function persResult(t, L, saved){
  return '<section class="card pad pers"><div class="pers-h"><span class="badge-big">' + FD.icon(t.i) + '</span><div><p class="eyebrow">Your financial personality</p><h2 class="h1">' + h(t.n) + '</h2></div></div><p class="lead">' + h(t.d) + '</p><div class="grid g2"><div><p class="eyebrow">Strengths</p><ul class="bul">' + t.s.map(function(x){ return '<li>' + h(x) + '</li>'; }).join("") + '</ul></div><div><p class="eyebrow">Watch-outs</p><ul class="bul">' + t.w.map(function(x){ return '<li>' + h(x) + '</li>'; }).join("") + '</ul></div></div><p class="fin-tip">' + FD.icon("sparkle") + ' <b>Fin suggests:</b> ' + h(t.tip) + '</p>' +
   (L >= 4 ? '<div class="deep"><p class="eyebrow">Level 4 deep-dive</p><p>People like you often thrive with a weekly 10-minute money moment, written rules for decisions, and one accountability buddy. Try pairing your personality with Sunday Review.</p></div>' : '<div class="deep lock">' + FD.icon("lock") + ' Deep-dive card unlocks at level 4</div>') +
   '<div class="btn-row"><button class="btn btn-ghost" id="pshare">' + FD.icon("share") + ' Share result</button><button class="btn btn-ghost" id="pretake">' + FD.icon("refresh") + ' Retake</button><a class="btn btn-primary" href="daily-activities.html">Try today\'s activity</a></div></section>';
}

function openMod(id, root){
  var m = D.journey.filter(function(x){ return x.id === id; })[0]; if (!m) return;
  var mo = FD.modal({ title: m.n, cls: "wide", onClose: function(){ FD.rerender(); }, html: '<p class="eyebrow">' + (modDone(id) ? "Replay · no extra XP" : "+10 XP") + '</p><h2 class="h2">' + h(m.n) + '</h2><div id="ml"></div>' });
  FD.runLesson(FD.$("#ml", mo.el), { steps: m.steps, onDone: function(ok){
    var P = FD.P(), first = !P.jr[id], gained = 0, all = 0;
    if (first){ P.jr[id] = { t: Date.now() }; FD.save(); var r = FD.award("j:" + id, { xp: 10, type: "journey", title: "Module: " + m.n, id: "j-" + id }); gained = r.gained; FD.bump("journeyModules");
      if (doneCount() === D.journey.length && !FD.isDone("j:all")){ var r2 = FD.award("j:all", { xp: 50, type: "journey", title: "Learning journey complete", id: "j-all" }); all = r2.gained; FD.bump("journeyDone"); } }
    if (gained) FD.confetti();
    FD.$("#ml", mo.el).innerHTML = FD.doneCard({ title: m.n + " complete", text: "You got " + ok + " of " + m.steps.length + " checks right on the first try. " + (first ? "" : "Replay counted as practice."), gained: gained + all, repeat: !first, btns: '<button class="btn btn-primary" data-ok>Back to journey</button>' });
    FD.$("[data-ok]", mo.el).addEventListener("click", mo.close);
  } });
}

function persTest(root){
  var qs = D.personality.qs, i = 0, tally = { B: 0, E: 0, G: 0, P: 0 }, order = ["B", "E", "G", "P"], box = FD.$("#pt", root);
  function show(){
    var q = qs[i]; box.innerHTML = '<div class="quiz"><div class="quiz-top"><span class="pill">Question ' + (i + 1) + ' of ' + qs.length + '</span></div>' + FD.bar(i / qs.length * 100) + '<h3 class="q-t" id="pq">' + h(q.q) + '</h3><div class="opts" role="group" aria-labelledby="pq">' + q.o.map(function(t, k){ return '<button class="opt" data-k="' + k + '"><span class="opt-l">' + "ABCD"[k] + '</span><span>' + h(t) + '</span></button>'; }).join("") + '</div></div>';
    FD.animate(box);
    FD.$$(".opt", box).forEach(function(b){ b.addEventListener("click", function(){ tally[order[parseInt(b.getAttribute("data-k"), 10)]]++; i++; if (i < qs.length) show(); else end(); }); });
  }
  function end(){
    var top = order.reduce(function(m, k){ return tally[k] > tally[m] ? k : m; }, "B"), P = FD.P(); P.pers = top; FD.save();
    var r = FD.award("pers", { xp: 15, type: "habit", title: "Financial personality test", id: "pers", stat: "personality" }); if (r.gained) FD.confetti();
    FD.rerender();
  }
  show();
}

function bind(root){
  FD.$$(".seg button", root).forEach(function(b){ b.addEventListener("click", function(){ tab = b.getAttribute("data-t"); FD.rerender(); }); });
  FD.$$("[data-m]", root).forEach(function(b){ b.addEventListener("click", function(){ openMod(b.getAttribute("data-m"), root); }); });
  FD.$$("[data-add]", root).forEach(function(b){ b.addEventListener("click", function(){ var g = FD.profile().goals.filter(function(x){ return x.id === b.getAttribute("data-add"); })[0], v = Math.round((g.monthly || g.target * 0.02) / 100) * 100; var P = FD.P(); P.goalAdd[g.id] = (P.goalAdd[g.id] || 0) + v; FD.save(); FD.toast("Added ₹" + FD.inr(v) + " to " + g.name + " (simulated)", "ok"); FD.rerender(); }); });
  var ct = FD.$("#ct", root), cm = FD.$("#cm", root);
  function upd(){ calc.target = parseInt(ct.value, 10); calc.months = parseInt(cm.value, 10); var pr = FD.profile(), need = Math.ceil(calc.target / calc.months), share = Math.round(need / pr.income * 100); FD.$("#ctv", root).textContent = "₹" + FD.inr(calc.target); FD.$("#cmv", root).textContent = calc.months + " months"; FD.$("#cr", root).textContent = "₹" + FD.inr(need) + "/month"; FD.$("#cs", root).textContent = "about " + share + "% of the demo profile's income. " + (share > 35 ? "That's a stretch. Consider a longer timeline." : share > 20 ? "Ambitious but possible." : "Comfortably within reach."); }
  if (ct){ ct.addEventListener("input", upd); cm.addEventListener("input", upd); }
  var sg = FD.$("#savegoal", root); if (sg) sg.addEventListener("click", function(){ var P = FD.P(), nm = (FD.$("#gname", root).value || "My goal").trim().slice(0, 30), due = new Date(); due.setMonth(due.getMonth() + calc.months); P.customGoals.push({ id: "c" + Date.now(), name: nm, icon: "target", target: calc.target, saved: 0, due: due.toLocaleDateString("en-IN", { month: "short", year: "numeric" }), monthly: Math.ceil(calc.target / calc.months) }); FD.save(); FD.toast("Goal saved: " + nm, "ok"); FD.rerender(); });
  var ps = FD.$("#ps", root); if (ps) ps.addEventListener("click", function(){ persTest(root); });
  var rt = FD.$("#pretake", root); if (rt) rt.addEventListener("click", function(){ FD.P().pers = null; FD.save(); FD.rerender(); });
  var sh = FD.$("#pshare", root); if (sh) sh.addEventListener("click", function(){ var t = D.personality.types.filter(function(x){ return x.id === FD.P().pers; })[0]; FD.share({ title: "your personality", card: '<div class="rep-card"><p class="eyebrow">Financial personality</p><h3 class="rep-h">' + h(FD.profile().first) + ' is a ' + h(t.n) + '</h3><p>' + h(t.d) + '</p><p class="rep-f">Finscore Daily Companion · simulated demo</p></div>', text: "I'm a " + t.n + " (Finscore demo)." }); });
  var q = FD.qs("m"); if (q && !root._m){ root._m = 1; setTimeout(function(){ openMod(q, root); }, 150); }
}
FD.page({ title: "Financial Journey", render: render, bind: bind, skel: 3 });
})();
