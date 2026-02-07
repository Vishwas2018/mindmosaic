// =============================================================================
// MindMosaic Day 13: Submit Attempt Edge Function (FIXED AUTH)
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

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();

    if (!body.attempt_id) {
      return new Response(JSON.stringify({ error: "attempt_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(body.attempt_id)) {
      return new Response(
        JSON.stringify({ error: "Invalid attempt_id format" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Fetch attempt
    const { data: attempt, error: attemptError } = await supabase
      .from("exam_attempts")
      .select("id, exam_package_id, student_id, status")
      .eq("id", body.attempt_id)
      .single();

    if (attemptError || !attempt) {
      return new Response(JSON.stringify({ error: "Attempt not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (attempt.student_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "You do not own this attempt" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (attempt.status === "submitted" || attempt.status === "evaluated") {
      return new Response(
        JSON.stringify({ error: "Attempt already submitted" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Get counts
    const { count: totalQuestions } = await supabase
      .from("exam_questions")
      .select("id", { count: "exact", head: true })
      .eq("exam_package_id", attempt.exam_package_id);

    const { count: answeredQuestions } = await supabase
      .from("exam_responses")
      .select("id", { count: "exact", head: true })
      .eq("attempt_id", body.attempt_id);

    // Update status
    const submittedAt = new Date().toISOString();

    const { data: updatedAttempt, error: updateError } = await supabase
      .from("exam_attempts")
      .update({ status: "submitted", submitted_at: submittedAt })
      .eq("id", body.attempt_id)
      .eq("student_id", user.id)
      .eq("status", "started")
      .select("id, exam_package_id, submitted_at")
      .single();

    if (updateError || !updatedAttempt) {
      return new Response(
        JSON.stringify({ error: "Failed to submit attempt" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({
        attempt_id: updatedAttempt.id,
        exam_package_id: updatedAttempt.exam_package_id,
        submitted_at: updatedAttempt.submitted_at,
        total_questions: totalQuestions || 0,
        answered_questions: answeredQuestions || 0,
      }),
      {
        status: 200,
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
