# FinScore AI: Executive Product Audit

**Date:** 2026-11-18 · **Product:** FinScore AI by 5nance (`finscore-ai` repo, working tree as of today) · **Status:** audit only. **No code, data or configuration in the project was changed.**

## How this audit was done
- Read all 18 project documents (requirements, decisions, rulebook, tracker, known issues, architecture, security, costs).
- Mapped 31 frontend routes and about 100 API endpoints. Read the auth, rate-limiting, theming, billing and partner code.
- **Ran the app locally** (embedded PostgreSQL already at the latest migration, backend on :8001, existing frontend on :3000). Walked through it in a browser as a brand-new user: registered, verified email, logged in, completed the Money Map, visited every customer page, asked the Coach 3 questions, reviewed Settings. Phone and desktop widths. Evidence screenshots are in [`screenshots/`](screenshots/).
- **Not done:** test suites were not re-run. No Docker or CI run, no load or penetration test, no automated accessibility scan. Account deletion, support request and B2B billing were reviewed but not executed. Competitor notes come from general knowledge, not live research. The API on :8001 was already running before the audit. My attempt to start a second copy exited immediately, so all tests ran against the existing process. The only change outside the project: one unused backend entry added to the session launch file (`D:\Deepak\AI Projects\.claude\launch.json`). The local dev database now has the throwaway test account.

## The one-paragraph verdict
FinScore AI is **well engineered and honestly documented, but it is not yet a product a customer can understand, trust or pay for.** The engineering is careful: deterministic calculation engines, strong auth, privacy controls, an advice guard, 340+ backend tests. The Money Map onboarding is genuinely good, with a first score in about 90 seconds. But the product has **two competing scores**, **no approved scoring method**, **empty screens right after onboarding**, **no legal pages**, **no way to pay**, and **no reason to come back**. The bottleneck is no longer engineering. It is **product decisions** (25+ open in PRODUCT_DECISIONS) and **focus** (20 capabilities, B2C and B2B, all built partway).

## Top findings (details in the linked documents)

| # | Finding | Priority | Document |
|---|---|---|---|
| 1 | Rate limiter keys on the proxy IP: the whole site shares 10 signups an hour and 10 logins a minute, and one client can lock out all logins | P0 | FUNCTIONAL_TECHNICAL FT-01 |
| 2 | Two different FinScores. After onboarding (607/900) the Score tab says "No score yet" | P0 | FT-02, UX-01 |
| 3 | No approved scoring methodology. Every number is labelled DEMO or DRAFT. Production refuses to score | P0 | FT-03 |
| 4 | DNA, Actions, Today and Score are empty after onboarding. The user hits dead ends | P0 | UX-02 |
| 5 | No Privacy Policy, Terms or grievance contact. No terms consent at signup | P0 | SECURITY SEC-02 |
| 6 | SEBI advice perimeter undecided, yet the product suggests "next best actions" | P0 | SEC-03 |
| 7 | B2B workspaces can upgrade to the paid plan instantly without paying | P0 (before B2B) | FT-04 |
| 8 | Landing page doesn't explain the product, says it is "not available yet", shows another tenant's brand | P1 | UX-07, FT-05 |
| 9 | No outbound channel (email, push, WhatsApp), so no retention loop | P1 | FT-08 |
| 10 | No analytics or error tracking, so no metric in this audit can be measured | P1 | FT-09 |

## Final Product Owner assessment

**1. Is this application ready for real customers?**
**No.** It is ready for a **closed, invited beta** only after the Phase 1 fixes (rate limits, one score, legal pages, no empty dead ends). It should not see public users while every score says "not official".

**2. Is it user-friendly enough for non-technical users?**
**Onboarding: yes. Everything after: no.** A non-technical user gets through the Money Map easily, then meets a contradictory Score page, empty modules, engineering wording ("built from the business spreadsheets") and a Coach that answers mostly with a menu.

**3. Does it have a compelling reason to register?**
**Not as presented.** The landing page asks a question but never states the benefit. "Free financial health score in 90 seconds, no bank login" is compelling, but the page doesn't say it. Registration also comes *before* any value.

**4. Does it provide enough value to justify payment?**
**Not yet.** Value today is one draft score plus a few green, amber and red checks. Paid value needs *ongoing* benefit: monitoring, a personal plan, reminders, human review. None of that is complete, and there is nothing to buy.

**5. Where are we most likely losing customers?**
(a) Landing page → register (unclear value). (b) Signup → verified login (email wall). (c) **Score reveal → next step (two scores, empty pages)**, which is the single worst point. (d) Week 1 → week 4 (nothing brings them back).

**6. Five biggest business risks**
1. No approved methodology: the core promise cannot launch.
2. Regulatory perimeter (SEBI; IRDAI if referrals happen) could force a redesign of the Coach and Actions.
3. No retention loop, so no longitudinal data, so the claimed moat never forms.
4. Unfocused model: B2C and B2B both half-built, so neither ships.
5. Trust deficit in a category where trust *is* the product.

**7. Ten highest-impact improvements**
1. Decide on one FinScore and show it everywhere.
2. Fix client-IP handling and rate limits.
3. Fill or hide every module after onboarding. Give one clear next action at the score reveal.
4. Publish Privacy, Terms and Disclaimer pages, plus terms consent at signup.
5. Get the legal perimeter opinion. Frame everything as education until then.
6. Rewrite the landing page around "free score in 90 seconds, no bank login, unbiased".
7. Let people start the Money Map before creating an account. Auto-login after verifying.
8. Add a weekly email and a monthly check-in (opt-in) to create the return loop.
9. Instrument the funnel (analytics plus error tracking) before any marketing spend.
10. Cut navigation to 5 items and remove all internal or engineering wording.

**8. Missing features that could significantly improve revenue**
Payment provider with GST invoices and UPI mandates. Embeddable widget and SDK for partners. Employer/advisor cohort dashboards. Consumer premium (monitoring, plan, household, human review). Tax helper (seasonal spike). Insurance adequacy (and, only with licensing and disclosure, licensed-partner referrals).

**9. What should we stop building?**
Freeze: the parallel second score model (pick one); white-label branding polish and the go-live checklist for a widget that doesn't exist; extra gamification; Copilot checks on placeholder actions; DNA/persona with 3 demo personas. **No new capability** until the core loop (answer → score → act → return) works end to end.

**10. What should we build next?**
The **closed loop for one score**: Money Map → one score with meaning → 1–3 recommended actions from approved rules → mark done → monthly check-in shows verified progress → weekly email. Then the payment rail and the partner widget for a pilot.

**11. What must be fixed before marketing or launching?**
All P0s: rate limits, one score, empty modules, legal pages and consent, perimeter opinion, the B2B payment gate. Plus the landing rewrite, analytics, error tracking, a green CI and a verified deploy, and removing every "DEMO / DRAFT / engineering" label (which needs the methodology approved).

**12. If I were the founder, what would I change immediately?**
- Lock the Product, Quant and Legal owners in a room for one week to close D-B1–B4, D-B6, D-B9 and X-04. These decisions block more value than any code.
- **Freeze feature scope.** Spend the next 4–6 weeks only on coherence, trust and the return loop.
- Choose **one beachhead** (recommended: employer or advisor B2B2C pilot) and sign one design partner.
- Put "**unbiased, explainable, private**" on the front page. It is the true differentiator.

## Scores (out of 100)

| Area | Score | Reasoning |
|---|---|---|
| **User Experience** | **48** | Onboarding is excellent (fast, tappable, instant feedback), but the post-onboarding experience contradicts itself (two scores, "No score yet"), is mostly empty and uses internal language. Navigation is overloaded. |
| **UI Quality** | **74** | Polished, consistent design system. Good typography, dark mode, responsive. Points lost for the tenant-brand leak, capitalised watermarks, bare score reveal and minimal loading and error states. |
| **Functionality** | **55** | Most features work technically and are tested (auth, journey, coach guards, simulator, privacy). But key flows deliver nothing for the main onboarding path, the Coach is narrow, there is no outbound channel, and no consumer payment. |
| **Customer Trust** | **30** | No legal pages, no company identity, no regulatory statement, "DEMO/DRAFT/NOT APPROVED" on every number, an unsubstantiated "bank-grade" claim. In-app privacy controls are genuinely good, but nobody sees them before signing up. |
| **Conversion Readiness** | **28** | The landing page doesn't sell, there is an email wall before value, dead ends after first value, no analytics to measure anything, and nothing to buy. |
| **Business Model** | **25** | No consumer monetisation. B2B plans are placeholders, upgrades are free and payments are not collected. Segment and go-to-market undecided. A large build relative to validated demand. |
| **Retention Potential** | **30** | The architecture has the right ideas (nudges, check-ins, verified actions, outbox events) but nothing reaches users outside the app, the shown score has no history, and the actions library is empty for most users. |
| **Technical Quality** | **76** | Clean modular monolith, pure deterministic engines, strong typing, import contracts, 340+ backend tests, excellent documentation. Points lost for the proxy-IP flaw, single-instance constraints, CI and Docker never verified, uncommitted work, no observability. |
| **Security** | **63** | Strong auth design (Argon2id, live-session checks, refresh reuse detection), encryption, audit chain, export and erasure, advice guard. Points lost for the rate-limit bypass and DoS, no CSP, no MFA (staff), lockout abuse, single encryption key, missing legal and consent layer. |
| **Overall Product Readiness** | **36** | Strong foundation, not launch-ready. Roughly 2–3 weeks of focused engineering plus decisions from Product, Quant and Legal reach a credible closed beta. A public launch also needs Phases 2 and 3 of the roadmap. |

## Document index
1. [EXECUTIVE_PRODUCT_AUDIT.md](EXECUTIVE_PRODUCT_AUDIT.md) (this file)
2. [USER_EXPERIENCE_AUDIT.md](USER_EXPERIENCE_AUDIT.md)
3. [CONVERSION_RATE_AUDIT.md](CONVERSION_RATE_AUDIT.md)
4. [BUSINESS_GROWTH_AUDIT.md](BUSINESS_GROWTH_AUDIT.md)
5. [FUNCTIONAL_TECHNICAL_AUDIT.md](FUNCTIONAL_TECHNICAL_AUDIT.md)
6. [MISSING_FEATURES_AND_OPPORTUNITIES.md](MISSING_FEATURES_AND_OPPORTUNITIES.md)
7. [SECURITY_AND_TRUST_AUDIT.md](SECURITY_AND_TRUST_AUDIT.md)
8. [COMPETITOR_GAP_ANALYSIS.md](COMPETITOR_GAP_ANALYSIS.md)
9. [PRIORITIZED_IMPROVEMENT_ROADMAP.md](PRIORITIZED_IMPROVEMENT_ROADMAP.md)
10. [USER_JOURNEY_AND_DROPOFF_ANALYSIS.md](USER_JOURNEY_AND_DROPOFF_ANALYSIS.md)

**Next step:** approve, reject or reprioritise the Phase 1 items in PRIORITIZED_IMPROVEMENT_ROADMAP.md. No implementation will start without your approval.
