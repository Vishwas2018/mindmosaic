/**
 * AdaptiveEngine — Spec §3.2.1 + §4.1.
 *
 * NAPLAN testlet routing. The session is divided into stages; after each
 * stage's testlet is exhausted, the engine looks up
 * `framework_config.adaptive_rules.routing_table` keyed by `(stage_id, score)`
 * to select the next stage's testlet. Routing decisions are server-authoritative
 * and irreversible (Spec §3.2.1). Per-stage timer (Spec §4.1).
 *
 * Pure-function namespace per ADR-0022. Discriminated-union state per
 * ADR-0023. Testlet-routing data model per ADR-0024.
 *
 * Pure-function discipline: `getNextItem` is a read-only peek — when the
 * current testlet is exhausted it computes the next testlet from the routing
 * table and returns its first item without mutating state. `recordResponse`
 * does the load-bearing work: in-testlet responses append + advance; the first
 * response of a not-yet-loaded next testlet triggers the routing transition
 * (close current stage, append new stage, increment indices, push
 * `routing_history`).
 *
 * Writing-stage handling (Q-17.5): `EngineResponse.is_correct` is nullable;
 * writing responses with `is_correct: null` are accepted and stored verbatim
 * in `response_data.text`, but excluded from the routing score.
 */
import {
  assertAdaptiveState,
  type AdaptiveEngineState,
  type AdaptiveRules,
  type AdaptiveStageState,
  type AssessmentEngine,
  type EngineItem,
  type EngineResponse,
  type EngineState,
  type FinalResult,
  type FrameworkConfig,
  type ItemDTO,
  type RoutingTableEntry,
  type ScoreResult,
  type ScoringRules,
  type SessionContext,
  type SkillId,
  type TerminationReason,
  type TerminationSignal,
} from './contracts.js';

// ─── Helpers (private) ───────────────────────────────────────────────────────

function applyScoringFormula(
  rules: ScoringRules,
  rawCorrect: number,
  totalItems: number,
): number {
  if (rules.scaled_score_formula === 'identity') return rawCorrect;
  if (totalItems === 0) return 0;
  return Math.round((rawCorrect / totalItems) * 100);
}

function selectBand(rules: ScoringRules, scaled: number): string | null {
  for (const band of rules.bands) {
    if (scaled >= band.min && scaled <= band.max) return band.label;
  }
  return null;
}

function durationMs(startedAtIso: string, clock: () => number): number {
  const startedMs = Date.parse(startedAtIso);
  const elapsed = clock() - startedMs;
  return elapsed > 0 ? elapsed : 0;
}

/**
 * Score for a stage = count of `is_correct === true` responses. Writing items
 * (`is_correct: null` per Q-17.5) and incorrect responses both count zero.
 */
export function computeStageScore(stage: AdaptiveStageState): number {
  return stage.responses.filter(r => r.is_correct === true).length;
}

/**
 * Routing-table lookup. Q-17.9: throws on ambiguous match (>1 row matches the
 * (stage_id, score) pair). Returns null when no match — caller decides whether
 * that's a terminal condition or an error.
 */
export function lookupRoute(
  table: RoutingTableEntry[],
  stageId: string,
  score: number,
): RoutingTableEntry | null {
  const matches = table.filter(
    e => e.stage_id === stageId && score >= e.score_min && score <= e.score_max,
  );
  if (matches.length > 1) {
    throw new Error(
      `AdaptiveEngine: ambiguous routing — ${matches.length} entries match (stage_id='${stageId}', score=${score})`,
    );
  }
  return matches[0] ?? null;
}

function resolveTestletItems(
  pool: EngineItem[],
  testletItemIds: string[],
  testletId: string,
): EngineItem[] {
  return testletItemIds.map(id => {
    const item = pool.find(p => p.item_id === id);
    if (item === undefined) {
      throw new Error(
        `AdaptiveEngine: testlet '${testletId}' references item '${id}' not present in item_pool`,
      );
    }
    return item;
  });
}

function isLastStage(state: AdaptiveEngineState): boolean {
  return state.current_stage_index >= state.adaptive_rules.stages.length - 1;
}

// ─── AdaptiveEngine ──────────────────────────────────────────────────────────

export const AdaptiveEngine: AssessmentEngine = {
  initialise(session: SessionContext, config: FrameworkConfig): EngineState {
    if (config.engine_type !== 'adaptive') {
      throw new Error(
        `AdaptiveEngine.initialise: expected engine_type='adaptive', got '${config.engine_type}'`,
      );
    }
    if (session.engine_type !== 'adaptive') {
      throw new Error(
        `AdaptiveEngine.initialise: SessionContext.engine_type must be 'adaptive', got '${session.engine_type}'`,
      );
    }
    const rules = config.adaptive_rules;
    if (rules === undefined) {
      throw new Error(
        `AdaptiveEngine.initialise: config.adaptive_rules is required (set in framework_config.adaptive_rules)`,
      );
    }
    const startTestlet = rules.testlets[rules.start_testlet_id];
    if (startTestlet === undefined) {
      throw new Error(
        `AdaptiveEngine.initialise: start_testlet_id '${rules.start_testlet_id}' not in adaptive_rules.testlets`,
      );
    }

    const startItems = resolveTestletItems(
      session.planned_items,
      startTestlet.item_ids,
      rules.start_testlet_id,
    );

    const firstStage: AdaptiveStageState = {
      stage_id: startTestlet.stage_id,
      testlet_id: rules.start_testlet_id,
      items: startItems,
      responses: [],
      time_limit_ms: startTestlet.time_limit_ms,
      // started_at remains null until the first response — engines can't read
      // a clock outside getTimeRemaining/terminate. The session_record column
      // gets the wall-clock value via assessment-svc when the first respond
      // arrives.
      started_at: null,
      ended_at: null,
    };

    return {
      engine_type: 'adaptive',
      session_id: session.session_id,
      mode: session.mode,
      started_at: session.started_at,
      time_limit_ms: session.time_limit_ms,
      item_pool: session.planned_items,
      stages: [firstStage],
      current_stage_index: 0,
      current_item_index: 0,
      routing_history: [],
      adaptive_rules: rules,
    };
  },

  getNextItem(state: EngineState): ItemDTO | TerminationSignal {
    assertAdaptiveState(state);

    const currentStage = state.stages[state.current_stage_index];
    if (currentStage === undefined) {
      return { termination: true, reason: 'completed' };
    }

    // In-testlet: hand back the next item.
    if (state.current_item_index < currentStage.items.length) {
      const next = currentStage.items[state.current_item_index];
      if (next === undefined) return { termination: true, reason: 'completed' };
      return next;
    }

    // Stage exhausted. If last stage → done.
    if (isLastStage(state)) {
      return { termination: true, reason: 'completed' };
    }

    // Peek into the routing destination's first item — without mutating state.
    const score = computeStageScore(currentStage);
    const route = lookupRoute(state.adaptive_rules.routing_table, currentStage.stage_id, score);
    if (route === null) {
      throw new Error(
        `AdaptiveEngine: no routing-table entry for (stage_id='${currentStage.stage_id}', score=${score})`,
      );
    }
    const nextTestlet = state.adaptive_rules.testlets[route.next_testlet_id];
    if (nextTestlet === undefined) {
      throw new Error(
        `AdaptiveEngine: routing target '${route.next_testlet_id}' not in adaptive_rules.testlets`,
      );
    }
    if (nextTestlet.item_ids.length === 0) {
      // Empty testlet — nothing to deliver. Treat as completion.
      return { termination: true, reason: 'completed' };
    }
    const firstId = nextTestlet.item_ids[0];
    if (firstId === undefined) return { termination: true, reason: 'completed' };
    const firstItem = state.item_pool.find(it => it.item_id === firstId);
    if (firstItem === undefined) {
      throw new Error(
        `AdaptiveEngine: testlet '${route.next_testlet_id}' first item '${firstId}' not in pool`,
      );
    }
    return firstItem;
  },

  recordResponse(state: EngineState, response: EngineResponse): EngineState {
    assertAdaptiveState(state);

    const currentStage = state.stages[state.current_stage_index];
    if (currentStage === undefined) {
      throw new Error('AdaptiveEngine.recordResponse: no current stage');
    }

    // ── Path A: in-testlet response ────────────────────────────────────────
    if (state.current_item_index < currentStage.items.length) {
      const expectedItem = currentStage.items[state.current_item_index];
      if (expectedItem === undefined) {
        throw new Error('AdaptiveEngine.recordResponse: current_item_index out of bounds');
      }
      if (response.item_id !== expectedItem.item_id) {
        throw new Error(
          `AdaptiveEngine.recordResponse: expected item '${expectedItem.item_id}' (sequence ${state.current_item_index + 1} of testlet '${currentStage.testlet_id}'), got '${response.item_id}'`,
        );
      }
      const updatedStage: AdaptiveStageState = {
        ...currentStage,
        responses: [...currentStage.responses, response],
        // First-response wall-clock anchor for the per-stage timer.
        started_at: currentStage.started_at ?? response.answered_at,
      };
      return {
        ...state,
        stages: state.stages.map((s, i) =>
          i === state.current_stage_index ? updatedStage : s,
        ),
        current_item_index: state.current_item_index + 1,
      };
    }

    // ── Path B: stage exhausted → routing transition ──────────────────────
    if (isLastStage(state)) {
      throw new Error(
        `AdaptiveEngine.recordResponse: current stage '${currentStage.stage_id}' is the last stage and is already exhausted`,
      );
    }

    const score = computeStageScore(currentStage);
    const route = lookupRoute(
      state.adaptive_rules.routing_table,
      currentStage.stage_id,
      score,
    );
    if (route === null) {
      throw new Error(
        `AdaptiveEngine.recordResponse: no routing-table entry for (stage_id='${currentStage.stage_id}', score=${score})`,
      );
    }
    const nextTestlet = state.adaptive_rules.testlets[route.next_testlet_id];
    if (nextTestlet === undefined) {
      throw new Error(
        `AdaptiveEngine.recordResponse: routing target '${route.next_testlet_id}' not in adaptive_rules.testlets`,
      );
    }
    const expectedFirstId = nextTestlet.item_ids[0];
    if (expectedFirstId === undefined) {
      throw new Error(
        `AdaptiveEngine.recordResponse: routed-to testlet '${route.next_testlet_id}' is empty`,
      );
    }
    if (response.item_id !== expectedFirstId) {
      throw new Error(
        `AdaptiveEngine.recordResponse: routing transition expects first item of testlet '${route.next_testlet_id}' ('${expectedFirstId}'), got '${response.item_id}'`,
      );
    }

    const newStageItems = resolveTestletItems(
      state.item_pool,
      nextTestlet.item_ids,
      route.next_testlet_id,
    );
    const newStage: AdaptiveStageState = {
      stage_id: nextTestlet.stage_id,
      testlet_id: route.next_testlet_id,
      items: newStageItems,
      responses: [response],
      time_limit_ms: nextTestlet.time_limit_ms,
      started_at: response.answered_at,
      ended_at: null,
    };

    const closedCurrent: AdaptiveStageState = {
      ...currentStage,
      ended_at: response.answered_at,
    };

    return {
      ...state,
      stages: [
        ...state.stages.slice(0, state.current_stage_index),
        closedCurrent,
        newStage,
      ],
      current_stage_index: state.current_stage_index + 1,
      current_item_index: 1, // we just consumed item 0 of the new testlet
      routing_history: [
        ...state.routing_history,
        {
          from_stage_id: currentStage.stage_id,
          score,
          routed_to_testlet_id: route.next_testlet_id,
        },
      ],
    };
  },

  score(state: EngineState): ScoreResult {
    assertAdaptiveState(state);

    let itemsCorrect = 0;
    let itemsAnswered = 0;
    const skills = new Set<SkillId>();
    for (const stage of state.stages) {
      for (const r of stage.responses) {
        itemsAnswered += 1;
        if (r.is_correct === true) itemsCorrect += 1;
        const item = stage.items.find(it => it.item_id === r.item_id);
        if (item !== undefined) {
          for (const sid of item.skill_ids) skills.add(sid);
        }
      }
    }
    return {
      raw: itemsCorrect,
      scaled: 0, // scoreWithConfig applies scoring_rules; full NAPLAN scaled-score is Stage 19
      band: null,
      items_correct: itemsCorrect,
      items_answered: itemsAnswered,
      duration_ms: 0,
      skills_touched: Array.from(skills).sort(),
    };
  },

  canNavigateBack(state: EngineState): boolean {
    assertAdaptiveState(state);
    // Q-17.6: hard-blocked across stages. Permitted only inside current testlet.
    return state.current_item_index > 0;
  },

  getTimeRemaining(state: EngineState, clock: () => number): number | null {
    assertAdaptiveState(state);
    const currentStage = state.stages[state.current_stage_index];
    if (currentStage === undefined) return null;
    if (currentStage.started_at === null) {
      // Stage hasn't received a response yet — full budget remains.
      return currentStage.time_limit_ms;
    }
    const startedMs = Date.parse(currentStage.started_at);
    const elapsed = clock() - startedMs;
    const remaining = currentStage.time_limit_ms - elapsed;
    return remaining > 0 ? remaining : 0;
  },

  terminate(
    state: EngineState,
    reason: TerminationReason,
    clock: () => number,
  ): FinalResult {
    assertAdaptiveState(state);
    const score = AdaptiveEngine.score(state);
    const elapsed = durationMs(state.started_at, clock);
    return {
      state,
      score: { ...score, duration_ms: elapsed },
      reason,
      terminated_at: new Date(clock()).toISOString(),
    };
  },
};

// ─── Public extras ───────────────────────────────────────────────────────────
// Engine-prefixed names to avoid barrel-level collision with linear.ts's
// `scoreWithConfig` / `terminateWithConfig`. Both apply the FrameworkConfig's
// scoring_rules; the Adaptive variants bake in `assertAdaptiveState` narrowing.

export function scoreAdaptiveWithConfig(
  state: EngineState,
  config: FrameworkConfig,
): ScoreResult {
  assertAdaptiveState(state);
  const base = AdaptiveEngine.score(state);
  const rules = config.scoring_rules;
  const scaled = applyScoringFormula(rules, base.raw, base.items_answered);
  const band = selectBand(rules, scaled);
  return { ...base, scaled, band };
}

export function terminateAdaptiveWithConfig(
  state: EngineState,
  reason: TerminationReason,
  clock: () => number,
  config: FrameworkConfig,
): FinalResult {
  assertAdaptiveState(state);
  const base = AdaptiveEngine.terminate(state, reason, clock);
  const score = scoreAdaptiveWithConfig(state, config);
  return { ...base, score: { ...score, duration_ms: base.score.duration_ms } };
}

// Re-export rules type for ergonomic test imports.
export type { AdaptiveRules };
