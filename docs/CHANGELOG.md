# Changelog

Format: Keep a Changelog; semver for the product, separate semver for the Rulebook.

## [0.7.0-dev] - Organisation, API-key, usage and billing backend (MVP 6) - 2026-11-16
### Added
- Organisations (workspaces): create one and you become the owner. Roles owner, admin, analyst and viewer, with a permission matrix enforced on the server. Another workspace's data answers 404, never 403.
- Team: invite by email (single-use 7-day token stored as a hash), accept with the invited address, change role, remove, seat limit per plan. The owner cannot be changed or removed.
- API keys: sandbox keys on creation, live keys on go-live. Secret keys are shown once and stored only as a SHA-256 hash; rotation keeps the old key for 24 hours; revoke is immediate. Publishable keys are public by design.
- Partner API: `POST /api/v1/partner/scores` returns a score from the facts a business sends (same engine and rules as the customer app, nothing stored) and `GET /api/v1/partner/me`. Each successful call is metered atomically per month and environment; rejected calls are not charged.
- Plans and entitlements in one module: Starter (free, sandbox only, hard cap), Growth, Enterprise (sales-led). Limits enforced for seats, modules, going live and removing the "Powered by" label. Upgrades apply at once; downgrades are scheduled for the end of the month and blocked if the workspace does not fit.
- Billing: monthly estimate with overage and 18% GST, and one invoice per month. No payment is collected (K-45).
- Go-live checklist, branding, modules and data-source choices are stored per workspace. The activity feed is read from the hash-chained audit log, without keys or email addresses.
- Frontend: the workspace screens use the real API. Create-workspace flow, one-time key reveal, invite-acceptance page (`/accept-invite`), role-aware controls, and a "For business" link for people without a workspace.
- Migration 0010; API schema and typed client regenerated.
### Changed
- The admin area no longer depends on the `admin` role or the `NEXT_PUBLIC_WORKSPACE_DEMO` flag (removed). Membership of a workspace decides what a person sees.
- The REST snippet calls the real endpoint; the embed and React SDK samples say they are not published yet.
- Removed the demo-only usage chart, KPI tiles and webhook list, which had no real data behind them.
### Fixed
- Memory now recalculates the score after a big change, as it promised.
- Verification link no longer shows an error in development after it had worked.
### Not done
- Payment provider, PDFs, webhooks, widget and SDK, SSO and MFA, per-day usage history (K-45 to K-48).
- Plans, prices and limits are placeholders until Product decides D-B13 and D-B14 (K-46).

## [0.6.0-dev] - Fintech UI refresh and SaaS workspace screens - 2026-11-16
### Added
- New look: aurora background, glass cards, a dark glowing score card, gradient actions, floating glass sidebar on desktop and a floating tab bar with a More sheet on phones. Light and dark both designed; a light/dark toggle sits in the top bar. Reference design: `docs/prototype/` (open `index.html`; screenshots in `screens/`).
- Design tokens extended (`--brand-strong`, `--brand-soft`, `--ai-soft`, glass, mesh, radius, fonts) and fonts loaded with `next/font` (Inter, Space Grotesk; two optional white-label faces).
- White-label theme (`src/lib/theme/`): workspace name, brand and accent colour, corner radius, typeface, "Powered by" label. Colours are converted to RGB triplets so Tailwind opacity classes keep working; text colour on the brand colour is chosen for contrast; very light colours trigger a warning. Stored in this browser only.
- Design-system primitives: Switch, SegmentedTabs (arrow-key navigation), ProgressBar, Stat, CodeBlock (copy with fallback), Toast, SourceBadge (You told me / Connected account / Calculated / Inferred / Estimated), DemoBadge, Icon set. Button gains `ai` and `sm`; Card gains `glass | solid | flat | dark`; Badge gains more tones. `buttonClass()` lets links share button styling.
- Home: new score card (ring, confidence and trend as separate figures, 8-stage ladder from the product deck) and a "next best step" card from the existing actions endpoint. The demo banner appears only when the API marks the score as unofficial.
- Workspace admin screens under `/app/workspace/*` (Go-live setup, Integrations, Branding, Team & roles, Plans & billing). **Demo data only**, labelled on every screen. Shown to the `admin` role, or to everyone when `NEXT_PUBLIC_WORKSPACE_DEMO=1`.
- Tests: theme and workspace logic tests, primitive tests, navigation tests extended (72 frontend tests in total).
### Changed
- Navigation is now grouped (Your money, Plan, Account, Workspace admin) and adds a Home entry. `mainNavLinks()` keeps its previous behaviour.
- Page headings use the display font; chat bubbles, score driver bars and the Memory source badges follow the new style. No data flow or API call changed.
### Fixed (found while testing against the real backend)
- The stage ladder no longer marks a stage for an early estimate (low confidence), matching the rule that no verdict is announced.
- Team & roles no longer scrolls sideways on phones.
- Pressing Copy on the embed snippet now counts for the setup checklist even if the browser blocks clipboard access, so Go live cannot get stuck.
### Not done
- Workspace, API-key, usage and billing data are not real: no organisation endpoints exist yet (MVP 6, D-B14). Branding is saved per browser, not per workspace.
- Playwright e2e not run (needs the Docker/Mailpit stack, K-13).

## [0.5.7-dev] - Menu entry and home card for the draft score - 2026-11-16
### Added
- "Draft score" in the main menu (right after "Score") and a "Your draft score, 15 areas" card on the home page. The card only links; it never calculates or shows a number.
- Navigation links moved to `src/lib/nav.ts` (tested: unique destinations, Staff only for staff roles).
### Fixed
- The main navigation row now wraps instead of overflowing, so no page scrolls sideways on narrow screens (checked at 375px, including the full score result).

## [0.5.6-dev] - Workbook-model score screen - 2026-11-16
### Added
- `/app/score/matrix`: shows the workbook-based FinScore (draft). Calculates on request only (each calculation is audited), keeps the last result when you come back, shows 0-900 ring, confidence and "N of 15 areas measured", every area with points and "how this was worked out", the biggest gaps, what is still missing (in the interview's order, in plain words, linked to the conversation) and the assumptions made. Early estimates (confidence below the placeholder threshold) show no verdict. Always watermarked as a draft; "not available yet" in production. Linked from the main Score page.
- `ScoreRing` takes optional `min` and `caption` (default behaviour unchanged). Test setup now unmounts components between tests.
- 23 new frontend tests; checked in a real browser against a throwaway backend (partial profile: 560 at 44% confidence; complete profile: 766 at 100%).
### Not done
- (Navigation entry and home card added in 0.5.7.) No history/trend chart (the score is not stored); the interview does not yet offer a one-click "ask me the missing details".
### Known, pre-existing
- (Fixed in 0.5.7.) The main navigation bar did not wrap on narrow screens.

## [0.5.5-dev] - Profile fields for the workbook-based FinScore - 2026-11-16
### Added
- 13 profile catalogue fields (loans outstanding, equity / debt / other holdings, pending goals, life and health cover amounts, kids, kids-goal planned, 80C, 80D, planning age, risk comfort), appended to the interview after the original 11 (existing order unchanged). With all of them a user now has all 15 factors scored (confidence 1.0). Short answers ("12 lakh", "none", "balanced") are understood; extra boosts for retirement, debt, insurance and investment questions.
- Adapter `INPUT_SOURCES` ties every engine input to its catalogue field (tested for completeness); `missing_inputs` in the matrix score response now names catalogue fields so the UI can ask the right question.
### Decisions to confirm
- Liquid savings (savings accounts, liquid funds, FDs) are added to debt investments so assets and equity share are not understated; this is stated in the response `assumptions`.
- `risk_profile` is the user's own description of risk comfort, used only to pick a planning return for the retirement calculation. It is NOT an approved risk-profiling methodology (blueprint section 23); the workbook's 7-question questionnaire is implemented in the engine but has no UI yet.
- "I have 2 kids" still fills `dependants` (existing rule); the `kids` field is asked separately.
### Not done
- No frontend screen for the matrix score. `kids_goal_planned` is asked even when the user has no children (the question says to answer no); the selector has no conditional questions yet.

## [0.5.4-dev] - Workbook-based FinScore engine (draft) - 2026-11-16
### Added
- `POST /api/v1/score/matrix/compute`: the 15-factor, age x value-matrix FinScore from the business spreadsheets (0-900), run alongside the existing 20-pillar score. Pure Decimal engine (`app/engines/matrix_score.py`, `finmath.py`: retirement corpus/SIP, life cover need, goal planning, risk profile), rules loaded from `app/rulebook/versions/matrix-0.1.0-draft/matrix_rules.json`, adapter from profile facts (`domains/scoring/matrix_adapter.py`). Spec: `docs/rules/FINSCORE_RULES_SPEC.md`.
- Unknown facts are never guessed: that factor is excluded, the score is rescaled and confidence falls. Every call is audited (input digest + rule/engine version, no values). Reproduces the workbooks' totals (417.6, 535.5) and calculator outputs in tests.
### Not done
- DRAFT, unofficial rule set: always watermarked and refused in production. No persistence/history/trend (stateless, no migration). (Superseded by 0.5.5: the profile catalogue now covers every input.) No frontend screen. Open business questions: spec section 10.

## [0.5.3-dev] - Erasure purge scheduler - 2026-11-13
### Added
- In-process scheduler runs the erasure purge job automatically (immediately on startup, then every `PURGE_INTERVAL_SECONDS`), closing K-25. No new infrastructure or recurring cost; `scripts/admin_cli.py purge-due` remains for manual use. Config: `PURGE_SCHEDULER_ENABLED` (default on), `PURGE_INTERVAL_SECONDS` (placeholder 3600).

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
