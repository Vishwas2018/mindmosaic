/**
 * Engine contracts — Spec §3.1 verbatim signatures + supporting types.
 *
 * Implementation discipline (per ADR-0022):
 * - Engines are pure-function namespaces, not classes.
 * - EngineState is fully JSON-serialisable: no Map/Set/Date/functions, only
 *   primitives + plain objects. The state lands in
 *   `session_record.engine_state_snapshot jsonb` (arch §5).
 * - Clocks are injected per-call (`getTimeRemaining`, `terminate`) — never
 *   captured in EngineState. This is the replay-determinism contract.
 * - No `Math.random`, no `Date.now` inside engine bodies.
 *
 * Spec refs: §3.1 (interface), §3.2.2 (LinearEngine), §3.7 (deterministic
 * scoring), §22.7.1 (testability via mock FrameworkConfig + Session).
 */
import { z } from 'zod';
import {
  ItemIdSchema,
  SessionIdSchema,
  SkillIdSchema,
  SessionModeSchema,
  type ItemId,
  type SessionId,
  type SessionMode,
  type SkillId,
} from '@mm/types';
import { ItemDTOSchema, type ItemDTO } from '@mm/types';

// ─── Engine type discriminator ───────────────────────────────────────────────
// Mirrors DB enum `engine_type` from supabase/migrations/0001_enums_tenancy_auth.sql:62.

export const EngineTypeSchema = z.enum(['adaptive', 'linear', 'skill', 'diagnostic', 'repair']);
export type EngineType = z.infer<typeof EngineTypeSchema>;

// ─── Termination ─────────────────────────────────────────────────────────────

export const TerminationReasonSchema = z.enum([
  'completed',
  'timer_expired',
  'user_submitted',
  'abandoned',
]);
export type TerminationReason = z.infer<typeof TerminationReasonSchema>;

export const TerminationSignalSchema = z.object({
  termination: z.literal(true),
  reason: TerminationReasonSchema,
});
export type TerminationSignal = z.infer<typeof TerminationSignalSchema>;

export function isTerminationSignal(
  value: ItemDTO | TerminationSignal,
): value is TerminationSignal {
  return (value as TerminationSignal).termination === true;
}

// ─── Session context (engine-only subset of session_record) ──────────────────
// Q-15.4: derived view, never the full DB row. Tenancy/audit columns stay out.

export const SessionContextSchema = z.object({
  session_id: SessionIdSchema,
  mode: SessionModeSchema,
  engine_type: EngineTypeSchema,
  total_items: z.number().int().nullable(),
  time_limit_ms: z.number().int().positive().nullable(),
  started_at: z.string().datetime(),
  // planned_items aligns with arch §5 fix H3: items are pre-selected and
  // frozen into engine_state_snapshot.planned_items.
  planned_items: z.array(ItemDTOSchema),
});
export type SessionContext = z.infer<typeof SessionContextSchema>;

// ─── FrameworkConfig (engine-only subset) ────────────────────────────────────
// Q-15.3: engine-only fields. The full DB row stays in @mm/types if/when needed.
//
// scoring_rules is intentionally narrow for v1:
//   - 'identity'    → scaled = raw                      (e.g. ICAS Math: count correct)
//   - 'percentage'  → scaled = round(raw / total * 100)  (default v1 mapping)
// Bands map a scaled score range to a human label; first matching band wins.

export const ScoringRulesSchema = z.object({
  scaled_score_formula: z.enum(['identity', 'percentage']),
  bands: z
    .array(
      z.object({
        min: z.number(),
        max: z.number(),
        label: z.string(),
      }),
    )
    .min(1),
});
export type ScoringRules = z.infer<typeof ScoringRulesSchema>;

export const FrameworkConfigSchema = z.object({
  engine_type: EngineTypeSchema,
  scoring_rules: ScoringRulesSchema,
  // Session-level timer override (null = inherit SessionContext.time_limit_ms).
  time_limit_ms: z.number().int().positive().nullable(),
  // Whether the engine permits back-navigation. ICAS = true, NAPLAN = false.
  back_navigation_enabled: z.boolean(),
  // Whether the engine permits flag-for-review on items.
  flag_for_review_enabled: z.boolean(),
});
export type FrameworkConfig = z.infer<typeof FrameworkConfigSchema>;

// ─── Engine response (input to recordResponse) ───────────────────────────────
// is_correct is supplied by the caller (assessment-svc grades against the item's
// correct answer). The engine treats response_data as opaque — only is_correct
// drives scoring decisions.

export const EngineResponseSchema = z.object({
  item_id: ItemIdSchema,
  is_correct: z.boolean(),
  response_data: z.record(z.string(), z.unknown()),
  answered_at: z.string().datetime(),
});
export type EngineResponse = z.infer<typeof EngineResponseSchema>;

// ─── EngineState ─────────────────────────────────────────────────────────────
// Stage 15 ships the LinearEngine state shape. Stage 17 widens this into a
// discriminated union (`linear` | `adaptive` | …) keyed by engine_type.
// JSON-serialisable: pure primitives + arrays + plain objects.

export const LinearEngineStateSchema = z.object({
  engine_type: z.literal('linear'),
  session_id: SessionIdSchema,
  mode: SessionModeSchema,
  // Frozen-at-init view of the planned sequence. Same indices as
  // SessionContext.planned_items.
  planned_items: z.array(ItemDTOSchema),
  // Item index of the next item to deliver. Zero-based. Equals planned_items.length
  // when the session has reached the end.
  current_index: z.number().int().nonnegative(),
  // Recorded responses, in answer order (not necessarily sequence order under
  // back-nav). For back-nav re-answers, an existing entry is replaced in place.
  responses: z.array(EngineResponseSchema),
  // ItemIds the user has flagged for review. Order-insensitive; deduplicated.
  flagged_item_ids: z.array(ItemIdSchema),
  // Snapshot of session timing — copied from SessionContext at init.
  started_at: z.string().datetime(),
  time_limit_ms: z.number().int().positive().nullable(),
  // Total expected items (== planned_items.length), captured for fast reads.
  total_items: z.number().int().nonnegative(),
});
export type LinearEngineState = z.infer<typeof LinearEngineStateSchema>;

// In Stage 15 EngineState aliases LinearEngineState. Stage 17 widens this to
// a discriminated union: `LinearEngineState | AdaptiveEngineState | …`.
export const EngineStateSchema = LinearEngineStateSchema;
export type EngineState = z.infer<typeof EngineStateSchema>;

// ─── ScoreResult & FinalResult ───────────────────────────────────────────────
// Q-15.6: engine emits a superset of SubmitSessionResponse.score; assessment-svc
// projects to the API DTO. duration_ms is wall-clock; active_duration_ms is the
// session service's job (it knows about pause/resume) and is not emitted here.

export const ScoreResultSchema = z.object({
  raw: z.number(),
  scaled: z.number(),
  band: z.string().nullable(),
  items_correct: z.number().int().nonnegative(),
  items_answered: z.number().int().nonnegative(),
  duration_ms: z.number().int().nonnegative(),
  skills_touched: z.array(SkillIdSchema),
});
export type ScoreResult = z.infer<typeof ScoreResultSchema>;

export const FinalResultSchema = z.object({
  state: EngineStateSchema,
  score: ScoreResultSchema,
  reason: TerminationReasonSchema,
  terminated_at: z.string().datetime(),
});
export type FinalResult = z.infer<typeof FinalResultSchema>;

// ─── AssessmentEngine interface (Spec §3.1) ──────────────────────────────────
// Two methods extend the spec signature with an explicit `clock` parameter:
//   - getTimeRemaining(state, clock)
//   - terminate(state, reason, clock)
// Spec uses a no-clock signature; we inject for replay determinism per the
// approved Stage 15 plan (Q-15.7). EngineState NEVER stores `clock`.

export interface AssessmentEngine {
  initialise(session: SessionContext, config: FrameworkConfig): EngineState;
  getNextItem(state: EngineState): ItemDTO | TerminationSignal;
  recordResponse(state: EngineState, response: EngineResponse): EngineState;
  score(state: EngineState): ScoreResult;
  canNavigateBack(state: EngineState): boolean;
  getTimeRemaining(state: EngineState, clock: () => number): number | null;
  terminate(
    state: EngineState,
    reason: TerminationReason,
    clock: () => number,
  ): FinalResult;
}

// Re-exports for convenience. Branded ID types feed downstream packages.
export type { ItemDTO, ItemId, SessionId, SessionMode, SkillId };
