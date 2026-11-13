# FinScore AI — Infrastructure & External Service Costs

> ⚠️ **Indicative planning ranges from general knowledge — NOT quotes.** Vendor prices change; I have not verified current price sheets in Phase 0. Every line is marked for **verification before you approve spend**. Nothing is purchased or subscribed to without your approval.

## 1. Cost drivers (ranked)
1. **LLM usage** (variable, scales with active users × turns) — the dominant cost.
2. Managed database + hosting (mostly fixed).
3. Regulated data connectivity (AA/FIU aggregator fees) — *excluded, approval gate*.
4. Third-party services: email/SMS/OTP, billing fees, news data, monitoring.
5. One-off: penetration test, legal/compliance review, design assets.

## 2. LLM cost model (formula; fill with approved provider price)
`monthly_llm_cost = MAU × sessions/user/month × turns/session × (in_tokens × price_in + out_tokens × price_out)`
Mitigations built into design: small-model routing for classify/extract, prompt caching, concise facts-not-history context, per-user token budgets, deterministic engines doing all math (no long reasoning), answer caching for explanations of identical score runs.
Planning assumption to validate in MVP 2 with real telemetry: interview ≈ 15–25 turns once; coach ≈ 5–20 turns/month for active users. **Decision needed:** provider(s) and a **monthly AI budget ceiling** (suggest starting hard cap with alert at 70%).

## 3. Fixed/semi-fixed infrastructure (indicative monthly, USD)
| Item | Dev/CI | Staging | Production (early, ~1–5k MAU) | Notes / to verify |
|---|---|---|---|---|
| App hosting (API + frontend + worker) | $0 (local/Docker) | $20–60 | $80–300 | Container PaaS vs cloud |
| Managed PostgreSQL (HA, PITR) | $0 | $15–50 | $60–250 | Largest fixed line |
| Managed Redis (from MVP 4) | — | $0–15 | $15–60 | |
| Object storage/backups/CDN/WAF | $0 | $5–10 | $20–100 | |
| Secrets/KMS | $0 | $1–5 | $5–30 | |
| Observability (Sentry, logs, metrics) | $0 free tiers | $0–26 | $30–150 | |
| Email (transactional) | $0 (mailpit) | $0–20 | $20–100 | |
| SMS/OTP (India DLT-registered) | — | — | usage-based; **defer** | OTP login deferred (T-5) |
| GitHub (Team/Actions minutes) | $0–4/user | | $4–21/user | |
| Domain/DNS/TLS | | | ~$2–5 | |
**Indicative early-production fixed total (excluding LLM): ≈ $250–1,000/month**, rising with scale.

## 4. Commercial & regulated services (approval-gated)
| Service | When | Cost nature | Gate |
|---|---|---|---|
| Billing provider (e.g., Razorpay/Stripe) | MVP 6 | % per transaction (no fixed fee typical) | Purchase approval; GST/invoicing rules |
| Account Aggregator (FIU onboarding/aggregator fees) | post-MVP | setup + per-consent/data-pull fees; regulatory registration | **Regulated source — your approval + Legal** |
| MF/insurance/bank APIs | post-MVP | vendor contracts | approval |
| News/market data provider | MVP 5 | licence fee (can be significant) | approval; start with free RSS/no feed |
| Market data for portfolio valuation (AMFI NAV free; equities licensed) | MVP 5 | free→licensed | approval |
| Penetration test | MVP 6 | one-off (typically low-to-mid 5 figures USD range) | approval |
| Legal/compliance review (SEBI/DPDP) | MVP 2→6 | professional fees | 5nance Legal |
| Design (brand assets, illustration) | MVP 1+ | optional | approval |
| Customer-support/escalation tooling | MVP 3 | seat-based | approval |

## 5. Cost controls
Budgets/alerts per environment; per-user AI quotas by plan; cost dashboard (AI cost per active user vs ARPU); no auto-scaling beyond cap without alert; free-tier limits in entitlements; monthly cost review in roadmap checkpoints.

## 6. Approvals requested
1. LLM provider(s) + monthly cap.
2. Hosting provider/region shortlist (Mumbai preferred) for staging.
3. Confirm: **no AA, no news feed, no SMS OTP** until later approval.
