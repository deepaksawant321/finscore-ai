# FinScore AI — Deployment Guide

**Status:** Phase 0 plan. Production deployment requires explicit Product Owner approval. Nothing is deployed.

## 1. Environments
| Env | Purpose | Infra |
|---|---|---|
| local | developer | docker compose: postgres, backend, frontend, mailpit (later: redis, worker) |
| ci | tests | GitHub Actions, ephemeral Postgres service |
| staging | UAT, demos (**demo rules visibly watermarked**) | same topology as prod, smaller |
| production | customers | see below; approval-gated |

## 2. Local development
> **Verification status:** the docker-compose path below is written but has **not been executed** (no Docker on the build machine). A Docker-free path (embedded PostgreSQL) was verified — see `README.md`.
```
cp .env.example .env      # fill placeholders; never commit .env
docker compose up --build
# frontend http://localhost:3000   backend http://localhost:8000/docs   mailpit http://localhost:8025
```
Migrations: `docker compose exec backend alembic upgrade head`.

## 3. Configuration
12-factor: all config via env; `pydantic-settings` validates at boot (fail fast); secrets via secret manager in staging/prod; `ENV=production` activates the **Rulebook approval guard** and disallows demo data seeding.

## 4. Proposed production topology (decision pending — see INFRASTRUCTURE_COSTS)
Containers (backend API, worker from MVP 4, frontend) on a managed container platform; managed PostgreSQL with PITR + backups; managed Redis; CDN/WAF in front; object storage for exports; secret manager + KMS; centralised logs/metrics/traces. Region: India (data residency preference for Indian users, subject to Legal).
Candidate hosts (cost/ops trade-off): (A) AWS Mumbai (ECS Fargate + RDS + ElastiCache) – mature, higher ops/cost; (B) Azure Central India; (C) GCP Mumbai (Cloud Run + Cloud SQL) – lowest ops overhead for a small team; (D) PaaS (Render/Railway/Fly) for staging/early-prod – cheapest, less compliance posture. Recommendation to be given with cost model once approved region/provider constraints known.

### Client address behind proxies (required for rate limits and the audit log)
The browser reaches the API through the Next.js rewrite, which forwards a caller-supplied `X-Forwarded-For` unchanged. The backend
therefore believes that header only from `TRUSTED_PROXIES` and only the entry appended by our own `FORWARDED_HOPS` proxies
(`backend/app/infra/clientip.py`). Production: put a load balancer/CDN in front of the frontend that appends the client address,
set `FORWARDED_HOPS=1`, list the frontend's network in `TRUSTED_PROXIES`, and run uvicorn with `--no-proxy-headers`. With
`FORWARDED_HOPS=0` every request is attributed to the frontend server: safe, but all users then share one per-address limit
(the per-email limits on register, login and password reset still apply per account).

## 5. CI/CD
GitHub Actions: PR → lint/type/test/security → build images → push to registry on main → auto-deploy **staging** → manual approval gate → **production**. Migrations run as a pre-deploy job; backwards-compatible (expand/contract) migrations only; rollback = redeploy previous image (+ forward fix migration).

## 6. Release checklist (production)
Approved rulebook version present · migrations dry-run on prod snapshot · security scan clean · load test passed · backups verified · monitoring/alerts on · on-call/runbook · legal disclosures live · **PO written approval**.

## 7. Monitoring & operations (MVP 6)
Health probes, uptime check, error tracking (Sentry), metrics (Prometheus/Grafana or provider), traces (OTel), AI cost/latency/groundedness dashboards, alerts (error rate, p95, queue depth, LLM failures, budget), DR drill (RPO/RTO targets to be set).
