# ADR-0002 — pnpm hoisting policy for dev toolchain binaries

- Status: accepted
- Date: 2026-04-30
- Stage: 1
- Tags: dx | infra

## Context

Workspace package scripts (e.g., `packages/types` running `tsc --noEmit`, `eslint src`, `vitest run`) need to call binaries provided by root devDependencies (`typescript`, `eslint`, `vitest`). These packages are not declared in individual workspace `package.json` files to avoid repeating the same 4–5 entries across all 6 workspaces.

pnpm's default strict isolation does not hoist packages; only the workspace root's direct dependencies are symlinked in a way accessible to scripts. Three strategies were considered.

## Options considered

1. **`shamefully-hoist=true`** — hoists all packages from all workspaces to root `node_modules/`, mimicking npm's flat install. Pros: simple, zero friction. Cons: defeats pnpm isolation entirely; masks missing dependency declarations that would catch import errors in production; security surface is broader.

2. **`public-hoist-pattern[]=<targeted patterns>`** — hoists only packages matching specific globs to root `node_modules/`. Pros: narrow surface; only dev toolchain binaries are hoisted; workspace runtime deps remain properly isolated. Cons: requires knowing which tool families need hoisting.

3. **Add devDependencies to every workspace** — list `typescript`, `eslint`, `@typescript-eslint/*`, `vitest` in each of the 6 workspace `package.json` files. Pros: explicit; no hoisting magic. Cons: ~30 extra `package.json` entries for identical versions; noisy diffs on version bumps.

## Decision

Use **Option 2** — `public-hoist-pattern` for the four dev toolchain families:

```
public-hoist-pattern[]=*eslint*
public-hoist-pattern[]=*prettier*
public-hoist-pattern[]=typescript
public-hoist-pattern[]=*vitest*
```

## Rationale

This is the minimal surface needed for workspace scripts to call `tsc`, `eslint`, and `vitest` as binaries without per-workspace declarations. Option 3 is the most explicit but produces significant noise; option 1 is convenient but defeats the purpose of pnpm's isolation model for future-stage runtime packages (Edge Functions, types). Option 2 is the documented pnpm recommendation for dev tooling in a monorepo.

`vitest` resolves its own runtime dependencies (vite, esbuild) through its own `node_modules` chain when it runs; they do not need to be separately hoisted.

## Consequences

- Positive: eslint, prettier, typescript, vitest binaries available across all workspaces without per-package declarations; pnpm isolation preserved for runtime packages.
- Negative: if a future tool is added that also needs hoisting, this ADR must be updated and `.npmrc` amended.
- Follow-ups: if any workspace script fails to find a binary, add the matching pattern here before escalating to `shamefully-hoist`. Document the break in `DAILY_LOG.md` and update this ADR.

## Implementation notes

Files: `.npmrc` · Commit: _(Stage 1 dev-context commit SHA — to be filled)_ · Related: ADR-0001, DEV-20260430-1
