// Stage 39 — assignment contract tests.
// Guards: D1 PathwayDTOSchema.id fix; CreateAssignmentRequestSchema mode enum;
// AssignmentTrackingDTOSchema shape; toServerMode vocabulary parity.

import { describe, it, expect } from 'vitest';
import {
  PathwayDTOSchema,
  CreateAssignmentRequestSchema,
  AssignmentTrackingDTOSchema,
  AssignmentDTOSchema,
} from '../index.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const PATHWAY_BASE = {
  slug: 'naplan-y5',
  display_name: 'NAPLAN Y5 Numeracy',
  exam_family: 'NAPLAN',
  program: 'Y5 Numeracy',
  year_levels: [5],
  entitled: true,
  locked_reason: null,
};

const ASSIGNMENT_BASE = {
  id: '00000000-0000-0000-0000-000000000003',
  title: 'Fractions Practice',
  description: null,
  mode: 'practice',
  pathway_id: '00000000-0000-0000-0000-000000000010',
  target_skill_ids: [],
  target_skill_names: [],
  difficulty_range: null,
  item_count: 10,
  time_limit_ms: null,
  due_at: null,
  status: 'published',
  auto_generated: false,
  rationale: null,
  created_by: { id: '00000000-0000-0000-0000-000000000004', display_name: 'Teacher' },
  created_at: '2026-05-11T00:00:00.000Z',
  published_at: '2026-05-11T00:00:00.000Z',
};

const CREATE_REQUEST_BASE = {
  title: 'Fractions Practice',
  mode: 'practice',
  pathway_id: '00000000-0000-0000-0000-000000000010',
  target_skill_ids: [],
  item_count: 10,
  targets: [{ type: 'class', id: '00000000-0000-0000-0000-000000000020' }],
};

// ── PathwayDTOSchema (D1) ─────────────────────────────────────────────────────

describe('PathwayDTOSchema — D1 id field guard', () => {
  it('rejects pathway payload that is missing the id field', () => {
    expect(PathwayDTOSchema.safeParse(PATHWAY_BASE).success).toBe(false);
  });

  it('accepts pathway payload with a valid UUID id', () => {
    const result = PathwayDTOSchema.safeParse({
      ...PATHWAY_BASE,
      id: '00000000-0000-0000-0000-000000000099',
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.id).toBe('00000000-0000-0000-0000-000000000099');
  });

  it('rejects pathway payload with a non-UUID id', () => {
    expect(
      PathwayDTOSchema.safeParse({ ...PATHWAY_BASE, id: 'not-a-uuid' }).success,
    ).toBe(false);
  });
});

// ── CreateAssignmentRequestSchema ─────────────────────────────────────────────

describe('CreateAssignmentRequestSchema — mode enum', () => {
  it('accepts practice mode', () => {
    expect(CreateAssignmentRequestSchema.safeParse(CREATE_REQUEST_BASE).success).toBe(true);
  });

  it('accepts skill_drill mode (Q-39.8 server-side vocabulary)', () => {
    expect(
      CreateAssignmentRequestSchema.safeParse({ ...CREATE_REQUEST_BASE, mode: 'skill_drill' }).success,
    ).toBe(true);
  });

  it('accepts all valid modes: practice, exam, diagnostic, skill_drill', () => {
    for (const mode of ['practice', 'exam', 'diagnostic', 'skill_drill']) {
      const result = CreateAssignmentRequestSchema.safeParse({ ...CREATE_REQUEST_BASE, mode });
      expect(result.success, `mode '${mode}' should be accepted`).toBe(true);
    }
  });

  it('rejects wizard-internal mode "skill" (must be mapped to skill_drill at boundary)', () => {
    expect(
      CreateAssignmentRequestSchema.safeParse({ ...CREATE_REQUEST_BASE, mode: 'skill' }).success,
    ).toBe(false);
  });

  it('rejects missing required fields', () => {
    expect(
      CreateAssignmentRequestSchema.safeParse({
        title: CREATE_REQUEST_BASE.title,
        mode: CREATE_REQUEST_BASE.mode,
        pathway_id: CREATE_REQUEST_BASE.pathway_id,
        target_skill_ids: CREATE_REQUEST_BASE.target_skill_ids,
        item_count: CREATE_REQUEST_BASE.item_count,
      }).success,
    ).toBe(false);
  });
});

// ── AssignmentTrackingDTOSchema ───────────────────────────────────────────────

describe('AssignmentTrackingDTOSchema', () => {
  const TRACKING = {
    assignment_id: '00000000-0000-0000-0000-000000000003',
    targets: [
      {
        student_id: '00000000-0000-0000-0000-000000000005',
        display_name: 'Alice',
        status: 'completed',
        session_id: '00000000-0000-0000-0000-000000000006',
        score: 0.85,
        completed_at: '2026-05-11T09:00:00.000Z',
      },
      {
        student_id: '00000000-0000-0000-0000-000000000007',
        display_name: 'Bob',
        status: 'pending',
        session_id: null,
        score: null,
        completed_at: null,
      },
    ],
    completion_rate: 0.5,
  };

  it('parses a valid tracking DTO with mixed-status targets', () => {
    const result = AssignmentTrackingDTOSchema.safeParse(TRACKING);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.targets).toHaveLength(2);
      expect(result.data.completion_rate).toBe(0.5);
    }
  });

  it('accepts a target with null session_id and null score', () => {
    const result = AssignmentTrackingDTOSchema.safeParse({
      ...TRACKING,
      targets: [TRACKING.targets[1]],
    });
    expect(result.success).toBe(true);
  });

  it('rejects when completion_rate is absent', () => {
    expect(
      AssignmentTrackingDTOSchema.safeParse({
        assignment_id: TRACKING.assignment_id,
        targets: TRACKING.targets,
      }).success,
    ).toBe(false);
  });
});

// ── AssignmentDTOSchema ───────────────────────────────────────────────────────

describe('AssignmentDTOSchema', () => {
  it('parses a valid published assignment', () => {
    const result = AssignmentDTOSchema.safeParse(ASSIGNMENT_BASE);
    expect(result.success).toBe(true);
  });

  it('accepts difficulty_range with min/max bounds', () => {
    const result = AssignmentDTOSchema.safeParse({
      ...ASSIGNMENT_BASE,
      difficulty_range: { min: 0, max: 0.35 },
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.difficulty_range?.max).toBe(0.35);
  });
});

// ── CreateAssignmentRequestSchema — composer_params + simulation_params (v1.1-S4) ──

const CREATE_REQUEST_EXAM_BASE = {
  ...CREATE_REQUEST_BASE,
  mode: 'exam',
};

const VALID_COMPOSER_PARAMS = {
  item_count: 20,
  difficulty_distribution: { easy: 7, mid: 8, hard: 5 },
  time_limit_ms: 3_600_000,
};

const VALID_SIMULATION_PARAMS = {
  no_back_nav: true,
  hide_feedback_until_submit: true,
};

describe('CreateAssignmentRequestSchema — composer_params (v1.1-S4)', () => {
  it('accepts request without composer_params (optional)', () => {
    expect(CreateAssignmentRequestSchema.safeParse(CREATE_REQUEST_EXAM_BASE).success).toBe(true);
  });

  it('accepts request with valid composer_params', () => {
    const result = CreateAssignmentRequestSchema.safeParse({
      ...CREATE_REQUEST_EXAM_BASE,
      composer_params: VALID_COMPOSER_PARAMS,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.composer_params?.item_count).toBe(20);
      expect(result.data.composer_params?.difficulty_distribution.easy).toBe(7);
    }
  });

  it('rejects composer_params when difficulty_distribution does not sum to item_count', () => {
    const result = CreateAssignmentRequestSchema.safeParse({
      ...CREATE_REQUEST_EXAM_BASE,
      composer_params: {
        item_count: 20,
        difficulty_distribution: { easy: 5, mid: 5, hard: 5 }, // sum=15, not 20
        time_limit_ms: 3_600_000,
      },
    });
    expect(result.success).toBe(false);
  });
});

describe('CreateAssignmentRequestSchema — simulation_params (v1.1-S4)', () => {
  it('accepts request without simulation_params (optional)', () => {
    expect(CreateAssignmentRequestSchema.safeParse(CREATE_REQUEST_EXAM_BASE).success).toBe(true);
  });

  it('accepts request with valid simulation_params', () => {
    const result = CreateAssignmentRequestSchema.safeParse({
      ...CREATE_REQUEST_EXAM_BASE,
      simulation_params: VALID_SIMULATION_PARAMS,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.simulation_params?.no_back_nav).toBe(true);
      expect(result.data.simulation_params?.hide_feedback_until_submit).toBe(true);
    }
  });

  it('accepts both composer_params and simulation_params together', () => {
    const result = CreateAssignmentRequestSchema.safeParse({
      ...CREATE_REQUEST_EXAM_BASE,
      composer_params: VALID_COMPOSER_PARAMS,
      simulation_params: VALID_SIMULATION_PARAMS,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.composer_params).toBeDefined();
      expect(result.data.simulation_params).toBeDefined();
    }
  });
});
