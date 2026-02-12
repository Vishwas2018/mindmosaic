/**
 * MindMosaic — Exam Detail Page
 *
 * Shows exam information and allows starting or resuming an attempt.
 */

import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase, callEdgeFunction } from "../../../lib/supabase";
import type { ExamPackage, ExamAttempt } from "../../../lib/database.types";
import { useAuth } from "../../../context/useAuth";
import type { StartAttemptResponse } from "../../../features/exam/types/exam.types";

// Subject display names
const SUBJECT_INFO: Record<string, { label: string; icon: string }> = {
  numeracy: { label: "Numeracy", icon: "🔢" },
  reading: { label: "Reading", icon: "📖" },
  writing: { label: "Writing", icon: "✍️" },
  "language-conventions": { label: "Language Conventions", icon: "📝" },
  mathematics: { label: "Mathematics", icon: "🧮" },
  english: { label: "English", icon: "📚" },
  science: { label: "Science", icon: "🔬" },
};

export function ExamDetailPage() {
  const { packageId } = useParams<{ packageId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [exam, setExam] = useState<ExamPackage | null>(null);
  const [existingAttempt, setExistingAttempt] = useState<ExamAttempt | null>(
    null
  );
  const [questionCount, setQuestionCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load exam details and check for existing attempt
  useEffect(() => {
    async function loadData() {
      if (!packageId || !user) return;

      setIsLoading(true);
      setError(null);

      try {
        // Fetch exam package
        const { data: examData, error: examError } = await supabase
          .from("exam_packages")
          .select("*")
          .eq("id", packageId)
          .eq("status", "published")
          .single();

        if (examError) {
          if (examError.code === "PGRST116") {
            throw new Error("Exam not found or not available");
          }
          throw new Error(`Failed to load exam: ${examError.message}`);
        }

        setExam(examData);

        // Fetch question count
        const { count, error: countError } = await supabase
          .from("exam_questions")
          .select("*", { count: "exact", head: true })
          .eq("exam_package_id", packageId);

        if (!countError && count !== null) {
          setQuestionCount(count);
        }

        // Check for existing in-progress attempt
        const { data: attemptData, error: attemptError } = await supabase
          .from("exam_attempts")
          .select("*")
          .eq("exam_package_id", packageId)
          .eq("student_id", user.id)
          .eq("status", "started")
          .order("started_at", { ascending: false })
          .limit(1)
          .single();

        if (!attemptError && attemptData) {
          setExistingAttempt(attemptData);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [packageId, user]);

  // Handle starting a new attempt
  const handleStartExam = async () => {
    if (!packageId) return;

    setIsStarting(true);
    setError(null);

    try {
      const { data, error: startError, status } =
        await callEdgeFunction<StartAttemptResponse>("start-attempt", {
          exam_package_id: packageId,
        });

      if (startError) {
        // Check if there's an existing attempt (409 conflict)
        if (status === 409 && data?.existing_attempt_id) {
          navigate(`/student/attempts/${data.existing_attempt_id}`);
          return;
        }
        throw new Error(startError);
      }

      if (data?.attempt_id) {
        navigate(`/student/attempts/${data.attempt_id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start exam");
      setIsStarting(false);
    }
  };

  // Handle resuming existing attempt
  const handleResumeExam = () => {
    if (existingAttempt) {
      navigate(`/student/attempts/${existingAttempt.id}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary-blue border-t-transparent mx-auto" />
          <p className="text-text-muted">Loading exam details...</p>
        </div>
      </div>
    );
  }

  if (error || !exam) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-danger-red mb-4">⚠️ {error || "Exam not found"}</p>
          <Link
            to="/student/exams"
            className="text-primary-blue hover:underline"
          >
            Back to exam list
          </Link>
        </div>
      </div>
    );
  }

  const subjectInfo = SUBJECT_INFO[exam.subject] || {
    label: exam.subject,
    icon: "📋",
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Back link */}
      <Link
        to="/student/exams"
        className="inline-flex items-center gap-1 text-text-muted hover:text-primary-blue mb-6"
      >
        ← Back to exams
      </Link>

      {/* Exam card */}
      <div className="bg-white rounded-xl border border-border-subtle shadow-sm overflow-hidden">
        {/* Header */}
        <div className="bg-primary-blue/5 px-6 py-8 text-center">
          <span className="text-5xl mb-4 block">{subjectInfo.icon}</span>
          <h1 className="text-2xl font-semibold text-text-primary mb-1">
            {exam.title}
          </h1>
          <p className="text-text-muted">{subjectInfo.label}</p>
        </div>

        {/* Meta info */}
        <div className="px-6 py-6 border-b border-border-subtle">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <MetaItem label="Duration" value={`${exam.duration_minutes} min`} />
            <MetaItem label="Questions" value={String(questionCount)} />
            <MetaItem label="Total Marks" value={String(exam.total_marks)} />
            <MetaItem label="Year Level" value={`Year ${exam.year_level}`} />
          </div>
        </div>

        {/* Instructions */}
        {exam.instructions && exam.instructions.length > 0 && (
          <div className="px-6 py-6 border-b border-border-subtle">
            <h2 className="font-medium text-text-primary mb-3">Instructions</h2>
            <ul className="space-y-2">
              {exam.instructions.map((instruction, index) => (
                <li
                  key={index}
                  className="flex items-start gap-2 text-text-muted text-sm"
                >
                  <span className="text-primary-blue shrink-0">•</span>
                  <span>{instruction}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Existing attempt notice */}
        {existingAttempt && (
          <div className="px-6 py-4 bg-accent-amber/10 border-b border-accent-amber/20">
            <p className="text-sm text-accent-amber font-medium">
              ⚠️ You have an in-progress attempt started{" "}
              {formatRelativeTime(new Date(existingAttempt.started_at))}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="px-6 py-6">
          {existingAttempt ? (
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleResumeExam}
                className="flex-1 py-3 px-6 rounded-lg bg-accent-amber text-white font-medium hover:bg-accent-amber/90 transition-colors"
              >
                Resume Exam
              </button>
              <button
                onClick={handleStartExam}
                disabled={isStarting}
                className="flex-1 py-3 px-6 rounded-lg bg-gray-100 text-text-muted font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                {isStarting ? "Starting..." : "Start New Attempt"}
              </button>
            </div>
          ) : (
            <button
              onClick={handleStartExam}
              disabled={isStarting}
              className="w-full py-4 px-6 rounded-lg bg-primary-blue text-white font-medium text-lg hover:bg-primary-blue-light transition-colors disabled:opacity-50 disabled:cursor-wait"
            >
              {isStarting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">⏳</span>
                  Starting...
                </span>
              ) : (
                "Start Exam"
              )}
            </button>
          )}

          {error && (
            <p className="mt-4 text-center text-sm text-danger-red">{error}</p>
          )}
        </div>
      </div>

      {/* Tips section */}
      <div className="mt-6 bg-background-soft rounded-lg p-4">
        <h3 className="font-medium text-text-primary mb-2">Before you start</h3>
        <ul className="space-y-1 text-sm text-text-muted">
          <li>• Find a quiet place where you won't be interrupted</li>
          <li>• Make sure you have enough time to complete the exam</li>
          <li>• Your answers are saved automatically as you go</li>
          <li>• You can review and change answers before submitting</li>
        </ul>
      </div>
    </div>
  );
}

// =============================================================================
// Helper Components
// =============================================================================

interface MetaItemProps {
  label: string;
  value: string;
}

function MetaItem({ label, value }: MetaItemProps) {
  return (
    <div>
      <p className="text-sm text-text-muted">{label}</p>
      <p className="text-lg font-semibold text-text-primary">{value}</p>
    </div>
  );
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
}
