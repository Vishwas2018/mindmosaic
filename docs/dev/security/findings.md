# Security Findings

> Append-only. Each entry: run date, tool, summary, severity breakdown, triage notes.

---

## 2026-06-07 — pnpm audit — Stage 48 Hardening Pass

**Run date:** 2026-06-07
**Tool:** pnpm audit (pnpm 9)
**Trigger:** Stage 48 D2 deliverable — pre-deploy security scan

**Summary:** 18 vulnerabilities found. Severity: 2 low | 10 moderate | 6 high. No critical.

All high-severity findings are in `next` (Next.js 14.2.35). All require upgrade to Next.js ≥15.5.16, which is a major breaking change from 14.x. Deferred to v1.1 as a tracked dependency upgrade. Moderate findings split between dev-only tooling (Storybook/esbuild, Vite) and production transitive deps (postcss via next, glob via eslint-config-next). Low findings are Next.js cache-related, low-impact in production with standard CDN caching configuration.

---

### High (6) — all in `apps__web > next` — requires Next.js ≥15.5.16

| Advisory | Title | GHSA | Patched |
|---|---|---|---|
| 1117931 | Next.js Vulnerable to Denial of Service with Server Components | GHSA-8h8q-6873-q5fj | ≥15.5.16 |
| 1117955 | (Next.js — unspecified high) | GHSA-ffhc-5mcf-pf4q | ≥15.5.16 |
| (next) | Next.js — multiple | GHSA-gx5p-jg67-6x7h | ≥15.5.16 |
| (next) | Next.js — multiple | GHSA-h64f-5h5j-jqjh | ≥15.5.16 |
| (next) | Next.js — multiple | GHSA-wfc6-r584-vfw7 | ≥15.5.16 |
| (next) | Next.js — multiple | GHSA-36qx-fr4f-26g5 | ≥15.5.16 |

**Triage:** All require Next.js 15.x upgrade (breaking change from 14.x). Cannot patch without ADR + full regression cycle. **Deferred to v1.1 post-launch upgrade sprint.** Mitigation in production: WAF/rate limiting at CDN edge mitigates DoS exposure until upgrade.

---

### Moderate (10)

| Package | Advisory | Title | Path | Dev-only? |
|---|---|---|---|---|
| next (14.2.35) | GHSA-h25m-26qc-wcjf | Next.js — moderate | apps__web>next | No |
| next (14.2.35) | GHSA-q4gf-8mx6-v5v3 | Next.js — moderate | apps__web>next | No |
| next (14.2.35) | GHSA-c4j6-fc7j-m34r | Next.js — moderate | apps__web>next | No |
| next (14.2.35) | GHSA-9g9p-9gw9-jx7f | Next.js — moderate | apps__web>next | No |
| next (14.2.35) | GHSA-ggv3-7p47-pfv8 | Next.js — moderate | apps__web>next | No |
| next (14.2.35) | GHSA-3x4c-7xq6-9pq8 | Next.js — moderate | apps__web>next | No |
| postcss (8.4.31) | GHSA-qx2v-qp2m-jg93 | XSS via `</style>` in CSS Stringify Output | apps__web>next>postcss | No — affects build output |
| glob (10.3.10) | GHSA-5j98-mcp5-4vw2 | Command injection in `glob` CLI -c flag | apps__web>eslint-config-next>@next/eslint-plugin-next>glob | Yes — ESLint dev dep |
| esbuild (0.21.5) | GHSA-67mh-4wv8-2f99 | Dev server CORS allows any-origin read | packages__ui>storybook>esbuild | Yes — Storybook dev dep |
| vite (≤6.4.1) | GHSA-4w7w-66w2-5vf9 | Path traversal in optimized deps | packages__ui>vite | Yes — UI package dev dep |

**Triage:**
- Next.js moderate findings: all require 15.x upgrade — same as high track. Deferred to v1.1.
- postcss: affects CSS parsing in the build pipeline. Low exploitability (requires attacker-controlled CSS input to build). Monitoring; can upgrade postcss independently when a patch lands that doesn't require Next.js 15.
- glob, esbuild, vite: dev-tool only — not present in production build. Low priority.

---

### Low (2)

| Package | Advisory | Title | Path |
|---|---|---|---|
| next (14.2.35) | GHSA-vfv6-92ff-j949 | Next.js cache poisoning via RSC cache-busting collisions | apps__web>next |
| next (14.2.35) | GHSA-3g8h-86w9-wvmq | Next.js Middleware/Proxy redirect cache-poisoning | apps__web>next |

**Triage:** Both low-severity, require Next.js ≥15.5.16. Deferred to v1.1. Standard CDN cache-control headers mitigate in production.

---

### Triage summary

| Severity | Count | Fix track |
|---|---|---|
| High | 6 | v1.1 — Next.js 15.x upgrade sprint |
| Moderate | 10 | v1.1 — Next.js 15.x upgrade sprint (Next deps); postcss monitor; dev deps low-priority |
| Low | 2 | v1.1 — Next.js 15.x upgrade sprint |
| **Total** | **18** | **0 require pre-launch action** |

No Critical findings. No findings affect backend services (Supabase Edge Functions, billing-svc, assessment-svc, etc.). All high/moderate findings require a major Next.js version upgrade tracked as a post-launch item.

**Pre-launch recommended action:** Document in Stage 49 launch gate checklist that Next.js 15 upgrade is v1.1 scope; confirm WAF/rate-limiting at CDN edge is in place for DoS mitigation.
