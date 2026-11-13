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
