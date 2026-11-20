/* Finscore Daily Engagement (V3) — reusable interaction engines: quiz rounds and lesson steps. Simulated learning content only. */
(function(){
"use strict";
var FD = window.FD, D = FD.D, h = FD.h;

/* Pick questions: prefer the profile's suggested categories, mix difficulty. */
FD.pickQuestions = function(n, o){
  o = o || {}; var pr = FD.profile(), cats = o.cat ? [o.cat] : null, pool = D.quiz.slice();
  if (o.cat) pool = pool.filter(function(x){ return x.c === o.cat; });
  if (o.diff) pool = pool.filter(function(x){ return x.d === o.diff; });
  var pref = pool.filter(function(x){ return pr.quiz.indexOf(x.c) > -1; }), rest = pool.filter(function(x){ return pr.quiz.indexOf(x.c) < 0; });
  var pick = o.cat || o.diff ? FD.shuffle(pool) : FD.shuffle(pref).concat(FD.shuffle(rest));
  var out = pick.slice(0, n);
  if (out.length < n) out = out.concat(FD.shuffle(D.quiz.filter(function(x){ return out.indexOf(x) < 0; })).slice(0, n - out.length));
  return FD.shuffle(out).map(function(x){
    var idx = FD.shuffle(x.o.map(function(_, i){ return i; }));
    return { c: x.c, d: x.d, q: x.q, o: idx.map(function(i){ return x.o[i]; }), a: idx.indexOf(x.a), w: x.w };
  });
};

/* Quiz round. o: {questions, key, xp, title, type, stat, timed, pass} */
FD.runQuiz = function(el, o){
  var qs = o.questions, i = 0, ok = 0, streak = 0, best = 0, timer = null, secs = 20, pass = o.pass || 60;
  function stopT(){ if (timer){ clearInterval(timer); timer = null; } }
  function show(){
    stopT(); var qq = qs[i], L = ["A", "B", "C", "D"];
    el.innerHTML = '<div class="quiz"><div class="quiz-top"><span class="pill">' + (D.cats[qq.c] || "Quiz") + ' · ' + D.diffs[qq.d - 1] + '</span><span class="sm muted">Question ' + (i + 1) + ' of ' + qs.length + '</span>' + (streak > 1 ? '<span class="pill hot">' + FD.icon("flame") + streak + ' in a row</span>' : "") + '</div>' + FD.bar(i / qs.length * 100) +
      (o.timed ? '<div class="qtimer" aria-hidden="true"><i id="qt"></i></div><p class="sm muted" id="qtl" aria-live="off">' + secs + 's</p>' : "") +
      '<h3 class="q-t" id="qq">' + h(qq.q) + '</h3><div class="opts" role="group" aria-labelledby="qq">' + qq.o.map(function(t, k){ return '<button class="opt" data-k="' + k + '"><span class="opt-l">' + L[k] + '</span><span>' + h(t) + '</span></button>'; }).join("") + '</div><div class="fb" id="fb" role="status" aria-live="polite"></div></div>';
    FD.animate(el);
    FD.$$(".opt", el).forEach(function(b){ b.addEventListener("click", function(){ answer(parseInt(b.getAttribute("data-k"), 10)); }); });
    if (o.timed){
      var left = secs, t = FD.$("#qt", el), tl = FD.$("#qtl", el); if (t){ t.style.transition = "none"; t.style.width = "100%"; void t.offsetWidth; t.style.transition = "width " + secs + "s linear"; t.style.width = "0%"; }
      timer = setInterval(function(){ left--; if (tl) tl.textContent = Math.max(left, 0) + "s"; if (left <= 0){ stopT(); answer(-1); } }, 1000);
    }
  }
  function answer(k){
    stopT(); var qq = qs[i], right = k === qq.a; if (!FD.$(".opt", el) || el.querySelector(".opt[disabled]")) return;
    if (right){ ok++; streak++; best = Math.max(best, streak); } else streak = 0;
    FD.$$(".opt", el).forEach(function(b, n){ b.disabled = true; if (n === qq.a) b.classList.add("right"); else if (n === k) b.classList.add("wrong"); });
    var tq = FD.$("#qt", el); if (tq){ tq.style.transition = "none"; }
    FD.$("#fb", el).innerHTML = '<div class="fb-i ' + (right ? "ok" : "no") + '"><b>' + (right ? "Correct" : k < 0 ? "Time's up" : "Not quite") + '</b><p>' + h(qq.w) + '</p><button class="btn btn-primary" id="nx">' + (i + 1 < qs.length ? "Next question" : "See results") + FD.icon("arrow") + '</button></div>';
    var nx = FD.$("#nx", el); nx.focus(); nx.addEventListener("click", function(){ i++; if (i < qs.length) show(); else finish(); });
  }
  function finish(){
    var pct = Math.round(ok / qs.length * 100), earned = null, practice = false, msg;
    if (pct >= pass){
      if (o.key && FD.isDone(o.key)) practice = true;
      else if (o.key){ earned = FD.award(o.key, { xp: o.xp, type: "quiz", title: o.title, id: o.id, stat: null }); }
    } else msg = "A score of " + pass + "% or more earns XP. Review the explanations and try again. Learning is the point.";
    FD.bump("quizzes"); if (pct === 100) FD.bump("perfectQuiz");
    if (o.stat && earned && earned.gained) FD.bump(o.stat);
    msg = msg || (practice ? "Nice score. XP for this round was already earned, so this one is practice." : pct === 100 ? "Perfect round!" : "Solid work. Every explanation you read is knowledge kept.");
    el.innerHTML = '<div class="quiz result">' + FD.ring(pct, { size: 150, stroke: 10, html: '<b class="big" data-count="' + pct + '" data-suf="%">0%</b><span class="sm muted">' + ok + ' / ' + qs.length + '</span>' }) + '<h3 class="h3">' + (pct >= 80 ? "Excellent" : pct >= pass ? "Well done" : "Keep learning") + '</h3><p class="muted">' + h(msg) + '</p>' + (earned && earned.gained ? '<div class="xp-earn pop">+' + earned.gained + ' XP earned</div>' : practice ? '<div class="xp-earn off">Practice · no XP</div>' : "") + '<p class="sm muted">Best streak: ' + best + '</p><div class="btn-row"><button class="btn btn-primary" id="again">' + FD.icon("refresh") + ' Play another round</button>' + (o.after || "") + '</div></div>';
    FD.animate(el); if (earned && earned.gained) FD.confetti();
    FD.$("#again", el).addEventListener("click", function(){ if (o.again) o.again(); else { o.questions = FD.pickQuestions(qs.length); qs = o.questions; i = 0; ok = 0; streak = 0; best = 0; show(); } });
    if (o.onDone) o.onDone({ pct: pct, ok: ok, total: qs.length });
  }
  show();
};

/* Lesson steps: read a short card, answer one check question. o: {steps, onDone(correctCount)} */
FD.runLesson = function(el, o){
  var i = 0, ok = 0, steps = o.steps;
  function show(){
    var s = steps[i], ks = ["A", "B", "C", "D"];
    el.innerHTML = '<div class="lesson"><div class="quiz-top"><span class="pill">Step ' + (i + 1) + ' of ' + steps.length + '</span></div>' + FD.bar(i / steps.length * 100) + '<h3 class="h3">' + h(s.h) + '</h3><p class="lead">' + h(s.b) + '</p><div class="check"><p class="eyebrow">Quick check</p><p class="q-t sm-q" id="lq">' + h(s.q) + '</p><div class="opts" role="group" aria-labelledby="lq">' + s.o.map(function(t, k){ return '<button class="opt" data-k="' + k + '"><span class="opt-l">' + ks[k] + '</span><span>' + h(t) + '</span></button>'; }).join("") + '</div><div class="fb" id="lfb" role="status" aria-live="polite"></div></div></div>';
    FD.animate(el);
    FD.$$(".opt", el).forEach(function(b){ b.addEventListener("click", function(){
      var k = parseInt(b.getAttribute("data-k"), 10), right = k === s.a; if (right) ok++;
      FD.$$(".opt", el).forEach(function(x, n){ x.disabled = true; if (n === s.a) x.classList.add("right"); else if (n === k) x.classList.add("wrong"); });
      FD.$("#lfb", el).innerHTML = '<div class="fb-i ' + (right ? "ok" : "no") + '"><b>' + (right ? "Correct" : "Good try") + '</b><p>' + h(s.w) + '</p><button class="btn btn-primary" id="lnx">' + (i + 1 < steps.length ? "Next step" : "Finish") + FD.icon("arrow") + '</button></div>';
      var n = FD.$("#lnx", el); n.focus(); n.addEventListener("click", function(){ i++; if (i < steps.length) show(); else o.onDone(ok); });
    }); });
  }
  show();
};

/* Common activity completion panel. Returns html. */
FD.doneCard = function(o){
  return '<div class="done-card"><div class="done-ic">' + FD.icon("check") + '</div><h3 class="h3">' + h(o.title) + '</h3><p class="muted">' + h(o.text || "") + '</p>' + (o.gained ? '<div class="xp-earn pop">+' + o.gained + ' XP earned</div>' : o.repeat ? '<div class="xp-earn off">Already counted this week · practice only</div>' : "") + (o.extra || "") + '<div class="btn-row">' + (o.btns || "") + '</div></div>';
};
})();
