# Changelog

Format: Keep a Changelog; semver for the product, separate semver for the Rulebook.

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
