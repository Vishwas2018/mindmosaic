# MindMosaic — Claude Design Prototype Index

> Tracks every Claude Design prototype produced for v1 frontend stages.
> Authority: prototypes are visual reference only per `UI_CONTRACT.md §1.1`.
> Prompts: `CLAUDE_DESIGN_PROMPTS.md`.
> Setup decision: ADR-0025.

## Design system

- Name: **MindMosaic v1**
- Configured: _pending — fill on first run_
- Configured by: Vish
- Source path: `apps/web` + `packages/ui` (repo connection — subdirectories only per ADR-0025)
- Branch tracked: `main`
- Setup approach: auto-derive via repo connection (preferred) / manual prompt fallback at `CLAUDE_DESIGN_PROMPTS.md §1.2`
- Verification: `CLAUDE_DESIGN_PROMPTS.md §1.3` checklist all green
- Claude Design URL: _pending — fill on first run_

## Prototypes

| Stage | Screen | Date | Frame count | Claude Design URL | Local PNGs |
|---|---|---|---|---|---|
| 24 | Results (flagship) | 2026-05-08 | 2 frames (desktop 1280, mobile 768) | https://claude.ai/design/p/019df7a1-4cdd-7be5-b73e-aa05f68fca89 | stage-24_results-flagship.{html,jsx} |

Append one row per prototype produced. PNG paths follow `docs/design/prototypes/stage-NN_<screen>.png`. Variants get suffixes (e.g. `stage-23_exam-engine_warn-state.png`).

## Prototype notes

### 2026-05-08 — Stage 24 Results flagship

Accepted as Stage 22+ visual baseline (Path B per project direction).
Prototype is cleaner and more polished than `docs/mockups/09-results.html`
and replaces it as the visual reference for Stage 24 implementation.

**Export format divergence from CLAUDE_DESIGN_PROMPTS.md §3.4:** Claude
Design exported HTML + JSX rather than the PNG frames originally specified.
HTML+JSX is accepted as the equivalent reference artefact under
UI_CONTRACT §1.1 (visual reference only, not implementation source).
CLAUDE_DESIGN_PROMPTS.md §3.4 to be amended in a future docs pass to
reflect HTML+JSX as a valid export format.

**Token divergences from `packages/ui/src/tokens.css`** — prototype uses
Claude Design's auto-derived values, NOT the locked tokens. `tokens.css`
remains authoritative per UI_CONTRACT §1.1; treat the divergences below
as prototype-side cosmetic only:

- `brand-500`: prototype uses `#5925A8` (current `#5D3FD3`)
- `brand-600`: prototype uses `#4A1D96` (current `#4A2BBA`)
- accent: prototype uses `#E26A2C` orange (current `#ef6843`)
- `font-sans`: prototype uses Roboto (current DM Sans)
- `font-serif`: DM Serif Display (matches current)

The royal-premium direction (Cormorant Garamond, cream surfaces `#FBF9F4`,
amber accent `#E8A33D`, 920px max-width) was attempted via prompt and not
achieved by the renderer. Deferred to a possible post-MVP visual refresh;
not in v1 scope.

**Implementation rule (UI_CONTRACT.md §1.1):** the prototype is a visual
reference. Stage 24 code must use `packages/ui` primitives + locked
`tokens.css` values. Where the prototype diverges from `tokens.css`,
`tokens.css` wins. The implementing engineer must file a `UI-DIVERGENCE`
entry in `DAILY_LOG.md` at Stage 24 close documenting any divergence
between rendered code and the prototype, and the reason.

## External references

References dropped from sources outside the Claude Design tooling pipeline.
Same UI_CONTRACT §1.1 rule as Claude Design prototypes — visual reference
only, never implementation source.

### portal-codebase-2026-05-06 — full portal visual reference

Source: separate Claude session (not Claude Design)
Format: 19 files, plain React .jsx + framer-motion +
lucide-react, ~280KB
Path: docs/design/prototypes/external/portal-codebase-2026-05-06/
Authority: VISUAL REFERENCE ONLY per UI_CONTRACT §1.1
Coverage: shell + 17 screens (Auth, Landing, 7 student
screens, ExamEngine, 2 parent, 4 teacher, 1 admin)

**Architecture divergences — do NOT integrate as code:**
- Plain React .jsx vs Next.js 14 App Router (apps/web)
- No TypeScript / no Zod (violates CLAUDE.md strict-types
  rule)
- Custom <AppShell> vs 5 locked shells in UI_CONTRACT §1.1
- Single 30KB+ god-files per page vs packages/ui primitives
- Inline dummy data via props vs @mm/types DTOs + @mm/sdk
- framer-motion (not in locked tech stack — would require
  ADR; conflicts with UI_CONTRACT §2.5 motion budget)

**Token divergences vs packages/ui/src/tokens.css:**
- Royal purple: #5B21B6 (violet-700) vs locked #5D3FD3
- Royal orange: #EA580C (orange-600) vs locked #ef6843
- Tone tables (TONE_BADGE, TONE_TEXT, TONE_BAR_BG,
  TONE_ICON_BG) defined in shell.jsx — not adopted

**Author-acknowledged gaps (from external README):**
- No routing, no auth, no persistence, no tests, no i18n
- Exam timer is plain setInterval — trivially defeatable
  (server-authoritative assessment-svc supersedes per
  backend-arch §4.4)
- Inert export/share/PDF buttons in StudentResults.jsx
- "Demo state switcher" — must NEVER ship to production

**Permitted uses for this reference:**
- Visual layout study for Stage 22+ implementation
- Microcopy candidates (must be reviewed against
  UI_CONTRACT §9.1 before adding to apps/web/src/lib/copy.ts)
- Composition patterns (sidebar contextual sections,
  recent-items lists, StudentHome kid-friendly variant)

**Forbidden uses:**
- DO NOT copy .jsx into apps/web/
- DO NOT adopt token values into tokens.css
- DO NOT add framer-motion or lucide-react (if not
  already present) without an ADR
- DO NOT use the AppShell API — Next.js layouts and the
  5 locked shells in UI_CONTRACT §1.1 are authoritative

## Re-sync triggers

Re-sync the Claude Design repo connection whenever any of these change materially:

- `packages/ui/src/tokens.css`
- `packages/ui/src/tailwind.preset.ts`
- `packages/ui/src/index.ts` (component exports)
- Any new shell variant added under `apps/web/src/app/(*)/layout.tsx`

## Change log

| Date | Change |
|---|---|
| 2026-05-05 | Index seeded per ADR-0025. No prototypes yet — first use planned for Stage 22 (Day 22). |
