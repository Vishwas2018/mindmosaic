import { useQuery } from '@tanstack/react-query';
import { PathwayDTOSchema, AssessmentProfileDTOSchema } from '@mm/types';
import { useMmClient } from '../context.js';
import { mmKeys } from '../keys.js';

const PathwayListSchema = PathwayDTOSchema.array();

export function usePathways() {
  const client = useMmClient();
  return useQuery({
    queryKey: mmKeys.pathways.list(),
    queryFn: () => client.get('/pathways', PathwayListSchema).then((r) => r.data),
  });
}

export function useAssessmentProfile(profileId: string) {
  const client = useMmClient();
  return useQuery({
    queryKey: mmKeys.assessmentProfiles.byId(profileId),
    queryFn: () =>
      client.get(`/content/profiles/${profileId}`, AssessmentProfileDTOSchema).then((r) => r.data),
    enabled: profileId.length > 0,
  });
}
