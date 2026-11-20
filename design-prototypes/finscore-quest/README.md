# FinScore Quest

A premium, game-inspired, AI-led prototype of FinScore. One living scene instead of pages and a menu. Standalone HTML, CSS and vanilla JavaScript: no dependencies, no network, dummy or user-typed data only, stored in your browser.

## Run it

Open `index.html`, or serve the folder:

```bash
cd "D:/Deepak/AI Projects/finscore-ai/design-prototypes/finscore-quest" && python -m http.server 8767
```

Then open http://localhost:8767/index.html. Tap "Open a sample profile" for an instant walkthrough, or tell Fin your own money problem. `Ctrl K` (or the glowing "Ask Fin" button) opens the command bar from anywhere.

## Full detail is the only view

The app now opens in, and stays in, **Full detail view**. Simple view is switched off: there is no Simple view button, no View choice in settings, and no way back to it from the More sheet. A stored "simple" preference from an earlier visit is ignored. The old Simple addresses still work and open the nearest Full detail scene: `#/home` opens Overview, `#/plan` opens Quests and `#/info` opens Vault.

The Simple view code is still in the project (`assets/simple.js`, and the `Q.simple()` branches in other scripts, which now always return false). To bring it back, make `Q.simple()` in `assets/ui.js` read the saved view again, restore the default view to `'simple'`, and add back the View choice in settings and the Simple view button. The description below is kept for that reason.

### What Simple view was (switched off)

Most people just want to know where they stand and what to do next, so the app used to open in **Simple view**:

- **Four buttons, nothing else:** Home, My plan, Ask Fin, My info.
- **Home** is one score in plain words ("Doing well"), one next step with the points it could add, and three numbers for your month (comes in, goes out, left over).
- **My plan** is up to three small steps. Mark one done once it is really true; Fin asks you to confirm the new numbers.
- **My info** shows what Fin knows, how complete it is, and three big ways to add more: connect accounts, upload a statement, or tell Fin in your own words.
- **Getting started** is three steps: pick what you want help with, share your details (connect, upload, speak or answer questions), see your score.
- No levels, XP, constellations, realms or jargon. Fin's chat has four ready-made questions instead of modes.

Full detail view has the constellation, skills, quests, realms, time machine, vault, crew, quiet hours and the full Link hub. It is lighter than it was: the dock has five buttons (Overview, Quests, Ask Fin, Skills, More), the More sheet groups scenes under "Add your information", "Explore" and "Look after it", and the map legend and long notes are folded away.

## The core loop (Full detail view)

| Scene | What it is |
|---|---|
| Intro | Fin opens with "What is the one money problem you want to solve?", then asks one question at a time, always saying why. Details Fin catches in your words wait for your OK. A star map fills in as Fin learns |
| Observatory | Your score as a constellation: 15 factor stars in five branches around the score orb, with the eight wealth realms as a ring. Score, confidence and trend are separate. Tap a star for evidence, the band you are in, and a quest |
| Skill tree | The same 15 factors as five branches with levels out of 10, the worth of the next band, and which skills have a quest |
| Quest board | Your action plan as quests, ranked by a proposed priority formula. A quest completes only when you confirm the new numbers, then the sky updates |
| Fin Studio | Talk to Fin in four modes (Explain, Diagnose, Simulate, Act). Every answer shows the tool calls behind its numbers. Regulated questions are declined and distress goes to a person |

Five more scenes live under **More** in the dock (and in the command bar):

| Scene | What it is |
|---|---|
| Realm map | Your road through the eight wealth realms with a "you are here" marker, distance to the next realm, the quests that could move you (a scenario, not a forecast), retirement, and goals you confirm. Tap a realm to read what it means |
| Time machine | Describe a change in words or move a lever (income, expenses, extra investing, retirement age, a purchase, income stopping). Now versus Then, ranges for the SIP needed, a sensitivity ranking, and switchable assumptions |
| Vault | Everything Fin knows, as cards with source, age and version. Correct, refresh or remove anything. Move time forward to see facts go out of date |
| Crew | Your household in orbit. Each person controls what others see. "What if one income stops?" and "view as another member" |
| Quiet hours | Today's briefing, plus Fin's nudges: one at a time, with why, snooze, "do not remind me", a daily or weekly limit, quiet hours, and an opt-out rate to watch |

## Ask less, confirm more (Link hub, under More)

Fin tries to fill your facts from data before it asks you anything. After you state your problem, Fin offers: connect accounts, upload a statement, tell it by voice, or just ask questions.

| Way in | What it does | Real or simulated |
|---|---|---|
| Connect accounts | Consent screens and a simulated pull for bank (Account Aggregator style), credit report, mutual funds, EPF and NPS, insurance, tax documents and identity. "Link everything" does all seven at once | Simulated, dummy payloads |
| Scan or upload a document | A simulated read of a policy, statement or tax document, then the same review step | Simulated: your file is not read, and the screen says so |
| Read a statement | Choose or paste a bank-statement CSV. Fin sorts every line with fixed rules (salary, EMIs, SIPs, premiums, card bills, spending), shows how it sorted them, and derives income, expenses, EMIs and investments. A sample statement and a sample CSV download are included | **Real**, runs in your browser, nothing uploaded |
| Pasted messages (optional) | Off by default. Paste bank or insurer messages; Fin reads them as low-confidence hints. It cannot see an inbox or SMS | **Real** on pasted text only |
| Voice | A mic button in Intro, Studio and the hub. Uses your browser's speech recognition where it exists, otherwise offers a sample sentence | Real where the browser supports it |

Every route ends in the same review sheet, **"Fin found these"**: each value with its source and confidence, conflicts with earlier answers flagged (default is to keep what you said), and nothing saved until you confirm. Saved facts keep their source, shown in the Vault ("Came from"). The hub shows how many facts Fin learned from data versus what you typed, keeps a **consent log**, and lets you **revoke** a source (optionally removing the facts it supplied). A linked source can simulate **new data arriving**, which waits for your review and triggers a Quiet hours nudge.

## Feel settings (gear icon)

- **How playful:** Calm, Balanced (default) or Playful. Calm turns motion and rewards right down.
- **Theme:** Midnight (default) or Ivory.
- **Interview mode:** My problem, or Full picture.

## Built from the documents

Scoring comes from `docs/rules/FINSCORE_RULES_SPEC.md` (the 15-factor workbook model, marked draft). Principles, flow and guardrails come from `docs/PRODUCT_REQUIREMENTS.md` and the Blueprint. The application's own `frontend/` and `backend/` code is not used.

The engine, its 22 self-tests, the rules data, and the non-visual logic (fact registry, extraction, question choice, action ranking, scenarios) are copies from `design-prototypes/finscore-from-docs/`. Everything you see and touch is new.

## Document rules that hold here

- AI interprets, the engine calculates. Nothing is saved until you confirm it, and missing data is never guessed.
- XP and levels never change the score. No leaderboards. Weekly cadence pauses and never resets.
- The stage is band-only and always labelled provisional. "Draft rules" stays visible.
- Placeholders (risk-question wording, persona and trait thresholds, freshness windows, quest priority formula, XP values) are flagged where they appear.

## Honest limits

- Fin is rule-based; there is no language model and nothing is sent anywhere by this prototype. Voice is the one exception to be aware of: if your browser offers speech recognition, the browser's own service may process the audio. The prototype only receives the text.
- Connectors and document scans are simulations with dummy data. Real links need regulated consent, partner agreements and approval (decision D-B20 is pending), and Fin would never see a bank login.
- Voice could not be tested with a real microphone in my test browser (it was blocked); the sample-sentence fallback and everything after the transcript were tested.
- Large score jumps can come from step-like rules (for example "planning for children"). Quests carry a warning when that happens.
- Under the Master savings formula, investing more can leave the score flat; Fin explains this when it happens.
- Checked at 390px and 1280px wide, in Midnight and Ivory, and in Calm. Chromium only. Not tested with a screen reader.
