# FinScore AI — Implementation Tracker

Updated: 2026-11-18. Status: Pending / In Progress / Completed / Blocked. Priority: Critical/High/Medium/Low. "Tests" column is filled with evidence (CI run / test ids) on completion. Phase 0 and MVP 1 are complete; MVP 2 to MVP 6 are partly built (sections below).

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
| — | Events skeleton (roadmap R5) | Completed (2026-11-16) | Outbox table `domain_events` (migration 0009) + in-process dispatcher; see W-01..W-04 below |
| — | Entitlement hooks (roadmap R6) | Completed for workspaces (2026-11-16) | Plan limits for seats, modules, go-live and branding in `organizations/plans.py` (UI-08); no per-user (consumer) entitlements yet |

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
| C-07 | Wealth OS (event-driven orchestration across all 20 capabilities) | Partial (2026-11-16) | An outbox event layer now exists (W-01..W-04 below). Only 4 event types and one handler (refresh actions and nudges); most domains still call each other directly |

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

## Cross-cutting: Wealth OS event layer (2026-11-16, recorded 2026-11-18)
Evidence: `tests/integration/test_wealth_os.py`, `tests/unit/test_interval_scheduler.py`. This shipped in the 2026-11-16 commit but was not recorded here until the 2026-11-18 review.
| ID | Item | Status | Evidence / remarks |
|---|---|---|---|
| W-01 | Outbox table `domain_events` (migration 0009) | Completed | `bus.publish` only adds a row in the same transaction as the write that caused it, so the event and the write land together or not at all |
| W-02 | Publishers | Completed | `fact_changed` (profile), `score_computed` (scoring), `goal_updated` (goals), `action_verified` (actions) |
| W-03 | In-process dispatcher (`app/domains/events/dispatcher.py`) | Completed | Polls every `WEALTH_OS_INTERVAL_SECONDS` (placeholder 15), one event per transaction, gives up after `WEALTH_OS_MAX_ATTEMPTS` (placeholder 5) and logs it; `WEALTH_OS_ENABLED` default on |
| W-04 | Handler: refresh actions and nudges | Completed | Actions and Today now update in the background after a data change (narrows K-35/K-37). Time-only triggers (a goal deadline approaching with no data change) still wait for the user to open the app |

## Cross-cutting: workbook-based (15-factor matrix) FinScore (2026-11-16, recorded 2026-11-18)
Evidence: `tests/engines/test_matrix_score.py`, `tests/integration/test_matrix_score.py`, `tests/unit/test_matrix_adapter.py`, `tests/unit/test_matrix_catalogue_fields.py`, frontend `score/matrix` and `features/matrix-score` tests. Details in CHANGELOG 0.5.4 to 0.5.7.
| ID | Item | Status | Evidence / remarks |
|---|---|---|---|
| X-01 | Engine (`engines/matrix_score.py`, `finmath.py`) and draft rules `matrix-0.1.0-draft` | Completed (DRAFT rules) | Reproduces the workbook totals; refused in production |
| X-02 | Profile catalogue fields for all 15 factors + adapter | Completed | |
| X-03 | `POST /score/matrix/compute` + `/app/score/matrix` screen + home card | Completed | Stateless: no history or trend |
| X-04 | **Which FinScore is the product's score** | **Blocked - Product decision** | The 20-pillar score still drives Home, Score, Actions, Health and the partner API; the workbook model is the business's own model. 19 open questions in `docs/rules/FINSCORE_RULES_SPEC.md` section 10 |

## Review fixes (2026-11-18)
Evidence: backend `pytest` (full suite) green with 3 new tests; ruff/mypy/import-linter clean.
| ID | Item | Status | Evidence / remarks |
|---|---|---|---|
| R-01 | Data export now includes actions (with state history), nudges, nudge preferences, health checks and the user's own workspace memberships (`format_version` 2) | Completed | `test_data_export_includes_actions_nudges_health_and_workspaces`: decrypted for the owner; no API keys, invite tokens or other users' data |
| R-02 | Partner API burst limits | Completed | Per key (`PARTNER_RATE_PER_KEY_PER_MINUTE`, placeholder 120) on every plan, and per address before authentication (`PARTNER_RATE_PER_IP_PER_MINUTE`, placeholder 600) to slow key guessing. Throttled calls are not billed. In-memory like the rest of the limiter (K-15). Tests: `test_partner_api_is_rate_limited_per_key_on_every_plan`, `test_partner_api_limits_one_address_trying_many_keys` || R-03 | Interview: clear answers are saved straight away (Undo / Change), only unclear ones wait for a check | Completed | Rules in AI_ARCHITECTURE.md ("Auto-save of clear answers"). Tests: `test_clear_answer_is_saved_without_asking_and_marked_unconfirmed`, `test_undo_removes_an_auto_saved_fact_and_is_audited`, `test_edit_of_an_auto_saved_fact_is_a_correction`, `test_a_different_value_for_a_known_field_is_never_auto_saved`, `test_undo_after_the_fact_was_corrected_elsewhere_is_refused`, `test_an_amount_about_something_else_is_not_saved_as_the_answer_to_my_question`, unit `test_only_a_short_reply_counts_as_a_clear_answer_to_my_question`. Found while checking: a long message was taken as the answer to the pending question ("my wife earns 12 lakh" saved as liquid savings); fixed by the short-reply rule |
| R-04 | Proposal status was not reliably saved after a decision | Completed (bug found while testing) | The proposals JSON was edited in place, so the ORM could miss the change; now marked with `flag_modified`. A second Undo is a no-op (tested) |
| R-05 | Memory page: "Saved from chat · not confirmed" badge and a Confirm button | Completed | Confirm re-states the same value, which marks the fact confirmed without a new version |

## Quick journey (2026-11-18) - approved plan, phases 1 and 2
Evidence: backend `pytest` 444 passed (`tests/integration/test_quick_score.py` 5 new); frontend 86 passed (`features/quick-score/logic.test.ts` 8 new); ruff/mypy/import-linter/tsc/lint clean; walked through in the in-app browser with a throwaway account: one screen -> 667/900 at 90% confidence (13 of 15 areas), improve card answer recalculated the score, Memory page labels.
Decisions taken by the PO on 2026-11-18: the quick journey shows the workbook (15-factor) score; planning assumptions retirement 60, money lasts to 85, risk comfort by age, all labelled "assumed"; exact amounts with shortcut chips; phases 1-2 now, document upload / Account Aggregator later and only with approval.
| ID | Item | Status | Evidence / remarks |
|---|---|---|---|
| Q-01 | `POST /quick-score`: one screen of answers -> facts -> workbook score in one call | Completed | Answers stored USER_STATED (`source_ref=quick_score`); equity/debt split from the mix chip (20/50/80% equity, PLACEHOLDER) and the planning assumptions stored ESTIMATED (`assumed:<what>`), never over a stated value |
| Q-02 | Logical derivations (`profile/derive.py`) | Completed | no EMIs -> no loans; no health insurance -> cover 0 and 80D 0; cover amount -> insured or not; life cover 0 -> no term plan. Recorded DERIVED, withdrawn again when the condition stops holding; applied after quick score, chat turns, chat confirmations and Memory edits |
| Q-03 | `/app/start` screen | Completed | 13 questions (loans and the children question only when they apply), chips + shorthand amounts ("1.5L", "50k", "2 cr"), pre-filled from what the user already said, progress bar; Home sends new users here; chat stays as "Prefer to talk?" |
| Q-04 | `GET /score/matrix/improve` + "Make your score more complete" card (Home, score page) | Completed | One question at a time ranked by score weight it unlocks; assumed values ranked at half weight, with "That's right" to keep them. Built as its own card rather than a Daily Companion nudge, because nudges are tied to the 20-pillar rules |
| Q-05 | Chat skips what does not apply | Completed | Never asks home ownership (no score uses it), children's savings with no children, or anything already derived/assumed |
| Q-06 | Memory page labels | Completed | "Assumed" badge with "That's right"; "Worked out from your other answers" for derived values; keeping an assumption makes it the user's own value |
| Q-07 | Document upload / Account Aggregator | **Not started - approval gate** | Regulated / paid data sources (K-7) |
| Q-08 | Health, Actions and the 20-pillar score from quick answers | **Not done** | The quick screen asks one savings total, so `liquid_assets` (emergency cushion) stays unknown; the 20-pillar pages fill in as before |

## Money Map: the interview as a game (2026-11-18) - approved plan, phases 1 and 2
Evidence: backend `pytest` 449 passed (`tests/integration/test_journey.py` 5 new; migration 0011 passes the up/down/drift test); frontend 95 passed (`features/journey` 9 new); ruff/mypy/import-linter/tsc/lint clean; walked through in the in-app browser with a throwaway account: Snapshot by chip taps only -> 674/900 at 69% measured after 7 answers, an instant fact after every answer, +60 points and the "First score" badge, "Not sure" and "Keep it" on assumptions.
PO decisions (2026-11-18): the journey replaces the one-screen quick score (`/app/start` now redirects); clarity points and badges approved (resolves D-B19 for this scope) on condition that they never change any score and there are no leaderboards; streak is weekly and pauses instead of resetting; instant facts are age-band comparisons only.
| ID | Item | Status | Evidence / remarks |
|---|---|---|---|
| J-01 | Six chapters of cards (`domains/journey/chapters.py`) built on the field catalogue | Completed | Snapshot, Family & protection, Future you, Safety net, Tax smart, Fine-tune. Cards that do not apply are skipped (loans only with EMIs, children's savings only with children, term plan only with life cover); chapters after Snapshot unlock once the score has appeared |
| J-02 | `GET /journey`, `POST /journey/answer`, `POST /journey/keep` | Completed | Answers are USER_STATED (`source_ref=journey`); the savings card stores the same estimated equity/debt split as the quick score; age sets the same labelled planning assumptions; derivations run after each answer |
| J-03 | Instant facts | Completed | One sentence per answer from the score engine ("Cash flow: 7/10 for your age group (51-60%)"), never the LLM, never product advice; safety net shows months of spending covered |
| J-04 | Score measured meter, chapter-complete screen with an audited score and the change since the last chapter | Completed | Between answers the meter uses an unaudited preview (no score shown); a score is only shown from an audited calculation |
| J-05 | Clarity points, badges, active weeks (`user_progress`, migration 0011) | Completed (point values PLACEHOLDER) | +10 first answer, +5 assumption replaced or kept, +50 chapter, +10 weekly check-in; nothing for re-stating a known value. Badges: First score, Protected, Tax smart, Fine-tuned, Full picture, Four active weeks. Tested: points never change the score (same digest) |
| J-06 | Weekly check-in | Completed | Offered in a week with no activity yet, once per week; a missed week pauses the count |
| J-07 | Off switch | Completed | Settings > Points and badges; answers keep working and facts stay; progress is in the data export (`money_map`, format 3) and erased with the account |
| J-08 | Home and score page entry ("Start my Money Map" / "Continue your Money Map"), nav entry | Completed | Replaces the quick-score card and the one-question "improve" card (the `GET /score/matrix/improve` API stays) |
| J-09 | Reminders outside the app for the weekly check-in | **Not started - approval gate** | Channel, consent purpose and cost (M5-07) |

## Audit Phase 1: critical fixes (2026-11-18) - approved by the PO
Evidence: backend `pytest` 466 passed; ruff, ruff format, mypy, import-linter clean; frontend tsc, lint, vitest (98) and `next build` clean;
OpenAPI and TS client in sync. Walked through in a browser against a separately started API and production build (ports 8003/3001):
landing (no tenant brand, planted legacy theme deleted), sign-up refused without the terms box then accepted, verify, login,
Snapshot answered (540/900), Home, Score, old URL redirect, Health "Incomplete", coach (score, "why is my score 540", change),
analytics rows (no personal data, token stripped from the verify path). Not run: Docker, CI on GitHub, Playwright e2e.
| ID | Item | Status | Evidence / remarks |
|---|---|---|---|
| AP1-1.1 | Client address and rate limits | Completed | `tests/unit/test_clientip.py`, `test_spoofed_forwarded_for_does_not_buy_more_attempts`, `test_per_email_limit_holds_across_addresses`. Production needs `FORWARDED_HOPS=1` behind a load balancer that appends the client address (DEPLOYMENT_GUIDE) |
| AP1-1.2/1.3 | One FinScore; hide pages that ran on the other score | Completed | `test_current_score_is_recorded_once_per_set_of_answers_and_history_follows_changes`, coach tests, `nav.test.ts`, score page tests. DNA/Actions/Today hidden until they run on the workbook score (follow-up). Partner API still serves the 20-pillar score (K-49) |
| AP1-1.4 | No paid plan without payment | Completed | `test_billing_estimate_overage_and_invoice` (402 then contact-sales records the plan) |
| AP1-1.5 | Legal pages + sign-up consent | Completed (DRAFT text) | `test_registration_requires_and_records_acceptance_of_the_terms`; bracketed facts and final wording are 5nance Legal's |
| AP1-1.6 | Legal perimeter opinion | **Open - Legal** | Not an engineering task |
| AP1-1.7 | Tenant theme scoped | Completed | `theme-provider.test.tsx`; browser check |
| AP1-1.8 | Health headline | Completed | `test_headline_never_says_healthy_while_a_vital_is_unmeasured`, health monitor test |
| AP1-1.9 | Stale landing notice | Completed | Full landing rewrite is Phase 2 (2.1) |
| AP1-1.10 | CI/Docker green, commit work | Partly | Work committed on branch `phase1-critical-fixes` (local, not pushed). CI and Docker still not run here (no Docker; push not approved) |
| AP1-1.11 | First-party analytics + error reports | Completed | `tests/integration/test_analytics.py`, `lib/analytics.test.ts` |
