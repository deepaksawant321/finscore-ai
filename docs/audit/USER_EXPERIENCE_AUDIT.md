# FinScore AI: User Experience Audit

**Date:** 2026-11-18 · Tested live at phone width (about 520 px) and desktop width (1366 px) with a new throwaway account. Screenshots are in `docs/audit/screenshots/`.

## 1. Verdict
The **visual design is polished**: a coherent token system, a pleasant frosted-card aesthetic, good tabular figures and a working dark mode. The **Money Map onboarding is the best thing in the product**: fast, tappable, with instant feedback.

The problem is **coherence, not cosmetics**. The product is a dozen engineering-complete modules that do not share one story. A non-technical user completes onboarding, gets a score, then clicks "Score" and is told they have no score. Most of the pages that follow are empty.

> "Would an ordinary non-technical customer be able to use this without assistance?"
> **They could finish onboarding without help, but could not make sense of what comes after.**

## 2. Findings

| ID | Screen | Problem | Evidence | User impact | Recommendation | Pri | Effort | Metric |
|---|---|---|---|---|---|---|---|---|
| UX-01 | Score / Home / Money Map | Two scores and two scales (0–900 draft vs 300–900 FinScore). After onboarding, `/app/score` says "No score yet", and Home no longer shows the number at all, only "See my FinScore". | Screenshots 05, 07, 09. | Confusion and distrust at the moment of first value. | One score, one scale, always visible on Home. | **P0** | Med (after the decision) | Users who can state their score after onboarding (5-user test). |
| UX-02 | DNA, Actions, Today, Score | Empty states after onboarding all point to "Start the conversation" or "Tell me more in the interview", although the user just answered 9 questions. | Live texts: "Your Financial DNA appears once I know a little about you"; "I don't see an action that would raise your score right now." | Dead ends. It feels broken. | Either feed these modules from Money Map answers (Q-08), or hide them until they have data and show a single "unlock" path. | **P0** | Med | Share of nav pages non-empty after onboarding (target 100%). |
| UX-03 | Navigation | 14 customer nav items in 3 groups, plus "For business". Overlapping entry points: **Money Map vs Talk vs Coach** (three ways to give or get information) and **Score vs Draft score**. | `frontend/src/lib/nav.ts:9-44`. Desktop rail in screenshot 09. | Choice overload. Users don't know where to go. | Collapse to 5: **Home · My Score · Plan (goals + actions + what-if) · Ask (coach + talk merged) · Me (memory, settings)**. Hide modules that have no data. | P1 | Med | Nav clicks per session. Time to find "what should I do next". |
| UX-04 | Copy across the app | Internal and engineering language shown to customers: "Built from the business spreadsheets and not yet approved", "WORKBOOK DRAFT RULES — NOT AN OFFICIAL FINSCORE", "DEMO THRESHOLDS: NOT APPROVED HEALTH RULES", "engineering placeholder rules", "Draft rules". | Home, journey reveal, Health (screenshots 02, 05, 08). | Undermines confidence. Reads like a staging site. | Until the rules are approved, keep the product in a closed beta with one calm line ("Beta: your score method is being finalised"). Never say "spreadsheets" or "engineering". | P1 | Low | Trust rating in user tests. |
| UX-05 | Score reveal | "607 out of 900": no band, no peer comparison, no "what this means", no top strength or weakness, no next action at the reveal. | Screenshot 05. Product requirement FR-INT-07 asks for score, stage, persona, strongest pillar, biggest vulnerability and top action. | The "aha" moment is a bare number. | Reveal card: score, band word ("Building"), one strength, one gap, one action with its expected impact, then "continue to sharpen". | P1 | Med | Click-through from the reveal to the next action. |
| UX-06 | Health | Headline "Healthy" while insurance and emergency cushion are unknown. | Screenshot 08. | False reassurance. | Headline "Incomplete: 2 of 5 checks measured". Make protection unknowns prominent. | P1 | Low | n/a |
| UX-07 | Landing page | Hero asks a question but never says what the product *is* or *gives*. No visual of the product, no how-it-works, no proof, no FAQ, no pricing, no footer. It carries a stale "MVP 1: not available yet" notice, and shows another tenant's logo. | Screenshot 01. `frontend/src/app/page.tsx:43-46`. | A visitor cannot tell within 5–10 seconds what they get. | See CONVERSION_RATE_AUDIT §3 for the rewrite. | **P1** | Low–Med | Visitor → register conversion. |
| UX-08 | Registration and verification | Raw validation text. No inline field errors. No show-password. No resend-verification link. Not logged in automatically after verifying. Plain unbranded email. | Live test (FT-12). Mail file in `.localdata/mail`. | Friction, and users locked out if the email is delayed. | Field-level errors, resend link, auto sign-in after verifying, branded HTML email. | P1 | Low | Verify completion rate, time to verify. |
| UX-09 | Money Map | Chapter says "0 of 7 answered" and "a handful of quick taps", but there were 9 prompts. No "back to previous question". Instant facts use unexplained brackets: "Cash flow: 6/10 for your age group (41-50%)". | Live walk-through. | Minor distrust. Can't fix a mis-tap without the Memory page. | Accurate counts, a Back button, and plain-English facts ("you keep about 41% of your income each month: better than most people your age"). | P2 | Low | Answer edits, chapter completion. |
| UX-10 | Money Map chips | Income chips start at ₹50k/month, spend at ₹25k. | Live walk-through (screenshot 04 shows the asset chips). | Mass-market users (most Indian households earn below ₹50k/month) feel the product isn't for them. | Segment-aware chips (₹15k, ₹30k, ₹50k, ₹1L) or a slider. | P2 | Low | Completion rate by income band. |
| UX-11 | Coach | Narrow template answers. Fallback menu for common questions. Misrouted "why is my score 607". "Numbers from engine" badge on replies without numbers. | Live test (FT-07). | "AI coach" promise not met. | See FT-07. Also show 3–4 contextual suggested questions based on the user's weakest area. | P1 | Med | Fallback rate. |
| UX-12 | What-if | Blank form. The user must supply a return assumption ("I don't suggest one"). Known numbers (₹10k SIP) are not prefilled. | Screenshot 06. | Non-experts don't know what return to assume, so they abandon. | Prefill from the profile. Offer labelled scenario presets (conservative, moderate, optimistic) that cite the approved assumption source once D-B7 lands. | P2 | Low–Med | Simulations run per user. |
| UX-13 | Settings | No change-password (only via "forgot"). The device shows as a raw user-agent string with the proxy IP. No plan or subscription section. No notification email preferences. No links to privacy or terms. | Live view. | Basic account hygiene missing. | Add these sections. Parse the user agent ("Edge on Windows"). | P2 | Low | n/a |
| UX-14 | Accessibility | Not scanned (no axe in the toolchain). Positives observed: aria labels on tabs and inputs, status shown by word plus shape plus colour on Health. Low-contrast muted text on the frosted background should be checked. | `frontend/package.json` has no axe. | Unknown WCAG 2.2 AA compliance. | Add `@axe-core/playwright` to e2e. Do a manual screen-reader pass. | P2 | Low | 0 serious axe violations. |
| UX-15 | Loading and error states | Generic "Loading…" text. Single-line errors ("Could not load your score right now") with no retry button. | `app/app/page.tsx:19-20`. | Minor. | Skeletons (the design system has them) plus Retry. | P3 | Low | n/a |

## 3. Screen-by-screen notes

| Screen | Good | Bad |
|---|---|---|
| Landing | Clean typography, a single primary CTA | No value explanation, stale notice, tenant brand leak, no footer or legal links |
| Register / Login | Short form, name optional | Raw errors, no resend, no terms consent, no social or OTP login |
| Home | Clear "Start my Money Map" CTA for new users | After onboarding: no score number, no next action, internal-sounding copy |
| Money Map | Excellent pacing, chips, shorthand amounts, instant facts, progress meter, badge | Count mismatch, no back, brackets jargon, affluent-biased chips |
| Draft score | Breakdown exists | Separate from "Score", labelled draft |
| Score / DNA / Actions / Today | Good structure once filled (per tracker) | Empty for the main onboarding path |
| Health | Separates health from data quality (excellent idea) | "Healthy" headline with unknown protection |
| Coach | Honest disclosure, good regulated-question refusal | Narrow, feels scripted |
| What-if | Honest about assumptions | Blank form, needs expertise |
| Settings | Export, delete, consent, human help: genuinely good | Missing password change, plan and legal links |

## 4. Visual and UI quality
- Typography, spacing and hierarchy: strong.
- Colour: consistent tokens. The dark score card is effective.
- Mobile: bottom tabs work. The four tabs (Home, Coach, Score, What-if) put Score, which is empty for new users, in a premium slot, while Money Map, the most useful screen, is buried in "More".
- Motion: restrained, with nothing gratuitous.
- Distractions: the clarity-points pill and badge are fine. The capitalised watermark text is the main visual noise.
