# FinScore AI: Security, Privacy and Trust Audit

**Date:** 2026-11-18 · Read-only code review plus a local run. This is not a penetration test, and nothing here is a legal opinion: the regulatory points need 5nance Legal.

## 1. Overall posture
The engineering security baseline is **above average for an MVP**: Argon2id, short-lived access tokens checked against a live session on every request, rotating refresh cookie with reuse detection, an Origin check on cookie endpoints, encrypted conversation text, a hash-chained audit log, export and erasure, a consent gate before AI, an advice-classification guard, and no secrets in the repo.

The **customer-facing trust layer is almost absent**: no privacy policy, no terms, no grievance contact, no regulatory disclosure, and visible "DEMO / DRAFT / NOT APPROVED" labels on every number. A careful customer would not trust this with their finances today.

## 2. Findings

| ID | Area | Problem | Evidence | Impact | Recommendation | Pri | Effort | Metric |
|---|---|---|---|---|---|---|---|---|
| SEC-01 | Abuse protection | The rate limiter and audit trail see only the proxy's IP (see FT-01). Per-IP brute-force protection does not work, and a single client can block login for everyone. | `infra/ratelimit.py:47`, `api/deps.py:44`. Sessions list shows `127.0.0.1`. | Site-wide denial of service on auth. Audit log cannot attribute requests to a client. | Trusted-proxy configuration, real client IP, per-account limits, Redis. | **P0** | Low–Med | Load test: per-IP isolation works. |
| SEC-02 | Legal notices | No Privacy Policy, Terms of Use, cookie notice, grievance officer or contact, or "about the company" page. `/privacy` and `/terms` return 404. Registration collects no acceptance of terms. | `frontend/src/app/` has no such routes. `register/page.tsx` has no consent checkbox. | The DPDP Act 2023 expects a clear notice and consent for personal data. Financial data is high-sensitivity. Users cannot see who holds their data. | Legal to draft: Privacy Notice (purposes, retention, processors including the LLM provider, user rights, grievance officer), Terms, and Disclaimers. Link them in the footer, at registration and in Settings. Log the version accepted (the consent table already supports `text_version`). | **P0** | Low (eng) / Med (legal) | Pages live. Consent version recorded for 100% of new accounts. |
| SEC-03 | Regulatory perimeter | Whether the Coach, Actions, What-if or a future Portfolio feature count as *investment advice* is undecided (D-B9, SEBI IA/RA). The keyword guard is a safety net, not a determination (K-24). | PRODUCT_DECISIONS D-B9, D-B10, D-B12. | Regulatory exposure as soon as real users get "next best actions". | Legal opinion before any public launch. Keep "education/information" framing and add a persistent disclaimer. | **P0** | Med (legal) | Written perimeter decision. |
| SEC-04 | Tenant isolation in the browser | The white-label theme in `localStorage` survives logout and shows on public pages and in other users' sessions on the same device (FT-05). | Landing page shows "Finscore Test" to a logged-out visitor (screenshot 01). | Low-severity information leak (which business the last user administered). Brand spoofing risk. | Server-driven, session-scoped theme. Clear it on logout. | P1 | Low | n/a |
| SEC-05 | Content-Security-Policy | No CSP header on the frontend. HSTS only when `COOKIE_SECURE`. | `curl -I http://localhost:3000/`: `X-Frame-Options` present, no CSP. `next.config.mjs` headers. | XSS blast radius is larger. The access token lives in JS memory, so a script injection could read it. | Add a strict CSP (nonce-based for Next), plus `frame-ancestors 'none'`. | P1 | Low–Med | CSP present, report-only first. |
| SEC-06 | Account lockout | 5 failed logins lock the account for 15 minutes, and the 423 response reveals that the account exists. | `domains/identity/service.py:172-181`. | An attacker can keep any known user locked out, and can enumerate accounts. | Progressive delay per account plus IP, CAPTCHA or step-up after N failures, and the same response for locked and wrong-password. | P2 | Low | n/a |
| SEC-07 | Token signing | HS256 shared secret, no `kid` rotation (K-14). | `infra/security.py`. | Acceptable while there is one service. A risk once the partner widget or SDK verifies tokens. | RS256/EdDSA with rotation before production. | P2 | Low | n/a |
| SEC-08 | MFA | No MFA for anyone, including staff who can read escalation notes (K-16). | `/app/staff` roles granted by CLI. | Staff account takeover exposes users' financial distress notes. | TOTP MFA mandatory for staff and workspace owners. Optional for consumers. | P1 (staff) | Med | 100% of staff with MFA. |
| SEC-09 | Encryption keys | One Fernet key for all conversation text. No per-user crypto-shredding (K-20). | `infra/crypto.py`. | Key compromise exposes every conversation. Erasure relies on row deletion only. | KMS envelope encryption with per-user data keys (planned for MVP 6). | P2 | Med | n/a |
| SEC-10 | Password policy | Composition rules (upper, lower, digit, 10+) but no breached-password check, no strength meter, no show-password toggle. | `identity/schemas.py:7-14`. | Weak-but-compliant passwords pass, and the form is fiddly on phones. | k-anonymity breached-password check (planned) plus a strength meter. Consider passwordless or OTP. | P2 | Low | n/a |
| SEC-11 | LLM data handling | When an LLM is enabled, prompts carry financial facts to a third party. The provider's retention and no-training terms are not yet recorded, and the privacy notice does not name the processor. | AI_ARCHITECTURE, SECURITY_ARCHITECTURE §6. | Consent may not be "informed". | Name the processor and region in the notice. Use zero-retention terms. Keep PII minimisation. | P1 (before enabling the LLM) | Low | n/a |
| SEC-12 | Staff tooling | Staff roles are granted by CLI. No time-boxed, purpose-logged access to user data. No staff audit viewer. | K-26, SECURITY_ARCHITECTURE §3. | Insider risk is controlled only by process. | Admin console with purpose prompts, access expiry and an audit viewer. | P2 | Med | n/a |

## 3. Trust signals: what a customer sees today

| Signal | Status | Comment |
|---|---|---|
| Who is behind this (company, registration, address) | Missing | 5nance is mentioned only as "Powered by 5nance". |
| Privacy policy and terms | Missing | 404. |
| Regulatory status (SEBI IA/RA, or "education only") | Missing | Not stated anywhere. |
| "Bank-grade encryption" claim | Shown on the landing page | Unsubstantiated: no security page backs it up. Consider "encrypted in transit and at rest" with a link to a security page. |
| Data control | Good inside the app | Export, delete and consent toggle all exist, but nothing on the public site says so. |
| Score credibility | Negative | "WORKBOOK DRAFT RULES — NOT AN OFFICIAL FINSCORE", "DEMO THRESHOLDS: NOT APPROVED HEALTH RULES", "engineering placeholder rules". These are honest, but read as "this product is not finished". |
| Human support | Partial | "Talk to a person" exists, with no SLA, hours, phone, email or WhatsApp shown. |
| Social proof (reviews, partners, media) | Missing | n/a |

## 4. Fintech-specific notes
- **Responsible communication:** the Money Map scores *income level* ("Income: 7/10 for your age group"). Rating people on how much they earn rather than on what they do with it can read as judgmental, and may draw fairness criticism. Prefer behaviour-based framing, or show income as context, not a score.
- **Health check false reassurance (FT-16):** telling someone they are "Healthy" while their insurance status is unknown is the kind of message that causes complaints if something goes wrong.
- **Data minimisation:** good. No PAN, Aadhaar or account numbers are collected.
- **Erasure:** implemented, with a 7-day placeholder cooling-off period. The retention legal basis is still open (D-B16, D-B23). An erased sole owner leaves a workspace without an owner (K-48).
