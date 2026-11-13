# FinScore AI — Financial Rulebook (specification & status)

The Rulebook is the single version-controlled specification (B§28 "critical dependency"). Machine-readable files live in `backend/app/rulebook/versions/<semver>/`. This document defines the **schema, governance and current approval status**. **No value below is invented: everything not in the source documents is `PENDING PRODUCT APPROVAL`.**

## 1. Item status vocabulary
| Status | Meaning | Allowed in production? |
|---|---|---|
| `APPROVED` | Signed off by Product/Quant, has owner & effective date | Yes |
| `SOURCE_DEFINED` | Explicitly stated in the deck/blueprint (e.g., 300–900, 8 stages & bands) | Yes |
| `PROPOSED` | Suggested in blueprint, not approved | No (dev/test flagged) |
| `PENDING PRODUCT APPROVAL` | Not defined anywhere | No — engine refuses to emit official result |
| `PLACEHOLDER` | Engineering test value, watermarked "DEMO RULES — NOT OFFICIAL" | Dev/test only |

**Production guard:** with `ENV=production`, scoring service raises `RulebookNotApproved` if any required item is not `APPROVED`/`SOURCE_DEFINED`. UI shows "FinScore not yet available" rather than an unofficial number.

## 2. Rulebook minimum schema per Score Pillar (B§29)
`pillar_id · definition · sub_factors[] · formula · scale (raw→0-100) · weight · min_data · fallback · freshness · confidence · positive_drivers · negative_drivers · actions[] · expected_delta · time_to_impact · stage_dependency · explainability_text · audit{version, owner, effective_date}`.

## 3. Current status register
| Rulebook section | Status | Source / note |
|---|---|---|
| Overall score range 300–900 | SOURCE_DEFINED | S4 |
| Eight stages & names | SOURCE_DEFINED | S4 |
| Stage score bands (Dependency 300–374 … Abundance 825–900) | SOURCE_DEFINED | S4 |
| Age × FinScore stage matrix | **PENDING PRODUCT APPROVAL** | D-B4 |
| Stage persistence rule (e.g., 30 days) | PROPOSED | B§8 |
| Gamified stage names | PROPOSED | B§8 |
| Score Pillar list (20) | PROPOSED (B§6 table) | D-A1/D-B1 |
| Pillar definitions/sub-factors/formulas | **PENDING** | D-B1/B2 |
| Pillar weights | **PENDING** | D-B2 |
| Raw→0–100 scales, thresholds | **PENDING** | D-B2 |
| 0–100 weighted → 300–900 mapping | **PENDING** (linear is an obvious default but not approved) | D-B3 |
| Confidence/freshness adjustment method | PROPOSED concept only | B§6, D-B8 |
| Freshness windows per fact class | **PENDING** (B§5 gives only coarse cadence: annual/monthly/daily…) | D-B8 |
| Minimum confidence before announcing a stage (`score.min_confidence_for_stage`, demo value 0.5) | PLACEHOLDER | D-B22 |
| Persona catalogue & mapping | **PENDING** (only "The Builder" example) | D-B5 |
| DNA dimensions (10) | PROPOSED | B§7 |
| DNA trait value sets & thresholds | **PENDING** | D-B5 |
| Action library & score deltas | **DEMO library in `0.0.0-demo` (PLACEHOLDER)**; official list PENDING (deck has illustrative +18/+16… only). Score deltas are never stored: the score engine computes them per user | D-B6 |
| Action priority weights (30/25/20/10/10/5), top-5 cap | PROPOSED (`priority.weights`); urgency/effort point scales PLACEHOLDER (`priority.scales`) | B§12 |
| Simulation assumptions (returns, inflation, step-ups, tax) | **PENDING** | D-B7 |
| Monte Carlo method & confidence ranges | **PENDING** | D-B7 |
| Health thresholds (green/amber/red) | **DEMO set in `0.0.0-demo` (`health.vitals`, PLACEHOLDER)**; official set PENDING (configurable by age/income/household) | B§18 |
| XP economy | PROPOSED | B§14 |
| Nudge trigger thresholds | **PENDING** | B§13 |
| Tax rules scope/FY | **PENDING** | D-B11 |
| Insurance adequacy method | **PENDING** | D-B1 |
| Advice classification matrix | **PENDING** | D-B9 |
| Escalation triggers | **PENDING** | D-B10 |

## 4. Engineering placeholder rule set (requires approval, D-§D4)
To build/test pipelines before Product supplies rules, engineering will add `versions/0.0.0-demo/` with **arbitrary, openly fake** weights (equal weight across the 20 proposed pillars) and linear mapping, every item `status: PLACEHOLDER`, output stamped `rule_set: DEMO — NOT OFFICIAL`. These values are never to be described as the FinScore methodology and are rejected in production.

## 5. Invariants the engine must satisfy (tests, independent of approved values)
1. Overall ∈ [300, 900]; each pillar ∈ [0, 100]; weights sum to 1 (±1e-9).
2. **Additivity:** reference + Σ contributions == overall (explainability exactness).
3. Monotonicity per pillar where the rulebook declares a direction.
4. Determinism: same snapshot + rulebook + engine version ⇒ identical result (byte-equal JSON).
5. Missing data lowers *confidence*, not underlying score (B§6); behaviour defined by fallback rules.
6. Score does not change when only chat volume changes (B§6 "score movement rule").
7. Stage monotone in score for a fixed age (if matrix supplied) — matrix validated for coverage (no gaps/overlaps).
8. Same seed ⇒ same simulation output.

## 6. Change control
Rule change = PR touching `rulebook/versions/`; requires CODEOWNERS (Quant + Product) approval, bumps semver, regenerates golden tests; approved versions immutable; effective_date prevents retroactive re-scoring (old runs keep their rulebook_version; re-score creates *new* runs).

## 7. Explainability text
Each factor key maps to a template (`explanation_key`) with slots filled from deterministic values; LLM may paraphrase but not alter numbers (grounding guard).
