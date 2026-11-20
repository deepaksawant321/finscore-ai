/* Finscore V2 prototype — ALL DATA IS SIMULATED DUMMY DATA. No real users, no APIs.
   This file is the loadable mirror of /data/*.json (browsers block fetch() on file://). */
window.FS_DATA = {
meta: { simulated: true, note: "Every number in this prototype is dummy data for design exploration. Scores are SIMULATED and not an official FinScore." },

stages: [
  { n: 1, name: "Dependency", nick: "The Starter", lo: 300, hi: 374 },
  { n: 2, name: "Survival", nick: "The Stabiliser", lo: 375, hi: 449 },
  { n: 3, name: "Security", nick: "The Protector", lo: 450, hi: 524 },
  { n: 4, name: "Stability", nick: "The Balancer", lo: 525, hi: 599 },
  { n: 5, name: "Accumulation", nick: "The Builder", lo: 600, hi: 674 },
  { n: 6, name: "Independence", nick: "The Accelerator", lo: 675, hi: 749 },
  { n: 7, name: "Freedom", nick: "The Liberator", lo: 750, hi: 824 },
  { n: 8, name: "Abundance", nick: "The Legacy Maker", lo: 825, hi: 900 }
],

levels: ["Starter", "Saver", "Builder", "Planner", "Investor", "Strategist", "Master"],

profiles: [
 { id: "beginner", name: "Aarav Mehta", first: "Aarav", age: 22, tag: "Financial Beginner", blurb: "First job, building basic habits",
   hue: 175, income: 26000, expenses: 22400, emi: 0, score: 468, prev: 441, history: [412, 420, 431, 436, 441, 468],
   dims: { savings: [38, 33], debt: [82, 82], invest: [12, 8], protection: [20, 20], goals: [32, 26], emergency: [22, 15] },
   emMonths: 0.8, alloc: { equity: 0, debt: 15, gold: 0, cash: 85 }, retireAge: 60,
   goals: [
     { id: "g1", name: "Emergency cushion", icon: "shield", target: 60000, saved: 18000, due: "Mar 2027", monthly: 3000 },
     { id: "g2", name: "Laptop upgrade", icon: "spark", target: 55000, saved: 12000, due: "Sep 2027", monthly: 2200 }
   ],
   xp: 140, streak: 3, activity: "d-lesson", baseBadges: ["b-first"],
   line: "You're making progress. Let's take one small financial step today.",
   ai: { msg: "Hi Aarav! You've started building an emergency cushion — ₹18,000 so far, about 30% of your first target. Today, let's spend one minute on a simple idea: the difference between needs and wants. Small, no pressure.", quick: ["Sounds good", "Show me the lesson", "Why does this matter?"] },
   focus: "build a first emergency cushion of one month's expenses", learn: ["Needs vs wants", "What is an emergency fund?", "How SIPs work (concept)"],
   actions: [{ t: "Move ₹1,500 to your emergency goal after salary day", pts: 14, mins: 2 }, { t: "Complete the needs-vs-wants lesson", pts: 6, mins: 1 }, { t: "Add a basic health-cover review to your list", pts: 9, mins: 5 }] },

 { id: "young", name: "Meera Iyer", first: "Meera", age: 27, tag: "Young Professional", blurb: "Growing income, education loan, first investments",
   hue: 200, income: 95000, expenses: 58000, emi: 9500, score: 596, prev: 571, history: [548, 556, 560, 566, 571, 596],
   dims: { savings: [62, 55], debt: [55, 52], invest: [48, 44], protection: [40, 40], goals: [52, 47], emergency: [50, 46] },
   emMonths: 1.9, alloc: { equity: 40, debt: 20, gold: 5, cash: 35 }, retireAge: 60,
   goals: [
     { id: "g1", name: "Emergency fund (6 months)", icon: "shield", target: 360000, saved: 180000, due: "Jun 2027", monthly: 15000 },
     { id: "g2", name: "Japan trip", icon: "compass", target: 200000, saved: 90000, due: "Apr 2027", monthly: 8000 },
     { id: "g3", name: "Home down payment", icon: "house", target: 1500000, saved: 240000, due: "2031", monthly: 20000 }
   ],
   xp: 410, streak: 9, activity: "d-save", baseBadges: ["b-first", "b-streak3", "b-learner"],
   line: "Welcome back! Let's make your money work smarter.",
   ai: { msg: "Good to see you, Meera. Your simulated score rose 25 points this month — mostly from steadier savings. Your emergency fund covers about 1.9 months of expenses; a 2-minute savings challenge could help close that gap sooner.", quick: ["Start the challenge", "Explain the score change", "What should I focus on?"] },
   focus: "lift emergency cover from about 2 to 3 months while the education loan stays on schedule", learn: ["Emergency fund sizing", "Good debt vs costly debt", "Diversification basics"],
   actions: [{ t: "Automate ₹5,000 more into your emergency goal", pts: 18, mins: 3 }, { t: "Review your term-cover need (concept check)", pts: 12, mins: 6 }, { t: "Complete the savings micro-challenge", pts: 8, mins: 2 }] },

 { id: "investor", name: "Rohan Kapoor", first: "Rohan", age: 36, tag: "Active Investor", blurb: "Diversified portfolio, wants smarter allocation",
   hue: 255, income: 210000, expenses: 98000, emi: 0, score: 712, prev: 705, history: [688, 694, 699, 701, 705, 712],
   dims: { savings: [78, 77], debt: [74, 72], invest: [86, 87], protection: [58, 58], goals: [70, 66], emergency: [74, 72] },
   emMonths: 7.4, alloc: { equity: 78, debt: 10, gold: 4, cash: 8 }, retireAge: 55,
   goals: [
     { id: "g1", name: "Financial independence corpus", icon: "trend", target: 35000000, saved: 11000000, due: "2044", monthly: 90000 },
     { id: "g2", name: "Sabbatical fund", icon: "compass", target: 1200000, saved: 750000, due: "Dec 2027", monthly: 25000 }
   ],
   xp: 1180, streak: 21, activity: "d-invest", baseBadges: ["b-first", "b-streak3", "b-learner", "b-streak7", "b-sim"],
   line: "Good to have you back. Let's make your money work smarter.",
   ai: { msg: "Welcome back, Rohan. Your simulated score is steady at 712. One thing worth a look: about 78% of your simulated portfolio sits in equity, which is above the 65% you set as your comfort level. Want a two-minute diversification refresher?", quick: ["Show allocation", "Run a what-if", "Explain diversification"] },
   focus: "review allocation drift and your protection (cover) gap", learn: ["Asset allocation vs drift", "Rebalancing concepts", "Sequence-of-returns risk"],
   actions: [{ t: "Compare current vs target allocation", pts: 20, mins: 4 }, { t: "Run the market-dip simulator round", pts: 15, mins: 5 }, { t: "Review life-cover adequacy (concept check)", pts: 12, mins: 6 }] },

 { id: "family", name: "Sneha & Vikram Nair", first: "Sneha", age: 41, tag: "Family Financial Planner", blurb: "Two incomes, home loan, child's education",
   hue: 330, income: 240000, expenses: 150000, emi: 48000, score: 648, prev: 630, history: [610, 615, 622, 626, 630, 648],
   dims: { savings: [56, 52], debt: [46, 44], invest: [58, 56], protection: [52, 50], goals: [62, 58], emergency: [48, 45] },
   emMonths: 3.1, alloc: { equity: 45, debt: 30, gold: 10, cash: 15 }, retireAge: 58,
   goals: [
     { id: "g1", name: "Child's education fund", icon: "book", target: 4000000, saved: 900000, due: "2036", monthly: 22000 },
     { id: "g2", name: "Home-loan prepayment", icon: "house", target: 1000000, saved: 310000, due: "2029", monthly: 15000 },
     { id: "g3", name: "Family emergency fund", icon: "shield", target: 900000, saved: 560000, due: "Dec 2026", monthly: 20000 }
   ],
   xp: 760, streak: 12, activity: "d-emerg", baseBadges: ["b-first", "b-streak3", "b-learner", "b-streak7"],
   line: "Welcome back! Your family's financial journey is moving forward.",
   ai: { msg: "Hello Sneha. Two of your family goals are on track — the education fund is at 23% and growing steadily. Your emergency fund covers about 3.1 months; a quick check could show whether your household needs a larger buffer while the home loan runs.", quick: ["Check emergency fund", "Family goals overview", "Protection checklist"] },
   focus: "balance the home-loan prepayment goal against a stronger emergency buffer", learn: ["Child-education planning basics", "Prepay loan vs invest (concept)", "Household protection checklist"],
   actions: [{ t: "Run the family emergency-fund check", pts: 14, mins: 3 }, { t: "Review the protection checklist together", pts: 16, mins: 8 }, { t: "Schedule the weekly family money huddle", pts: 8, mins: 2 }] },

 { id: "saver", name: "Kabir Singh", first: "Kabir", age: 31, tag: "Goal-Oriented Saver", blurb: "Disciplined saver closing in on a big goal",
   hue: 28, income: 120000, expenses: 70000, emi: 0, score: 631, prev: 598, history: [575, 582, 590, 594, 598, 631],
   dims: { savings: [84, 79], debt: [80, 80], invest: [44, 40], protection: [54, 54], goals: [86, 80], emergency: [72, 70] },
   emMonths: 4.2, alloc: { equity: 25, debt: 35, gold: 5, cash: 35 }, retireAge: 60,
   goals: [
     { id: "g1", name: "Home down payment", icon: "house", target: 2000000, saved: 1400000, due: "Aug 2027", monthly: 38000 },
     { id: "g2", name: "Emergency fund (6 months)", icon: "shield", target: 420000, saved: 420000, due: "Done", monthly: 0 },
     { id: "g3", name: "Wedding gift fund", icon: "gift", target: 300000, saved: 80000, due: "Feb 2028", monthly: 9000 }
   ],
   xp: 905, streak: 16, activity: "d-spend", baseBadges: ["b-first", "b-streak3", "b-learner", "b-streak7", "b-saver"],
   line: "Welcome back! Your financial journey is moving forward.",
   ai: { msg: "Good morning, Kabir! I noticed your savings goal is getting closer. You're 70% of the way there. Today, let's review your monthly expenses and see whether you can reach your target sooner.", quick: ["Review expenses", "Show my goal path", "Not now"] },
   focus: "finish the down-payment goal and start thinking about what comes after it", learn: ["Down-payment vs EMI trade-offs", "Parking short-term goal money safely (concept)", "Starting long-term investing"],
   actions: [{ t: "Review last month's top 3 expense categories", pts: 12, mins: 4 }, { t: "Check the goal path with a +₹3,000 scenario", pts: 10, mins: 3 }, { t: "Learn: where short-term goal money usually sits", pts: 8, mins: 2 }] }
],

aiScripts: {
  welcome: "Hi {first}! I'm your Finscore companion. I can only see the simulated profile you're previewing — {tag} — so I'll never guess beyond it. Pick a question or type your own.",
  disclosure: "Simulated demo · educational information, not investment advice",
  suggested: [
    { id: "healthy", q: "Am I financially healthy?" },
    { id: "save", q: "How can I save more money?" },
    { id: "house", q: "Am I ready to buy a house?" },
    { id: "emergency", q: "How much emergency fund should I maintain?" },
    { id: "invest", q: "Explain my investments" },
    { id: "score", q: "How can I improve my financial score?" },
    { id: "retire", q: "Help me plan for retirement" },
    { id: "focus", q: "What should I focus on this month?" }
  ],
  answers: {
    healthy: { text: "Based on your simulated profile, your wellness score is **{score}/900** — the **{stage}** stage ({nick}). That's {delta} points {dir} last month.\n\nYour strongest area is **{best}**, and the area with most room to grow is **{worst}**. Financial health isn't a grade — it's a direction, and yours is {trend}.", cards: [{ t: "See full wellness breakdown", d: "Six health dimensions, simulated", href: "financial-wellness.html", icon: "ring" }, { t: "Today's small step", d: "{actTitle} · {actMins} min", href: "daily-activities.html", icon: "spark" }] },
    save: { text: "You currently save about **{rate}%** of income (≈ {surplusF}/month in this simulation). A few low-effort ideas to explore:\n\n• Shifting just 5% of income ({fiveF}) to savings on salary day, before spending.\n• Reviewing your top expense category — small trims there often matter most.\n• Giving each goal its own labelled pot so progress is visible.\n\nThese are habits, not guarantees — pick the one that feels easiest.", cards: [{ t: "Try a savings micro-challenge", d: "2 minutes · +8 points", href: "daily-activities.html", icon: "coins" }, { t: "Open Savings Adventure", d: "See your goal path", href: "savings-adventure.html", icon: "route" }] },
    house: { text: "Let's look at readiness as a checklist, using only what's in this simulated profile:\n\n{houseCheck}\n\nThis is a learning checklist, not a verdict — property decisions also depend on things I can't see (city, prices, job stability). A licensed advisor can help with specifics.", cards: [{ t: "Plan the goal", d: "Create or adjust a home goal", href: "goals-planning.html", icon: "house" }, { t: "Emergency fund check", d: "Is the safety net in place?", href: "daily-activities.html", icon: "shield" }] },
    emergency: { text: "A commonly taught guideline is **3 to 6 months** of essential expenses, depending on income stability and dependants.\n\nFor this simulated profile (monthly spend ≈ {expensesF}), that's roughly **{em3F} to {em6F}**. Your cushion today covers about **{emMonths} months**, so you're {emStatus}.\n\nIf an exact figure matters, adjust for your own situation — the guideline is a starting point.", cards: [{ t: "Emergency fund check", d: "3-minute daily activity", href: "daily-activities.html", icon: "shield" }, { t: "Adjust your goal", d: "Set a target date", href: "goals-planning.html", icon: "target" }] },
    invest: { text: "Here's your **simulated** mix: equity {a_equity}% · debt {a_debt}% · gold {a_gold}% · cash {a_cash}%.\n\n{investRead}\n\nI can explain concepts (diversification, drift, risk vs return) but I don't recommend specific products or promise returns. Markets can fall as well as rise.", cards: [{ t: "Try the Investment Simulator", d: "Virtual money, simulated markets", href: "investment-simulator.html", icon: "trend" }, { t: "Learn: diversification", d: "One-minute knowledge card", href: "daily-activities.html", icon: "book" }] },
    score: { text: "Here are the three steps this simulation estimates would help most (ranges, not promises):\n\n{actionList}\n\nScore changes in the real product would come only from verified actions — never from just opening the app.", cards: [{ t: "Open Score Journey", d: "Milestones & what-if", href: "financial-wellness.html", icon: "ring" }, { t: "Start the top action", d: "Daily activity", href: "daily-activities.html", icon: "spark" }] },
    retire: { text: "Retirement is a long game, so let's keep it to concepts. You're {age}; this profile assumes retiring around **{retireAge}** — about **{years} years** away.\n\nThe big levers are (1) how early you start, (2) how steadily you contribute, and (3) staying invested through market ups and downs. Small, regular steps compound — but returns are never guaranteed.\n\nWant a gentle 'what if I add ₹2,000 a month' illustration? It would be an example, not a forecast.", cards: [{ t: "Goals & retirement planner", d: "Illustrative projection with ranges", href: "goals-planning.html", icon: "sun" }, { t: "Independence journey", d: "See the full route", href: "financial-journey.html", icon: "compass" }] },
    focus: { text: "Looking at {first}'s simulated profile, a sensible focus this month is to **{focus}**.\n\nOne step to start: **{actTitle}** ({actMins} min, +{actPts} points). Just one — consistency beats intensity.", cards: [{ t: "Start today's activity", d: "{actTitle}", href: "daily-activities.html", icon: "play" }, { t: "See this month's wrapped preview", d: "Progress story", href: "financial-wrapped.html", icon: "gift" }] }
  },
  topics: [
    { k: ["crypto", "bitcoin", "stock tip", "which stock", "which fund", "best fund", "hot"], a: "I can't recommend specific products or predict markets — and I only know this simulated profile. I *can* explain how to think about risk, diversification and time horizon. Want that instead?" },
    { k: ["tax", "itr", "80c"], a: "Tax rules are specific and change often, and nothing in this simulated profile covers them, so I won't guess. A tax professional is the right place for that. I can help you organise your goals and savings so tax conversations are easier." },
    { k: ["loan", "emi", "debt", "credit card"], a: "In this simulation your debt health is **{debtScore}/100** and monthly EMIs are {emiF}. A good rule of thumb to learn: clear the costliest debt first while keeping an emergency buffer. Want to try the Debt challenge in weekly activities?" },
    { k: ["insurance", "cover", "protect"], a: "Protection health in this simulation is **{protScore}/100**. I can walk you through a concept checklist (life, health, income dependants) — but not pick a policy for you." },
    { k: ["hello", "hi", "hey", "thanks", "thank"], a: "Happy to help, {first}! Ask me anything about your simulated finances, or tap one of the suggestions." }
  ],
  fallback: "I'm not sure I know that from this simulated profile, so I won't guess. Here's what I can help with — pick one of the suggestions, or rephrase your question."
},

activities: [
  { id: "d-checkin", type: "daily", title: "Daily money check-in", icon: "wallet", desc: "A calm 2-minute look at today's money — no judgment, just awareness.", mins: 2, diff: "Easy", pts: 10, value: "Builds the habit of looking at your money regularly, the single strongest predictor of better decisions.", flow: "check", items: ["Looked at today's balance", "Noted any unusual spending", "Set one intention for today"], take: "Awareness first. You can't steer what you don't look at." },
  { id: "d-lesson", type: "daily", title: "One-minute lesson: needs vs wants", icon: "book", desc: "A bite-sized lesson on separating essentials from nice-to-haves.", mins: 1, diff: "Easy", pts: 6, value: "Gives you a simple filter for everyday spending decisions.", flow: "learn", lesson: { h: "Needs vs wants", b: "Needs keep life running — rent, food, transport, bills, minimum debt payments. Wants make life nicer — dining out, upgrades, subscriptions. Many purchases are a mix: a phone is a need, the newest model is a want. The goal isn't to remove wants; it's to choose them on purpose." }, q: { q: "Which is most likely a 'need'?", o: ["A streaming bundle", "Monthly electricity bill", "Weekend trip", "Latest sneakers"], a: 1, why: "Utilities keep your home running. The others can be planned for deliberately." }, take: "Choose your wants on purpose, and your needs are always covered first." },
  { id: "d-quiz", type: "daily", title: "Quick financial quiz", icon: "brain", desc: "Three questions on everyday money concepts.", mins: 3, diff: "Medium", pts: 15, value: "Retrieval practice makes financial concepts stick far better than reading.", flow: "learn", lesson: { h: "Compound growth, simply", b: "When earnings are reinvested, you earn on your earnings. Over long periods this snowball effect is powerful — which is why starting early with small amounts often matters more than starting late with big ones. (Illustration only: returns are never guaranteed.)" }, q: { q: "What helps compounding most?", o: ["Checking balance daily", "Time and consistent contributions", "Timing the market", "Avoiding all risk"], a: 1, why: "Time in the market and regular contributions matter more than perfect timing." }, take: "Time + consistency beat timing." },
  { id: "d-spend", type: "daily", title: "Spending awareness challenge", icon: "chart", desc: "Review last month's top spending categories and spot one thing to adjust.", mins: 3, diff: "Easy", pts: 12, value: "Most people can't name their top 3 spending categories — knowing them unlocks easy savings.", flow: "check", items: ["Identified my top 3 spending categories", "Marked one category as 'worth it'", "Picked one category to trim by 5%"], take: "Small targeted trims beat broad restriction." },
  { id: "d-save", type: "daily", title: "Savings micro-challenge", icon: "coins", desc: "Set a tiny automatic transfer to a goal — then see its yearly effect.", mins: 2, diff: "Easy", pts: 8, value: "Automation removes willpower from saving.", flow: "learn", lesson: { h: "Pay yourself first", b: "Instead of saving what's left after spending, move a fixed amount to savings right after income arrives. Even ₹1,000 a month becomes ₹12,000 a year before any growth — and the habit scales as income grows." }, q: { q: "What's the key benefit of automating savings?", o: ["Higher guaranteed returns", "It removes reliance on willpower", "It avoids all risk", "It reduces income tax"], a: 1, why: "Automation makes saving the default instead of a decision you re-make every month." }, take: "Make saving the default." },
  { id: "d-wellness", type: "daily", title: "Financial wellness check", icon: "ring", desc: "Rate six areas of your financial life in under four minutes.", mins: 4, diff: "Medium", pts: 20, value: "A regular self-check shows where attention actually helps.", flow: "check", items: ["Savings: I save regularly", "Debt: I know what I owe and the cost", "Protection: I know what's covered", "Investing: I have a plan for long-term money", "Goals: I know my top 3 goals", "Emergency: I know how many months I could cover"], take: "Unchecked boxes are your next focus areas, not failures." },
  { id: "d-invest", type: "daily", title: "Investing concept: diversification", icon: "trend", desc: "Why not putting everything in one place can reduce the damage of any single surprise.", mins: 3, diff: "Medium", pts: 15, value: "Helps you spot concentration risk in your own plan.", flow: "learn", lesson: { h: "Diversification", b: "Different assets behave differently in different conditions. Spreading money across them doesn't prevent losses, but it can reduce how much any one event hurts. How you spread depends on goals, time horizon and comfort with ups and downs — it's personal, not universal." }, q: { q: "What does diversification mainly aim to reduce?", o: ["All possible losses", "Dependence on a single outcome", "Taxes", "The need to review"], a: 1, why: "It reduces dependence on any single asset or event; it can't remove risk." }, take: "Spread risk, don't chase certainty." },
  { id: "d-goal", type: "daily", title: "Personal goal review", icon: "target", desc: "Look at each goal's progress and confirm it's still the right target.", mins: 3, diff: "Easy", pts: 12, value: "Goals drift; a quick review keeps your money pointed at what matters.", flow: "check", items: ["Checked each goal's saved amount", "Confirmed target dates still make sense", "Chose which goal gets the next ₹ I save"], take: "Goals are living plans. Reviewing them is the plan." },
  { id: "d-emerg", type: "daily", title: "Check your emergency fund", icon: "shield", desc: "How many months of essentials could you cover today?", mins: 3, diff: "Easy", pts: 12, value: "The emergency fund is the foundation every other goal stands on.", flow: "learn", lesson: { h: "Your safety net", b: "An emergency fund is money set aside only for surprises — job gaps, medical bills, urgent repairs. Common guidance is 3–6 months of essential expenses, more if income is uneven or others depend on you. Keep it easy to reach and low-risk." }, q: { q: "Where should emergency money mainly prioritise?", o: ["Maximum returns", "Easy access and safety", "Locked long-term products", "Highest risk assets"], a: 1, why: "You need it available when something goes wrong, so access and safety come first." }, take: "Emergency money's job is availability, not returns." },
  { id: "d-risk", type: "daily", title: "Understand your risk profile", icon: "brain", desc: "A short reflection on how you feel about ups and downs.", mins: 4, diff: "Medium", pts: 15, value: "Aligning investments with your real comfort level helps you stay invested.", flow: "learn", lesson: { h: "Risk tolerance vs risk capacity", b: "Tolerance is how comfortable you feel with ups and downs. Capacity is how much loss your finances can actually absorb. Good plans respect the lower of the two." }, q: { q: "Your investments fall 15% in a month. Capacity-wise, what matters most?", o: ["Whether you need this money soon", "What friends are doing", "Headlines", "Yesterday's price"], a: 0, why: "If you need the money soon, a fall is far more damaging than if the horizon is long." }, take: "Plan for the lower of tolerance and capacity." },

  { id: "w-review", type: "weekly", title: "Weekly financial review", icon: "calendar", desc: "Ten-minute reset: income in, money out, goals moved.", mins: 10, diff: "Medium", pts: 40, value: "A weekly rhythm catches small problems before they grow.", flow: "check", items: ["Reviewed income and large expenses", "Checked upcoming bills", "Moved money to at least one goal", "Picked next week's one focus"], take: "Ten minutes a week can replace hours of month-end stress." },
  { id: "w-savings", type: "weekly", title: "Savings progress review", icon: "piggy", desc: "See which goals moved and which stalled.", mins: 5, diff: "Easy", pts: 25, value: "Visible progress keeps motivation honest.", flow: "check", items: ["Compared saved vs planned this week", "Identified one stalled goal", "Decided one adjustment"], take: "Adjust the plan, not your self-worth." },
  { id: "w-portfolio", type: "weekly", title: "Portfolio learning", icon: "trend", desc: "One concept about how portfolios work — no trading required.", mins: 6, diff: "Medium", pts: 30, value: "Informed investors make calmer decisions.", flow: "check", items: ["Read the concept card", "Compared it to my simulated allocation", "Noted one question to explore"], take: "Understanding first, action second." },
  { id: "w-debt", type: "weekly", title: "Debt management challenge", icon: "bank", desc: "List debts by cost and plan the next extra payment.", mins: 8, diff: "Hard", pts: 40, value: "Targeting the costliest debt first saves the most interest.", flow: "check", items: ["Listed each debt with rate and EMI", "Ranked by cost", "Chose where any extra payment goes"], take: "Cost, not size, decides the order." },
  { id: "w-insurance", type: "weekly", title: "Insurance awareness", icon: "umbrella", desc: "A concept walkthrough of what protection means for your situation.", mins: 8, diff: "Medium", pts: 35, value: "Protection gaps are invisible until they matter.", flow: "check", items: ["Listed who depends on my income", "Noted what health and life cover I have", "Flagged gaps to discuss with an advisor"], take: "Protection protects every other goal." },
  { id: "w-knowledge", type: "weekly", title: "Financial knowledge assessment", icon: "brain", desc: "A short quiz arena run to measure what you've learned.", mins: 6, diff: "Medium", pts: 30, value: "Shows learning growth over time.", flow: "link", href: "quiz-arena.html", take: "Knowledge compounds too." },

  { id: "m-wrapped", type: "monthly", title: "Monthly financial wrapped", icon: "gift", desc: "Your month in a story — progress, learning, wins.", mins: 3, diff: "Easy", pts: 50, value: "Reflection turns activity into understanding.", flow: "link", href: "financial-wrapped.html", take: "Celebrate verified progress." },
  { id: "m-assess", type: "monthly", title: "Financial wellness assessment", icon: "ring", desc: "A deeper six-dimension check-in.", mins: 8, diff: "Medium", pts: 60, value: "The most honest picture of where you stand.", flow: "link", href: "financial-wellness.html", take: "Measure, then improve." },
  { id: "m-goalreport", type: "monthly", title: "Goal progress report", icon: "target", desc: "Each goal: saved, pace, projected date range.", mins: 6, diff: "Easy", pts: 45, value: "Shows whether today's pace still reaches tomorrow's goal.", flow: "link", href: "goals-planning.html", take: "Pace is the plan." },
  { id: "m-habits", type: "monthly", title: "Financial habits analysis", icon: "chart", desc: "Which habits helped, which didn't, and which to keep.", mins: 7, diff: "Medium", pts: 50, value: "Habits, not events, change outcomes.", flow: "check", items: ["Reviewed my streak and consistency", "Noted my best habit this month", "Chose one habit to improve"], take: "Keep what works. Fix one thing." },
  { id: "m-plan", type: "monthly", title: "Personalised improvement plan", icon: "route", desc: "A simple three-step plan for next month.", mins: 5, diff: "Easy", pts: 45, value: "Turns insight into action.", flow: "check", items: ["Chose one saving action", "Chose one learning action", "Chose one protection action"], take: "Three small actions beat one big intention." }
],

cards: [
  { t: "Pay yourself first", b: "Move money to savings the day income arrives. What's left is for spending.", tag: "Habit", q: { q: "When should you save?", o: ["After all spending", "As soon as income arrives"], a: 1 } },
  { t: "The 3–6 month cushion", b: "Aim for three to six months of essentials in an easy-access emergency fund.", tag: "Safety", q: { q: "Emergency funds prioritise…", o: ["Access & safety", "Highest return"], a: 0 } },
  { t: "Compounding needs time", b: "Earnings on earnings snowball. Start small and early; never assume guaranteed returns.", tag: "Growth", q: { q: "What helps compounding most?", o: ["Time", "Luck"], a: 0 } },
  { t: "Costly debt first", b: "When paying extra, target the highest interest rate first while paying minimums elsewhere.", tag: "Debt", q: { q: "Which debt gets extra payments first?", o: ["Highest rate", "Smallest balance always"], a: 0 } },
  { t: "Don't put all eggs in one basket", b: "Diversification spreads risk across assets. It reduces dependence on one outcome; it can't remove risk.", tag: "Investing", q: { q: "Diversification…", o: ["Removes all risk", "Reduces single-outcome dependence"], a: 1 } },
  { t: "Insurance protects goals", b: "Cover isn't an investment — it keeps a setback from derailing every other goal.", tag: "Protection", q: { q: "Insurance mainly…", o: ["Protects plans from shocks", "Maximises returns"], a: 0 } },
  { t: "Inflation is a quiet cost", b: "Prices rise over time, so money sitting idle for long periods buys less. Match the horizon to the tool.", tag: "Concept", q: { q: "Inflation tends to…", o: ["Reduce buying power", "Increase buying power"], a: 0 } },
  { t: "Review beats react", b: "Scheduled weekly reviews beat panicky reactions to headlines.", tag: "Behaviour", q: { q: "Best response to scary headlines?", o: ["Stick to your review rhythm", "Sell everything"], a: 0 } }
],

spin: [
  { k: "tip", label: "Tip", t: "Tip: Automate saving", b: "Set a small transfer for the day after payday. Consistency beats amount." },
  { k: "quiz", label: "Quiz", t: "Mini quiz", b: "Which is a need: monthly rent or a new gadget?", q: { o: ["Monthly rent", "New gadget"], a: 0, why: "Rent keeps a roof over your head." } },
  { k: "concept", label: "Concept", t: "Concept: Rule of 72", b: "Divide 72 by an annual growth rate to estimate years to double (illustration only, not a promise)." },
  { k: "challenge", label: "Challenge", t: "60-second challenge", b: "Name your top 3 spending categories from last month — without looking." },
  { k: "tip", label: "Tip", t: "Tip: Name your goals", b: "Goals with names and dates are met more often than vague intentions." },
  { k: "quiz", label: "Quiz", t: "Mini quiz", b: "Emergency funds should be…", q: { o: ["Easy to access", "Locked for years"], a: 0, why: "Emergencies don't wait for lock-ins to end." } },
  { k: "concept", label: "Concept", t: "Concept: Good vs costly debt", b: "Costly debt (e.g. high-rate credit) can outrun your savings. Rank by rate, not by feeling." },
  { k: "activity", label: "Activity", t: "Jump to a lesson", b: "Open today's one-minute lesson from the Daily Activities page.", href: "daily-activities.html" }
],

quiz: [
  { d: "Easy", q: "What is an emergency fund for?", o: ["Planned holidays", "Unexpected expenses", "Buying stocks", "Festival shopping"], a: 1, why: "It's reserved for surprises like medical bills or job gaps." },
  { d: "Easy", q: "Which is a regular 'need'?", o: ["Electricity bill", "Concert ticket", "Gaming skin", "Premium subscription"], a: 0, why: "Utilities keep your home running." },
  { d: "Easy", q: "A budget helps you…", o: ["Predict markets", "Plan where money goes", "Avoid all spending", "Raise income instantly"], a: 1, why: "Budgeting is planning, not punishment." },
  { d: "Easy", q: "Saving first means…", o: ["Saving what's left", "Saving right when income arrives", "Never spending", "Only saving bonuses"], a: 1, why: "Paying yourself first makes saving the default." },
  { d: "Medium", q: "What does diversification do?", o: ["Guarantees profit", "Removes risk entirely", "Reduces dependence on one outcome", "Avoids taxes"], a: 2, why: "It spreads risk; it can't remove it." },
  { d: "Medium", q: "Which debt deserves extra payments first?", o: ["Lowest rate", "Highest rate", "Oldest", "Smallest EMI"], a: 1, why: "Highest-rate debt costs the most over time." },
  { d: "Medium", q: "Inflation generally…", o: ["Raises buying power", "Reduces buying power over time", "Has no effect", "Only affects loans"], a: 1, why: "Rising prices mean each rupee buys less." },
  { d: "Medium", q: "A typical emergency-fund guideline is…", o: ["1 week of expenses", "3–6 months of essentials", "10 years of income", "Equal to your loan"], a: 1, why: "3–6 months is the commonly taught range." },
  { d: "Hard", q: "Risk capacity is mainly about…", o: ["How brave you feel", "How much loss your finances can absorb", "Your age alone", "Past returns"], a: 1, why: "Capacity is financial; tolerance is emotional. Respect the lower." },
  { d: "Hard", q: "Sequence-of-returns risk matters most when…", o: ["Starting a SIP at 22", "Withdrawing during early retirement", "Holding cash", "Paying EMIs"], a: 1, why: "Early losses while withdrawing can permanently dent a corpus." },
  { d: "Hard", q: "Which statement about returns is accurate?", o: ["Past returns guarantee future ones", "Higher potential return usually comes with higher risk", "Debt is always risk-free", "Gold never falls"], a: 1, why: "Risk and return are linked; nothing is guaranteed." },
  { d: "Hard", q: "Rupee-cost averaging is…", o: ["Timing the lowest price", "Investing a fixed amount at regular intervals", "A guaranteed strategy", "Only for equity"], a: 1, why: "It spreads purchase prices over time; it doesn't guarantee profit." }
],

personality: {
  q: [
    { q: "Salary lands. Your first move?", o: [["Move a set amount to savings", "planner"], ["Treat myself a little", "spender"], ["Check where to invest it", "risk"], ["Keep it safe in the account", "saver"]] },
    { q: "A friend shares a 'hot' investment idea.", o: [["Ask for the facts, then decide slowly", "planner"], ["Jump in — fear of missing out", "risk"], ["Politely ignore it", "saver"], ["Wait, will it fund my weekend?", "spender"]] },
    { q: "Unexpected ₹10,000 arrives.", o: [["Split between goals", "planner"], ["Buy something I've wanted", "spender"], ["Put it all in savings", "saver"], ["Invest it", "risk"]] },
    { q: "Market falls 10%.", o: [["Review my plan, stay the course", "planner"], ["Panic a little", "saver"], ["See an opportunity", "risk"], ["Don't check", "spender"]] },
    { q: "How do you track spending?", o: [["Monthly review of categories", "planner"], ["I don't really", "spender"], ["Mental note, mostly under limit", "saver"], ["Mostly investments, not spending", "risk"]] }
  ],
  r: {
    planner: { n: "The Planner", d: "You like a system. You review, set goals and decide calmly.", tip: "Strength: consistency. Next: stress-test your plan with a what-if.", href: "goals-planning.html", cta: "Open goal planner" },
    spender: { n: "The Experience Seeker", d: "You enjoy money now. That's fine — the trick is to choose it on purpose.", tip: "Strength: you value life. Next: automate a small saving before spending.", href: "daily-activities.html", cta: "Try a micro-challenge" },
    saver: { n: "The Guardian", d: "You value safety and keep things steady.", tip: "Strength: discipline. Next: learn how to make long-term money work against inflation.", href: "investment-simulator.html", cta: "Explore the simulator" },
    risk: { n: "The Explorer", d: "You're drawn to growth and new ideas.", tip: "Strength: curiosity. Next: pair it with a safety net and diversification.", href: "investment-simulator.html", cta: "Practise in the simulator" }
  }
},

sim: {
  start: 1000000,
  assets: [{ k: "equity", n: "Equity" }, { k: "debt", n: "Debt" }, { k: "gold", n: "Gold" }, { k: "cash", n: "Cash" }],
  rounds: [
    { t: "Steady growth year", s: "Economy is stable and sentiment is good.", r: { equity: 14, debt: 7, gold: 3, cash: 3.5 } },
    { t: "Sharp market correction", s: "A global scare drops stocks quickly. Many people sell at the bottom.", r: { equity: -22, debt: 6, gold: 12, cash: 3.5 } },
    { t: "Rates rise", s: "Interest rates increase; bond values wobble, cash earns more.", r: { equity: -4, debt: 1, gold: 5, cash: 5 } },
    { t: "Sideways market", s: "Not much happens. Patience is tested.", r: { equity: 3, debt: 6.5, gold: 2, cash: 3.5 } },
    { t: "Recovery", s: "Confidence returns and stocks rebound.", r: { equity: 24, debt: 7, gold: -2, cash: 3.5 } }
  ]
},

insights: {
  beginner: [
    { type: "good", t: "Your emergency goal is moving", b: "₹18,000 of ₹60,000 saved. At ₹3,000/month, the simulation estimates reaching it between Jan and Apr 2027.", cta: "See goal", href: "savings-adventure.html" },
    { type: "watch", t: "Cushion is under one month", b: "Your simulated cushion covers about 0.8 months of expenses. A one-month cushion is a common first milestone.", cta: "Emergency check", href: "daily-activities.html" },
    { type: "info", t: "Spending changed this month", b: "Food & delivery rose about 12% in this simulated data. Small shifts show up quickly at this income level.", cta: "Spending challenge", href: "daily-activities.html" },
    { type: "good", t: "Score improved by 27 points", b: "Mostly from two weeks of consistent saving (simulated).", cta: "Explain the score", href: "financial-wellness.html" }
  ],
  young: [
    { type: "good", t: "Score up 25 points", b: "Steadier monthly savings and a lower card balance helped (simulated).", cta: "Explain the score", href: "financial-wellness.html" },
    { type: "watch", t: "Emergency fund needs attention", b: "About 1.9 months covered. Your goal is 6; a ₹5,000 automation could shorten the path by months.", cta: "Plan it", href: "goals-planning.html" },
    { type: "info", t: "Education-loan on schedule", b: "EMI of ₹9,500 is about 10% of income — in a comfortable range in this simulation.", cta: "Debt overview", href: "financial-journey.html" },
    { type: "info", t: "Protection looks thin", b: "No term cover recorded in this simulated profile. Worth a concept review, not a rush.", cta: "Protection lesson", href: "daily-activities.html" }
  ],
  investor: [
    { type: "watch", t: "Allocation may need review", b: "Equity is ~78% vs your 65% comfort level (simulated). Drift happens when markets run.", cta: "Open simulator", href: "investment-simulator.html" },
    { type: "good", t: "Savings rate is strong", b: "Roughly 53% of income saved or invested in this simulated profile.", cta: "See wellness", href: "financial-wellness.html" },
    { type: "info", t: "Protection is your lowest score", b: "Protection health 58/100. Cover adequacy is worth a periodic check.", cta: "Insurance awareness", href: "daily-activities.html" },
    { type: "good", t: "Financial independence on track", b: "Corpus at 31% of target with 8 years of buffer on the projected range.", cta: "Goal path", href: "goals-planning.html" }
  ],
  family: [
    { type: "good", t: "Education fund at 23%", b: "₹9L of ₹40L. The projected range shows the target reachable by 2036 at the current pace (not guaranteed).", cta: "See goal", href: "savings-adventure.html" },
    { type: "watch", t: "Emergency fund needs attention", b: "About 3.1 months while the home loan EMI is ₹48,000. A larger buffer is common for single-earner risk.", cta: "Emergency check", href: "daily-activities.html" },
    { type: "info", t: "EMI is 20% of income", b: "Within a typical comfort range. Prepayment vs investing is a trade-off worth understanding.", cta: "Learn the trade-off", href: "daily-activities.html" },
    { type: "good", t: "Score improved by 18 points", b: "Debt and goals dimensions both rose (simulated).", cta: "Explain the score", href: "financial-wellness.html" }
  ],
  saver: [
    { type: "good", t: "Down payment at 70%", b: "₹14L of ₹20L. At ₹38,000/month the simulation shows Aug 2027, possibly a month or two sooner.", cta: "Goal path", href: "savings-adventure.html" },
    { type: "good", t: "Emergency fund complete", b: "Six months covered. This is your foundation — nicely done.", cta: "See journey", href: "financial-journey.html" },
    { type: "info", t: "Long-term investing hasn't started", b: "Invest health is 44/100. After the goal, many people start a regular long-term habit.", cta: "Learn the basics", href: "daily-activities.html" },
    { type: "info", t: "Spending is steady", b: "Expenses moved less than 2% from last month in this simulation.", cta: "Review expenses", href: "daily-activities.html" }
  ]
},

badges: [
  { id: "b-first", name: "First Step", icon: "star", desc: "Completed your first activity", flag: "first", xp: 20 },
  { id: "b-streak3", name: "3-Day Spark", icon: "flame", desc: "Reached a 3-day streak", flag: "streak3", xp: 30 },
  { id: "b-streak7", name: "Week Warrior", icon: "flame", desc: "Reached a 7-day streak", flag: "streak7", xp: 60 },
  { id: "b-streak30", name: "Habit Builder", icon: "crown", desc: "Reached a 30-day streak", flag: "streak30", xp: 150 },
  { id: "b-learner", name: "Curious Mind", icon: "book", desc: "Finished 5 learning activities", flag: "learner", xp: 40 },
  { id: "b-quiz", name: "Quiz Ace", icon: "brain", desc: "Scored 80%+ in the Quiz Arena", flag: "quizAce", xp: 50 },
  { id: "b-spin", name: "Lucky Learner", icon: "spark", desc: "Completed a Spin & Learn round", flag: "spin", xp: 15 },
  { id: "b-saver", name: "Goal Getter", icon: "target", desc: "Reached a savings milestone", flag: "milestone", xp: 60 },
  { id: "b-sim", name: "Practice Investor", icon: "trend", desc: "Finished the Investment Simulator", flag: "sim", xp: 60 },
  { id: "b-ai", name: "Curious Companion", icon: "chat", desc: "Asked the AI companion a question", flag: "askAI", xp: 15 },
  { id: "b-persona", name: "Know Thyself", icon: "user", desc: "Finished the Personality Test", flag: "persona", xp: 25 },
  { id: "b-wrap", name: "Reflector", icon: "gift", desc: "Viewed your Monthly Wrapped", flag: "wrapped", xp: 20 },
  { id: "b-goal", name: "Planner", icon: "route", desc: "Created a financial goal", flag: "goalNew", xp: 40 },
  { id: "b-review", name: "Weekly Reviewer", icon: "calendar", desc: "Completed a weekly review", flag: "weekly", xp: 40 },
  { id: "b-safe", name: "Safety Net", icon: "shield", desc: "Emergency fund at 3+ months", flag: "safe", xp: 80 },
  { id: "b-free", name: "Freedom Seeker", icon: "sun", desc: "Reached the Independence stage (675+)", flag: "free", xp: 120 }
],

wrapped: {
  month: "October (simulated)",
  highlights: ["Completed {done} activities", "Learned {learn} new concepts", "Saved ₹{saved} toward goals", "Best streak: {streak} days"],
  next: "Focus for next month: {focus}"
}
};
