import type {
  ExamPackageSummary,
  ExamAttemptsSummary,
} from "../hooks/useExamAttempts";

interface ExamSummaryPanelProps {
  examPackage: ExamPackageSummary;
  summary: ExamAttemptsSummary;
}

export function ExamSummaryPanel({
  examPackage,
  summary,
}: ExamSummaryPanelProps) {
  return (
    <div className="rounded-lg border border-border-subtle bg-white p-5">
      {/* Exam title */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-text-primary">
          {examPackage.title}
        </h2>
        <p className="mt-0.5 text-sm text-text-muted">
          Year {examPackage.year_level} · {examPackage.subject} ·{" "}
          {examPackage.assessment_type.toUpperCase()} · Max{" "}
          {examPackage.total_marks} marks
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Total Attempts"
          value={String(summary.total_attempts)}
        />
        <StatCard
          label="Submitted"
          value={String(summary.submitted_count)}
          sub="Awaiting evaluation"
        />
        <StatCard
          label="Evaluated"
          value={String(summary.evaluated_count)}
          sub={
            summary.evaluated_count > 0
              ? `${summary.pass_count} passed · ${summary.fail_count} not passed`
              : undefined
          }
        />
        <StatCard
          label="In Progress"
          value={String(
            summary.total_attempts -
              summary.submitted_count -
              summary.evaluated_count,
          )}
          sub="Started but not submitted"
        />
      </div>

      {/* Score stats — only if there are evaluated attempts */}
      {summary.evaluated_count > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            label="Avg Score"
            value={
              summary.average_score !== null
                ? `${summary.average_score} / ${examPackage.total_marks}`
                : "—"
            }
          />
          <StatCard
            label="Median Score"
            value={
              summary.median_score !== null
                ? `${summary.median_score} / ${examPackage.total_marks}`
                : "—"
            }
          />
          <StatCard
            label="Avg %"
            value={
              summary.average_percentage !== null
                ? `${Math.round(summary.average_percentage)}%`
                : "—"
            }
          />
          <StatCard
            label="Median %"
            value={
              summary.median_percentage !== null
                ? `${Math.round(summary.median_percentage)}%`
                : "—"
            }
          />
        </div>
      )}
    </div>
  );
}

// ── Stat card ──

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-md bg-background-soft px-3 py-2.5">
      <p className="text-xs font-medium text-text-muted">{label}</p>
      <p className="mt-0.5 text-base font-semibold text-text-primary">
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-text-muted">{sub}</p>}
    </div>
  );
}
