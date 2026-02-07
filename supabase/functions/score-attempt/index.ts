// =============================================================================
// MindMosaic Day 14 HARDENED: Score Attempt Edge Function (FIXED AUTH)
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

interface QuestionBreakdown {
  question_id: string;
  response_type: string;
  score: number;
  max_score: number;
  is_correct: boolean;
  requires_manual_review: boolean;
}

interface CorrectAnswer {
  question_id: string;
  answer_type: string;
  correct_option_id: string | null;
  accepted_answers: string[] | null;
  case_sensitive: boolean | null;
  exact_value: number | null;
  range_min: number | null;
  range_max: number | null;
  tolerance: number | null;
}

interface StudentResponse {
  question_id: string;
  response_type: string;
  response_data: Record<string, unknown>;
}

interface Question {
  id: string;
  response_type: string;
  marks: number;
}

// Scoring functions
function scoreMCQ(
  response: StudentResponse,
  correctAnswer: CorrectAnswer,
): { isCorrect: boolean } {
  const selected = response.response_data?.selectedOptionId as string;
  const correct = correctAnswer.correct_option_id;
  if (!selected || !correct) return { isCorrect: false };
  return { isCorrect: selected.toUpperCase() === correct.toUpperCase() };
}

function scoreMultiSelect(
  response: StudentResponse,
  correctAnswer: CorrectAnswer,
): { isCorrect: boolean } {
  const selected =
    (response.response_data?.selectedOptionIds as string[]) || [];
  const correct = correctAnswer.accepted_answers || [];
  const selectedSet = new Set(selected.map((s) => String(s).toUpperCase()));
  const correctSet = new Set(correct.map((s) => String(s).toUpperCase()));
  if (selectedSet.size !== correctSet.size) return { isCorrect: false };
  for (const item of selectedSet) {
    if (!correctSet.has(item)) return { isCorrect: false };
  }
  return { isCorrect: true };
}

function scoreShort(
  response: StudentResponse,
  correctAnswer: CorrectAnswer,
): { isCorrect: boolean } {
  const studentAnswer = (response.response_data?.answer as string) || "";
  const acceptedAnswers = correctAnswer.accepted_answers || [];
  const caseSensitive = correctAnswer.case_sensitive ?? false;
  if (!studentAnswer.trim()) return { isCorrect: false };
  const normalized = caseSensitive
    ? studentAnswer.trim()
    : studentAnswer.trim().toLowerCase();
  for (const accepted of acceptedAnswers) {
    const normalizedAccepted = caseSensitive
      ? String(accepted).trim()
      : String(accepted).trim().toLowerCase();
    if (normalized === normalizedAccepted) return { isCorrect: true };
  }
  return { isCorrect: false };
}

function scoreNumeric(
  response: StudentResponse,
  correctAnswer: CorrectAnswer,
): { isCorrect: boolean } {
  const answer = response.response_data?.answer;
  const numericAnswer =
    typeof answer === "number" ? answer : parseFloat(String(answer));
  if (isNaN(numericAnswer)) return { isCorrect: false };
  if (correctAnswer.exact_value != null) {
    const tolerance = correctAnswer.tolerance ?? 0;
    return {
      isCorrect:
        Math.abs(numericAnswer - correctAnswer.exact_value) <= tolerance,
    };
  }
  if (correctAnswer.range_min != null && correctAnswer.range_max != null) {
    return {
      isCorrect:
        numericAnswer >= correctAnswer.range_min &&
        numericAnswer <= correctAnswer.range_max,
    };
  }
  return { isCorrect: false };
}

function scoreQuestion(
  question: Question,
  response: StudentResponse | undefined,
  correctAnswer: CorrectAnswer | undefined,
): QuestionBreakdown {
  const maxScore = question.marks || 1;
  const breakdown: QuestionBreakdown = {
    question_id: question.id,
    response_type: question.response_type,
    score: 0,
    max_score: maxScore,
    is_correct: false,
    requires_manual_review: false,
  };

  if (!response || !correctAnswer) return breakdown;

  switch (question.response_type) {
    case "mcq": {
      const result = scoreMCQ(response, correctAnswer);
      breakdown.is_correct = result.isCorrect;
      breakdown.score = result.isCorrect ? maxScore : 0;
      break;
    }
    case "multi": {
      const result = scoreMultiSelect(response, correctAnswer);
      breakdown.is_correct = result.isCorrect;
      breakdown.score = result.isCorrect ? maxScore : 0;
      break;
    }
    case "short": {
      const result = scoreShort(response, correctAnswer);
      breakdown.is_correct = result.isCorrect;
      breakdown.score = result.isCorrect ? maxScore : 0;
      break;
    }
    case "numeric": {
      const result = scoreNumeric(response, correctAnswer);
      breakdown.is_correct = result.isCorrect;
      breakdown.score = result.isCorrect ? maxScore : 0;
      break;
    }
    case "extended": {
      breakdown.requires_manual_review = true;
      break;
    }
  }
  return breakdown;
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

    if (attempt.status === "started") {
      return new Response(
        JSON.stringify({ error: "Attempt has not been submitted yet" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Check for existing result (idempotency)
    const { data: existingResult } = await supabase
      .from("exam_results")
      .select("*")
      .eq("attempt_id", body.attempt_id)
      .maybeSingle();

    if (existingResult) {
      return new Response(
        JSON.stringify({
          attempt_id: existingResult.attempt_id,
          total_score: existingResult.total_score,
          max_score: existingResult.max_score,
          percentage: parseFloat(existingResult.percentage),
          passed: existingResult.passed,
          evaluated_at: existingResult.evaluated_at,
          breakdown: existingResult.breakdown,
          message: "Already evaluated",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Fetch exam package
    const { data: examPackage } = await supabase
      .from("exam_packages")
      .select("id, pass_mark_percentage")
      .eq("id", attempt.exam_package_id)
      .single();

    const passMarkPercentage = examPackage?.pass_mark_percentage ?? 50;

    // Fetch questions
    const { data: questions } = await supabase
      .from("exam_questions")
      .select("id, response_type, marks")
      .eq("exam_package_id", attempt.exam_package_id)
      .order("sequence_number");

    if (!questions || questions.length === 0) {
      return new Response(JSON.stringify({ error: "No questions found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch correct answers via SECURITY DEFINER RPC
    const { data: correctAnswers, error: answersError } = await supabase.rpc(
      "get_correct_answers_for_scoring",
      { p_attempt_id: body.attempt_id },
    );

    if (answersError) {
      console.error("RPC error:", answersError);
      return new Response(
        JSON.stringify({
          error: "Failed to load scoring data",
          details: answersError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const answerMap = new Map<string, CorrectAnswer>();
    for (const a of correctAnswers || []) {
      answerMap.set(a.question_id, a);
    }

    // Fetch responses
    const { data: responses } = await supabase
      .from("exam_responses")
      .select("question_id, response_type, response_data")
      .eq("attempt_id", body.attempt_id);

    const responseMap = new Map<string, StudentResponse>();
    for (const r of responses || []) {
      responseMap.set(r.question_id, r);
    }

    // Score
    const breakdown: QuestionBreakdown[] = [];
    let totalScore = 0;
    let maxScore = 0;

    for (const q of questions) {
      const result = scoreQuestion(
        { ...q, marks: q.marks || 1 },
        responseMap.get(q.id),
        answerMap.get(q.id),
      );
      breakdown.push(result);
      totalScore += result.score;
      maxScore += result.max_score;
    }

    const percentage =
      maxScore > 0 ? Math.round((totalScore / maxScore) * 10000) / 100 : 0;
    const passed = percentage >= passMarkPercentage;

    // Insert result via SECURITY DEFINER RPC
    const { data: insertResult, error: insertError } = await supabase.rpc(
      "insert_exam_result",
      {
        p_attempt_id: body.attempt_id,
        p_total_score: totalScore,
        p_max_score: maxScore,
        p_percentage: percentage,
        p_passed: passed,
        p_breakdown: breakdown,
      },
    );

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(
        JSON.stringify({
          error: "Failed to save result",
          details: insertError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const savedResult = insertResult?.[0];
    if (!savedResult) {
      return new Response(
        JSON.stringify({ error: "Failed to retrieve saved result" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Mark attempt evaluated
    await supabase.rpc("mark_attempt_evaluated", {
      p_attempt_id: body.attempt_id,
    });

    return new Response(
      JSON.stringify({
        attempt_id: body.attempt_id,
        total_score: savedResult.total_score,
        max_score: savedResult.max_score,
        percentage: parseFloat(savedResult.percentage),
        passed: savedResult.passed,
        evaluated_at: savedResult.evaluated_at,
        breakdown: savedResult.breakdown,
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
