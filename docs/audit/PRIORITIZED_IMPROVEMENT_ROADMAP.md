# FinScore AI: Prioritised Improvement Roadmap

**Date:** 2026-11-18 · **Status: PROPOSAL, nothing has been implemented.** Every item needs Product Owner approval before work starts. Finding IDs refer to the other audit documents (FT = functional/technical, SEC = security, UX, CRO, BIZ/MF = business/missing features).

## Master finding register (all priorities)

| ID | Finding | Pri | Effort | Owner |
|---|---|---|---|---|
| FT-01 / SEC-01 | Rate limiter and audit use the proxy IP: site-wide 10 signups/hour, auth DoS | **P0** | Low–Med | Eng |
| FT-02 / UX-01 | Two scores. Score tab "No score yet" after onboarding | **P0** | Med + decision | Product → Eng |
| FT-03 | No approved scoring methodology (prod returns 503) | **P0** | High (non-eng) | Product/Quant |
| FT-04 | B2B paid upgrade granted with no payment | **P0** (pre-B2B) | Low | Eng |
| SEC-02 | No privacy policy, terms, grievance contact. No terms consent at signup | **P0** | Low eng / Med legal | Legal + Eng |
| SEC-03 | SEBI advice perimeter undecided | **P0** | Med (legal) | Legal |
| UX-02 | Empty DNA / Actions / Today / Score after onboarding | **P0** | Med | Eng |
| UX-07 | Landing page doesn't sell. Stale "not available" notice | P1 | Low–Med | Product/Eng |
| FT-05 / SEC-04 | Tenant theme leaks to public pages and other users | P1 | Low | Eng |
| UX-04 | Engineering and internal wording in customer UI | P1 | Low | Product |
| UX-05 | Score reveal has no meaning or next action | P1 | Med | Product/Eng |
| FT-16 / UX-06 | Health says "Healthy" with protection unknown | P1 | Low | Eng |
| UX-08 / FT-12 / CRO R1, R3 | Raw errors, email wall, no resend, no auto-login | P1 | Low | Eng |
| UX-03 | Navigation overload (14 items, duplicate entry points) | P1 | Med | Product/Eng |
| FT-06 | Shown score not persisted: no history or trend | P1 | Med | Eng |
| FT-07 / UX-11 | Coach narrow, misroutes, no LLM | P1 | Med | PO decision + Eng |
| FT-08 | No outbound channel | P1 | Med | PO decision + Eng |
| FT-09 | No analytics or error tracking | P1 | Low–Med | Eng |
| FT-10 | CI and Docker never green. 20 uncommitted files | P1 | Low | Eng |
| SEC-05 | No CSP | P1 | Low–Med | Eng |
| SEC-08 | No MFA for staff | P1 | Med | Eng |
| SEC-11 | LLM processor not disclosed (before enabling) | P1 | Low | Legal |
| BIZ-01 / MF-B01 | No consumer revenue model | P1 | Med | Product |
| MF-O04 | Support console cannot reply to users | P1 | Med | Eng |
| FT-11 | Single-instance only (in-memory limiter, in-process jobs) | P2 | Med | Eng |
| UX-09, UX-10 | Money Map counts, back button, jargon, affluent chips | P2 | Low | Product/Eng |
| UX-12 | What-if needs expert assumptions | P2 | Low–Med | Product/Eng |
| UX-13 / MF-C15 | Settings: change password, device names, plan, legal links | P2 | Low | Eng |
| UX-14 | Accessibility not tested (no axe) | P2 | Low | Eng |
| FT-13 | No favicon, OG, robots, sitemap | P2 | Low | Eng |
| FT-14 | Interview restarts each visit | P2 | Low–Med | Eng |
| FT-15 | English-only keyword NLP | P2 | Med–High | Eng |
| SEC-06, 07, 09, 10, 12 | Lockout abuse, HS256, single key, breached passwords, staff access | P2 | Low–Med | Eng |
| UX-15 | Loading and error states without retry | P3 | Low | Eng |

---

## Phase 1: Critical fixes (2–3 weeks of engineering + parallel Product/Legal work)
**Goal:** nothing broken, nothing misleading, legally presentable to a closed beta.

| # | Item | Why it matters | Target result |
|---|---|---|---|
| 1.1 | Fix client-IP handling and rate limits (FT-01) | Without it, growth stops at about 10 signups an hour and auth can be DoS'd | Load test: 1,000 signups in an hour with 0 false 429s |
| 1.2 | **Decide the one FinScore** (X-04) and route every screen to it (FT-02) | The biggest trust breaker | One score visible on Home, Score and Coach |
| 1.3 | Fill or hide empty modules after onboarding (UX-02) | Dead ends kill activation | 100% of visible nav pages have content after the Snapshot chapter |
| 1.4 | Block unpaid B2B upgrades (FT-04) | Revenue leak | No paid entitlement without payment or sales approval |
| 1.5 | Privacy Notice, Terms, Disclaimer, grievance contact. Terms consent at signup (SEC-02) | Legal floor for handling financial data | Pages live. Consent version stored for 100% of new users |
| 1.6 | Legal perimeter opinion (SEC-03) | Determines what the Coach and Actions may say | Written decision |
| 1.7 | Tenant theme scoped to the workspace session, cleared on logout (FT-05) | Brand and privacy | Public pages never show tenant brand |
| 1.8 | Health headline "Incomplete" when protection is unknown (FT-16) | Avoid false reassurance | n/a |
| 1.9 | Landing page: remove the stale MVP notice (minimum) | It contradicts the CTA | n/a |
| 1.10 | Green CI on GitHub, `docker compose up` verified, commit the work in progress (FT-10) | Deploy safety | CI green on `main` |
| 1.11 | Product analytics plus error tracking (FT-09) | Every later phase needs measurement | Funnel dashboard live |

**Product/Quant in parallel:** approve the methodology (D-B1–B4 or the workbook model), action library (D-B6), simulation assumptions (D-B7).

## Phase 2: UX and conversion (3–5 weeks)
**Goal:** a non-technical user signs up, understands their score and takes one action without help.

| # | Item | Target metric |
|---|---|---|
| 2.1 | Landing page rewrite (CONVERSION_RATE_AUDIT §3) | Landing → register ≥ 8% |
| 2.2 | Money Map before signup ("save your score" at the reveal), auto-login after verify, resend link | Visitor → account ≥ 2× baseline. Signup → first answer ≥ 80% |
| 2.3 | Friendly per-field errors, show-password, client validation | Registration completion ≥ 70% |
| 2.4 | Score reveal card: band, strength, gap, one action with impact | Reveal → action click ≥ 40% |
| 2.5 | Navigation down to 5 items. Money Map in the mobile bar. Merge Talk and Coach | Fewer nav dead-ends. Time to first action |
| 2.6 | Rewrite all internal/engineering copy. One calm "beta" label | Trust rating ≥ 4/5 in a 5-user test |
| 2.7 | Persist the shown score and show the trend (FT-06) | Score history for 100% of users with ≥ 2 runs |
| 2.8 | Coach: approve the LLM plus budget, add "explain my score" intent, fix the badge | Fallback rate ≤ 30% on the top-50 questions |
| 2.9 | Money Map polish: accurate counts, Back, plain-language facts, segment-aware chips | Snapshot completion ≥ 85% |
| 2.10 | What-if prefilled from the profile, with approved scenario presets | Simulations per active user |

## Phase 3: Business growth (6–10 weeks)
**Goal:** a repeatable reason to return and a way to pay.

| # | Item | Target metric |
|---|---|---|
| 3.1 | Choose the beachhead (B2B2C employer/advisor recommended) and run a design-partner pilot | 1–2 signed pilots |
| 3.2 | Payment provider, GST invoices, UPI Autopay / mandates (MF-B02) | First collected rupee |
| 3.3 | Embeddable widget + React SDK (MF-B04) | Pilot partner live |
| 3.4 | Outbound channel: weekly email digest plus event reminders (opt-in) | D30 retention ≥ 20% |
| 3.5 | Monthly check-in flow (MF-C05) | ≥ 40% of MAU complete a monthly check-in |
| 3.6 | Consumer premium tier definition and paywall (if B2C is pursued) | Free → paid ≥ 3% (validate) |
| 3.7 | Tax helper and insurance adequacy (MF-C06, C07) | Seasonal activation spike Jan–Mar |
| 3.8 | Support console with reply-to-user and SLA timers (MF-O04) | 95% of tickets answered within SLA |
| 3.9 | Referral plus privacy-safe share card | K-factor ≥ 0.1 |

## Phase 4: Product excellence (ongoing)
| # | Item | Target metric |
|---|---|---|
| 4.1 | Real LLM extraction with golden-set evaluation, then Hindi | Extraction accuracy ≥ agreed target |
| 4.2 | Household view with per-member permissions | Households per 100 users |
| 4.3 | Document upload, then Account Aggregator (approval-gated) | Share of facts "connected" vs "stated" |
| 4.4 | Score prediction with ranges (once D-B7 is approved) | Engagement with projections |
| 4.5 | Redis limiter plus worker, horizontal scale, KMS per-user keys, RS256, MFA for all | 2+ replicas, pen-test criticals closed |
| 4.6 | Admin business dashboard, cohort analytics, A/B testing | Experiments per month |
| 4.7 | Accessibility AA audit and fixes | 0 serious axe violations |
