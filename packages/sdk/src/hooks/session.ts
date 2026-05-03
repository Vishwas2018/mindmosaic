import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';
import {
  CreateSessionResponseSchema,
  RecordResponseResponseSchema,
  SubmitSessionResponseSchema,
  SessionStateDTOSchema,
  SessionSummaryDTOSchema,
  type CreateSessionRequest,
  type RecordResponseRequest,
  type CheckpointRequest,
} from '@mm/types';
import { useMmClient } from '../context.js';
import { mmKeys } from '../keys.js';

// Checkpoint response has no defined shape in arch §6.3 — acknowledge as void.
const CheckpointAckSchema = { parse: (): void => undefined };

/** X3: idempotencyKey stabilised per-mount. Auto-generated key is not retry-safe across unmounts;
 *  pass a stable key when retrying after failure. */
export function useCreateSession(options?: { idempotencyKey?: string }) {
  const client = useMmClient();
  const autoKey = useRef<string>(crypto.randomUUID());
  const idempotencyKey = options?.idempotencyKey ?? autoKey.current;
  return useMutation({
    mutationFn: (request: CreateSessionRequest) =>
      client
        .post('/sessions', CreateSessionResponseSchema, request, idempotencyKey)
        .then((r) => r.data),
  });
}

export function useSessionState(sessionId: string) {
  const client = useMmClient();
  return useQuery({
    queryKey: mmKeys.sessions.state(sessionId),
    queryFn: () =>
      client.get(`/sessions/${sessionId}/state`, SessionStateDTOSchema).then((r) => r.data),
    enabled: sessionId.length > 0,
  });
}

export function useSessionSummary(sessionId: string) {
  const client = useMmClient();
  return useQuery({
    queryKey: mmKeys.sessions.summary(sessionId),
    queryFn: () =>
      client.get(`/sessions/${sessionId}/summary`, SessionSummaryDTOSchema).then((r) => r.data),
    enabled: sessionId.length > 0,
  });
}

/** X3: idempotencyKey per-mount. Not retry-safe without stable key. */
export function useRecordResponse(sessionId: string, options?: { idempotencyKey?: string }) {
  const client = useMmClient();
  const qc = useQueryClient();
  const autoKey = useRef<string>(crypto.randomUUID());
  const idempotencyKey = options?.idempotencyKey ?? autoKey.current;
  return useMutation({
    mutationFn: (request: RecordResponseRequest) =>
      client
        .post(`/sessions/${sessionId}/respond`, RecordResponseResponseSchema, request, idempotencyKey)
        .then((r) => r.data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: mmKeys.sessions.state(sessionId) });
    },
  });
}

/** X3: idempotencyKey per-mount. Not retry-safe without stable key. */
export function useSubmitSession(sessionId: string, options?: { idempotencyKey?: string }) {
  const client = useMmClient();
  const qc = useQueryClient();
  const autoKey = useRef<string>(crypto.randomUUID());
  const idempotencyKey = options?.idempotencyKey ?? autoKey.current;
  return useMutation({
    mutationFn: () =>
      client
        .post(`/sessions/${sessionId}/submit`, SubmitSessionResponseSchema, {}, idempotencyKey)
        .then((r) => r.data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: mmKeys.sessions.byId(sessionId) });
    },
  });
}

/** X3: idempotencyKey per-mount. Not retry-safe without stable key. */
export function useCheckpoint(sessionId: string, options?: { idempotencyKey?: string }) {
  const client = useMmClient();
  const autoKey = useRef<string>(crypto.randomUUID());
  const idempotencyKey = options?.idempotencyKey ?? autoKey.current;
  return useMutation({
    mutationFn: (request: CheckpointRequest) =>
      client
        .post(`/sessions/${sessionId}/checkpoint`, CheckpointAckSchema, request, idempotencyKey)
        .then((r) => r.data),
  });
}
