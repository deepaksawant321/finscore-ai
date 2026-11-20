# Finscore Engagement Prototypes: how to run and explore

Standalone HTML, CSS and vanilla JavaScript. No build step, no dependencies, no network calls, no backend. Dummy data only. Nothing in the real application was modified.

## Run

Easiest: open `index.html` in a browser (double-click). All pages work from `file://`.

Optional local server (any static server works), run from this folder:

```bash
python -m http.server 8765
```

Then open http://localhost:8765/index.html

## Pages

| File | What it shows |
|---|---|
| `finscore-app-flow.html` | **Start here.** The real Finscore shell and flow (Home, Money Map, Score, Coach, Goals, What-if), with the proposed features inside it marked "Proposed". The "Show proposed features" switch hides them to show the app as it is today |
| `index.html` | Gallery, concept cards with filters, direction comparison, existing-vs-proposed |
| `premium-fintech.html` | Direction 1: fitness challenges, score trend, goals, check-up |
| `gamified-experience.html` | Direction 2: mascot, rings, quests, treasure chest, quest map, badge shelf |
| `ai-futuristic.html` | Direction 3: AI plan with "why this?", ask-the-coach, habits, orbit |
| `financial-games.html` | Spin & Learn, Quiz Arena, Personality test, Investing Sim, Knowledge Cards |
| `financial-journey.html` | Score Journey, Savings Adventure, Independence planner, Achievements |
| `monthly-wrapped.html` | Eight-slide monthly story and a privacy-safe shareable card |
| `DESIGN_RECOMMENDATIONS.md` | Product and design recommendations |
| `PROTOTYPE_COMPLETION_REPORT.md` | What was built, tested and verified |
| `assets/` | `shared.css`, `shared.js` (design system, modal, toast, points), plus per-page CSS and JS |

## Things to try

- **Switch direction:** the Premium / Playful / AI switch at the top right re-skins the gallery, games, journey and Wrapped pages. The three direction pages are locked to their own look.
- **Spin & Learn:** spin once a day. Use "Prototype: simulate tomorrow" to spin again.
- **Quiz Arena:** try each level, and turn the timer off. Perfect score unlocks a badge.
- **Investing Sim:** change the mix each "year" and notice the review at the end. It is hypothetical.
- **Knowledge Cards:** swipe/drag, use the arrow keys, or the Back/Next buttons.
- **Journey:** drag the "Travel back in time" slider, tick the actions to preview a stage change, add to a goal until a milestone flag lights up.
- **Achievements:** click any badge, and use "Preview unlock". "Reset" returns points and badges to defaults.
- **Wrapped:** tap right/left, press space to pause, change the share-card toggles, "Save image" downloads a PNG made in your browser.

## Shared "profile" state

Clarity points, weekly cadence and badges are shared across pages using `localStorage` (keys start with `fsp.`). It is cosmetic and local to your browser. Clear site data, or use the reset buttons, to start over. If storage is blocked, the prototypes fall back to in-memory state.

## Notes and limits

- The "AI coach" is scripted; there is no model and no network.
- Stage bands, point values, quiz content and projections are illustrative and not from the approved rulebook.
- Fonts use the system stack (Inter / Space Grotesk names are listed first but not bundled), so typography differs slightly from the real app.
- Tested in Chromium. Layouts were checked at ~360px wide and desktop widths. `prefers-reduced-motion` is respected.
