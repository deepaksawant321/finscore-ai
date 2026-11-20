# Finscore: Engagement & Gamification Design Recommendations

Status: design exploration only. Nothing here is implemented in the application. All prototype data is dummy data.

## 1. What Finscore already has (inspected, not invented)

Read from `README.md`, `docs/IMPLEMENTATION_TRACKER.md`, `docs/PRODUCT_DECISIONS.md` (D-B19), `frontend/src/app/globals.css`, `tailwind.config.ts`, `features/*` and `app/app/*`.

| Area | Exists today | Source |
|---|---|---|
| Score | Gauge (300–900), 8-stage ladder (Dependency → Abundance), explainability, confidence | `features/score/*` |
| Money Map journey | Chapters, "clarity points", badges (First Score, Protected, Tax-smart, Fine-tuned, Full Picture, Steady 4), weekly cadence | `features/journey/*`, D-B19 |
| Daily surface | "Today" nudges with reasons and preferences | `app/app/today` |
| AI | Wealth Coach (grounded Q&A), What-if simulator, DNA and persona, Goals, Actions, Health | `app/app/*` |
| Design language | Teal brand `#0FB5A6`, indigo AI accent `#4F46E5`, Space Grotesk + Inter, glass cards, light/dark, workspace theming | `globals.css` |
| House rules | LLM never calculates money or scores; no official score until rulebook approval | `README.md` |
| **Not built** | XP economy, missions, streak engine (M5-08 "Blocked on D-B19"; `/gamification/state` and `/missions` are only in the API spec) | tracker, API spec |

**Approved constraints for gamification (D-B19, 2026-11-18, for the Money Map):** clarity points and badges never affect any score, no leaderboards, weekly cadence that pauses instead of resetting, can be switched off. Point values are placeholders. Every concept below honours these.

## 2. Principles we designed to

1. **Education or habit first.** Each activity teaches one real idea or builds one real habit. Nothing is decoration.
2. **Points never touch the score.** Clarity points, levels and badges live in a separate ledger.
3. **Pause, don't punish.** Weekly cadence, no daily-streak loss, no guilt notifications.
4. **No ranking.** Quiz and sim results compare you only with your past self.
5. **Honest simulation.** Labelled hypothetical, never predicts, never rewards profit (points reward finishing and reflecting).
6. **Everything optional.** One switch hides all gamified surfaces (simple-experience users).
7. **Virtual rewards only.** Stickers, titles, badges. Never cash, discounts tied to trading, or paid spins.

## 3. The twelve concepts

Each answers: why open, what motivates completion, why return tomorrow, financial-awareness gain, discovery, and premium angle. "Builds on" = extends something that exists today; "New" = entirely proposed.

| # | Concept | Type | Why open / why return | Awareness & discovery | Premium angle |
|---|---|---|---|---|---|
| A | Financial Fitness Challenge | Builds on Today + Actions | A 5-minute finite checklist; weekly goals; cadence | Each challenge opens a different tool | Personalised weekly plans, history |
| B | Score Journey | Builds on Score + ladder | Visual story, time-travel slider, next milestone, "what could move my score" | Links actions to Coach, Goals, Health | Deeper driver analysis |
| C | Spin & Learn | New | 30-second daily surprise; one spin a day | One tip + one question; links to feature | Extra topic packs |
| D | Quiz Arena | New | Pick a level; daily challenge; personal best | Explanations on every answer | Pro-level question banks |
| E | Personality Test | Builds on DNA/persona | Curiosity; retake in 3 months | Tailors tips; links to Goals, What-if | Full report |
| F | Savings Goal Adventure | Builds on Goals | Trail map; every top-up moves you | Goal challenges (no-spend weekend) | Multiple goals, shared goals |
| G | Investment Simulator | New (sim) | Five hypothetical years; practice only | Diversification, drawdown, staying calm | Custom scenarios |
| H | Knowledge Cards | New | One-minute swipe lessons | Mini quiz per card | Learning paths |
| I | Achievement Center | Builds on Money Map badges | Collections, levels | Shows what to try next | Exclusive collections (cosmetic) |
| J | AI Coach Activities | Builds on Coach + Actions | Daily plan with "why this?" and grounding | Accept/snooze/skip, habits | Unlimited coach, richer plans |
| K | Independence Journey | Builds on Goals + What-if | Safety → debt → growth ladder; ranges | Extra-payment and retirement sliders | Household and tax-aware planning |
| L | Monthly Wrapped | New | Monthly moment; shareable (no amounts) | One link per slide | Deeper insights layer |

## 4. Evaluation of the prototypes

### User perspective
- **Attractive:** all three directions are polished; Premium is calmest, Playful is most delightful, AI-First is most distinctive.
- **Easy to understand:** each activity has a one-line promise, an obvious primary button and completion feedback.
- **Enjoyable / would users return:** daily micro-sessions (spin, 5 cards, quiz, plan) plus weekly and monthly moments are strong return hooks. **Caveat:** this is a prototype; real return rates must be measured (see section 7).
- **Risk:** a Playful look can feel childish to experienced investors. Mitigate with the global "simple mode" and the direction blend below.

### Product perspective
- Complements, does not replace, the existing score, Money Map, Coach, Goals and Today.
- Strongest discovery mechanism: every activity ends by pointing to a *real* feature.
- Overlap to resolve: Personality (E) vs existing DNA/persona (D-A8). Treat E as the on-ramp feeding DNA, not a second system.

### Business perspective
- **Retention:** daily (spin, cards, plan), weekly (cadence, quest map), monthly (Wrapped). Wrapped doubles as organic acquisition.
- **Premium support:** deeper coach and plans, learning paths, scenario packs, household goals, deeper Wrapped insights. Free tier keeps all core education, which is also the trust story.
- **Engagement:** expected to lift sessions per week; unproven until A/B tested.
- **Complexity:** low for H, C, D, L (static content + local state); medium for A, B, F, K, I (needs real data); highest for J (AI grounding) and G (compliance review).

### Technical perspective
- **Integration:** prototypes are vanilla HTML/CSS/JS with CSS variables mirroring the app's tokens, so components port to React + Tailwind directly. Direction themes map to the existing workspace-theme mechanism.
- **Data needed:** user facts and score history (exists), goals (exists), event stream of verified user actions (events outbox exists), a points ledger, badge catalogue, content bank (questions, cards, tips), weekly-cadence state.
- **Likely APIs:** `GET /gamification/state`, `GET /missions` (already in API spec), `POST /events` consumers for the ledger, `GET /content/daily` (cards, question, spin topic), `GET/POST /quiz/runs`, `GET /wrapped/{month}`.
- **Dependencies/risks:** D-B19 point economy sign-off; notification-fatigue (nudge rules exist); content accuracy review (compliance); AI grounding and regulated-question handling for J; sim wording review for G; share-card privacy review for L; accessibility and reduced-motion audit; idempotent, capped points ledger so points can't be farmed.

## 5. Visual directions

| | Premium Fintech | Gamified & Playful | AI-First Futuristic |
|---|---|---|---|
| Feel | Calm, elegant, data-forward | Bold, warm, game-like | Dark, glowing, intelligent |
| Closest to current brand | Closest | Furthest | Close (indigo AI accent) |
| Trust signal | Highest | Medium | High |
| Fun factor | Lower | Highest | Medium |
| Effort | Low | Medium-high | Medium |
| Best for | Regular users, investors | Beginners, daily habit | Tech-savvy users |

**Recommendation:** Premium as the base shell; a "lighter touch" playful layer (rings, quests, mascot) switchable for beginners; AI coach plan as the daily entry point. Do not ship three separate products.

## 6. Prioritised recommendations

### Top 5 to implement first
1. **AI Coach daily plan with "why this?" (J)**: highest differentiation, reuses existing Coach/Actions/Today, and the explainability builds trust.
2. **Score Journey enhancements (B)**: next-milestone card, before/after, "what could move my score" preview. Pure presentation over the existing score.
3. **Weekly Fitness Challenge + cadence (A)**: three-item checklist feeding the Money Map cadence. Daily/weekly return driver with low complexity.
4. **Knowledge Cards (H)**: cheapest content-driven daily habit, easy to localise and compliance-review.
5. **Achievement Center (I)**: extends the badges already in the Money Map; gives all other features a place to land.

### MVP candidates
A, B, H, I, J (read-only plan, accept/snooze/skip), and the Savings trail (F) as a skin over existing Goals.

### Phase 2
C (Spin & Learn), D (Quiz Arena), E (Personality → DNA), K (Independence ladder), L (Wrapped), richer J (habits, chat history).

### Avoid or reconsider
- **Public leaderboards or social ranking:** violates D-B19 and invites unhealthy comparison.
- **Real-money or discount rewards, paid spins:** gambling-adjacent and regulatory risk.
- **Profit-based scoring in the simulator:** would reward risk-taking. Keep points for learning only.
- **Daily streaks that reset to zero:** pressure and churn on a miss. Keep the pausing weekly cadence.
- **Push-notification-heavy loops:** respect existing nudge preferences; one gentle weekly summary is enough.
- **Letting the AI state numbers:** all figures must come from the engine (house rule).
- **Shareable cards with amounts:** privacy risk. Share progress, not balances.

## 7. Suggested measurement (for later)
Weekly active share, Money Map completion, 4-week retention of users who touched an activity vs those who did not, feature-discovery rate (activity → real feature click-through), quiz explanation read rate, opt-out/simple-mode rate (a guardrail: it should stay low but non-zero), and premium conversion from activity-origin sessions.

## 8. Prototype caveats
Dummy data; scripted "AI"; stage bands (75-point steps) and point values are illustrative placeholders, not the approved rulebook; quiz content is generic education and needs compliance review before use.
