# FinScore AI — Database Design (initial)

PostgreSQL 16 · SQLAlchemy 2.0 · Alembic. **Status:** Phase 0 logical model; DDL created in MVP 1+ per migration.

## 1. Conventions
- PK `id UUID` (uuid7 preferred, time-ordered). Every table: `created_at`, `updated_at` (timestamptz, UTC).
- Money: `NUMERIC(18,2)` + `currency CHAR(3)` (default `INR`). Ratios `NUMERIC(10,6)`. Never float.
- Soft-delete only where retention policy needs it (`deleted_at`); user-data erasure is handled by a governed purge job.
- Sensitive text/JSON fields (conversation text, free-text facts) encrypted at app level (envelope encryption, key id stored per row); disk-level encryption at infra level.
- Versioned records: **append-only** `*_versions` pattern or `valid_from/valid_to` + `superseded_by` — never UPDATE a financial fact in place.
- Row-level tenant column `org_id` (nullable) reserved from day 1 for B2B.

## 2. Entity groups and tables
### 2.1 Identity & access
`users` (email unique citext, password_hash argon2id, status, locale, timezone, mfa_enabled) ·
`user_sessions` (refresh token hash, device, ip, expires, revoked_at) ·
`roles`, `user_roles` (user, advisor, org_admin, compliance, support, admin) ·
`organizations`, `org_members` (B2B, MVP 6) · `api_keys` (B2B, hashed).

### 2.2 Governance
`consents` (user, purpose, scope, granted_at, revoked_at, version of text) ·
`audit_log` (actor, action, entity, entity_id, before/after hash, ip, request_id; append-only, hash-chained) ·
`ai_disclosures_shown` · `advice_classifications` (message/output id, class: education|information|planning|recommendation|regulated, reviewer) ·
`escalations` (user, reason, trigger, status, assigned_to, sla_due) · `retention_policies`, `data_requests` (export/erase/correct).

### 2.3 Canonical Financial State (profile)
`households` (owner user) · `persons` (household member: self, spouse, child, parent; dob, dependant flag) ·
`income_streams` (person, type, amount, frequency, stability, taxable flag) ·
`expense_items` (category, amount, frequency, essential flag) ·
`assets` (type: bank|mf|equity|gold|epf|ppf|nps|real_estate|other, value, as_of, liquid flag) ·
`liabilities` (type, outstanding, rate, emi, tenure_remaining, secured flag) ·
`insurance_policies` (type: term|health|pa|ci, cover, premium, renewal_date, insured_person) ·
`tax_profile` (fy, regime, deductions JSONB) · `preferences` (risk comfort, liquidity pref, comms pref).
**Each of the above is backed by `fact` provenance rows (see 2.4)** — entities hold the *current projection*, `facts` hold the history.

### 2.4 Memory & provenance
`facts` (id, user_id, subject_type, subject_id, field_key, value JSONB, unit, **source_type** [USER_STATED|CONNECTED|DERIVED|INFERRED|ESTIMATED], source_ref (message_id / connector), confidence NUMERIC(4,3), verification_state, consent_id, valid_from, valid_to, superseded_by, freshness_class, stale_at, created_by) ·
`fact_conflicts` (fact_a, fact_b, materiality, resolution, resolved_by) ·
`memory_notes` (non-numeric preferences/decisions with source message, user-editable) ·
`coverage_map` (user, score_pillar_id, state Unknown|Partial|Verified|Stale, updated_at).

### 2.5 Interview / Coach conversation
`conversations` (user, mode problem|full|coach, status, intent_labels[]) ·
`messages` (conversation, role, content_enc, tokens, model, prompt_version, created_at) ·
`message_extractions` (message, extracted facts JSON, schema_version, validation_status, accepted_fact_ids) ·
`tool_calls` (message, tool, args JSON, result_hash, latency, status) ·
`ai_runs` (provider, model, prompt_id/version, input_tokens, output_tokens, cost_est, latency, eval_tags).

### 2.6 Rulebook
`rulebook_versions` (version semver, status draft|pending_approval|approved|retired, effective_from, approved_by, checksum, content JSONB) ·
`rulebook_items` (version, item_key, kind pillar|weight|threshold|matrix|action|assumption…, value JSONB, status APPROVED|PENDING_PRODUCT_APPROVAL|PLACEHOLDER, owner) ·
Source of truth is files in repo (`backend/app/rulebook/versions/`); DB rows are **published snapshots**.

### 2.7 Scoring, DNA, persona
`score_pillars` (id SP-01.., name, definition, active) — populated only from approved rulebook ·
`score_runs` (user, snapshot_id, rulebook_version, engine_version, overall, confidence, trend, stage_key, stage_provisional bool, computed_at) ·
`pillar_scores` (run, pillar, raw JSONB, normalised 0-100, weight, contribution, confidence) ·
`score_factors` (run, pillar, factor_key, contribution, evidence_fact_ids[], explanation_key) ·
`input_snapshots` (user, hash, payload JSONB — frozen inputs for reproducibility) ·
`dna_traits` (user, dimension, value, confidence, evidence_count, last_evidence_at) + `dna_trait_history` ·
`persona_assignments` (user, persona_key, modifier_key, score, run_id, explanation).

### 2.8 Prediction, simulation, goals, actions
`projections` (user, kind score|goal|liquidity|retirement, horizon, p10/p50/p90, assumptions JSONB, seed, rulebook_version) ·
`simulations` (user, scenario JSONB, baseline_snapshot, result JSONB, assumptions JSONB, seed, created_by message) ·
`goals` (user/household, name, target_today, target_nominal, target_date, priority, current_funding, monthly_funding, probability, status, source user|ai_proposed_confirmed) + `goal_proposals` (AI suggestion pending user confirm) ·
`action_catalog` (key, rulebook item ref, pillar, template) ·
`user_actions` (user, catalog_key, params, priority_breakdown JSONB, state suggested|accepted|skipped|snoozed|in_progress|completed|verified|rejected, verified_by_fact_id) ·
`timeline_milestones` (user, kind, target_date, depends_on[], source).

### 2.9 Engagement, advanced, commercial
`nudge_rules`, `nudges` (user, trigger_event, priority, payload, delivered_at, dismissed/snoozed, reason_text), `notification_prefs` ·
`xp_ledger` (user, delta, reason, source_action, idempotency_key), `streaks`, `badges`, `user_badges`, `missions` ·
`holdings` (portfolio), `portfolio_checks`, `news_items`, `news_relevance` ·
`health_indicators` (user, indicator, status, as_of, data_quality_flag) ·
`household_links` (person↔person relationships) + `share_permissions` (grantor, grantee, scope) ·
`plans`, `entitlements`, `subscriptions` (provider ref, status, period), `invoices_ref`, `usage_counters` ·
`domain_events` / `outbox` (type, payload, processed_at).

## 3. Key relationships (summary)
`users 1—N households 1—N persons`; `persons 1—N income_streams/assets/liabilities/insurance`; every current-state row `N—1 facts` (latest valid); `users 1—N score_runs 1—N pillar_scores 1—N score_factors`; `score_runs N—1 input_snapshots`, `N—1 rulebook_versions`; `actions N—1 score_runs` (why suggested).

## 4. Indexing strategy
- `facts(user_id, field_key, valid_to NULLS FIRST)` partial index `WHERE valid_to IS NULL` (current facts).
- `score_runs(user_id, computed_at DESC)`; `messages(conversation_id, created_at)`; `audit_log(entity, entity_id, created_at)`; `nudges(user_id, delivered_at)`; `xp_ledger(user_id, created_at)` + unique `idempotency_key`.
- GIN on JSONB only where queried (`tool_calls.args`, `simulations.scenario`) — added when measured.
- Partition candidates: `audit_log`, `messages`, `ai_runs`, `score_runs` by month.

## 5. Audit & versioning
Fact change = new `facts` row + old row `valid_to` set + `audit_log` entry. Score runs immutable. Rulebook versions immutable after approval. Audit log append-only (DB role without UPDATE/DELETE) with per-row hash chain.

## 6. Data lifecycle
Retention class per table (`retention_policies`); export (JSON) and erasure/crypto-shred (drop per-user data key) designed in; periods **PENDING (D-B16)**.

## 7. Migration policy
Alembic only; one migration per change; forward-only in prod with tested downgrade in CI; no destructive migration without approval; seed data limited to rulebook placeholders and clearly flagged demo data.
