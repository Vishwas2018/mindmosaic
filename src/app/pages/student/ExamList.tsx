/**
 * MindMosaic — Exam List Page (Day 24)
 *
 * Enhancements over UI polish pass:
 * - Uses <Card variant="interactive"> for exam tiles
 * - Uses animate-fade-in on page load, stagger-children on card grids
 * - Uses animate-slide-up on individual cards
 * - Uses focus-ring on all interactive elements
 * - Uses touch-target on action buttons
 * - Loading/empty/error states use animate-fade-in
 *
 * No logic, routing, or data flow changes.
 */

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../../lib/supabase";
import type { ExamPackage, ExamAttempt } from "../../../lib/database.types";
import { useAuth } from "../../../context/useAuth";
import { Card } from "../../../components/ui/card";

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

  useEffect(() => {
    async function loadData() {
      if (!user) return;

      setIsLoading(true);
      setError(null);

      try {
        const { data: examData, error: examError } = await supabase
          .from("exam_packages")
          .select("*")
          .eq("status", "published")
          .order("year_level")
          .order("subject");

        if (examError) {
          throw new Error(`Failed to load exams: ${examError.message}`);
        }

        setExams((examData as ExamPackage[] | null) ?? []);

        const { data: attemptData, error: attemptError } = await supabase
          .from("exam_attempts")
          .select("*")
          .eq("student_id", user.id);

        if (attemptError) {
          console.warn("Failed to load attempts:", attemptError.message);
        } else if (attemptData) {
          const attemptRows = (attemptData as ExamAttempt[]) ?? [];
          const attemptMap = new Map<string, ExamAttempt>();
          attemptRows.forEach((attempt) => {
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
        setError(
          err instanceof Error
            ? err.message
            : "Something went wrong loading exams.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [user]);

  // Loading state
  if (isLoading) {
    return (
      <div className="animate-fade-in flex items-center justify-center py-20">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary-blue border-t-transparent" />
          <p className="text-lg text-text-muted">Finding your exams…</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="animate-fade-in mx-auto max-w-md py-20 text-center">
        <p className="text-4xl" aria-hidden="true">
          😕
        </p>
        <h2 className="mt-4 text-xl font-semibold text-text-primary">
          Couldn't load exams
        </h2>
        <p className="mt-2 text-base leading-relaxed text-text-muted">
          {error}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="focus-ring touch-target mt-6 rounded-xl bg-primary-blue px-8 py-3 text-base font-medium text-white hover:bg-primary-blue-light"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Empty state
  if (exams.length === 0) {
    return (
      <div className="animate-fade-in mx-auto max-w-md py-20 text-center">
        <p className="text-4xl" aria-hidden="true">
          📘
        </p>
        <h2 className="mt-4 text-xl font-semibold text-text-primary">
          No exams available yet
        </h2>
        <p className="mt-2 text-base leading-relaxed text-text-muted">
          New practice exams are added regularly. Check back soon!
        </p>
      </div>
    );
  }

  // Group exams by year level
  const grouped = new Map<number, ExamPackage[]>();
  exams.forEach((exam) => {
    const group = grouped.get(exam.year_level) || [];
    group.push(exam);
    grouped.set(exam.year_level, group);
  });

  return (
    <div className="animate-fade-in space-y-10">
      <header>
        <h1 className="text-3xl font-semibold text-text-primary">
          📘 Practice Exams
        </h1>
        <p className="mt-2 text-lg leading-relaxed text-text-muted">
          Choose an exam to get started. Take your time — there's no rush.
        </p>
      </header>

      {Array.from(grouped.entries())
        .sort(([a], [b]) => a - b)
        .map(([yearLevel, yearExams]) => (
          <section key={yearLevel}>
            <h2 className="mb-4 text-xl font-medium text-text-primary">
              Year {yearLevel}
            </h2>
            <div className="stagger-children grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {yearExams.map((exam) => {
                const attempt = attempts.get(exam.id);
                return <ExamCard key={exam.id} exam={exam} attempt={attempt} />;
              })}
            </div>
          </section>
        ))}
    </div>
  );
}

// =============================================================================
// Exam Card
// =============================================================================

function ExamCard({
  exam,
  attempt,
}: {
  exam: ExamPackage;
  attempt?: ExamAttempt;
}) {
  const subject = SUBJECT_INFO[exam.subject] || {
    label: exam.subject,
    icon: "📄",
  };
  const badge = ASSESSMENT_BADGES[exam.assessment_type];

  // Determine status and action
  let statusLabel = "";
  let statusClassName = "";
  let actionLabel = "Start Exam";
  let actionTo = `/student/exams/${exam.id}`;

  if (attempt) {
    if (attempt.status === "started") {
      statusLabel = "In Progress";
      statusClassName = "text-accent-amber bg-accent-amber/10";
      actionLabel = "Continue";
      actionTo = `/student/attempt/${attempt.id}`;
    } else if (
      attempt.status === "submitted" ||
      attempt.status === "evaluated"
    ) {
      statusLabel = "Completed";
      statusClassName = "text-success-green bg-success-green/10";
      actionLabel = "Review";
      actionTo = `/student/review/${attempt.id}`;
    }
  }

  return (
    <div className="animate-slide-up">
      <Card
        variant="interactive"
        padding="normal"
        className="flex h-full flex-col"
      >
        {/* Header row */}
        <div className="mb-4 flex items-start justify-between">
          <span className="text-3xl" aria-hidden="true">
            {subject.icon}
          </span>
          {badge && (
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${badge.className}`}
            >
              {badge.label}
            </span>
          )}
        </div>

        {/* Title and meta */}
        <h3 className="text-lg font-semibold leading-snug text-text-primary">
          {exam.title}
        </h3>
        <p className="mt-1 text-base text-text-muted">{subject.label}</p>

        {/* Details */}
        <div className="mt-3 flex flex-wrap gap-3 text-sm text-text-muted">
          {exam.duration_minutes && (
            <span className="flex items-center gap-1">
              <span aria-hidden="true">⏱️</span>
              {exam.duration_minutes} min
            </span>
          )}
          {exam.total_marks && (
            <span className="flex items-center gap-1">
              <span aria-hidden="true">📊</span>
              {exam.total_marks} marks
            </span>
          )}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Status + Action */}
        <div className="mt-6 flex items-center justify-between">
          {statusLabel && (
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${statusClassName}`}
            >
              {statusLabel}
            </span>
          )}
          <Link
            to={actionTo}
            className={`focus-ring touch-target ml-auto rounded-xl px-6 py-2.5 text-sm font-medium ${
              attempt?.status === "started"
                ? "bg-accent-amber text-white hover:bg-amber-500"
                : attempt?.status === "submitted" ||
                    attempt?.status === "evaluated"
                  ? "border border-primary-blue text-primary-blue hover:bg-background-soft"
                  : "bg-primary-blue text-white hover:bg-primary-blue-light"
            }`}
            aria-label={`${actionLabel}: ${exam.title}`}
          >
            {actionLabel}
          </Link>
        </div>
      </Card>
    </div>
  );
}
