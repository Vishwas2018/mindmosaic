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
| _none yet — first use planned for Stage 22 (Day 22)_ | | | | | |

Append one row per prototype produced. PNG paths follow `docs/design/prototypes/stage-NN_<screen>.png`. Variants get suffixes (e.g. `stage-23_exam-engine_warn-state.png`).

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
