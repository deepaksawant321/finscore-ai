/* AI companion: scripted chat, suggestions, insights, recommended actions, goal guidance, learning. NO external AI calls. */
(function(){
var FD = window.FD, D = FD.D, h = FD.h, msgs = [], panel = "chat", busy = false;

function ctx(){
  var w = FD.wellness(), L = FD.level();
  return { today: FD.todayDay(), score: w.score, prev: w.prev, best: w.best, weak: w.weak, level: L, xp: FD.xp(), next: L.next, inr: FD.inr };
}
function reply(text){
  var pr = FD.profile(), t = text.toLowerCase(), c = ctx(), best = null, bs = 0;
  D.ai.intents.forEach(function(it){ var s = 0; it.k.forEach(function(k){ if (t.indexOf(k) > -1) s += k.length > 4 ? 2 : 1; }); if (it.id === "refuse" && s) s += 10; if (s > bs){ bs = s; best = it; } });
  return best ? best.r(pr, c) : D.ai.fallback(pr);
}
function msgHTML(m){
  if (m.who === "me") return '<div class="msg me"><div class="bub">' + h(m.text) + '</div></div>';
  return '<div class="msg fin"><span class="m-av">' + FD.fin(34, "happy") + '</span><div class="bub"><p>' + FD.md(m.text) + '</p>' + (m.cards ? '<div class="m-cards">' + m.cards.map(function(c){ return '<a class="m-card" href="' + c.href + '"><span class="ins-ic">' + FD.icon(c.i) + '</span><span><b>' + h(c.t) + '</b><small>' + h(c.d) + '</small></span>' + FD.icon("chev") + '</a>'; }).join("") + '</div>' : "") + '</div></div>';
}
function render(){
  var pr = FD.profile(), c = ctx(), g = pr.goals[0] || { id: "none", name: "No goal yet", icon: "target", target: 1, saved: 0, due: "—", monthly: 0, none: true }, sv = FD.goalSaved(g), pct = Math.min(100, Math.round(sv / g.target * 100)), quick = D.ai.quick[pr.id];
  if (!msgs.length || msgs.pid !== pr.id){ msgs = [{ who: "fin", text: "Hi " + pr.first + ", I'm **Fin**. " + pr.ai, cards: [{ t: c.today.name, d: c.today.mins + " min · " + c.today.xp + " XP", href: "daily-activities.html?day=" + c.today.id, i: c.today.icon }] }]; msgs.pid = pr.id; }
  return '<div class="page-h"><div><p class="eyebrow">AI companion</p><h1 class="h1">Talk it through with Fin</h1><p class="muted">Scripted demo replies based on the <b>' + h(pr.tag) + '</b> profile. No external AI, no real data. ' + FD.simTag("Predefined responses") + '</p></div></div>' +
  '<div class="seg" role="tablist" aria-label="Companion view"><button role="tab" class="' + (panel === "chat" ? "on" : "") + '" data-p="chat" aria-selected="' + (panel === "chat") + '">' + FD.icon("chat") + ' Chat</button><button role="tab" class="' + (panel === "side" ? "on" : "") + '" data-p="side" aria-selected="' + (panel === "side") + '">' + FD.icon("sparkle") + ' For you</button></div>' +
  '<div class="comp ' + panel + '"><section class="card chat" aria-label="Chat with Fin"><div class="chat-h"><span class="m-av big">' + FD.fin(46, "happy") + '</span><div><b>Fin</b><p class="sm muted">Your financial companion · scripted</p></div></div><div class="msgs" id="msgs" role="log" aria-live="polite">' + msgs.map(msgHTML).join("") + '</div>' +
   '<div class="sugg" aria-label="Suggested questions">' + quick.map(function(q){ return '<button class="chip" data-q="' + h(q) + '">' + h(q) + '</button>'; }).join("") + '</div>' +
   '<form class="composer" id="cf" autocomplete="off"><label class="sr" for="ci">Ask Fin a question</label><input id="ci" type="text" placeholder="Ask about saving, goals, investing basics…" maxlength="160" enterkeyhint="send"><button class="btn btn-primary" type="submit" aria-label="Send">' + FD.icon("send") + '</button></form></section>' +
  '<aside class="side-p" aria-label="Insights for you">' +
   '<section class="card pad"><h2 class="h3">Recommended today</h2><div class="rec-l">' +
    '<a class="rec" href="daily-activities.html?day=' + c.today.id + '"><span class="ins-ic">' + FD.icon(c.today.icon) + '</span><div class="sp"><b>' + c.today.name + '</b><p class="sm muted">' + c.today.mins + ' min · ' + c.today.xp + ' XP</p></div>' + FD.icon("chev") + '</a>' +
    '<a class="rec" href="companion-home.html"><span class="ins-ic ai">' + FD.icon("bolt") + '</span><div class="sp"><b>Daily challenge</b><p class="sm muted">One real-world action on Home</p></div>' + FD.icon("chev") + '</a></div></section>' +
   '<section class="card pad"><h2 class="h3">Goal guidance</h2><div class="row"><span class="goal-ic">' + FD.icon(g.icon) + '</span><div class="sp"><b>' + h(g.name) + '</b><p class="sm muted">Due ' + h(g.due) + '</p></div><b class="goal-p">' + pct + '%</b></div>' + FD.bar(pct, "thick") + '<p class="sm muted mt-s">' + (g.none ? 'Set your first goal to get tailored guidance. <a class="link" href="financial-journey.html#goals">Open the planner</a>' : g.monthly && g.unit !== "%" ? "At ₹" + FD.inr(g.monthly) + "/mo about " + Math.ceil((g.target - sv) / g.monthly) + " months to go. A 10% step-up would save about " + Math.max(1, Math.round((g.target - sv) / g.monthly - (g.target - sv) / (g.monthly * 1.1))) + " months." : "Keep checking this one weekly.") + '</p></section>' +
   '<section class="card pad"><h2 class="h3">What Fin noticed</h2>' + pr.insights.slice(0, 3).map(function(n){ return '<div class="ins-s ' + n.tone + '"><span class="ins-ic">' + FD.icon(n.i) + '</span><div><b class="sm">' + h(n.t) + '</b><p class="sm muted">' + h(n.d) + '</p></div></div>'; }).join("") + '</section>' +
   '<section class="card pad"><h2 class="h3">Learning for you</h2>' + pr.learn.map(function(l){ return '<a class="rec" href="' + (l.mod ? "financial-journey.html?m=" + l.mod : l.href) + '"><span class="ins-ic ai">' + FD.icon("book") + '</span><div class="sp"><b class="sm">' + h(l.t) + '</b><p class="sm muted">' + h(l.d) + '</p></div>' + FD.icon("chev") + '</a>'; }).join("") + '</section>' +
   '<button class="card pad plus-t" id="deep"><span class="ins-ic gold">' + FD.icon("lock") + '</span><span class="sp"><b>Insight deep-dive</b><small class="muted">Plus preview · simulated</small></span>' + FD.icon("chev") + '</button>' +
  '</aside></div>';
}

function bind(root){
  var box = FD.$("#msgs", root), inp = FD.$("#ci", root);
  function scroll(){ box.scrollTop = box.scrollHeight; }
  function ask(text){
    text = (text || "").trim(); if (!text || busy) return; busy = true; FD.P().askedFin = 1; FD.save();
    msgs.push({ who: "me", text: text }); box.insertAdjacentHTML("beforeend", msgHTML({ who: "me", text: text })); inp.value = ""; scroll();
    var typing = document.createElement("div"); typing.className = "msg fin"; typing.innerHTML = '<span class="m-av">' + FD.fin(34, "think") + '</span><div class="bub typing" aria-label="Fin is typing"><i></i><i></i><i></i></div>'; box.appendChild(typing); scroll();
    var r = reply(text);
    setTimeout(function(){ typing.remove(); var m = { who: "fin", text: r.text, cards: r.cards }; msgs.push(m); box.insertAdjacentHTML("beforeend", msgHTML(m)); scroll(); busy = false; }, FD.reduced() ? 50 : 700 + Math.min(900, r.text.length * 4));
  }
  FD.$("#cf", root).addEventListener("submit", function(e){ e.preventDefault(); ask(inp.value); });
  FD.$$("[data-q]", root).forEach(function(b){ b.addEventListener("click", function(){ ask(b.getAttribute("data-q")); }); });
  FD.$$(".seg button", root).forEach(function(b){ b.addEventListener("click", function(){ panel = b.getAttribute("data-p"); FD.$(".comp", root).className = "comp " + panel; FD.$$(".seg button", root).forEach(function(x){ var on = x === b; x.classList.toggle("on", on); x.setAttribute("aria-selected", on); }); }); });
  FD.$("#deep", root).addEventListener("click", function(){ var m = FD.modal({ title: "Insight deep-dive preview", html: '<h2 class="h2">Insight deep-dive ' + FD.simTag("Concept") + '</h2><p class="muted">A concept for a paid tier: a longer monthly analysis with scenario what-ifs for your goals. Not available in this prototype, and nothing can be purchased.</p><div class="btn-row"><button class="btn btn-primary" data-ok>Got it</button></div>' }); FD.$("[data-ok]", m.el).addEventListener("click", m.close); });
  scroll();
}
FD.page({ title: "AI Companion", render: render, bind: bind, skel: 2 });
})();
