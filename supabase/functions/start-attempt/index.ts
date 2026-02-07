// =============================================================================
// MindMosaic Day 13: Start Attempt Edge Function (FIXED AUTH)
// =============================================================================
// @ts-expect-error Deno imports
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
// @ts-expect-error Deno imports
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const token = authHeader.replace("Bearer ", "");
    // @ts-expect-error Deno env
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    // @ts-expect-error Deno env
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Pass token directly to getUser - this is the key fix!
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized", details: authError?.message }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const body = await req.json();

    if (!body.exam_package_id) {
      return new Response(
        JSON.stringify({ error: "exam_package_id is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(body.exam_package_id)) {
      return new Response(
        JSON.stringify({ error: "Invalid exam_package_id format" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Check if user is a student
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: "User profile not found" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (profile.role !== "student") {
      return new Response(
        JSON.stringify({ error: "Only students can start exam attempts" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Check if exam package exists and is published
    const { data: examPackage, error: packageError } = await supabase
      .from("exam_packages")
      .select("id, title, status")
      .eq("id", body.exam_package_id)
      .single();

    if (packageError || !examPackage) {
      return new Response(
        JSON.stringify({ error: "Exam package not found or not available" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Check for existing active attempt
    const { data: existingAttempt } = await supabase
      .from("exam_attempts")
      .select("id, started_at")
      .eq("exam_package_id", body.exam_package_id)
      .eq("student_id", user.id)
      .eq("status", "started")
      .maybeSingle();

    if (existingAttempt) {
      return new Response(
        JSON.stringify({
          error: "Active attempt already exists",
          existing_attempt_id: existingAttempt.id,
          started_at: existingAttempt.started_at,
        }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Create new attempt
    const { data: newAttempt, error: insertError } = await supabase
      .from("exam_attempts")
      .insert({
        exam_package_id: body.exam_package_id,
        student_id: user.id,
        status: "started",
      })
      .select("id, exam_package_id, started_at")
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        return new Response(
          JSON.stringify({
            error: "Active attempt already exists (concurrent)",
          }),
          {
            status: 409,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      return new Response(
        JSON.stringify({
          error: "Failed to create attempt",
          details: insertError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({
        attempt_id: newAttempt.id,
        exam_package_id: newAttempt.exam_package_id,
        started_at: newAttempt.started_at,
      }),
      {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
