/* Monthly Wrapped: story-format recap (tap/keys/buttons), next-month plan, simulated share. Baseline month is demo data; live actions are added. */
(function(){
var FD = window.FD, D = FD.D, h = FD.h, idx = 0, counted = false;

function data(){
  var pr = FD.profile(), P = FD.P(), m = pr.monthly, now = new Date(), mo = now.getMonth(), yr = now.getFullYear(), live = { acts: 0, xp: 0, quiz: 0 };
  Object.keys(P.done).forEach(function(k){ var d = P.done[k]; if (d.seed || String(d.id).indexOf("demo") === 0) return; var dt = new Date(d.t); if (dt.getMonth() === mo && dt.getFullYear() === yr){ live.acts++; live.xp += d.xp; if (d.type === "quiz") live.quiz++; } });
  var w = FD.wellness(), bm = D.badges.filter(function(b){ var x = P.badges[b.id]; return x && (x.seed || new Date(x.t).getMonth() === mo); });
  var t = P.pers ? D.personality.types.filter(function(x){ return x.id === P.pers; })[0] : null;
  return { pr: pr, month: now.toLocaleDateString("en-IN", { month: "long" }), acts: m.acts + live.acts, days: Math.min(28, m.days + Math.min(live.acts, 3)), quiz: m.quiz + live.quiz, sav: m.sav, from: m.scoreFrom, to: Math.max(m.scoreTo, w.score), top: m.topSkill, xp: FD.xp(), level: FD.level(), badges: bm, pers: t, goal: pr.goals[0], fresh: !!P.fresh, live: live };
}
function slides(d){
  var rec = [d.pr.focus, "Complete one " + D.cats[d.pr.quiz[0]].toLowerCase() + " quiz a week", "Keep a " + Math.max(3, Math.min(5, Math.round(d.days / 6))) + "-active-day week"];
  return [
   { c: "s1", ic: "gift", k: "Your " + d.month + ", wrapped", t: "Hi " + d.pr.first, s: "A look back at the habits you built. Baseline numbers are simulated; what you do here adds to them." },
   { c: "s2", ic: "flame", k: "Showing up", t: '<span data-count="' + d.acts + '">0</span> meaningful actions', s: "On <b>" + d.days + " days</b> you learned, planned or reviewed something real." },
   { c: "s3", ic: "rocket", k: "Level and XP", t: '<span data-count="' + d.xp + '">0</span> XP', s: "You're level " + d.level.n + ", <b>" + h(d.level.name) + "</b>. Virtual points, real progress." },
   { c: "s4", ic: "brain", k: "Your top skill", t: h(d.top), s: d.quiz + " quiz rounds and a growing sense of what you know and don't yet." },
   { c: "s5", ic: "gauge", k: "Financial wellness " + "(simulated)", t: d.from + " → " + d.to, s: (d.to >= d.from ? "Up " + (d.to - d.from) + " points" : "Down " + (d.from - d.to)) + " this month. Small habits move this number." },
   { c: "s6", ic: "coins", k: "Savings in motion", t: "₹" + FD.inr(d.sav), s: d.goal ? (d.fresh ? "" : "Demo profile saved this month, ") + "with <b>" + h(d.goal.name) + "</b> at " + Math.min(100, Math.round(FD.goalSaved(d.goal) / d.goal.target * 100)) + "%." : "Set a goal in Financial Journey to see your savings story here." },
   { c: "s7", ic: d.pers ? d.pers.i : "user", k: "Your money style", t: d.pers ? h(d.pers.n) : "Not discovered yet", s: d.pers ? h(d.pers.d) : "Take the 6-question personality test in Financial Journey to unlock this card." },
   { c: "s8", ic: "medal", k: "Badges", t: d.badges.length + " collected", s: d.badges.slice(0, 4).map(function(b){ return h(b.name); }).join(" · ") || "Your first badge is one action away." },
   { c: "s9", ic: "calendar", k: "Next month", t: "Your plan", s: '<ul class="wl">' + rec.map(function(r){ return "<li>" + h(r) + "</li>"; }).join("") + "</ul>" },
   { c: "s10", ic: "share", k: "Share your wrapped", t: "That's a wrap", s: "Share a summary card with a friend. Simulated, nothing is sent.", end: true }
  ];
}
function cardHTML(d){
  return '<div class="rep-card wr"><p class="eyebrow">' + h(d.month) + ' Wrapped · simulated</p><h3 class="rep-h">' + h(d.pr.first) + '\'s month</h3><div class="rep-g"><div><b>' + d.acts + '</b><span>actions</span></div><div><b>' + d.xp + '</b><span>XP</span></div><div><b>' + d.days + '</b><span>days</span></div><div><b>' + d.from + '→' + d.to + '</b><span>wellness</span></div></div><p class="rep-f">Finscore Daily Companion · demo data</p></div>';
}
function render(){
  var d = data(), S = slides(d); if (idx >= S.length) idx = 0;
  return '<div class="page-h"><div><p class="eyebrow">Monthly Wrapped</p><h1 class="h1">Your ' + h(d.month) + ' in ' + S.length + ' moments</h1><p class="muted">Tap, swipe, use arrow keys or the buttons. ' + FD.simTag("Baseline is demo data") + '</p></div></div>' +
   '<div class="story-wrap"><div class="story" id="story" tabindex="0" aria-roledescription="carousel" aria-label="Monthly wrapped story"><div class="story-bars" aria-hidden="true">' + S.map(function(_, i){ return '<i class="' + (i < idx ? "on" : i === idx ? "cur" : "") + '"></i>'; }).join("") + '</div><div class="slide ' + S[idx].c + '" id="slide" aria-live="polite"></div><button class="tap l" id="pv" aria-label="Previous slide"></button><button class="tap r" id="nx" aria-label="Next slide"></button></div>' +
   '<div class="story-ctl"><button class="btn btn-ghost" id="pvb">' + FD.icon("arrowl") + ' Back</button><span class="sm muted">' + (idx + 1) + ' / ' + S.length + '</span><button class="btn btn-primary" id="nxb">' + (idx === S.length - 1 ? "Replay" : "Next") + FD.icon("arrow") + '</button></div></div>';
}
function paint(){
  var d = data(), S = slides(d), s = S[idx], el = FD.$("#slide");
  el.className = "slide " + s.c; el.innerHTML = '<span class="sl-ic">' + FD.icon(s.ic) + '</span><p class="eyebrow">' + s.k + '</p><h2 class="sl-t">' + s.t + '</h2><p class="sl-s">' + s.s + '</p>' + (s.end ? '<div class="btn-row"><button class="btn btn-light" id="shr">' + FD.icon("share") + ' Share</button><a class="btn btn-hero-ghost" href="companion-home.html">Back to home</a></div>' : "");
  el.style.animation = "none"; void el.offsetWidth; el.style.animation = "";
  FD.$$("#story .story-bars i").forEach(function(b, i){ b.className = i < idx ? "on" : i === idx ? "cur" : ""; });
  FD.$("#nxb").innerHTML = (idx === S.length - 1 ? "Replay" : "Next") + FD.icon("arrow"); FD.$(".story-ctl .sm").textContent = (idx + 1) + " / " + S.length;
  FD.animate(el);
  if (s.end){ if (!counted){ counted = true; FD.bump("wrappedViews"); } var sh = FD.$("#shr"); if (sh) sh.addEventListener("click", function(){ FD.share({ title: "your month", card: cardHTML(d), text: "My Finscore " + d.month + " Wrapped (simulated demo): " + d.acts + " actions, wellness " + d.from + " to " + d.to + "." }); }); FD.confetti(); }
}
function bind(root){
  var n = slides(data()).length;
  function go(k){ idx = Math.max(0, Math.min(n - 1, k)); paint(); }
  FD.$("#nx", root).addEventListener("click", function(){ go(idx + 1); }); FD.$("#pv", root).addEventListener("click", function(){ go(idx - 1); });
  FD.$("#nxb", root).addEventListener("click", function(){ go(idx === n - 1 ? 0 : idx + 1); }); FD.$("#pvb", root).addEventListener("click", function(){ go(idx - 1); });
  var st = FD.$("#story", root); st.addEventListener("keydown", function(e){ if (e.key === "ArrowRight") go(idx + 1); if (e.key === "ArrowLeft") go(idx - 1); });
  var x0 = null; st.addEventListener("pointerdown", function(e){ x0 = e.clientX; }); st.addEventListener("pointerup", function(e){ if (x0 == null) return; var dx = e.clientX - x0; x0 = null; if (Math.abs(dx) > 60) go(dx < 0 ? idx + 1 : idx - 1); });
  paint();
}
FD.page({ title: "Monthly Wrapped", render: render, bind: bind, skel: 2 });
})();
