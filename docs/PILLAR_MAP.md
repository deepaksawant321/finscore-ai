# FinScore AI — The 20 AI Capabilities: Purpose, Contract, Dependencies, Acceptance

> Naming (pending D-A1): **AC-xx = AI Capability** (the 20 pillars in the deck). **SP-xx = Score Pillar** (the 20 scoring dimensions, still PENDING). Do not mix.
> Phase target per roadmap: P1 = MVP 1 … P6 = MVP 6. Priority ★ = highlighted in deck slide 5 (the deck says "priority pillars highlighted" but the highlighting is visual only and was not extractable — **please confirm which are ★**, see KNOWN_ISSUES).

| AC | Capability | Purpose | Key data contract (in → out) | Depends on | MVP | Acceptance criteria (abridged) |
|---|---|---|---|---|---|---|
| 01 | AI Financial Interview | Free-text → facts + intent, adaptive questions | message → `{intent[], candidate_facts[], next_question, coverage}` | Memory, LLM gateway, profile | 2 | Golden-set extraction ≥ target; every fact has provenance; user confirms before persist; never invents data |
| 02 | Financial DNA Engine | Persistent revisable traits | facts/behaviour → `Trait{value,confidence,evidence_count,recency,history}[]` | 11, profile, rulebook(DNA) | 2 | Trait only with evidence; history kept; wording non-absolute |
| 03 | AI Wealth Persona | Human-readable identity | DNA+score+goals → `{primary, modifier, explanation}` | 02, scoring, rulebook(persona) | 2 | Deterministic mapping; catalogue from rulebook; explanation cites traits |
| 04 | Score Explainability | Why score / why change | run(s) → contributions, drivers, diff | scoring | 2 | Additivity invariant holds; diff lists only material changes; every driver maps to factor+evidence |
| 05 | AI Wealth Coach | Conversational interface, 4 modes | question → grounded answer + tool trace + advice class | 04, engines, 06,08, governance | 3 | 0 ungrounded numbers in eval; disclosure shown; escalation works |
| 06 | AI Wealth Simulator | What-if | ScenarioSpec → old/new metrics + assumptions + sensitivity | engines(simulate), scoring, projection | 4 | Reproducible with seed; assumptions explicit; ranges; user can edit assumptions |
| 07 | Score Predictor | 3M/6M/1Y score projection | snapshot+actions → p10/p50/p90 by horizon | 12, scoring, actions | 4 | Labelled estimate with range; rulebook methodology approved; backtest harness exists |
| 08 | Action Prioritiser | Rank next-best actions | gaps+goals → ranked cards w/ points,effort,urgency | scoring, rulebook(actions), 13 | 4 | Priority breakdown stored; deltas only from approved library; verified completion updates score |
| 09 | AI Wealth Timeline | Chronological journey | goals+actions+projection → milestones/dates/deps | 13, 08, 12 | 4 | Dates trace to calculations; dependency order valid |
| 10 | Daily AI Companion | Event-driven nudges | events+prefs → prioritised nudge w/ reason | 11, 08, wealthos events, prefs | 5 | One message/one action; snooze/dismiss honoured; no repeat after refusal; opt-out metric |
| 11 | AI Financial Memory | Versioned facts + provenance | fact ops → current facts, history, freshness, conflicts | profile, governance | 2 | No silent overwrite; user can inspect/correct; conflicts surfaced |
| 12 | Prediction Engine | Broader forecasts (goal shortfall, liquidity, retirement, debt-free) | snapshot+assumptions → distributions | engines, rulebook(sim) | 4 | Seeded, tested vs closed-form cases; ranges shown |
| 13 | AI Goal Builder | Explicit + discovered goals | conversation/profile → goal proposals→confirmed goals w/ probability, SIP | 12, memory | 4 (CRUD basic in 2) | Never creates goal without confirmation; probability from engine |
| 14 | Portfolio Intelligence | Goal-aligned portfolio checks | holdings+goals+risk → health, drift, concentration | profile, goals, rulebook | 5 | No product-specific recommendation unless compliance gate approved |
| 15 | Personalised AI News | Relevance-filtered news | news feed + context → items+"why it matters" | 14, 02, news provider | 5 (provider cost gate) | Info ≠ advice labelled; relevance explainable |
| 16 | Health Monitoring | Financial vitals & early warning | state → green/amber/red + data-quality flag | scoring, profile, rulebook(thresholds) | 5 | Distinguishes health vs data-quality deterioration |
| 17 | Gamification Engine | XP/streaks/badges/missions | verified events → XP ledger | actions, memory, rulebook(XP) | 5 | Idempotent ledger; caps; XP never alters score; streak recovery |
| 18 | AI Financial Copilot | Pre-action checks, reminders, hand-offs | decision context → checks/explanations | 05, 10, 20, compliance | 5 | Read-only/hand-off only until execution approved |
| 19 | Family Wealth Graph | Household modelling | members+links+permissions → household view | profile, governance | 5 | Per-member permissions enforced; "one income stops" simulation |
| 20 | Wealth OS | Orchestration/event loop | domain events → coordinated updates | all | 5 (events from 2) | Events outboxed, idempotent consumers, full audit |

## Dependency graph (build order)
```
Platform(P1) ─► Governance(consent,audit) ─► Profile+Memory(11) ─► Interview(01)
                                   │                      │
                      Rulebook ──► Engines ──► Scoring ──► Explain(04) ──► Coach(05)
                                              │   └► DNA(02) ─► Persona(03)
                                              └► Projection(12) ─► Predictor(07), Goals(13), Simulator(06)
                          Actions(08) ─► Timeline(09)
                          Events(20-lite) ─► Companion(10), Gamification(17), Health(16)
                          Portfolio(14) ─► News(15);  Household(19);  Copilot(18) last
```
Critical path: **Rulebook approval (D-B1–B4) → scoring → everything score-dependent.** Engines and interview do not depend on approval of scoring weights.
