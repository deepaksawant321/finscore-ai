# Engagement Strategy — Finscore Daily Companion

> **No performance results are claimed anywhere in this document.** Ratings below are design judgments to prioritise testing, not measurements. Every number must come from real experiments after launch.

## 1. Thesis

Most finance apps are visited when money *moves* (invest, pay, check balance). That is a few times a month. A companion earns a daily visit by being **useful with no transactions at all**: a small, different, personal thing to do each day that makes the user a little better with money.

The loop the prototype tests:

1. **A reason today**: one recommended activity (~3 min), picked for the user's profile.
2. **A felt reward**: XP, a badge, an insight, or a clear "you now know X". Never for opening the app.
3. **Visible progress**: goals, wellness, week calendar, level.
4. **A reason tomorrow**: tomorrow's activity is different, and Fin names what's next.

Design principles: optional not compulsory, reward meaning not taps, no loss-aversion streak mechanics, no fake urgency, honest simulation labels, no product pushing inside education.

## 2. Audience coverage (all segments)

| Segment | What brings them back | Where in the prototype |
|---|---|---|
| Financial Beginner | Tiny wins, plain language, first safety net | Money Monday, knowledge cards, journey basics |
| Young Professional | Automating savings, lifestyle-creep awareness, SIP thinking | Think Smart Thursday raise scenario, savings challenge |
| Active Investor | Better process, behavioural traps, rebalancing rules | Wealth Wednesday simulator, drawdown quizzes |
| Family Financial Planner | Protection, loan trade-offs, education funding | Term-cover and prepay content, goal review |
| Goal-Oriented Saver | Seeing goals move, matching money to timelines | Friday goal review, goal planner |

## 3. Feature evaluation

Ratings: **H** high, **M** medium, **L** low. For *Complexity*, **L** is cheap to build and **H** is expensive. These are qualitative.

| Feature | Daily engagement | Retention | User value | Fin. education | Product discovery | Subscription potential | Complexity |
|---|---|---|---|---|---|---|---|
| Companion home (greeting, Fin note, today's activity) | H | H | H | M | H | M | M |
| Financial wellness score + insights | M | H | H | M | H | H | M |
| Daily rotating activity (Mon–Sun) | H | H | H | H | M | M | M |
| Quiz of the day / Quiz Arena | H | M | M | H | L | L | L |
| XP and levels | M | M | L | L | L | L | L |
| Badges | M | M | L | L | L | L | L |
| Weekly calendar (no-loss streak) | M | H | L | L | L | L | L |
| Goal review (Friday) + goal progress | M | H | H | M | H | H | M |
| Sunday review / weekly report | M | H | M | L | M | M | M |
| Spin & Learn | M | L | M | M | L | L | L |
| Knowledge cards | H | M | M | H | L | L | L |
| Savings challenge game | M | M | M | M | L | L | M |
| Financial personality test | L | M | M | M | M | M | L |
| Investment learning simulator (virtual) | M | M | M | H | H | H | H |
| Learning journey (7 modules) | M | H | H | H | M | M | M |
| AI companion chat (scripted here, LLM later) | M | M | H | M | H | H | H (LLM, safety, compliance) |
| Monthly Wrapped | L | M | M | L | M | M | M |
| Simulated share cards | L | M | L | L | M | L | L |
| Premium preview (concept) | L | L | L | L | M | H | L |

## 4. Recommended first five features to build in the real product

Chosen for the best mix of daily pull, value without transactions, learning, and low complexity. Content-led features come first because they ship without new infrastructure.

1. **Companion home with today's recommended activity and a personalised Fin note** (rule-based first, not LLM). It is the daily destination and the container for everything else.
2. **Daily rotating activity with Quiz of the Day** (start with Tuesday-style quizzes and knowledge cards). Cheap content, high repeat value, strong education.
3. **Weekly goal review with goal progress** (Friday pattern). Connects the companion to the user's real financial goals, which is the strongest retention hook and a natural premium surface.
4. **Wellness score with explained insights** (drivers, not just a number). Gives a reason to return to see movement, and a discovery path to existing Finscore products.
5. **XP + badges + weekly calendar with a no-loss streak**, plus the **weekly report**. Light to build, makes progress visible, and produces the data needed to measure the primary metric.

Deliberately *later*: LLM chat (safety and compliance heavy), the investment simulator (content and review heavy), Monthly Wrapped (needs weeks of data), premium packaging (needs proven free value first).

## 5. Metrics

### Primary metric: **Weekly Meaningful Financial Actions per Active User (WMFA / WAU)**

*WMFA = number of distinct meaningful actions completed in a calendar week, divided by weekly active users.*

A **meaningful action** is a behaviour that plausibly improves financial capability or habits:

* completing a daily activity (once per activity per week counts)
* quiz round at 60% or more
* goal review or a real goal contribution
* weekly review
* journey module completion
* adjusting a goal, budget or automation in the real product

**Excluded:** app opens, screen views, chat messages alone, repeats of the same activity within the week, passive reading, notification taps.

Why this metric: DAU can be inflated by notifications and streak anxiety. WMFA measures whether the time spent is *worth* something. It is also gaming-resistant because XP and WMFA share the same dedup rules.

### Supporting metrics

| Metric | Definition | Notes |
|---|---|---|
| **DAU** | Distinct users with ≥1 *meaningful action* on a day (also report DAU with any open, for comparison) | Report DAU/MAU stickiness |
| **D1 / D7 / D30 retention** | Of a signup cohort, % with a meaningful action on day 1 / 7 / 30 after first activity (also report open-based) | Segment by profile type |
| **Activity completion rate** | Completions ÷ starts, per activity | Find which days pull and which lose people |
| **Weekly active days** | Average distinct days with a meaningful action per WAU, plus distribution (0–1, 2–3, 4+) | Target a healthy 3–4, not 7. Rest days are fine |
| **AI engagement** | % of WAU with ≥1 chat, messages per active chatter, suggested-question tap rate, fallback/deflection rate, thumbs up/down, action-card click-through | Fallback rate guides content gaps. Do not optimise raw message count |
| **Goal progress** | % of users with ≥1 goal, % of goals with progress in 30 days, reviews per user per week, goals reaching milestones | Outcome metric tied to user value |
| **Premium conversion** | Preview views → trial starts → paid; by trigger surface | Only after free value is proven. Measure cancel and refund rates too |

### Guardrail metrics (must not worsen)

* Notification opt-out and unsubscribe rate
* Complaint and support rate about nagging or confusion
* User-reported "helpful" score for insights
* Wellness score trend of engaged vs non-engaged cohorts (does engagement associate with better outcomes?)
* Share of engagement from users in financial difficulty being nudged toward risky products (should be ~0 by policy)

### Instrumentation (event sketch)

`activity_started`, `activity_completed{id,score,practice}`, `quiz_completed{topic,pct}`, `goal_review_completed`, `goal_contribution`, `ai_message_sent{source:chip|typed}`, `ai_fallback`, `badge_unlocked`, `level_up`, `share_opened`, `premium_preview_viewed`, `wmfa_action{type}` (derived, deduped by user, week, action key).

## 6. Experiments to run (hypotheses, not results)

1. Does a profile-matched "today's activity" beat a generic one on completion rate and D7?
2. Does a no-loss weekly calendar retain as well as a loss-aversion streak, with fewer opt-outs?
3. Does adding an explanation of *why* the score moved increase return visits vs score alone?
4. Which of Mon–Sun activities has the highest completion and the best next-day return?
5. Does the goal review lift real goal contributions or only in-app taps?
6. Does a premium preview change free engagement (cannibalisation check)?

## 7. Monetisation guardrails

Free forever: daily activities, quizzes, XP, badges, basic insights, weekly report. Candidate paid layers: deep-dive monthly report, family or shared goals, advanced simulator scenarios, guided learning paths, higher-touch AI coaching. Never gate safety information. Never reward behaviour with money-linked incentives that distort advice.

## 8. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Gamification trivialises money | Premium, restrained visuals. XP only for meaningful steps. No cash-like rewards |
| Content going stale | Rotating banks, profile tagging, editorial calendar, user "seen" tracking |
| Streak anxiety | No-loss calendar, rest days celebrated, "progress not pressure" copy |
| AI overreach | Scoped intents, refusal of product tips, clear "scripted/AI" labelling, compliance review before any LLM |
| Regulatory exposure | Educational framing, simulation labels, suitability and advice rules reviewed with compliance before launch (rules vary by jurisdiction) |
| Engagement without outcomes | Track goal progress and wellness trends as guardrails, not only activity counts |

## 9. Rollout suggestion

1. **Alpha**: five MVP features with static content, instrumented, to an internal group.
2. **Beta**: a limited user cohort with an A/B on profile-matched vs generic activity.
3. **Review** WMFA/WAU, D7, completion, opt-outs. Decide what graduates.
4. **Then** add chat (LLM with guardrails), the simulator, Wrapped, and premium experiments.
