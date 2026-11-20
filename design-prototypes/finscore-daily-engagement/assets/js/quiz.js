/* Quiz Arena: daily quiz, category rounds by difficulty, optional timer, instant feedback. XP once per category per week. */
(function(){
var FD = window.FD, D = FD.D, h = FD.h, diff = 0, timed = false;
var CI = { basics: "wallet", saving: "coins", investing: "trend", debt: "card", protection: "umbrella" };

function render(){
  var pr = FD.profile(), P = FD.P(), wk = FD.wk(), st = FD.stats(), dq = FD.isDone("q:" + FD.today() + ":daily");
  var cats = Object.keys(D.cats);
  return '<div class="page-h"><div><p class="eyebrow">Quiz Arena</p><h1 class="h1">Sharpen your money mind</h1><p class="muted">Short rounds, instant explanations. Score 60% or more for 20 XP, once per topic each week. More rounds are always free practice.</p></div></div>' +
  '<div id="lobby"><section class="card pad opts-bar"><div><p class="eyebrow">Difficulty</p><div class="chips" id="df">' + ["Mixed"].concat(D.diffs).map(function(t, i){ return '<button class="chip' + (diff === i ? " on" : "") + '" data-d="' + i + '" aria-pressed="' + (diff === i) + '">' + t + '</button>'; }).join("") + '</div></div><label class="toggle"><input type="checkbox" id="tm" ' + (timed ? "checked" : "") + '> <span>20-second timer</span></label></section>' +
  '<div class="grid g3 arena">' +
   '<article class="card pad hover qcat star ' + (dq ? "is-done" : "") + '"><span class="qc-ic">' + FD.icon("sparkle") + '</span><div class="row between"><h3 class="h3">Quiz of the day</h3>' + (dq ? '<span class="pill pos">' + FD.icon("check") + ' Done</span>' : '<span class="pill gold">+20 XP</span>') + '</div><p class="muted sm">Three questions for a ' + h(pr.tag.toLowerCase()) + '. Shared with the Home screen.</p><button class="btn btn-primary btn-sm" data-s="daily">' + (dq ? "Practice" : "Play") + FD.icon("arrow") + '</button></article>' +
   cats.map(function(c){ var key = "q:" + wk + ":" + c, done = FD.isDone(key), rec = pr.quiz.indexOf(c) > -1; return '<article class="card pad hover qcat ' + (done ? "is-done" : "") + '"><span class="qc-ic">' + FD.icon(CI[c]) + '</span><div class="row between"><h3 class="h3">' + D.cats[c] + '</h3>' + (done ? '<span class="pill pos">' + FD.icon("check") + ' Done</span>' : rec ? '<span class="pill ai">For you</span>' : '<span class="pill">+20 XP</span>') + '</div><p class="muted sm">' + D.quiz.filter(function(q){ return q.c === c; }).length + ' questions · ' + (done ? "XP earned this week" : "5 per round") + '</p><button class="btn ' + (done ? "btn-ghost" : "btn-primary") + ' btn-sm" data-s="' + c + '">' + (done ? "Practice" : "Play") + FD.icon("arrow") + '</button></article>'; }).join("") + '</div>' +
  '<div class="grid g3 mt2"><div class="card pad kpi2"><p class="eyebrow">Rounds finished</p><b class="kpi-big" data-count="' + (st.quizzes || 0) + '">0</b></div><div class="card pad kpi2"><p class="eyebrow">Perfect rounds</p><b class="kpi-big" data-count="' + (st.perfectQuiz || 0) + '">0</b></div><div class="card pad kpi2"><p class="eyebrow">Topics done this week</p><b class="kpi-big">' + cats.filter(function(c){ return FD.isDone("q:" + wk + ":" + c); }).length + '<small> / 5</small></b></div></div></div>' +
  '<section class="card pad arena-run" id="run" hidden><button class="back" id="bk">' + FD.icon("arrowl") + ' Back to arena</button><div id="rq"></div></section>';
}
function start(mode, root){
  var wk = FD.wk(), q, key, title, xp = 20;
  if (mode === "daily"){ q = FD.pickQuestions(3); key = "q:" + FD.today() + ":daily"; title = "Quiz of the day"; }
  else { q = FD.pickQuestions(5, { cat: mode, diff: diff || 0 }); if (q.length < 5) q = FD.pickQuestions(5, { cat: mode }); key = "q:" + wk + ":" + mode; title = D.cats[mode] + " quiz"; }
  FD.$("#lobby", root).hidden = true; var run = FD.$("#run", root); run.hidden = false; window.scrollTo(0, 0);
  function go(){ FD.runQuiz(FD.$("#rq", root), { questions: mode === "daily" ? FD.pickQuestions(3) : (function(){ var z = FD.pickQuestions(5, { cat: mode, diff: diff || 0 }); return z.length < 5 ? FD.pickQuestions(5, { cat: mode }) : z; })(), key: key, xp: xp, title: title, id: "quiz-" + mode, timed: timed, again: go, after: '<button class="btn btn-ghost" id="lob">Back to arena</button>' }); }
  FD.runQuiz(FD.$("#rq", root), { questions: q, key: key, xp: xp, title: title, id: "quiz-" + mode, timed: timed, again: go, after: '<button class="btn btn-ghost" id="lob">Back to arena</button>' });
}
function bind(root){
  FD.$$("#df .chip", root).forEach(function(b){ b.addEventListener("click", function(){ diff = parseInt(b.getAttribute("data-d"), 10); FD.$$("#df .chip", root).forEach(function(x){ var on = x === b; x.classList.toggle("on", on); x.setAttribute("aria-pressed", on); }); }); });
  FD.$("#tm", root).addEventListener("change", function(e){ timed = e.target.checked; });
  FD.$$("[data-s]", root).forEach(function(b){ b.addEventListener("click", function(){ start(b.getAttribute("data-s"), root); }); });
  function back(){ FD.$("#lobby", root).hidden = false; FD.$("#run", root).hidden = true; FD.rerender(); }
  FD.$("#bk", root).addEventListener("click", back);
  if (!root._q){ root._q = 1; root.addEventListener("click", function(e){ if (e.target.closest && e.target.closest("#lob")){ FD.$("#lobby", root).hidden = false; FD.$("#run", root).hidden = true; FD.rerender(); } }); }
}
FD.page({ title: "Quiz Arena", render: render, bind: bind, skel: 3 });
})();
