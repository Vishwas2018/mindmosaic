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
