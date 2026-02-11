/**
 * MindMosaic — Exam List Page
 *
 * Student exam discovery page.
 * Lists all published exams available to the student.
 */

import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../../lib/supabase";
import type { ExamPackage, ExamAttempt } from "../../../lib/database.types";
import { useAuth } from "../../../context/AuthContext";

// Subject display names and icons
const SUBJECT_INFO: Record<string, { label: string; icon: string }> = {
  numeracy: { label: "Numeracy", icon: "🔢" },
  reading: { label: "Reading", icon: "📖" },
  writing: { label: "Writing", icon: "✍️" },
  "language-conventions": { label: "Language", icon: "📝" },
  mathematics: { label: "Mathematics", icon: "🧮" },
  english: { label: "English", icon: "📚" },
  science: { label: "Science", icon: "🔬" },
};

// Assessment type badges
const ASSESSMENT_BADGES: Record<string, { label: string; className: string }> =
  {
    naplan: { label: "NAPLAN", className: "bg-blue-100 text-blue-800" },
    icas: { label: "ICAS", className: "bg-purple-100 text-purple-800" },
  };

export function ExamListPage() {
  const { user } = useAuth();
  const [exams, setExams] = useState<ExamPackage[]>([]);
  const [attempts, setAttempts] = useState<Map<string, ExamAttempt>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      // Fetch published exams
      const { data: examData, error: examError } = await supabase
        .from("exam_packages")
        .select("*")
        .eq("status", "published")
        .order("year_level")
        .order("subject");

      if (examError) {
        throw new Error(`Failed to load exams: ${examError.message}`);
      }

      setExams(examData || []);

      // Fetch student's existing attempts
      const { data: attemptData, error: attemptError } = await supabase
        .from("exam_attempts")
        .select("*")
        .eq("student_id", user.id);

      if (attemptError) {
        console.warn("Failed to load attempts:", attemptError.message);
      } else if (attemptData) {
        const attemptMap = new Map<string, ExamAttempt>();
        attemptData.forEach((attempt) => {
          // Keep the most recent attempt per exam
          const existing = attemptMap.get(attempt.exam_package_id);
          if (
            !existing ||
            new Date(attempt.started_at) > new Date(existing.started_at)
          ) {
            attemptMap.set(attempt.exam_package_id, attempt);
          }
        });
        setAttempts(attemptMap);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Fetch exams and existing attempts
  useEffect(() => {
    loadData();
  }, [loadData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary-blue border-t-transparent mx-auto" />
          <p className="text-text-muted">Loading exams...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-danger-red mb-4">⚠️ {error}</p>
          <button
            onClick={loadData}
            className="text-primary-blue hover:underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (exams.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-text-muted text-lg mb-2">No exams available</p>
          <p className="text-text-muted text-sm">
            Check back later for new practice exams.
          </p>
        </div>
      </div>
    );
  }

  // Group exams by year level
  const examsByYear = exams.reduce(
    (acc, exam) => {
      const year = exam.year_level;
      if (!acc[year]) {
        acc[year] = [];
      }
      acc[year].push(exam);
      return acc;
    },
    {} as Record<number, ExamPackage[]>,
  );

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-text-primary">
          Practice Exams
        </h1>
        <p className="text-text-muted mt-1">
          Select an exam to start or continue practicing
        </p>
      </header>

      {Object.entries(examsByYear)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([year, yearExams]) => (
          <section key={year}>
            <h2 className="text-lg font-medium text-text-primary mb-4">
              Year {year}
            </h2>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {yearExams.map((exam) => (
                <ExamCard
                  key={exam.id}
                  exam={exam}
                  attempt={attempts.get(exam.id)}
                />
              ))}
            </div>
          </section>
        ))}
    </div>
  );
}

// =============================================================================
// Exam Card Component
// =============================================================================

interface ExamCardProps {
  exam: ExamPackage;
  attempt?: ExamAttempt;
}

function ExamCard({ exam, attempt }: ExamCardProps) {
  const subjectInfo = SUBJECT_INFO[exam.subject] || {
    label: exam.subject,
    icon: "📋",
  };
  const assessmentBadge = ASSESSMENT_BADGES[exam.assessment_type];

  // Determine action based on attempt status
  const getAction = () => {
    if (!attempt) {
      return { label: "Start", href: `/student/exams/${exam.id}` };
    }

    switch (attempt.status) {
      case "started":
        return {
          label: "Resume",
          href: `/student/attempts/${attempt.id}`,
          variant: "warning" as const,
        };
      case "submitted":
      case "evaluated":
        return {
          label: "Review",
          href: `/student/attempts/${attempt.id}/review`,
          variant: "success" as const,
        };
      default:
        return { label: "Start", href: `/student/exams/${exam.id}` };
    }
  };

  const action = getAction();

  return (
    <div className="bg-white rounded-lg border border-border-subtle p-5 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <span className="text-3xl" aria-hidden="true">
          {subjectInfo.icon}
        </span>
        <span
          className={`px-2 py-1 text-xs font-medium rounded ${assessmentBadge.className}`}
        >
          {assessmentBadge.label}
        </span>
      </div>

      {/* Title */}
      <h3 className="font-semibold text-text-primary mb-1">{exam.title}</h3>
      <p className="text-sm text-text-muted mb-4">{subjectInfo.label}</p>

      {/* Meta info */}
      <div className="flex items-center gap-4 text-sm text-text-muted mb-4">
        <span className="flex items-center gap-1">
          <span aria-hidden="true">⏱️</span>
          {exam.duration_minutes} min
        </span>
        <span className="flex items-center gap-1">
          <span aria-hidden="true">📝</span>
          {exam.total_marks} marks
        </span>
      </div>

      {/* Status badge (if applicable) */}
      {attempt && (
        <div className="mb-4">
          <AttemptStatusBadge status={attempt.status} />
        </div>
      )}

      {/* Action button */}
      <Link
        to={action.href}
        className={`
          block w-full py-2 px-4 rounded-lg text-center font-medium transition-colors
          ${
            action.variant === "warning"
              ? "bg-accent-amber/10 text-accent-amber hover:bg-accent-amber/20"
              : action.variant === "success"
                ? "bg-success-green/10 text-success-green hover:bg-success-green/20"
                : "bg-primary-blue text-white hover:bg-primary-blue-light"
          }
        `}
      >
        {action.label}
      </Link>
    </div>
  );
}

// =============================================================================
// Attempt Status Badge
// =============================================================================

interface AttemptStatusBadgeProps {
  status: ExamAttempt["status"];
}

function AttemptStatusBadge({ status }: AttemptStatusBadgeProps) {
  switch (status) {
    case "started":
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-accent-amber">
          <span className="w-2 h-2 rounded-full bg-accent-amber animate-pulse" />
          In Progress
        </span>
      );
    case "submitted":
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-primary-blue">
          <span className="w-2 h-2 rounded-full bg-primary-blue" />
          Submitted
        </span>
      );
    case "evaluated":
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-success-green">
          <span className="w-2 h-2 rounded-full bg-success-green" />
          Marked
        </span>
      );
    default:
      return null;
  }
}
