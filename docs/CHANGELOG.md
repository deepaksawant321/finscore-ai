# Changelog

Format: Keep a Changelog; semver for the product, separate semver for the Rulebook.

## [0.5.2-dev] - MVP 5 slice 3: AI Financial Copilot - 2026-11-13
### Added
- Pre-action checks (AC-18): affordability (income vs. everything committed each month) and action-specific notes (large spending cut, EMI changes need a lender, insurance is a hand-off). `/copilot/actions/{id}/check`, `/copilot/goals/check`; wired into the Actions and Goals pages. Read-only: never executes anything, never recommends a product; a hand-off only offers to open a support request.
### Fixed
- An affordability finding could be attached to an action that adds no recurring monthly commitment (insurance, emergency-fund reallocation), misattributing the user's existing cash-flow position to an unrelated decision. The check now only runs for actions that change a recurring amount.
### Not done
- Wealth OS event orchestration. See tracker C-07.

## [0.5.1-dev] - MVP 5 slice 2: Health Monitoring - 2026-11-13
### Added
- Financial health check: five vitals, green/amber/red from demo thresholds, overall status, a separate data-quality verdict, change classification (health vs data quality), recorded history, Health page, `health_alert` nudges. Migration 0008.
### Not done
- Segment-specific thresholds, background checks. See tracker H-08, H-09.

## [0.5.0-dev] - MVP 5 slice 1: Daily Companion - 2026-11-13
### Added
- Rule-based in-app nudges (7 rules, placeholder thresholds), priorities, snooze/dismiss/done with no repeat after refusal, preferences (on/off, how many at once, mute by type), Today page and home card, opt-out events in the audit log. Migration 0007.
### Not done
- External delivery, gamification, health monitoring, household, portfolio, news, copilot. See tracker M5-07..M5-13.

## [0.4.1-dev] - MVP 4 slice 2: demo action library - 2026-11-13
### Added
- Demo-flagged action library in the Rulebook (5 actions) with PROPOSED priority weights; per-user score effects computed by the score engine; ranked suggestions with a stored priority breakdown.
- Action state machine (accept, start, complete, skip, snooze, reopen), verification against the user's own numbers (recomputes the score), timeline, Actions page, coach "what should I do next". Migration 0006.
### Changed
- Coach no longer says it cannot suggest actions; it lists the top demo actions (or says none apply).
- Engine helper `format_inr` moved to the pure engines package.

## [0.4.0-dev] - MVP 4 Prediction and Action (slice 1) - 2026-11-13
### Added
- What-if simulator: pure projection engine, `/api/v1/simulations` (invest monthly, change my numbers, fund a goal differently), What-if page, coach what-if answers. Migration 0005.
- Every rate is supplied by the user; score what-ifs use the demo rules and are watermarked; nothing is saved to facts, goals or score history.
### Not done
- Score predictor, action library/state machine/timeline, seeded Monte Carlo ranges, goal discovery, Redis/worker. See tracker M4-07..M4-11.

## [0.3.0-dev] — MVP 3 AI Financial Assistant (partial) — 2026-11-13
### Added
- Coach: consent-gated conversations (`/api/v1/coach/*`), deterministic router and nine read-only tools (score, explain, change, stages, profile, missing data, goals, goal check with user-supplied assumptions), suggested prompts, disclosure, coach page in the web app.
- Optional LLM rewrite of engine facts, accepted only when every number is grounded and the advice class is safe; otherwise the template text is used. Prompt `coach_explain/v1`.
- Guards reused in the coach: distress, regulated-advice ask, request for a human (opens an escalation).
- `coach_runs` audit table (migration 0004).
- Staff inbox page (`/app/staff`) for support requests; adversarial-model coach eval.
### Not done
- Action suggestions (needs approved action library), free-form scenarios, real-model evaluation. See KNOWN_ISSUES K-29..K-31.

## [0.2.1-dev] — Governance gaps and goals — 2026-11-13
### Added
- Data-subject rights: complete JSON export; account erasure with password re-confirmation, cooling-off, cancel, purge job and admin CLI (`scripts/admin_cli.py`: grant/revoke role, purge-due).
- Advice classification of every assistant message; regulated-advice requests declined with a human-review offer; distress detection with helpline text and automatic human flag.
- Escalations: user create/list, staff queue/update with DB-checked roles and audited reads; encrypted notes.
- Goals: CRUD, funding view with user-supplied assumptions, UI for goals, privacy (export, erasure, AI consent toggle) and support requests.
- Migration 0003 (goals, escalations, data_requests, messages.advice_class).
### Fixed
- Write responses could be sent before the transaction committed (stale refetch). Now committed first; regression test added.
- Access tokens outlived logout/session revocation/password reset until expiry. Now rejected immediately.

## [0.2.0-dev] — MVP 2 Core Financial Intelligence (partial) — 2026-11-13
### Added
- Deterministic engines: Indian amount parsing, cash-flow, EMI/debt, SIP/lumpsum/required-SIP/inflation, retirement corpus, generic score framework, stage resolver, rule-based traits/persona. Decimal-only; floats rejected.
- Versioned Rulebook with a watermarked **demo** rule set (`0.0.0-demo`); production refuses to produce a score from an unapproved rulebook (503 `rulebook_not_approved`).
- Financial memory: versioned facts with provenance, source-precedence rule, user correction, history; encrypted conversation text (Fernet).
- AI interview: consent-gated conversations, rule-based fact extraction, optional LLM extraction (grounded, validated), confirm-before-save proposals, deterministic next-question selector, coverage map, grounding guard.
- Scoring: immutable score runs with frozen input snapshot, confidence (data coverage), trend, provisional stage, early-estimate flag, exact explanation and run comparison; DNA traits and demo persona.
- Frontend: interview chat with captured-fact chips, score ring + explanation, DNA/persona, memory with corrections.
### Changed / Fixed
- Auth forms now `method="post"` so a submit before hydration cannot put credentials in the URL.
- Migration 0002 (facts, input_snapshots, score_runs, conversations, messages, message_extractions).
### Not done in MVP 2 yet
See IMPLEMENTATION_TRACKER (M2-E4, M2-E8) and KNOWN_ISSUES K-18…K-23.

## [0.1.0] — MVP 1 Platform Foundation — 2026-11-13
### Added
- Monorepo: `backend/` (FastAPI, SQLAlchemy 2 async, Alembic), `frontend/` (Next.js 14, Tailwind, React Query), Docker/compose, CI workflow, README.
- Auth: register (enumeration-safe), email verification, login (Argon2id, lockout after 5 failures), JWT access token (15 min, HS256) + rotating refresh token in httpOnly cookie with **reuse detection**, logout, password reset (revokes all sessions), session list/revoke.
- Users: `GET/PATCH /users/me`; roles table (`user` assigned on registration).
- Governance foundation: hash-chained append-only `audit_log` with tamper detection; consent grant/revoke API.
- Platform: RFC 7807 errors, request-id + structured logging with PII/secret scrubbing, rate limiting (in-memory), CORS allow-list, security headers, Origin check on cookie endpoints, health `live`/`ready`.
- Architecture guards: import-linter contracts (pure `engines/`, domain boundaries); OpenAPI → typed TS client; OpenAPI drift check.
- Frontend: design tokens (light/dark), primitives, landing, register/login/verify/forgot/reset, protected shell, settings (profile + sessions). Shows "FinScore not available yet" — no score is displayed.
- Tests: 29 backend (unit + real-PostgreSQL integration + migration up/down/up/drift), 6 frontend unit, Playwright e2e spec (not yet run, see KNOWN_ISSUES).
### Notes
- Deviations from Phase 0 design are listed in KNOWN_ISSUES (K-12…K-16).

## [Phase 0] — 2026-11-13
- Discovery & system-design documents.
