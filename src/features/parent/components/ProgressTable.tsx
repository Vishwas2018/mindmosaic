/**
 * ProgressTable — Display progress summary by subject
 */

import type { ProgressSummary } from "../types/parent-dashboard.types";

interface ProgressTableProps {
  summary: ProgressSummary;
}

export function ProgressTable({ summary }: ProgressTableProps) {
  return (
    <div className="rounded-lg border border-border-subtle bg-white p-6">
      <h2 className="mb-4 text-lg font-semibold text-text-primary">
        Overall Progress
      </h2>

      {/* Summary Stats */}
      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <StatCard label="Total Exams" value={summary.total_exams} />
        <StatCard label="Completed" value={summary.completed_exams} />
        <StatCard label="In Progress" value={summary.in_progress} />
        <StatCard
          label="Average"
          value={
            summary.average_percentage !== null
              ? `${summary.average_percentage}%`
              : "—"
          }
        />
      </div>

      {/* By Subject */}
      {summary.exams_by_subject.length > 0 && (
        <>
          <h3 className="mb-3 font-medium text-text-primary">By Subject</h3>
          <div className="overflow-hidden rounded-md border border-border-subtle">
            <table className="w-full">
              <thead className="bg-background-soft">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium text-text-primary">
                    Subject
                  </th>
                  <th className="px-4 py-2 text-center text-sm font-medium text-text-primary">
                    Exams
                  </th>
                  <th className="px-4 py-2 text-center text-sm font-medium text-text-primary">
                    Average
                  </th>
                  <th className="px-4 py-2 text-center text-sm font-medium text-text-primary">
                    Highest
                  </th>
                  <th className="px-4 py-2 text-center text-sm font-medium text-text-primary">
                    Lowest
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {summary.exams_by_subject.map((subject) => (
                  <tr
                    key={subject.subject}
                    className="hover:bg-background-soft"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-text-primary">
                      {subject.subject}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-text-muted">
                      {subject.exam_count}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-text-primary">
                      {subject.average_percentage !== null
                        ? `${subject.average_percentage}%`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-text-primary">
                      {subject.highest_score !== null
                        ? `${subject.highest_score}%`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-text-primary">
                      {subject.lowest_score !== null
                        ? `${subject.lowest_score}%`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

// ────────────────────────────────────────────
// Stat Card
// ────────────────────────────────────────────

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-border-subtle bg-background-soft p-4">
      <div className="text-sm text-text-muted">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-text-primary">
        {value}
      </div>
    </div>
  );
}
