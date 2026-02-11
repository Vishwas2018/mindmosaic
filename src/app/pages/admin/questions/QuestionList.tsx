/**
 * QuestionListPage — Admin view of all questions in the bank
 *
 * Route: /admin/questions
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuestions } from "../../../../features/questions/hooks/useQuestions";

type FilterDifficulty = "all" | "easy" | "medium" | "hard";
type FilterType = "all" | "mcq" | "multi" | "short" | "extended" | "numeric";

export function QuestionListPage() {
  const { status, questions, error, reload } = useQuestions();
  const navigate = useNavigate();

  const [difficultyFilter, setDifficultyFilter] =
    useState<FilterDifficulty>("all");
  const [typeFilter, setTypeFilter] = useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Filter questions
  const filtered = questions.filter((q) => {
    if (difficultyFilter !== "all" && q.difficulty !== difficultyFilter)
      return false;
    if (typeFilter !== "all" && q.response_type !== typeFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const tagsMatch = q.tags.some((tag) => tag.toLowerCase().includes(query));
      const promptMatch = JSON.stringify(q.prompt_blocks)
        .toLowerCase()
        .includes(query);
      if (!tagsMatch && !promptMatch) return false;
    }
    return true;
  });

  if (status === "loading") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-primary-blue border-t-transparent" />
          <p className="text-sm text-text-muted">Loading questions…</p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold text-danger-red">
            Failed to load questions
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
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Question Bank</h1>
          <p className="mt-1 text-sm text-text-muted">
            {questions.length} questions available
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/admin/questions/create")}
          className="rounded-md bg-primary-blue px-4 py-2 text-sm font-medium text-white hover:bg-primary-blue-light"
        >
          Create Question
        </button>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-3">
        {/* Search */}
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search tags or content…"
          className="rounded-md border border-border-subtle px-3 py-2 text-sm"
        />

        {/* Difficulty */}
        <select
          value={difficultyFilter}
          onChange={(e) =>
            setDifficultyFilter(e.target.value as FilterDifficulty)
          }
          className="rounded-md border border-border-subtle px-3 py-2 text-sm"
        >
          <option value="all">All Difficulties</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>

        {/* Type */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as FilterType)}
          className="rounded-md border border-border-subtle px-3 py-2 text-sm"
        >
          <option value="all">All Types</option>
          <option value="mcq">Multiple Choice</option>
          <option value="multi">Multi-Select</option>
          <option value="short">Short Answer</option>
          <option value="extended">Extended Response</option>
          <option value="numeric">Numeric</option>
        </select>

        {/* Clear */}
        {(difficultyFilter !== "all" ||
          typeFilter !== "all" ||
          searchQuery) && (
          <button
            type="button"
            onClick={() => {
              setDifficultyFilter("all");
              setTypeFilter("all");
              setSearchQuery("");
            }}
            className="text-sm text-text-muted hover:text-text-primary"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Results count */}
      <p className="mb-3 text-sm text-text-muted">
        Showing {filtered.length} of {questions.length} questions
      </p>

      {/* Question list */}
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-border-subtle bg-white p-8 text-center">
          <p className="text-sm text-text-muted">
            {questions.length === 0
              ? "No questions in the bank yet."
              : "No questions match your filters."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((q) => (
            <QuestionCard
              key={q.id}
              question={q}
              onEdit={() => navigate(`/admin/questions/edit/${q.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Question Card ──

interface QuestionCardProps {
  question: any;
  onEdit: () => void;
}

function QuestionCard({ question, onEdit }: QuestionCardProps) {
  // Extract first text block for preview
  const firstText = question.prompt_blocks.find(
    (b: any) => b.type === "text",
  )?.content;

  return (
    <div className="rounded-lg border border-border-subtle bg-white p-4 hover:shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Preview */}
          <p className="text-sm text-text-primary line-clamp-2">
            {firstText || "[Question content]"}
          </p>

          {/* Metadata */}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                question.difficulty === "easy"
                  ? "bg-success-green/10 text-success-green"
                  : question.difficulty === "hard"
                    ? "bg-danger-red/10 text-danger-red"
                    : "bg-accent-amber/10 text-accent-amber"
              }`}
            >
              {question.difficulty}
            </span>

            <span className="rounded-full bg-background-soft px-2 py-0.5 text-xs font-medium text-text-muted">
              {formatType(question.response_type)}
            </span>

            <span className="text-xs text-text-muted">
              {question.marks} {question.marks === 1 ? "mark" : "marks"}
            </span>

            {question.tags.length > 0 && (
              <span className="text-xs text-text-muted">
                Tags: {question.tags.join(", ")}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <button
          type="button"
          onClick={onEdit}
          className="shrink-0 rounded-md bg-primary-blue px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-blue-light"
        >
          Edit
        </button>
      </div>
    </div>
  );
}

function formatType(type: string): string {
  const labels: Record<string, string> = {
    mcq: "Multiple Choice",
    multi: "Multi-Select",
    short: "Short Answer",
    extended: "Extended Response",
    numeric: "Numeric",
  };
  return labels[type] ?? type;
}
