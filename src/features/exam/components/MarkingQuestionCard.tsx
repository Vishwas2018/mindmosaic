/**
 * MarkingQuestionCard — Displays one question for teacher review/marking.
 *
 * For objective types (mcq, multi, short, numeric): read-only display
 * showing the student response, correct answer, and auto-score result.
 *
 * For extended responses: includes an editable score input and feedback
 * textarea that the teacher can fill in before finalizing.
 *
 * This component is intentionally NOT coupled to the student review
 * components (Day 16). While the visual structure is similar, the
 * teacher view includes correct answers and marking affordances that
 * would be inappropriate in the student context.
 */

import type {
  MarkingQuestionData,
  ManualMark,
} from "../../marking/hooks/useAttemptMarking";

interface MarkingQuestionCardProps {
  data: MarkingQuestionData;
  manualMark: ManualMark | undefined;
  onManualMarkChange: (mark: ManualMark) => void;
  /** When true, the attempt is finalized — no edits allowed */
  isFinalized: boolean;
}

export function MarkingQuestionCard({
  data,
  manualMark,
  onManualMarkChange,
  isFinalized,
}: MarkingQuestionCardProps) {
  const { question, options, response, correctAnswer, existingScore } = data;

  const isManualType = question.response_type === "extended";
  const needsManualReview =
    existingScore?.requires_manual_review ?? isManualType;

  // Border color based on scoring status
  const borderClass = !existingScore
    ? "border-border-subtle"
    : needsManualReview && !manualMark
      ? "border-accent-amber"
      : existingScore.is_correct ||
          (manualMark && manualMark.score >= question.marks)
        ? "border-success-green"
        : "border-danger-red";

  return (
    <div className={`rounded-lg border-2 bg-white p-5 ${borderClass}`}>
      {/* Header */}
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-blue text-xs font-bold text-white">
            {question.sequence_number}
          </span>
          <div>
            <span className="text-xs font-medium text-text-muted">
              {formatResponseType(question.response_type)} · {question.marks}{" "}
              {question.marks === 1 ? "mark" : "marks"} · {question.difficulty}
            </span>
            {question.tags.length > 0 && (
              <div className="mt-0.5 flex flex-wrap gap-1">
                {question.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded bg-background-soft px-1.5 py-0.5 text-[10px] text-text-muted"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Score badge */}
        <ScoreBadge
          existingScore={existingScore}
          manualMark={manualMark}
          needsManualReview={needsManualReview}
        />
      </div>

      {/* Question prompt */}
      <div className="mb-4">
        <PromptBlocks blocks={question.prompt_blocks} />
      </div>

      {/* Two-column: student response + correct answer */}
      <div className="grid gap-3 sm:grid-cols-2">
        {/* Student's response */}
        <div className="rounded-md border border-border-subtle bg-background-soft p-3">
          <p className="mb-1.5 text-xs font-semibold text-text-muted">
            Student Response
          </p>
          <StudentResponse
            responseType={question.response_type}
            response={response}
            options={options}
          />
        </div>

        {/* Correct answer */}
        <div className="rounded-md border border-success-green/30 bg-success-green/5 p-3">
          <p className="mb-1.5 text-xs font-semibold text-success-green">
            Correct Answer
          </p>
          <CorrectAnswerDisplay
            responseType={question.response_type}
            correctAnswer={correctAnswer}
            options={options}
          />
        </div>
      </div>

      {/* Manual marking form for extended responses */}
      {isManualType && (
        <ManualMarkingForm
          questionId={question.id}
          maxMarks={question.marks}
          manualMark={manualMark}
          onChange={onManualMarkChange}
          isFinalized={isFinalized}
          sampleResponse={correctAnswer?.sample_response ?? null}
          rubric={correctAnswer?.rubric ?? null}
        />
      )}
    </div>
  );
}

// ────────────────────────────────────────────
// Score Badge
// ────────────────────────────────────────────

function ScoreBadge({
  existingScore,
  manualMark,
  needsManualReview,
}: {
  existingScore: MarkingQuestionData["existingScore"];
  manualMark: ManualMark | undefined;
  needsManualReview: boolean;
}) {
  // Manual mark takes precedence in display
  if (manualMark) {
    const isFullMarks = manualMark.score >= manualMark.maxScore;
    return (
      <span
        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
          isFullMarks
            ? "bg-success-green/10 text-success-green"
            : "bg-accent-amber/10 text-accent-amber"
        }`}
      >
        {manualMark.score}/{manualMark.maxScore} (teacher)
      </span>
    );
  }

  if (!existingScore) {
    return (
      <span className="rounded-full bg-background-soft px-2.5 py-0.5 text-xs font-medium text-text-muted">
        Not scored
      </span>
    );
  }

  if (needsManualReview) {
    return (
      <span className="rounded-full bg-accent-amber/10 px-2.5 py-0.5 text-xs font-medium text-accent-amber">
        Needs marking
      </span>
    );
  }

  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
        existingScore.is_correct
          ? "bg-success-green/10 text-success-green"
          : "bg-danger-red/10 text-danger-red"
      }`}
    >
      {existingScore.score}/{existingScore.max_score}
    </span>
  );
}

// ────────────────────────────────────────────
// Student Response Display
// ────────────────────────────────────────────

function StudentResponse({
  responseType,
  response,
  options,
}: {
  responseType: string;
  response: MarkingQuestionData["response"];
  options: MarkingQuestionData["options"];
}) {
  if (!response) {
    return (
      <p className="text-sm italic text-text-muted">No answer provided.</p>
    );
  }

  const rd = response.response_data;

  switch (responseType) {
    case "mcq": {
      const selectedId = rd.selectedOptionId as string | undefined;
      const opt = options.find((o) => o.option_id === selectedId);
      return (
        <p className="text-sm text-text-primary">
          <span className="mr-1.5 font-semibold">{selectedId}.</span>
          {opt?.content ?? "Unknown option"}
        </p>
      );
    }

    case "multi": {
      const selectedIds = (rd.selectedOptionIds as string[] | undefined) ?? [];
      if (selectedIds.length === 0) {
        return <p className="text-sm italic text-text-muted">None selected.</p>;
      }
      return (
        <ul className="space-y-0.5">
          {selectedIds.map((sid) => {
            const opt = options.find((o) => o.option_id === sid);
            return (
              <li key={sid} className="text-sm text-text-primary">
                <span className="mr-1.5 font-semibold">{sid}.</span>
                {opt?.content ?? "Unknown option"}
              </li>
            );
          })}
        </ul>
      );
    }

    case "short":
    case "extended":
      return (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-text-primary">
          {(rd.answer as string) || "—"}
        </p>
      );

    case "numeric":
      return (
        <p className="text-sm font-mono text-text-primary">
          {rd.answer !== undefined ? String(rd.answer) : "—"}
        </p>
      );

    default:
      return <p className="text-sm text-text-muted">Unsupported type.</p>;
  }
}

// ────────────────────────────────────────────
// Correct Answer Display
// ────────────────────────────────────────────

function CorrectAnswerDisplay({
  responseType,
  correctAnswer,
  options,
}: {
  responseType: string;
  correctAnswer: MarkingQuestionData["correctAnswer"];
  options: MarkingQuestionData["options"];
}) {
  if (!correctAnswer) {
    return (
      <p className="text-sm italic text-text-muted">No answer key found.</p>
    );
  }

  switch (responseType) {
    case "mcq": {
      const cid = correctAnswer.correct_option_id;
      const opt = cid ? options.find((o) => o.option_id === cid) : null;
      return (
        <p className="text-sm text-text-primary">
          <span className="mr-1.5 font-semibold">{cid}.</span>
          {opt?.content ?? "—"}
        </p>
      );
    }

    case "multi": {
      const cids = correctAnswer.correct_option_ids ?? [];
      return (
        <ul className="space-y-0.5">
          {cids.map((cid) => {
            const opt = options.find((o) => o.option_id === cid);
            return (
              <li key={cid} className="text-sm text-text-primary">
                <span className="mr-1.5 font-semibold">{cid}.</span>
                {opt?.content ?? "—"}
              </li>
            );
          })}
        </ul>
      );
    }

    case "short": {
      const accepted = correctAnswer.accepted_answers;
      if (Array.isArray(accepted)) {
        return (
          <p className="text-sm text-text-primary">
            {(accepted as string[]).join(", ")}
          </p>
        );
      }
      return (
        <p className="text-sm text-text-primary">{String(accepted ?? "—")}</p>
      );
    }

    case "numeric": {
      if (correctAnswer.exact_value !== null) {
        const parts = [`${correctAnswer.exact_value}`];
        if (correctAnswer.tolerance !== null) {
          parts.push(`± ${correctAnswer.tolerance}`);
        }
        if (correctAnswer.unit) {
          parts.push(correctAnswer.unit);
        }
        return (
          <p className="text-sm font-mono text-text-primary">
            {parts.join(" ")}
          </p>
        );
      }
      if (
        correctAnswer.range_min !== null &&
        correctAnswer.range_max !== null
      ) {
        return (
          <p className="text-sm font-mono text-text-primary">
            {correctAnswer.range_min} – {correctAnswer.range_max}
            {correctAnswer.unit ? ` ${correctAnswer.unit}` : ""}
          </p>
        );
      }
      return <p className="text-sm text-text-muted">—</p>;
    }

    case "extended": {
      if (correctAnswer.sample_response) {
        return (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-text-primary">
            {correctAnswer.sample_response}
          </p>
        );
      }
      return (
        <p className="text-sm italic text-text-muted">
          See rubric below for marking criteria.
        </p>
      );
    }

    default:
      return <p className="text-sm text-text-muted">—</p>;
  }
}

// ────────────────────────────────────────────
// Manual Marking Form
// ────────────────────────────────────────────

function ManualMarkingForm({
  questionId,
  maxMarks,
  manualMark,
  onChange,
  isFinalized,
  sampleResponse,
  rubric,
}: {
  questionId: string;
  maxMarks: number;
  manualMark: ManualMark | undefined;
  onChange: (mark: ManualMark) => void;
  isFinalized: boolean;
  sampleResponse: string | null;
  rubric: unknown;
}) {
  const currentScore = manualMark?.score ?? 0;
  const currentFeedback = manualMark?.feedback ?? "";

  const handleScoreChange = (value: string) => {
    const parsed = parseInt(value, 10);
    const clamped = isNaN(parsed) ? 0 : Math.max(0, Math.min(maxMarks, parsed));
    onChange({
      questionId,
      score: clamped,
      maxScore: maxMarks,
      feedback: currentFeedback,
    });
  };

  const handleFeedbackChange = (value: string) => {
    onChange({
      questionId,
      score: currentScore,
      maxScore: maxMarks,
      feedback: value,
    });
  };

  return (
    <div className="mt-4 rounded-md border border-border-subtle bg-background-soft p-4">
      <p className="mb-3 text-xs font-semibold text-text-primary">
        Teacher Marking
      </p>

      {/* Rubric display (if available) */}
      {rubric && typeof rubric === "object" && (
        <div className="mb-3 rounded-md border border-border-subtle bg-white p-3">
          <p className="mb-1 text-xs font-medium text-text-muted">Rubric</p>
          <pre className="whitespace-pre-wrap text-xs text-text-primary">
            {JSON.stringify(rubric, null, 2)}
          </pre>
        </div>
      )}

      {/* Sample response (if available and not already shown) */}
      {sampleResponse && (
        <div className="mb-3 rounded-md border border-border-subtle bg-white p-3">
          <p className="mb-1 text-xs font-medium text-text-muted">
            Sample Response
          </p>
          <p className="whitespace-pre-wrap text-xs leading-relaxed text-text-primary">
            {sampleResponse}
          </p>
        </div>
      )}

      {/* Score input */}
      <div className="mb-3 flex items-center gap-2">
        <label
          htmlFor={`score-${questionId}`}
          className="text-sm font-medium text-text-primary"
        >
          Score:
        </label>
        <input
          id={`score-${questionId}`}
          type="number"
          min={0}
          max={maxMarks}
          value={currentScore}
          onChange={(e) => handleScoreChange(e.target.value)}
          disabled={isFinalized}
          className="w-20 rounded-md border border-border-subtle bg-white px-2.5 py-1.5 text-sm text-text-primary disabled:cursor-not-allowed disabled:opacity-50"
        />
        <span className="text-sm text-text-muted">/ {maxMarks}</span>
      </div>

      {/* Feedback textarea */}
      <div>
        <label
          htmlFor={`feedback-${questionId}`}
          className="mb-1 block text-sm font-medium text-text-primary"
        >
          Feedback (optional)
        </label>
        <textarea
          id={`feedback-${questionId}`}
          value={currentFeedback}
          onChange={(e) => handleFeedbackChange(e.target.value)}
          disabled={isFinalized}
          placeholder="Add feedback for the student…"
          rows={3}
          className="w-full resize-y rounded-md border border-border-subtle bg-white px-3 py-2 text-sm text-text-primary placeholder:text-text-muted/50 disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      {isFinalized && (
        <p className="mt-2 text-xs text-text-muted">
          This attempt has been finalized. Marks cannot be edited.
        </p>
      )}
    </div>
  );
}

// ────────────────────────────────────────────
// Prompt Block Renderer (self-contained for marking)
// ────────────────────────────────────────────

function PromptBlocks({ blocks }: { blocks: Array<Record<string, unknown>> }) {
  return (
    <div className="space-y-2">
      {blocks.map((block, i) => {
        const key = `pb-${i}`;
        switch (block.type) {
          case "text":
            return (
              <p
                key={key}
                className="text-sm leading-relaxed text-text-primary"
              >
                {block.content as string}
              </p>
            );
          case "heading": {
            const level = block.level as number;
            const Tag = level === 1 ? "h3" : level === 2 ? "h4" : "h5";
            return (
              <Tag
                key={key}
                className="text-sm font-semibold text-text-primary"
              >
                {block.content as string}
              </Tag>
            );
          }
          case "list": {
            const ListTag = (block.ordered as boolean) ? "ol" : "ul";
            const cls = (block.ordered as boolean)
              ? "list-decimal"
              : "list-disc";
            return (
              <ListTag
                key={key}
                className={`ml-5 space-y-1 text-sm text-text-primary ${cls}`}
              >
                {(block.items as string[]).map((item, j) => (
                  <li key={j}>{item}</li>
                ))}
              </ListTag>
            );
          }
          case "quote":
            return (
              <blockquote
                key={key}
                className="border-l-3 border-primary-blue pl-3 text-sm italic text-text-muted"
              >
                {block.content as string}
              </blockquote>
            );
          case "instruction":
            return (
              <p
                key={key}
                className="rounded-md bg-background-soft px-3 py-2 text-sm font-medium text-primary-blue"
              >
                {block.content as string}
              </p>
            );
          case "image":
            return (
              <img
                key={key}
                src={block.src as string}
                alt={block.alt as string}
                className="max-w-full rounded-md"
              />
            );
          default:
            return null;
        }
      })}
    </div>
  );
}

// ── Helpers ──

function formatResponseType(type: string): string {
  const labels: Record<string, string> = {
    mcq: "Multiple Choice",
    multi: "Multi-Select",
    short: "Short Answer",
    numeric: "Numeric",
    extended: "Extended Response",
  };
  return labels[type] ?? type;
}
