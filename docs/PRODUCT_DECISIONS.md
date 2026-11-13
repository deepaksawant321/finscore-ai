# FinScore AI — Product Decisions Log

**Legend:** 🔴 Blocks a build phase · 🟠 Blocks launch · 🟡 Clarification · ✅ Technical decision (made by engineering, informational)
Status values: OPEN / PROPOSED-AWAITING-APPROVAL / APPROVED / REJECTED.

## A. Conflicts and inconsistencies found in the source documents
| ID | Finding | Evidence | Impact | Proposed resolution | Status |
|---|---|---|---|---|---|
| D-A1 🔴 | **"20 pillars" means two different things.** Deck/PRD list 20 *AI product capabilities* (Interview … Wealth OS). Blueprint §6 lists a *different* 20 *scoring pillars* (cash-flow, emergency, debt, …), labelled PROPOSED. Master prompt's "20-pillar weights" refers to the scoring set. | S5 vs B§4 vs B§6 | Rulebook, DB and UI must not conflate them. | Call them **AI Capabilities (AC-01..20)** and **Score Pillars (SP-01..20)** everywhere. Score Pillar list stays PENDING until Product approves/replaces the Blueprint proposal. | OPEN |
| D-A2 🔴 | Scoring pillar weights, thresholds, 0–100 scales, formulas absent. | B§6, §29 | Cannot compute an official FinScore. | Build scoring *framework* + versioned Rulebook with every value `PENDING PRODUCT APPROVAL`. Use clearly-labelled **non-production placeholder rule set** only in dev/test fixtures. | OPEN |
| D-A3 🔴 | Age × FinScore stage matrix not supplied; deck gives only score bands. | S4, B§8 | Stage may differ from band for a given age. | Implement stage resolver that reads matrix from Rulebook; until supplied, expose *band-only provisional stage* flagged "provisional". | OPEN |
| D-A4 🟡 | Deck timeline shows 665 → 689 (3M) → 712 (6M) and says "reach **Independence in 9 months**". But 689 ≥ 675 is already the Independence band at 3 months. | S9, S4 | Either age matrix/persistence rule delays the stage, or the example is inconsistent. | Treat deck numbers as **illustrative UI mock only**. Stage-persistence rule (e.g. 30 days, B§8) and age matrix decide real timing. | OPEN |
| D-A5 🟡 | Explainability example: +42 +35 +18 −22 −14 −11 = **+48**, not tied to 665. Baseline undefined. | S8 | Need a defined meaning for "contribution". | Define contribution = pillar's weighted points above/below a **reference score** (reference PENDING); sum of contributions + reference = overall score exactly (additivity invariant, tested). | OPEN |
| D-A6 🟡 | Deck backend says "SHAP-value-style attribution" (ML); Blueprint says every movement must map to a deterministic factor. | S14 vs B§9 | ML attribution is non-deterministic/hard to audit. | Weighted-additive scoring makes **exact decomposition** possible — no SHAP needed in MVP. | PROPOSED |
| D-A7 🟡 | Gamification: deck "Level 12 · The Builder" vs Blueprint "10 ladder levels per persona (Builder 1–10)". | S11 vs B§8, §14 | Level model differs. | Use Blueprint ladder (10 per persona); deck number is mock. | OPEN |
| D-A8 🟡 | "AI Wealth Persona": deck "The Builder" is a persona; Blueprint also maps stage names to gamified names (Accumulation = The Builder). Persona vs stage-name overlap. | S7, B§8 | Is persona derived from DNA, or from stage? Blueprint §7 says DNA + state; §8 says stage name. | Keep **Persona** (DNA-driven, §7) and **Stage nickname** (stage-driven, §8) as two separate fields. Persona catalogue PENDING. | OPEN |
| D-A9 🟡 | Score Predictor (AC-07) and Prediction Engine (AC-12) overlap. | S5, B§4 | Duplicate modules risk. | AC-07 is a *consumer* of AC-12's projection core; one `projection` domain module. | PROPOSED |
| D-A10 🟡 | Master-prompt MVP 5 places Family Graph/Portfolio before commercial; Blueprint roadmap places Connect (AA, Portfolio, Family) after Engage. Deck: 3 phases. | prompt §7, B§27, S16 | Sequencing. | See `IMPLEMENTATION_ROADMAP.md` (reassessed). | PROPOSED |
| D-A11 🟡 | Blueprint text contains broken citation artefacts (`fileciteturn…`, `citeturn…`) and external research claims not independently verified. | B passim | Cannot be treated as requirements. | Ignored as requirements; research context only. | NOTED |
| D-A12 🟡 | Marketing claims (50% onboarding reduction; "+₹48L in 10 years"; "Portfolio recovers in 3.2yr") are examples. | S6, S9 | Must not ship as facts. | Treated as UI examples/target KPIs; never hard-coded in product. | NOTED |

## B. Missing Product Team decisions
| ID | Decision needed | Needed by | Owner |
|---|---|---|---|
| D-B1 🔴 | Final list of 20 Score Pillars, definitions, sub-factors | Before MVP 2 scoring work | Product + Quant |
| D-B2 🔴 | Pillar weights, normalisation scales (raw→0–100), thresholds, min data, fallback rules | MVP 2 | Quant/Finance |
| D-B3 🔴 | Overall 0–100→300–900 mapping (linear? curve?) | MVP 2 | Quant |
| D-B4 🔴 | Age × FinScore stage matrix; stage persistence/verification rule | MVP 2 | Product |
| D-B5 🟠 | Persona catalogue + DNA→persona mapping; DNA trait thresholds | MVP 2 | Product + AI |
| D-B6 🟠 | Action library, approved actions per gap, score deltas, time-to-impact | MVP 4 | Product + Quant |
| D-B7 🟠 | Simulation assumptions (return, inflation, tax, SIP step-up), Monte Carlo method, confidence ranges | MVP 4 | Quant |
| D-B8 🟠 | Data freshness windows per fact class | MVP 2 | Product |
| D-B9 🟠 | Advice/compliance classification, perimeter (education vs advice), SEBI registration status of 5nance | Before MVP 3 public use | Legal/Compliance |
| D-B10 🟠 | Human escalation policy (triggers, SLA, who staffs) | MVP 3 | Compliance/CS |
| D-B11 🟠 | Tax regime rules scope (old/new regime, FY, deductions to model) | MVP 2/4 | Quant |
| D-B12 🟡 | Risk-profiling methodology (approved questionnaire?) | MVP 2 | Compliance |
| D-B13 🟡 | Subscription plans, prices, quotas, free-tier limits, trial, currency/GST | MVP 6 | Product/Growth |
| D-B14 🟡 | B2B scope: who are tenants (advisors, banks, employers)? white-label? admin roles? | MVP 6 | Product |
| D-B15 🟡 | Global scope: which countries/currencies/tax systems after India? MVP is India-only unless told. | MVP 1 | Product |
| D-B16 🟡 | Data retention periods, deletion/export rules per data class | MVP 1 | Legal |
| D-B17 🟡 | Languages (English only at MVP? Hindi?) | MVP 2 | Product |
| D-B18 🟡 | Persona/communication style guidelines, brand voice, 5nance logo/colours (Original identity requested) | MVP 1 UI | Brand |
| D-B19 🟡 | Gamification XP economy approval; badges catalogue | MVP 5 | Product |
| D-B20 🟠 | Regulated data sources (Account Aggregator FIU registration, MF/insurance APIs) | MVP 5+ | Product/Legal |
| D-B22 🟠 | Minimum data/confidence required before a wealth stage may be shown (engineering placeholder: 50% of pillar weight scored; below that the UI says "early estimate" and hides the stage) | MVP 2 | Product + Quant |
| D-B23 🟠 | Erasure rules: cooling-off length (placeholder 7 days), what must be retained (audit ids, completion record, any financial-record retention law), who can request on behalf of a user | MVP 6 | Legal |
| D-B24 🟠 | Escalation policy: reasons, SLA (placeholder 4h distress / 48h other), staffing, tooling for staff; helpline wording per country | MVP 3 | Compliance/CS |
| D-B21 🟡 | Human-agent staffing/tool for escalation (internal inbox, CRM?) | MVP 3 | CS |

## C. Technical decisions made (informational; challenge any)
| ID | Decision | Why |
|---|---|---|
| T-1 ✅ | **Modular monolith** (FastAPI), single deployable, domain modules with enforced import boundaries. | Lowest cost/ops; no measured scale need. |
| T-2 ✅ | Financial engines live in a **pure-Python package with zero I/O and zero LLM imports**, using `Decimal` for money. | Reproducibility, independent testing. |
| T-3 ✅ | Rulebook = versioned YAML/JSON + DB-stored published versions; each score run stores `rulebook_version`. | Audit & rollback. |
| T-4 ✅ | Sync SQLAlchemy 2.0 first? **No:** async SQLAlchemy 2.0 + asyncpg. | Chat/streaming workloads. |
| T-5 ✅ | Auth: first-party email+password (Argon2id) + short-lived JWT access + rotating refresh cookie; OIDC/OTP optional later. | Avoid recurring vendor cost; India OTP login deferred (costs). |
| T-6 ✅ | Redis + worker (ARQ/Celery) introduced **only at MVP 4/5** (async jobs, nudges). Not in MVP 1. | Avoid unjustified infra. |
| T-7 ✅ | LLM provider abstraction with Anthropic first-class + pluggable others; PII-minimised prompts. | Cost/flex; see AI_ARCHITECTURE. |
| T-8 ✅ | Monetary values stored as `NUMERIC(18,2)` in minor-aware currency field (INR default). | Accuracy. |
| T-9 ✅ | Frontend: Next.js App Router + Tailwind as primary; **MUI avoided** unless a complex component (data grid, date pickers) needs it — two styling systems bloat bundle and hurt design consistency. Recharts/visx for charts. | Technical benefit; flagged for approval (deviation from stack list). |

## C2. Approval record
2026-11-13: Product Owner replied "Approve, proceed" to the Phase 0 package. Applied as approval of recommendations 1–7 and 11 in PHASE0_DESIGN_REVIEW §5. Items 8 (LLM provider/cap), 9 (hosting) and 10 (★ priority pillars) were not answered and remain OPEN; none is needed for MVP 1. Implementation deviations logged in KNOWN_ISSUES K-14, K-15.

## D. Approvals requested now (original Phase 0 list)
1. Confirm D-A1 naming split (AI Capabilities vs Score Pillars).
2. Approve T-9 (Tailwind-first, MUI only where justified).
3. Confirm India-only for MVP 1–4 (D-B15).
4. Approve using a **non-production placeholder rule set** (clearly watermarked "DEMO RULES — NOT OFFICIAL") so UI, API and tests can be built before D-B1–B4 land.
5. Choose LLM provider(s) and monthly AI budget ceiling (see `INFRASTRUCTURE_COSTS.md`).
