// hooks/intelligence.ts → intelligence-svc (per ADR-0029)
import { useQuery } from '@tanstack/react-query';
import { LearningDNADTOSchema, SkillProgressDTOSchema, CausalMapDTOSchema } from '@mm/types';
import { useMmClient } from '../context.js';
import { mmKeys } from '../keys.js';

// Stage 36: GET /intelligence/learner-profile/{student_id} → LearningDNADTO.
// Distinct from useLearningDNA (stub hook with wrong path retained as ISSUE-0026 pattern).
export function useLearnerProfile(studentId: string) {
  const client = useMmClient();
  return useQuery({
    queryKey: mmKeys.intelligence.learnerProfile(studentId),
    staleTime: 120_000,
    queryFn: () =>
      client
        .get(`/intelligence-svc/intelligence/learner-profile/${studentId}`, LearningDNADTOSchema)
        .then((r) => r.data),
    enabled: studentId.length > 0,
  });
}

// Stage 28+: dispatcher not in v1; body fix deferred to that stage.
// OWNERS.md:122 spells the future endpoint as
// `GET /intelligence/learner-profile/{student_id}`.
export function useLearningDNA(studentId: string) {
  const client = useMmClient();
  return useQuery({
    queryKey: mmKeys.intelligence.learningDNA(studentId),
    queryFn: () =>
      client.get('/intelligence-svc/intelligence/dna', LearningDNADTOSchema).then((r) => r.data),
    enabled: studentId.length > 0,
  });
}

// Stage 28+: dispatcher not in v1; body fix deferred to that stage.
export function useSkillProgress(skillId: string) {
  const client = useMmClient();
  return useQuery({
    queryKey: mmKeys.intelligence.skillProgress(skillId),
    queryFn: () =>
      client
        .get(`/intelligence-svc/intelligence/skills/${skillId}`, SkillProgressDTOSchema)
        .then((r) => r.data),
    enabled: skillId.length > 0,
  });
}

// Stage 36: path corrected to include {student_id} per arch §6.4 + OWNERS.md:123.
export function useCausalMap(studentId: string) {
  const client = useMmClient();
  return useQuery({
    queryKey: mmKeys.intelligence.causalMap(studentId),
    staleTime: 120_000,
    queryFn: () =>
      client
        .get(`/intelligence-svc/intelligence/causal-map/${studentId}`, CausalMapDTOSchema)
        .then((r) => r.data),
    enabled: studentId.length > 0,
  });
}
