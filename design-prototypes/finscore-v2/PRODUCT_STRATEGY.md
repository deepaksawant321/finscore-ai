# Finscore V2 — Product, Growth & Retention Strategy

> Prototype-level analysis. All numbers in the prototype are simulated; no engagement or conversion figures are claimed here. Metrics below are *what to measure*, not forecasts.

## 1. Strategic thesis

Finscore today is, by its own docs, an **AI Financial Operating System**: a 300–900 score with eight stages, AI interview, Financial DNA, coach, daily companion, goals, simulation and action centre (see `docs/PILLAR_MAP.md`). The risk is that all of this reads as *a place to check a number*. V2 reframes the same capabilities around a **daily relationship**: a companion (Fin) that notices, explains and suggests one useful step.

Guardrails that make the engagement ethical and trust-building (and are visible in the prototype):

* One recommended activity per day; three spins per day; no countdown pressure outside the optional quiz timer.
* Points reward *verified* progress; they have no cash value; "celebrate progress, never app opens".
* Everything labelled simulated/estimate with ranges; no guaranteed returns; Fin refuses to guess beyond the profile.
* Essentials (education, score, basic goals, daily activities, everyday AI) never paywalled.

## 2. Feature-by-feature evaluation

| Experience | Why open it? | Problem solved | Motivation to complete | Why return? | Discovers existing products? | Financial awareness | Subscription link | Worth building? |
|---|---|---|---|---|---|---|---|---|
| **Companion Home** | Fin's one-line "what changed + one step" | "Where am I, what next?" in <10 s | Clear single action, visible progress | Fresh insight + streak + goal movement | Yes — quick access and insight CTAs route into products | High | Upsell moments only at depth (roadmap) | **Yes — Phase 1, the anchor** |
| **AI Companion** | Ask without jargon; suggested questions | Beginners don't know what to ask; experts want grounded answers | Curiosity; action cards turn answers into steps | Conversation memory (Premium) | Yes — action cards deep-link | High (explanations) | Advanced coach is the clearest premium lever | **Yes — Phase 1** |
| **Wellness & Score Journey** | See score, why it moved, what-if | Opaque scores breed distrust | Stage ladder + next-stage distance | Monthly movement, milestones | Moderate | Very high | Detailed analysis over time | **Yes — Phase 1** |
| **Daily Activities** | 1–4 min useful tasks | No reason to open when not transacting | Small, finishable, immediate takeaway | Streak + rotating content | Moderate (activities link to areas) | High | Personalised learning journeys | **Yes — Phase 1** |
| **Goals & Planning** | Name, date, fund goals; ranges not promises | Vague goals fail | Visible pace and projection | Goal pace changes monthly | High (hands off to planning/retirement products) | High | Multi-goal trade-off intelligence | **Yes — Phase 1** |
| **Achievement Center** | See verified progress | Motivation decays | Badges tied to real behaviour | Next-unlock hint | Low | Medium | None (keep free) | **Yes, basic — Phase 1** |
| **Quiz Arena** | Test knowledge, learn from misses | Financial literacy gaps | Instant feedback + explanations | Levels, best scores | Low | Very high | Assessments in Premium journeys | Yes — Phase 2 |
| **Fitness Challenges** | Weekly missions | Habit formation | Streaks, small rewards | New weekly missions | Moderate | Medium | Premium missions | Yes — Phase 2 |
| **Savings Adventure** | See a goal as a path | Long goals feel abstract | Milestone celebrations | Each deposit moves the path | High (savings/investing products) | Medium | Goal intelligence | Yes — Phase 2 |
| **Spin & Learn / Personality** | Light, shareable, curiosity-driven | Cold-start engagement | Novelty, bite-size | Capped daily | Low | Medium | None | Optional — Phase 2 (low cost) |
| **Monthly Wrapped** | Reflect on the month | Activity without reflection doesn't change behaviour | Shareable story | Monthly ritual | Moderate | High | Report/review depth | Yes — Phase 2 |
| **Independence Journey** | One route linking all products | Products feel unrelated | Station-by-station progress | Long-term arc | **Highest** (each station maps to a product area) | High | Personal roadmap | Yes — Phase 2 |
| **Investment Simulator** | Practise without risk | Fear of investing; behaviour mistakes | Scenarios + decision exercises | New scenarios | High (bridge to investing products) | Very high | Advanced scenarios | Yes, but complex — Phase 3 |
| **Premium Experience** | Depth when wanted | Monetisation without paywalls on basics | Visible value preview | Monthly review report | n/a | n/a | Direct | Yes — Phase 3, after value is proven |

## 3. Metrics (measure, don't assume)

| Goal | Metric | Notes |
|---|---|---|
| DAU / WAU / MAU | Stickiness (DAU/MAU), D1/D7/D30 retention | Segment by profile archetype |
| Activity completion | Completion rate of the recommended daily activity; median time | Quality signal, not just taps |
| Repeat engagement | Weeks with ≥3 completed activities | Prefer this over raw sessions |
| Feature discovery | % users who open ≥3 distinct areas in 30 days; deep-link click-through from insights | |
| Subscription conversion | Free → Plus on roadmap/review previews; time-to-convert | Only after Phase 1/2 value |
| Trust | Opt-out/snooze rate for nudges; "why am I seeing this" taps; support tickets about AI errors | Counter-metric to engagement |
| Outcomes | Emergency-fund months, savings rate, goal on-pace % | The real success measure |

**Do not optimise** for session length or notification clicks alone. Treat a rising snooze/opt-out rate as a stop signal.

## 4. Behavioural design choices

* **Anchoring on one action**: the home screen shows exactly one recommended activity.
* **Progress, not pressure**: streaks include recovery; missing a day is framed as normal.
* **Meaningful rewards**: badges map to real behaviours (emergency cover ≥3 months, first goal, weekly review).
* **Transparency**: "What Fin knows" panel; stage names and bands come from the rulebook; every score shows a simulated badge and confidence.
* **No gambling mechanics**: the wheel gives learning content only, capped at three spins/day, no prizes.

## 5. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Gamification feels childish for investors | Direction A restraint; levels/badges optional; profile-aware density |
| AI overreach / wrong advice | Deterministic engines do money and scores; LLM only explains; disclosure and refusal paths shown in prototype |
| Engagement ≠ outcomes | Outcome metrics above; activities tied to real actions |
| Paywall backlash | Explicit "always free" promise; premium = depth |
| Regulatory (advice) | Product-specific recommendations gated by compliance; concept hand-offs only |
| Data dependence | Many experiences degrade gracefully with user-entered facts (memory/provenance) |
