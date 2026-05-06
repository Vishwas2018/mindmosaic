/**
 * intelligence-svc shared helpers.
 *
 * Stage 20: pure functions used by intelligence-svc handlers (and by tests).
 * Separated from handlers so contract tests can exercise the deterministic
 * primitives directly without spinning a full handler harness.
 *
 * Replay-determinism floor (Q-20.4 / ADR-0027):
 *   - no Math.random
 *   - no Date.now() as algorithm INPUT (timestamps are write-only metadata)
 *   - no Set/Map iteration-order assumptions in algorithm output
 *   - sorted-key serialisation for any hash input via canonicalize()
 *   - ORDER BY on every aggregate (skill_id ASC, response_id ASC) — enforced
 *     at the SQL boundary in handlers.ts; the helpers here use sortBySkillId.
 */

// ─── Algorithm version (Q-20.3) ─────────────────────────────────────────────
//
// Exported as a const so handlers + tests reference one source of truth.
// Bump rules (ADR-0027):
//   - major (vN.0.0): output-shape change (audit-log schema migration).
//   - minor (v1.N.0): formula change (e.g. weight tweak in mastery formula).
//   - patch (v1.0.N): bugfix (e.g. off-by-one in 14-day velocity window).

export const ALGORITHM_VERSION = 'intelligence-v1.0.0' as const;

// ─── Year-level defaults (Spec §9.6, Q-20.9) ────────────────────────────────
//
// Defaults blend formula:
//   data_points < 5             → pure default
//   5 ≤ data_points < 15        → (dp/15) * computed + (1 - dp/15) * default
//   data_points ≥ 15            → pure computed
//   computed_at older than 30d  → 50/50 with last computed (handler enforces)
//
// The behaviour_profile DB defaults from migration 0005 hard-code Y4–6
// values (avg_fatigue_onset_minutes=20, session_length_sweet_spot=20). For
// non-Y4–6 students the application code must override using the §9.6 map
// — that is what yearLevelDefaults() returns.

export interface BehaviourDefaults {
  avg_guess_rate: number;
  avg_fatigue_onset_minutes: number;
  persistence_score: number;
  avg_cognitive_load_comfort: number;
  time_pressure_sensitivity: number;
  session_length_sweet_spot: number;
}

const FATIGUE_ONSET_BY_YEAR: Record<string, number> = {
  Y1: 15, Y2: 15, Y3: 15,
  Y4: 20, Y5: 20, Y6: 20,
  Y7: 30, Y8: 30, Y9: 30,
  Y10: 40, Y11: 40, Y12: 40,
};

export function yearLevelDefaults(yearLevel: string | null): BehaviourDefaults {
  // Conservative fallback when year_level is missing: Y4–6 band (matches the
  // primary v1 audience — NAPLAN Y5 + ICAS Math C). Documented here so the
  // fallback isn't silent; callers needing strictness can pre-validate.
  const fatigueMinutes = (yearLevel !== null && FATIGUE_ONSET_BY_YEAR[yearLevel] !== undefined)
    ? FATIGUE_ONSET_BY_YEAR[yearLevel]!
    : 20;
  return {
    avg_guess_rate: 0.1,
    avg_fatigue_onset_minutes: fatigueMinutes,
    persistence_score: 0.5,
    avg_cognitive_load_comfort: 0.4,
    time_pressure_sensitivity: 0.3,
    session_length_sweet_spot: fatigueMinutes,
  };
}

/**
 * Spec §9.6 defaults blend.
 *
 * Pure function: deterministic given (computed, defaults, dataPoints).
 */
export function blendBehaviour(
  computed: BehaviourDefaults,
  defaults: BehaviourDefaults,
  dataPoints: number,
): BehaviourDefaults {
  if (dataPoints < 5) return defaults;
  if (dataPoints >= 15) return computed;
  const w = dataPoints / 15; // computed weight
  const d = 1 - w;
  return {
    avg_guess_rate: w * computed.avg_guess_rate + d * defaults.avg_guess_rate,
    avg_fatigue_onset_minutes: Math.round(
      w * computed.avg_fatigue_onset_minutes + d * defaults.avg_fatigue_onset_minutes,
    ),
    persistence_score: w * computed.persistence_score + d * defaults.persistence_score,
    avg_cognitive_load_comfort:
      w * computed.avg_cognitive_load_comfort + d * defaults.avg_cognitive_load_comfort,
    time_pressure_sensitivity:
      w * computed.time_pressure_sensitivity + d * defaults.time_pressure_sensitivity,
    session_length_sweet_spot: Math.round(
      w * computed.session_length_sweet_spot + d * defaults.session_length_sweet_spot,
    ),
  };
}

// ─── Deterministic ordering (Q-20.4) ────────────────────────────────────────

/**
 * Sort an array by skill_id ASC. Stable; pure; suitable for replay-determinism
 * inputs. Use anywhere intelligence-svc emits a per-skill aggregate.
 */
export function sortBySkillId<T extends { skill_id: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => (a.skill_id < b.skill_id ? -1 : a.skill_id > b.skill_id ? 1 : 0));
}

/**
 * Recursive sorted-key serialisation for hash inputs. Object keys sorted
 * lexicographically; arrays preserved in input order (callers must
 * pre-sort if order matters).
 *
 * Consumers SHOULD use this for any payload that feeds into:
 *   - intelligence_audit_log.input_snapshot
 *   - any hash computed across L1/L2/L3a outputs
 *   - replay-determinism integration assertions
 *
 * NOT a substitute for sortBySkillId on arrays — arrays here keep insertion
 * order (because some inputs DO depend on insertion order, e.g. response
 * sequence).
 */
export function canonicalize(value: unknown): string {
  return JSON.stringify(canonicalizeInner(value));
}

function canonicalizeInner(value: unknown): unknown {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(canonicalizeInner);
  const obj = value as Record<string, unknown>;
  const sortedKeys = Object.keys(obj).sort();
  const out: Record<string, unknown> = {};
  for (const k of sortedKeys) out[k] = canonicalizeInner(obj[k]);
  return out;
}

// ─── L3a depth-1 prereq walk (Q-20.10) ──────────────────────────────────────
//
// Spec §10.2 describes a recursive find_root_causes up to depth=5; that is
// the FULL traversal Stage 28's `traverse_upstream` will implement. Stage 20
// is bounded to depth-1 ONLY (per Spec §7.2 sync portion contract). This
// helper does the bounded walk and returns the union (touched ∪ depth-1
// prereqs), sorted by skill_id ASC for deterministic downstream processing.
//
// adjacency: skill_id → array of prerequisite skill_ids (incoming edges).
// Caller passes the structure already loaded by `_shared/skill-graph-cache.ts`.

export function walkPrereqsDepth1(
  touchedSkillIds: readonly string[],
  adjacency: Map<string, string[]> | ReadonlyMap<string, string[]>,
): string[] {
  const out = new Set<string>();
  for (const id of touchedSkillIds) out.add(id);
  for (const id of touchedSkillIds) {
    const prereqs = adjacency.get(id);
    if (prereqs === undefined) continue;
    for (const p of prereqs) out.add(p);
  }
  // Sorted output — see Q-20.4 floor. Set iteration order is insertion order
  // in V8/Deno but we don't rely on that.
  return [...out].sort();
}

// ─── §8.1 mastery helpers ───────────────────────────────────────────────────
//
// Recency-weighted accuracy over last N attempts (default 10). Older attempts
// get smaller weights via a simple linear taper. Pure function.

export interface AttemptForMastery {
  is_correct: boolean | null;
  difficulty: number;
  /** Unique within-session identifier; used only for stable ordering. */
  response_id: string;
}

export function recencyWeightedAccuracy(attempts: AttemptForMastery[], window = 10): number {
  if (attempts.length === 0) return 0;
  // Take the last `window` attempts in INPUT order — caller sorts.
  const slice = attempts.slice(-window);
  let weightSum = 0;
  let weightedCorrect = 0;
  for (let i = 0; i < slice.length; i++) {
    // Weight: 1.0 for newest, ramping down to 1/window for oldest.
    const w = (i + 1) / slice.length;
    const correct = slice[i]!.is_correct === true ? 1 : 0;
    weightSum += w;
    weightedCorrect += w * correct;
  }
  return weightSum === 0 ? 0 : weightedCorrect / weightSum;
}

/**
 * §8.1 mastery formula (MVP):
 *   mastery = 0.5 * recent_accuracy + 0.3 * difficulty_adjusted + 0.2 * consistency - behaviour_penalty
 *
 * Weights are MVP-locked; tuning is a v1.1 concern. behaviour_penalty in
 * range [0, 0.2]; clamped at output to [0, 1].
 */
export function masteryFormula(input: {
  recent_accuracy: number;       // 0..1
  difficulty_adjusted: number;   // 0..1
  consistency: number;           // 0..1
  behaviour_penalty: number;     // 0..0.2
}): number {
  const raw =
    0.5 * input.recent_accuracy +
    0.3 * input.difficulty_adjusted +
    0.2 * input.consistency -
    input.behaviour_penalty;
  return Math.max(0, Math.min(1, raw));
}

// ─── §9.2 guess_probability ─────────────────────────────────────────────────
//
// Per-response guess detection. Inputs are the response itself + the item's
// expected_time_per_item_ms (from FrameworkConfig §9.5).
//
// Pure: no time-of-day, no Math.random.

export function guessProbability(input: {
  time_to_answer_ms: number;
  expected_time_ms: number;
  is_correct: boolean | null;
  answer_changes: number;
}): number {
  const fast = Math.max(0, 1 - input.time_to_answer_ms / Math.max(1, input.expected_time_ms * 0.25));
  // sigmoid_low: very fast → high. Cap at 1.
  const time_factor = Math.min(1, fast);
  const accuracy_factor = input.is_correct === true ? 0.2 : 0.6;
  const change_factor = (input.answer_changes === 0 && time_factor > 0.7) ? 0.8 : 0.3;
  // Equal-weighted average. Pattern factor (sequence-level) is computed by
  // the caller and folded in separately if needed.
  const score = (time_factor + accuracy_factor + change_factor) / 3;
  return Math.max(0, Math.min(1, score));
}

// ─── §9.3 fatigue_score (per-session) ───────────────────────────────────────

export function fatigueScore(input: {
  baseline_accuracy: number;     // first 5 items
  recent_accuracy: number;       // last 5 items
  time_since_start_ms: number;
  fatigue_threshold_ms: number;  // year-level adjusted (§9.3)
  avg_time_recent_ms: number;
  avg_time_early_ms: number;
}): number {
  const accuracy_drop = Math.max(0, input.baseline_accuracy - input.recent_accuracy);
  const time_factor = Math.min(1, input.time_since_start_ms / Math.max(1, input.fatigue_threshold_ms));
  // speed_change > 1.5 means slowing; < 0.5 means rushing. Normalise into [0,1]
  // where deviation from 1.0 in either direction adds to fatigue.
  const ratio = input.avg_time_recent_ms / Math.max(1, input.avg_time_early_ms);
  const speed_factor = Math.min(1, Math.abs(ratio - 1));
  const score = 0.4 * accuracy_drop + 0.3 * time_factor + 0.3 * speed_factor;
  return Math.max(0, Math.min(1, score));
}

// ─── §9.5 cognitive_load (per-session window) ───────────────────────────────

export function cognitiveLoad(input: {
  consecutive_incorrect_runs_3plus: number;
  total_items_in_window: number;
  avg_time_to_answer_ms: number;
  expected_time_ms: number;
  avg_answer_changes: number;
}): number {
  const error_burst =
    input.total_items_in_window === 0
      ? 0
      : input.consecutive_incorrect_runs_3plus / input.total_items_in_window;
  const time_inflation = input.avg_time_to_answer_ms / Math.max(1, input.expected_time_ms);
  const time_term = Math.min(1, time_inflation / 3);
  const change_term = Math.min(1, input.avg_answer_changes / 3);
  const load = 0.4 * error_burst + 0.35 * time_term + 0.25 * change_term;
  return Math.max(0, Math.min(1, load));
}
