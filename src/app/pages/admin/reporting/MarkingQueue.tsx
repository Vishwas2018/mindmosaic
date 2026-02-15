/**
 * MarkingQueuePage — Admin view of all submitted attempts.
 *
 * Route: /admin/marking
 *
 * Shows a filterable table of submitted + evaluated attempts.
 * Admin clicks an attempt row to enter the marking screen.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  useMarkingQueue,
  type MarkingQueueAttempt,
} from "../../../../features/marking/hooks/useMarkingQueue";

type StatusFilter = "all" | "submitted" | "evaluated";

export function MarkingQueuePage() {
  const { status, attempts, error, reload } = useMarkingQueue();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<StatusFilter>("all");

  const filtered =
    filter === "all" ? attempts : attempts.filter((a) => a.status === filter);

  // Counts for filter tabs
  const submittedCount = attempts.filter(
    (a) => a.status === "submitted",
  ).length;
  const evaluatedCount = attempts.filter(
    (a) => a.status === "evaluated",
  ).length;

  // ── Loading ──
  if (status === "loading") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-primary-blue border-t-transparent" />
          <p className="text-sm text-text-muted">Loading marking queue…</p>
        </div>
      </div>
    );
  }

  // ── Error ──
  if (status === "error") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold text-danger-red">
            Failed to load marking queue
          </p>
          <p className="mt-1 text-sm text-text-muted">{error}</p>
          <button
            type="button"
            onClick={reload}
            className="mt-4 rounded-md bg-primary-blue px-4 py-2 text-sm font-medium text-white hover:bg-primary-blue-light"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="mb-1 text-xl font-bold text-text-primary">
        Marking Queue
      </h1>
      <p className="mb-5 text-sm text-text-muted">
        Review and mark submitted exam attempts.
      </p>

      {/* Filter tabs */}
      <div className="mb-4 flex gap-1 rounded-lg bg-background-soft p-1">
        <FilterTab
          label={`All (${attempts.length})`}
          active={filter === "all"}
          onClick={() => setFilter("all")}
        />
        <FilterTab
          label={`Needs Marking (${submittedCount})`}
          active={filter === "submitted"}
          onClick={() => setFilter("submitted")}
        />
        <FilterTab
          label={`Evaluated (${evaluatedCount})`}
          active={filter === "evaluated"}
          onClick={() => setFilter("evaluated")}
        />
      </div>

      {/* Queue table */}
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-border-subtle bg-white p-8 text-center">
          <p className="text-sm text-text-muted">
            {filter === "all"
              ? "No submitted attempts yet."
              : `No ${filter} attempts found.`}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border-subtle bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border-subtle bg-background-soft">
                <th className="px-4 py-3 font-medium text-text-muted">Exam</th>
                <th className="px-4 py-3 font-medium text-text-muted">
                  Student
                </th>
                <th className="px-4 py-3 font-medium text-text-muted">
                  Submitted
                </th>
                <th className="px-4 py-3 font-medium text-text-muted">
                  Status
                </th>
                <th className="px-4 py-3 font-medium text-text-muted">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((attempt) => (
                <AttemptRow
                  key={attempt.id}
                  attempt={attempt}
                  onOpen={() => navigate(`/admin/marking/${attempt.id}`)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ──

function FilterTab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? "bg-white text-text-primary shadow-sm"
          : "text-text-muted hover:text-text-primary"
      }`}
    >
      {label}
    </button>
  );
}

function AttemptRow({
  attempt,
  onOpen,
}: {
  attempt: MarkingQueueAttempt;
  onOpen: () => void;
}) {
  const isEvaluated = attempt.status === "evaluated";

  return (
    <tr className="border-b border-border-subtle last:border-b-0 hover:bg-background-soft/50">
      <td className="px-4 py-3">
        <p className="font-medium text-text-primary">{attempt.exam_title}</p>
        <p className="text-xs text-text-muted">
          Year {attempt.year_level} · {attempt.subject} ·{" "}
          {attempt.assessment_type.toUpperCase()}
        </p>
      </td>
      <td className="px-4 py-3">
        <span className="font-mono text-xs text-text-muted">
          {attempt.student_id.slice(0, 8)}…
        </span>
      </td>
      <td className="px-4 py-3 text-xs text-text-muted">
        {attempt.submitted_at
          ? new Date(attempt.submitted_at).toLocaleString("en-AU", {
              dateStyle: "medium",
              timeStyle: "short",
            })
          : "—"}
      </td>
      <td className="px-4 py-3">
        {isEvaluated ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-success-green/10 px-2.5 py-0.5 text-xs font-medium text-success-green">
            Evaluated
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-accent-amber/10 px-2.5 py-0.5 text-xs font-medium text-accent-amber">
            Needs Marking
          </span>
        )}
      </td>
      <td className="px-4 py-3">
        <button
          type="button"
          onClick={onOpen}
          className="rounded-md bg-primary-blue px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-blue-light"
        >
          {isEvaluated ? "Review" : "Mark"}
        </button>
      </td>
    </tr>
  );
}
