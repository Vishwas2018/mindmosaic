/**
 * EXAMPLE: Student Exam List with Day 20 Visibility Filtering
 *
 * This file shows how to update your existing student exam list
 * to enforce Day 20 visibility rules.
 *
 * USAGE:
 * Replace your existing exam loading logic with this pattern.
 */

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import {
  filterVisibleExams,
  canStartAttempt,
  getAvailabilityStatus,
} from "../../features/exams";
import type { ExamPackage } from "../../features/exams";

export function ExampleStudentExamList() {
  const [exams, setExams] = useState<ExamPackage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadExams();
  }, []);

  const loadExams = async () => {
    setLoading(true);

    // 1. Load all packages from database
    const { data, error } = await supabase
      .from("exam_packages")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to load exams:", error);
      setLoading(false);
      return;
    }

    // 2. Apply Day 20 visibility filtering
    // This removes draft/archived exams and enforces availability windows
    const visibleExams = filterVisibleExams((data as ExamPackage[]) || []);

    setExams(visibleExams);
    setLoading(false);
  };

  if (loading) {
    return <div className="text-center text-text-muted">Loading exams...</div>;
  }

  if (exams.length === 0) {
    return (
      <div className="text-center text-text-muted">
        No exams available at this time
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {exams.map((exam) => (
        <ExamCard key={exam.id} exam={exam} />
      ))}
    </div>
  );
}

// ────────────────────────────────────────────
// Exam Card
// ────────────────────────────────────────────

function ExamCard({ exam }: { exam: ExamPackage }) {
  // Check if student can start attempt
  const { allowed, reason } = canStartAttempt(exam);

  // Get availability status for display
  const availabilityStatus = getAvailabilityStatus(exam);

  return (
    <div className="rounded-lg border border-border-subtle bg-white p-4">
      <div className="mb-2 flex items-start justify-between">
        <h3 className="font-semibold text-text-primary">{exam.title}</h3>
        <AvailabilityBadge status={availabilityStatus.status} />
      </div>

      <div className="mb-3 flex items-center gap-4 text-sm text-text-muted">
        <span>
          Year {exam.year_level} {exam.subject}
        </span>
        <span>{exam.duration_minutes} minutes</span>
        <span>{exam.total_marks} marks</span>
      </div>

      {/* Availability message */}
      {!allowed && reason && (
        <div className="mb-3 text-sm text-text-muted">{reason}</div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {allowed ? (
          <button
            type="button"
            className="rounded-md bg-primary-blue px-4 py-2 text-sm font-medium text-white hover:bg-primary-blue-light"
          >
            Start Exam
          </button>
        ) : (
          <button
            type="button"
            disabled
            className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-400"
          >
            {availabilityStatus.status === "upcoming"
              ? "Not Yet Available"
              : "Closed"}
          </button>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────
// Availability Badge
// ────────────────────────────────────────────

function AvailabilityBadge({
  status,
}: {
  status: "upcoming" | "open" | "closed" | "draft" | "archived";
}) {
  const styles = {
    upcoming: "bg-primary-blue/10 text-primary-blue",
    open: "bg-success-green/10 text-success-green",
    closed: "bg-text-muted/10 text-text-muted",
    draft: "bg-gray-100 text-gray-700",
    archived: "bg-text-muted/10 text-text-muted",
  };

  const labels = {
    upcoming: "Upcoming",
    open: "Open",
    closed: "Closed",
    draft: "Draft",
    archived: "Archived",
  };

  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}
