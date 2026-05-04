/**
 * Shared test fixtures for engine tests (Stage 16 +).
 *
 * Deterministic — every helper returns stable, index-derived UUIDs so the same
 * fixture configuration always produces the same data. Replay tests rely on
 * this property.
 *
 * Conventions:
 * - Item IDs: `00000000-0000-4000-8000-XXXXXXXXXXXX` (X = zero-padded index).
 * - Skill IDs: `11111111-1111-4111-8111-XXXXXXXXXXXX`.
 * - Session ID: `22222222-2222-4222-8222-222222222222`.
 * - Started-at: 2026-05-04T10:00:00.000Z.
 */
import {
  type AdaptiveRules,
  type EngineItem,
  type EngineResponse,
  type FrameworkConfig,
  type SessionContext,
  type ItemId,
  type SessionId,
  type SkillId,
} from '../index.js';

export const SESSION_ID = '22222222-2222-4222-8222-222222222222' as SessionId;
export const STARTED_AT = '2026-05-04T10:00:00.000Z';
export const STARTED_AT_MS = Date.parse(STARTED_AT);

// ─── IDs ─────────────────────────────────────────────────────────────────────

export function skillId(index: number): SkillId {
  const hex = String(index + 1).padStart(12, '0');
  return `11111111-1111-4111-8111-${hex}` as SkillId;
}

export function itemId(index: number): ItemId {
  const hex = String(index + 1).padStart(12, '0');
  return `00000000-0000-4000-8000-${hex}` as ItemId;
}

// A default skill ID for engines that ignore skill metadata (LinearEngine).
export const DEFAULT_SKILL_ID = skillId(0);

// ─── Clock ───────────────────────────────────────────────────────────────────

export function clockAt(offsetMs: number): () => number {
  return () => STARTED_AT_MS + offsetMs;
}

// ─── Items ───────────────────────────────────────────────────────────────────

export interface BuildItemInput {
  index: number;
  skill_ids?: SkillId[];
  difficulty?: number;
  overrides?: Partial<EngineItem>;
}

export function buildEngineItem({
  index,
  skill_ids = [DEFAULT_SKILL_ID],
  difficulty = 0.5,
  overrides,
}: BuildItemInput): EngineItem {
  return {
    item_id: itemId(index),
    version: 1,
    stem: { kind: 'plain_text', value: `Question ${index + 1}` },
    stimulus: null,
    response_type: 'multiple_choice',
    response_config: { options: ['A', 'B', 'C', 'D'], correct: 'A' },
    tools_available: [],
    sequence_number: index + 1,
    skill_ids,
    difficulty,
    ...overrides,
  };
}

/** Build N items with a single skill and uniform difficulty (Linear-style fixture). */
export function buildEngineItems(count: number, opts?: Partial<BuildItemInput>): EngineItem[] {
  return Array.from({ length: count }, (_, i) => buildEngineItem({ index: i, ...opts }));
}

/**
 * Build an item pool with a specified skills × difficulties matrix.
 * Each combination yields one unique item; total = skills * difficulties.length.
 */
export function buildEngineItemPool({
  skills,
  difficulties,
}: {
  skills: SkillId[];
  difficulties: number[];
}): EngineItem[] {
  const out: EngineItem[] = [];
  let i = 0;
  for (const sid of skills) {
    for (const diff of difficulties) {
      out.push(
        buildEngineItem({
          index: i,
          skill_ids: [sid],
          difficulty: diff,
        }),
      );
      i++;
    }
  }
  return out;
}

// ─── Responses ───────────────────────────────────────────────────────────────

export interface BuildResponseInput {
  item: EngineItem;
  /** `null` for writing items (Stage 17, Q-17.5) — accepted but excluded from scoring. */
  isCorrect: boolean | null;
  offsetMs: number;
  telemetry?: { time_to_answer_ms: number; answer_changes: number };
  /** Override response_data verbatim (e.g., to capture writing-stage text). */
  responseData?: Record<string, unknown>;
}

export function buildResponse({
  item,
  isCorrect,
  offsetMs,
  telemetry,
  responseData,
}: BuildResponseInput): EngineResponse {
  const data = responseData ?? { selected: isCorrect === true ? 'A' : 'B' };
  const base: EngineResponse = {
    item_id: item.item_id,
    is_correct: isCorrect,
    response_data: data,
    answered_at: new Date(STARTED_AT_MS + offsetMs).toISOString(),
  };
  if (telemetry !== undefined) {
    base.telemetry = telemetry;
  }
  return base;
}

/** Build a writing-stage item (is_writing_item: true). */
export function buildWritingItem(opts: BuildItemInput): EngineItem {
  return buildEngineItem({
    ...opts,
    overrides: {
      ...opts.overrides,
      is_writing_item: true,
      response_type: 'extended_text',
      response_config: { max_length: 5000 },
    },
  });
}

// ─── Sessions ────────────────────────────────────────────────────────────────

export function buildLinearSession(
  itemCount: number,
  overrides: Partial<SessionContext> = {},
): SessionContext {
  return {
    session_id: SESSION_ID,
    mode: 'exam',
    engine_type: 'linear',
    total_items: itemCount,
    time_limit_ms: 60 * 60 * 1000,
    started_at: STARTED_AT,
    planned_items: buildEngineItems(itemCount),
    target_skills: [],
    ...overrides,
  };
}

export function buildSkillSession({
  skills,
  pool,
  overrides = {},
}: {
  skills: SkillId[];
  pool: EngineItem[];
  overrides?: Partial<SessionContext>;
}): SessionContext {
  return {
    session_id: SESSION_ID,
    mode: 'practice',
    engine_type: 'skill',
    total_items: null,
    time_limit_ms: null,
    started_at: STARTED_AT,
    planned_items: pool,
    target_skills: skills,
    ...overrides,
  };
}

export function buildDiagnosticSession({
  skills,
  pool,
  overrides = {},
}: {
  skills: SkillId[];
  pool: EngineItem[];
  overrides?: Partial<SessionContext>;
}): SessionContext {
  return {
    session_id: SESSION_ID,
    mode: 'diagnostic',
    engine_type: 'diagnostic',
    total_items: null,
    time_limit_ms: null,
    started_at: STARTED_AT,
    planned_items: pool,
    target_skills: skills,
    ...overrides,
  };
}

// ─── Configs ─────────────────────────────────────────────────────────────────

export function buildLinearConfig(overrides: Partial<FrameworkConfig> = {}): FrameworkConfig {
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
    mastery_threshold: 0.85,
    difficulty_step_up: 0.1,
    difficulty_step_down: 0.15,
    cognitive_load_threshold: 0.8,
    cognitive_load_step_down: 0.1,
    expected_time_per_item_ms: 30_000,
    max_items: 20,
    confidence_threshold: 0.7,
    diagnostic_start_difficulty: 0.5,
    ...overrides,
  };
}

export function buildSkillConfig(overrides: Partial<FrameworkConfig> = {}): FrameworkConfig {
  return buildLinearConfig({
    engine_type: 'skill',
    back_navigation_enabled: false,
    time_limit_ms: null,
    ...overrides,
  });
}

export function buildDiagnosticConfig(overrides: Partial<FrameworkConfig> = {}): FrameworkConfig {
  return buildLinearConfig({
    engine_type: 'diagnostic',
    back_navigation_enabled: false,
    time_limit_ms: null,
    ...overrides,
  });
}

// ─── Adaptive (Stage 17) ─────────────────────────────────────────────────────

/**
 * Stage IDs for the canonical 3-stage NAPLAN test fixture (Numeracy domain).
 */
export const ADAPTIVE_STAGES = ['s1', 's2', 's3'] as const;

/**
 * Build a 3-stage NAPLAN routing fixture matching the seed shape.
 * 5 items per testlet × 7 testlets = 35 items in the pool.
 *
 *   s1:                        t1 (5 items at difficulty 0.5)
 *   s1 → s2 (score 0–2):       t2_easy   (5 items at 0.3)
 *   s1 → s2 (score 3):         t2_medium (5 items at 0.5)
 *   s1 → s2 (score 4–5):       t2_hard   (5 items at 0.7)
 *   s2 → s3 (score 0–2):       t3_easy   (5 items at 0.3)
 *   s2 → s3 (score 3):         t3_medium (5 items at 0.5)
 *   s2 → s3 (score 4–5):       t3_hard   (5 items at 0.7)
 */
export function buildAdaptiveRules(): AdaptiveRules {
  return {
    stages: ['s1', 's2', 's3'],
    start_testlet_id: 't1',
    routing_table: [
      { stage_id: 's1', score_min: 0, score_max: 2, next_testlet_id: 't2_easy' },
      { stage_id: 's1', score_min: 3, score_max: 3, next_testlet_id: 't2_medium' },
      { stage_id: 's1', score_min: 4, score_max: 5, next_testlet_id: 't2_hard' },
      { stage_id: 's2', score_min: 0, score_max: 2, next_testlet_id: 't3_easy' },
      { stage_id: 's2', score_min: 3, score_max: 3, next_testlet_id: 't3_medium' },
      { stage_id: 's2', score_min: 4, score_max: 5, next_testlet_id: 't3_hard' },
    ],
    testlets: {
      t1:        { stage_id: 's1', time_limit_ms: 900_000, item_ids: testletItemIds(0, 5) },
      t2_easy:   { stage_id: 's2', time_limit_ms: 900_000, item_ids: testletItemIds(5, 5) },
      t2_medium: { stage_id: 's2', time_limit_ms: 900_000, item_ids: testletItemIds(10, 5) },
      t2_hard:   { stage_id: 's2', time_limit_ms: 900_000, item_ids: testletItemIds(15, 5) },
      t3_easy:   { stage_id: 's3', time_limit_ms: 600_000, item_ids: testletItemIds(20, 5) },
      t3_medium: { stage_id: 's3', time_limit_ms: 600_000, item_ids: testletItemIds(25, 5) },
      t3_hard:   { stage_id: 's3', time_limit_ms: 600_000, item_ids: testletItemIds(30, 5) },
    },
  };
}

function testletItemIds(startIndex: number, count: number): string[] {
  return Array.from({ length: count }, (_, i) => itemId(startIndex + i));
}

/** Build EngineItems for one testlet. */
export function buildTestletItems(opts: {
  testletId: string;
  stageId: string;
  startIndex: number;
  count: number;
  difficulty?: number;
  isWriting?: boolean;
}): EngineItem[] {
  return Array.from({ length: opts.count }, (_, i) =>
    buildEngineItem({
      index: opts.startIndex + i,
      difficulty: opts.difficulty ?? 0.5,
      overrides: {
        testlet_id: opts.testletId,
        stage_id: opts.stageId,
        ...(opts.isWriting === true ? { is_writing_item: true } : {}),
      },
    }),
  );
}

/** Build the full 35-item pool matching `buildAdaptiveRules()`. */
export function buildAdaptiveItemPool(): EngineItem[] {
  const rules = buildAdaptiveRules();
  const out: EngineItem[] = [];
  // Map difficulty by testlet suffix (easy/medium/hard) for realistic fixtures.
  const difficultyByTestletId: Record<string, number> = {
    t1: 0.5,
    t2_easy: 0.3,   t2_medium: 0.5,   t2_hard: 0.7,
    t3_easy: 0.3,   t3_medium: 0.5,   t3_hard: 0.7,
  };
  for (const [testletId, def] of Object.entries(rules.testlets)) {
    const difficulty = difficultyByTestletId[testletId] ?? 0.5;
    for (const id of def.item_ids) {
      const idxHex = id.split('-').pop()!;
      const index = parseInt(idxHex, 10) - 1;
      out.push(
        buildEngineItem({
          index,
          difficulty,
          overrides: {
            testlet_id: testletId,
            stage_id: def.stage_id,
          },
        }),
      );
    }
  }
  return out;
}

export function buildAdaptiveSession(overrides: Partial<SessionContext> = {}): SessionContext {
  return {
    session_id: SESSION_ID,
    mode: 'exam',
    engine_type: 'adaptive',
    total_items: 15,
    time_limit_ms: null,
    started_at: STARTED_AT,
    planned_items: buildAdaptiveItemPool(),
    target_skills: [],
    ...overrides,
  };
}

export function buildAdaptiveConfig(overrides: Partial<FrameworkConfig> = {}): FrameworkConfig {
  return buildLinearConfig({
    engine_type: 'adaptive',
    back_navigation_enabled: true, // within testlet
    time_limit_ms: null,
    adaptive_rules: buildAdaptiveRules(),
    ...overrides,
  });
}
