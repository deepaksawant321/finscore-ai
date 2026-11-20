/* Achievement center: level path, milestone unlocks, badges, history, prototype tools. XP is virtual and non-monetary. */
(function(){
var FD = window.FD, D = FD.D, h = FD.h, filter = "all";

function render(){
  var P = FD.P(), L = FD.level(), st = FD.stats(), earned = D.badges.filter(function(b){ return P.badges[b.id]; }).length;
  var list = D.badges.filter(function(b){ var e = !!P.badges[b.id]; return filter === "all" || (filter === "earned" ? e : !e); });
  var hist = P.hist.slice().sort(function(a, b){ return b.t - a.t; }).slice(0, 15);
  return '<div class="page-h"><div><p class="eyebrow">Achievement center</p><h1 class="h1">Progress you can see</h1><p class="muted">XP and badges reward meaningful learning and habits, never just opening the app. They have no cash value.</p></div></div>' +
  '<section class="hero ach-hero"><div class="ah-l">' + FD.ring(L.pct, { size: 150, stroke: 11, c1: "#fff", c2: "#B4F2DF", html: '<b class="big">' + L.n + '</b><span class="sm">' + h(L.name) + '</span>' }) + '<div><p class="eyebrow">Level ' + L.n + ' · ' + h(L.name) + '</p><p class="xp-big"><b data-count="' + P.xp + '">0</b> XP</p>' + (L.next ? '<p class="muted">' + (L.next.xp - P.xp) + ' XP to level ' + L.next.n + ' · ' + h(L.next.name) + '</p><p class="sm">Next unlock: ' + h(L.next.unlock) + '</p>' : '<p class="muted">Top level. Thank you for learning.</p>') + '</div></div><div class="ah-r"><div><b>' + earned + '/' + D.badges.length + '</b><span>badges</span></div><div><b>' + Object.keys(P.done).length + '</b><span>activities</span></div><div><b>' + FD.streak() + '</b><span>day streak</span></div></div></section>' +

  '<div class="sec-h"><h2 class="h2">Level path & milestone unlocks</h2></div><div class="levels">' + D.levels.map(function(l){ var reached = L.n >= l.n, cur = L.n === l.n; return '<div class="lv ' + (reached ? "got " : "") + (cur ? "cur" : "") + '"><span class="lv-n">' + (reached ? l.n : FD.icon("lock")) + '</span><div><b>' + h(l.name) + '</b><p class="sm muted">' + l.xp + ' XP · ' + h(l.unlock) + '</p></div>' + (cur ? '<span class="pill">You are here</span>' : "") + '</div>'; }).join("") + '</div>' +

  '<div class="sec-h"><h2 class="h2">Badges</h2><div class="chips" id="bf" role="group" aria-label="Filter badges">' + ["all", "earned", "locked"].map(function(f){ return '<button class="chip' + (filter === f ? " on" : "") + '" data-f="' + f + '" aria-pressed="' + (filter === f) + '">' + f[0].toUpperCase() + f.slice(1) + '</button>'; }).join("") + '</div></div>' +
  (list.length ? '<div class="grid g5 badges">' + list.map(function(b){ return '<button class="bt" data-b="' + b.id + '">' + FD.badgeTile(b, !!P.badges[b.id]) + '</button>'; }).join("") + '</div>' : FD.empty("trophy", filter === "earned" ? "No badges yet" : "Everything unlocked", filter === "earned" ? "Complete any activity to earn First Step." : "You've earned every badge. Impressive.")) +

  '<div class="sec-h"><h2 class="h2">Achievement history</h2></div><section class="card pad">' + (hist.length ? '<ul class="tl hist">' + hist.map(function(d){ return '<li><span class="tl-d ' + (d.kind === "badge" ? "bd" : "") + '">' + FD.icon(d.kind === "badge" ? "medal" : "check") + '</span><div class="sp"><b>' + h(d.title) + (d.kind === "badge" ? " · badge unlocked" : "") + '</b><p class="sm muted">' + new Date(d.t).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) + (d.seed ? " · demo history" : "") + '</p></div>' + (d.xp ? '<span class="pill gold">+' + d.xp + ' XP</span>' : "") + '</li>'; }).join("") + '</ul>' : FD.empty("trophy", "Your story starts here", "Finish an activity and it lands in your history.", '<a class="btn btn-primary" href="daily-activities.html">Try an activity</a>')) + '</section>' +

  '<details class="card pad tools"><summary>Prototype tools (not part of the product)</summary><p class="sm muted">Handy for testing XP, level-ups and badge logic. The real product would never offer this.</p><div class="btn-row left"><button class="btn btn-ghost btn-sm" id="dx">' + FD.icon("spark") + ' Add 50 demo XP</button><button class="btn btn-ghost btn-sm" id="dh">Clear demo history this week</button><button class="btn btn-ghost btn-sm" id="dr">' + FD.icon("refresh") + ' Reset this profile\'s progress</button><button class="btn btn-ghost btn-sm" id="da">Reset everything</button></div></details>';
}
function bind(root){
  FD.$$("#bf .chip", root).forEach(function(b){ b.addEventListener("click", function(){ filter = b.getAttribute("data-f"); FD.rerender(); }); });
  FD.$$("[data-b]", root).forEach(function(b){ b.addEventListener("click", function(){
    var bd = D.badges.filter(function(x){ return x.id === b.getAttribute("data-b"); })[0], got = FD.P().badges[bd.id], st = FD.stats(), cur = Math.min(st[bd.stat] || 0, bd.n);
    var m = FD.modal({ title: bd.name, cls: "celebrate", html: '<div class="cel"><div class="badge-big" style="' + (got ? "" : "filter:grayscale(1);opacity:.6") + '">' + FD.icon(got ? bd.icon : "lock") + '</div><h2 class="h2">' + h(bd.name) + '</h2><p class="muted">' + h(bd.desc) + '</p>' + (got ? '<span class="pill pos">Earned' + (got.seed ? " (demo history)" : "") + '</span>' : '<div class="bw">' + FD.bar(cur / bd.n * 100) + '<p class="sm muted">' + cur + ' of ' + bd.n + '</p></div>') + '<button class="btn btn-ghost" data-ok>Close</button></div>' });
    FD.$("[data-ok]", m.el).addEventListener("click", m.close);
  }); });
  FD.$("#dx", root).addEventListener("click", function(){ FD.award("demo:" + Date.now(), { xp: 50, title: "Demo XP boost", id: "demo" }); setTimeout(FD.rerender, 100); });
  FD.$("#dh", root).addEventListener("click", function(){ var P = FD.P(); Object.keys(P.done).forEach(function(k){ if (P.done[k].seed) delete P.done[k]; }); FD.save(); FD.toast("Seeded demo history cleared for this week", "ok"); FD.rerender(); });
  FD.$("#dr", root).addEventListener("click", function(){ FD.reset(); });
  FD.$("#da", root).addEventListener("click", function(){ FD.resetAll(); });
}
FD.page({ title: "Achievement Center", render: render, bind: bind, skel: 3 });
})();
