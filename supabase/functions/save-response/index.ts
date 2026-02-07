// =============================================================================
// MindMosaic Day 13: Save Response Edge Function (FIXED AUTH)
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

function validateResponseData(
  responseType: string,
  data: Record<string, unknown>,
): string | null {
  switch (responseType) {
    case "mcq":
      if (!data.selectedOptionId || typeof data.selectedOptionId !== "string") {
        return "MCQ response must have selectedOptionId";
      }
      if (!["A", "B", "C", "D"].includes(data.selectedOptionId.toUpperCase())) {
        return "selectedOptionId must be A, B, C, or D";
      }
      break;
    case "multi":
      if (!Array.isArray(data.selectedOptionIds)) {
        return "Multi-select response must have selectedOptionIds array";
      }
      break;
    case "short":
    case "extended":
      if (typeof data.answer !== "string") {
        return `${responseType} response must have answer as string`;
      }
      break;
    case "numeric":
      if (typeof data.answer !== "number") {
        return "Numeric response must have answer as number";
      }
      break;
  }
  return null;
}

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

    if (!body.attempt_id || !body.question_id || !body.response_data) {
      return new Response(
        JSON.stringify({
          error: "attempt_id, question_id, and response_data are required",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(body.attempt_id) || !uuidRegex.test(body.question_id)) {
      return new Response(JSON.stringify({ error: "Invalid UUID format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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

    if (attempt.status !== "started") {
      return new Response(
        JSON.stringify({ error: "Cannot save - attempt already submitted" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Verify question belongs to exam
    const { data: question, error: questionError } = await supabase
      .from("exam_questions")
      .select("id, exam_package_id, response_type")
      .eq("id", body.question_id)
      .single();

    if (questionError || !question) {
      return new Response(JSON.stringify({ error: "Question not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (question.exam_package_id !== attempt.exam_package_id) {
      return new Response(
        JSON.stringify({ error: "Question does not belong to this exam" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Validate response_data
    const validationError = validateResponseData(
      question.response_type,
      body.response_data,
    );
    if (validationError) {
      return new Response(JSON.stringify({ error: validationError }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if response exists
    const { data: existingResponse } = await supabase
      .from("exam_responses")
      .select("id")
      .eq("attempt_id", body.attempt_id)
      .eq("question_id", body.question_id)
      .maybeSingle();

    const isUpdate = !!existingResponse;

    // Upsert response
    const { data: savedResponse, error: upsertError } = await supabase
      .from("exam_responses")
      .upsert(
        {
          attempt_id: body.attempt_id,
          question_id: body.question_id,
          response_type: question.response_type,
          response_data: body.response_data,
          responded_at: new Date().toISOString(),
        },
        { onConflict: "attempt_id,question_id" },
      )
      .select("id, question_id, responded_at")
      .single();

    if (upsertError) {
      return new Response(
        JSON.stringify({ error: "Failed to save response" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({
        response_id: savedResponse.id,
        question_id: savedResponse.question_id,
        responded_at: savedResponse.responded_at,
        is_update: isUpdate,
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
