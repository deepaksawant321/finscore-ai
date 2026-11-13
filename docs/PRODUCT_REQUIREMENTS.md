# FinScore AI — Product Requirements (Extracted)

**Status:** Phase 0 draft for Product Owner review · **Sources:** (S) Strategy deck, 16 slides · (B) Product Blueprint, sections §1–§32
**Rule:** this file only *extracts* requirements. Nothing here is invented. Items the sources label PROPOSED are marked **[PROPOSED]**; items the sources leave undefined are marked **[PENDING PRODUCT APPROVAL]** and tracked in `PRODUCT_DECISIONS.md`.

## 1. Vision and positioning
- Brand 5nance; product FinScore AI; evolve from an annual assessment to an always-on **AI Financial Operating System** (S1, S3, S16).
- Target flow: *Conversation → Intelligence → Action*, replacing *Questionnaire → Score → Report* (S2, B§2).
- North star pillars: **Understand** (Financial DNA), **Predict** (wealth stages, risks), **Act** (single best next action) (S3).
- Closed loop: USER PROBLEM → AI UNDERSTANDS → ADAPTIVE INTERVIEW → FINANCIAL TRUTH → FINANCIAL DNA → FINSCORE → WEALTH STAGE → PERSONA → EXPLAIN → PREDICT → SIMULATE → PRIORITISE → ACT → VERIFY → UPDATE → LEARN → NEXT BEST ACTION (B§32).
- Moat: longitudinal Financial DNA + verified behavioural outcomes + explainable prediction + action history (B§31, S15).

## 2. Non-negotiable principles (B§1, §31)
| ID | Principle |
|---|---|
| P1 | Start with the user's problem, never a questionnaire. |
| P2 | AI interprets and converses; **deterministic engines calculate**; rules decide compliance. LLM is never the authoritative calculator (tax, SIP, compounding, portfolio weights, insurance adequacy, retirement corpus, score arithmetic). |
| P3 | Every score is explainable; every score movement maps to a deterministic factor or approved model output. |
| P4 | Every recommendation has an expected impact; every projection shows assumptions and uncertainty. |
| P5 | The user owns and can correct Financial Memory; no silent overwrite of facts. |
| P6 | Gamification rewards healthy behaviour, never transactions or app-opens; XP never changes FinScore. |
| P7 | Daily Companion is event-driven, not noisy; no fear-based manipulation; no nagging after refusal. |
| P8 | Score must not move merely because the user chatted more. |
| P9 | Never invent missing data; mark every fact USER_STATED / CONNECTED / DERIVED / INFERRED / ESTIMATED / STALE. |

## 3. Functional requirements by area
### 3.1 Conversational interview (B§2–§3, S6)
- FR-INT-01 Opening prompt: "What is the one money problem you want to solve right now?"
- FR-INT-02 Classify intent into: Goal, Cash Flow/Savings, Investment, Debt/Loan, Tax, Insurance/Risk, Retirement, Major Purchase, Family/Dependants, Portfolio, Behaviour/Habit, General Financial Health (multi-label).
- FR-INT-03 Conversation contract: reflect problem in user's words; state why next question matters; one primary question at a time with quick options; avoid manipulative praise; provisional answer once enough data; offer 5-minute deeper assessment; end each session with decision / action / saved goal / next question.
- FR-INT-04 Two modes: Problem Mode and Full FinScore Mode. Maintain a **coverage map** per scoring pillar: Unknown / Partially Known / Verified / Stale.
- FR-INT-05 Next-question selection by relevance, information gain, dependency, confidence, freshness, friction, progress, stop-condition **[PROPOSED]**. After 3–5 questions show progress/value.
- FR-INT-06 Live "captured facts" panel with extraction chips (S6). Claim: 50% onboarding-time reduction (S6) — a *target KPI*, not a verified fact.
- FR-INT-07 First reveal narrative: score/900, stage, persona, 5–7 DNA traits, strongest pillar, biggest vulnerability, top action, projected score do-nothing vs top-actions (B§3 Stage D).

### 3.2 Canonical financial data & memory (B§5)
- FR-DATA-01 Single canonical Financial State Model; facts must not live only in chat history.
- FR-DATA-02 Entity groups: identity & household, income, expenses, assets, liabilities, protection, goals, taxes, behaviour, preferences, actions, external data — each with a freshness class.
- FR-DATA-03 Every important field carries source, timestamp, confidence, verification state, consent scope.
- FR-DATA-04 Memory rules: versioned, supersession only when source/timestamp rules permit, ask on material contradiction, user can inspect/correct, explicit consent and controlled retention for sensitive data.

### 3.3 Financial DNA & Persona (B§7–§8, S7)
- FR-DNA-01 Traits stored as value + confidence + evidence_count + recency + change_history. Persistent but **revisable**; phrase as "your behaviour suggests…".
- FR-DNA-02 Ten recommended dimensions: savings identity, debt behaviour, investment style, risk behaviour, protection mindset, decision style, goal orientation, liquidity preference, financial confidence, execution discipline.
- FR-PER-01 Persona engine scores each persona against DNA + financial state + goals; one primary + optional modifier; must explain and guide coaching.
- FR-PER-02 Eight canonical stages (below) with proposed gamified names; stage ≠ XP.

### 3.4 FinScore engine (B§6, §29)
- FR-SCORE-01 Range 300–900; 20 scoring pillars each 0–100; weighted combination mapped to 300–900 **[weights PENDING]**.
- FR-SCORE-02 Layers: pillar calculators → behavioural models → risk/goal models → normalisation → weighting → evidence/confidence → overall → stage layer → explainability layer.
- FR-SCORE-03 Display separately: Current Score, Score Confidence, Score Trend. Stale inputs reduce confidence, not necessarily score.
- FR-SCORE-04 Store every score version with factor-level contributions (audit).
- FR-SCORE-05 Stage assigned from the separate **age × FinScore matrix [PENDING]**; stage persistence rule (e.g., 30 days) **[PROPOSED]**.

### 3.5 Explainability (B§9, S8)
- FR-EXP-01 Drill-down Score → Pillar → Factor → Evidence → Action → Expected improvement.
- FR-EXP-02 "Why did my score change?" compares two score versions and lists only material changes.

### 3.6 AI Wealth Coach (B§10, S8)
- FR-COACH-01 Four modes: Explain, Diagnose, Simulate, Act. Typed tool calls only for numbers.
- FR-COACH-02 Proactive, permission-aware prompts; no fear-based framing.
- FR-COACH-03 Example intents: why score fell; reach 750; retire by 52; buy a house; lose job; afford ₹60L car (S8).

### 3.7 Simulator & Predictor (B§11–§12, S9)
- FR-SIM-01 NL → scenario variables (LLM) → deterministic calc → LLM explanation.
- FR-SIM-02 Variables across income, expenses, savings, investments, debt, tax, insurance, goals, retirement, market stress, major purchases.
- FR-SIM-03 Output Old vs New: monthly surplus, annual savings, net worth, goal probability, retirement corpus, time-to-goal, debt-free date, FinScore, stage, confidence.
- FR-SIM-04 Guardrails: explicit assumptions, ranges, never "guaranteed", user-editable assumptions, sensitivity ranking.
- FR-PRED-01 Score projection at 3M / 6M / 1Y with confidence range; broader Prediction Engine for goal shortfall, liquidity stress, debt-free date, retirement readiness, stage transitions (B§15).
- Deck suggests Monte Carlo (S14); methodology **[PENDING]**.

### 3.8 Action Prioritiser, Goals, Timeline (B§12, §15, S10)
- FR-ACT-01 Composite priority = impact(0–30) + financial impact(0–25) + urgency(0–20) + ease(0–10) + confidence(0–10) + goal alignment(0–5) **[PROPOSED]**; top 3–5 actions with points, effort, timing, dependency, CTA.
- FR-GOAL-01 Discover implicit goals but **ask confirmation** before creating; fields: name, amount (today/nominal), date, priority (Essential/Important/Aspirational), funding, probability, shortfall, dependencies.
- FR-TL-01 Timeline of milestones with dates, dependencies and score trajectory.

### 3.9 Engagement (B§13–§14, S11)
- FR-COMP-01 Nudge priority: Critical / High / Medium / Low / Habit. One message, one action, explain why, snooze/dismiss/frequency control.
- FR-GAME-01 XP, streaks, missions, badges, 10-level persona ladder, challenges, streak recovery; anti-gaming caps; XP table **[PROPOSED]**.

### 3.10 Advanced (B§16–§20)
- Portfolio Intelligence (suitability, diversification, goal alignment, liquidity, cost, tax, behaviour, drift) — product-specific recommendations must route through a regulated advisory framework.
- Personalised News: relevance + "why this matters to you"; never an automatic trade recommendation.
- Health Monitoring: green/amber/red vitals with configurable thresholds; distinguish health deterioration from data-quality deterioration.
- Family Wealth Graph: household aggregation with per-member privacy permissions.
- Copilot + Wealth OS: event-driven orchestration (salary credited, SIP missed, etc.).

### 3.11 Data connectivity (B§22, S14)
- Consent-led, progressive: user-provided first; connect sources (Account Aggregator, MF, insurance, bank, demat) only when it improves accuracy; show imports; allow correction; store provenance and consent scope. **Regulated source integration requires Product Owner approval.**

### 3.12 Compliance & governance (B§23)
Advice classification (education/information/planning/recommendation/regulated), risk profile, suitability, AI disclosure, full audit trail (input, data version, model version, rule version, output, rationale), human escalation, hallucination control, no LLM-only arithmetic, privacy, model governance.

### 3.13 Commercial (B§25–§26)
- Free vs paid tiers per B§25 table; monthly subscription. Plan prices and quotas **[PENDING]**.
- Metrics list per B§26; proposed north star "Verified Financial Progress".

## 4. Eight canonical wealth stages (S4; preserved verbatim)
| # | Stage | Score band | Proposed gamified name (B§8) |
|---|---|---|---|
| 1 | Dependency | 300–374 | The Starter |
| 2 | Survival | 375–449 | The Stabiliser |
| 3 | Security | 450–524 | The Protector |
| 4 | Stability | 525–599 | The Balancer |
| 5 | Accumulation | 600–674 | The Builder |
| 6 | Independence | 675–749 | The Accelerator |
| 7 | Freedom | 750–824 | The Liberator |
| 8 | Abundance | 825–900 | The Legacy Maker |

Bands are from the deck; final stage assignment is governed by the age × score matrix **[PENDING]**.

## 5. Frontend scope (S13, B§24)
12 screens: Ask FinScore, Conversation, FinScore Home, Financial DNA, Score Why, Coach, What-If, Action Plan, Wealth Timeline, Daily Companion, Gamification, Family. Home must answer in <10 s: where am I, why, what is good, what is weak, what next. Master prompt adds: authentication, goals, profile & memory, settings & subscriptions.

## 6. Product-team launch blockers (B§29 "Do not launch before")
Scoring methodology; age × score matrix; persona definitions/mapping; action library & deltas; simulation assumptions/methods; projection methodology & confidence ranges; data freshness rules; advice/compliance classification; human escalation policy.
