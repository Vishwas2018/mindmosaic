/**
 * LinearEngine — Stage 15 unit tests.
 * Per Q-15.7 / ADR-0022: discipline-driven (no Date.now / no Math.random in
 * engine). One golden replay test now; property tests deferred to Stage 17.
 */
import { describe, expect, it } from 'vitest';
import {
  LinearEngine,
  scoreWithConfig,
  terminateWithConfig,
  isTerminationSignal,
  EngineStateSchema,
  type EngineResponse,
  type FrameworkConfig,
  type ItemDTO,
  type ItemId,
  type SessionContext,
  type SessionId,
} from '../index.js';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const SESSION_ID = '11111111-1111-4111-8111-111111111111' as SessionId;
const STARTED_AT = '2026-05-04T10:00:00.000Z';
const STARTED_AT_MS = Date.parse(STARTED_AT);

function clockAt(offsetMs: number): () => number {
  // Deterministic clock factory — returns a function whose every call reads
  // STARTED_AT_MS + offsetMs. Mirrors how a request handler would inject a
  // request-time clock to engine methods.
  return () => STARTED_AT_MS + offsetMs;
}

function buildItem(index: number, overrides: Partial<ItemDTO> = {}): ItemDTO {
  // Stable, deterministic UUIDs — index-derived so the same fixture always
  // produces the same ids (replay-friendly).
  const idHex = String(index + 1).padStart(12, '0');
  const item_id = `00000000-0000-4000-8000-${idHex}` as ItemId;
  return {
    item_id,
    version: 1,
    stem: { kind: 'plain_text', value: `Question ${index + 1}` },
    stimulus: null,
    response_type: 'multiple_choice',
    response_config: { options: ['A', 'B', 'C', 'D'], correct: 'A' },
    tools_available: [],
    sequence_number: index + 1,
    ...overrides,
  };
}

function buildItems(count: number): ItemDTO[] {
  return Array.from({ length: count }, (_, i) => buildItem(i));
}

function buildSession(itemCount: number, overrides: Partial<SessionContext> = {}): SessionContext {
  return {
    session_id: SESSION_ID,
    mode: 'exam',
    engine_type: 'linear',
    total_items: itemCount,
    time_limit_ms: 60 * 60 * 1000, // 60 minutes
    started_at: STARTED_AT,
    planned_items: buildItems(itemCount),
    ...overrides,
  };
}

function buildConfig(overrides: Partial<FrameworkConfig> = {}): FrameworkConfig {
  return {
    engine_type: 'linear',
    time_limit_ms: 60 * 60 * 1000,
    back_navigation_enabled: true,
    flag_for_review_enabled: true,
    scoring_rules: {
      scaled_score_formula: 'percentage',
      bands: [
        { min: 0,  max: 49,  label: 'fail' },
        { min: 50, max: 64,  label: 'pass' },
        { min: 65, max: 79,  label: 'credit' },
        { min: 80, max: 89,  label: 'distinction' },
        { min: 90, max: 100, label: 'high_distinction' },
      ],
    },
    ...overrides,
  };
}

function buildResponse(
  item: ItemDTO,
  isCorrect: boolean,
  offsetMs: number,
): EngineResponse {
  return {
    item_id: item.item_id,
    is_correct: isCorrect,
    response_data: { selected: isCorrect ? 'A' : 'B' },
    answered_at: new Date(STARTED_AT_MS + offsetMs).toISOString(),
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('LinearEngine — initialise', () => {
  it('builds an EngineState that round-trips through Zod (JSON-serialisable)', () => {
    const state = LinearEngine.initialise(buildSession(5), buildConfig());
    const parsed = EngineStateSchema.parse(JSON.parse(JSON.stringify(state)));
    expect(parsed).toEqual(state);
  });

  it('initialises with empty responses, current_index 0, no flags', () => {
    const state = LinearEngine.initialise(buildSession(30), buildConfig());
    expect(state.responses).toEqual([]);
    expect(state.current_index).toBe(0);
    expect(state.flagged_item_ids).toEqual([]);
    expect(state.total_items).toBe(30);
  });

  it('config.time_limit_ms takes precedence over session.time_limit_ms', () => {
    const state = LinearEngine.initialise(
      buildSession(5, { time_limit_ms: 10_000 }),
      buildConfig({ time_limit_ms: 99_000 }),
    );
    expect(state.time_limit_ms).toBe(99_000);
  });

  it('throws on engine_type mismatch in config', () => {
    expect(() =>
      LinearEngine.initialise(buildSession(5), buildConfig({ engine_type: 'adaptive' })),
    ).toThrow(/expected engine_type='linear'/);
  });

  it('throws on engine_type mismatch in session', () => {
    expect(() =>
      LinearEngine.initialise(buildSession(5, { engine_type: 'adaptive' }), buildConfig()),
    ).toThrow(/SessionContext.engine_type must be 'linear'/);
  });
});

describe('LinearEngine — getNextItem & navigation', () => {
  it('returns the first item from a fresh state', () => {
    const state = LinearEngine.initialise(buildSession(3), buildConfig());
    const next = LinearEngine.getNextItem(state);
    expect(isTerminationSignal(next)).toBe(false);
    expect((next as ItemDTO).sequence_number).toBe(1);
  });

  it('returns TerminationSignal { reason: "completed" } when index past end', () => {
    const state = LinearEngine.initialise(buildSession(3), buildConfig());
    const exhausted = { ...state, current_index: 3 };
    const next = LinearEngine.getNextItem(exhausted);
    expect(isTerminationSignal(next)).toBe(true);
    if (isTerminationSignal(next)) {
      expect(next.reason).toBe('completed');
    }
  });

  it('canNavigateBack is false at index 0', () => {
    const state = LinearEngine.initialise(buildSession(3), buildConfig());
    expect(LinearEngine.canNavigateBack(state)).toBe(false);
  });

  it('canNavigateBack is true at index 1+', () => {
    const session = buildSession(3);
    const config = buildConfig();
    let state = LinearEngine.initialise(session, config);
    state = LinearEngine.recordResponse(state, buildResponse(session.planned_items[0]!, true, 1_000));
    expect(LinearEngine.canNavigateBack(state)).toBe(true);
  });

  it('edge: empty items array signals immediate termination', () => {
    const state = LinearEngine.initialise(buildSession(0), buildConfig());
    const next = LinearEngine.getNextItem(state);
    expect(isTerminationSignal(next)).toBe(true);
    if (isTerminationSignal(next)) expect(next.reason).toBe('completed');
  });
});

describe('LinearEngine — recordResponse', () => {
  it('appends a new response and advances the cursor', () => {
    const session = buildSession(3);
    const config = buildConfig();
    let state = LinearEngine.initialise(session, config);
    state = LinearEngine.recordResponse(state, buildResponse(session.planned_items[0]!, true, 1_000));
    expect(state.responses).toHaveLength(1);
    expect(state.current_index).toBe(1);
  });

  it('back-nav re-answer replaces the existing response in place (no duplicate)', () => {
    const session = buildSession(3);
    let state = LinearEngine.initialise(session, buildConfig());
    state = LinearEngine.recordResponse(state, buildResponse(session.planned_items[0]!, false, 1_000));
    state = LinearEngine.recordResponse(state, buildResponse(session.planned_items[1]!, true, 2_000));
    // user goes back to item 0 and changes their answer
    state = LinearEngine.recordResponse(state, buildResponse(session.planned_items[0]!, true, 3_000));
    expect(state.responses).toHaveLength(2);
    const item0Response = state.responses.find(r => r.item_id === session.planned_items[0]!.item_id);
    expect(item0Response?.is_correct).toBe(true);
    // cursor unaffected by re-answer (still at 2 from item 1's response)
    expect(state.current_index).toBe(2);
  });

  it('throws if response.item_id is not in planned_items', () => {
    const session = buildSession(3);
    const state = LinearEngine.initialise(session, buildConfig());
    const stranger: EngineResponse = {
      item_id: '99999999-9999-4999-8999-999999999999' as ItemId,
      is_correct: false,
      response_data: {},
      answered_at: STARTED_AT,
    };
    expect(() => LinearEngine.recordResponse(state, stranger)).toThrow(
      /not in planned_items/,
    );
  });

  it('does not advance past the end of planned_items', () => {
    const session = buildSession(2);
    let state = LinearEngine.initialise(session, buildConfig());
    state = LinearEngine.recordResponse(state, buildResponse(session.planned_items[0]!, true, 1_000));
    state = LinearEngine.recordResponse(state, buildResponse(session.planned_items[1]!, true, 2_000));
    expect(state.current_index).toBe(2);
    expect(state.current_index).toBe(state.planned_items.length);
  });
});

describe('LinearEngine — score & scoreWithConfig', () => {
  it('all correct → max raw, max scaled, top band', () => {
    const session = buildSession(10);
    const config = buildConfig();
    let state = LinearEngine.initialise(session, config);
    session.planned_items.forEach((it, i) => {
      state = LinearEngine.recordResponse(state, buildResponse(it, true, (i + 1) * 1_000));
    });
    const result = scoreWithConfig(state, config);
    expect(result.raw).toBe(10);
    expect(result.items_correct).toBe(10);
    expect(result.items_answered).toBe(10);
    expect(result.scaled).toBe(100);
    expect(result.band).toBe('high_distinction');
  });

  it('all incorrect → zero raw, zero scaled, lowest band', () => {
    const session = buildSession(10);
    const config = buildConfig();
    let state = LinearEngine.initialise(session, config);
    session.planned_items.forEach((it, i) => {
      state = LinearEngine.recordResponse(state, buildResponse(it, false, (i + 1) * 1_000));
    });
    const result = scoreWithConfig(state, config);
    expect(result.raw).toBe(0);
    expect(result.scaled).toBe(0);
    expect(result.band).toBe('fail');
  });

  it('partial correctness → proportional score (7/10 = 70 → credit)', () => {
    const session = buildSession(10);
    const config = buildConfig();
    let state = LinearEngine.initialise(session, config);
    session.planned_items.forEach((it, i) => {
      state = LinearEngine.recordResponse(state, buildResponse(it, i < 7, (i + 1) * 1_000));
    });
    const result = scoreWithConfig(state, config);
    expect(result.raw).toBe(7);
    expect(result.scaled).toBe(70);
    expect(result.band).toBe('credit');
  });

  it('identity scoring formula returns scaled === raw', () => {
    const session = buildSession(5);
    const config = buildConfig({
      scoring_rules: {
        scaled_score_formula: 'identity',
        bands: [{ min: 0, max: 5, label: 'flat' }],
      },
    });
    let state = LinearEngine.initialise(session, config);
    state = LinearEngine.recordResponse(state, buildResponse(session.planned_items[0]!, true, 1_000));
    state = LinearEngine.recordResponse(state, buildResponse(session.planned_items[1]!, true, 2_000));
    const result = scoreWithConfig(state, config);
    expect(result.raw).toBe(2);
    expect(result.scaled).toBe(2);
  });

  it('scaled out of all bands → band null', () => {
    const session = buildSession(10);
    const config = buildConfig({
      scoring_rules: {
        scaled_score_formula: 'percentage',
        bands: [{ min: 95, max: 100, label: 'only_top' }],
      },
    });
    let state = LinearEngine.initialise(session, config);
    state = LinearEngine.recordResponse(state, buildResponse(session.planned_items[0]!, true, 1_000));
    const result = scoreWithConfig(state, config);
    expect(result.scaled).toBe(10);
    expect(result.band).toBeNull();
  });

  it('flagging an item does not affect order or scoring', () => {
    // Manual flag injection — the engine permits flag_for_review via state mutation
    // by callers (the assessment-svc); engine behaviour must be flag-blind.
    const session = buildSession(5);
    const config = buildConfig();
    let state = LinearEngine.initialise(session, config);
    session.planned_items.forEach((it, i) => {
      state = LinearEngine.recordResponse(state, buildResponse(it, i < 3, (i + 1) * 1_000));
    });
    const flagged = { ...state, flagged_item_ids: [session.planned_items[1]!.item_id] };
    const result = scoreWithConfig(flagged, config);
    expect(result.raw).toBe(3);
    expect(result.scaled).toBe(60);
  });
});

describe('LinearEngine — getTimeRemaining', () => {
  it('returns positive remaining when within window', () => {
    const state = LinearEngine.initialise(buildSession(3), buildConfig());
    const remaining = LinearEngine.getTimeRemaining(state, clockAt(15 * 60 * 1000));
    expect(remaining).toBe(45 * 60 * 1000);
  });

  it('returns 0 (clamped) when timer expired', () => {
    const state = LinearEngine.initialise(buildSession(3), buildConfig());
    const remaining = LinearEngine.getTimeRemaining(state, clockAt(2 * 60 * 60 * 1000));
    expect(remaining).toBe(0);
  });

  it('null time_limit_ms → returns null', () => {
    const state = LinearEngine.initialise(
      buildSession(3, { time_limit_ms: null }),
      buildConfig({ time_limit_ms: null }),
    );
    expect(LinearEngine.getTimeRemaining(state, clockAt(1_000))).toBeNull();
  });
});

describe('LinearEngine — terminate', () => {
  it('returns FinalResult with reason and clock-derived terminated_at', () => {
    const session = buildSession(3);
    const config = buildConfig();
    let state = LinearEngine.initialise(session, config);
    state = LinearEngine.recordResponse(state, buildResponse(session.planned_items[0]!, true, 1_000));
    const final = terminateWithConfig(state, 'user_submitted', clockAt(5 * 60_000), config);
    expect(final.reason).toBe('user_submitted');
    expect(final.terminated_at).toBe(new Date(STARTED_AT_MS + 5 * 60_000).toISOString());
    expect(final.score.duration_ms).toBe(5 * 60_000);
  });

  it('user submits at item 5/30 → counts only answered items', () => {
    const session = buildSession(30);
    const config = buildConfig();
    let state = LinearEngine.initialise(session, config);
    for (let i = 0; i < 5; i++) {
      state = LinearEngine.recordResponse(state, buildResponse(session.planned_items[i]!, true, (i + 1) * 1_000));
    }
    const final = terminateWithConfig(state, 'user_submitted', clockAt(10 * 60_000), config);
    expect(final.score.items_answered).toBe(5);
    expect(final.score.items_correct).toBe(5);
    expect(final.score.raw).toBe(5);
    // 5/30 = 16.67 → rounds to 17 under 'percentage'
    expect(final.score.scaled).toBe(17);
    expect(final.score.band).toBe('fail');
  });

  it('timer expiry termination works the same way (reason differs only)', () => {
    const session = buildSession(30);
    const config = buildConfig();
    let state = LinearEngine.initialise(session, config);
    for (let i = 0; i < 12; i++) {
      state = LinearEngine.recordResponse(state, buildResponse(session.planned_items[i]!, i % 2 === 0, (i + 1) * 1_000));
    }
    const final = terminateWithConfig(state, 'timer_expired', clockAt(60 * 60_000), config);
    expect(final.reason).toBe('timer_expired');
    expect(final.score.items_correct).toBe(6);
    expect(final.score.items_answered).toBe(12);
  });
});

describe('LinearEngine — golden 30-item ICAS session', () => {
  it('full walkthrough with mixed correctness produces deterministic ScoreResult', () => {
    const session = buildSession(30);
    const config = buildConfig();
    let state = LinearEngine.initialise(session, config);

    // Predetermined correctness pattern: every 3rd item incorrect (20/30 correct).
    session.planned_items.forEach((it, i) => {
      const isCorrect = i % 3 !== 2;
      state = LinearEngine.recordResponse(state, buildResponse(it, isCorrect, (i + 1) * 1_000));
    });

    // After 30 responses the cursor sits at total_items; getNextItem signals completion.
    const exhausted = LinearEngine.getNextItem(state);
    expect(isTerminationSignal(exhausted)).toBe(true);

    const final = terminateWithConfig(state, 'completed', clockAt(45 * 60_000), config);
    expect(final.reason).toBe('completed');
    expect(final.score.items_answered).toBe(30);
    expect(final.score.items_correct).toBe(20);
    expect(final.score.raw).toBe(20);
    // 20/30 = 66.67% → rounds to 67 → credit band (65–79).
    expect(final.score.scaled).toBe(67);
    expect(final.score.band).toBe('credit');
    expect(final.score.duration_ms).toBe(45 * 60_000);
  });
});

describe('LinearEngine — replay determinism (one explicit golden test)', () => {
  it('two independent runs with same inputs produce deep-equal state at every step and identical FinalResult', () => {
    const sessionA = buildSession(30);
    const sessionB = buildSession(30);
    const configA = buildConfig();
    const configB = buildConfig();
    const clockA = clockAt(45 * 60_000);
    const clockB = clockAt(45 * 60_000);

    let stateA = LinearEngine.initialise(sessionA, configA);
    let stateB = LinearEngine.initialise(sessionB, configB);
    expect(stateA).toEqual(stateB);

    sessionA.planned_items.forEach((it, i) => {
      const isCorrect = i % 3 !== 2;
      const responseA = buildResponse(it, isCorrect, (i + 1) * 1_000);
      const responseB = buildResponse(sessionB.planned_items[i]!, isCorrect, (i + 1) * 1_000);
      stateA = LinearEngine.recordResponse(stateA, responseA);
      stateB = LinearEngine.recordResponse(stateB, responseB);
      expect(stateA).toEqual(stateB);
    });

    const finalA = terminateWithConfig(stateA, 'completed', clockA, configA);
    const finalB = terminateWithConfig(stateB, 'completed', clockB, configB);
    expect(finalA).toEqual(finalB);

    // Scrutinise the JSON shape too — the actual replay path persists state via
    // engine_state_snapshot jsonb, so JSON-equal is the real contract.
    expect(JSON.stringify(finalA)).toBe(JSON.stringify(finalB));
  });
});
