/**
 * AdaptiveEngine — Stage 17 unit tests.
 *
 * Covers Spec §3.2.1 (testlet routing) + §4.1 (NAPLAN attributes: per-stage
 * timer, stage-bound back-nav, writing stage). Includes the explicit
 * DEV_PLAN exit criterion: golden 3-stage NAPLAN session through the harness
 * routes correctly per the seed's routing table.
 */
import { describe, expect, it } from 'vitest';
import {
  AdaptiveEngine,
  scoreAdaptiveWithConfig,
  terminateAdaptiveWithConfig,
  computeStageScore,
  lookupRoute,
  isTerminationSignal,
  EngineStateSchema,
  type AdaptiveEngineState,
  type AdaptiveRules,
  type EngineItem,
  type FrameworkConfig,
} from '../index.js';
import {
  STARTED_AT_MS,
  buildAdaptiveSession,
  buildAdaptiveConfig,
  buildAdaptiveRules,
  buildResponse,
  buildWritingItem,
  buildEngineItem,
  clockAt,
  itemId,
} from './_fixtures.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

function asAdaptive(state: ReturnType<typeof AdaptiveEngine.initialise>): AdaptiveEngineState {
  if (state.engine_type !== 'adaptive') throw new Error('expected adaptive state');
  return state;
}

/**
 * Drive a deterministic walkthrough: for each item delivered by getNextItem,
 * decide correctness from a per-stage scoring plan and call recordResponse.
 */
function walk(
  initial: AdaptiveEngineState,
  decisions: Array<{ stage_id: string; correctnessByIndex: boolean[] }>,
): AdaptiveEngineState {
  let state = initial;
  const perStageItemCounter: Record<string, number> = {};
  // Hard cap on iterations to keep test failures from looping forever.
  const MAX_ITERS = 60;
  for (let n = 0; n < MAX_ITERS; n++) {
    const next = AdaptiveEngine.getNextItem(state);
    if (isTerminationSignal(next)) return state;
    const item = next as EngineItem;
    const stageId = item.stage_id ?? 'unknown';
    const i = perStageItemCounter[stageId] ?? 0;
    perStageItemCounter[stageId] = i + 1;
    const plan = decisions.find(d => d.stage_id === stageId);
    const isCorrect = plan?.correctnessByIndex[i] ?? false;
    state = asAdaptive(
      AdaptiveEngine.recordResponse(
        state,
        buildResponse({ item, isCorrect, offsetMs: (n + 1) * 60_000 }),
      ),
    );
  }
  throw new Error('walk: exceeded MAX_ITERS — decisions plan likely missing a stage');
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('AdaptiveEngine — initialise', () => {
  it('builds a JSON-round-trippable EngineState', () => {
    const session = buildAdaptiveSession();
    const config = buildAdaptiveConfig();
    const state = AdaptiveEngine.initialise(session, config);
    const parsed = EngineStateSchema.parse(JSON.parse(JSON.stringify(state)));
    expect(parsed).toEqual(state);
  });

  it('loads first stage from start_testlet_id with 5 items + null timestamps', () => {
    const state = asAdaptive(
      AdaptiveEngine.initialise(buildAdaptiveSession(), buildAdaptiveConfig()),
    );
    expect(state.stages).toHaveLength(1);
    expect(state.stages[0]!.testlet_id).toBe('t1');
    expect(state.stages[0]!.stage_id).toBe('s1');
    expect(state.stages[0]!.items).toHaveLength(5);
    expect(state.stages[0]!.started_at).toBeNull();
    expect(state.stages[0]!.ended_at).toBeNull();
    expect(state.current_stage_index).toBe(0);
    expect(state.current_item_index).toBe(0);
    expect(state.routing_history).toEqual([]);
  });

  it('throws on engine_type mismatch (config)', () => {
    expect(() =>
      AdaptiveEngine.initialise(buildAdaptiveSession(), buildAdaptiveConfig({ engine_type: 'linear' })),
    ).toThrow(/expected engine_type='adaptive'/);
  });

  it('throws on engine_type mismatch (session)', () => {
    expect(() =>
      AdaptiveEngine.initialise(
        buildAdaptiveSession({ engine_type: 'linear' }),
        buildAdaptiveConfig(),
      ),
    ).toThrow(/SessionContext.engine_type must be 'adaptive'/);
  });

  it('throws when adaptive_rules is missing from config', () => {
    const config = buildAdaptiveConfig();
    delete (config as Partial<FrameworkConfig>).adaptive_rules;
    expect(() => AdaptiveEngine.initialise(buildAdaptiveSession(), config)).toThrow(
      /adaptive_rules is required/,
    );
  });

  it('throws when start_testlet_id references missing testlet', () => {
    const rules = buildAdaptiveRules();
    rules.start_testlet_id = 'nonexistent';
    const config = buildAdaptiveConfig({ adaptive_rules: rules });
    expect(() => AdaptiveEngine.initialise(buildAdaptiveSession(), config)).toThrow(
      /'nonexistent' not in adaptive_rules.testlets/,
    );
  });
});

describe('AdaptiveEngine — getNextItem', () => {
  it('returns first item of t1 from a fresh state', () => {
    const state = AdaptiveEngine.initialise(buildAdaptiveSession(), buildAdaptiveConfig());
    const next = AdaptiveEngine.getNextItem(state);
    expect(isTerminationSignal(next)).toBe(false);
    expect((next as EngineItem).item_id).toBe(itemId(0));
    expect((next as EngineItem).testlet_id).toBe('t1');
  });

  it('peeks into next testlet at stage boundary without mutating state', () => {
    const config = buildAdaptiveConfig();
    let s = asAdaptive(AdaptiveEngine.initialise(buildAdaptiveSession(), config));
    // Answer all 5 items of t1 with 3 correct (in-testlet only — don't trigger
    // routing yet) so we can verify getNextItem peeks without mutation.
    const t1Items = s.stages[0]!.items;
    for (let i = 0; i < 5; i++) {
      s = asAdaptive(
        AdaptiveEngine.recordResponse(
          s,
          buildResponse({ item: t1Items[i]!, isCorrect: i < 3, offsetMs: (i + 1) * 1_000 }),
        ),
      );
    }
    // s now has current_item_index=5 (past end), still 1 stage (no response
    // received yet for the next testlet).
    expect(s.stages).toHaveLength(1);
    expect(s.current_item_index).toBe(5);
    const peek = AdaptiveEngine.getNextItem(s);
    expect(isTerminationSignal(peek)).toBe(false);
    // Score 3/5 → t2_medium → first item is index 10.
    expect((peek as EngineItem).item_id).toBe(itemId(10));
    expect((peek as EngineItem).testlet_id).toBe('t2_medium');
    // State unchanged.
    expect(s.stages).toHaveLength(1);
    expect(s.routing_history).toEqual([]);
  });

  it('returns completed termination after last stage exhausted', () => {
    const config = buildAdaptiveConfig();
    let s = asAdaptive(AdaptiveEngine.initialise(buildAdaptiveSession(), config));
    // Walk fully — drives all 3 stages with mixed correctness.
    s = walk(s, [
      { stage_id: 's1', correctnessByIndex: [true, true, true, false, false] }, // → 3/5 → t2_medium
      { stage_id: 's2', correctnessByIndex: [true, true, true, true, false] },  // → 4/5 → t3_hard
      { stage_id: 's3', correctnessByIndex: [true, true, true, false, false] }, // last stage
    ]);
    const next = AdaptiveEngine.getNextItem(s);
    expect(isTerminationSignal(next)).toBe(true);
    if (isTerminationSignal(next)) expect(next.reason).toBe('completed');
  });
});

describe('AdaptiveEngine — recordResponse', () => {
  it('records in-testlet response and advances current_item_index', () => {
    let s = asAdaptive(AdaptiveEngine.initialise(buildAdaptiveSession(), buildAdaptiveConfig()));
    const item0 = s.stages[0]!.items[0]!;
    s = asAdaptive(
      AdaptiveEngine.recordResponse(
        s,
        buildResponse({ item: item0, isCorrect: true, offsetMs: 1_000 }),
      ),
    );
    expect(s.current_item_index).toBe(1);
    expect(s.stages[0]!.responses).toHaveLength(1);
    expect(s.stages[0]!.started_at).not.toBeNull(); // anchored on first response
  });

  it('throws when response is for a different item than expected', () => {
    const s = asAdaptive(AdaptiveEngine.initialise(buildAdaptiveSession(), buildAdaptiveConfig()));
    const wrongItem = s.stages[0]!.items[2]!; // expected items[0]
    expect(() =>
      AdaptiveEngine.recordResponse(
        s,
        buildResponse({ item: wrongItem, isCorrect: true, offsetMs: 1_000 }),
      ),
    ).toThrow(/expected item/);
  });

  it('routing transition: appends new stage, advances indices, pushes routing_history', () => {
    let s = asAdaptive(AdaptiveEngine.initialise(buildAdaptiveSession(), buildAdaptiveConfig()));
    const t1 = s.stages[0]!.items;
    // Answer all 5 of t1 with 4 correct → s1 score 4 → t2_hard
    for (let i = 0; i < 5; i++) {
      s = asAdaptive(
        AdaptiveEngine.recordResponse(
          s,
          buildResponse({ item: t1[i]!, isCorrect: i < 4, offsetMs: (i + 1) * 1_000 }),
        ),
      );
    }
    // Now answer first item of t2_hard
    const peek = AdaptiveEngine.getNextItem(s);
    if (isTerminationSignal(peek)) throw new Error('expected next item');
    s = asAdaptive(
      AdaptiveEngine.recordResponse(
        s,
        buildResponse({ item: peek as EngineItem, isCorrect: true, offsetMs: 6_000 }),
      ),
    );
    expect(s.stages).toHaveLength(2);
    expect(s.current_stage_index).toBe(1);
    expect(s.current_item_index).toBe(1); // we answered item 0 of new testlet
    expect(s.routing_history).toEqual([
      { from_stage_id: 's1', score: 4, routed_to_testlet_id: 't2_hard' },
    ]);
    expect(s.stages[0]!.ended_at).not.toBeNull();
    expect(s.stages[1]!.testlet_id).toBe('t2_hard');
    expect(s.stages[1]!.started_at).not.toBeNull();
  });

  it('throws when routing-transition response is not the first item of the routed testlet', () => {
    let s = asAdaptive(AdaptiveEngine.initialise(buildAdaptiveSession(), buildAdaptiveConfig()));
    const t1 = s.stages[0]!.items;
    for (let i = 0; i < 5; i++) {
      s = asAdaptive(
        AdaptiveEngine.recordResponse(
          s,
          buildResponse({ item: t1[i]!, isCorrect: false, offsetMs: (i + 1) * 1_000 }),
        ),
      );
    }
    // s1 score 0 → t2_easy. First item of t2_easy is index 5. Try item 6 (wrong).
    const wrongItem = buildEngineItem({ index: 6, overrides: { testlet_id: 't2_easy' } });
    expect(() =>
      AdaptiveEngine.recordResponse(
        s,
        buildResponse({ item: wrongItem, isCorrect: true, offsetMs: 6_000 }),
      ),
    ).toThrow(/routing transition expects first item/);
  });
});

describe('AdaptiveEngine — routing table (Spec §3.2.1)', () => {
  it('routing honoured: low score → easy path', () => {
    let s = asAdaptive(AdaptiveEngine.initialise(buildAdaptiveSession(), buildAdaptiveConfig()));
    s = walk(s, [{ stage_id: 's1', correctnessByIndex: [false, false, false, false, false] }]);
    expect(s.routing_history[0]!.routed_to_testlet_id).toBe('t2_easy');
    expect(s.routing_history[0]!.score).toBe(0);
  });

  it('routing honoured: high score → hard path', () => {
    let s = asAdaptive(AdaptiveEngine.initialise(buildAdaptiveSession(), buildAdaptiveConfig()));
    s = walk(s, [{ stage_id: 's1', correctnessByIndex: [true, true, true, true, true] }]);
    expect(s.routing_history[0]!.routed_to_testlet_id).toBe('t2_hard');
    expect(s.routing_history[0]!.score).toBe(5);
  });

  it('ambiguous routing-table → error thrown (Q-17.9)', () => {
    const ambiguous: AdaptiveRules = {
      ...buildAdaptiveRules(),
      routing_table: [
        // Two entries both match (s1, 3): overlapping ranges.
        { stage_id: 's1', score_min: 0, score_max: 5, next_testlet_id: 't2_easy' },
        { stage_id: 's1', score_min: 3, score_max: 3, next_testlet_id: 't2_medium' },
      ],
    };
    const config = buildAdaptiveConfig({ adaptive_rules: ambiguous });
    let s = asAdaptive(AdaptiveEngine.initialise(buildAdaptiveSession(), config));
    // Answer all 5 items of t1 in-testlet (3 correct → score 3 → ambiguous match).
    const t1 = s.stages[0]!.items;
    for (let i = 0; i < 5; i++) {
      s = asAdaptive(
        AdaptiveEngine.recordResponse(
          s,
          buildResponse({ item: t1[i]!, isCorrect: i < 3, offsetMs: (i + 1) * 1_000 }),
        ),
      );
    }
    // Now getNextItem peeks → triggers routing lookup → ambiguous → throws.
    expect(() => AdaptiveEngine.getNextItem(s)).toThrow(/ambiguous routing/);
  });

  it('missing routing entry for (stage_id, score) → error thrown', () => {
    const broken: AdaptiveRules = {
      ...buildAdaptiveRules(),
      routing_table: [
        // Only score 0–1 covered; score 4 (from 4-correct walk) will have no match.
        { stage_id: 's1', score_min: 0, score_max: 1, next_testlet_id: 't2_easy' },
        { stage_id: 's2', score_min: 0, score_max: 5, next_testlet_id: 't3_easy' },
      ],
    };
    const config = buildAdaptiveConfig({ adaptive_rules: broken });
    let s = asAdaptive(AdaptiveEngine.initialise(buildAdaptiveSession(), config));
    const t1 = s.stages[0]!.items;
    // 4 of 5 correct → score 4 → no matching routing entry.
    for (let i = 0; i < 5; i++) {
      s = asAdaptive(
        AdaptiveEngine.recordResponse(
          s,
          buildResponse({ item: t1[i]!, isCorrect: i < 4, offsetMs: (i + 1) * 1_000 }),
        ),
      );
    }
    expect(() => AdaptiveEngine.getNextItem(s)).toThrow(/no routing-table entry/);
  });

  it('lookupRoute helper: ambiguous match throws', () => {
    const table = [
      { stage_id: 's1', score_min: 0, score_max: 5, next_testlet_id: 'a' },
      { stage_id: 's1', score_min: 3, score_max: 3, next_testlet_id: 'b' },
    ];
    expect(() => lookupRoute(table, 's1', 3)).toThrow(/ambiguous/);
  });

  it('lookupRoute helper: no match returns null', () => {
    const table = [{ stage_id: 's1', score_min: 0, score_max: 1, next_testlet_id: 'a' }];
    expect(lookupRoute(table, 's1', 5)).toBeNull();
  });
});

describe('AdaptiveEngine — stage boundaries & navigation (Q-17.6)', () => {
  it('canNavigateBack: false at first item of testlet', () => {
    const s = AdaptiveEngine.initialise(buildAdaptiveSession(), buildAdaptiveConfig());
    expect(AdaptiveEngine.canNavigateBack(s)).toBe(false);
  });

  it('canNavigateBack: true after answering item 0', () => {
    let s = asAdaptive(AdaptiveEngine.initialise(buildAdaptiveSession(), buildAdaptiveConfig()));
    const item0 = s.stages[0]!.items[0]!;
    s = asAdaptive(
      AdaptiveEngine.recordResponse(
        s,
        buildResponse({ item: item0, isCorrect: true, offsetMs: 1_000 }),
      ),
    );
    expect(AdaptiveEngine.canNavigateBack(s)).toBe(true);
  });

  it('canNavigateBack: false at first item of new testlet (cross-stage hard-block)', () => {
    let s = asAdaptive(AdaptiveEngine.initialise(buildAdaptiveSession(), buildAdaptiveConfig()));
    const t1 = s.stages[0]!.items;
    // Answer all 5 of t1 with 3 correct → t2_medium
    for (let i = 0; i < 5; i++) {
      s = asAdaptive(
        AdaptiveEngine.recordResponse(
          s,
          buildResponse({ item: t1[i]!, isCorrect: i < 3, offsetMs: (i + 1) * 1_000 }),
        ),
      );
    }
    // Routing transition: answer first of t2_medium. After this, current_item_index = 1.
    const peek = AdaptiveEngine.getNextItem(s);
    if (isTerminationSignal(peek)) throw new Error('expected item');
    s = asAdaptive(
      AdaptiveEngine.recordResponse(
        s,
        buildResponse({ item: peek as EngineItem, isCorrect: true, offsetMs: 6_000 }),
      ),
    );
    // current_item_index = 1 — back-nav allowed within this testlet.
    expect(AdaptiveEngine.canNavigateBack(s)).toBe(true);
    // But there's no way to access stage 0's items now.
    expect(s.current_stage_index).toBe(1);
    expect(s.stages[0]!.ended_at).not.toBeNull();
  });
});

describe('AdaptiveEngine — per-stage timer', () => {
  it('returns full time_limit before first response of stage', () => {
    const s = AdaptiveEngine.initialise(buildAdaptiveSession(), buildAdaptiveConfig());
    expect(AdaptiveEngine.getTimeRemaining(s, clockAt(60_000))).toBe(900_000);
  });

  it('returns elapsed-aware remaining after first response', () => {
    let s = asAdaptive(AdaptiveEngine.initialise(buildAdaptiveSession(), buildAdaptiveConfig()));
    const item0 = s.stages[0]!.items[0]!;
    s = asAdaptive(
      AdaptiveEngine.recordResponse(
        s,
        buildResponse({ item: item0, isCorrect: true, offsetMs: 60_000 }),
      ),
    );
    // started_at = STARTED_AT + 60s, time_limit = 900s. At 5min mark → 4min remaining.
    const remaining = AdaptiveEngine.getTimeRemaining(s, clockAt(5 * 60_000));
    expect(remaining).toBe((15 - 4) * 60_000); // 11 min remaining (started at 1min, now 5min, 4min elapsed of 15min)
  });

  it('clamps to 0 when stage timer expired', () => {
    let s = asAdaptive(AdaptiveEngine.initialise(buildAdaptiveSession(), buildAdaptiveConfig()));
    const item0 = s.stages[0]!.items[0]!;
    s = asAdaptive(
      AdaptiveEngine.recordResponse(
        s,
        buildResponse({ item: item0, isCorrect: true, offsetMs: 1_000 }),
      ),
    );
    // 30 minutes after started_at, with 15-min limit → expired.
    expect(AdaptiveEngine.getTimeRemaining(s, clockAt(30 * 60_000))).toBe(0);
  });
});

describe('AdaptiveEngine — writing stage (Q-17.5)', () => {
  it('accepts a writing response with is_correct: null and preserves text', () => {
    // Build a custom adaptive_rules with a writing testlet as the only stage.
    const writingItemId = itemId(50);
    const customRules: AdaptiveRules = {
      stages: ['w1'],
      start_testlet_id: 'tw',
      routing_table: [],
      testlets: {
        tw: { stage_id: 'w1', time_limit_ms: 2_400_000, item_ids: [writingItemId] },
      },
    };
    const writingItem = buildWritingItem({
      index: 50,
      overrides: { testlet_id: 'tw', stage_id: 'w1' },
    });
    const session = buildAdaptiveSession({ planned_items: [writingItem] });
    const config = buildAdaptiveConfig({ adaptive_rules: customRules });
    let s = asAdaptive(AdaptiveEngine.initialise(session, config));

    s = asAdaptive(
      AdaptiveEngine.recordResponse(
        s,
        buildResponse({
          item: writingItem,
          isCorrect: null,
          offsetMs: 60_000,
          responseData: { text: 'My persuasive essay about library funding...' },
        }),
      ),
    );
    expect(s.stages[0]!.responses).toHaveLength(1);
    expect(s.stages[0]!.responses[0]!.is_correct).toBeNull();
    expect(s.stages[0]!.responses[0]!.response_data['text']).toContain('persuasive essay');
    // Score: writing item with null is_correct → not counted as correct.
    const score = AdaptiveEngine.score(s);
    expect(score.items_answered).toBe(1);
    expect(score.items_correct).toBe(0);
  });

  it('writing items in routing stage are excluded from score (computeStageScore)', () => {
    // Construct a stage with mixed writing + non-writing responses and verify
    // computeStageScore counts only is_correct === true.
    const items = [
      buildEngineItem({ index: 0 }),
      buildEngineItem({ index: 1 }),
      buildWritingItem({ index: 2 }),
    ];
    const stage = {
      stage_id: 's_mixed',
      testlet_id: 'mixed',
      items,
      time_limit_ms: 60_000,
      started_at: null,
      ended_at: null,
      responses: [
        buildResponse({ item: items[0]!, isCorrect: true, offsetMs: 1_000 }),
        buildResponse({ item: items[1]!, isCorrect: false, offsetMs: 2_000 }),
        buildResponse({ item: items[2]!, isCorrect: null, offsetMs: 3_000, responseData: { text: 'essay' } }),
      ],
    };
    expect(computeStageScore(stage)).toBe(1);
  });
});

describe('AdaptiveEngine — termination', () => {
  it('user_submitted produces FinalResult with neutral base score and clock duration', () => {
    let s = asAdaptive(AdaptiveEngine.initialise(buildAdaptiveSession(), buildAdaptiveConfig()));
    const item0 = s.stages[0]!.items[0]!;
    s = asAdaptive(
      AdaptiveEngine.recordResponse(
        s,
        buildResponse({ item: item0, isCorrect: true, offsetMs: 60_000 }),
      ),
    );
    const final = AdaptiveEngine.terminate(s, 'user_submitted', clockAt(10 * 60_000));
    expect(final.reason).toBe('user_submitted');
    expect(final.score.items_correct).toBe(1);
    expect(final.score.duration_ms).toBe(10 * 60_000);
    expect(final.terminated_at).toBe(new Date(STARTED_AT_MS + 10 * 60_000).toISOString());
  });

  it('scoreAdaptiveWithConfig applies scoring_rules.bands', () => {
    let s = asAdaptive(AdaptiveEngine.initialise(buildAdaptiveSession(), buildAdaptiveConfig()));
    s = walk(s, [
      { stage_id: 's1', correctnessByIndex: [true, true, true, true, true] },  // 5/5 → t2_hard
      { stage_id: 's2', correctnessByIndex: [true, true, true, true, true] },  // 5/5 → t3_hard
      { stage_id: 's3', correctnessByIndex: [true, true, true, true, true] },  // last
    ]);
    const config = buildAdaptiveConfig();
    const score = scoreAdaptiveWithConfig(s, config);
    expect(score.items_correct).toBe(15);
    expect(score.items_answered).toBe(15);
    expect(score.scaled).toBe(100);
    expect(score.band).toBe('high_distinction');
  });
});

describe('AdaptiveEngine — golden 3-stage NAPLAN session (DEV_PLAN exit criterion)', () => {
  it('Stage 1 (3/5) → t2_medium → Stage 2 (4/5) → t3_hard → Stage 3 (3/5) → completed', () => {
    let s = asAdaptive(AdaptiveEngine.initialise(buildAdaptiveSession(), buildAdaptiveConfig()));
    s = walk(s, [
      { stage_id: 's1', correctnessByIndex: [true, true, true, false, false] },  // 3/5 → t2_medium
      { stage_id: 's2', correctnessByIndex: [true, true, true, true, false] },   // 4/5 → t3_hard
      { stage_id: 's3', correctnessByIndex: [true, true, true, false, false] },  // last
    ]);
    expect(s.stages).toHaveLength(3);
    expect(s.routing_history).toEqual([
      { from_stage_id: 's1', score: 3, routed_to_testlet_id: 't2_medium' },
      { from_stage_id: 's2', score: 4, routed_to_testlet_id: 't3_hard' },
    ]);
    expect(s.stages[0]!.testlet_id).toBe('t1');
    expect(s.stages[1]!.testlet_id).toBe('t2_medium');
    expect(s.stages[2]!.testlet_id).toBe('t3_hard');

    // Session is exhausted.
    const next = AdaptiveEngine.getNextItem(s);
    expect(isTerminationSignal(next)).toBe(true);
    if (isTerminationSignal(next)) expect(next.reason).toBe('completed');

    const final = terminateAdaptiveWithConfig(s, 'completed', clockAt(45 * 60_000), buildAdaptiveConfig());
    expect(final.score.items_correct).toBe(10); // 3 + 4 + 3
    expect(final.score.items_answered).toBe(15);
    expect(final.score.scaled).toBe(67); // 10/15 = 67%
    expect(final.score.band).toBe('credit');
    expect(final.score.duration_ms).toBe(45 * 60_000);
  });
});

describe('AdaptiveEngine — replay determinism', () => {
  it('two independent runs with same routing + same responses → deep-equal state at every step + identical FinalResult', () => {
    const sessionA = buildAdaptiveSession();
    const sessionB = buildAdaptiveSession();
    const configA = buildAdaptiveConfig();
    const configB = buildAdaptiveConfig();
    let stateA = asAdaptive(AdaptiveEngine.initialise(sessionA, configA));
    let stateB = asAdaptive(AdaptiveEngine.initialise(sessionB, configB));
    expect(stateA).toEqual(stateB);

    const decisions = [
      { stage_id: 's1', correctnessByIndex: [true, true, true, false, false] },
      { stage_id: 's2', correctnessByIndex: [true, true, true, true, false] },
      { stage_id: 's3', correctnessByIndex: [true, true, true, false, false] },
    ];
    stateA = walk(stateA, decisions);
    stateB = walk(stateB, decisions);
    expect(stateA).toEqual(stateB);

    const finalA = terminateAdaptiveWithConfig(stateA, 'completed', clockAt(45 * 60_000), configA);
    const finalB = terminateAdaptiveWithConfig(stateB, 'completed', clockAt(45 * 60_000), configB);
    expect(JSON.stringify(finalA)).toBe(JSON.stringify(finalB));
  });
});

describe('AdaptiveEngine — edge cases', () => {
  it('single-stage session (Writing domain): one stage, no routing', () => {
    const writingItemId = itemId(60);
    const rules: AdaptiveRules = {
      stages: ['w1'],
      start_testlet_id: 'tw',
      routing_table: [],
      testlets: {
        tw: { stage_id: 'w1', time_limit_ms: 2_400_000, item_ids: [writingItemId] },
      },
    };
    const witem = buildWritingItem({ index: 60, overrides: { testlet_id: 'tw', stage_id: 'w1' } });
    const session = buildAdaptiveSession({ planned_items: [witem] });
    const config = buildAdaptiveConfig({ adaptive_rules: rules });
    let s = asAdaptive(AdaptiveEngine.initialise(session, config));
    s = asAdaptive(
      AdaptiveEngine.recordResponse(
        s,
        buildResponse({
          item: witem,
          isCorrect: null,
          offsetMs: 60_000,
          responseData: { text: 'A short essay.' },
        }),
      ),
    );
    expect(s.stages).toHaveLength(1);
    const next = AdaptiveEngine.getNextItem(s);
    expect(isTerminationSignal(next)).toBe(true);
    if (isTerminationSignal(next)) expect(next.reason).toBe('completed');
  });

  it('1 item per testlet: routes after every response', () => {
    const tinyRules: AdaptiveRules = {
      stages: ['s1', 's2'],
      start_testlet_id: 'a',
      routing_table: [
        { stage_id: 's1', score_min: 0, score_max: 0, next_testlet_id: 'b_low' },
        { stage_id: 's1', score_min: 1, score_max: 1, next_testlet_id: 'b_high' },
      ],
      testlets: {
        a:      { stage_id: 's1', time_limit_ms: 60_000, item_ids: [itemId(0)] },
        b_low:  { stage_id: 's2', time_limit_ms: 60_000, item_ids: [itemId(1)] },
        b_high: { stage_id: 's2', time_limit_ms: 60_000, item_ids: [itemId(2)] },
      },
    };
    const items = [
      buildEngineItem({ index: 0, overrides: { testlet_id: 'a', stage_id: 's1' } }),
      buildEngineItem({ index: 1, overrides: { testlet_id: 'b_low', stage_id: 's2' } }),
      buildEngineItem({ index: 2, overrides: { testlet_id: 'b_high', stage_id: 's2' } }),
    ];
    const session = buildAdaptiveSession({ planned_items: items });
    const config = buildAdaptiveConfig({ adaptive_rules: tinyRules });
    let s = asAdaptive(AdaptiveEngine.initialise(session, config));

    // Answer item 0 correctly → route to b_high (score 1).
    s = asAdaptive(
      AdaptiveEngine.recordResponse(
        s,
        buildResponse({ item: items[0]!, isCorrect: true, offsetMs: 1_000 }),
      ),
    );
    // Now answer item from b_high.
    const peek = AdaptiveEngine.getNextItem(s);
    if (isTerminationSignal(peek)) throw new Error('expected item');
    expect((peek as EngineItem).item_id).toBe(itemId(2));
    s = asAdaptive(
      AdaptiveEngine.recordResponse(
        s,
        buildResponse({ item: peek as EngineItem, isCorrect: true, offsetMs: 2_000 }),
      ),
    );
    expect(s.routing_history).toEqual([
      { from_stage_id: 's1', score: 1, routed_to_testlet_id: 'b_high' },
    ]);
    const next = AdaptiveEngine.getNextItem(s);
    expect(isTerminationSignal(next)).toBe(true);
  });
});
