# ADR-0022 — Engine implementations as pure-function namespaces

- Status: accepted
- Date: 2026-05-04
- Stage: 15
- Tags: backend | dx

## Context

Spec §3.1 declares the `AssessmentEngine` contract as a TypeScript `interface`
with seven methods (`initialise`, `getNextItem`, `recordResponse`, `score`,
`canNavigateBack`, `getTimeRemaining`, `terminate`). The interface notation
suggests an OO implementation (a class per engine), but the engine layer has
two hard requirements that a class-based approach makes harder than necessary:

1. **JSON-serialisable engine state.** Arch §5 persists engine state in
   `session_record.engine_state_snapshot jsonb`. A plain object lifecycle
   (`init → state, recordResponse(state, …) → state'`) is trivially
   serialisable; a class instance with private fields and prototype methods is
   not (without a hand-rolled `toJSON` / hydration layer per engine).
2. **Replay determinism (Q-15.7, Stage 20 dependency).** Replay tests require
   that calling the same method on the same state with the same inputs
   produces a deep-equal new state. Pure functions enforce this by
   construction. Class instances introduce hidden state coupling
   (`this.config`, `this.timer`, …) that historically becomes the source of
   replay drift.

Spec §22.7.1 explicitly states that **intelligence-layer computations are
pure functions with deterministic outputs** and "no database access in
computation functions — data is loaded beforehand and passed as arguments".
While this rule is written for the intelligence layer, the same testability
properties apply to engines, and adopting them now keeps the engine surface
homogeneous with the upcoming intelligence-svc (Stage 20).

## Options considered

1. **Class-based** — `class LinearEngine implements AssessmentEngine { … }`,
   instantiated per session. Pros: idiomatic OO, IDE-friendly, matches the
   `interface` spelling in the spec literally. Cons: instance state separate
   from `EngineState`, two sources of truth; needs `toJSON`/hydration to
   round-trip through `engine_state_snapshot`; `this`-binding rules complicate
   passing methods as callbacks; tests can't `state.toBeDeepEqual` across
   replays because instances differ even when state matches.
2. **Pure-function namespace** —
   `export const LinearEngine: AssessmentEngine = { initialise, getNextItem, … }`.
   Pros: `EngineState` is the only state; trivially serialisable; replay is
   `equal(run(input), run(input))`; stateless functions compose with the
   forthcoming SkillEngine and AdaptiveEngine the same way. Cons: a small
   stylistic divergence from the spec's `interface` notation (the type checker
   still enforces the contract, since the namespace literal is annotated
   `: AssessmentEngine`).
3. **Static methods on a class** — hybrid. Pros: namespace-like ergonomics with
   class syntax. Cons: combines downsides of both approaches; offers no real
   benefit over option 2.

## Decision

Use **Option 2 — pure-function namespaces.**

```ts
export const LinearEngine: AssessmentEngine = {
  initialise(session, config) { /* … */ },
  getNextItem(state)         { /* … */ },
  // …
};
```

Every engine in v1 (LinearEngine, SkillEngine, DiagnosticEngine,
AdaptiveEngine) follows this pattern. The `clock` parameter on
`getTimeRemaining` and `terminate` is injected per-call — never captured in
`EngineState`.

## Rationale

- `EngineState` is the **only** mutable surface, and it is plain JSON. The
  state JSON column round-trips via `JSON.parse(JSON.stringify(state))` with
  no information loss, and `EngineStateSchema.parse(...)` validates it.
- Replay determinism is structural: same inputs → deep-equal outputs, with no
  hidden coupling. The Stage 20 intelligence pipeline can replay an engine
  session by re-feeding the same `EngineState` + responses without
  reconstructing class instances.
- Aligns the engine layer with Spec §22.7.1's pure-function discipline for
  intelligence-layer computations — one architectural pattern, not two.
- The TypeScript contract is preserved: `LinearEngine: AssessmentEngine`
  forces compile-time conformance with all seven interface methods.
- BUILD_CONTRACT §1 calls out **"Engine–Framework separation"** —
  configuration injected, engines stateless. The pure-function form is
  literally that.

## Consequences

- **Positive:**
  - One source of truth per session (`EngineState` jsonb), no shadow class
    fields.
  - Replay is `expect(stateA).toEqual(stateB)` — no instance comparator
    plumbing.
  - Future engines compose without `this`-binding gymnastics (`AssessmentEngine`
    can be passed around as a value).
- **Negative:**
  - Stylistic divergence from the spec's `interface` notation. Mitigated by
    annotating the namespace literal with the interface type so the contract
    is still enforced.
  - No engine-private helpers via `this`; helpers are local non-exported
    functions inside the module (e.g., `applyScoringFormula`, `selectBand`
    inside `linear.ts`).

## Implementation notes

- Files: `packages/engines/src/contracts.ts`, `packages/engines/src/linear.ts`,
  `packages/engines/src/__tests__/linear.test.ts`.
- The interface adds an explicit `clock: () => number` parameter to
  `getTimeRemaining` and `terminate` (extending Spec §3.1's no-clock
  signature) — the only place an engine reads time, and only via injection.
- `EngineState` aliases `LinearEngineState` in Stage 15. Stage 17 widens this
  to a discriminated union (`LinearEngineState | AdaptiveEngineState | …`)
  keyed by `engine_type`.
- `scoreWithConfig` and `terminateWithConfig` are convenience wrappers that
  apply `FrameworkConfig.scoring_rules` to a base score; the bare interface
  methods stay config-free so `EngineState` alone is sufficient input.
- Commit: Stage 15 commit (single commit per BUILD_CONTRACT §11.1).

Related: ADR-0001 (engines-client deferral), DEV-20260430-1 (resolved by this
stage), Spec §3.1, §3.7, §22.7.1.
