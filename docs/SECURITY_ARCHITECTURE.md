# FinScore AI — Security, Privacy & Compliance Architecture

Subject to Legal/Compliance approval (D-B9, D-B16). Design target: DPDP Act 2023 (India) principles, RBI Account Aggregator consent model, SEBI IA/RA considerations, GDPR-ready for global — **final legal perimeter determined by 5nance Legal**, not engineering.

## 1. Threat model (summary)
Assets: financial profile, conversations, credentials, AI prompts. Actors: external attacker, credential stuffing, malicious user (prompt injection, IDOR), insider, compromised dependency, LLM provider data exposure. Key risks: account takeover, IDOR across households, PII in logs/prompts, prompt injection causing tool misuse, unreviewed advice.

## 2. Authentication & sessions
- Argon2id password hashing (parameters tuned, pepper from secret store); breached-password check (k-anonymity) at signup.
- Access JWT (≤15 min, asymmetric keys, `kid` rotation) + **rotating refresh token** in httpOnly, Secure, SameSite=Lax cookie; refresh reuse detection revokes the family.
- Email verification, password reset with single-use expiring token, login throttling + lockout backoff, optional TOTP MFA (MVP 6; required for staff/admin).
- Session list + revoke; device/IP metadata.

## 3. Authorisation
RBAC roles: `user`, `advisor`, `org_admin`, `compliance`, `support`, `admin`. Every query scoped by `user_id`/`org_id` in repository layer (no unscoped repository methods); household sharing via explicit `share_permissions`. Policy checks in service layer + automated IDOR tests per endpoint. Support/admin access to user data requires purpose, is time-boxed, and logged.

## 4. Data protection
- TLS 1.2+ everywhere; HSTS; encrypted DB volumes & backups.
- **Application-level envelope encryption** for conversation text, free-text facts and identifiers; per-user data key wrapped by KMS key → enables crypto-shredding on erasure.
- Secrets only via env/secret manager; no secrets in repo (pre-commit secret scan + CI gitleaks); `.env.example` has placeholders only.
- Data minimisation: no PAN/Aadhaar/bank account numbers collected in MVP 1–4.
- Backups encrypted, restore-tested; PITR enabled in production.

## 5. API & app security
Pydantic validation on all input; size limits; rate limiting (per IP + per user + per-endpoint; stricter on auth & AI endpoints; Redis-backed from MVP 4, in-memory/proxy earlier); CORS allow-list; CSRF protection for cookie flows (double-submit/Origin check); security headers + CSP on frontend; output encoding; dependency scanning (pip-audit, npm audit, Dependabot), SAST (bandit/semgrep/CodeQL), container scanning (Trivy); least-privilege DB roles (app role cannot DROP; audit table insert-only).

## 6. AI-specific security
Prompt-injection defence: user/tool text is data, never instructions; tools are allow-listed and permission-checked with the **user's** identity (LLM cannot choose user_id); write tools need explicit user confirmation token; output grounding & PII-redaction filter; per-user token budgets; red-team eval suite; provider terms: zero-retention / no-training (approval).

## 7. Consent, provenance, user rights
- Consent records per purpose (core processing, AI processing, connected-data sources, marketing, analytics) with text version; revocation propagates (stop processing, mark dependent connected facts).
- Provenance on every fact (see DATABASE_DESIGN §2.4).
- **User data correction:** UI to view/edit/dispute facts; edits create new versions with audit.
- Export (machine-readable) and erasure (purge + crypto-shred) workflows; retention policy table; periods PENDING.
- Account Aggregator (future): consent artefacts stored, scope/expiry enforced; FIU registration/regulatory path = **approval gate**.

## 8. Audit logging
Append-only hash-chained audit log: auth events, consent changes, fact edits, score runs, AI runs (prompt/model/rule versions), admin access, escalations. Retained per policy. Tamper-evidence checker job.

## 9. Governance & compliance controls (B§23)
| Control | Implementation |
|---|---|
| Advice classification | Every AI output tagged education/information/planning/recommendation/regulated; regulated class blocked or routed to human until perimeter approved |
| AI disclosure | Persistent badge + first-use modal + per-answer limitation footer for projections |
| Suitability / risk profile | Hook points built; methodology PENDING (D-B12); product-specific recommendations disabled by default |
| Human escalation | `escalate_to_human` tool + UI; triggers PENDING (D-B10) |
| Model governance | prompt/model/rule versions logged; staged rollout, rollback, monitoring |
| Hallucination/calculation control | grounding guard + engine-only arithmetic |

## 10. Operational security
Environment separation (dev/staging/prod), branch protection + required reviews, signed commits optional, CI secrets scoped, incident response runbook, vulnerability disclosure policy, quarterly access review, pen-test before production (cost item).

## 11. Security gates by phase
MVP 1: auth, hashing, validation, rate limit, headers, secret scan, audit skeleton · MVP 2: encryption of sensitive fields, consent, provenance · MVP 3: AI guardrails, escalation, disclosure · MVP 6: MFA, pen-test, DPIA, SOC2-style controls review, production readiness.

## 12. Implementation notes (MVP 2 follow-up)
- Access tokens are validated against the live session family on every request (logout, session revoke, password reset and erasure take effect immediately).
- DB writes are committed before the HTTP response is sent (function-scoped session), so clients never read stale data after a successful write.
- Staff endpoints re-read roles from the database; staff reads of user escalation notes are audit-logged; escalation notes and resolution text are encrypted at rest.
- Export and erasure require authentication; erasure additionally requires password re-confirmation; both are rate limited and audited.
- The erasure purge runs itself: an in-process scheduler executes due requests on a timer (immediately on app start, then every `PURGE_INTERVAL_SECONDS`), so an account does not depend on an operator remembering to run the purge CLI (K-25).
- Coach (MVP 3): tools are read-only and take the user id from the authenticated session, never from model output; the model receives only engine facts plus the user's question (no ids, names or emails) and its text is discarded unless every number is present in those facts; numbers typed by the user do not count as grounded. `coach_runs` records mode, tools and flags without user text.
