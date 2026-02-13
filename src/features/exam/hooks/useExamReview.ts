import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../../lib/supabase";

// ────────────────────────────────────────────
// Types scoped to the review experience.
// These mirror DB rows but only include fields
// the review screen actually needs.
// ────────────────────────────────────────────

interface ReviewAttempt {
  id: string;
  exam_package_id: string;
  student_id: string;
  status: "started" | "submitted" | "evaluated";
  started_at: string;
  submitted_at: string | null;
}

interface ReviewExamPackage {
  id: string;
  title: string;
  year_level: number;
  subject: string;
  assessment_type: "naplan" | "icas";
  duration_minutes: number;
  total_marks: number;
  pass_mark_percentage: number | null;
}

interface ReviewQuestion {
  id: string;
  sequence_number: number;
  difficulty: "easy" | "medium" | "hard";
  response_type: "mcq" | "multi" | "short" | "extended" | "numeric";
  marks: number;
  prompt_blocks: PromptBlock[];
  hint: string | null;
  tags: string[];
}

// Prompt block union — mirrors Day 15 definition
type PromptBlock =
  | { type: "text"; content: string }
  | { type: "heading"; level: 1 | 2 | 3; content: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "quote"; content: string; attribution?: string }
  | { type: "instruction"; content: string }
  | { type: "image"; src: string; alt: string };

interface ReviewOption {
  question_id: string;
  option_id: string;
  content: string;
  media_reference: unknown;
}

interface ReviewResponse {
  question_id: string;
  response_type: "mcq" | "multi" | "short" | "extended" | "numeric";
  response_data: Record<string, unknown>;
  responded_at: string;
}

interface ReviewResult {
  total_score: number;
  max_score: number;
  percentage: number;
  passed: boolean;
  breakdown: QuestionBreakdown[];
}

/** Per-question scoring breakdown from score-attempt Edge Function.
 *
 * BUG-1 FIX: The Edge Function returns `score`, `max_score`, `is_correct`
 * but the review UI expects `marks_awarded`, `marks_possible`, `correct`.
 * We normalize at load time in the hook below.
 */
interface QuestionBreakdown {
  question_id: string;
  marks_awarded: number;
  marks_possible: number;
  correct: boolean;
  /** Extended responses may be flagged for manual review */
  requires_manual_review?: boolean;
  correct_answer?: unknown;
}

/**
 * Raw breakdown shape as stored in exam_results.breakdown JSONB.
 * The score-attempt Edge Function writes this format.
 */
interface RawBreakdownEntry {
  question_id: string;
  // Edge Function format
  score?: number;
  max_score?: number;
  is_correct?: boolean;
  // Possibly already normalized format
  marks_awarded?: number;
  marks_possible?: number;
  correct?: boolean;
  // Common fields
  requires_manual_review?: boolean;
  correct_answer?: unknown;
}

// ── Assembled review data for a single question ──

export interface ReviewQuestionData {
  question: ReviewQuestion;
  options: ReviewOption[];
  response: ReviewResponse | null;
  breakdown: QuestionBreakdown | null;
}

export interface ExamReviewData {
  attempt: ReviewAttempt;
  examPackage: ReviewExamPackage;
  questions: ReviewQuestionData[];
  result: ReviewResult | null;
  /** Computed: submitted_at − started_at in seconds */
  timeTakenSeconds: number | null;
}

type ReviewStatus =
  | "loading"
  | "ready"
  | "error"
  | "not-found"
  | "not-submitted";

export interface UseExamReviewReturn {
  status: ReviewStatus;
  data: ExamReviewData | null;
  error: string | null;
  /** Re-fetch all data */
  reload: () => void;
}

// ────────────────────────────────────────────
// Normalization helper (BUG-1 FIX)
// ────────────────────────────────────────────

/**
 * Normalizes a raw breakdown entry from the DB into the
 * canonical shape expected by ReviewQuestionCard.
 *
 * The score-attempt Edge Function stores:
 *   { score, max_score, is_correct }
 * but the review UI reads:
 *   { marks_awarded, marks_possible, correct }
 *
 * This function handles both formats gracefully.
 */
function normalizeBreakdownEntry(raw: RawBreakdownEntry): QuestionBreakdown {
  return {
    question_id: raw.question_id,
    marks_awarded: raw.marks_awarded ?? raw.score ?? 0,
    marks_possible: raw.marks_possible ?? raw.max_score ?? 0,
    correct: raw.correct ?? raw.is_correct ?? false,
    requires_manual_review: raw.requires_manual_review ?? false,
    correct_answer: raw.correct_answer,
  };
}

// ────────────────────────────────────────────
// Hook
// ────────────────────────────────────────────

export function useExamReview(
  attemptId: string | undefined,
): UseExamReviewReturn {
  const [status, setStatus] = useState<ReviewStatus>("loading");
  const [data, setData] = useState<ExamReviewData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!attemptId) {
      setStatus("not-found");
      setError("No attempt ID provided.");
      return;
    }

    setStatus("loading");
    setError(null);

    try {
      // 1. Fetch the attempt — RLS ensures only the owner can read this.
      const { data: attempt, error: attemptErr } = await supabase
        .from("exam_attempts")
        .select(
          "id, exam_package_id, student_id, status, started_at, submitted_at",
        )
        .eq("id", attemptId)
        .maybeSingle();

      if (attemptErr) throw attemptErr;
      if (!attempt) {
        setStatus("not-found");
        setError("Attempt not found or access denied.");
        return;
      }

      // Guard: only submitted or evaluated attempts are reviewable
      if (attempt.status === "started") {
        setStatus("not-submitted");
        setError("This attempt has not been submitted yet.");
        return;
      }

      // 2. Fetch the exam package metadata
      const { data: examPackage, error: pkgErr } = await supabase
        .from("exam_packages")
        .select(
          "id, title, year_level, subject, assessment_type, duration_minutes, total_marks, pass_mark_percentage",
        )
        .eq("id", attempt.exam_package_id)
        .single(); // package ID is a PK — safe to use .single()

      if (pkgErr) throw pkgErr;

      // 3. Fetch questions for this exam, ordered by sequence
      const { data: questions, error: qErr } = await supabase
        .from("exam_questions")
        .select(
          "id, sequence_number, difficulty, response_type, marks, prompt_blocks, hint, tags",
        )
        .eq("exam_package_id", attempt.exam_package_id)
        .order("sequence_number", { ascending: true });

      if (qErr) throw qErr;

      const questionIds = (questions ?? []).map((q) => q.id);

      // 4. Fetch options for all questions in one query
      const { data: options, error: optErr } = await supabase
        .from("exam_question_options")
        .select("question_id, option_id, content, media_reference")
        .in("question_id", questionIds.length > 0 ? questionIds : ["__none__"]);

      if (optErr) throw optErr;

      // 5. Fetch student responses for this attempt
      const { data: responses, error: respErr } = await supabase
        .from("exam_responses")
        .select("question_id, response_type, response_data, responded_at")
        .eq("attempt_id", attemptId);

      if (respErr) throw respErr;

      // 6. Fetch scored results (may not exist yet if not scored)
      const { data: result, error: resErr } = await supabase
        .from("exam_results")
        .select("total_score, max_score, percentage, passed, breakdown")
        .eq("attempt_id", attemptId)
        .maybeSingle(); // result may not exist

      if (resErr) throw resErr;

      // ── Assemble per-question review data ──

      const responseMap = new Map(
        (responses ?? []).map((r) => [r.question_id, r as ReviewResponse]),
      );

      // BUG-1 FIX: Normalize breakdown entries to canonical field names
      const breakdownMap = new Map<string, QuestionBreakdown>();
      if (result?.breakdown && Array.isArray(result.breakdown)) {
        for (const rawEntry of result.breakdown as RawBreakdownEntry[]) {
          breakdownMap.set(
            rawEntry.question_id,
            normalizeBreakdownEntry(rawEntry),
          );
        }
      }

      const assembledQuestions: ReviewQuestionData[] = (questions ?? []).map(
        (q) => ({
          question: {
            ...q,
            prompt_blocks: q.prompt_blocks as PromptBlock[],
            tags: q.tags ?? [],
          } as ReviewQuestion,
          options: (options ?? []).filter((o) => o.question_id === q.id),
          response: responseMap.get(q.id) ?? null,
          breakdown: breakdownMap.get(q.id) ?? null,
        }),
      );

      // ── Compute time taken ──
      let timeTakenSeconds: number | null = null;
      if (attempt.submitted_at && attempt.started_at) {
        const started = new Date(attempt.started_at).getTime();
        const submitted = new Date(attempt.submitted_at).getTime();
        timeTakenSeconds = Math.max(
          0,
          Math.round((submitted - started) / 1000),
        );
      }

      // BUG-1 FIX: Also normalize the top-level result breakdown array
      const normalizedResult: ReviewResult | null = result
        ? {
            total_score: result.total_score,
            max_score: result.max_score,
            percentage: result.percentage,
            passed: result.passed,
            breakdown: Array.isArray(result.breakdown)
              ? (result.breakdown as RawBreakdownEntry[]).map(
                  normalizeBreakdownEntry,
                )
              : [],
          }
        : null;

      setData({
        attempt: attempt as ReviewAttempt,
        examPackage: examPackage as ReviewExamPackage,
        questions: assembledQuestions,
        result: normalizedResult,
        timeTakenSeconds,
      });
      setStatus("ready");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to load review data.";
      setError(message);
      setStatus("error");
    }
  }, [attemptId]);

  useEffect(() => {
    load();
  }, [load]);

  return { status, data, error, reload: load };
}
