/* First-time onboarding: welcome → about you → first goal → first win → ready. Starts a genuinely empty (zero XP, no history) demo run. */
(function(){
var FD = window.FD, D = FD.D, h = FD.h;
var step = 0, st = { name: "", persona: null, preset: null, gname: "", target: 100000, months: 12, saved: false };
var TOTAL = 5, LABELS = ["Welcome", "About you", "First goal", "First win", "Ready"];
var PERSONAS = [
 ["beginner", "I'm just starting out", "Basic habits and a first safety net", "wallet"],
 ["young", "I'm earning well and want to grow", "Automate savings, start investing", "trend"],
 ["investor", "I invest and want sharper decisions", "Process, risk and behaviour", "scale"],
 ["family", "I'm planning for my family", "Protection, loans and education", "family"],
 ["saver", "I'm saving for a big goal", "Timelines and goal buckets", "target"]
];
var PRESETS = {
 beginner: [["Emergency cushion", 60000, 12], ["Laptop upgrade", 55000, 18]],
 young: [["Trip fund", 150000, 12], ["Emergency fund", 240000, 18]],
 investor: [["Learning fund", 500000, 24], ["Rebalancing buffer", 200000, 12]],
 family: [["Child education fund", 500000, 36], ["Insurance and buffer", 150000, 12]],
 saver: [["Home down payment", 1800000, 48], ["Wedding fund", 900000, 30]]
};

function dots(){ return '<ol class="onb-dots" aria-label="Progress">' + LABELS.map(function(l, i){ return '<li class="' + (i < step ? "done" : i === step ? "cur" : "") + '" ' + (i === step ? 'aria-current="step"' : "") + '><i></i><span>' + l + '</span></li>'; }).join("") + '</ol>'; }
function top(){ return '<header class="onb-top"><a class="brand" href="index.html"><span class="brand-mk">' + FD.icon("spark") + '</span><span>Finscore</span></a><div class="row"><a class="link sm" href="companion-home.html">Skip to the app</a><button class="icon-btn" id="thm" aria-label="Toggle light and dark theme">' + FD.icon(FD.theme() === "dark" ? "sun" : "moon") + '</button></div></header>'; }
function need(){ return Math.ceil(st.target / st.months); }

function body(){
  if (step === 0) return '<div class="onb-c"><div class="onb-fin">' + FD.fin(96, "cheer") + '</div><h1 class="h1">Hi, I\'m Fin</h1><p class="lead">I\'ll be your money companion. Let\'s set you up in about three minutes. You\'ll leave with a goal, a first win and a reason to come back tomorrow.</p>' +
    '<ul class="onb-pts"><li>' + FD.icon("check") + ' Four short steps, all optional</li><li>' + FD.icon("check") + ' Everything is simulated demo data, no real accounts</li><li>' + FD.icon("check") + ' Nothing here is financial advice</li></ul><div class="btn-row"><button class="btn btn-primary" id="nx">Let\'s start' + FD.icon("arrow") + '</button></div></div>';
  if (step === 1) return '<div class="onb-c left"><h2 class="h2">Tell me a little about you</h2><p class="muted">This tailors your daily activities, quizzes and Fin\'s advice. You can switch demo profiles any time.</p>' +
    '<label for="nm" class="lbl">What should I call you? <span class="muted">(optional)</span></label><input class="txt" id="nm" type="text" maxlength="24" placeholder="Your first name" autocomplete="off" value="' + h(st.name) + '">' +
    '<p class="lbl" id="plb">What sounds most like you?</p><div class="personas" role="radiogroup" aria-labelledby="plb">' + PERSONAS.map(function(p){ var on = st.persona === p[0]; return '<button class="persona' + (on ? " on" : "") + '" role="radio" aria-checked="' + on + '" data-p="' + p[0] + '"><span class="ins-ic">' + FD.icon(p[3]) + '</span><span class="sp"><b>' + h(p[1]) + '</b><small>' + h(p[2]) + '</small></span><span class="rad"></span></button>'; }).join("") + '</div>' +
    '<div class="btn-row between-r"><button class="btn btn-ghost" id="bk">' + FD.icon("arrowl") + ' Back</button><button class="btn btn-primary" id="nx" ' + (st.persona ? "" : "disabled") + '>Continue' + FD.icon("arrow") + '</button></div></div>';
  if (step === 2) { var pre = PRESETS[st.persona] || PRESETS.beginner;
    return '<div class="onb-c left"><h2 class="h2">Pick your first goal</h2><p class="muted">A goal is a name, an amount and a date. Start with something real. You can add more later.</p><div class="chips" id="pre">' + pre.map(function(p, i){ return '<button class="chip' + (st.preset === i ? " on" : "") + '" data-i="' + i + '">' + h(p[0]) + '</button>'; }).join("") + '</div>' +
    '<label for="gn" class="lbl">Goal name</label><input class="txt" id="gn" type="text" maxlength="30" value="' + h(st.gname) + '" placeholder="e.g. Emergency cushion">' +
    '<label for="tg" class="lbl">Target: <b id="tgv">₹' + FD.inr(st.target) + '</b></label><input type="range" id="tg" min="10000" max="2000000" step="10000" value="' + Math.min(2000000, st.target) + '">' +
    '<label for="mo" class="lbl">Time: <b id="mov">' + st.months + ' months</b></label><input type="range" id="mo" min="3" max="120" step="1" value="' + st.months + '">' +
    '<div class="calc-r"><span class="sm muted">You\'d set aside about</span><b id="need">₹' + FD.inr(need()) + '/month</b><span class="sm muted">Simple division. Ignores returns and inflation.</span></div>' +
    '<div class="btn-row between-r"><button class="btn btn-ghost" id="bk">' + FD.icon("arrowl") + ' Back</button><div class="row wrap"><button class="btn btn-ghost" id="skip">Skip for now</button><button class="btn btn-primary" id="nx">Save goal' + FD.icon("arrow") + '</button></div></div></div>'; }
  if (step === 3) return '<div class="onb-c left"><p class="eyebrow">Your first win · +10 XP</p><h2 class="h2">One idea, one question</h2><p class="muted">A tiny lesson and a quick check. This earns your first XP and your First Step badge.</p><div id="ob" class="onb-lesson"></div></div>';
  var p = FD.P(), tmr = D.days[(new Date().getDay() + 6) % 7 + 1] || D.days[0], tm = new Date(); tm.setDate(tm.getDate() + 1); var tday = D.days.filter(function(d){ return d.dow === tm.getDay(); })[0];
  var g = p.customGoals && p.customGoals[0];
  return '<div class="onb-c"><div class="done-ic">' + FD.icon("check") + '</div><h2 class="h1">You\'re all set' + (p.name ? ", " + h(p.name) : "") + '</h2><p class="lead">Your first win is in the bank. Here\'s what\'s waiting.</p><ul class="onb-sum"><li><span class="ins-ic gold">' + FD.icon("spark") + '</span><div><b>' + FD.xp() + ' XP</b><small>Level 1 · Starter</small></div></li><li><span class="ins-ic">' + FD.icon("medal") + '</span><div><b>First Step badge</b><small>Unlocked</small></div></li><li><span class="ins-ic ai">' + FD.icon("target") + '</span><div><b>' + (g ? h(g.name) : "No goal yet") + '</b><small>' + (g ? "₹" + FD.inr(g.monthly) + " a month to reach " + FD.inrS(g.target) : "Add one any time in Financial Journey") + '</small></div></li><li><span class="ins-ic">' + FD.icon(tday.icon) + '</span><div><b>Tomorrow: ' + tday.name + '</b><small>' + tday.sub + ' · ~' + tday.mins + ' min</small></div></li></ul><div class="btn-row"><a class="btn btn-primary" href="companion-home.html">Go to my home' + FD.icon("arrow") + '</a><a class="btn btn-ghost" href="daily-activities.html">Try today\'s activity</a></div></div>';
}
function render(){ return '<div class="onb-shell">' + top() + dots() + '<section class="card onb-card" aria-live="polite">' + body() + '</section><p class="sm muted center">Simulated prototype. No accounts are created and nothing leaves your device.</p></div>'; }

function go(n){ step = n; FD.rerender(); window.scrollTo(0, 0); var f = FD.$(".onb-c h1,.onb-c h2"); if (f){ f.setAttribute("tabindex", "-1"); f.focus({ preventScroll: true }); } }

function bind(root){
  FD.$("#thm", root).addEventListener("click", function(){ FD.setTheme(FD.theme() === "dark" ? "light" : "dark"); FD.$("#thm", root).innerHTML = FD.icon(FD.theme() === "dark" ? "sun" : "moon"); });
  var nx = FD.$("#nx", root), bk = FD.$("#bk", root); if (bk) bk.addEventListener("click", function(){ go(step - 1); });
  if (step === 0) nx.addEventListener("click", function(){ go(1); });
  if (step === 1){
    var nm = FD.$("#nm", root); nm.addEventListener("input", function(){ st.name = nm.value; });
    FD.$$(".persona", root).forEach(function(b){ b.addEventListener("click", function(){ st.persona = b.getAttribute("data-p"); FD.$$(".persona", root).forEach(function(x){ var on = x === b; x.classList.toggle("on", on); x.setAttribute("aria-checked", on); }); nx.disabled = false; }); });
    nx.addEventListener("click", function(){ if (!st.persona) return; FD.startFresh(st.persona, st.name); var pr = PRESETS[st.persona][0]; if (!st.gname){ st.preset = 0; st.gname = pr[0]; st.target = pr[1]; st.months = pr[2]; } go(2); });
  }
  if (step === 2){
    var gn = FD.$("#gn", root), tg = FD.$("#tg", root), mo = FD.$("#mo", root);
    function upd(){ st.gname = gn.value; st.target = parseInt(tg.value, 10); st.months = parseInt(mo.value, 10); FD.$("#tgv", root).textContent = "₹" + FD.inr(st.target); FD.$("#mov", root).textContent = st.months + " months"; FD.$("#need", root).textContent = "₹" + FD.inr(need()) + "/month"; }
    gn.addEventListener("input", upd); tg.addEventListener("input", upd); mo.addEventListener("input", upd);
    FD.$$("#pre .chip", root).forEach(function(b){ b.addEventListener("click", function(){ var p = PRESETS[st.persona][parseInt(b.getAttribute("data-i"), 10)]; st.preset = parseInt(b.getAttribute("data-i"), 10); st.gname = p[0]; st.target = p[1]; st.months = p[2]; FD.rerender(); }); });
    FD.$("#skip", root).addEventListener("click", function(){ go(3); });
    nx.addEventListener("click", function(){
      var P = FD.P(), nm2 = (gn.value || "My goal").trim().slice(0, 30), due = new Date(); due.setMonth(due.getMonth() + st.months);
      if (!st.saved){ P.customGoals.push({ id: "g1", name: nm2, icon: "target", target: st.target, saved: 0, due: due.toLocaleDateString("en-IN", { month: "short", year: "numeric" }), monthly: need() }); st.saved = true; FD.save(); FD.toast("Goal saved: " + nm2, "ok"); }
      go(3);
    });
  }
  if (step === 3){
    var steps = [D.journey[0].steps[0]];
    FD.runLesson(FD.$("#ob", root), { steps: steps, onDone: function(ok){
      var P = FD.P(); P.onboarded = true; FD.save();
      var r = FD.award("onb", { xp: 10, type: "learn", title: "Welcome activity", id: "onb" }); FD.confetti();
      FD.$("#ob", root).innerHTML = FD.doneCard({ title: "First win!", text: ok ? "Spot on. You're off to a great start." : "Good try. The explanation is the real win.", gained: r.gained, btns: '<button class="btn btn-primary" id="fin">Continue' + FD.icon("arrow") + '</button>' });
      FD.$("#fin", root).addEventListener("click", function(){ go(4); });
    } });
  }
}
FD.page({ title: "Welcome", render: render, bind: bind, skel: 1 });
})();
