import { useQuery } from '@tanstack/react-query';
import { LearningDNADTOSchema, SkillProgressDTOSchema, CausalMapDTOSchema } from '@mm/types';
import { useMmClient } from '../context.js';
import { mmKeys } from '../keys.js';

export function useLearningDNA(studentId: string) {
  const client = useMmClient();
  return useQuery({
    queryKey: mmKeys.intelligence.learningDNA(studentId),
    queryFn: () =>
      client.get('/intelligence/dna', LearningDNADTOSchema).then((r) => r.data),
    enabled: studentId.length > 0,
  });
}

export function useSkillProgress(skillId: string) {
  const client = useMmClient();
  return useQuery({
    queryKey: mmKeys.intelligence.skillProgress(skillId),
    queryFn: () =>
      client
        .get(`/intelligence/skills/${skillId}`, SkillProgressDTOSchema)
        .then((r) => r.data),
    enabled: skillId.length > 0,
  });
}

export function useCausalMap(studentId: string) {
  const client = useMmClient();
  return useQuery({
    queryKey: mmKeys.intelligence.causalMap(studentId),
    queryFn: () => client.get('/intelligence/causal-map', CausalMapDTOSchema).then((r) => r.data),
    enabled: studentId.length > 0,
  });
}
