// hooks/assignments.ts → assignments-svc (ADR-0029 prefix: /assignments-svc/assignments/...)
// Stage 37: Screen 18 Block 6 — assignments widget for teacher dashboard.
// Stage 39: Screen 22 — full CRUD + tracking hooks for teacher assignment engine.
import { useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import {
  AssignmentDTOSchema,
  AssignmentTrackingDTOSchema,
  type CreateAssignmentRequest,
} from '@mm/types';
import { useMmClient } from '../context.js';
import { mmKeys } from '../keys.js';

// Lightweight DTO for dashboard display; full AssignmentDTO is in @mm/types.
const AssignmentSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.string(),
  due_at: z.string().nullable(),
  mode: z.string(),
  item_count: z.number(),
  auto_generated: z.boolean(),
  created_at: z.string(),
  published_at: z.string().nullable(),
  archived_at: z.string().nullable(),
});

export type AssignmentSummary = z.infer<typeof AssignmentSummarySchema>;

// StudentAssignment DTO — assignment + student's completion status (Screen 20, Stage 38).
const StudentAssignmentSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.string(),
  due_at: z.string().nullable(),
  mode: z.string(),
  item_count: z.number(),
  auto_generated: z.boolean(),
  created_at: z.string(),
  published_at: z.string().nullable(),
  archived_at: z.string().nullable(),
  my_status: z.string().nullable().optional(),
  my_session_id: z.string().nullable().optional(),
  completed_at: z.string().nullable().optional(),
});

export type StudentAssignmentDTO = z.infer<typeof StudentAssignmentSchema>;

// Stage 38: teacher fetching a student's assignment list for student detail page (Screen 20).
export function useStudentAssignments(studentId: string) {
  const client = useMmClient();
  return useQuery({
    queryKey: mmKeys.assignments.forStudent(studentId),
    queryFn: () =>
      client
        .get(
          `/assignments-svc/assignments/for-student/${encodeURIComponent(studentId)}`,
          z.array(StudentAssignmentSchema),
        )
        .then((r) => r.data),
    enabled: studentId.length > 0,
  });
}

// Screen 18 Block 6: class assignments for the ProgressBar widget.
// assignments-svc returns the array directly as response body (jsonOk(result.data ?? [])).
export function useAssignmentsForClass(classId: string) {
  const client = useMmClient();
  return useQuery({
    queryKey: mmKeys.assignments.forClass(classId),
    queryFn: () =>
      client
        .get(
          `/assignments-svc/assignments/for-class/${encodeURIComponent(classId)}`,
          z.array(AssignmentSummarySchema),
        )
        .then((r) => r.data),
    enabled: classId.length > 0,
  });
}

// Stage 39: Screen 22 — teacher assignment engine hooks.

// GET /assignments/{id} — single assignment detail.
export function useAssignment(id: string) {
  const client = useMmClient();
  return useQuery({
    queryKey: mmKeys.assignments.byId(id),
    queryFn: () =>
      client
        .get(`/assignments-svc/assignments/${encodeURIComponent(id)}`, AssignmentDTOSchema)
        .then((r) => r.data),
    enabled: id.length > 0,
  });
}

// GET /assignments/{id}/tracking — per-student completion status.
export function useAssignmentTracking(id: string) {
  const client = useMmClient();
  return useQuery({
    queryKey: mmKeys.assignments.tracking(id),
    queryFn: () =>
      client
        .get(
          `/assignments-svc/assignments/${encodeURIComponent(id)}/tracking`,
          AssignmentTrackingDTOSchema,
        )
        .then((r) => r.data),
    enabled: id.length > 0,
  });
}

// POST /assignments — create draft assignment. Idempotency-Key per BUILD_CONTRACT + C-C-D-V C13.
// useRef generates one stable key per hook mount (safe retry; new key on remount).
export function useCreateAssignment() {
  const client = useMmClient();
  const queryClient = useQueryClient();
  const idempKey = useRef<string>(crypto.randomUUID());
  return useMutation({
    mutationFn: (body: CreateAssignmentRequest) =>
      client
        .post(
          '/assignments-svc/assignments',
          AssignmentDTOSchema,
          body,
          idempKey.current,
        )
        .then((r) => r.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: mmKeys.assignments.all() });
    },
  });
}

// PATCH /assignments/{id} — update draft assignment (pre-publish only).
export function useUpdateAssignment() {
  const client = useMmClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<CreateAssignmentRequest> }) =>
      client
        .patch(
          `/assignments-svc/assignments/${encodeURIComponent(id)}`,
          AssignmentDTOSchema,
          body,
        )
        .then((r) => r.data),
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({ queryKey: mmKeys.assignments.byId(id) });
      void queryClient.invalidateQueries({ queryKey: mmKeys.assignments.all() });
    },
  });
}

// POST /assignments/{id}/publish — publish draft. Idempotency-Key per C-C-D-V C13.
export function usePublishAssignment() {
  const client = useMmClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      client
        .post(
          `/assignments-svc/assignments/${encodeURIComponent(id)}/publish`,
          AssignmentDTOSchema,
          {},
          crypto.randomUUID(),
        )
        .then((r) => r.data),
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({ queryKey: mmKeys.assignments.byId(id) });
      void queryClient.invalidateQueries({ queryKey: mmKeys.assignments.all() });
    },
  });
}

// POST /assignments/{id}/start — student starts an assignment session.
// Idempotency-Key per arch §4.8 + C-C-D-V C5.
// ISSUE-0023 ongoing: Idempotency-Key accepted + logged server-side; dedup enforcement v1.1.
export function useStartAssignment() {
  const client = useMmClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      client
        .post(
          `/assignments-svc/assignments/${encodeURIComponent(id)}/start`,
          z.object({ session_id: z.string(), assignment_session_status: z.string() }),
          {},
          crypto.randomUUID(),
        )
        .then((r) => r.data),
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({ queryKey: mmKeys.assignments.forStudent('') });
      void queryClient.invalidateQueries({ queryKey: mmKeys.assignments.byId(id) });
    },
  });
}

// POST /assignments/{id}/archive — archive published assignment.
export function useArchiveAssignment() {
  const client = useMmClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      client
        .post(
          `/assignments-svc/assignments/${encodeURIComponent(id)}/archive`,
          AssignmentDTOSchema,
          {},
          crypto.randomUUID(),
        )
        .then((r) => r.data),
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({ queryKey: mmKeys.assignments.byId(id) });
      void queryClient.invalidateQueries({ queryKey: mmKeys.assignments.all() });
    },
  });
}
