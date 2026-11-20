/* Finscore Daily Engagement (Prototype V3) — ALL DATA IS SIMULATED DUMMY DATA.
   No real users, balances, scores or APIs. Mirror of /data/*.json (browsers block fetch() on file://). */
window.FD_DATA = {
meta: { simulated: true, version: "V3", note: "Every number here is dummy data for design exploration. Scores are simulated and are not an official FinScore." },

levels: [
  { n: 1, name: "Starter",    xp: 0,    unlock: "Daily activities, Fin the companion" },
  { n: 2, name: "Saver",      xp: 100,  unlock: "Bonus Spin & Learn topics" },
  { n: 3, name: "Builder",    xp: 250,  unlock: "Advanced simulator scenario: The Lost Decade" },
  { n: 4, name: "Planner",    xp: 450,  unlock: "Financial personality deep-dive card" },
  { n: 5, name: "Investor",   xp: 700,  unlock: "Plus preview: Insight Deep-Dive (simulated)" },
  { n: 6, name: "Strategist", xp: 1000, unlock: "Strategist title and gold ring" },
  { n: 7, name: "Master",     xp: 1400, unlock: "Master title, all unlocks" }
],

/* Reward table. XP is virtual and non-monetary. Awarded once per activity per week (or per day for quizzes). */
rewards: { learn: 10, quiz: 20, goal: 15, habit: 15, weekly: 30, journey: 50 },

days: [
  { id: "mon", dow: 1, short: "Mon", name: "Money Monday",            sub: "Financial health review",     icon: "heart",  xp: 15, type: "habit",  mins: 3, blurb: "Four honest yes/no checks on this week's money habits, with a tailored tip." },
  { id: "tue", dow: 2, short: "Tue", name: "Trivia Tuesday",          sub: "Financial knowledge quiz",    icon: "brain",  xp: 20, type: "quiz",   mins: 4, blurb: "Five questions picked for your profile. Learn from every answer." },
  { id: "wed", dow: 3, short: "Wed", name: "Wealth Wednesday",        sub: "Investment education",        icon: "trend",  xp: 10, type: "learn",  mins: 5, blurb: "A short lesson, then a virtual-money simulator. Simulated, never advice." },
  { id: "thu", dow: 4, short: "Thu", name: "Think Smart Thursday",    sub: "AI financial challenge",      icon: "bolt",   xp: 15, type: "habit",  mins: 3, blurb: "Fin gives you a real-life money decision. Choose, then compare thinking." },
  { id: "fri", dow: 5, short: "Fri", name: "Financial Freedom Friday",sub: "Financial goal review",       icon: "target", xp: 15, type: "goal",   mins: 3, blurb: "Check goal progress, nudge a goal forward and set one intention." },
  { id: "sat", dow: 6, short: "Sat", name: "Smart Saturday",          sub: "Interactive learning games",  icon: "dice",   xp: 10, type: "learn",  mins: 6, blurb: "Spin & Learn, knowledge cards and a savings challenge. Play any, in any order." },
  { id: "sun", dow: 0, short: "Sun", name: "Sunday Review",           sub: "Weekly progress and wins",    icon: "flag",   xp: 30, type: "weekly", mins: 3, blurb: "See your week, name a win and choose one focus for next week." }
],

/* Declarative badges. stat names are computed by core.js (FD.stats). */
badges: [
  { id: "first-step",  name: "First Step",       icon: "footprint", stat: "activities",  n: 1,  desc: "Complete your first activity" },
  { id: "quiz-whiz",   name: "Quiz Whiz",        icon: "brain",     stat: "quizzes",     n: 3,  desc: "Finish 3 quiz rounds" },
  { id: "sharp-mind",  name: "Sharp Mind",       icon: "star",      stat: "perfectQuiz", n: 1,  desc: "Score 100% in a quiz round" },
  { id: "curious",     name: "Curious Mind",     icon: "book",      stat: "cards",       n: 6,  desc: "Read 6 knowledge cards" },
  { id: "spinner",     name: "Spin Scholar",     icon: "dice",      stat: "spins",       n: 2,  desc: "Learn from 2 spins" },
  { id: "saver",       name: "Smart Saver",      icon: "coins",     stat: "savingsGames",n: 1,  desc: "Complete the savings challenge" },
  { id: "goal-getter", name: "Goal Getter",      icon: "target",    stat: "goalReviews", n: 1,  desc: "Complete a goal review" },
  { id: "health",      name: "Habit Checker",    icon: "heart",     stat: "healthChecks",n: 1,  desc: "Finish a financial health review" },
  { id: "thinker",     name: "Smart Thinker",    icon: "bolt",      stat: "challenges",  n: 1,  desc: "Take on an AI financial challenge" },
  { id: "explorer",    name: "Portfolio Explorer",icon: "trend",    stat: "sims",        n: 1,  desc: "Run the investment simulator" },
  { id: "know-self",   name: "Know Yourself",    icon: "user",      stat: "personality", n: 1,  desc: "Discover your financial personality" },
  { id: "week-warrior",name: "Week Warrior",     icon: "flame",     stat: "activeDays",  n: 4,  desc: "Be active on 4 days in one week" },
  { id: "sunday-sage", name: "Sunday Sage",      icon: "flag",      stat: "weeklyReviews",n: 1, desc: "Complete a Sunday review" },
  { id: "pathfinder",  name: "Pathfinder",       icon: "map",       stat: "journeyModules",n: 3,desc: "Complete 3 journey modules" },
  { id: "journey-end", name: "Journey Complete", icon: "medal",     stat: "journeyDone", n: 1,  desc: "Finish the whole learning journey" },
  { id: "storyteller", name: "Storyteller",      icon: "share",     stat: "shares",      n: 1,  desc: "Share a report (simulated)" },
  { id: "wrapped",     name: "Looking Back",     icon: "gift",      stat: "wrappedViews",n: 1,  desc: "Watch your Monthly Wrapped" },
  { id: "level-3",     name: "Builder",          icon: "rocket",    stat: "level",       n: 3,  desc: "Reach level 3" },
  { id: "level-5",     name: "Investor",         icon: "crown",     stat: "level",       n: 5,  desc: "Reach level 5" }
],

products: [
  { id: "score",   name: "FinScore Check",     d: "Your simulated score and drivers", icon: "gauge",  href: "financial-journey.html" },
  { id: "goals",   name: "Goal Planner",       d: "Plan and track goals",             icon: "target", href: "financial-journey.html#goals" },
  { id: "wealth",  name: "Wealth Learning",    d: "Investment basics, simulated",     icon: "trend",  href: "daily-activities.html?day=wed" },
  { id: "protect", name: "Protection Check",   d: "Insurance adequacy basics",        icon: "shield", href: "financial-journey.html?m=protect" },
  { id: "credit",  name: "Debt & Credit",      d: "Smarter repayment thinking",       icon: "card",   href: "financial-journey.html?m=debt" },
  { id: "reports", name: "Reports",            d: "Weekly and monthly summaries",     icon: "chart",  href: "weekly-engagement.html" }
],

profiles: [
 { id: "beginner", first: "Aarav", name: "Aarav Mehta", age: 22, tag: "Financial Beginner", blurb: "First job, building basic habits", emoji: "A",
   hue: 175, income: 26000, saveBase: 1500, seedXP: 85, seedStreak: [1,2], seedWeek: [], prev: 41, trend: [33,35,37,38,41,44],
   dims: { spend: 52, save: 38, safety: 22, debt: 82, goals: 32, learn: 30 },
   dimLabels: ["Spending control","Saving habit","Safety net","Debt health","Goal progress","Money know-how"],
   greeting: "Let's make money feel simple.", ai: "You're just getting started, and that's a great place to be. One small habit beats a big plan you never start. Today, try a 3-minute check on where your money goes.",
   focus: "Build your first safety net", focusWhy: "Your cushion covers about 0.8 months of essentials. Even ₹500 a week moves it forward.",
   quiz: ["basics","saving"], journeyNext: ["basics","budget"], thu: "thu-beginner", wed: "Where does money grow?", sat: "Needs vs wants",
   goals: [
     { id: "g1", name: "Emergency cushion", icon: "shield", target: 60000, saved: 18000, due: "Mar 2027", monthly: 3000 },
     { id: "g2", name: "Laptop upgrade", icon: "spark", target: 55000, saved: 12000, due: "Sep 2027", monthly: 2200 } ],
   insights: [
     { i: "shield", t: "Safety net: 0.8 months", d: "A first target of 1 month of essentials is within reach in about 5 months at your current pace.", tone: "warn" },
     { i: "coins", t: "Small, regular beats big, rare", d: "₹250 a week set aside adds up to ₹13,000 in a year. Consistency matters more than size.", tone: "pos" },
     { i: "book", t: "Money know-how is your fastest win", d: "Two short lessons this week would lift your know-how most.", tone: "ai" },
     { i: "card", t: "No debt pressure", d: "Your debt health is strong. Keep it that way as you add goals.", tone: "pos" } ],
   learn: [ { t: "Budget basics: 50/30/20", d: "A starter framework for any income.", mod: "budget" }, { t: "Why an emergency fund first?", d: "The foundation under every goal.", mod: "safety" }, { t: "Needs vs wants game", d: "Play on Smart Saturday.", href: "daily-activities.html?day=sat" } ],
   monthly: { acts: 11, quiz: 3, sav: 3200, scoreFrom: 38, scoreTo: 44, days: 12, topSkill: "Saving habit" },
   past: [ [9,"mon","Financial health review",15], [8,"tue","Trivia round",20], [7,"sat","Spin & Learn",10] ] },

 { id: "young", first: "Meera", name: "Meera Kapoor", age: 27, tag: "Young Professional", blurb: "Rising income, first investments", emoji: "M",
   hue: 190, income: 78000, saveBase: 6000, seedXP: 240, seedStreak: [1,2,3,5], seedWeek: [],  prev: 59, trend: [52,54,55,57,59,62],
   dims: { spend: 64, save: 61, safety: 55, debt: 74, goals: 58, learn: 62 },
   dimLabels: ["Spending control","Saving habit","Safety net","Debt health","Goal progress","Money know-how"],
   greeting: "Your money is working as hard as you are.", ai: "Your income is growing, so now is the moment to automate. Moving savings on payday, before you can spend it, is the habit that compounds most.",
   focus: "Automate your savings", focusWhy: "A fixed transfer on payday removes the monthly willpower test.",
   quiz: ["saving","investing"], journeyNext: ["invest","safety"], thu: "thu-young", wed: "Start with SIP thinking", sat: "Lifestyle creep",
   goals: [
     { id: "g1", name: "Emergency fund (6 months)", icon: "shield", target: 240000, saved: 132000, due: "Jun 2027", monthly: 9000 },
     { id: "g2", name: "Europe trip", icon: "plane", target: 180000, saved: 64000, due: "May 2027", monthly: 8000 },
     { id: "g3", name: "Start a monthly SIP", icon: "trend", target: 60000, saved: 24000, due: "Dec 2027", monthly: 4000 } ],
   insights: [
     { i: "trend", t: "Savings rate: 21%", d: "You save about ₹16,000 a month. Guidance for early careers is 20% or more, so you're on track.", tone: "pos" },
     { i: "shield", t: "Safety net at 3.3 of 6 months", d: "Finishing the emergency fund before raising risk is the sturdier order.", tone: "warn" },
     { i: "sparkle", t: "Lifestyle creep watch", d: "Subscriptions grew in your simulated spend pattern. A 10-minute review can reclaim some.", tone: "ai" },
     { i: "book", t: "Ready for investing basics", d: "Your know-how score says you'd enjoy the Wealth Wednesday lessons.", tone: "ai" } ],
   learn: [ { t: "How SIPs smooth the ride", d: "Rupee-cost averaging, explained simply.", mod: "invest" }, { t: "Emergency fund sizing", d: "Is 6 months right for you?", mod: "safety" }, { t: "Lifestyle creep game", d: "Play on Smart Saturday.", href: "daily-activities.html?day=sat" } ],
   monthly: { acts: 19, quiz: 5, sav: 16000, scoreFrom: 57, scoreTo: 62, days: 17, topSkill: "Money know-how" },
   past: [ [10,"wed","Investment lesson",10], [9,"tue","Trivia round",20], [8,"mon","Financial health review",15], [7,"fri","Goal review",15] ] },

 { id: "investor", first: "Rohan", name: "Rohan Shah", age: 34, tag: "Active Investor", blurb: "Experienced, wants sharper decisions", emoji: "R",
   hue: 160, income: 165000, saveBase: 40000, seedXP: 560, seedStreak: [1,2,3,4,6], seedWeek: [], prev: 72, trend: [66,68,69,71,72,75],
   dims: { spend: 70, save: 78, safety: 74, debt: 80, goals: 71, learn: 77 },
   dimLabels: ["Spending control","Saving rate","Safety net","Debt health","Goal progress","Market know-how"],
   greeting: "Sharper decisions, calmer mind.", ai: "Your discipline is strong. The next gain isn't more activity, it's better process: a written rebalancing rule beats reacting to headlines.",
   focus: "Write a rebalancing rule", focusWhy: "Your simulated equity share drifted from target. A rule turns emotion into a checklist.",
   quiz: ["investing","protection"], journeyNext: ["invest","goals"], thu: "thu-investor", wed: "Risk, return and drawdowns", sat: "Behavioural traps",
   goals: [
     { id: "g1", name: "Retirement corpus (age 55)", icon: "sun", target: 30000000, saved: 8200000, due: "2047", monthly: 60000 },
     { id: "g2", name: "Rebalance to target mix", icon: "scale", target: 100, saved: 64, due: "This quarter", monthly: 0, unit: "%" },
     { id: "g3", name: "Overseas learning fund", icon: "globe", target: 500000, saved: 310000, due: "Mar 2027", monthly: 20000 } ],
   insights: [
     { i: "scale", t: "Allocation drift: equity +8 pts", d: "Your simulated mix drifted above target after a strong run. Decide your rule before you decide with emotion.", tone: "warn" },
     { i: "shield", t: "Protection looks solid", d: "Term cover is about 14x income in this demo. A yearly review is all that's needed.", tone: "pos" },
     { i: "brain", t: "Behavioural watch: recency bias", d: "Recent winners feel safer than they are. Today's challenge tests this.", tone: "ai" },
     { i: "chart", t: "Fees compound too", d: "A 0.8% fee difference over 25 years is a large number. Compare costs, not just returns.", tone: "ai" } ],
   learn: [ { t: "Drawdowns and recovery maths", d: "A 50% fall needs a 100% rise.", mod: "invest" }, { t: "Behavioural traps game", d: "Play on Smart Saturday.", href: "daily-activities.html?day=sat" }, { t: "Goal-based asset allocation", d: "Match risk to time horizon.", mod: "goals" } ],
   monthly: { acts: 24, quiz: 7, sav: 42000, scoreFrom: 70, scoreTo: 75, days: 22, topSkill: "Market know-how" },
   past: [ [10,"thu","AI challenge",15], [9,"wed","Investment lesson",10], [8,"tue","Trivia round",20], [7,"sun","Weekly review",30] ] },

 { id: "family", first: "Neha", name: "Neha Iyer", age: 38, tag: "Family Financial Planner", blurb: "Two kids, a home loan, many priorities", emoji: "N",
   hue: 150, income: 190000, saveBase: 22000, seedXP: 330, seedStreak: [1,2,4,5], seedWeek: [], prev: 55, trend: [49,50,52,53,55,57],
   dims: { spend: 58, save: 56, safety: 61, debt: 48, goals: 62, learn: 54 },
   dimLabels: ["Household budget","Saving habit","Safety net","Debt health","Goal progress","Money know-how"],
   greeting: "A calm plan for the people you love.", ai: "Your household carries a lot at once. We'll take it one priority at a time: protection first, then the home loan, then the education fund.",
   focus: "Check family protection", focusWhy: "With dependants and a home loan, adequate term cover is the plan's backstop.",
   quiz: ["protection","saving"], journeyNext: ["protect","debt"], thu: "thu-family", wed: "Funding long-term goals", sat: "Household budgeting",
   goals: [
     { id: "g1", name: "Child education fund", icon: "cap", target: 2500000, saved: 780000, due: "2036", monthly: 15000 },
     { id: "g2", name: "Home loan prepayment", icon: "home", target: 500000, saved: 140000, due: "Dec 2028", monthly: 8000 },
     { id: "g3", name: "Term cover review", icon: "shield", target: 100, saved: 40, due: "This month", monthly: 0, unit: "%" } ],
   insights: [
     { i: "card", t: "EMI is 34% of income", d: "The common comfort zone is under 40%. Prepaying small amounts early saves interest.", tone: "warn" },
     { i: "shield", t: "Cover check due", d: "Review whether term cover is enough for your loan and your children's goals.", tone: "warn" },
     { i: "cap", t: "Education fund 31% funded", d: "Long horizon helps. A small yearly step-up matters more than a big one-off.", tone: "pos" },
     { i: "family", t: "Share the plan", d: "Households that review money together tend to follow through. Try Friday's review as a family.", tone: "ai" } ],
   learn: [ { t: "Term insurance made simple", d: "How much cover and why.", mod: "protect" }, { t: "Prepay or invest?", d: "A thinking framework for the loan.", mod: "debt" }, { t: "Household budgeting game", d: "Play on Smart Saturday.", href: "daily-activities.html?day=sat" } ],
   monthly: { acts: 15, quiz: 4, sav: 22000, scoreFrom: 53, scoreTo: 57, days: 14, topSkill: "Goal progress" },
   past: [ [10,"fri","Goal review",15], [9,"mon","Financial health review",15], [8,"sat","Savings challenge",15] ] },

 { id: "saver", first: "Karan", name: "Karan Verma", age: 30, tag: "Goal-Oriented Saver", blurb: "Disciplined, saving for big milestones", emoji: "K",
   hue: 168, income: 105000, saveBase: 30000, seedXP: 430, seedStreak: [1,2,3,4,5,6], seedWeek: [], prev: 66, trend: [58,60,62,63,66,69],
   dims: { spend: 77, save: 84, safety: 66, debt: 70, goals: 72, learn: 49 },
   dimLabels: ["Spending control","Saving rate","Safety net","Debt health","Goal progress","Money know-how"],
   greeting: "Every rupee has a job. Good job.", ai: "Your saving discipline is excellent. The question now is where savings should live: short goals want safety, long goals can accept some growth risk.",
   focus: "Match savings to timelines", focusWhy: "Your down payment is 2 years away. That horizon favours stability over chasing returns.",
   quiz: ["saving","investing"], journeyNext: ["goals","invest"], thu: "thu-saver", wed: "Where should goal money live?", sat: "Savings challenge",
   goals: [
     { id: "g1", name: "Home down payment", icon: "home", target: 1800000, saved: 1120000, due: "Nov 2028", monthly: 35000 },
     { id: "g2", name: "Wedding fund", icon: "heart", target: 900000, saved: 410000, due: "Feb 2028", monthly: 18000 },
     { id: "g3", name: "Japan vacation", icon: "plane", target: 250000, saved: 168000, due: "Apr 2027", monthly: 9000 } ],
   insights: [
     { i: "target", t: "Down payment 62% funded", d: "At ₹35,000 a month you finish about 4 months early.", tone: "pos" },
     { i: "scale", t: "Timeline mismatch to review", d: "Money needed within 2 years usually belongs in stable options. Review what each goal uses.", tone: "warn" },
     { i: "book", t: "Know-how lags saving", d: "Your habits are ahead of your investing knowledge. Two lessons will close the gap.", tone: "ai" },
     { i: "flame", t: "Streak strength: 6 active days", d: "Your consistency is your edge. Keep goals visible.", tone: "pos" } ],
   learn: [ { t: "Goal-based buckets", d: "Short, medium and long horizons.", mod: "goals" }, { t: "Inflation and idle cash", d: "Why saving isn't the end of the story.", mod: "invest" }, { t: "Savings challenge", d: "Play on Smart Saturday.", href: "daily-activities.html?day=sat" } ],
   monthly: { acts: 21, quiz: 4, sav: 30000, scoreFrom: 64, scoreTo: 69, days: 20, topSkill: "Saving rate" },
   past: [ [10,"fri","Goal review",15], [9,"sat","Spin & Learn",10], [8,"thu","AI challenge",15], [7,"sun","Weekly review",30] ] }
]
};
