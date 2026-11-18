# FinScore AI: Missing Features and Opportunities

**Date:** 2026-11-18 · Each item is tagged with its value and priority. "Gate" means it needs an approval that already exists as an open decision in `docs/PRODUCT_DECISIONS.md`.

## 1. Customer perspective

| ID | Missing | Why customers expect it | Pri | Effort | Gate |
|---|---|---|---|---|---|
| MF-C01 | **One clear score with meaning** (band word, peer context, what to do) | Every credit and health score product does this | P0 | Med | X-04, D-B1–B4 |
| MF-C02 | **Recommendations after onboarding** (Actions filled from Money Map answers) | "Tell me what to do" is the main job | P0 | Med | D-B6 for official deltas |
| MF-C03 | Score history and "what changed" for the shown score | Proof of progress, a reason to return | P1 | Med | n/a |
| MF-C04 | Email, WhatsApp or push reminders (opt-in) | Users forget. Deadlines matter. | P1 | Med | M5-07 channel and cost |
| MF-C05 | Monthly check-in flow (re-confirm key numbers in 2 minutes) | Keeps data fresh without a full interview | P1 | Low | n/a |
| MF-C06 | Tax helper (old vs new regime, 80C/80D headroom) | Highest-intent money question in India every Jan–Mar | P1 | Med | D-B11 |
| MF-C07 | Insurance adequacy (how much term or health cover, not just yes/no) | Health shows yes/no only (K-39) | P1 | Med | D-B1 |
| MF-C08 | Goal templates (house, child education, retirement, car) with a ₹ plan | Concrete, emotional, shareable | P1 | Low–Med | D-B7 assumptions |
| MF-C09 | Real conversational Coach (LLM, grounded) | The "AI" promise | P1 | Med | LLM provider and budget (open since Phase 0) |
| MF-C10 | Help centre / FAQ, visible support channel with response time | Basic trust | P1 | Low | n/a |
| MF-C11 | Hindi (and later other languages) | Large share of the target market | P2 | High | D-B17 |
| MF-C12 | Document upload (salary slip, CAS statement) to prefill | Typing numbers is a chore | P2 | Med–High | Q-07 |
| MF-C13 | Account Aggregator connection | Accurate, fresh data | P3 | High | K-7 (regulated) |
| MF-C14 | Household / family view | Money decisions are family decisions in India | P2 | High | M5-10 privacy model |
| MF-C15 | Change password, 2FA option, readable device names | Account hygiene | P2 | Low | n/a |
| MF-C16 | Downloadable PDF report of the score and plan | Users share with a spouse or adviser | P2 | Low–Med | n/a |

## 2. Business perspective

| ID | Missing | Revenue / retention lever | Pri | Effort |
|---|---|---|---|---|
| MF-B01 | **Consumer premium tier** (monitoring, plans, household, human review) | Direct revenue | P1 | Med |
| MF-B02 | **Payment provider** (Razorpay or Stripe India), GST invoices with GSTIN, UPI Autopay mandates | Collect money at all | P0 before B2B go-live | Med |
| MF-B03 | Payment-gated B2B upgrades, trials, pilot contracts | Stops the FT-04 leak | P0 | Low |
| MF-B04 | Embeddable widget plus React SDK (promised in the workspace UI, not built) | The B2B product partners actually buy | P1 | Med–High |
| MF-B05 | Webhooks plus signed user tokens for partners | Integration depth, stickiness | P2 | Med |
| MF-B06 | Referral programme plus a privacy-safe shareable score card | Low-cost acquisition | P2 | Low–Med |
| MF-B07 | Employer / advisor aggregate dashboards (anonymised cohort health) | B2B2C value proof | P2 | Med |
| MF-B08 | Content and SEO hub (calculators, guides) | Organic acquisition | P2 | Med |
| MF-B09 | Lead hand-off to licensed partners (insurance, refinancing) with disclosure | Marketplace revenue | P3 | Med (+ licensing) |

## 3. Operational perspective

| ID | Missing | Why it matters | Pri | Effort |
|---|---|---|---|---|
| MF-O01 | **Product analytics** (funnel, cohorts, feature usage), consent-aware | Cannot manage what you cannot measure | P1 | Low–Med |
| MF-O02 | **Error tracking and alerting** (Sentry or similar), uptime monitoring | Silent failures in a finance app destroy trust | P1 | Low |
| MF-O03 | Admin / business dashboard (signups, activation, partner usage, invoices) | The founder's view of the business | P1 | Med |
| MF-O04 | Support console: escalation detail, reply to user, SLA timers, macros | Users currently may never get a reply (K-26) | P1 | Med |
| MF-O05 | Staff role management UI plus MFA (roles granted by CLI today) | Insider-risk control | P1 | Med |
| MF-O06 | Content management for nudge and education copy (non-developers can edit) | Iterate messaging without deploys | P3 | Med |
| MF-O07 | Feature flags / staged rollout | Safe experiments | P2 | Low |
| MF-O08 | Backups, restore drill, runbooks, on-call | Production readiness (MVP 6) | P1 before launch | Med |
| MF-O09 | A/B testing capability | CRO needs experiments | P3 | Low–Med |

## 4. Highest-value opportunities (where FinScore can be meaningfully better)
1. **"Unbiased by design"**: no fund selling, deterministic maths, explainable to the rupee. This is rare in Indian consumer finance, where most apps earn from distribution. Make it the brand promise.
2. **Health vs data-quality separation**: genuinely novel and honest. Promote it ("we tell you how sure we are").
3. **90-second Money Map**: faster than typical questionnaire-style planners. Use it as the top-of-funnel lead magnet, before signup.
4. **Privacy controls as a feature**: export, delete, consent, no bank login required. Put it on the landing page.
5. **B2B embedded wellness score**: employers and advisors need a neutral, explainable score that the platform already computes.
