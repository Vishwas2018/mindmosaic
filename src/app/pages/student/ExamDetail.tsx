/**
 * MindMosaic — Exam Detail Page (UI Polish Pass)
 *
 * Changes from original:
 * - Warmer pre-exam messaging ("You've got this!")
 * - Larger text and more generous card padding
 * - rounded-2xl and shadow-sm on main card
 * - Friendlier duration/marks display
 * - Clearer primary action button
 * - Encouraging tone for resume state
 * - Better empty/error states
 *
 * No logic, routing, or data flow changes.
 */

import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "../../../lib/supabase";
import { callEdgeFunction } from "../../../lib/supabase";
import type { ExamPackage, ExamAttempt } from "../../../lib/database.types";
import { useAuth } from "../../../context/useAuth";

export function ExamDetailPage() {
  const { packageId } = useParams<{ packageId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [examPackage, setExamPackage] = useState<ExamPackage | null>(null);
  const [existingAttempt, setExistingAttempt] = useState<ExamAttempt | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!user || !packageId) return;

      setIsLoading(true);
      setError(null);

      try {
        // Fetch exam package
        const { data: pkg, error: pkgError } = await supabase
          .from("exam_packages")
          .select("*")
          .eq("id", packageId)
          .eq("status", "published")
          .single();

        if (pkgError || !pkg) {
          setError("This exam isn't available right now.");
          setIsLoading(false);
          return;
        }

        setExamPackage(pkg);

        // Check for existing in-progress attempt
        const { data: attemptData } = await supabase
          .from("exam_attempts")
          .select("*")
          .eq("exam_package_id", packageId)
          .eq("student_id", user.id)
          .eq("status", "in_progress")
          .order("started_at", { ascending: false })
          .limit(1);

        if (attemptData && attemptData.length > 0) {
          setExistingAttempt(attemptData[0]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [user, packageId]);

  const handleStart = async () => {
    if (!packageId) return;

    setIsStarting(true);
    setError(null);

    try {
      const { data, error: startError } = await callEdgeFunction(
        "start-attempt",
        { exam_package_id: packageId },
      );

      if (startError || !data?.attempt_id) {
        setError("Couldn't start the exam. Please try again.");
        return;
      }

      navigate(`/student/attempts/${data.attempt_id}`);
    } catch {
      setError("Something went wrong starting the exam.");
    } finally {
      setIsStarting(false);
    }
  };

  // Loading
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary-blue border-t-transparent" />
          <p className="text-lg text-text-muted">Loading exam details…</p>
        </div>
      </div>
    );
  }

  // Not found
  if (!examPackage) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <p className="text-4xl" aria-hidden="true">
          🔍
        </p>
        <h2 className="mt-4 text-xl font-semibold text-text-primary">
          Exam not found
        </h2>
        <p className="mt-2 text-base leading-relaxed text-text-muted">
          {error || "This exam doesn't exist or isn't available right now."}
        </p>
        <Link
          to="/student/exams"
          className="mt-6 inline-block rounded-xl bg-primary-blue px-8 py-3 text-base font-medium text-white hover:bg-primary-blue-light"
        >
          Back to Exams
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl py-8">
      <Link
        to="/student/exams"
        className="mb-6 inline-block text-sm font-medium text-primary-blue hover:underline"
      >
        ← Back to Exams
      </Link>

      <div className="rounded-2xl border border-border-subtle bg-white p-8 shadow-sm">
        {/* Exam title and meta */}
        <h1 className="text-2xl font-bold text-text-primary">
          {examPackage.title}
        </h1>
        <p className="mt-1 text-base text-text-muted">
          Year {examPackage.year_level} · {examPackage.subject}
        </p>

        {/* Exam details */}
        <div className="mt-6 flex flex-wrap gap-6 text-base text-text-muted">
          {examPackage.duration_minutes && (
            <div className="flex items-center gap-2">
              <span aria-hidden="true">⏱️</span>
              <span>{examPackage.duration_minutes} minutes</span>
            </div>
          )}
          {examPackage.total_marks && (
            <div className="flex items-center gap-2">
              <span aria-hidden="true">📊</span>
              <span>{examPackage.total_marks} marks</span>
            </div>
          )}
        </div>

        {/* Instructions */}
        {examPackage.instructions && (
          <div className="mt-6 rounded-xl bg-background-soft p-6">
            <h2 className="text-sm font-medium text-text-primary">
              Before you begin
            </h2>
            <p className="mt-2 text-base leading-relaxed text-text-muted">
              {examPackage.instructions}
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-6 rounded-xl bg-danger-red/10 p-4">
            <p className="text-sm text-danger-red">{error}</p>
          </div>
        )}

        {/* Action area */}
        <div className="mt-8">
          {existingAttempt ? (
            <div>
              <p className="mb-4 text-base leading-relaxed text-text-muted">
                📘 You have an exam in progress. Pick up right where you left
                off — your answers are saved.
              </p>
              <button
                onClick={() =>
                  navigate(`/student/attempts/${existingAttempt.id}`)
                }
                className="w-full rounded-xl bg-accent-amber px-8 py-3.5 text-base font-medium text-white hover:bg-amber-500 sm:w-auto"
              >
                Continue Exam
              </button>
            </div>
          ) : (
            <div>
              <p className="mb-4 text-base leading-relaxed text-text-muted">
                Take your time and do your best. Your answers are saved
                automatically so nothing gets lost. You've got this! 💪
              </p>
              <button
                onClick={handleStart}
                disabled={isStarting}
                className="w-full rounded-xl bg-primary-blue px-8 py-3.5 text-base font-medium text-white hover:bg-primary-blue-light disabled:opacity-50 sm:w-auto"
              >
                {isStarting ? "Starting…" : "Start Exam"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
