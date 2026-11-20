# Finscore V2 — AI Personal Financial Companion (design prototype)

An isolated, offline HTML/CSS/vanilla-JS prototype that explores how Finscore can become a **personal financial companion** rather than another dashboard.

> **Everything here is simulated.** All users, scores, balances, goals, insights and AI replies are dummy data. There is no backend, no API call, no authentication, no payment and no real financial advice.

## Run it

Open `index.html` in a browser (double-click). No build, no server, no install.
Optional: any static server also works, e.g. `python -m http.server 8791` from this folder, then open `http://127.0.0.1:8791/`.

State (theme, profile, progress) is kept in `localStorage` with a `window.name` fallback, so it also works when opened from `file://`. Use **Style → Reset demo progress** to start clean. Query parameters `?p=<profile>&theme=<light|dark>&dir=<a|b|c>` preselect state (used by the gallery's live preview).

## Structure

```
index.html                  Gallery: vision, 3 directions, live responsive preview, screens, interaction previews, journey
pages/                      14 interactive screens (see below)
assets/css/fs.css           Design system: tokens, light/dark, directions A/B/C, components, responsive
assets/js/data.js           All simulated data (window.FS_DATA) — loadable mirror of /data/*.json
assets/js/core.js           State, theme, shell/navigation, helpers, XP & badges, modal/toast/confetti
assets/js/activity.js       Shared activity runner (lesson → check → takeaway, checklist)
assets/js/<page>.js         One small script per screen
data/*.json                 Canonical dummy data (users, activities, insights)
*.md                        README, strategy, design recommendations, completion report
```

`data/*.json` is the readable source of truth; `assets/js/data.js` mirrors it because browsers block `fetch()` on `file://`. Keep both in sync (a ten-line Node script generated the JSON from `data.js`).

## Screens

| Page | What it demonstrates |
|---|---|
| `home-companion` | Companion-first homepage: greeting, simulated Finscore, Fin (AI), today's activity, wellness rings, journey/streak, insights, grouped quick access |
| `ai-companion` | Scripted conversation grounded in the profile, action cards, "what Fin knows", voice-mode visual concept |
| `financial-wellness` | 300–900 gauge, 8 stages, six dimensions, connected life map, drivers, what-if, trend |
| `daily-activities` | Daily/weekly/monthly activities, AI action plan, swipeable knowledge cards |
| `financial-games` | Fitness Challenge, Spin & Learn wheel, Financial Personality Test |
| `quiz-arena` | Timed MCQs, difficulty levels, instant feedback, explanations, achievements |
| `savings-adventure` | Animated goal path, deposits, milestone celebration |
| `investment-simulator` | Virtual portfolio, five scenarios, decision exercise, educational feedback |
| `financial-journey` | Six-station Independence Journey, debt progress, retirement concepts |
| `achievement-center` | Badges, level path, streak calendar, history |
| `financial-wrapped` | Story-format monthly recap with shareable card |
| `goals-planning` | Goals, goal builder with ranges, retirement illustration, weekly review |
| `premium-experience` | Plan comparison, roadmap preview (no payments) |
| `onboarding` | Short first-run flow ending in a first achievement |

## Design controls (top bar on every page)

* **Profile switcher** — five simulated profiles (Beginner, Young Professional, Active Investor, Family Planner, Goal-Oriented Saver). Greeting, score, wellness, Fin's message, activity, goals, insights and learning recommendations all change.
* **Style menu** — Light / Dark / Auto and visual direction: Blended (recommended), A Private Wealth, B Gamified, C AI-first.
* **← Gallery** link on every page.

## Safety and isolation

* All files live in `design-prototypes/finscore-v2/`. Nothing outside this folder was modified.
* No dependencies, no CDN, no fonts or images fetched; system fonts and inline SVG/CSS only.
* No network requests are made by any page (verified, see the completion report).
* Not committed to Git.

## Assumptions

* The existing app (`finscore-ai`) provides the score (300–900, 8 stages), coach, daily companion, journey, goals, simulation, actions and health areas. Mutual funds, equity, insurance and loans were **not found as built features** in that repository, so V2 shows them only as "Existing product" hand-off tiles and invents nothing about them. Algrow and Allrounder were not found at all and are not depicted.
* Stage names follow `docs/PRODUCT_REQUIREMENTS.md`. The age × score matrix is pending product approval, so stages here are purely score-banded and labelled simulated.
* Premium prices are placeholders (`₹—`); pricing is undecided.
