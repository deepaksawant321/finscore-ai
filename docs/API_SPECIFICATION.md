# FinScore AI — API Specification (initial contract)

Base: `/api/v1` · JSON · errors as RFC 7807 `application/problem+json` · auth: Bearer access token (+ refresh cookie) · pagination: cursor (`?cursor=&limit=`) · idempotency: `Idempotency-Key` header on POST that create/charge · OpenAPI auto-generated at `/openapi.json` (source of truth; this file is the plan). Every response that includes a score/projection includes `meta: {rulebook_version, engine_version, assumptions[], confidence, provisional}`.

## Platform (MVP 1)
| Method | Path | Purpose |
|---|---|---|
| GET | `/health/live`, `/health/ready` | liveness; readiness (DB, redis) |
| POST | `/auth/register` · `/auth/login` · `/auth/refresh` · `/auth/logout` | auth |
| POST | `/auth/verify-email` · `/auth/password/forgot` · `/auth/password/reset` | account recovery |
| GET/PATCH | `/users/me` | profile, locale, timezone |
| GET/DELETE | `/users/me/sessions[/{id}]` | session mgmt |
| GET/POST/DELETE | `/consents` | consent grant/revoke |
| POST | `/users/me/data-export` · `/users/me/erasure-request` | rights workflows |

## Core intelligence (MVP 2)
| Method | Path | Purpose |
|---|---|---|
| POST | `/conversations` | start (mode=problem\|full) |
| POST | `/conversations/{id}/messages` | send message (SSE stream reply); returns assistant text + `captured_facts[]` proposals + `next_question` |
| POST | `/conversations/{id}/facts/confirm` | accept/edit/reject proposed facts |
| GET | `/profile` · PATCH `/profile/facts/{key}` | canonical profile; corrections create new versions |
| GET | `/memory/facts?pillar=&state=` · GET `/memory/facts/{id}/history` | memory & provenance |
| GET | `/coverage` | coverage map per Score Pillar |
| GET | `/dna` · `/persona` | traits with confidence/evidence; persona |
| POST | `/score/compute` | compute (idempotent per snapshot) |
| GET | `/score/current` · `/score/history` | score, confidence, trend, stage(provisional flag) |
| GET | `/score/{run}/explain` · `/score/compare?from=&to=` | explainability & diff |
| GET | `/rulebook/status` | which rules approved/pending (admin/compliance + safe summary for UI banner) |

## Assistant (MVP 3)
`POST /coach/conversations`, `POST /coach/conversations/{id}/messages` (SSE), `GET /coach/suggested-prompts`, `POST /escalations`, `GET /escalations/{id}`, `GET /ai/disclosure`.

## Prediction & action (MVP 4)
`POST /simulations` (NL or structured `ScenarioSpec`), `GET /simulations/{id}`, `POST /simulations/compare`; `GET /projections/score?horizon=`; `GET/POST/PATCH /goals`, `GET /goals/proposals`, `POST /goals/proposals/{id}/confirm`; `GET /actions`, `POST /actions/{id}/(accept|skip|snooze|complete)`, `POST /actions/{id}/verify`; `GET /timeline`.

## Advanced (MVP 5) and Commercial (MVP 6)
`GET /nudges`, `PATCH /nudges/{id}`, `GET/PUT /notification-prefs`; `GET /gamification/state`, `GET /missions`; `GET/POST /portfolio/holdings`, `GET /portfolio/health`; `GET /news/feed`; `GET /health-monitor`; `GET/POST /household/members`, `/household/permissions`; `GET /plans`, `POST /billing/checkout-session`, `POST /billing/webhook/{provider}`, `GET /billing/subscription`; B2B: `/orgs/*`, `/orgs/{id}/members`, API keys.

## Conventions
- Money in responses: `{ "amount": "2200000.00", "currency": "INR" }` (string decimals).
- Facts: `{key, value, unit, source_type, confidence, verified, as_of, stale}`.
- Error codes: `validation_error`, `unauthorized`, `forbidden`, `not_found`, `conflict`, `rate_limited`, `rulebook_not_approved`, `ai_unavailable`, `consent_required`, `entitlement_required`.
- Rate limits: documented per route group in OpenAPI `x-ratelimit`.
- Webhook signature verification mandatory for billing.

## Implemented in MVP 2 follow-up (governance + goals)
`GET /ai/disclosure` · `POST/GET /escalations`, `GET /escalations/{id}` · staff: `GET /admin/escalations`, `PATCH /admin/escalations/{id}` (roles support|compliance|admin, checked in DB) · `GET /users/me/data-export` · `GET/POST/DELETE /users/me/erasure-request` · `GET/POST /goals`, `GET/PATCH/DELETE /goals/{id}`, `GET /goals/{id}/funding?assumed_return_pct=&inflation_pct=` (both required; no defaults).
Interview turn responses now include `advice_class`, `escalation_suggested`, `escalation_id`.
Authoritative contract: `backend/openapi.json` (generated).

## Implemented in MVP 3 (coach, partial)
`POST /coach/conversations` (needs `ai_processing` consent) · `GET /coach/conversations/{id}` · `POST /coach/conversations/{id}/messages` (JSON, no streaming yet) · `GET /coach/suggested-prompts`. Turn response: `assistant_text`, `mode` (explain|diagnose|simulate|act|other), `tools`, `advice_class`, `escalation_suggested`, `escalation_id`, `ai_rewritten`, `disclosure`. Coach conversations are separate from interview conversations (each API returns 404 for the other's ids).

## Implemented in MVP 4, slice 1 (simulations)
`POST /simulations` (body: `{"kind":"invest"|"score_what_if"|"goal_what_if", ...}`) - `GET /simulations` - `GET /simulations/{id}`. Assumption fields (`return_pct`, `inflation_pct`) are required where used; there are no defaults. Responses carry `official` and `watermark`. Streaming, NL parsing in the API and comparison endpoints are not built (the coach parses simple phrasings).

## Implemented in MVP 4, slice 2 (actions)
`GET /actions[?include_closed=true]` - `POST /actions/refresh` (recomputes and reconciles; idempotent) - `POST /actions/{id}/{accept|skip|snooze|start|complete|reopen}` (snooze body `{"days":1..90}`; illegal moves return 409 `invalid_transition`) - `GET /timeline`. Each action carries `expected_score_change` (engine-computed), the priority breakdown, `official` and a watermark. Refresh returns 503 `rulebook_not_approved` in production until the library is approved. `verify` and `complete`-to-verified are system-driven, not endpoints.

## Implemented in MVP 5, slice 1 (Daily Companion)
`GET /nudges` - `POST /nudges/refresh` (evaluates rules, idempotent) - `PATCH /nudges/{id}` (`{"action": "seen"|"dismiss"|"done"|"snooze", "days": 1..90}`) - `GET/PUT /notification-prefs` (`in_app_enabled`, `max_active` 1..10, `muted_rules`). In-app only; no push, email or SMS.

## Implemented in MVP 5, slice 2 (health monitoring)
`GET /health-monitor` (live, read-only) - `POST /health-monitor/check` (records a snapshot when something changed; idempotent) - `GET /health-monitor/history`. Response: `overall`, `data_quality`, `vitals[]` (`status` green|amber|red|unknown, `stale`, `rule_text`), `events[]` with `category` health|data_quality, `official`, `watermark`. Returns 503 `rulebook_not_approved` in production until thresholds are approved.

## Implemented in MVP 5, slice 3 (Copilot)
`POST /copilot/actions/{action_id}/check` - `POST /copilot/goals/check` (body: `{"goal_id": uuid|null, "new_monthly_funding": "..."}`; omit `goal_id` to check a goal you have not created yet). Response: `context`, `findings[]` (`level` ok|info|warning|blocker, `code`, `message`, `hand_off`), `needs_hand_off`. Never executes anything; a `hand_off` finding is surfaced to the UI, which may then call `POST /escalations` itself.
