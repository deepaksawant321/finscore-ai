/* Weekly engagement: calendar, summary, achievement report, wellness progress, history, next-week plan, share. */
(function(){
var FD = window.FD, D = FD.D, h = FD.h;

function line(vals, labels, col){
  var W = 360, H = 150, pad = 24, mx = Math.max.apply(null, vals) + 4, mn = Math.min.apply(null, vals) - 4;
  function X(i){ return pad + i * (W - pad - 12) / (vals.length - 1); } function Y(v){ return 10 + (1 - (v - mn) / (mx - mn)) * (H - 40); }
  var pts = vals.map(function(v, i){ return X(i).toFixed(1) + "," + Y(v).toFixed(1); }).join(" ");
  return '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Wellness score over the last six weeks, from ' + vals[0] + ' to ' + vals[vals.length - 1] + '"><polygon points="' + X(0) + ',' + (H - 26) + ' ' + pts + ' ' + X(vals.length - 1) + ',' + (H - 26) + '" fill="' + col + '" opacity=".14"/><polyline points="' + pts + '" fill="none" stroke="' + col + '" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="draw"/>' + vals.map(function(v, i){ return '<circle cx="' + X(i) + '" cy="' + Y(v) + '" r="' + (i === vals.length - 1 ? 5 : 3.5) + '" fill="' + (i === vals.length - 1 ? col : "var(--card)") + '" stroke="' + col + '" stroke-width="2"/><text x="' + X(i) + '" y="' + (Y(v) - 10) + '" text-anchor="middle" font-size="10" font-weight="700" fill="var(--ink)">' + v + '</text><text x="' + X(i) + '" y="' + (H - 8) + '" text-anchor="middle" font-size="10" fill="var(--muted)">' + labels[i] + '</text>'; }).join("") + '</svg>';
}
function weekCardHTML(info){
  return '<div class="rep-card"><p class="eyebrow">Weekly report · ' + h(info.range) + '</p><h3 class="rep-h">' + h(info.name) + '\'s week</h3><div class="rep-g"><div><b>' + info.n + '</b><span>actions</span></div><div><b>' + info.xp + '</b><span>XP</span></div><div><b>' + info.days + '</b><span>active days</span></div><div><b>' + info.score + '</b><span>wellness</span></div></div><p class="rep-f">Finscore Daily Companion · simulated demo data</p></div>';
}

function render(){
  var pr = FD.profile(), P = FD.P(), wa = FD.weekAwards(), st = FD.stats(), dates = FD.weekDates(), t = FD.today(), w = FD.wellness(), tgt = 4;
  var wkStart = FD.wk(), badgesWk = D.badges.filter(function(b){ var x = P.badges[b.id]; return x && !x.seed && FD.wk(new Date(x.t)) === wkStart; });
  var hist = P.hist.slice().sort(function(a, b){ return b.t - a.t; }).slice(0, 12);
  var live = Object.keys(P.done).length;
  var weakDim = w.dims.slice().sort(function(a, b){ return a.v - b.v; })[0];
  var nxt = [
    { i: "target", t: P.focusNext ? "Your focus: " + P.focusNext : "Your focus: " + pr.focus, d: pr.focusWhy, href: "daily-activities.html?day=fri" },
    { i: "book", t: "Lift " + weakDim.label.toLowerCase(), d: "Your lowest wellness area is at " + weakDim.v + "/100. " + pr.learn[0].t + " is a gentle start.", href: pr.learn[0].mod ? "financial-journey.html?m=" + pr.learn[0].mod : pr.learn[0].href },
    { i: "brain", t: "Try " + D.cats[pr.quiz[0]] + " quizzes", d: "Suggested for a " + pr.tag.toLowerCase() + ". Aim for one round midweek.", href: "quiz-arena.html" }
  ];
  var range = FD.fmtDate(dates[0]) + " – " + FD.fmtDate(dates[6]);
  return '<div class="page-h"><div><p class="eyebrow">Weekly engagement · ' + range + '</p><h1 class="h1">Your week, at a glance</h1><p class="muted">What mattered, what you earned and what\'s next. No streak guilt.</p></div><button class="btn btn-primary" id="shw">' + FD.icon("share") + ' Share week</button></div>' +
  '<section class="grid g4 kpis" aria-label="Week summary">' +
   '<div class="card pad kpi">' + FD.ring(Math.min(100, st.activeDays / tgt * 100), { size: 92, stroke: 9, html: '<b class="kpi-n">' + st.activeDays + '/' + tgt + '</b>' }) + '<div><p class="eyebrow">Active days</p><p class="sm muted">Goal: ' + tgt + ' of 7. Rest days are healthy.</p></div></div>' +
   '<div class="card pad kpi2"><p class="eyebrow">Meaningful actions</p><b class="kpi-big" data-count="' + wa.n + '">0</b><p class="sm muted">Weekly Meaningful Financial Actions (WMFA)</p></div>' +
   '<div class="card pad kpi2"><p class="eyebrow">XP this week</p><b class="kpi-big" data-count="' + wa.xp + '">0</b><p class="sm muted">Virtual · never money</p></div>' +
   '<div class="card pad kpi2"><p class="eyebrow">Current streak</p><b class="kpi-big">' + FD.streak() + '<small> days</small></b><p class="sm muted">' + (FD.streak() ? "Keep it gentle." : "Start any day.") + '</p></div></section>' +

  '<div class="sec-h"><h2 class="h2">Weekly calendar</h2><span class="sm muted">Tap any day to explore it</span></div>' +
  '<div class="week-cal">' + D.days.map(function(d, i){ var dt = dates[i], done = FD.dayDone(d.id), isT = FD.ymd(dt) === t, past = FD.ymd(dt) < t, seed = P.done[wkStart && ("a:" + wkStart + ":" + d.id)] && P.done["a:" + wkStart + ":" + d.id].seed;
    return '<a class="card wc ' + (done ? "done " : "") + (isT ? "today" : "") + '" href="daily-activities.html?day=' + d.id + '"><div class="row between"><span class="wc-d">' + d.short + ' ' + dt.getDate() + '</span>' + (isT ? '<span class="pill">Today</span>' : done ? '<span class="pill pos">' + FD.icon("check") + '</span>' : "") + '</div><span class="wc-ic">' + FD.icon(d.icon) + '</span><b>' + d.name + '</b><span class="sm muted">' + d.sub + '</span><span class="sm ' + (done ? "okc" : "muted") + '">' + (done ? (seed ? "Done (demo history)" : "Completed") : past ? "Open to catch up" : isT ? "Ready for you" : "Coming up") + '</span></a>'; }).join("") + '</div>' +

  '<div class="grid gh mt2"><section class="card pad"><div class="row between"><h2 class="h2">Weekly activity summary</h2><span class="pill">' + wa.n + ' this week</span></div>' +
   (wa.list.length ? '<ul class="tl">' + wa.list.sort(function(a, b){ return b.t - a.t; }).map(function(d){ return '<li><span class="tl-d">' + FD.icon("check") + '</span><div class="sp"><b>' + h(d.title) + '</b><p class="sm muted">' + new Date(d.t).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }) + '</p></div><span class="pill gold">+' + d.xp + ' XP</span></li>'; }).join("") + '</ul>' : FD.empty("empty", "A fresh week", "No activities yet this week. Today's takes about " + FD.todayDay().mins + " minutes.", '<a class="btn btn-primary" href="daily-activities.html?day=' + FD.todayDay().id + '">Start ' + FD.todayDay().name + '</a>')) + '</section>' +
   '<section class="card pad"><div class="row between"><h2 class="h2">Achievement report</h2></div>' + FD.levelCard() +
   '<p class="eyebrow mt">Badges earned this week</p>' + (badgesWk.length ? '<div class="mini-row">' + badgesWk.map(function(b){ return '<span class="mini-b got" title="' + h(b.name) + '">' + FD.icon(b.icon) + '</span>'; }).join("") + '</div><p class="sm muted">' + badgesWk.map(function(b){ return h(b.name); }).join(", ") + '</p>' : '<p class="sm muted">None yet. ' + (live ? "Your next badge is close." : "Your first action unlocks First Step.") + '</p>') + '<a class="btn btn-ghost btn-sm mt" href="achievement-center.html">Open achievements</a></section></div>' +

  '<div class="grid g2 mt2"><section class="card pad"><div class="row between"><h2 class="h2">Financial wellness progress</h2>' + FD.simTag() + '</div><p class="muted sm">Last six weeks. Current: <b>' + w.score + '</b> (' + w.band + ')</p>' + (P.fresh ? '<p class="muted sm">Your six-week trend will appear after your first full week.</p>' : line(w.trend, ["W-5", "W-4", "W-3", "W-2", "W-1", "Now"], "var(--brand)")) +
   '<div class="dims">' + w.dims.map(function(d){ return '<div class="dim"><span class="sm">' + h(d.label) + '</span>' + FD.bar(d.v) + '<b class="sm">' + d.v + '</b></div>'; }).join("") + '</div></section>' +
   '<section class="card pad"><h2 class="h2">Next week\'s recommendations</h2><p class="muted sm">Based on your profile and this week</p><div class="rec-l">' + nxt.map(function(n){ return '<a class="rec" href="' + n.href + '"><span class="ins-ic">' + FD.icon(n.i) + '</span><div class="sp"><b>' + h(n.t) + '</b><p class="sm muted">' + h(n.d) + '</p></div>' + FD.icon("chev") + '</a>'; }).join("") + '</div></section></div>' +

  '<section class="card pad mt2"><div class="row between"><h2 class="h2">Completed activity history</h2><span class="sm muted">Most recent first · "demo" = simulated earlier history</span></div>' +
   (hist.length ? '<ul class="tl hist">' + hist.map(function(d){ return '<li><span class="tl-d ' + (d.kind === "badge" ? "bd" : "") + '">' + FD.icon(d.kind === "badge" ? "medal" : "check") + '</span><div class="sp"><b>' + h(d.title) + (d.kind === "badge" ? " (badge)" : "") + '</b><p class="sm muted">' + new Date(d.t).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) + (d.seed ? " · demo" : "") + '</p></div>' + (d.xp ? '<span class="pill gold">+' + d.xp + ' XP</span>' : "") + '</li>'; }).join("") + '</ul>' : FD.empty("trophy", "No history yet", "Complete an activity and it will appear here.")) + '</section>';
}

function bind(root){
  FD.$("#shw", root).addEventListener("click", function(){
    var pr = FD.profile(), wa = FD.weekAwards(), dates = FD.weekDates(), info = { name: pr.first, n: wa.n, xp: wa.xp, days: FD.stats().activeDays, score: FD.wellness().score, range: FD.fmtDate(dates[0]) + " – " + FD.fmtDate(dates[6]) };
    FD.share({ title: "your week", card: weekCardHTML(info), text: "My Finscore week (simulated demo): " + info.n + " actions, " + info.xp + " XP, " + info.days + " active days, wellness " + info.score + "." });
  });
}
FD.weekCardHTML = weekCardHTML;
FD.page({ title: "Weekly Engagement", render: render, bind: bind, skel: 3 });
})();
