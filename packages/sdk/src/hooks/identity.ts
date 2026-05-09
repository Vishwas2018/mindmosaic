// hooks/identity.ts → users-svc (per ADR-0029)
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { UserMeDTOSchema, TenantDTOSchema } from '@mm/types';
import { useMmClient } from '../context.js';
import { mmKeys } from '../keys.js';

// Stage 36: child profile shape per handleGetChildren in users-svc/index.ts:194.
// No @mm/types schema — defined here as a UI-boundary type.
const ChildProfileSchema = z.object({
  student_id: z.string().uuid(),
  student: z.object({
    id: z.string().uuid(),
    display_name: z.string().nullable(),
    email: z.string().nullable(),
    year_level: z.number().nullable(),
    is_active: z.boolean(),
    created_at: z.string(),
  }),
  created_at: z.string(),
});
const ChildrenResponseSchema = z.object({ children: z.array(ChildProfileSchema) });
export type ChildProfile = z.infer<typeof ChildProfileSchema>;

export function useMe() {
  const client = useMmClient();
  return useQuery({
    queryKey: mmKeys.users.me(),
    queryFn: () => client.get('/users-svc/users/me', UserMeDTOSchema).then((r) => r.data),
  });
}

// Stage 36: GET /users/me/children → lists parent's linked student profiles.
export function useMyChildren() {
  const client = useMmClient();
  return useQuery({
    queryKey: mmKeys.users.children(),
    queryFn: () =>
      client.get('/users-svc/users/me/children', ChildrenResponseSchema).then((r) => r.data),
  });
}

// PHASE-2: not in v1 OWNERS.md — `/tenants/{id}` has no v1 dispatcher.
// Prefix is set per UTA ownership (auth-svc/users-svc) for future-stage path stability.
export function useTenant(tenantId: string) {
  const client = useMmClient();
  return useQuery({
    queryKey: mmKeys.tenants.byId(tenantId),
    queryFn: () =>
      client.get(`/users-svc/tenants/${tenantId}`, TenantDTOSchema).then((r) => r.data),
    enabled: tenantId.length > 0,
  });
}
