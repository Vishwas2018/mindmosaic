# ADR-0010 — Node.js 22 LTS upgrade for CI runners

- Status: accepted
- Date: 2026-05-02
- Stage: 5 (audit day)
- Tags: infra, dx

## Context

GitHub Actions deprecated Node 20 with a hard removal deadline of 2026-06-02. The CI workflow
(`.github/workflows/ci.yml`) pinned `node-version: "20"` in all three runner jobs (lint,
typecheck, unit). After the deadline, these jobs would emit deprecation errors and risk breaking
the CI matrix.

Node 22 is the current LTS line (Active LTS since 2024-10). No application code targets
Node-version-specific APIs — the codebase runs in Supabase Edge Functions (Deno) and a
Next.js 14 frontend, both of which specify their own runtime independently of the root engines
field. The engines bump is a consistency signal, not a runtime constraint.

## Options considered

1. **Bump to Node 22 LTS now** — one-line change per job, zero code changes required. Resolves
   before the hard deadline. Aligns `.nvmrc` and `engines` for developer consistency.
2. **Wait until deadline approaches** — defers the work but risks CI instability after 2026-06-02
   and breaks the "green on every push" contract.

## Decision

Use **Option 1**: bump all three CI runner jobs to Node 22 LTS.

## Rationale

The hard external deadline (2026-06-02) makes deferral unjustifiable. The change is purely
mechanical — no code breakage risk. Completing it on Audit Day 1 (Stage 5) satisfies
BUILD_CONTRACT §1 (no CI breakage) before the deadline window.

## Consequences

- Positive: CI no longer at deprecation risk; `.nvmrc` + `engines.node` + CI runners all aligned
  on Node 22 LTS; ISSUE-0001 closed.
- Negative: none. Node 22 is a drop-in upgrade for this codebase.
- Follow-ups: none. Next LTS review at Node 24 (approx. 2026-10).

## Implementation notes

Files: `.github/workflows/ci.yml` (3 jobs), `package.json` (engines.node), `.nvmrc` (created)  
Commit: (this audit day commit)  
Related: ISSUE-0001
