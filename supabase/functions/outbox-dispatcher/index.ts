import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { CORS_HEADERS } from "../_shared/cors.ts";

Deno.serve(async (req: Request) => {
  const t0 = Date.now();

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  const { data, error } = await supabase.rpc("fn_drain_outbox_batch");

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": CORS_HEADERS["Access-Control-Allow-Origin"] } },
    );
  }

  return new Response(
    JSON.stringify({ drained: data as number, took_ms: Date.now() - t0 }),
    { status: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": CORS_HEADERS["Access-Control-Allow-Origin"] } },
  );
});
