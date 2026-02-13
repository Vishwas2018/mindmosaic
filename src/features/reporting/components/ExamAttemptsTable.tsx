import { useState } from "react";
import type { AttemptRow } from "../hooks/useExamAttempts";

interface ExamAttemptsTableProps {
  attempts: AttemptRow[];
  onOpenAttempt: (attemptId: string) => void;
}

type SortField =
  | "student"
  | "status"
  | "score"
  | "started"
  | "submitted"
  | "time";
type SortDir = "asc" | "desc";

export function ExamAttemptsTable({
  attempts,
  onOpenAttempt,
}: ExamAttemptsTableProps) {
  const [sortField, setSortField] = useState<SortField>("submitted");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const sorted = [...attempts].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;

    switch (sortField) {
      case "student":
        return a.student_id.localeCompare(b.student_id) * dir;
      // BUG-2 FIX: Added parentheses so `dir` multiplies the full expression
      case "status":
        return (statusOrder(a.status) - statusOrder(b.status)) * dir;
      case "score": {
        const aScore = a.result?.percentage ?? -1;
        const bScore = b.result?.percentage ?? -1;
        return (aScore - bScore) * dir;
      }
      case "started":
        return (
          (new Date(a.started_at).getTime() -
            new Date(b.started_at).getTime()) *
          dir
        );
      case "submitted": {
        const aTime = a.submitted_at ? new Date(a.submitted_at).getTime() : 0;
        const bTime = b.submitted_at ? new Date(b.submitted_at).getTime() : 0;
        return (aTime - bTime) * dir;
      }
      case "time": {
        const aT = a.time_taken_seconds ?? 0;
        const bT = b.time_taken_seconds ?? 0;
        return (aT - bT) * dir;
      }
      default:
        return 0;
    }
  });

  if (attempts.length === 0) {
    return (
      <div className="rounded-lg border border-border-subtle bg-white p-8 text-center">
        <p className="text-sm text-text-muted">
          No attempts found for this exam.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border-subtle bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border-subtle bg-background-soft">
              <SortHeader
                label="Student"
                field="student"
                current={sortField}
                dir={sortDir}
                onSort={handleSort}
              />
              <SortHeader
                label="Status"
                field="status"
                current={sortField}
                dir={sortDir}
                onSort={handleSort}
              />
              <SortHeader
                label="Score"
                field="score"
                current={sortField}
                dir={sortDir}
                onSort={handleSort}
              />
              <SortHeader
                label="Started"
                field="started"
                current={sortField}
                dir={sortDir}
                onSort={handleSort}
              />
              <SortHeader
                label="Submitted"
                field="submitted"
                current={sortField}
                dir={sortDir}
                onSort={handleSort}
              />
              <SortHeader
                label="Time Taken"
                field="time"
                current={sortField}
                dir={sortDir}
                onSort={handleSort}
              />
              <th className="px-4 py-3 font-medium text-text-muted">Action</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((attempt) => (
              <tr
                key={attempt.id}
                className="border-b border-border-subtle last:border-b-0 hover:bg-background-soft/50"
              >
                {/* Student */}
                <td className="px-4 py-3">
                  <span className="font-mono text-xs text-text-muted">
                    {attempt.student_id.slice(0, 8)}…
                  </span>
                </td>

                {/* Status */}
                <td className="px-4 py-3">
                  <StatusBadge status={attempt.status} />
                </td>

                {/* Score */}
                <td className="px-4 py-3">
                  {attempt.result ? (
                    <div>
                      <span className="text-sm font-medium text-text-primary">
                        {attempt.result.total_score} /{" "}
                        {attempt.result.max_score}
                      </span>
                      <span className="ml-1.5 text-xs text-text-muted">
                        ({Math.round(attempt.result.percentage)}%)
                      </span>
                      {attempt.result.passed ? (
                        <span className="ml-1.5 text-xs text-success-green">
                          ✓
                        </span>
                      ) : (
                        <span className="ml-1.5 text-xs text-danger-red">
                          ✗
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-text-muted">—</span>
                  )}
                </td>

                {/* Started */}
                <td className="px-4 py-3 text-xs text-text-muted">
                  {formatTimestamp(attempt.started_at)}
                </td>

                {/* Submitted */}
                <td className="px-4 py-3 text-xs text-text-muted">
                  {attempt.submitted_at
                    ? formatTimestamp(attempt.submitted_at)
                    : "—"}
                </td>

                {/* Time taken */}
                <td className="px-4 py-3 text-xs text-text-muted">
                  {attempt.time_taken_seconds !== null
                    ? formatDuration(attempt.time_taken_seconds)
                    : "—"}
                </td>

                {/* Action */}
                <td className="px-4 py-3">
                  {attempt.status !== "started" ? (
                    <button
                      type="button"
                      onClick={() => onOpenAttempt(attempt.id)}
                      className="rounded-md bg-primary-blue px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-blue-light"
                    >
                      {attempt.status === "evaluated" ? "Review" : "Mark"}
                    </button>
                  ) : (
                    <span className="text-xs text-text-muted">In progress</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Sub-components ──

function SortHeader({
  label,
  field,
  current,
  dir,
  onSort,
}: {
  label: string;
  field: SortField;
  current: SortField;
  dir: SortDir;
  onSort: (field: SortField) => void;
}) {
  const isActive = current === field;

  return (
    <th className="px-4 py-3">
      <button
        type="button"
        onClick={() => onSort(field)}
        className="flex items-center gap-1 font-medium text-text-muted hover:text-text-primary"
      >
        {label}
        {isActive && (
          <svg
            className={`h-3 w-3 transition-transform ${
              dir === "asc" ? "rotate-180" : ""
            }`}
            viewBox="0 0 12 12"
            fill="currentColor"
          >
            <path d="M6 8L2 4h8L6 8z" />
          </svg>
        )}
      </button>
    </th>
  );
}

function StatusBadge({ status }: { status: AttemptRow["status"] }) {
  switch (status) {
    case "evaluated":
      return (
        <span className="inline-flex items-center rounded-full bg-success-green/10 px-2.5 py-0.5 text-xs font-medium text-success-green">
          Evaluated
        </span>
      );
    case "submitted":
      return (
        <span className="inline-flex items-center rounded-full bg-accent-amber/10 px-2.5 py-0.5 text-xs font-medium text-accent-amber">
          Submitted
        </span>
      );
    case "started":
      return (
        <span className="inline-flex items-center rounded-full bg-background-soft px-2.5 py-0.5 text-xs font-medium text-text-muted">
          In Progress
        </span>
      );
    default:
      return null;
  }
}

// ── Helpers ──

function statusOrder(status: string): number {
  switch (status) {
    case "submitted":
      return 0;
    case "evaluated":
      return 1;
    case "started":
      return 2;
    default:
      return 3;
  }
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);
  return parts.join(" ");
}
