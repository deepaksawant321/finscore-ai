# FinScore AI — AI Architecture

## 1. Principle
**LLM = language layer. Engines = numbers. Rulebook = policy.** The LLM extracts, converses, routes, and explains tool outputs. It never produces an authoritative financial number, score, tax, projection or stage.

## 2. Components
```
user msg ─► Orchestrator ─► [Safety/Classifier] ─► Planner(LLM) ─► Tool Router ─► typed tools ─► engines/services
                │                                      ▲                              │
                │              Prompt Registry ────────┘             tool results (source of truth)
                ▼                                                                      │
          Conversation state ◄──────── Explainer(LLM) ◄────────────────────────────────┘
          Memory service (facts+provenance)        Guardrails (number-check, disclosure, advice class)
```
| Component | Responsibility |
|---|---|
| **LLM Gateway** (`ai/gateway`) | Provider-agnostic interface: `complete()`, `stream()`, `structured(schema)`. Adapters: Anthropic (default), OpenAI-compatible, mock/replay for tests. Retry, timeout, circuit-breaker, per-user/org budgets, cost metering, model routing (small model for classify/extract, larger for coaching). |
| **Prompt Registry** | Prompts as versioned files (`ai/prompts/<name>/vN.md` + metadata). `prompt_version` stored on each `ai_runs` row. No prompt strings inline in code. |
| **Structured outputs** | Pydantic schemas for intent, fact extraction, scenario parse. Validate → on failure one repair retry → else ask user. Schema version recorded. |
| **Orchestrator** | Per-conversation state machine (Problem Mode / Full Mode / Coach). Decides next step; enforces max tool-loops and token budget. |
| **Intent classifier** | Multi-label 12 intents (B§2) + safety/advice-risk class. |
| **Fact extraction** | Free text → candidate facts `{field_key, value, unit, span, confidence}`. Candidates are **proposals**: validated (types, ranges, plausibility, unit conversion ₹ lakh/crore→INR by deterministic parser, not LLM arithmetic), then shown to user as chips, then written to Memory with `USER_STATED`. Ambiguity → clarifying question. |
| **Question selector** | Deterministic scorer over coverage map: relevance + information gain + dependency + freshness + friction **[PROPOSED B§3]**; LLM only phrases the question. Information-gain weights live in rulebook (PENDING). |
| **Tool layer** | Typed tools (JSON-schema from Pydantic), read-only by default: `get_financial_profile`, `get_score`, `explain_score`, `compare_scores`, `calculate_retirement`, `calculate_tax`, `simulate_cashflow`, `run_scenario`, `project_score`, `rank_actions`, `list_goals`, `propose_goal` (needs user confirm), `create_goal`(confirmed), `record_fact`(proposal), `escalate_to_human`. Write tools require explicit user confirmation token. |
| **Memory (AI)** | Retrieval of *relevant current facts* + recent decisions + conversation summary. Facts come from DB, not chat history. Summaries are non-authoritative. |
| **Guardrails** | (a) *Number grounding*: every numeric token in a final answer must match a tool result field (post-check; mismatch → regenerate/strip). (b) Disclosure injection (AI use, limitations). (c) Advice classification of output. (d) Prohibited-content/jailbreak filter. (e) Escalation triggers (high value, distress, regulated product ask, low confidence, user request). (f) No fabricated precision: ranges + assumptions attached. |
| **Evaluation framework** | See §5. |

## 3. Pipelines
**Interview turn:** classify intent → extract candidate facts → validate → clear rule-extracted facts are saved at once with Undo/Change, unclear ones wait for the user to check them (see below) → persist facts → update coverage map → if enough for the problem: call deterministic engine for provisional answer → LLM explains result with assumptions → choose next question (selector) → reply.
**Coach turn:** classify mode (Explain/Diagnose/Simulate/Act) → plan tool calls → execute → ground → explain → classify advice → disclose → log.
**Simulate:** LLM parses NL → `ScenarioSpec` (validated, missing variables asked) → `simulate` engine → result + assumptions + sensitivity → LLM narrates.

## 4. DNA / Persona models
- MVP: **rule-based**, rulebook-configured trait derivation from facts/behaviour (thresholds PENDING). Each trait stores value+confidence+evidence_count+recency+history.
- Persona: scoring function persona-vs-(DNA, stage, goals) from a rulebook catalogue (PENDING). LLM writes the narrative only.
- ML (learned traits, prediction models) deferred until real outcome data exists; deck's "trained model" (S14) is a later phase — recorded in KNOWN_ISSUES as scope note.

## 5. AI evaluation framework
| Eval | Method | Gate |
|---|---|---|
| Extraction accuracy | Golden set of utterances (₹ lakh/crore, Hindi-English mix later) → expected facts; precision/recall per field | ≥ target set at MVP 2 start |
| Intent accuracy | labelled set | threshold |
| Number grounding | adversarial prompts; check ungrounded numbers = 0 | **0 tolerated** |
| Tool selection | scenario suite, expected tool sequence | threshold |
| Safety/advice | red-team set (guaranteed returns, specific stock picks, self-harm distress) | 100% escalate/refuse where required |
| Regression | replay recorded conversations against new prompt/model versions in CI (mock LLM for deterministic part, nightly live-model run) | no regressions |
| Cost/latency | tokens per turn, p95 latency budgets | budgets |
All eval datasets are synthetic (no real user data).

## 6. Privacy in AI
Send minimum fields; pseudonymous ids; no name/email/phone/PAN/account numbers in prompts; provider zero-retention/no-training terms required (approval item); user-visible "what AI used" panel; no training on identifiable data without consent.

## 7. Failure modes
Provider outage → degrade: show deterministic dashboard, queue chat, banner. Schema failure → clarify. Tool error → say so, never guess. Budget exceeded → soft limit + upgrade prompt.

## 8. Voice/Tone
Reflect first, explain why asking, one question at a time, no manipulative praise, no fear framing (B§2, §10, §13).

**Auto-save of clear answers (2026-11-18).** A candidate is saved without asking only if all of these hold: it comes from the rule extractor (never the LLM); its confidence is at least `AUTOSAVE_MIN_CONFIDENCE` (0.8, PLACEHOLDER); the field is not already known (a different value for a known field is always checked); the field is not already waiting for a check. A reply to the question just asked counts as clear only if it is short (at most `DIRECT_ANSWER_MAX_WORDS`, 6, PLACEHOLDER), has at most one amount and nothing else was extracted. Sums of several amounts score 0.75 and are checked. Auto-saved facts are `USER_STATED` with the extractor's confidence (< 1) and `source_ref = message:<id>`; confirming (interview or Memory page) raises confidence to 1 in place (audit `fact.confirmed`); Undo closes the fact (audit `fact.retracted`) and is refused with 409 `fact_changed` if the fact was changed since.
