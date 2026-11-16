# FinScore AI — Implementation Tracker

Updated: Phase 0. Status: Pending / In Progress / Completed / Blocked. Priority: Critical/High/Medium/Low. "Tests" column is filled with evidence (CI run / test ids) on completion. **Nothing below MVP 0 is started.**

## Phase 0 — Discovery & design
| ID | Module | Requirement | Pri | Status | Deps | Acceptance | Tests | Remarks |
|---|---|---|---|---|---|---|---|---|
| P0-01 | Docs | Read & extract both product docs | Critical | Completed | — | Requirements file complete | Manual review: 16 slides + 32 sections + appendix read | Slide 5 highlighting unreadable (KNOWN_ISSUES K-2) |
| P0-02 | Docs | Pillar list + dependency map | Critical | Completed | P0-01 | PILLAR_MAP.md | — | |
| P0-03 | Docs | Decisions/conflicts log | Critical | Completed | P0-01 | PRODUCT_DECISIONS.md | — | 12 conflicts, 21 open decisions |
| P0-04 | Docs | Architecture, DB, AI, security, API, UI, rulebook, testing, deployment, roadmap, costs | Critical | Completed | P0-01 | Files in docs/ | — | Awaiting PO approval |
| P0-05 | Governance | **PO approval of Phase 0** | Critical | Completed | P0-04 | Written approval of §D items | PO reply "Approve, proceed" (2026-11-13) | Items 8–10 (LLM provider, hosting, ★ pillars) still open; not needed for MVP 1 |

## MVP 1 — Platform Foundation (built 2026-11-13)
| ID | Module | Requirement | Pri | Status | Tests / evidence | Remarks |
|---|---|---|---|---|---|---|
| M1-01 | Repo | Monorepo, .gitignore, .env.example, README | Critical | Completed | `git init`; files present | Pre-commit hook not added (CI gitleaks instead) |
| M1-02 | Infra | docker-compose (postgres, backend, frontend, mailpit) | Critical | **In Progress — written, NOT run** | none | No Docker on this machine (K-10/K-12) |
| M1-03 | Backend | FastAPI app, config, logging, errors, request-id | Critical | Completed | pytest 29 passed; live `/health/ready` → `{"database":"ok"}` | |
| M1-04 | DB | Async SQLAlchemy + Alembic baseline (users, roles, sessions, email_tokens, audit_log, consents) | Critical | Completed | `test_migrations_up_down_up` incl. `alembic check` drift | Ran on PostgreSQL 16 (embedded) |
| M1-05 | Auth | Register/login/refresh/logout, Argon2id, JWT, rotation + reuse detection | Critical | Completed | 15 integration tests incl. reuse-detection, lockout, IDOR | HS256 (K-14) |
| M1-06 | Auth | Email verify + password reset | High | Completed | integration tests + manual browser run | Mailpit untested; FileMailer used locally |
| M1-07 | Security | Rate limit, CORS, headers, validation, RBAC deps | High | Completed | 429 test, Origin/CSRF test, problem+json test | In-memory limiter (K-15) |
| M1-08 | API | OpenAPI → typed TS client + drift check | High | Completed | `gen:api`, `tsc`, CI diff step | |
| M1-09 | Frontend | Next shell, Tailwind tokens, light/dark, primitives | High | Completed | vitest 6 passed; `next build` ok | Storybook deferred (K-16) |
| M1-10 | Frontend | Auth screens, protected layout, settings | High | Completed | Manual in-app-browser run: register→verify→login→reload→settings→logout→redirect | Playwright spec written, not run (K-13) |
| M1-11 | Architecture | import-linter contracts | High | Completed | `lint-imports`: 3 kept, 0 broken | |
| M1-12 | CI | GitHub Actions pipeline | Critical | **In Progress — written, NOT run** | none | Needs GitHub remote (K-12) |
| M1-13 | Obs | Structured logs with scrubbing | Medium | Completed | unit test for scrubber; log scan showed no email/token | Metrics/Sentry deferred |
| M1-14 | Docs | Update docs, CHANGELOG | High | Completed | | |
| M1-15 | Verification | Run full stack locally | Critical | Completed (without Docker) | Frontend:3000 → proxy → backend:8000 → PostgreSQL; screenshots not captured (pane hidden), DOM text evidence recorded | |

## MVP 2–6 epics (Pending; detailed into tasks at each phase start)
| ID | Module | Epic | Pri | Deps | Blocking decisions |
|---|---|---|---|---|---|
| M2-E1 | Profile/Memory | Facts, provenance, versions, correction | Critical | M1 | — |
| M2-E2 | Engines | cashflow/growth/retirement/debt v1 + property tests | Critical | M1-11 | assumption defaults (D-B7) → demo flagged |
| M2-E3 | Rulebook | Framework, validator, production guard, demo rule set | Critical | M1 | D-A1, §D4 approval |
| M2-E4 | AI | Gateway, prompt registry, structured outputs, eval harness | Critical | M1 | LLM provider/budget approval |
| M2-E5 | Interview | Intent, extraction, chips, coverage, next-question | Critical | E1,E4 | — |
| M2-E6 | Scoring+Explain | Framework, runs, explain, stage resolver | Critical | E2,E3 | D-B1–B4 for official |
| M2-E7 | DNA+Persona | Rule-based | High | E1,E6 | D-B5 |
| M2-E8 | Governance | Consent, disclosure, audit, escalation stub | Critical | M1 | D-B9 |
| M2-E9 | Frontend | Interview, home, DNA, persona, score-why, memory | Critical | above | — |
| M3-E1 | Coach | Modes, tools, grounding, advice class, escalation | Critical | M2 | D-B9, D-B10 |
| M4-E1 | Projection/Predictor/Simulator | Seeded engines + UI | Critical | M2 | D-B7 |
| M4-E2 | Goals/Actions/Timeline | Discovery, library, ranking, verification | High | M2 | D-B6 |
| M4-E3 | Infra | Redis + worker | High | — | cost approval |
| M5-E1..E8 | Companion, Gamification, Health, Household, Portfolio, News, Copilot, Wealth OS | High/Med | M4 | D-B19, news/AA gates |
| M6-E1..E5 | Billing, B2B, security hardening, perf/monitoring, UAT+deploy | Critical | M5 | D-B13, D-B14; deploy approval |

## MVP 2 — Core Financial Intelligence: progress (2026-11-13) — **partially complete**
Evidence: backend `pytest` 93 passed (engines 37, unit 27, integration 29 incl. migrations); ruff/mypy/import-linter clean; frontend tsc/lint/vitest(6)/build clean; full journey exercised in the in-app browser against real PostgreSQL.
| ID | Epic | Status | Evidence / remarks |
|---|---|---|---|
| M2-E1 | Profile/Memory (versioned facts, provenance, correction, history) | Completed | `test_user_correction_creates_version…`, precedence test, partial unique index; encrypted conversation text test |
| M2-E2 | Engines v1 (money parsing, cashflow, debt/EMI, growth/SIP, retirement, score, stage, traits) | Completed | 37 engine tests incl. independent-simulation and hypothesis property tests; EMI golden ₹43,391.16 |
| M2-E3 | Rulebook framework + demo rules + production guard | Completed | `test_production_settings…`, `test_score_needs_data_and_is_blocked_in_production` (503 in production) |
| M2-E4 | AI layer (gateway, prompt registry, grounding guard, evals) | **In Progress** | Gateway + mock + Anthropic adapter written; **Anthropic adapter never called (no key/approval)**; eval set is unit tests only, no golden-set metrics yet |
| M2-E5 | Interview (intents, extraction, confirm chips, coverage, selector) | Completed (rule-based) | LLM extraction is optional and unexercised against a real model; replies are templates |
| M2-E6 | Scoring + Explain + stage resolver | Completed (demo rules) | additivity/determinism/monotonicity tests; stage provisional; **early-estimate rule** (PLACEHOLDER) |
| M2-E7 | DNA + Persona | Completed (demo rules, 2 traits, 3 demo personas) | Trait history/evolution not yet stored (K-18) |
| M2-E8 | Governance | Completed (2026-11-13, second pass) | Consent gate, audit, AI disclosure; **export, erasure, advice classification, regulated-ask guard, distress path, escalations (user + staff APIs)** — see MVP 2 follow-up below |
| M2-E9 | Frontend (interview, home/score, explain, DNA, memory) | Completed | Manual browser run; Playwright e2e not extended (K-13) |
| — | Goals CRUD (roadmap R4) | Completed (second pass) | CRUD + funding view under user-chosen assumptions; AI goal discovery stays in MVP 4 |
| — | Events skeleton, entitlement hooks (roadmap R5, R6) | **Not started** | |

### MVP 2 follow-up: governance gaps + goals (2026-11-13)
Evidence: backend `pytest` 122 passed (+29: advice/goals unit 19, governance/goals integration 10, commit-order regression 1, token-liveness 1 in auth); ruff/mypy/import-linter clean; frontend tsc/lint clean, build ok; verified in the in-app browser: goals + funding, support request, data export download, consent toggle, erasure schedule/cancel, regulated-question decline + human escalation.
| ID | Item | Status | Evidence / remarks |
|---|---|---|---|
| G-01 | Data export (`GET /users/me/data-export`) | Completed | Complete bundle for the owner, decrypted conversations; test proves no other user's data, no password hash/tokens; rate limited; recorded in `data_requests` |
| G-02 | Erasure (`/users/me/erasure-request`) | Completed (interim policy) | Password re-auth, 7-day cooling-off (PLACEHOLDER, D-B16), cancellable, purge runs itself via an in-process scheduler (see slice below, K-25 resolved) and cascades to all personal data; completion record + hash-chained audit survive with opaque ids. |
| G-03 | Advice classification + guard | Completed (keyword baseline) | Every assistant message tagged; `regulated` class blocked by default; requests for stock/fund picks or guaranteed returns are declined and a human review is offered. Perimeter itself still PENDING (D-B9) |
| G-04 | Human escalation | Completed (API + user UI; no staff UI) | Create/list own, staff queue + update (roles re-checked in DB per request), staff reads are audited, notes encrypted, short placeholder SLA for distress (4h) else 48h (D-B10) |
| G-05 | Distress path | Completed (baseline) | Supportive message + helpline + auto-flag for a human; sensitive text is NOT copied into the ticket |
| G-06 | Goals CRUD + funding view | Completed | Validation, ownership (404 on others), 50-goal cap, audit; funding endpoint REQUIRES explicit return/inflation assumptions (no hidden defaults) and returns them |
| G-07 | Access token liveness | Completed (bug found while testing) | Access tokens now die immediately on logout, session revoke, password reset and erasure (one indexed query per request) |
| G-08 | Commit-before-response | Completed (bug found while testing) | DB commit previously ran AFTER the response was sent, so a fast UI refetch could miss a just-written row. Fixed with function-scoped session dependency; regression test fails without the fix |

## MVP 3 — AI Financial Assistant (started 2026-11-13, partial)
Evidence: backend `pytest` 162 passed (+40: coach unit 28 incl. routing golden set and red-team lists, coach integration 12); ruff/mypy/import-linter clean; frontend tsc/lint/tests/build clean; coach checked in the in-app browser (explain, goal check without goals, regulated-question decline). The real LLM was NOT exercised (no provider approved); LLM paths are tested with a mock only.
| ID | Item | Status | Evidence / remarks |
|---|---|---|---|
| M3-01 | Coach API (`/coach/*`), consent-gated, disclosure, suggested prompts | Completed | `test_coach_requires_ai_consent_and_shows_disclosure`; transcript persisted, messages encrypted |
| M3-02 | Deterministic router + 9 read-only tools (score, explain, change, stages, profile, missing data, goals, goal status, act) | Completed (English keyword baseline) | routing golden tests; tools take the caller's user id from the session only |
| M3-03 | Modes: Explain, Diagnose, Simulate (goal check only), Act | Partial | **Act is a stub**: no approved action library (D-B6), so it says so and shows drivers instead. **Simulate** only checks stored goals with assumptions the user states (D-B7); free-form scenarios arrive in MVP 4 |
| M3-04 | Grounding guard on LLM text | Completed (mock-tested) | Reply used only if every number appears in the engine facts; else template fallback + `coach_runs` row (`ungrounded_number`, `unsafe_class`, `llm_unavailable`). Numbers planted in the user's message are NOT allowed through (injection test) |
| M3-05 | Guards: distress, regulated ask, "talk to a human" | Completed | Reuse governance rules; human request opens a `user_request` escalation |
| M3-06 | Coach audit (`coach_runs`, audit `coach.turn`) | Completed | Migration 0004; stores mode/tools/flags only, no text or values |
| M3-07 | Coach UI (`/app/coach`) | Completed | Suggested prompts, "numbers from engine" badge, consent step |
| M3-08 | Staff inbox UI (`/app/staff`) | Completed | Visible only to support/compliance/admin (API re-checks roles in DB); filter, assign to me, resolve with note; checked in the in-app browser. Roles are still granted by CLI; no escalation detail view or user messaging |
| M3-09 | Eval suite: "0 ungrounded numbers", red-team 100% | Partial | 13 routing cases, 8 regulated + 4 distress red-team lines, injection + fallback tests, and an adversarial-model eval over 12 prompts (a model that always invents numbers never changes any reply). Still no large golden set and no real-model run |
| M3-10 | Free-form conversational answers / general education content | **Not built by design** | Anything outside the nine tools gets a capability menu; approved education content and the advice perimeter (D-B9) are needed first |

## MVP 4 - Prediction and Action (started 2026-11-13, slice 1: what-if simulator)
Evidence: backend `pytest` 185 passed (+22: simulate engine 11 incl. a property test against the closed-form SIP formula, simulation API 7, coach what-if 2, routing 2); ruff/mypy/import-linter clean; frontend tsc/lint/build clean; simulator checked in the in-app browser (invest result matches the independent formula; score what-if shows the demo badge).
| ID | Item | Status | Evidence / remarks |
|---|---|---|---|
| M4-01 | Projection core (`engines/simulate.py`) | Completed | Pure, Decimal, month-end contributions, no default rates; iteration agrees with closed form within 0.02 (property test) |
| M4-02 | Simulations API (`/simulations`) + table (migration 0005) | Completed | 3 scenario kinds, discriminated union, encrypted at rest, private (404 for others), in data export, rate limited |
| M4-03 | Scenario: invest monthly | Completed | Return is required, inflation optional (adds today's-rupees value); nothing is stored but the run itself |
| M4-04 | Scenario: change my numbers (score what-if) | Completed (demo rules) | Reuses the exact scoring derivations (`derive_inputs`); saves no facts or score runs; production returns 503 until rules are approved; watermarked |
| M4-05 | Scenario: fund a goal differently | Completed | Before/after via the same funding view as the goals page; the stored goal is untouched |
| M4-06 | Coach what-if (invest, expenses) + What-if page | Completed | Coach parses amounts/years/return deterministically and asks for missing assumptions |
| M4-07 | Score Predictor (score over time) | **Not started** | Needs approved action deltas and persistence rules (D-B6) |
| M4-08 | Action library (DEMO), prioritiser, state machine, verification, Timeline | Completed (demo-flagged) | See slice 2 below. The library, targets and scales are placeholders (D-B6); score effects are computed per user by the score engine |
| M4-09 | Monte Carlo ranges (seeded) | **Not started** | Method and ranges are PENDING (D-B7) |
| M4-10 | Goal builder (discovery with confirmation) | **Not started** | |
| M4-11 | Redis + worker | **Deferred by design** | Not needed for synchronous what-ifs; adopting it is an infrastructure/cost decision for you |

### MVP 4, slice 2: demo action library, prioritiser, state machine, verification, timeline (2026-11-13)
Evidence: backend `pytest` 200 passed (+15: action engine 8, actions API 7); ruff/mypy/import-linter clean; frontend tsc/lint/build clean; in the in-app browser: ranked list, accept, "I've done it" (stays "waiting for your numbers"), fact updated, refresh verified it, score recomputed, timeline shows each step.
| ID | Item | Status | Evidence / remarks |
|---|---|---|---|
| A-01 | Demo action library in the Rulebook (`actions.library`, 5 actions) | Completed (PLACEHOLDER, watermarked) | Each action is a concrete change to stated facts; targets (6 months of expenses, 30% savings rate, 25% EMI share), effort, urgency and timing are placeholders |
| A-02 | Score effect per action | Completed | Computed as score(after change) - score(now) by the score engine; test proves it equals the simulator's result; actions with no positive computed effect are not offered |
| A-03 | Prioritiser (composite 0-100) | Completed (weights PROPOSED) | impact 30 + money 25 + urgency 20 + ease 10 + confidence 10 + goals 5, impact/money relative to today's candidates; breakdown stored and shown; deterministic, ties by key |
| A-04 | Only known gaps become actions | Completed | Unknown data never creates an action (it is an interview question); closed gaps withdraw the offer |
| A-05 | State machine + audit + events | Completed | suggested/snoozed/accepted/in_progress/completed/verified/skipped/expired; illegal moves return 409; skipped actions are not re-suggested; snooze 1-90 days (placeholder) |
| A-06 | Verification | Completed | "Done" is not proof: verified only when the user's own numbers meet the target; linked to the proving fact; recomputes the score |
| A-07 | Timeline (`/timeline`, Actions page) | Completed | Action events + score runs |
| A-08 | Coach "what should I do" | Completed | Top 3 with engine numbers and demo caveats; no invented actions |
| A-09 | Gamification/XP, nudges, reminders for snoozed actions | **Not started** | MVP 5 |

## MVP 5 - Advanced Intelligence (started 2026-11-13, slice 1: Daily Companion)
Evidence: backend `pytest` 215 passed (+15: nudge rules 8, nudge API 7); ruff/mypy/import-linter clean; frontend tsc/lint/tests/build clean; in the in-app browser: home "Today" card, Today page, dismiss (stays dismissed), preferences.
| ID | Item | Status | Evidence / remarks |
|---|---|---|---|
| M5-01 | Daily Companion nudge rules (7) | Completed (thresholds PLACEHOLDER) | next best action (single), update numbers after an action, stalled action, goal deadline, stale fact (single stalest), score moved, data gap; pure rule module, unit-tested at the boundaries |
| M5-02 | One message, one action, with the reason | Completed | every nudge has a body that says why, and one call to action |
| M5-03 | Snooze / dismiss / done; no repeat after refusal | Completed | a dedupe key is never re-created once a nudge exists in any state; resolved situations expire the nudge |
| M5-04 | Preferences and frequency control | Completed | in-app on/off, 1-10 at a time (default 3, placeholder), mute by type; muted types are not generated |
| M5-05 | Opt-out metric | Completed (data only) | dismissals/mutes are audit events carrying the rule key and no content; no dashboard yet |
| M5-06 | Today page + home card | Completed | home shows the single top nudge |
| M5-07 | Delivery outside the app (email, push, SMS) | **Not started - approval gate** | needs channel choice, consent purpose and cost approval; nudges also refresh only when the user opens the app (no worker, K-35) |
| M5-08 | Gamification (XP, streaks, badges, missions) | **Blocked on D-B19** | XP economy approval needed; must never change the score |
| M5-09 | Health monitoring | Completed (demo thresholds) | See slice 2 below |
| M5-10 | Household / family graph | **Not started** | needs per-member permission design and your approval of the privacy model |
| M5-11 | Portfolio intelligence (manual holdings) | **Not started - compliance gate** | no product-specific recommendations until the advice perimeter (D-B9) is approved |
| M5-12 | Personalised news | **Not started - cost gate** | provider and licence cost need your approval (roadmap R8) |
| M5-13 | Copilot (pre-action checks, hand-offs) | Completed (slice 3) | Wealth OS event orchestration still not started | 

### MVP 5, slice 2: Health Monitoring (2026-11-13)
Evidence: backend `pytest` 245 passed (+30: health engine 21, health API 9); ruff/mypy/import-linter clean; frontend tsc/lint/build clean; in the in-app browser the Health page showed 5 vitals with amber/green/red, the overall status and a separate data-quality verdict.
| ID | Item | Status | Evidence / remarks |
|---|---|---|---|
| H-01 | Five vitals with green/amber/red (savings rate, emergency cushion, EMI share, health cover, term cover) | Completed (PLACEHOLDER thresholds, watermarked) | boundary tests for every cut-off; thresholds live in the Rulebook (`health.vitals`) |
| H-02 | Overall = worst known vital; unknown vitals never improve or worsen it | Completed | engine tests |
| H-03 | Data quality as a SEPARATE verdict (good/fair/poor) | Completed | measured share + freshness; a user can have poor health with good data, or the reverse |
| H-04 | Health deterioration vs data-quality change | Completed | `health_worse`/`health_better` are health; `newly_measured`, `went_stale`, `refreshed` are data quality. A vital that turns red only because it was measured for the first time is reported as new information, not a decline |
| H-05 | Recorded checks (history) | Completed | a snapshot is written only when values or freshness change (digest); encrypted at rest; history endpoint |
| H-06 | Health alerts through the Daily Companion | Completed | new `health_alert` nudge (high when red) only for genuine decline; never for stale or newly measured data; mutable like other nudges |
| H-07 | Health page | Completed | status shown by word and shape as well as colour |
| H-08 | Thresholds by age, income and household | **Not started** | official design says configurable per segment (B18); needs Product input |
| H-09 | Proactive checks without opening the app | **Not started** | needs the worker (K-35) |

### MVP 5, slice 3: AI Financial Copilot (2026-11-13)
Evidence: backend `pytest` 268 passed (+23: copilot engine 12, copilot API 11); ruff/mypy/import-linter clean; frontend tsc/lint/build clean; in the in-app browser: "Check before you accept" on an action, "Check affordability first" on the goal form, and the hand-off "Ask a person to review this" button, which created a real support request (confirmed via the API).
| ID | Item | Status | Evidence / remarks |
|---|---|---|---|
| C-01 | Pre-action affordability check (income vs. everything committed each month) | Completed | plain arithmetic, not a Rulebook item; shared between action checks and goal checks; a deficit is a blocker, a thin margin (demo: 5% of income) is a warning |
| C-02 | Checks are scoped to what the decision actually changes | Completed (bug found while testing) | the first version attached "this would commit ₹X a month" to actions that add no recurring monthly amount (buying insurance, reallocating savings into an emergency fund), misattributing the user's pre-existing cash-flow position to an unrelated decision. Fixed: the affordability check now only runs for actions that change a recurring amount (raise savings rate, lower EMI); regression test added |
| C-03 | Action-specific notes (large cut, needs a lender, target not immediate, product choice) | Completed (demo thresholds) | a savings-rate cut ≥30% (placeholder) is flagged; EMI changes and insurance purchases are explicitly said to need the user or a lender, never the Copilot |
| C-04 | Hand-off, never execution | Completed | a `hand_off` finding only offers an "ask a person" button wired to the existing escalation API; nothing is ever executed or recommended by product name; a check never changes an action's state or the user's facts/goals (tested) |
| C-05 | `/copilot/actions/{id}/check`, `/copilot/goals/check` | Completed | private (404 for other users), audited (rule/level/hand-off only, no message text or amounts), no new table (reuses the audit log) |
| C-06 | Actions and Goals page integration | Completed | "Check before you accept" per action; "Check affordability first" on the new-goal form |
| C-07 | Wealth OS (event-driven orchestration across all 20 capabilities) | **Not started** | current domains call each other directly (e.g. nudges call the health checker); an event/outbox layer is a larger architectural piece, not yet justified by load |

## Cross-cutting: erasure purge scheduler (2026-11-13)
Evidence: backend `pytest` 280 passed (+12: scheduler timing unit tests 9, end-to-end lifespan-driven purge integration tests 3, including a manual browser/API run that registered an account, requested erasure, restarted the app and confirmed the account was gone and login then failed with no CLI step); ruff/mypy/import-linter clean.
| ID | Item | Status | Evidence / remarks |
|---|---|---|---|
| P-01 | In-process purge scheduler (`app/domains/privacy/scheduler.py`) | Completed | runs `PrivacyService.purge_due` immediately on app start, then every `PURGE_INTERVAL_SECONDS` (placeholder 3600); `PURGE_SCHEDULER_ENABLED` (default on) |
| P-02 | Resolves K-25 | Completed | erasure no longer depends on an operator remembering to run the CLI; the CLI command remains for manual/ad hoc use |
| P-03 | Safe under a bad run or multiple instances | Completed | one failing run is logged and does not stop future runs (tested); `purge_due` only touches rows still pending and due, so more than one instance running it is redundant, not harmful |
| P-04 | A real job queue (Redis + worker, T-6) | **Not started by design** | this is explicitly the interim, no-new-infra answer; a real worker is the right call once horizontal scaling needs one for other async work too |

## Cross-cutting: fintech UI refresh + SaaS workspace screens (2026-11-16)
Evidence: frontend `tsc`, `next lint`, `vitest` (72 passed) and `next build` clean; checked in the in-app browser against a throwaway mock API (home, setup, branding, phone layout and More sheet); public pages checked directly.
| ID | Item | Status | Evidence / remarks |
|---|---|---|---|
| UI-01 | Tokens, fonts, white-label theme provider | Completed | `src/lib/theme/*` + 7 unit tests; live re-theme confirmed in browser |
| UI-02 | Design-system primitives | Completed | `src/design-system/*` + 11 tests |
| UI-03 | App shell (rail, top bar, mobile tabs), grouped nav, auth screens, landing | Completed | no horizontal overflow at 390 px; nav tests extended |
| UI-04 | Home score card, stage ladder, next-step card | Completed | ring settles at the exact value (64% for 684) |
| UI-05 | Restyle of remaining customer pages | Completed (pattern swap) | headings, buttons, chat bubbles, driver bars, Memory source badges; **not individually inspected in a browser** |
| UI-06 | Workspace admin screens (demo data) | Completed | 5 routes, 12 logic tests; K-42 |
| UI-07 | Run against the real backend with a real login | Completed (2026-11-16) | login, 13 customer pages, coach question, what-if run, workspace go-live flow, team invite and seat limit, billing toggle, dark mode, logout; no horizontal overflow on any page at 390 px. Found and fixed: early estimate must not announce a stage on the ladder; Team table overflowed on phones; copying the snippet could be blocked by the browser and leave Go live locked |
| UI-08 | Organisation, API-key, usage and billing backend | Completed (2026-11-16), payments excluded | 5 new tables (migration 0010), 24 endpoints under `/orgs` and `/partner`, 26 new backend tests (428 in total), workspace screens moved to the real API. Verified in a browser against the real backend: create workspace, upgrade, go live, branding stored server-side, invite and accept, role-limited views, key rotation with grace period, invoice. K-45 to K-48 |
