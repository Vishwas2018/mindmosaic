import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';
import {
  LearningPlanDTOSchema,
  PathwayReadinessDTOSchema,
  type PlanOverrideRequest,
} from '@mm/types';
import { useMmClient } from '../context.js';
import { mmKeys } from '../keys.js';

// Plan override returns the updated plan.
const PlanOverrideAckSchema = { parse: (): void => undefined };

export function useLearningPlan(studentId: string) {
  const client = useMmClient();
  return useQuery({
    queryKey: mmKeys.orchestration.learningPlan(studentId),
    queryFn: () =>
      client.get('/orchestration/plan', LearningPlanDTOSchema).then((r) => r.data),
    enabled: studentId.length > 0,
  });
}

export function usePathwayReadiness(slug: string) {
  const client = useMmClient();
  return useQuery({
    queryKey: mmKeys.orchestration.pathwayReadiness(slug),
    queryFn: () =>
      client
        .get(`/orchestration/readiness/${slug}`, PathwayReadinessDTOSchema)
        .then((r) => r.data),
    enabled: slug.length > 0,
  });
}

/** X3: idempotencyKey per-mount. Not retry-safe without stable key. */
export function usePlanOverride(options?: { idempotencyKey?: string }) {
  const client = useMmClient();
  const qc = useQueryClient();
  const autoKey = useRef<string>(crypto.randomUUID());
  const idempotencyKey = options?.idempotencyKey ?? autoKey.current;
  return useMutation({
    mutationFn: (request: PlanOverrideRequest) =>
      client
        .post('/orchestration/overrides', PlanOverrideAckSchema, request, idempotencyKey)
        .then((r) => r.data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: mmKeys.orchestration.all() });
    },
  });
}
