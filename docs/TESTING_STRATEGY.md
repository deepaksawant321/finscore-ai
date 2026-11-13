# FinScore AI — Testing Strategy

**Rule:** no completion claim without test evidence (command + result recorded in tracker/CHANGELOG).

## Pyramid
| Layer | Tooling | Scope |
|---|---|---|
| Unit — **engines** | pytest + **hypothesis** (property tests) | Money math vs closed-form formulas and hand-computed golden cases; invariants in FINANCIAL_RULEBOOK §5; no mocks needed (pure) |
| Unit — domain services | pytest, fakes | business rules, state machines (actions, consent, fact supersession) |
| Integration — API+DB | pytest + httpx + real Postgres (docker/testcontainers), transaction-per-test | repositories, migrations, auth flows, IDOR/permission matrix, rate limits |
| Migration tests | alembic upgrade/downgrade on empty + seeded DB | every migration |
| Contract | OpenAPI schema diff + generated TS client compile | FE/BE drift fails CI |
| AI evals | mock-LLM replay (CI) + nightly live-model runs | extraction, intent, tool selection, **ungrounded-number = 0**, safety/red-team (AI_ARCHITECTURE §5) |
| Frontend unit/component | Vitest + Testing Library + Storybook | components, hooks, formatters (₹ lakh/crore) |
| E2E | Playwright | critical journeys: register→login; interview→score reveal; correct fact→rescore; simulate; billing (later) |
| Accessibility | axe in Playwright/Storybook + manual SR pass | WCAG 2.2 AA |
| Security | bandit, semgrep, pip-audit, npm audit, gitleaks, Trivy, ZAP baseline | CI + pre-release |
| Performance | k6/Locust | p95 latency budgets, chat concurrency, score compute throughput (MVP 6) |
| Visual regression | Playwright snapshots | design-system & key screens (MVP 2+) |

## Financial-accuracy testing (priority)
1. Every formula has ≥1 externally verifiable reference value (documented derivation) in `tests/engines/golden/`.
2. Property tests: monotonicity, bounds, additivity, idempotence, scale invariance where applicable; round-trip (e.g. required SIP ↔ FV).
3. Determinism: result hashing; same seed ⇒ same Monte Carlo output.
4. Rulebook validator tests: weights sum to 1, no matrix gaps/overlaps, status gate.
5. Independent review: Quant/Finance signs off on golden cases before a rule is `APPROVED`.

## Quality gates (CI required to merge)
lint (ruff, eslint), types (mypy strict on engines/domains, tsc strict), unit+integration pass, coverage thresholds (engines ≥95% line+branch, backend overall ≥80%, frontend ≥70% initially), import-linter, secret scan, dependency audit (high/critical block), OpenAPI drift check, migration check, Docker build.

## Test data
Synthetic only. Demo data is badged "DEMO DATA"; never seeded in production. Golden utterance set for extraction includes ₹ lakh/crore/“L/Cr/k” and ambiguous phrasing.

## Evidence format
Each tracker row links: CI run URL or local command + summary (e.g., `pytest -q → 412 passed`), and screenshots/logs for local-run verification.
