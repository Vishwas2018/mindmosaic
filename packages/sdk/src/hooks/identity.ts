import { useQuery } from '@tanstack/react-query';
import { UserMeDTOSchema, TenantDTOSchema } from '@mm/types';
import { useMmClient } from '../context.js';
import { mmKeys } from '../keys.js';

export function useMe() {
  const client = useMmClient();
  return useQuery({
    queryKey: mmKeys.users.me(),
    queryFn: () => client.get('/users/me', UserMeDTOSchema).then((r) => r.data),
  });
}

export function useTenant(tenantId: string) {
  const client = useMmClient();
  return useQuery({
    queryKey: mmKeys.tenants.byId(tenantId),
    queryFn: () => client.get(`/tenants/${tenantId}`, TenantDTOSchema).then((r) => r.data),
    enabled: tenantId.length > 0,
  });
}
