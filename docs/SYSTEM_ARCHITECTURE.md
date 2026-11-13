# FinScore AI — System Architecture

**Status:** Phase 0 design — awaiting approval. Style: **modular monolith**, monorepo, Docker-first.

## 1. Context
```
 Browser (Next.js, responsive)
        │ HTTPS  REST/JSON + SSE (chat streaming)
        ▼
 ┌──────────────────────── FastAPI application (one deployable) ───────────────────────┐
 │  api/ (routes, deps, auth middleware, rate limit, error mapping)                    │
 │  ───────────────────────────────────────────────────────────────────────────────    │
 │  domains: identity · profile · memory · interview · dna · persona · scoring ·       │
 │           explain · coach · simulation · projection · goals · actions · timeline ·  │
 │           engagement(nudges, gamification) · portfolio · news · health · household ·│
 │           billing · governance(consent, audit, escalation)                          │
 │  ───────────────────────────────────────────────────────────────────────────────    │
 │  ai/ (LLM gateway, prompts, orchestrator, tools, evals)    ← calls typed tools only │
 │  engines/ (PURE python: calc, tax, loan, sip, retirement, score, stage, simulate)   │
 │  rulebook/ (versioned rules loader/validator)                                        │
 │  infra/ (db session, repositories base, cache, queue, email, secrets, logging)      │
 └────────┬───────────────┬──────────────────────┬─────────────────────────────────────┘
          ▼               ▼                      ▼
     PostgreSQL     Redis (from MVP4)      LLM provider(s) via gateway
                    + worker process       (outbound only, PII-minimised)
```

## 2. Key rules (enforced by tooling)
1. **Layering inside each domain:** `router → service → repository → model`. Routers never touch models; repositories never contain business rules.
2. **`engines/` imports nothing from `infra/`, `ai/`, `api/`, or SQLAlchemy.** Pure functions/dataclasses, `Decimal` money, injected rulebook object. Enforced with `import-linter` contracts in CI.
3. **`ai/` may call services/engines only through registered typed tools** (`ai/tools/*`). LLM text is never parsed for numbers; tool results are the source of truth (B§21).
4. **Cross-domain access only through service interfaces**, no cross-domain model imports (import-linter).
5. **Every score/projection/simulation row stores** `rulebook_version`, `engine_version`, `input_snapshot_id`.
6. **Modular monolith first.** Candidates for later extraction (only if measured): worker (jobs), AI gateway, notification delivery.

## 3. Repository structure (monorepo)
```
finscore-ai/
├─ frontend/                 Next.js 14+ (App Router), TS strict
│  └─ src/
│     ├─ app/                routes: (marketing) (auth) (app)/{home,interview,dna,persona,score,coach,simulator,goals,actions,timeline,memory,settings}
│     ├─ features/           by business feature: interview, score, dna, persona, coach, simulator, goals, actions, timeline, memory, billing, auth
│     │   └─ <feature>/{components,hooks,api,types,utils}
│     ├─ design-system/      tokens, primitives (Button, Card, Chart wrappers), theme (light/dark)
│     ├─ lib/                api client (typed, generated from OpenAPI), query client, auth, formatting (₹ lakh/crore)
│     └─ tests/
├─ backend/
│  ├─ app/
│  │  ├─ main.py, config.py
│  │  ├─ api/v1/             routers per domain + deps + errors
│  │  ├─ domains/<name>/     {router.py, schemas.py, models.py, repository.py, service.py, rules.py}
│  │  ├─ engines/            finance math (pure)
│  │  ├─ rulebook/           loader, validator, schema, versions/
│  │  ├─ ai/                 gateway/, prompts/, orchestrator/, tools/, memory/, evals/
│  │  ├─ infra/              db/, security/, cache/, queue/, logging/, email/
│  │  └─ workers/            (MVP4+)
│  ├─ alembic/  (migrations)
│  └─ tests/{unit,integration,contract,engines,ai_eval}
├─ database/                 seeds (demo only), ER diagrams, SQL helpers
├─ infrastructure/           docker/, terraform/ (later), nginx, monitoring configs
├─ docs/  scripts/  tests/(e2e Playwright)  .github/workflows/
├─ docker-compose.yml  README.md  .gitignore  .env.example
```

## 4. Backend module catalogue
| Domain | Responsibility | Depends on | Pillar(s) |
|---|---|---|---|
| identity | users, auth, sessions, roles, orgs (B2B later) | — | platform |
| governance | consent, audit log, disclosure, advice classification, escalation, retention | identity | platform |
| profile | canonical Financial State Model (typed entities) | identity, governance | data truth layer |
| memory | versioned facts + provenance + freshness + user correction | profile | AC-11 |
| interview | conversation state, coverage map, extraction pipeline, next-question | ai, memory, profile | AC-01 |
| rulebook | published rule versions, PENDING tracking | — | AC-20 support |
| scoring | pillar calc orchestration, overall score, confidence, stage, history | profile, rulebook, engines | core |
| explain | factor attribution, score diff | scoring | AC-04 |
| dna | trait inference + history | profile, memory | AC-02 |
| persona | persona scoring/mapping | dna, scoring | AC-03 |
| coach | conversations, modes, tool-calling, escalation hooks | ai, all read APIs | AC-05, AC-18 |
| simulation | scenario model, run, compare | engines, scoring | AC-06 |
| projection | score projection, risk forecasts | engines, scoring | AC-07, AC-12 |
| goals | goal CRUD, discovery proposals (user-confirm), probability | projection | AC-13 |
| actions | library, ranking, state machine, verification | scoring, rulebook | AC-08 |
| timeline | milestones from goals+actions | goals, actions, projection | AC-09 |
| engagement | nudge rules, notification prefs, XP/streaks/badges | actions, memory | AC-10, AC-17 |
| portfolio | holdings, health checks | profile | AC-14 |
| news | relevance ranking | portfolio, profile | AC-15 |
| health | vitals, early warning | scoring, profile | AC-16 |
| household | family graph, permissions | profile, governance | AC-19 |
| wealthos | event bus + orchestration across domains | all | AC-20 |
| billing | plans, entitlements, subscriptions (provider adapter) | identity | commercial |

## 5. Deterministic financial calculation services (`engines/`)
Pure, versioned, property-tested. Each takes typed input + rulebook params, returns typed output + an **assumptions** list.
| Engine | Functions (examples) | Notes |
|---|---|---|
| `money` | Decimal helpers, INR formatting, rounding policy | Banker's vs half-up decided in Rulebook |
| `cashflow` | surplus, savings rate, expense volatility, emergency months | |
| `debt` | DTI, EMI, amortisation, payoff date, prepayment impact | standard formulas |
| `growth` | SIP FV, lumpsum FV, step-up SIP, real vs nominal, required SIP | return/inflation from rulebook/user |
| `retirement` | required corpus, projected corpus, gap, safe-withdrawal | assumptions explicit [PENDING defaults] |
| `tax` | old/new regime tax, deduction headroom | **scope PENDING (D-B11)**; versioned per FY |
| `insurance` | cover adequacy (income-multiple/needs) | method PENDING |
| `portfolio` | weights, concentration, drift | |
| `score` | pillar normalisation, weighting, confidence, overall mapping | all parameters from rulebook |
| `stage` | band + age-matrix resolver, persistence rule | matrix PENDING |
| `simulate` | deterministic scenario diff; Monte Carlo (seeded RNG) | seed stored → reproducible |
| `actions` | priority score composition | weights PENDING |
Guarantees: no network, no clock (time injected), no randomness without explicit seed, no float for money.

## 6. Frontend module structure
Feature folders listed above. Principles: server components for static/marketing; client components for chat/charts; React Query for server state; typed API client generated from OpenAPI (`openapi-typescript`); design tokens in CSS variables (light/dark); a11y via Radix primitives wrapped by our design-system; i18n-ready (strings in catalogue, ₹ formatting lakh/crore).

## 7. Cross-cutting
- **Config:** pydantic-settings, env-only secrets, `.env.example` committed, no defaults for secrets.
- **Logging:** structured JSON (structlog), request-id correlation, PII scrubbing filter; AI calls logged with hashed user id and token counts, never raw financial values in app logs.
- **Errors:** RFC 7807 problem+json; domain exceptions mapped centrally.
- **Versioning:** `/api/v1`, OpenAPI published; breaking changes → `/v2`.
- **Async work:** FastAPI BackgroundTasks → Redis+ARQ worker at MVP 4 (nudge scheduler, projection batch, news ranking).
- **Observability:** OpenTelemetry traces, Prometheus metrics, Sentry; dashboards at MVP 6.
- **Event model (Wealth OS):** internal domain events (`FactChanged`, `ScoreComputed`, `ActionCompleted`, `GoalUpdated`) via in-process dispatcher first, outbox table for reliability, Redis streams later.

## 8. Scalability posture
Stateless API containers behind a load balancer; Postgres is the bottleneck → read replicas + indexing + partitioning of `score_runs`/`audit_log`/`messages` by time when volume warrants. LLM cost/latency is the main scaling lever (caching, small-model routing, max-turn budgets).

## 9. Architectural commitments requiring approval
(1) Modular monolith, (2) pure `engines/` boundary, (3) rulebook-versioned scoring, (4) Tailwind-first UI (MUI deviation), (5) first-party auth, (6) hosting target (see costs).
