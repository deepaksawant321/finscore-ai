/* Prototype entry: profile picker, map of screens, the daily-return loop. */
(function(){
var FD = window.FD, D = FD.D, h = FD.h;
var PAGES = [
 ["companion-home.html", "Companion Home", "home", "Greeting, Fin, wellness score, today's activity, challenge, quiz of the day, week, XP, goals, insights."],
 ["daily-activities.html", "Daily Activities", "bolt", "Money Monday to Sunday Review. Quiz, simulator, AI challenge, goal review, games."],
 ["weekly-engagement.html", "Weekly Engagement", "calendar", "Calendar, summary, achievement report, wellness trend, history, next week."],
 ["ai-companion.html", "AI Companion", "chat", "Scripted chat with Fin, suggestions, insights and goal guidance."],
 ["quiz-arena.html", "Quiz Arena", "brain", "Daily quiz and category rounds by difficulty with an optional timer."],
 ["financial-journey.html", "Financial Journey", "map", "Learning path, goals and planner, financial personality test."],
 ["achievement-center.html", "Achievement Center", "trophy", "Levels, milestone unlocks, badges and history."],
 ["monthly-wrapped.html", "Monthly Wrapped", "gift", "Story-format monthly recap with a shareable card."]
];
function render(){
  var cur = FD.profile();
  return '<section class="hero ix-hero"><div class="ix-l"><p class="eyebrow">Prototype V3 · Daily engagement</p><h1 class="h1">Does Finscore give you a reason to return tomorrow?</h1><p class="lead muted">An AI-powered personal financial companion: a small, useful, enjoyable thing to do every day, for every kind of user. Even with no investments at all.</p><div class="btn-row left"><a class="btn btn-light" href="companion-home.html">' + FD.icon("play") + ' Enter the companion</a><a class="btn btn-hero-ghost" href="daily-activities.html">Try today\'s activity</a><a class="btn btn-hero-ghost" href="onboarding.html">' + FD.icon("sparkle") + ' New here? Start the welcome</a></div><div class="fin-row">' + FD.fin(60, "cheer") + '<p class="sm">Everything here is simulated: dummy profiles, scripted AI, virtual XP. No accounts, APIs or advice.</p></div></div><div class="hero-art" aria-hidden="true">' + FD.illo("hero") + '</div></section>' +
  '<div class="sec-h"><h2 class="h2">1 · Pick a demo profile</h2><span class="sm muted">Greeting, wellness, challenges, goals, insights and learning all adapt</span></div><div class="grid g5 profs">' + D.profiles.map(function(p){ return '<button class="card pad hover pcard ' + (p.id === cur.id ? "on" : "") + '" data-p="' + p.id + '" aria-pressed="' + (p.id === cur.id) + '"><span class="av lg" style="--h:' + p.hue + '">' + p.emoji + '</span><b>' + h(p.tag) + '</b><span class="sm muted">' + h(p.name) + ', ' + p.age + '</span><span class="sm">' + h(p.blurb) + '</span>' + (p.id === cur.id ? '<span class="pill pos">' + FD.icon("check") + ' Selected</span>' : "") + '</button>'; }).join("") + '</div>' +
  '<div class="sec-h"><h2 class="h2">2 · Explore the screens</h2></div><div class="grid g4 map">' + PAGES.map(function(p, i){ return '<a class="card pad hover mp" href="' + p[0] + '"><span class="mp-n">' + (i + 1) + '</span><span class="ins-ic">' + FD.icon(p[2]) + '</span><h3 class="h3">' + p[1] + '</h3><p class="sm muted">' + p[3] + '</p></a>'; }).join("") + '</div>' +
  '<div class="sec-h"><h2 class="h2">3 · The daily-return loop</h2></div><div class="grid g4 loop">' + [["spark", "A reason today", "One recommended activity, picked for you, ~3 minutes."], ["bolt", "Instant reward", "XP, a badge or an insight right after, never for just opening."], ["target", "Visible progress", "Goals, wellness and streaks you can see moving."], ["calendar", "A reason tomorrow", "A different activity every day, plus Fin's note for what's next."]].map(function(l, i){ return '<div class="card pad lp"><span class="lp-n">' + (i + 1) + '</span><span class="ins-ic">' + FD.icon(l[0]) + '</span><h3 class="h3">' + l[1] + '</h3><p class="sm muted">' + l[2] + '</p></div>'; }).join("") + '</div>' +
  '<aside class="card pad soft ix-note"><h3 class="h3">Using the prototype</h3><ul class="bul"><li>Switch profile and theme in the top bar; everything updates.</li><li>Any day\'s activity is open any time. Nothing is compulsory.</li><li>XP is earned once per activity each week. Repeats are practice.</li><li>Use Achievement Center → Prototype tools to test level-ups quickly.</li></ul></aside>';
}
function bind(root){
  FD.$$("[data-p]", root).forEach(function(b){ b.addEventListener("click", function(){ FD.setProfile(b.getAttribute("data-p")); }); });
}
FD.page({ title: "Welcome", render: render, bind: bind, skel: 2 });
})();
