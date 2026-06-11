/**
 * Headers required for every Edge Function → Edge Function service call.
 * The `Authorization: Bearer` satisfies Supabase's function-invocation gateway
 * (rejects unauthenticated requests with 401 before the handler runs).
 * `x-mm-service-role` is the application-level gate inside each receiver.
 * Both headers must travel together on every internal POST.
 */
export function buildInternalHeaders(serviceRoleKey: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${serviceRoleKey}`,
    'x-mm-service-role': serviceRoleKey,
  };
}
