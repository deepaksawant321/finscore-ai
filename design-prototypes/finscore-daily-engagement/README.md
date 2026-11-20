# Finscore Daily Engagement — Prototype V3

An isolated, offline HTML/CSS/vanilla-JS prototype that explores one question:

> **Does Finscore give every user a useful, personalized and enjoyable reason to return tomorrow?**

It evolves the V2 companion idea (`../finscore-v2/`, untouched) into a **daily-use personal financial companion**: a small, different, useful activity every day of the week, an AI companion (scripted), virtual XP and badges for *meaningful* financial habits, weekly and monthly reports, and personalization across five demo user types. It is useful even when a user has no investment transactions.

> **Everything here is simulated.** All users, scores, balances, goals, insights, XP and AI replies are dummy data. There is no backend, no API call, no authentication, no payment and no real financial advice. Investment activities use virtual money and illustrative returns, and say so on screen.

## Run it

Open `index.html` in a browser (double-click). No build, no server, no install.

Optional: any static server works, e.g. `python -m http.server 8793` from this folder, then open `http://127.0.0.1:8793/`.

State (theme, profile, XP, completions) is kept in `localStorage`, with a `window.name` fallback so it also works from `file://`. Query parameters preselect state, which is handy for demos and tests:

| Parameter | Example | Effect |
|---|---|---|
| `p` | `?p=investor` | Profile: `beginner`, `young`, `investor`, `family`, `saver` |
| `theme` | `?theme=dark` | `light`, `dark` or `auto` |
| `day` | `daily-activities.html?day=wed` | Open a specific day's activity |
| `m` | `financial-journey.html?m=safety` | Open a journey module |

Reset: avatar menu → *Reset this profile's demo progress*, or Achievement Center → *Prototype tools*.

## Screens

| Page | What it demonstrates |
|---|---|
| `onboarding.html` | **First-time onboarding**: welcome, about you, first goal, first win, ready. Starts a genuinely empty run (0 XP, no history) |
| `index.html` | Entry: the question, profile picker, screen map, the daily-return loop |
| `companion-home.html` | Companion-first home: greeting, Fin's message, wellness score, today's activity, daily challenge, quiz of the day, week strip, XP and level, goals, insights (progressive disclosure), learning, product shortcuts |
| `daily-activities.html` | The engine: Money Monday → Sunday Review. Any day open any time |
| `weekly-engagement.html` | Weekly calendar, summary, WMFA, achievement report, wellness trend, history, next-week plan, simulated share |
| `ai-companion.html` | Scripted chat with Fin, suggested questions, insights, daily actions, goal guidance, learning |
| `quiz-arena.html` | Quiz of the day, five topics, three difficulties, optional timer |
| `financial-journey.html` | Seven-module learning path, goals and planner, financial personality test |
| `achievement-center.html` | Levels, milestone unlocks, 19 badges, history, prototype tools |
| `monthly-wrapped.html` | Ten-moment story recap with simulated share card |

### Daily activities

| Day | Activity | XP |
|---|---|---|
| Mon | Money Monday: four-question financial health review with tailored tips | 15 |
| Tue | Trivia Tuesday: five-question quiz picked for the profile (optional timer) | 20 |
| Wed | Wealth Wednesday: 2-step lesson, then a virtual-money simulator across market stories | 10 |
| Thu | Think Smart Thursday: Fin's scripted decision challenge, then compare thinking | 15 |
| Fri | Financial Freedom Friday: goal review with simulated top-ups and an intention | 15 |
| Sat | Smart Saturday: Spin & Learn (wheel), Knowledge cards (swipe deck), Savings challenge | 10 / 10 / 15 |
| Sun | Sunday Review: week summary, biggest win, next-week focus | 30 |

Other XP: daily challenge 10, quiz of the day 20, topic quiz round 20, journey module 10, journey completion bonus 50, personality test 15.

## First-time experience

`onboarding.html` (also reachable from the entry page and the profile menu: *Start as a brand-new user*) walks a new user through five steps: welcome, name and what sounds like you (picks which persona's content to use), a first goal with a monthly-amount calculator, a one-question first win (+10 XP and the First Step badge), and a ready summary with tomorrow's activity. It starts a **fresh run**: zero XP, no badges, no history, no streak, a neutral wellness baseline (35, "Getting started"), generic starter insights and a "Your first steps" checklist on Home. Screens show real empty states where there is nothing yet (no goals, fresh week, empty history). Goals can also be saved from the Goal planner in Financial Journey. Demo profiles keep their seeded history for reviewers.

## XP rules (anti-gaming by design)

* XP is **virtual and non-monetary**.
* Opening the app earns **nothing**.
* Each activity earns XP **once per week** (quizzes: once per day / per topic per week). Replays are labelled *practice*.
* Quiz XP needs **60% or more**, so it rewards learning, not tapping.
* Levels: Starter 0, Saver 100, Builder 250, Planner 450, Investor 700, Strategist 1000, Master 1400.
* The wellness score moves only with real habit completions (learning, goal reviews, saving habits).

## Personalization

Five demo profiles (Financial Beginner, Young Professional, Active Investor, Family Financial Planner, Goal-Oriented Saver). Switching profile changes: greeting, Fin's message, wellness indicators, daily challenge, goals, insights, quiz suggestions, learning recommendations, the Thursday scenario, Wednesday lesson theme, AI replies and suggested questions.

## Structure

```
index.html + 8 pages        Page entry points (thin shells)
assets/css/app.css          Design system: tokens, light/dark, shell, components, responsive
assets/css/pages.css        Page-level components
assets/js/data.js           Profiles, levels, badges, days, products (window.FD_DATA)
assets/js/content.js        Quiz bank, cards, spin topics, journey, scenarios, games, simulator, scripted AI
assets/js/core.js           State, theme, shell/nav, XP and badge engine, modal/toast/confetti/share, wellness
assets/js/engines.js        Reusable quiz-round and lesson-step engines
assets/js/<page>.js         One script per screen
data/*.json                 Readable mirrors of the dummy data
README.md, ENGAGEMENT_STRATEGY.md, PROTOTYPE_COMPLETION_REPORT.md
```

`data/*.json` is a readable mirror; the JS files are the loaded source because browsers block `fetch()` on `file://`.

## Design notes

Teal and green brand direction, two polished themes (light: white cards, soft shadows; dark: deep neutral with teal accents and visible charts). System font stack, inline SVG icons and illustrations, progress rings, skeleton loading, modals and bottom sheets, confetti, reduced-motion support, skip link, 44px touch targets. Navigation is a sidebar on desktop and a thumb-reach bottom tab bar with a "More" sheet on mobile (not merely shrunk).

## Safety and isolation

* All files live in `design-prototypes/finscore-daily-engagement/`. Nothing outside was created or modified.
* No dependencies, no CDN, no fonts or images fetched. System fonts and inline SVG/CSS only.
* No network requests are made by any page (verified, see the completion report).
* No Git commits or pushes were made.
