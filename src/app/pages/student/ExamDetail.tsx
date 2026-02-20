/**
 * MindMosaic — ExamDetail Page (Mode-aware update)
 *
 * What changed:
 * - Reads pending mode from sessionStorage to show mode-appropriate copy
 * - Loading, error, resume, and start copy adjusted per mode
 *
 * What did NOT change:
 * - All Supabase queries (same tables, same shapes)
 * - callEdgeFunction('start-attempt', ...) — untouched
 * - setExamModeForAttempt integration (already present)
 * - Routing params and navigation targets
 */

import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase, callEdgeFunction } from "../../../lib/supabase";
import type { ExamPackage, ExamAttempt } from "../../../lib/database.types";
import { useAuth } from "../../../context/useAuth";
import { setExamModeForAttempt, type ExamMode } from "../../../types/exam-mode";
import { Button } from "../../../shared/ui/Button";

interface StartAttemptFunctionResponse {
  attempt_id: string;
}

export function ExamDetailPage() {
  const { examId } = useParams<{ examId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [examPackage, setExamPackage] = useState<ExamPackage | null>(null);
  const [existingAttempt, setExistingAttempt] = useState<ExamAttempt | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Read the mode that ExamListPage stored before navigating here
  const [pendingMode] = useState<ExamMode>(() => {
    const stored = sessionStorage.getItem(`mm_pending_mode_${examId}`);
    return stored === "naplan" ? "naplan" : "practice";
  });

  const isPractice = pendingMode === "practice";

  useEffect(() => {
    if (!user || !examId) return;

    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        const { data: pkg, error: pkgErr } = await supabase
          .from("exam_packages")
          .select("*")
          .eq("id", examId)
          .eq("status", "published")
          .single();

        if (pkgErr || !pkg) {
          setError("This exam isn't available right now.");
          setIsLoading(false);
          return;
        }

        setExamPackage(pkg as ExamPackage);

        const { data: attemptData } = await supabase
          .from("exam_attempts")
          .select("*")
          .eq("exam_package_id", examId)
          .eq("student_id", user.id)
          .eq("status", "started")
          .order("started_at", { ascending: false })
          .limit(1);

        const rows = (attemptData as ExamAttempt[] | null) ?? [];
        if (rows.length > 0) setExistingAttempt(rows[0]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      } finally {
        setIsLoading(false);
      }
    }

    load();
  }, [user, examId]);

  const handleStart = async () => {
    if (!examId) return;

    setIsStarting(true);
    setError(null);

    try {
      const { data, error: startErr } =
        await callEdgeFunction<StartAttemptFunctionResponse>("start-attempt", {
          exam_package_id: examId,
        });

      if (startErr || !data?.attempt_id) {
        setError("Couldn't start the exam. Please try again.");
        return;
      }

      const attemptId = data.attempt_id;

      // Transfer mode from sessionStorage keyed by examId → keyed by attemptId
      const stored = sessionStorage.getItem(`mm_pending_mode_${examId}`);
      if (stored === "naplan" || stored === "practice") {
        setExamModeForAttempt(attemptId, stored);
        sessionStorage.removeItem(`mm_pending_mode_${examId}`);
      }

      navigate(`/student/attempt/${attemptId}`);
    } catch {
      setError("Something went wrong starting the exam.");
    } finally {
      setIsStarting(false);
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center animate-fade-in">
          <div
            className="mx-auto mb-4 h-7 w-7 animate-spin rounded-full border-4 border-[--color-accent] border-t-transparent"
            aria-hidden="true"
          />
          <p className="text-sm text-[--color-text-muted]">
            Loading exam details…
          </p>
        </div>
      </div>
    );
  }

  // ── Not found ────────────────────────────────────────────────────────────

  if (!examPackage) {
    return (
      <div className="mx-auto max-w-md py-20 text-center animate-fade-in">
        <p className="text-4xl" aria-hidden="true">
          🔍
        </p>
        <h2 className="mt-4 text-xl font-bold text-[--color-text-primary]">
          Exam not found
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[--color-text-muted]">
          {error ?? "This exam doesn't exist or isn't available right now."}
        </p>
        <Link to="/student/exams">
          <Button variant="primary" size="md" className="mt-6">
            Back to Exams
          </Button>
        </Link>
      </div>
    );
  }

  // ── Detail ───────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-2xl py-8 px-4 animate-fade-in">
      <Link
        to="/student/exams"
        className="focus-ring mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-[--color-text-muted] hover:text-[--color-text-primary] transition-colors"
      >
        ← Back to Exams
      </Link>

      <div className="mm-card p-7">
        {/* Mode badge */}
        <span className="mb-4 inline-block rounded-[--radius-pill] bg-[--color-accent-subtle] px-3 py-0.5 text-xs font-bold text-[--color-accent]">
          {isPractice ? "Practice Mode" : "NAPLAN Simulation"}
        </span>

        {/* Title */}
        <h1 className="text-2xl font-extrabold text-[--color-text-primary] leading-snug">
          {examPackage.title}
        </h1>
        <p className="mt-1 text-sm text-[--color-text-muted]">
          Year {examPackage.year_level} · {examPackage.subject}
        </p>

        {/* Meta */}
        <div className="mt-5 flex flex-wrap gap-5 text-sm text-[--color-text-muted]">
          {examPackage.duration_minutes && (
            <span className="flex items-center gap-1.5">
              <span aria-hidden="true">⏱</span>
              {examPackage.duration_minutes} minutes
            </span>
          )}
          {examPackage.total_marks && (
            <span className="flex items-center gap-1.5">
              <span aria-hidden="true">📊</span>
              {examPackage.total_marks} marks
            </span>
          )}
        </div>

        {/* Instructions */}
        {examPackage.instructions && (
          <div className="mt-6 rounded-[--radius-md] bg-[--color-surface-subtle] border border-[--color-border] p-5">
            <h2 className="text-xs font-bold uppercase tracking-widest text-[--color-text-muted] mb-2">
              Before you begin
            </h2>
            <p className="text-sm leading-relaxed text-[--color-text-primary]">
              {examPackage.instructions}
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-5 rounded-[--radius-md] bg-[--color-danger-subtle] px-4 py-3">
            <p className="text-sm text-[--color-danger]">{error}</p>
          </div>
        )}

        {/* Action area */}
        <div className="mt-8">
          {existingAttempt ? (
            <div>
              <p className="mb-4 text-sm leading-relaxed text-[--color-text-muted]">
                {isPractice
                  ? "You have an exam in progress. Pick up right where you left off — your answers are saved."
                  : "You have an attempt in progress. Continue from where you left off."}
              </p>
              <Button
                variant="primary"
                size="lg"
                onClick={() => {
                  // Always refresh the mode for the attempt before navigating so
                  // the exam shell picks up the correct practice/naplan context.
                  setExamModeForAttempt(existingAttempt.id, pendingMode);
                  navigate(`/student/attempt/${existingAttempt.id}`);
                }}
              >
                Continue Exam
              </Button>
            </div>
          ) : (
            <div>
              <p className="mb-4 text-sm leading-relaxed text-[--color-text-muted]">
                {isPractice
                  ? "Take your time and do your best. Your answers save automatically. You've got this! 💪"
                  : "This exam runs under authentic NAPLAN conditions. Ensure you are in a quiet environment before beginning."}
              </p>
              <Button
                variant="primary"
                size="lg"
                onClick={handleStart}
                isLoading={isStarting}
                disabled={isStarting}
              >
                {isStarting
                  ? "Starting…"
                  : isPractice
                    ? "Start Exam"
                    : "Begin Exam"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
