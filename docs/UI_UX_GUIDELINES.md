# FinScore AI — UI/UX Guidelines (design-system plan)

**Brand:** 5nance. *No logo/palette supplied (D-B18)* — engineering proposes an original provisional identity; Brand to replace tokens without code changes.

## 1. Principles
Premium wealth-management feel · clean/minimal · answer-first hierarchy (home answers in <10 s: where am I, why, good, weak, next) · conversation as the primary input · explain everything (every number has "why/how") · calm, non-anxious tone (B§31) · honest uncertainty (ranges, assumptions visible) · no dark patterns · **no fake data in production** — dev sample data always badged "DEMO DATA".

## 2. Design tokens (provisional)
- **Colour:** deep ink `#0B1B2B`, 5nance teal `#0FB5A6` (progress/positive), amber `#F5A524` (watch), coral `#E5484D` (risk), indigo `#4F46E5` (AI accents), neutrals slate scale. Semantic tokens (`--color-positive/negative/warn/ai/surface/text`) as CSS variables; **light + dark** themes from day 1 (dark ready, light default). Contrast ≥ WCAG AA.
- **Type:** Inter (UI) + a numeric-tabular face for figures; scale 12/14/16/20/24/32/48; tabular-nums for money.
- **Spacing/radius/elevation:** 4-pt grid; radius 8/12/20; soft shadows.
- **Motion:** 150–250 ms ease-out; score ring count-up, chip "extraction" pop-in, timeline reveal; `prefers-reduced-motion` respected.

## 3. Components (build before screens)
Button, Input, Select, Slider (what-if), Tabs, Card, Badge/Chip (fact chips w/ provenance icon), Dialog/Drawer, Toast, Skeleton, EmptyState, DataTable; **ChatShell** (message list, streaming, composer, quick-reply chips, captured-facts side panel, AI-disclosure badge); **ScoreRing/Gauge (300–900 with stage bands)**, StageLadder (8 stages), TrendSparkline, **ContributionWaterfall** (+/− factors), DNA traits grid with confidence meter, PersonaCard, ScenarioCompare (old vs new), FanChart (p10/p50/p90), Timeline, ActionCard (impact/effort/CTA), StreakXP bar, ConsentBanner, ProvenanceTooltip, AssumptionsDrawer.
Charts: Recharts/visx wrapped in design-system chart primitives (colour-blind-safe, labelled, tooltips, keyboard focus, table fallback).

## 4. Screens (MVP mapping)
| Screen | MVP |
|---|---|
| Landing/onboarding ("What is your one money problem?") | 1–2 |
| Auth (register/login/verify/reset) | 1 |
| AI interview + captured facts | 2 |
| FinScore home | 2 |
| Financial DNA, Wealth Persona | 2 |
| Score explanation (drill-down) | 2 |
| Profile & Financial Memory (view/correct/provenance) | 2 |
| AI Wealth Coach | 3 |
| What-if simulator | 4 |
| Goals, Action centre, Wealth timeline | 4 |
| Daily companion, gamification, family, portfolio, news | 5 |
| Settings & subscription | 1 (settings), 6 (billing) |

## 5. UX rules for AI & finance
- Show **provisional/unofficial** state prominently when rulebook not approved ("Demo rules — not official").
- Distinguish **User-stated / Connected / Inferred / Estimated** with consistent icons.
- Projections always show range + assumptions link; never "guaranteed".
- Score, **Confidence** and **Trend** shown as three separate elements (B§6).
- Nudges: one message, one action, snooze/dismiss, "why am I seeing this".
- Never celebrate app opens; celebrate verified progress.
- Currency: ₹ with lakh/crore grouping (locale `en-IN`) and compact forms (₹34L, ₹1.2Cr) with exact on hover.

## 6. Accessibility & responsive
WCAG 2.2 AA; keyboard-first; ARIA via Radix primitives; focus rings; chart text alternatives; touch targets ≥44 px; mobile-first breakpoints 360/768/1024/1280; bottom-tab navigation on mobile; chat composer sticky; test with axe + manual screen-reader pass.

## 7. Tech notes
Next.js + Tailwind + Radix-based primitives (design-system layer); MUI only where a heavy component (e.g., DataGrid/DatePicker) is justified (T-9); Storybook for component catalogue; visual regression (Playwright) at MVP 2+.
