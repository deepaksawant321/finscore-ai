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
| G-02 | Erasure (`/users/me/erasure-request`) | Completed (interim policy) | Password re-auth, 7-day cooling-off (PLACEHOLDER, D-B16), cancellable, purge job (`scripts/admin_cli.py purge-due`) cascades to all personal data; completion record + hash-chained audit survive with opaque ids. **Purge needs a scheduler in deployment (K-25)** |
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
