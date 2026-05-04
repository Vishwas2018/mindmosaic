/**
 * LinearEngine — Spec §3.2.2.
 *
 * Used by ICAS, Selective Entry, and any framework that delivers a fixed
 * sequence of items in a single pass.
 *
 * Pure-function namespace per ADR-0022. Every method is a side-effect-free
 * function; the engine never reads `Date.now()`, `Math.random`, or any global.
 * Time is sourced via the `clock` parameter on `getTimeRemaining` and
 * `terminate` only.
 *
 * Behaviour summary:
 *   - All planned_items are delivered in order (back-nav permitted).
 *   - Items may be flagged for review without affecting order or scoring.
 *   - Timer is session-level (single countdown).
 *   - Raw score = count of correct responses across all unique answered items.
 *   - Scaled score and band are computed via FrameworkConfig.scoring_rules.
 *
 * Idempotency: recordResponse for an item that already has a recorded response
 * REPLACES the existing entry in place (back-nav re-answer). It does not
 * append a duplicate or advance the index past the answered item.
 */
import type {
  AssessmentEngine,
  EngineResponse,
  EngineState,
  FinalResult,
  FrameworkConfig,
  ItemDTO,
  LinearEngineState,
  ScoreResult,
  ScoringRules,
  SessionContext,
  SkillId,
  TerminationReason,
  TerminationSignal,
} from './contracts.js';

// ─── Helpers (private) ───────────────────────────────────────────────────────

function selectScoringRules(config: FrameworkConfig): ScoringRules {
  // FrameworkConfig.scoring_rules is required; this lookup is here so future
  // engines can subclass via parameter rather than re-implement.
  return config.scoring_rules;
}

function applyScoringFormula(
  rules: ScoringRules,
  rawCorrect: number,
  totalItems: number,
): number {
  if (rules.scaled_score_formula === 'identity') {
    return rawCorrect;
  }
  // 'percentage'. Total of 0 yields 0 (avoid div-by-zero); else round to int.
  if (totalItems === 0) return 0;
  return Math.round((rawCorrect / totalItems) * 100);
}

function selectBand(rules: ScoringRules, scaled: number): string | null {
  // First matching band wins. Bands are inclusive on both ends — content
  // authors are responsible for non-overlapping ranges.
  for (const band of rules.bands) {
    if (scaled >= band.min && scaled <= band.max) return band.label;
  }
  return null;
}

function durationMs(state: EngineState, clock: () => number): number {
  const startedMs = Date.parse(state.started_at);
  const elapsed = clock() - startedMs;
  return elapsed > 0 ? elapsed : 0;
}

function uniqueSkillsTouched(state: EngineState): SkillId[] {
  // Engines do not currently know skill→item mapping; that comes from
  // content-svc (Stage 18). Until then, this is empty. A later refactor
  // injects the mapping via SessionContext.planned_items[].skill_ids
  // when ItemDTO grows that field. Returning [] keeps the contract truthful.
  void state;
  return [];
}

// ─── LinearEngine ────────────────────────────────────────────────────────────

export const LinearEngine: AssessmentEngine = {
  initialise(session: SessionContext, config: FrameworkConfig): EngineState {
    if (config.engine_type !== 'linear') {
      throw new Error(
        `LinearEngine.initialise: expected engine_type='linear', got '${config.engine_type}'`,
      );
    }
    if (session.engine_type !== 'linear') {
      throw new Error(
        `LinearEngine.initialise: SessionContext.engine_type must be 'linear', got '${session.engine_type}'`,
      );
    }
    // FrameworkConfig.time_limit_ms takes precedence over SessionContext.time_limit_ms
    // when both present, mirroring "config wins" of BUILD_CONTRACT §1.
    const timeLimitMs =
      config.time_limit_ms !== null ? config.time_limit_ms : session.time_limit_ms;

    const state: LinearEngineState = {
      engine_type: 'linear',
      session_id: session.session_id,
      mode: session.mode,
      planned_items: session.planned_items,
      current_index: 0,
      responses: [],
      flagged_item_ids: [],
      started_at: session.started_at,
      time_limit_ms: timeLimitMs,
      total_items: session.planned_items.length,
    };
    return state;
  },

  getNextItem(state: EngineState): ItemDTO | TerminationSignal {
    if (state.current_index >= state.planned_items.length) {
      return { termination: true, reason: 'completed' };
    }
    const next = state.planned_items[state.current_index];
    if (next === undefined) {
      // Unreachable given the guard above, but keeps the type checker happy
      // under noUncheckedIndexedAccess.
      return { termination: true, reason: 'completed' };
    }
    return next;
  },

  recordResponse(state: EngineState, response: EngineResponse): EngineState {
    const existingIndex = state.responses.findIndex(r => r.item_id === response.item_id);
    let newResponses: EngineResponse[];
    let newCurrentIndex: number;

    if (existingIndex >= 0) {
      // Back-nav re-answer: replace in place, leave current_index where it was.
      newResponses = state.responses.map((r, i) => (i === existingIndex ? response : r));
      newCurrentIndex = state.current_index;
    } else {
      // First answer to this item — append and advance the cursor by one if
      // the responding item is the current one (the normal forward-progress path).
      const itemIndex = state.planned_items.findIndex(it => it.item_id === response.item_id);
      if (itemIndex < 0) {
        throw new Error(
          `LinearEngine.recordResponse: response.item_id is not in planned_items`,
        );
      }
      newResponses = [...state.responses, response];
      // Advance the cursor only if we just answered the cursor's item, and never
      // past the end of planned_items.
      if (itemIndex === state.current_index) {
        newCurrentIndex = Math.min(state.current_index + 1, state.planned_items.length);
      } else {
        // Out-of-order forward answer (skip-ahead is not supported here, but if
        // it ever lands, we leave the cursor alone).
        newCurrentIndex = state.current_index;
      }
    }

    const next: LinearEngineState = {
      ...(state as LinearEngineState),
      responses: newResponses,
      current_index: newCurrentIndex,
    };
    return next;
  },

  score(state: EngineState): ScoreResult {
    // Raw score = count of unique items answered correctly. Each item is graded
    // once even under re-answer (back-nav) because responses[] only carries the
    // latest answer per item_id.
    const itemsCorrect = state.responses.filter(r => r.is_correct).length;
    const itemsAnswered = state.responses.length;

    // Without a config available at score time, we project a sensible default:
    // identity formula, no bands. The assessment-svc (Stage 19) calls
    // applyScoringFormula equivalents at submit time when config IS available.
    // For replay/inspection between submit and final scoring, callers should
    // pair the engine with the config themselves.
    const scaled = itemsCorrect; // identity by default
    const band: string | null = null;

    return {
      raw: itemsCorrect,
      scaled,
      band,
      items_correct: itemsCorrect,
      items_answered: itemsAnswered,
      duration_ms: 0, // duration is a clock-bound concern → emitted by terminate()
      skills_touched: uniqueSkillsTouched(state),
    };
  },

  canNavigateBack(state: EngineState): boolean {
    return state.current_index > 0;
  },

  getTimeRemaining(state: EngineState, clock: () => number): number | null {
    if (state.time_limit_ms === null) return null;
    const startedMs = Date.parse(state.started_at);
    const elapsed = clock() - startedMs;
    const remaining = state.time_limit_ms - elapsed;
    return remaining > 0 ? remaining : 0;
  },

  terminate(
    state: EngineState,
    reason: TerminationReason,
    clock: () => number,
  ): FinalResult {
    const score = this.score(state);
    const elapsed = durationMs(state, clock);
    const finalScore: ScoreResult = { ...score, duration_ms: elapsed };
    return {
      state,
      score: finalScore,
      reason,
      terminated_at: new Date(clock()).toISOString(),
    };
  },
};

// ─── Public extras (config-aware scoring) ────────────────────────────────────
// The plain `score(state)` defaults to identity; assessment-svc and tests call
// this when they want band/scaled values from a specific FrameworkConfig.

export function scoreWithConfig(
  state: EngineState,
  config: FrameworkConfig,
): ScoreResult {
  const base = LinearEngine.score(state);
  const rules = selectScoringRules(config);
  const scaled = applyScoringFormula(rules, base.raw, state.total_items);
  const band = selectBand(rules, scaled);
  return { ...base, scaled, band };
}

/**
 * Convenience: produce a FinalResult with config-aware scoring. Tests and the
 * assessment-svc call this; the bare interface method `terminate()` defaults
 * to identity scoring (config-free) so consumers without a config still get a
 * truthful raw count + duration.
 */
export function terminateWithConfig(
  state: EngineState,
  reason: TerminationReason,
  clock: () => number,
  config: FrameworkConfig,
): FinalResult {
  const base = LinearEngine.terminate(state, reason, clock);
  const score = scoreWithConfig(state, config);
  return { ...base, score: { ...score, duration_ms: base.score.duration_ms } };
}
