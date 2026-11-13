# FinScore AI — Phase 0 Technical Design Review (for approval)

**Prepared for:** Product Owner · **Status:** ⏸ awaiting your approval — **no scaffold/code has been created**.

## 1. What was done
Both source documents read in full (deck: 16 slides + notes; blueprint: 32 sections + appendix + tables). Diagrams/images: none present (text/shape-based only). Requirements extracted to `PRODUCT_REQUIREMENTS.md`; 12 inconsistencies and 21 missing decisions logged in `PRODUCT_DECISIONS.md`.

## 2. Deliverable index (all in `docs/`)
| Assignment item | Document |
|---|---|
| 1–3 Read, requirements, 20 pillars | PRODUCT_REQUIREMENTS, PILLAR_MAP |
| 4–5 Dependencies, core MVP | PILLAR_MAP, IMPLEMENTATION_ROADMAP |
| 6 Missing decisions | PRODUCT_DECISIONS |
| 7, 9, 10 Architecture, backend/frontend modules | SYSTEM_ARCHITECTURE |
| 8 DB model | DATABASE_DESIGN |
| 11 AI orchestration | AI_ARCHITECTURE |
| 12 Deterministic calc services | SYSTEM_ARCHITECTURE §5, FINANCIAL_RULEBOOK |
| 13 Security/compliance | SECURITY_ARCHITECTURE |
| 14–15 Roadmap, tracker | IMPLEMENTATION_ROADMAP, IMPLEMENTATION_TRACKER |
| 16 Costs | INFRASTRUCTURE_COSTS |
| Also required | API_SPECIFICATION, UI_UX_GUIDELINES, TESTING_STRATEGY, DEPLOYMENT_GUIDE, KNOWN_ISSUES, CHANGELOG |

## 3. Design on one page
- **Modular monolith**: FastAPI + Postgres; Next.js frontend; Redis/worker only from MVP 4.
- **Trust boundary:** LLM (language) → typed tools → pure `engines/` (math) governed by a versioned **Rulebook**. Number-grounding guard; every score/projection stores rulebook+engine version and frozen inputs.
- **Memory = versioned facts with provenance** (user-stated/connected/derived/inferred/estimated); user can correct; nothing overwritten silently.
- **Honesty about missing rules:** official FinScore cannot be produced until Product supplies pillar methodology, weights, age×score matrix, personas, action deltas, simulation assumptions. Until then a **watermarked demo rule set** drives dev/test and production refuses to emit unofficial scores.
- **Recommended MVP order:** yours, with adjustments R1–R9 (engines + minimal governance pulled into MVP 2; connected data and news deferred behind approval gates). Indicative total ≈ 66–82 engineer-weeks.

## 4. Top findings you should know
1. "20 pillars" = two different lists (AI capabilities vs the Blueprint's *proposed* scoring pillars).
2. Deck illustration "Independence in 9 months" conflicts with its own 3-month score of 689 (already in the 675–749 band).
3. Explainability example contributions (+42…−11) sum to +48, not 665 — the contribution baseline must be defined.
4. Deck says priority pillars are highlighted, but this is visual-only; I did not guess which.
5. Deck proposes ML (SHAP, trained models); I propose deterministic/rule-based first because ML needs outcome data that doesn't exist yet.

## 5. Approvals requested (answer to proceed to scaffold)
| # | Decision | My recommendation |
|---|---|---|
| 1 | Naming split AI Capabilities (AC) vs Score Pillars (SP) | Approve |
| 2 | Modular monolith + pure engines + rulebook-versioned scoring | Approve |
| 3 | Tailwind-first UI; MUI only where justified (deviation from stack list) | Approve (single design system, smaller bundle) |
| 4 | Engineering **demo rule set**, watermarked, blocked in production | Approve |
| 5 | MVP sequence with adjustments R1–R9 | Approve |
| 6 | India-only for MVP 1–4; English only | Approve unless told otherwise |
| 7 | First-party auth (Argon2id+JWT), no SMS OTP yet | Approve |
| 8 | LLM provider(s) and monthly AI cap | **You decide** |
| 9 | Hosting shortlist for staging | **You decide** |
| 10 | Which AI pillars are ★ priority (slide 5) | **You decide** |
| 11 | Defer AA, news feed, SMS OTP until separate approval | Approve |

## 6. Product-team inputs needed (critical path)
D-B1…B4 (score pillars, weights/scales, 300–900 mapping, age×score matrix) → blocks *official* scoring; D-B9/B10 (advice perimeter, escalation) → block public AI coach; remaining list in PRODUCT_DECISIONS §B.

## 7. Next step on approval
Execute SECOND ASSIGNMENT (MVP 1 foundation): repo, scaffolds, Postgres, migrations, auth, health checks, Docker, tests, CI, and verify locally with evidence.
