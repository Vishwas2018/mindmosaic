// deno-lint-ignore-file no-explicit-any
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface RateLimitOpts {
  endpoint: string;
  key: string;
  limit: number;
  windowMinutes: number;
}

export async function checkRateLimit(
  db: SupabaseClient,
  opts: RateLimitOpts,
): Promise<boolean> {
  const { endpoint, key, limit, windowMinutes } = opts;
  const bucketKey = `${endpoint}:${key}`;

  const now = Date.now();
  const windowMs = windowMinutes * 60_000;
  const windowStart = new Date(Math.floor(now / windowMs) * windowMs).toISOString();

  const { data, error } = await db.rpc("fn_check_rate_limit", {
    p_bucket_key: bucketKey,
    p_window_start: windowStart,
    p_limit: limit,
  });

  if (error) {
    // Fail open — don't block legitimate traffic on DB error
    console.error(JSON.stringify({ level: "error", msg: "rate_limit_check_failed", error: error.message }));
    return true;
  }

  return data as boolean;
}
