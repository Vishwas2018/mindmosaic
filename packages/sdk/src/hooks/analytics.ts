// hooks/analytics.ts → analytics-svc (ADR-0029 prefix: /analytics-svc/analytics/...)
// Stage 37: Screen 18 — teacher dashboard KPIs, intervention alerts, dismiss/acknowledge.
// Stage 39: Screen 22 — useGenerateAssignment (generate-assignment endpoint).
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { useMmClient } from '../context.js';
import { mmKeys } from '../keys.js';

// ── Schemas ──────────────────────────────────────────────────────────────────

const InterventionAlertSchema = z.object({
  id: z.string(),
  student_id: z.string(),
  alert_type: z.string(),
  severity: z.string(),
  status: z.string(),
  detail: z.unknown(),
  created_at: z.string(),
});
const ClassKpiSchema = z.object({
  active_students: z.number(),
  avg_class_score: z.number().nullable(),
  sessions_this_week: z.number(),
  assignments_active: z.number(),
  computed_at: z.string(),
  stale_since: z.null(),
});
export type InterventionAlert = z.infer<typeof InterventionAlertSchema>;
export type ClassKpiDTO = z.infer<typeof ClassKpiSchema>;

// ── Hooks ────────────────────────────────────────────────────────────────────

// Screen 18 Block 3: active intervention alerts for a class.
// jsonOk sends the array directly as the response body — schema = z.array.
export function useInterventionAlerts(classId: string) {
  const client = useMmClient();
  return useQuery({
    queryKey: mmKeys.analytics.interventionAlerts(classId),
    queryFn: () =>
      client
        .get(
          `/analytics-svc/analytics/intervention-alerts?class_id=${encodeURIComponent(classId)}`,
          z.array(InterventionAlertSchema),
        )
        .then((r) => r.data),
    enabled: classId.length > 0,
  });
}

// Screen 18 Block 2: 4-stat class KPI strip.
// jsonOk sends ClassKpiDTO directly as the response body.
// ISSUE-0028: trend sparkline absent v1; static last-score shown.
export function useClassKpi(classId: string) {
  const client = useMmClient();
  return useQuery({
    queryKey: mmKeys.analytics.classKpi(classId),
    queryFn: () =>
      client
        .get(
          `/analytics-svc/analytics/class-kpi/${encodeURIComponent(classId)}`,
          ClassKpiSchema,
        )
        .then((r) => r.data),
    enabled: classId.length > 0,
  });
}

// Stage 38: POST /analytics/intervention-alerts — teacher manual flag (Screen 20, Q-38.5).
export function useFlagForReview() {
  const client = useMmClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      studentId,
      classId,
      reason,
    }: {
      studentId: string;
      classId: string;
      reason: string;
    }) =>
      client
        .post(
          '/analytics-svc/analytics/intervention-alerts',
          InterventionAlertSchema,
          { student_id: studentId, class_id: classId, reason },
        )
        .then((r) => r.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: mmKeys.analytics.all() });
    },
  });
}

// Screen 18 Block 3: dismiss or acknowledge an intervention alert.
export function useDismissAlert() {
  const client = useMmClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      alertId,
      action,
    }: {
      alertId: string;
      action: 'dismiss' | 'acknowledge';
    }) => {
      const body = action === 'dismiss' ? { dismissed: true } : { acknowledged: true };
      return client
        .patch(
          `/analytics-svc/analytics/intervention-alerts/${encodeURIComponent(alertId)}`,
          InterventionAlertSchema,
          body,
        )
        .then((r) => r.data);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: mmKeys.analytics.all() });
    },
  });
}

// Stage 39: POST /analytics/generate-assignment — AI-suggested draft for wizard step 2 pre-populate.
// Returns DraftAssignmentDTO (analytics-svc/handlers.ts:734). No INSERT — pure suggestion.
// Q-39.UI-3: caller sends {class_id, mode} only; topic chips are display-only suggestions.
// Q-39.5: DraftAssignmentDTO has no pathway_id; caller resolves via usePathways().data[0].id.
const DraftAssignmentDTOSchema = z.object({
  title: z.string(),
  description: z.string().nullable(),
  mode: z.string(),
  target_skill_ids: z.array(z.string()),
  target_skill_names: z.array(z.string()),
  difficulty_range: z.object({ min: z.number(), max: z.number() }).nullable(),
  item_count: z.number().int(),
  time_limit_ms: z.number().int().nullable(),
  due_at: z.string().nullable(),
  status: z.literal('draft'),
  auto_generated: z.boolean(),
  rationale: z.string().nullable(),
  created_by: z.object({ id: z.string(), display_name: z.string() }),
  published_at: z.null(),
});
export type DraftAssignmentDTO = z.infer<typeof DraftAssignmentDTOSchema>;

export function useGenerateAssignment() {
  const client = useMmClient();
  return useMutation({
    mutationFn: ({ classId, mode }: { classId: string; mode: string }) =>
      client
        .post(
          '/analytics-svc/analytics/generate-assignment',
          DraftAssignmentDTOSchema,
          { class_id: classId, mode },
          crypto.randomUUID(),
        )
        .then((r) => r.data),
  });
}
