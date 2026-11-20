/* Companion home: greeting, Fin, wellness, today's activity, daily challenge, quiz of the day, week, XP, goals, insights, products. */
(function(){
var FD = window.FD, D = FD.D, h = FD.h;
var CH = {
 beginner: ["Write down your last 5 purchases and tag each Need or Want.", "Move ₹250 into your emergency pot.", "Find one subscription or habit you could pause this week."],
 young: ["Set up (or check) an automatic transfer for payday.", "Review last month's top 3 spending categories.", "Name your trip pot and give it a due date."],
 investor: ["Write one sentence: when will I rebalance, and why?", "Check the cost ratio of one product you hold.", "Note one decision you made from emotion this month."],
 family: ["Share one money priority with your partner today.", "Check when your insurance premiums fall due this year.", "List this year's three biggest annual costs."],
 saver: ["Label each goal with its due date and risk level.", "Review where your short-term goal money sits.", "Raise one monthly goal contribution by 5%."]
};
function greet(){ var hr = new Date().getHours(); return hr < 12 ? "Good morning" : hr < 17 ? "Good afternoon" : "Good evening"; }
function chIdx(){ var n = new Date(); return Math.floor((n - new Date(n.getFullYear(), 0, 0)) / 864e5) % 3; }
var showAllIns = false;

function render(){
  var pr = FD.profile(), P = FD.P(), w = FD.wellness(), td = FD.todayDay(), tdone = FD.dayDone(td.id), L = FD.level(), now = new Date();
  var chText = CH[pr.id][chIdx()], chKey = "c:" + FD.today(), chDone = FD.isDone(chKey), qKey = "q:" + FD.today() + ":daily", qDone = FD.isDone(qKey);
  var delta = w.score - w.prev, st = FD.stats(), streak = FD.streak();
  var earned = D.badges.filter(function(b){ return P.badges[b.id]; }).sort(function(a, b){ return P.badges[b.id].t - P.badges[a.id].t; }).slice(0, 4);
  var nextB = D.badges.filter(function(b){ return !P.badges[b.id] && b.stat !== "level"; }).sort(function(a, b){ return (st[b.stat] || 0) / b.n < (st[a.stat] || 0) / a.n ? 1 : -1; })[0];
  var ins = showAllIns ? pr.insights : pr.insights.slice(0, 2);
  var cl = [
    ["Complete your first activity", (P.st.activities || 0) > 0, "daily-activities.html?day=" + td.id, "bolt"],
    ["Set your first goal", pr.goals.length > 0, "financial-journey.html#goals", "target"],
    ["Finish a quiz round", (P.st.quizzes || 0) > 0, "quiz-arena.html", "brain"],
    ["Say hi to Fin", !!P.askedFin, "ai-companion.html", "chat"]
  ], clDone = cl.filter(function(x){ return x[1]; }).length;
  var clHTML = P.fresh && clDone < cl.length ? '<section class="card pad checklist" aria-labelledby="clh"><div class="row between"><div><h2 class="h2" id="clh">Your first steps</h2><p class="sm muted">Four small things to make this yours. Any order.</p></div><span class="pill">' + clDone + ' / ' + cl.length + '</span></div>' + FD.bar(clDone / cl.length * 100) + '<ul class="cl-l">' + cl.map(function(x){ return '<li><a class="cl-i ' + (x[1] ? "done" : "") + '" href="' + x[2] + '"><span class="cl-ic">' + FD.icon(x[1] ? "check" : x[3]) + '</span><span class="sp">' + h(x[0]) + '</span>' + (x[1] ? "" : FD.icon("chev")) + '</a></li>'; }).join("") + '</ul></section>' : "";
  return '' +
  '<section class="hero hh" aria-labelledby="gr"><div class="hh-l"><p class="eyebrow">' + now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" }) + '</p><h1 class="h1" id="gr">' + greet() + ', ' + h(pr.first) + '</h1><p class="lead muted">' + h(pr.greeting) + '</p>' +
   '<div class="fin-msg"><div class="fin-av">' + FD.fin(52, tdone ? "cheer" : "happy") + '</div><div><p class="fm-n">Fin <span class="pill ai">AI companion · scripted</span></p><p id="fin-say">' + h(pr.ai) + '</p></div></div>' +
   '<div class="btn-row left"><a class="btn btn-light" href="daily-activities.html?day=' + td.id + '">' + FD.icon("play") + (tdone ? " Revisit today" : " Start today\'s activity") + '</a><a class="btn btn-hero-ghost" href="ai-companion.html">' + FD.icon("chat") + ' Ask Fin</a></div></div>' +
   '<div class="hh-r"><div class="well">' + FD.ring(w.score, { size: 168, stroke: 10, c1: "#fff", c2: "#B4F2DF", html: '<b class="big" data-count="' + w.score + '">0</b><span class="sm">of 100</span>' }) + '<div class="well-t"><p class="eyebrow">Financial wellness</p><p><b>' + w.band + '</b> <span class="delta ' + (delta >= 0 ? "up" : "dn") + '">' + (delta >= 0 ? "▲ " : "▼ ") + Math.abs(delta) + ' this week</span></p>' + FD.simTag("Simulated score") + '</div></div></div>' +
   '<div class="hero-art" aria-hidden="true">' + FD.illo("hero") + '</div></section>' +

  clHTML + '<div class="sec-h"><h2 class="h2">Your day, in three small moves</h2><span class="sm muted">Optional. Pick what suits you.</span></div>' +
  '<div class="grid g3 trio">' +
   '<article class="card pad act-card ' + (tdone ? "is-done" : "") + '"><div class="row between"><span class="pill">' + FD.icon(td.icon) + ' Today · ' + td.short + '</span>' + (tdone ? '<span class="pill pos">' + FD.icon("check") + ' Done</span>' : '<span class="pill gold">+' + td.xp + ' XP</span>') + '</div><h3 class="h3">' + td.name + '</h3><p class="muted">' + h(td.blurb) + '</p><div class="row between mt"><span class="sm muted">' + FD.icon("clock") + ' ~' + td.mins + ' min</span><a class="btn btn-primary btn-sm" href="daily-activities.html?day=' + td.id + '">' + (tdone ? "Review" : "Start") + FD.icon("arrow") + '</a></div></article>' +
   '<article class="card pad ch-card ' + (chDone ? "is-done" : "") + '"><div class="row between"><span class="pill ai">' + FD.icon("bolt") + ' Daily challenge</span><span class="pill ' + (chDone ? "pos" : "gold") + '">' + (chDone ? "Done" : "+10 XP") + '</span></div><h3 class="h3">One real-world action</h3><p>' + h(chText) + '</p><div class="row between mt"><span class="sm muted">Self-reported</span><button class="btn ' + (chDone ? "btn-ghost" : "btn-primary") + ' btn-sm" id="chbtn" ' + (chDone ? "disabled" : "") + '>' + (chDone ? "Completed" : "I did this") + FD.icon("check") + '</button></div></article>' +
   '<article class="card pad qd-card ' + (qDone ? "is-done" : "") + '"><div class="row between"><span class="pill">' + FD.icon("brain") + ' Quiz of the day</span><span class="pill ' + (qDone ? "pos" : "gold") + '">' + (qDone ? "Done" : "+20 XP") + '</span></div><h3 class="h3">Daily 3</h3><p class="muted">Three questions picked for a ' + h(pr.tag.toLowerCase()) + '. Score 60% or more to earn XP.</p><div class="row between mt"><span class="sm muted">~2 min</span><button class="btn btn-primary btn-sm" id="qdbtn">' + (qDone ? "Practice" : "Play") + FD.icon("arrow") + '</button></div></article>' +
  '</div>' +

  '<div class="grid gh mid-row"><section class="card pad" aria-labelledby="wk"><div class="row between"><h2 class="h2" id="wk">This week</h2><a class="link" href="weekly-engagement.html">Full week</a></div><p class="muted sm">' + st.activeDays + ' active ' + (st.activeDays === 1 ? "day" : "days") + ' · ' + FD.weekAwards().n + ' meaningful actions · any day is open to explore</p>' + FD.weekStrip() + (streak ? '<p class="streak">' + FD.icon("flame") + ' <b>' + streak + '-day</b> streak. Progress, not pressure.</p>' : '<p class="streak">' + FD.icon("sparkle") + ' A fresh start is a good start.</p>') + '</section>' +
   '<section class="card pad lvl-sec" aria-labelledby="lv"><div class="row between"><h2 class="h2" id="lv">Your level</h2><a class="link" href="achievement-center.html">Achievements</a></div>' + FD.levelCard() + (nextB ? '<div class="next-b"><p class="eyebrow">Closest badge</p><div class="row">' + '<span class="mini-b">' + FD.icon(nextB.icon) + '</span><div class="sp"><b>' + h(nextB.name) + '</b><p class="sm muted">' + h(nextB.desc) + '</p>' + FD.bar(Math.min(100, (st[nextB.stat] || 0) / nextB.n * 100)) + '</div></div></div>' : '') +
   (earned.length ? '<div class="mini-row" aria-label="Recent badges">' + earned.map(function(b){ return '<span class="mini-b got" title="' + h(b.name) + '">' + FD.icon(b.icon) + '</span>'; }).join("") + '</div>' : "") + '</section></div>' +

  '<div class="sec-h" id="goals"><h2 class="h2">Your goals</h2><a href="financial-journey.html#goals">Manage goals</a></div>' +
  (pr.goals.length ? '' : FD.empty("empty", "No goals yet", "A goal is a name, an amount and a date. Set your first in about a minute.", '<a class="btn btn-primary" href="financial-journey.html#goals">Set a goal</a>')) + '<div class="grid g3">' + pr.goals.map(function(g){ var sv = FD.goalSaved(g), pct = Math.min(100, Math.round(sv / g.target * 100)); return '<article class="card pad goal"><div class="row"><span class="goal-ic">' + FD.icon(g.icon) + '</span><div class="sp"><h3 class="h3">' + h(g.name) + '</h3><p class="sm muted">Due ' + h(g.due) + '</p></div><b class="goal-p">' + pct + '%</b></div>' + FD.bar(pct, "thick") + '<p class="sm muted">' + (g.unit === "%" ? pct + "% complete" : FD.inrS(sv) + " of " + FD.inrS(g.target)) + '</p></article>'; }).join("") + '</div>' +

  '<div class="sec-h"><h2 class="h2">Fin noticed</h2><span class="sm muted">Personalised insights · simulated</span></div>' +
  '<div class="grid g2">' + ins.map(function(n){ return '<article class="card pad ins ' + n.tone + '"><span class="ins-ic">' + FD.icon(n.i) + '</span><div><h3 class="h3">' + h(n.t) + '</h3><p class="muted">' + h(n.d) + '</p></div></article>'; }).join("") + '</div>' +
  '<div class="center mt"><button class="btn btn-ghost btn-sm" id="insmore" aria-expanded="' + showAllIns + '">' + (showAllIns ? "Show fewer insights" : "Show " + (pr.insights.length - 2) + " more insights") + '</button></div>' +

  '<div class="sec-h"><h2 class="h2">Learn next</h2><span class="sm muted">Picked for ' + h(pr.tag) + '</span></div>' +
  '<div class="grid g3">' + pr.learn.map(function(l){ return '<a class="card pad hover learn" href="' + (l.mod ? "financial-journey.html?m=" + l.mod : l.href) + '"><span class="ins-ic ai">' + FD.icon("book") + '</span><h3 class="h3">' + h(l.t) + '</h3><p class="muted sm">' + h(l.d) + '</p><span class="link">Open ' + FD.icon("arrow") + '</span></a>'; }).join("") + '</div>' +

  '<div class="sec-h"><h2 class="h2">Finscore tools</h2><span class="sm muted">Existing products · links simulated</span></div>' +
  '<div class="grid g3 prods">' + D.products.map(function(p){ return '<a class="card hover prod" href="' + p.href + '"><span class="prod-ic">' + FD.icon(p.icon) + '</span><div><b>' + h(p.name) + '</b><p class="sm muted">' + h(p.d) + '</p></div>' + FD.icon("chev") + '</a>'; }).join("") + '</div>' +
  '<aside class="card pad plus"><div class="row"><span class="ins-ic gold">' + FD.icon("crown") + '</span><div class="sp"><h3 class="h3">Finscore Plus <span class="pill gold">Preview · simulated</span></h3><p class="muted">Deeper reports, family goals and monthly coaching. Nothing is sold here; this is a design preview only.</p></div><button class="btn btn-ghost btn-sm" id="plusbtn">See preview</button></div></aside>';
}

function bind(root){
  var cb = FD.$("#chbtn", root);
  if (cb) cb.addEventListener("click", function(){
    var r = FD.award("c:" + FD.today(), { xp: 10, type: "habit", title: "Daily challenge", id: "daily-challenge" });
    FD.confetti(); FD.rerender();
  });
  FD.$("#qdbtn", root).addEventListener("click", function(){
    var m = FD.modal({ title: "Quiz of the day", onClose: function(){ FD.rerender(); }, html: '<h2 class="h2">Quiz of the day</h2><p class="muted sm">Three questions. Score 60% or more to earn 20 XP (once a day).</p><div id="qd"></div>' });
    FD.runQuiz(FD.$("#qd", m.el), { questions: FD.pickQuestions(3), key: "q:" + FD.today() + ":daily", xp: 20, title: "Quiz of the day", id: "daily-quiz", after: '<button class="btn btn-ghost" data-close>Done</button>', pass: 60 });
    m.el.addEventListener("click", function(e){ if (e.target.closest && e.target.closest("[data-close]")) m.close(); });
  });
  FD.$("#insmore", root).addEventListener("click", function(){ showAllIns = !showAllIns; FD.rerender(); });
  FD.$("#plusbtn", root).addEventListener("click", function(){
    var m = FD.modal({ title: "Finscore Plus preview", html: '<h2 class="h2">Finscore Plus ' + FD.simTag("Concept") + '</h2><p class="muted">A concept of what a paid tier could add on top of the free daily companion. Nothing is for sale and no payment is possible in this prototype.</p><ul class="plus-list"><li>' + FD.icon("check") + ' Deep-dive monthly report with next-month plan</li><li>' + FD.icon("check") + ' Family goals shared with a partner</li><li>' + FD.icon("check") + ' Advanced simulator scenarios and what-ifs</li><li>' + FD.icon("check") + ' Priority guided learning paths</li></ul><p class="sm muted">Free always: daily activities, quizzes, XP, badges, basic insights.</p><div class="btn-row"><button class="btn btn-primary" data-ok>Got it</button></div>' });
    FD.$("[data-ok]", m.el).addEventListener("click", m.close);
  });
}
FD.page({ title: "Home", render: render, bind: bind, skel: 4 });
})();
