# FinScore AI: User Journey and Drop-off Analysis

**Date:** 2026-11-18 · Environment: local (embedded PostgreSQL, backend :8001, frontend :3000), one throwaway account created during the audit.
**Honesty key:** ✅ **Tested** = performed in the browser · 👁 **Observed** = screen opened and read but the action was not executed (to avoid side effects) · 📄 **Code only** = inferred from source and docs.

## Persona 1: First-time visitor (✅ Tested)
**Objective:** understand what this is and decide whether to sign up.
**Path:** `/` → read → "Get started".
| Step | What happened | Friction | Abandonment risk |
|---|---|---|---|
| Landing | Headline is a question ("What is the one money problem…"). Two CTAs. Three trust bullets. A footnote says the AI interview and FinScore are "not available yet". The logo says "Finscore Test, Powered by 5nance". | No product description, no visual, no proof, no pricing, no legal links. The "not available" notice contradicts the CTA. Wrong brand. | **High.** A visitor cannot answer "what do I get?" |
**Recommendations:** landing rewrite (CONVERSION_RATE_AUDIT §3), fix the brand leak (FT-05).

## Persona 2: Non-technical customer (✅ Tested)
**Objective:** "Am I doing OK with money?"
**Path:** register → verify → login → Home → Money Map (9 answers) → score → Score tab → Health → Actions → DNA → Today.
| Step | Result | Friction |
|---|---|---|
| Register | Weak password plus `.test` email produced one combined raw error string | Technical wording |
| Verify | Must open the email, click, then log in again | Extra step. No resend |
| Home | Clear "Start my Money Map" | Good |
| Money Map | 9 taps, about 90 s, instant facts, 607/900 | Brackets jargon ("41-50%"), chip ranges start at ₹50k |
| Score tab | "No score yet. Start the conversation first." | **Contradiction** (screenshot 07) |
| Health | "Healthy", 3 of 5 not measured | False reassurance |
| Actions, DNA, Today | Empty, pointing to "the interview" | **Dead ends** |
**Failed or incomplete:** the user never reaches an actionable recommendation. **Abandonment point:** right after the score.
**Recommendations:** UX-01, UX-02, UX-05.

## Persona 3: Customer who wants to use it for free (✅ Tested)
Everything is free today. There is no paywall, limit or upsell. **Finding:** free users get the full (but thin) product. When monetisation arrives, existing users will experience it as features being taken away. Define the free/premium boundary *before* public launch.

## Persona 4: Customer willing to pay (📄 Code only for B2B; ✅ Tested absence for consumers)
**Consumer:** searched the UI and routes. There is **no upgrade, pricing or subscription anywhere** in the consumer app. A willing payer has nothing to buy.
**Business:** "For business" → workspace → Plans & billing (📄). The Growth upgrade is applied **immediately without payment** (FT-04). Invoices are generated but not collectable (K-45).
**Recommendation:** consumer premium tier definition. Payment-gated or sales-assisted B2B upgrades.

## Persona 5: Returning customer (✅ Tested within one session; multi-day not tested)
Logged out and in again. Home shows "Continue your Money Map · 130 clarity points" but **not the score**. No "what changed since last time" (the draft score has no history, FT-06). Nothing invites the user back between visits (no email, FT-08). The weekly check-in exists but only inside the app (J-06, J-09).
**Abandonment risk:** high after the first week.

## Persona 6: Customer who hits an error (✅ Tested)
- Validation error: raw backend text (FT-12).
- Login before verifying: the API returns a clear "Please verify your email before logging in" (✅ via API). The UI offers no resend.
- Coach out-of-scope question: capability menu instead of help (FT-07).
- "Why is my score 607?": confusing reply about needing two score checks.
**Recommendations:** friendly error map, resend verification, Coach intent fixes.

## Persona 7: Customer who wants to cancel (👁 Observed)
Settings → "Delete my account": password confirmation, cooling-off period (7 days placeholder), cancellable; the scheduled purge runs automatically (tracker G-02, P-01). I opened this screen and did **not** schedule deletion. **Good:** clear, self-serve, data export available first. **Gaps:** the cooling-off length is not stated in the UI text ("There is a cooling-off period…"). There is no subscription to cancel yet.

## Persona 8: Customer who needs support (👁 Observed)
Settings → "Talk to a person" (free-text box plus button). The Coach offers a human after a regulated question. I did **not** submit a request. **Gaps:** no response-time promise, no email, phone or WhatsApp, no help centre or FAQ, and the request form sits at the bottom of Settings. Staff see it in `/app/staff` (basic inbox, no reply-to-user messaging, K-26), so **the user may never hear back inside the product.**

## Drop-off heat map (qualitative)

| Stage | Expected drop-off | Main cause | Fix ID |
|---|---|---|---|
| Landing → Register | 🔴 Very high | Unclear value, no trust | UX-07, SEC-02 |
| Register → Verified login | 🔴 High | Email wall, no resend | UX-08, CRO R1/R3 |
| Login → Score | 🟢 Low | Money Map is good | n/a |
| Score → Next action | 🔴 Very high | Two scores, empty modules | UX-01, UX-02 |
| Week 1 → Week 4 | 🔴 Very high | No outbound channel, nothing changes | FT-08, FT-06 |
| Interest → Payment | ⚫ Impossible | Nothing to buy | BIZ-01 |
