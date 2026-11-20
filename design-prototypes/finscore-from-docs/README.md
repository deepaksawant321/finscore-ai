# FinScore AI: prototype built from the documents

A standalone prototype (HTML, CSS and vanilla JavaScript, no dependencies, no network) written **only from the documents**. It does not use the application's `frontend/` or `backend/` code, and it is separate from the earlier prototypes in `design-prototypes/finscore-engagement/`.

## Run it

Open `index.html` in a browser, or serve the folder:

```bash
cd "D:/Deepak/AI Projects/finscore-ai/design-prototypes/finscore-from-docs" && python -m http.server 8766
```

Then open http://localhost:8766/index.html. Click **Load a sample profile** on the first screen for an instant, dummy-data walkthrough, or type your own money problem and answer the questions.

## What it is built from

| Source document | Used for |
|---|---|
| `docs/rules/FINSCORE_RULES_SPEC.md` and `finscore_rules.json` | The scoring engine: 15 factors, age bands, score matrices, points, retirement and insurance calculators, risk profile, action areas |
| `docs/PRODUCT_REQUIREMENTS.md` | Principles P1 to P9, functional requirements, the eight stages, the 12-screen frontend scope |
| `docs/requirements/` Blueprint and Strategy documents | The closed-loop journey, interview and coverage map, DNA and persona, scenarios, nudges, XP rules |
| `docs/PRODUCT_DECISIONS.md` and `PILLAR_MAP.md` | What is still open (so it is labelled, not invented) and the dependency order |
| `docs/UI_UX_GUIDELINES.md` section 2 | Colour tokens, type, spacing and the UX rules for AI and finance (the visual layout itself is new) |

## Screens (follow the blueprint's loop)

Ask FinScore · Conversation (adaptive interview, captured facts, coverage map, risk questions) · FinScore Home (first reveal) · Why this score (factor, evidence, action, expected improvement; version diff) · DNA & Persona · AI Wealth Coach (Explain, Diagnose, Simulate, Act, with tool traces) · What-If · Action Plan · Wealth Timeline · Daily Companion · Missions & levels · Family · Profile & Memory · Rules & tests.

## Honest limits

- The "AI" is rule-based. Nothing is sent anywhere. It stands in for the language-model step in the documents.
- The score is the **15-factor workbook model**, marked draft. The Blueprint's 20-pillar model has no weights or scales in the documents, so it is not built.
- The wealth stage is band-only and always labelled provisional (the age × score matrix is not supplied).
- Persona and DNA thresholds, the risk-question wording, freshness windows, the action priority formula and XP values are **placeholders**, each flagged on screen and listed in Rules & tests.
- No forecast is shown: the documents leave the projection method pending, so only engine-computed scenarios are offered.
- Data stays in this browser (localStorage). "Erase everything" in Profile & Memory clears it.

## Verifying the engine

Rules & tests runs 22 checks live, including the spec's verified numbers: retirement corpus ₹4,05,60,253.60 and SIP ₹4,421.33 for the master sample, life-insurance need ₹44,45,927.78, and goal future value ₹44,07,984.23. The same checks run in Node: `node -e "global.window=global; require('./assets/rules-data.js'); global.FSEngine=require('./assets/engine.js'); const T=require('./assets/tests.js'); console.log(T.run().every(x=>x.pass))"` from this folder.
