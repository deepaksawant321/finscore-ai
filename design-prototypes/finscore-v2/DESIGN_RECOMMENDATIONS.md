# Finscore V2 — Design Recommendations

## 1. Recommended direction: the blend

| Take from | What | Where it shows up |
|---|---|---|
| **A · Private Wealth Premium** | Calm hierarchy, restrained colour, tabular numbers, generous whitespace, quiet motion | Wellness, Goals, Premium, Wrapped typography |
| **B · Next-Gen Gamified Companion** | Milestones, journey maps, badges, celebratory micro-moments (used sparingly) | Savings Adventure, Journey, Achievements, Learn & Play |
| **C · AI-First Intelligence** | Conversational, companion-led homepage; indigo AI accent; suggested follow-ups | Home, AI Companion, action cards |

The default theme ("Blended") uses brand teal→green for money and progress, **indigo reserved for the AI** so users always know when Fin is speaking, and warm amber/coral only for attention. Switch directions live from the Style menu to compare.

## 2. Recommended homepage

Order of the page answers the questions people actually have, in this order:

1. **Greeting + simulated Finscore** — who am I, where do I stand, which direction (▲/▼ vs last month).
2. **Fin (AI companion)** — what changed and one suggested action; quick replies; ask box.
3. **Today's activity** — exactly one, with time, difficulty, virtual points and a *why it matters* line.
4. **Wellness rings (six dimensions)** — comparison to last month; tap through.
5. **Journey** — level, weekly streak, next unlock.
6. **Insights** — four, each with a clear CTA.
7. **Quick access** — progressive disclosure: four primary, four "manage money", existing products behind a "+" chip.

Mobile reorders by `order` so the companion and the one activity always come first.

## 3. Recommended AI companion

* **Identity**: a calm orb avatar ("Fin") — not a human face, not a cartoon. Indigo = AI everywhere.
* **Grounding**: a visible *What Fin knows / doesn't know* panel; unknown topics get a refusal-with-redirect, never a guess.
* **Format**: short answer → plain-language reason → action cards that deep-link into existing areas.
* **Safety copy**: each answer carries "Simulated demo · educational information, not investment advice". Projections use ranges and assumptions.
* **Voice**: depicted as a visual concept only (no microphone).

## 4. Design system summary

| Token | Value |
|---|---|
| Brand gradient | `#0F8F8D → #1DBA8C` for decoration; deepened `#0A6665 → #0C8068` wherever white text sits on it (contrast ≥ 4.5:1) |
| Background / card | `#F4F6F8` / `#FFFFFF`; dark `#0A1118` / `#121B25` |
| Text | `#0B1220` primary, `#566174` secondary (AA on white) |
| AI accent | Indigo `#5A55D6` (light) / `#8F8BFF` (dark) |
| Semantic | Positive `#0B7E59`, warn `#955700`, negative `#B63636`, each with a soft background |
| Radius | 20 px cards, 12 px inner, pills for buttons/chips (A: 14, B: 26) |
| Elevation | Two soft shadows; borders at 70% opacity |
| Type | System UI stack (no downloads); tabular figures for money; `clamp()` fluid headings; direction A switches headings to a serif |
| Motion | 150–350 ms ease-out; count-ups ≈1.1 s; rings/bars ≈1.2 s; all collapsed by `prefers-reduced-motion` |
| Icons | Inline SVG stroke set (1.8 px), no emoji in UI chrome |

## 5. Accessibility notes

* Skip link, landmark roles, `aria-current` on navigation, `aria-live` regions for chat/quiz feedback, `role="timer"` quiz bar.
* All interactive targets ≥ 44 px (36 px for small chips on desktop only); visible 3 px focus ring.
* Rings and charts have text alternatives; the trend chart is keyboard-focusable with tooltips on focus.
* Colour is never the only signal (icons + text labels on ▲/▼, ✓/lock).
* Reduced motion honoured globally; confetti disabled.
* Known gaps: keyboard focus-trap inside modals is basic (focus moves in, Esc closes, focus restored); no automated axe run in this environment.

## 6. Responsive strategy

| Width | Layout |
|---|---|
| ≥ 1181 | Sidebar + two-column companion layouts |
| 981–1180 | Sidebar, single column home with reordering |
| ≤ 980 | Sidebar becomes a 5-tab bottom bar (Home, Coach, Today, Play, More sheet) |
| ≤ 760 | Single column; cards compress; chips scroll horizontally |
| 360–390 | Verified no horizontal overflow on any page |

Mobile is designed for touch: bottom tabs, swipeable knowledge cards, large option buttons, sticky chat composer, bottom sheet for "More".

## 7. Content and tone

Non-judgmental, plain, specific. Examples used: "Let's take one small step", "Not quite — and that's fine", "Dips happen — your plan is what matters". Avoid: urgency, guilt, "guaranteed", and celebrating app opens.

## 8. Things deliberately *not* done

* No cash prizes, leaderboards against strangers, loot-box mechanics or streak-loss shaming.
* No product recommendations or return claims.
* No dependence on external fonts, images or libraries.
