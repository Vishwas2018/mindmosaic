/**
 * Feature gate helper.
 *
 * Stage 19: assessment-svc /sessions/create gates by
 * `pathway.required_feature_key` per OWNERS.md line 58 — the assessment-svc
 * is the authoritative server-side enforcement point for tier entitlement.
 * content-svc surfaces the field for client filtering, but the trustworthy
 * check happens here.
 *
 * Resolution rule (mirrors content-svc/handlers.ts entitlement merge):
 *   - tenant-scoped flag wins if present (tenant_id = $tenant)
 *   - else platform default (tenant_id IS NULL) applies
 *   - else feature is NOT enabled (deny by default)
 */

export interface FeatureFlagDbClient {
  from(table: string): {
    select: (cols: string) => {
      eq: (col: string, val: unknown) => {
        in?: (col: string, vals: unknown[]) => Promise<{
          data: FeatureFlagRow[] | null;
          error: { message: string } | null;
        }>;
        or?: (cond: string) => Promise<{
          data: FeatureFlagRow[] | null;
          error: { message: string } | null;
        }>;
      } & PromiseLike<{
        data: FeatureFlagRow[] | null;
        error: { message: string } | null;
      }>;
    };
  };
}

export interface FeatureFlagRow {
  feature_key: string;
  tenant_id: string | null;
  enabled: boolean;
}

export type FeatureGateResult =
  | { allowed: true }
  | { allowed: false; status: 402; code: 'FEATURE_GATED'; message: string; details: { feature_key: string } };

/**
 * Check whether a tenant has a feature enabled.
 *
 * featureKey may be null (e.g. pathway has no required_feature_key) — in which
 * case the call is a no-op and returns allowed=true.
 */
export async function checkFeatureFlag(
  client: FeatureFlagDbClient,
  tenantId: string,
  featureKey: string | null,
): Promise<FeatureGateResult> {
  if (featureKey === null) return { allowed: true };

  const { data, error } = await client
    .from('feature_flag')
    .select('feature_key, tenant_id, enabled')
    .eq('feature_key', featureKey);

  if (error !== null) {
    return {
      allowed: false,
      status: 402,
      code: 'FEATURE_GATED',
      message: `Feature flag lookup failed: ${error.message}`,
      details: { feature_key: featureKey },
    };
  }

  const rows = (data ?? []) as FeatureFlagRow[];
  const tenantRow = rows.find(r => r.tenant_id === tenantId);
  const platformRow = rows.find(r => r.tenant_id === null);
  const winning = tenantRow ?? platformRow;
  const enabled = winning?.enabled ?? false;

  if (!enabled) {
    return {
      allowed: false,
      status: 402,
      code: 'FEATURE_GATED',
      message: `Feature '${featureKey}' is not enabled for tenant`,
      details: { feature_key: featureKey },
    };
  }
  return { allowed: true };
}
