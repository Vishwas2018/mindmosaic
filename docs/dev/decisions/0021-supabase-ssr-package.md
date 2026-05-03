# ADR-0021 — Use @supabase/ssr for Next.js SSR Supabase client

- Status: accepted
- Date: 2026-05-04
- Stage: 14
- Tags: frontend | backend | infra

## Context

Stage 14 introduces `apps/web`, a Next.js 14 App Router application. The app requires a
Supabase client that works in three distinct Next.js execution contexts:
1. **Client components** — browser; persists session in cookies.
2. **Server components / Route Handlers** — Node.js server process; reads cookies via `next/headers`.
3. **Middleware** — Edge runtime; reads/writes cookies on the `NextRequest`/`NextResponse` pair.

The legacy `@supabase/auth-helpers-nextjs` package was deprecated in favour of `@supabase/ssr`.
The new package provides `createBrowserClient` and `createServerClient` with an explicit cookie
adapter API, separating the cookie strategy from the client construction logic.

## Options considered

1. **`@supabase/ssr`** — Official current package. Explicit `cookies: { getAll, setAll }` adapter
   per context. Works in App Router server components (async `cookies()` from `next/headers`).
   Pros: supported, App Router–native, explicit cookie control. Cons: slightly more boilerplate
   than the deprecated helper.

2. **Manual `@supabase/supabase-js` + custom cookie handling** — Use the base JS client with a
   hand-rolled cookie adapter. Pros: no extra dependency. Cons: reimplements what `@supabase/ssr`
   provides; fragile against Supabase auth internals changing.

3. **`@supabase/auth-helpers-nextjs` (deprecated)** — Prior-generation helper.
   Pros: familiar. Cons: deprecated, no App Router–native async cookies() support; will break
   on future Supabase auth updates.

## Decision

Use **`@supabase/ssr`** (Option 1).

## Rationale

- It is the official Supabase recommendation for Next.js App Router as of Supabase JS v2 + SSR v0.5+.
- The `createServerClient` pattern with `cookies: { getAll, setAll }` maps cleanly to both
  server components (via async `cookies()`) and middleware (via `NextRequest.cookies`).
- `CookieOptions` type imported from `@supabase/ssr` resolves the `noPropertyAccessFromIndexSignature`
  + implicit `any` conflict from `tsconfig.base.json`.
- Avoids re-implementing session refresh logic (handled internally by the package on cookie writes).

## Consequences

- Positive: Official support path; upgrade path is clear.
- Positive: Three client helpers (`client.ts`, `server.ts`, `middleware.ts`) follow the same pattern,
  easy to audit.
- Negative: `CookieOptions` must be explicitly imported to satisfy strict TypeScript. Minor boilerplate.
- Follow-ups: When Supabase SSR releases breaking changes, update all three helper files together.

## Implementation notes

Files: `apps/web/src/lib/supabase/client.ts`, `server.ts`, `src/middleware.ts`
Commit: 5e3e1f0
Related: Stage 14, CLAUDE.md §Tech stack
