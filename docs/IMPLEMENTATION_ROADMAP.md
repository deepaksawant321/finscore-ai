# FinScore AI — Implementation Roadmap

Effort units: **engineer-weeks (ew)**, rough ±40% at Phase 0, assuming a small team (≈3 engineers: backend/AI, full-stack/frontend, + design/QA part-time). Re-estimated at each phase start.

## 1. Reassessment of the proposed MVP order (dependency analysis)
Your sequence is sound; recommended adjustments:
| # | Adjustment | Why |
|---|---|---|
| R1 | **Pull core engines (cashflow, growth/SIP, retirement, debt) into MVP 2.** | The interview must give a *provisional deterministic answer* (B§2, §30); engines need no scoring approval. |
| R2 | **Minimal governance in MVP 2 (consent, AI disclosure, advice-class tag, escalation stub), full in MVP 3.** | No AI conversation should reach real users without disclosure/audit. |
| R3 | **Scoring runs on a watermarked demo rule set in MVP 2**; official FinScore only after D-B1–B4 approved. | Avoids blocking on Product while keeping architecture honest. |
| R4 | **Basic Goals CRUD in MVP 2; AI goal discovery in MVP 4.** | Interview intents (retirement, house) need somewhere to land. |
| R5 | **Event bus (outbox) skeleton in MVP 2**, Redis workers in MVP 4. | Wealth OS loop (verify→update) depends on events from the start. |
| R6 | **Entitlement flags (free/paid) hooks in MVP 2; billing provider in MVP 6.** | Avoid retrofit. |
| R7 | **Health Monitoring is cheap (score+profile only) → can move to late MVP 4/early 5.** | |
| R8 | **Defer Personalised News and connected data (AA)** until a cost/regulatory approval gate. | Recurring cost + regulated source (your approval rule). |
| R9 | Copilot (AC-18) last. | Depends on coach, companion, events, compliance. |

## 2. Phases
### MVP 1 — Platform Foundation (≈8–10 ew)
- **Scope:** monorepo, Docker dev env, FastAPI skeleton, Next.js shell + design-system tokens, Postgres + Alembic, auth (register/login/refresh/logout/verify/reset), users, roles, logging/errors, rate limit, health endpoints, CI (lint, type, test, security scan), docs.
- **Architecture:** per SYSTEM_ARCHITECTURE §3, import-linter contracts, OpenAPI → typed TS client.
- **Dependencies:** approvals (stack, hosting), D-B15, D-B16 (basic).
- **Risks:** auth scope creep; Windows/Docker dev friction; choosing email provider.
- **Acceptance:** `docker compose up` runs FE+BE+DB; register→login→me works E2E; health shows DB ok; CI green; ≥80% coverage on auth; migrations up/down tested; OWASP basics checklist passed.
- **Docs:** all updated; DEPLOYMENT_GUIDE dev section.

### MVP 2 — Core Financial Intelligence (≈14–18 ew)
- **Scope:** profile/memory (facts + provenance + versions + correction UI), engines v1, rulebook framework + demo rules, LLM gateway + prompt registry, interview (intent, extraction, confirm-chips, coverage map, next-question), canonical profile, scoring framework, explainability, DNA (rule-based), persona (rule-based), FinScore home, DNA, persona, score-why, profile/memory screens; consent + disclosure + audit; events skeleton; basic goals.
- **Dependencies:** MVP 1; D-B1–B5 for *official* output (else demo-watermarked); LLM provider + budget approval.
- **Risks:** extraction accuracy on Indian number formats; demo rules mistaken for official; scope.
- **Acceptance:** golden-set extraction ≥ agreed target; additivity & determinism invariant tests pass; every fact has provenance; user can correct a fact and see score re-version; production guard blocks unapproved rulebook; UI shows "demo" watermark.

### MVP 3 — AI Financial Assistant (≈8–10 ew)
Scope: Coach (4 modes), tool calling, context-aware memory retrieval, grounding guard, advice classification, escalation workflow + admin inbox, disclosure UX, suggested prompts. Dependencies: MVP 2; D-B9, D-B10. Risks: hallucinated numbers, regulatory perimeter. Acceptance: 0 ungrounded numbers in eval suite; red-team set 100% handled; escalation round-trip works.

### MVP 4 — Prediction and Action (≈12–14 ew)
Scope: projection core (seeded), Score Predictor, Simulator (NL→spec→engine), Goal Builder (discovery w/ confirmation), Action library + Prioritiser + state machine + verification, Timeline, Redis + worker introduced. Dependencies: D-B6, D-B7 approved (else demo-flagged). Risks: methodology approvals; Monte Carlo credibility. Acceptance: closed-form cross-checks (e.g. FV of SIP) exact within tolerance; seeded reproducibility; delta only from approved library.

### MVP 5 — Advanced Intelligence (≈14–18 ew)
Scope: Daily Companion + nudge rules, Gamification, Health Monitoring, Household graph, Portfolio Intelligence (manual holdings), Personalised News (**cost gate**), Copilot (read-only/hand-off), Wealth OS orchestration. Dependencies: D-B19, nudge thresholds, news provider approval, compliance for portfolio. Risks: notification fatigue, regulatory scope for portfolio. Acceptance: per AC table.

### MVP 6 — Commercial & Production (≈10–12 ew)
Scope: plans/entitlements, billing integration, B2B orgs/roles/API keys, MFA, performance & load tests, monitoring/alerting, backups/DR, pen-test, DPIA, UAT, production deploy (**approval required**). Dependencies: D-B13, D-B14, legal. Acceptance: load targets met, restore test, pen-test criticals closed, UAT sign-off.

**Total indicative:** ≈66–82 engineer-weeks ≈ ~6–8 months with 3 engineers (plus approval wait time). Connected data (AA) is **outside** this plan pending approval.

## 3. Cross-phase risks
| Risk | Mitigation |
|---|---|
| Rulebook not delivered | Demo rule set + production guard; weekly decision review |
| LLM cost overrun | model routing, caching, per-user budgets, cost dashboard |
| Regulatory perimeter unclear | advice classification + disabled regulated features; early Legal review |
| Scope explosion (20 capabilities) | acceptance criteria per capability; no dummy modules |
| Single-person knowledge | docs updated each phase; ADR log |

## 4. Definition of Done (every task)
Code + types + tests (unit/integration) pass in CI; migration included; docs/tracker/changelog updated; security checklist reviewed; no hardcoded secrets; demonstrated working locally with test evidence.
