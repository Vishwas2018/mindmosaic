/**
 * ParentDashboard — Main parent dashboard
 *
 * Route: /parent/dashboard
 */

import { useChildProfile } from "../../features/parent/hooks/useChildProfile";
import { useParentExamResults } from "../../features/parent/hooks/useParentExamResults";
import { ChildSummaryPanel } from "../../features/parent/components/ChildSummaryPanel";
import { ExamResultCard } from "../../features/parent/components/ExamResultCard";

export function ParentDashboard() {
  const { status: childStatus, child, error: childError } = useChildProfile();
  const {
    status: examsStatus,
    exams,
    error: examsError,
  } = useParentExamResults(child?.id || null);

  // ──────────────────────────────────────────────────
  // Loading State
  // ──────────────────────────────────────────────────
  if (childStatus === "loading") {
    return (
      <div className="mx-auto max-w-5xl px-4 py-6">
        <div className="text-center text-text-muted">Loading profile...</div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────
  // Error State (Child Profile)
  // ──────────────────────────────────────────────────
  if (childStatus === "error" || !child) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-6">
        <div className="rounded-md bg-danger-red/10 p-6">
          <h2 className="mb-2 font-semibold text-danger-red">
            Profile Not Configured
          </h2>
          <p className="text-sm text-text-muted">
            {childError ||
              "Unable to load child profile. Please contact your administrator."}
          </p>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────
  // Main View
  // ──────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-text-primary">Dashboard</h1>
        <p className="mt-1 text-sm text-text-muted">
          View your child's exam results and progress
        </p>
      </div>

      {/* Child Profile */}
      <div className="mb-6">
        <ChildSummaryPanel child={child} />
      </div>

      {/* Exams Section */}
      <div className="mb-6">
        <h2 className="mb-4 text-lg font-semibold text-text-primary">
          Exam Results
        </h2>

        {examsStatus === "loading" && (
          <div className="text-center text-text-muted">Loading exams...</div>
        )}

        {examsStatus === "error" && (
          <div className="rounded-md bg-danger-red/10 px-4 py-3 text-sm text-danger-red">
            {examsError || "Failed to load exam results"}
          </div>
        )}

        {examsStatus === "success" && exams.length === 0 && (
          <div className="rounded-lg border border-border-subtle bg-background-soft p-6 text-center text-text-muted">
            No exams available yet
          </div>
        )}

        {examsStatus === "success" && exams.length > 0 && (
          <div className="space-y-4">
            {exams.map((exam) => (
              <ExamResultCard key={exam.exam_id} exam={exam} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
