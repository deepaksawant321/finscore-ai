# FinScore AI: Conversion Rate Optimisation Audit

**Date:** 2026-11-18. No analytics exist (FT-09), so **no conversion rate below is measured**. Stage assessments come from walking through the funnel and from known UX patterns. Targets are proposals to validate once instrumentation is live.

## 1. Funnel as it exists today

```
Visitor → Landing → Register → Verify email → Login → Money Map (9 taps) → Draft score
   → [Score tab: "No score yet"] → empty DNA/Actions/Today → ??? (no payment path, no outbound re-engagement)
```

| Stage | Friction found (evidence) | Severity | Fix | Target metric (to validate) |
|---|---|---|---|---|
| **Visitor → Landing** | No SEO assets, no content, no OG preview (FT-13). | High | Content and landing pages per use case (retirement, loans, "am I on track"). | Organic sessions per month. |
| **Landing → Register** | Unclear value. No product visual. No proof. Stale "not available yet" notice. Tenant logo. No pricing or FAQ (screenshot 01). | **Critical** | Rewrite (§3). | Landing → register CTR ≥ 8%. |
| **Register → Verify** | Raw errors. No terms consent. Password rules shown up front but enforced late. | High | Inline validation, show password, or passwordless (email magic link / mobile OTP). | Form completion ≥ 70%. |
| **Verify → Login** | Hard gate: no product access until the email is verified. No resend. Not logged in after verifying (live test). | **Critical** | Let the user start Money Map immediately after signup, then verify before saving to the long-term profile, export or 7 days. Auto-login from the verify link. Resend button. | Signup → first answer ≥ 80% (today every user must leave for their inbox first). |
| **Login → First value** | Strong: about 90 seconds to a score (9 taps). | Low | Keep. Move Money Map into the mobile bottom bar. | Signup → score ≥ 60%. |
| **First value → Understanding** | Bare "607/900". Draft disclaimer in capitals. No meaning, no action (screenshot 05). | High | Reveal card with band, strength, gap and one action. | Reveal → action click ≥ 40%. |
| **Understanding → Engagement** | Score tab says "No score yet". DNA, Actions and Today are empty (screenshots 07, 09). | **Critical** | One score. Feed every module from onboarding answers. | Day-1 pages with content = 100%. |
| **Engagement → Payment** | **No consumer payment path exists.** B2B upgrades are free and instant (FT-04). | **Critical** (business) | Define the consumer premium tier (BUSINESS_GROWTH_AUDIT §4). | Free → paid ≥ 3–5% (benchmark for freemium consumer finance; validate). |
| **Payment → Retention** | No email, push or WhatsApp. Nudges only in-app. Weekly check-in only in-app (FT-08). | **Critical** | Weekly money email plus monthly "score refresh" with real change. | D30 retention ≥ 20%. |
| **Retention → Referral** | No referral, no shareable score card, no family invite. | High | Shareable (privacy-safe) score band card. "Check your partner's money health" household invite. | K-factor ≥ 0.1. |

## 2. The five biggest leaks (ranked by expected revenue impact)
1. **No reason to return** (no outbound channel, nothing changes over time without new data). It caps lifetime value at one visit.
2. **Dead ends after first value** (two scores, empty modules). This is where trust breaks.
3. **Email-verification wall before any value.** Typically one of the steepest drop-offs in consumer signups.
4. **Landing page does not sell.** Visitors leave without understanding the offer.
5. **Nothing to buy.** Even delighted users cannot pay.

## 3. Landing page rewrite (proposal for approval)
**Above the fold (5-second test):**
- Headline: *"Know exactly where your money stands, in 90 seconds."*
- Sub: *"A free financial health score for Indians, explained in plain language, with the one next step that improves it. No documents, no bank login."*
- Primary CTA: **"Get my free score"**. Secondary: "See how it works".
- Visual: a real screenshot of the score reveal (with sample data, labelled "example").
- Trust strip: "Free · No bank login needed · Delete your data anytime · Built by 5nance" plus a link to the privacy page.

**Below the fold:** 3-step how-it-works (Answer 9 taps → Get your score → Get your next step); what the score covers (cash flow, loans, protection, retirement…); a sample insight; "Is this financial advice?" FAQ (education vs advice); security and privacy summary; for-business section linking to the partner page; footer with legal links and contact.

**Remove:** the "Platform foundation build (MVP 1)…" paragraph and the tenant brand mark.

## 4. Registration experiments (prioritised)
| # | Change | Hypothesis | Metric |
|---|---|---|---|
| R1 | Start Money Map **before** account creation; ask for email to "save your score" at the reveal | Value first lifts signups (the score works as a lead magnet) | Visitor → account ≥ 2× today's baseline |
| R2 | Mobile OTP login (needs a cost approval: DLT-registered SMS, T-5 deferred) | Indian users prefer OTP to passwords | Signup completion |
| R3 | Auto-login after verify, plus a resend link | Removes a whole step | Verify → first session |
| R4 | Remove name field (already optional) | Fewer fields | Form completion |

## 5. Activation definition (proposed)
**Activated user = completed the Snapshot chapter AND viewed one recommended action within 24 hours.** Today the second half is impossible for most users (the Actions page is empty), which is the clearest sign of the activation gap.

## 6. Free → paid, retention, lifetime value
- **Free → paid:** needs a premium tier tied to *ongoing* value (monitoring, plans, human review), not to the one-off score. See BUSINESS_GROWTH_AUDIT.
- **Cancellation:** no consumer subscription exists, so there is no cancellation flow. Account deletion exists and is clear (good). When subscriptions launch: self-serve cancel in 2 clicks, a pause option, and an exit survey.
- **Repeat usage:** monthly "money check-in" (2 minutes, re-confirm 4 numbers, see the change); event-driven nudges by email (salary day, tax deadlines, policy renewals).
- **LTV levers:** household plan, human adviser review (paid, if within perimeter), partner referrals (insurance or loan comparison) with clear disclosure.

## 7. Instrumentation required before any CRO work
Event list (privacy-respecting, consent-gated for anything non-essential):
`landing_view, cta_click, register_start, register_submit, register_error{code}, verify_sent, verify_done, login, journey_start, journey_answer{card}, journey_skip{card}, score_revealed, reveal_cta_click, nav_view{page,has_data}, coach_ask{routed_to}, coach_fallback, simulation_run, action_accept, action_verified, nudge_shown/dismissed, export, deletion_scheduled, workspace_created, plan_upgrade_requested`.
