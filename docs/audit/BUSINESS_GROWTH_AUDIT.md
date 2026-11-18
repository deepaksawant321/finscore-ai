# FinScore AI: Business and Growth Audit

**Date:** 2026-11-18 · Perspective: founder and investor. Market and competitor statements come from general industry knowledge and were **not verified against live sources in this audit**. No figure here is a quote or a measured result.

## 1. What the business is today
- **Consumer app (B2C):** free, no monetisation, no outbound channel. It scores financial health (two competing models), with modules for coach, health, actions, goals and what-if.
- **Partner platform (B2B):** workspaces, white-label, API keys, metered score API, placeholder plans (Starter free, 100 scores · Growth ₹24,999/month, 25k scores · Enterprise by sales). No payment collection. The widget and SDK are not built (K-47).
- **Build effort to date:** very large surface (17 routers, about 100 endpoints, 20+ screens) against **zero approved scoring methodology** and **zero validated users**.

## 2. Core strategic problem
The product was built **capability-first** (the 20 "AI capabilities" from the strategy deck) rather than **customer-problem-first**. The result is breadth without a closed value loop:

```
Intended:  Problem → Understand → Score → Explain → ACT → Verify → Improve → Return
Actual:    Answers → Draft score → (empty actions, no outbound) → end
```
The moat described in the blueprint (longitudinal Financial DNA plus verified outcomes) **requires users to return**, and nothing in the product makes them return.

## 3. Target customer and positioning

| Question | Current state | Recommendation |
|---|---|---|
| Who is it for? | Unstated. Chips imply ₹50k+/month households. The B2B workspace targets "any business" (D-B14). | Pick one beachhead: **salaried urban Indians aged 25–40 earning ₹50k–3L/month who already have at least one EMI or SIP.** They have money decisions, are digitally native, and can be monetised. |
| What job does it do? | "AI Financial Operating System". Too abstract. | "**Tell me if I'm on track and what to do next.**" |
| Why us? | Deterministic, explainable, privacy-first, no product selling. | Lean into **"unbiased: we don't sell you funds"** as the differentiator against distributor apps. |
| B2C or B2B first? | Both are half-built. | **Decide.** B2B (banks, NBFCs, employers, wealth platforms embedding a financial-wellness score) has a clearer path to revenue and cheaper acquisition. B2C builds brand and data. Recommended: **B2B2C wedge (employer financial wellness or advisor tool) with the consumer app as the delivery surface.** |

## 4. Revenue model options (for decision)

| Model | Fit | Pros | Cons / risk |
|---|---|---|---|
| **Consumer premium subscription** (monthly check-ins, plan builder, goal tracking, family view, priority human review) | Medium | Direct, recurring | Indian consumer willingness to pay for finance apps is low. Needs strong ongoing value. |
| **B2B score API / white-label** (current plans) | High | Larger contract value, sticky integrations | Needs an approved methodology and credibility, plus a sales cycle. The widget and SDK are not built. |
| **Employer financial wellness** (per employee per month) | High | Fits the "health score" framing, HR budgets exist | Needs reporting and a privacy-safe aggregate view. |
| **Advisor / RIA tool** (lead qualification + client health dashboard) | High | Advisors pay for qualified, scored leads and client monitoring | Perimeter questions are lighter for the tool itself. |
| **Marketplace referrals** (term insurance, health insurance, loan refinance) | Medium | Health gaps (no term or health cover) map naturally to products | Conflicts with the "unbiased" positioning. Needs licensing (IRDAI corporate agent / web aggregator) or a licensed partner, plus disclosure. |

**Recommended sequence:** (1) approve the score methodology → (2) B2B pilot with 1–2 partners (employer or advisor) at a design-partner price → (3) consumer premium only after D30 retention ≥ 20%.

## 5. Pricing assessment (current placeholders)
- Growth at ₹24,999/month for 25k scores (≈ ₹1/score) plus ₹0.80 overage. This is **cost-plus thinking, not value-based**. A lender pays for decision value, an employer for engagement.
- Starter at 100 free scores with a hard cap is a good sandbox. Keep it, but require a business email and approval before **live** keys.
- **Missing:** annual contracts, minimums, SLA tiers, pilot pricing, GST invoice compliance (no PDF, no GSTIN capture, K-45).

## 6. Features consuming resources without proportional value (stop or freeze)

| Feature | Why it is low ROI now |
|---|---|
| Second scoring model in parallel (20-pillar vs 15-factor) | Doubles engine, UI, tests and explanation work, and confuses users. **Pick one.** |
| White-label branding editor, fonts, "Powered by" removal | Valuable only after a paying partner exists. It is also leaking into consumer pages. |
| Clarity points, badges, active weeks | Fine and cheap, but polishing gamification before the core loop works is premature. Freeze. |
| Copilot affordability checks for 5 demo actions | Built on a placeholder action library. Freeze until D-B6. |
| Workspace go-live checklist and embed snippet for a widget that doesn't exist | It promises something unshipped. Hide until the widget exists. |
| DNA / persona with 3 demo personas | Thin. Hide until the persona catalogue (D-B5) exists. |

## 7. Unit economics considerations
- **AI cost:** currently zero (no LLM). Enabling the Coach adds variable cost per active user. Routing plus caching are planned. Set a per-user monthly cap tied to plan.
- **Fixed infrastructure:** ≈ $250–1,000/month early production (INFRASTRUCTURE_COSTS, unverified ranges).
- **Support cost:** "Talk to a person" plus the distress path implies staffed support with SLAs (placeholder 4h / 48h). This is a real operating expense that is not yet budgeted.
- **CAC:** consumer finance acquisition in India is expensive and dominated by large incumbents. Organic content plus partner distribution is the realistic channel.

## 8. Retention strategy (missing today)
1. **Monthly money check-in** (2 minutes): re-confirm 4 numbers, see the score change and why.
2. **Event calendar:** salary day, tax deadlines (advance tax, ITR, 80C by March), insurance renewal, SIP step-up anniversary.
3. **Weekly email digest** (opt-in): one insight, one action.
4. **Household:** invite your spouse. Shared goals.
5. **Verified progress:** "you closed your emergency fund gap", the north star "Verified Financial Progress" from the PRD.

## 9. Scalability
- **Technical:** single-instance constraints (FT-11) and the proxy-IP limiter (FT-01) must be fixed before scale.
- **Operational:** staff tooling is minimal (K-26). No admin analytics or business dashboard exists (signups, activation, partner usage, revenue).
- **Organisational:** the deep documentation discipline is an asset. But 25+ open product decisions (PRODUCT_DECISIONS §B) are now the bottleneck, not engineering.

## 10. Five biggest business risks
1. **No approved methodology:** cannot launch the core promise (K-9, K-49).
2. **Regulatory perimeter undefined** (SEBI IA/RA, IRDAI if referrals happen): could force a redesign of Coach and Actions.
3. **No retention loop:** LTV close to one session. The longitudinal moat never forms.
4. **Unfocused segment and model:** B2C and B2B are both half-built, so neither ships.
5. **Trust deficit:** no legal pages, no company identity, "draft / demo" everywhere, in a category where trust is the product.
