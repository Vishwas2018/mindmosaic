import type { ExamReviewData } from "../hooks/useExamReview";

interface AttemptSummaryPanelProps {
  data: ExamReviewData;
}

/**
 * Formats seconds into a human-readable duration string.
 * e.g. 3661 → "1h 1m 1s"
 */
function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  // Always show seconds if under a minute, otherwise optional
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);
  return parts.join(" ");
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function AttemptSummaryPanel({ data }: AttemptSummaryPanelProps) {
  const { attempt, examPackage, questions, result, timeTakenSeconds } = data;

  const totalQuestions = questions.length;
  const answeredCount = questions.filter((q) => q.response !== null).length;
  const unansweredCount = totalQuestions - answeredCount;

  // Score data is only available if the attempt has been scored
  const hasScore = result !== null;
  const correctCount = hasScore
    ? result.breakdown.filter((b) => b.correct).length
    : null;
  const incorrectCount =
    hasScore && correctCount !== null ? totalQuestions - correctCount : null;

  return (
    <div className="rounded-lg border border-border-subtle bg-white p-5">
      {/* Title row */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-text-primary">
          {examPackage.title}
        </h2>
        <p className="mt-0.5 text-sm text-text-muted">
          Year {examPackage.year_level} · {examPackage.subject} ·{" "}
          {examPackage.assessment_type.toUpperCase()}
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Questions answered */}
        <StatCard
          label="Answered"
          value={`${answeredCount} / ${totalQuestions}`}
          sub={unansweredCount > 0 ? `${unansweredCount} skipped` : undefined}
        />

        {/* Score — only if scored */}
        {hasScore ? (
          <StatCard
            label="Score"
            value={`${result.total_score} / ${result.max_score}`}
            sub={`${Math.round(result.percentage)}%`}
            highlight={result.passed ? "success" : "danger"}
          />
        ) : (
          <StatCard label="Score" value="Pending" sub="Awaiting scoring" />
        )}

        {/* Correct / Incorrect */}
        {hasScore && correctCount !== null && incorrectCount !== null ? (
          <StatCard
            label="Correct"
            value={`${correctCount}`}
            sub={`${incorrectCount} incorrect`}
          />
        ) : (
          <StatCard label="Correct" value="—" />
        )}

        {/* Time taken */}
        <StatCard
          label="Time Taken"
          value={
            timeTakenSeconds !== null ? formatDuration(timeTakenSeconds) : "—"
          }
          sub={
            examPackage.duration_minutes
              ? `of ${examPackage.duration_minutes}m allowed`
              : undefined
          }
        />
      </div>

      {/* Completion timestamp */}
      {attempt.submitted_at && (
        <p className="mt-3 text-xs text-text-muted">
          Submitted {formatTimestamp(attempt.submitted_at)}
        </p>
      )}

      {/* Pass / Fail badge — only when scored */}
      {hasScore && (
        <div className="mt-3">
          {result.passed ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-success-green/10 px-3 py-1 text-xs font-medium text-success-green">
              <svg
                className="h-3.5 w-3.5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              Passed
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-danger-red/10 px-3 py-1 text-xs font-medium text-danger-red">
              <svg
                className="h-3.5 w-3.5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
              Not Passed
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ── Small stat card ──

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  highlight?: "success" | "danger";
}

function StatCard({ label, value, sub, highlight }: StatCardProps) {
  const valueColor =
    highlight === "success"
      ? "text-success-green"
      : highlight === "danger"
        ? "text-danger-red"
        : "text-text-primary";

  return (
    <div className="rounded-md bg-background-soft px-3 py-2.5">
      <p className="text-xs font-medium text-text-muted">{label}</p>
      <p className={`mt-0.5 text-base font-semibold ${valueColor}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-text-muted">{sub}</p>}
    </div>
  );
}
