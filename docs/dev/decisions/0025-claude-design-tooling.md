# ADR-0025 — Adopt Claude Design as the prototype tool from Stage 22 onward

- Status: accepted
- Date: 2026-05-05
- Stage: 18 (decision; first use Stage 22)
- Tags: dx | frontend

## Context

`UI_CONTRACT.md §1.1` already establishes that the 17 HTML mockups in `docs/mockups/` are visual reference only — never implementation source. Phase 0 used those mockups successfully through Stage 14 (auth + shell). From Stage 22 onward, the v1 frontend stages target a higher production bar (exam engine a11y gate at Stage 23, mode-aware results at Stage 24, three role dashboards in Stages 25/36/37). The static HTML mockups were authored before brand finalization (`#5D3FD3 / #ef6843`) and before the locked component inventory in `UI_CONTRACT §3` — meaning they need re-interpretation per screen, which adds ambiguity.

Anthropic released Claude Design (`claude.ai/design`, Research Preview) which can render high-fidelity React/HTML prototypes and auto-derive a design system by reading a connected GitHub repository. Pointing it at MindMosaic's `apps/web` + `packages/ui` subdirectories produces prototypes that are correctly themed (against `tokens.css` + `tailwind.preset.ts`), faster to iterate, and easier to use as visual references during Stage 22+ implementation. Anthropic's docs explicitly recommend connecting subdirectories rather than full monorepos; the Claude Design → Claude Code handoff is supported as a built-in bundle export.

This ADR adopts Claude Design as the prototype tool from Stage 22 onward. It does not modify code, it does not change `UI_CONTRACT`, it does not retroactively replace the 17 HTML mockups for Phase 0 work.

## Options considered

1. **Status quo — continue with HTML mockups only.** Pros: zero tooling change, no Research Preview risk. Cons: per-screen re-interpretation cost; no fast iteration on the variants required by `UI_CONTRACT §5.1` (exam engine timer warn/danger/offline) or `§5.2` (results 3 modes).
2. **Adopt Claude Design from Stage 22, auto-derive design system via repo connection.** Pros: themed prototypes against the actual `packages/ui` source of truth (no manual token transcription); covers state matrix variants per `UI_CONTRACT §6` cleanly; built-in Claude Code handoff bundle; reduces visual ambiguity at implementation time without touching the contract authority. Cons: Research Preview (feature drift risk); requires a per-stage workflow addition; consumes ~30–60 min per UI stage on prototype authoring.
3. **Replace HTML mockups entirely with Claude Design.** Pros: single source. Cons: invalidates `UI_CONTRACT §1.1` mapping table mid-build; risks Phase 0 Stage 14 mid-flight rework; no benefit to already-completed auth screens.

## Decision

Use **Option 2**. Set up the design system in Claude Design via repo connection (`apps/web` + `packages/ui` subdirectories only — not the full monorepo, per Anthropic's monorepo guidance).

## Rationale

- Phase 0 (Stages 1–14) is closed; option 3 would force re-validation of completed auth/shell work for no functional gain.
- Stages 15–21 are entirely backend (Stage 18 closed 2026-05-05 per `DAILY_LOG.md`); the first UI stage that benefits is Stage 22. Lead time exists between this decision and first use.
- The `UI_CONTRACT.md §1.1` "visual reference only" rule already covers prototype consumption — the implementation pipeline (Claude Code C-C-D-V from `CLAUDE_PROMPTS.md`) does not change.
- Auto-deriving the design system from `packages/ui` removes the largest manual error surface (token transcription drift). The `tokens.css` + `tailwind.preset.ts` files are already the source of truth; Claude Design reads them directly.
- Research Preview risk is isolated: prototypes are exported as PNGs / handoff bundles and committed to `docs/design/prototypes/`, so even if `claude.ai/design` changes, prior prototypes remain intact.
- Buffer cost is real but manageable: prototype each stage 2–4 days **ahead** of implementation, in parallel with the prior stage's backend work. Phase 1 buffer is 9/9 days as of Stage 18 close.

## Consequences

- **Positive:** Reduced visual ambiguity at implementation time; cleaner per-state coverage (Loading / Empty / Error / 402 / Content); easier review of variants on critical-path screens (Stage 23 exam engine).
- **Positive:** Auto-derive eliminates manual token transcription. `tokens.css` remains the single source of truth.
- **Positive:** Built-in Claude Design → Claude Code handoff bundle reduces re-translation effort.
- **Negative:** Adds one tool to the workflow; documentation surface area grows by `CLAUDE_DESIGN_PROMPTS.md`.
- **Negative:** Research Preview status — feature changes by Anthropic may require re-verification of the design-system setup. Mitigated by `CLAUDE_DESIGN_PROMPTS.md §1.3` checklist.
- **Negative:** Token cost on subscription if prototypes are large; monitor first two prototypes and scope frame counts tightly if usage spikes.
- **Negative:** Prototype-to-code is still re-translation; this ADR does not reduce implementation effort, only visual ambiguity.
- **Follow-ups:**
  - Connect mindmosaic repo to Claude Design (Day 19 evening or earliest available evening). Scope: `apps/web` + `packages/ui`. Branch: `main`.
  - Verify `CLAUDE_DESIGN_PROMPTS.md §1.3` 15-item checklist against auto-derived system. Refine via chat for any miss.
  - First prototype use: Stage 22 (Session Selection), targeted Day 22.
  - Re-sync repo connection whenever `tokens.css`, `tailwind.preset.ts`, or `packages/ui/src/` change materially.

## Implementation notes

- Setup is via Claude Design's repo connection, **not** manual prompt authoring. The manual setup prompt in `CLAUDE_DESIGN_PROMPTS.md §1.2` is retained as a fallback for cases where auto-derive misses a token or rule.
- Connect `apps/web` and `packages/ui` subdirectories only — not the full monorepo (Anthropic recommends subdirectory scoping for large repos; MindMosaic is a Turborepo with 6 packages + apps + supabase).
- First prototype: Stage 22 (Session Selection), Day 22.
- Handoff: Claude Design's built-in Claude Code bundle export. Bundle is consumed as a visual reference per `UI_CONTRACT.md §1.1`; implementation still uses `packages/ui` primitives. Bundle is committed to `docs/design/prototypes/` alongside frame PNGs.
- Files added: `CLAUDE_DESIGN_PROMPTS.md` (root); `docs/design/prototypes/INDEX.md` (seed); this ADR.
- Files patched: `README.md` (doc table); `CLAUDE.md` (Locked sources of truth list).
- Commit: `docs(design): adopt Claude Design via repo connection (ADR-0025)`.
- Related: `UI_CONTRACT.md §1.1` (mockup usage rules — extended by analogy to prototypes); `CLAUDE_PROMPTS.md` (C-C-D-V template — gains a Visual references paragraph in stages with prototypes per `CLAUDE_DESIGN_PROMPTS.md §6.2`).
- No code change, no schema change, no migration, no contract amendment.
