# ADR-0024 — AdaptiveEngine testlet routing model + seed correction

- Status: accepted
- Date: 2026-05-05
- Stage: 17
- Tags: backend | data | dx

## Context

Spec §3.2.1 + §4.1 specify NAPLAN's AdaptiveEngine as **testlet-based routing**:
the session is divided into discrete stages; after each stage's testlet is
exhausted, a routing table keyed by `(stage_id, score)` selects the next
testlet. DEV_PLAN.md Stage 17 deliverables explicitly call out "testlet
routing per `framework_config.adaptive_rules`" with "Routing table JSON
structure must match seed exactly" as the medium-risk note.

The §2A pre-implementation review (Stage 17 morning ritual) discovered a
load-bearing mismatch: the NAPLAN row in `supabase/seeds/03_assessment_config.sql`
encoded `adaptive_rules` as **IRT/CAT configuration** (Item Response Theory):

```json
{ "theta_init": 0.0, "step_size": 0.3, "termination": {"se_threshold":0.3,"max_items":30}, "item_selection": "max_info" }
```

That JSON describes a continuous-θ adaptive test — a different model from the
testlet routing the spec calls for. There was no `testlet` table, no
`testlet_id`/`stage_id` column on `item`, and no migration to model
testlets at all. The seed was a placeholder from early schema work; building
AdaptiveEngine to consume it as-is would have meant writing an IRT engine
that contradicts spec §3.2.1.

The §2A review surfaced this as **Q-17.1** (blocking) with four candidate
resolutions:

- **(A)** rewrite the seed `adaptive_rules` JSON to a testlet routing table;
  add minimal testlet metadata if needed (column or in-config map);
- **(B)** rewrite spec §3.2.1 to be IRT/CAT-based and build an IRT engine;
- **(C)** dual-shape engine that detects which model the JSON encodes;
- **(D)** something else.

## Options considered

1. **(A) Testlet routing table in `adaptive_rules` JSON; testlet membership
   via the same JSON's `testlets` map; optional `EngineItem.testlet_id` /
   `stage_id` for engine-side resolution.** No new migration. Pros: matches
   spec verbatim; matches publicly documented NAPLAN structure (3 stages
   per domain, routed paths between testlets); contained edit (one seed row
   + engine code). Cons: `testlet` is implicitly modelled in JSON rather than
   relational schema — harder to query in SQL. Acceptable for v1.
2. **(B) IRT/CAT engine.** Pros: matches the existing seed; theoretically
   richer adaptive model. Cons: spec §3.2.1 + §4.1 explicitly describe
   testlet routing, not CAT — accepting (B) means rewriting two spec sections
   and shipping an algorithm whose IRT parameter calibration depends on data
   we don't have in v1 (`item.discrimination` is mostly null in seed).
   Estimated cost: +2 days minimum; spec divergence ripples into Stage 19+.
3. **(C) Dual-shape engine.** Pros: defers the decision. Cons: doubles
   surface area, doubles tests, and there's no real ambiguity here —
   the spec is clear; the seed was wrong.
4. **(D) Add a `testlet` table via migration 0012; reference by id from
   items.** Pros: relational; queryable. Cons: schema cost without runtime
   benefit in v1 (no testlet authoring UI, no per-testlet analytics).
   Defer to v1.1 if real NAPLAN content arrives that justifies the cost.

## Decision

Use **Option (A)**.

Concrete shape (`framework_config.adaptive_rules` jsonb):

```json
{
  "stages": ["s1", "s2", "s3"],
  "start_testlet_id": "t1",
  "routing_table": [
    { "stage_id": "s1", "score_min": 0, "score_max": 2, "next_testlet_id": "t2_easy" },
    { "stage_id": "s1", "score_min": 3, "score_max": 3, "next_testlet_id": "t2_medium" },
    { "stage_id": "s1", "score_min": 4, "score_max": 5, "next_testlet_id": "t2_hard" },
    { "stage_id": "s2", "score_min": 0, "score_max": 2, "next_testlet_id": "t3_easy" },
    { "stage_id": "s2", "score_min": 3, "score_max": 3, "next_testlet_id": "t3_medium" },
    { "stage_id": "s2", "score_min": 4, "score_max": 5, "next_testlet_id": "t3_hard" }
  ],
  "testlets": {
    "t1":         { "stage_id": "s1", "time_limit_ms": 900000, "item_ids": [...5 ids] },
    "t2_easy":    { "stage_id": "s2", "time_limit_ms": 900000, "item_ids": [...5 ids] },
    "t2_medium":  { "stage_id": "s2", "time_limit_ms": 900000, "item_ids": [...5 ids] },
    "t2_hard":    { "stage_id": "s2", "time_limit_ms": 900000, "item_ids": [...5 ids] },
    "t3_easy":    { "stage_id": "s3", "time_limit_ms": 600000, "item_ids": [...5 ids] },
    "t3_medium":  { "stage_id": "s3", "time_limit_ms": 600000, "item_ids": [...5 ids] },
    "t3_hard":    { "stage_id": "s3", "time_limit_ms": 600000, "item_ids": [...5 ids] }
  }
}
```

Testlet membership is encoded in two ways for engine convenience (the engine
reads either):
- **Authoritative**: `adaptive_rules.testlets[testlet_id].item_ids[]`.
- **Optional hint**: `EngineItem.testlet_id?` + `EngineItem.stage_id?` (set
  on items returned by `getNextItem` so consumers can filter / display).

`EngineItem.is_writing_item?: boolean` is added for the writing-stage
extended-response items (no auto-marking; `EngineResponse.is_correct` is
nullable for these — see Q-17.5).

No new migration in Stage 17. If a real `testlet` table is ever needed
(e.g., for content-authoring UI or per-testlet analytics), it lands as
a v1.1 migration that re-uses these JSON-encoded rules as the source of truth.

## Rationale

- **Spec fidelity.** Stage 17 ships an engine that does what §3.2.1 says.
  No reinterpretation of the spec.
- **Smallest correct edit.** One seed row updated; one `EngineState` branch
  added; no schema migration; the engine is the only consumer that needs to
  know the routing-table shape.
- **NAPLAN realism.** Public NAPLAN documentation describes 3-stage testlet
  routing for NAPLAN Online. Our model matches that structure.
- **IRT deferral is reversible.** v1.1 (or any future framework) can ship
  an IRT engine as a separate `engine_type` (per Spec §3.3 extensibility) —
  it doesn't replace AdaptiveEngine, it complements it.
- **Engine purity preserved (ADR-0022).** AdaptiveEngine remains a pure-
  function namespace; routing is deterministic given `(adaptive_rules,
  responses)`.
- **State union grows cleanly (ADR-0023).** `AdaptiveEngineState` slots into
  the existing discriminated union as the fourth branch with no other
  changes; v1.1's `RepairEngineState` adds the fifth.

## Consequences

- **Positive:**
  - Stage 17 ships matching the spec, with no spec rewrite needed.
  - The seed is now authoritative for AdaptiveEngine session-init: pool +
    rules in one place.
  - Routing logic is a 7-line lookup; ambiguity throws (Q-17.9), which the
    test fixture covers.
  - Future spec/seed mismatches in this area trigger Zod validation at
    parse time (the engine `AdaptiveRulesSchema` is the contract).
- **Negative:**
  - Testlet authoring is ad-hoc: edit the seed JSON. Acceptable in v1 (one
    pathway, one routing table, no authoring UI). Becomes painful at scale —
    flag for v1.1 review.
  - Items in the testlet JSON reference item ids by string; no FK
    enforcement at the DB layer. The engine validates at session-init
    (`resolveTestletItems` throws on missing items).
  - The IRT seed config is now gone; if any other code referenced
    `theta_init` / `step_size` / `max_info` keys, those references break.
    None found at the time of this ADR.

## Implementation notes

- Files touched:
  - `supabase/seeds/03_assessment_config.sql` — NAPLAN row's `adaptive_rules`
    rewritten to testlet routing JSON; `scoring_rules` updated to
    `{model: 'adaptive_path', path_multipliers: ...}` placeholder shape
    (full NAPLAN scaled-score is Stage 19 work).
  - `packages/engines/src/contracts.ts` — `AdaptiveRules`,
    `RoutingTableEntry`, `TestletDefinition`, `AdaptiveEngineState`,
    `AdaptiveStageState`, `RoutingHistoryEntry` schemas; widened
    `EngineStateSchema` to 4 arms; added optional fields to `EngineItem`
    (`testlet_id`, `stage_id`, `is_writing_item`); made `EngineResponse.is_correct`
    nullable; added `assertAdaptiveState`.
  - `packages/engines/src/adaptive.ts` — `AdaptiveEngine` namespace +
    `scoreAdaptiveWithConfig` / `terminateAdaptiveWithConfig` helpers + public
    `computeStageScore` / `lookupRoute` for unit testing.
  - `packages/engines/src/index.ts` — added `export * from './adaptive.js'`.
  - `packages/engines/src/__tests__/_fixtures.ts` — `buildAdaptiveRules`,
    `buildAdaptiveItemPool`, `buildAdaptiveSession`, `buildAdaptiveConfig`,
    `buildTestletItems`, `buildWritingItem`. `buildResponse` accepts
    `isCorrect: boolean | null`.
  - `packages/engines/src/__tests__/adaptive.test.ts` — golden 3-stage
    session (DEV_PLAN exit criterion), routing-honoured (low/high), ambiguous
    routing (Q-17.9), missing route, navigation (Q-17.6), per-stage timer,
    writing-stage (Q-17.5), termination, replay determinism, edges.
- Q-17.2 default applied: `EngineItem.testlet_id` is OPTIONAL — the engine
  derives membership from `adaptive_rules.testlets[].item_ids[]` and uses
  the `testlet_id` field only as a hint when present.
- Q-17.4 default applied: stage-timer expiry reuses the existing
  `timer_expired` `TerminationReason` — no new value.
- Q-17.5 default applied: `EngineResponse.is_correct` widened to
  `boolean | null`. LinearEngine / SkillEngine / DiagnosticEngine treat null
  as falsy for scoring (the v1 acceptable approximation); AdaptiveEngine
  excludes null from `computeStageScore`.
- The seed's `scoring_rules.path_multipliers` is decorative — engine doesn't
  read it. Stage 19 (assessment-svc) will plug the full NAPLAN scaled-score
  mapping.

Related: ADR-0022 (pure-function namespaces), ADR-0023 (state union +
EngineItem). Spec §3.2.1, §3.2.2, §3.6.5 (`ItemDTO`), §4.1, §4.2.

Commit: Stage 17 commit (single per BUILD_CONTRACT §11.1).
