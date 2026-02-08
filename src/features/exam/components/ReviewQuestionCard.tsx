import type { ReviewQuestionData } from "../hooks/useExamReview";

interface ReviewQuestionCardProps {
  data: ReviewQuestionData;
}

/**
 * Read-only card showing one question, the student's response,
 * and (when scored) whether it was correct plus the correct answer.
 *
 * Assumption: prompt_blocks follow the PromptBlock union from Day 15.
 * This component renders them inline — it does NOT reuse the Day 15
 * PromptBlockRenderer to avoid coupling review code to attempt-runtime code.
 * If a shared renderer is preferred later, this can be swapped in.
 */
export function ReviewQuestionCard({ data }: ReviewQuestionCardProps) {
  const { question, options, response, breakdown } = data;

  // Correctness state: null = not yet scored
  const isScored = breakdown !== null;
  const isCorrect = breakdown?.correct ?? null;
  const requiresManualReview = breakdown?.requires_manual_review ?? false;

  // Border color based on correctness
  const borderClass = !isScored
    ? "border-border-subtle"
    : isCorrect
      ? "border-success-green"
      : requiresManualReview
        ? "border-accent-amber"
        : "border-danger-red";

  return (
    <div
      className={`rounded-lg border-2 bg-white p-5 ${borderClass}`}
      role="article"
      aria-label={`Question ${question.sequence_number}`}
    >
      {/* Header row */}
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-blue text-xs font-bold text-white">
            {question.sequence_number}
          </span>
          <span className="text-xs font-medium text-text-muted">
            {question.marks} {question.marks === 1 ? "mark" : "marks"} ·{" "}
            {formatResponseType(question.response_type)}
          </span>
        </div>

        {/* Correctness badge */}
        {isScored && (
          <CorrectnessBadge correct={isCorrect} manual={requiresManualReview} />
        )}
      </div>

      {/* Question prompt */}
      <div className="mb-4">
        <PromptBlocks blocks={question.prompt_blocks} />
      </div>

      {/* Answer section — varies by response type */}
      <AnswerDisplay
        responseType={question.response_type}
        options={options}
        response={response}
        breakdown={breakdown}
      />

      {/* Score breakdown */}
      {isScored && (
        <div className="mt-3 border-t border-border-subtle pt-3">
          <p className="text-xs text-text-muted">
            Score: {breakdown.marks_awarded} / {breakdown.marks_possible}
          </p>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────
// Sub-components
// ────────────────────────────────────────────

function CorrectnessBadge({
  correct,
  manual,
}: {
  correct: boolean | null;
  manual: boolean;
}) {
  if (manual) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-accent-amber/10 px-2.5 py-0.5 text-xs font-medium text-accent-amber">
        <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
            clipRule="evenodd"
          />
        </svg>
        Pending Review
      </span>
    );
  }

  if (correct) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-success-green/10 px-2.5 py-0.5 text-xs font-medium text-success-green">
        <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
        Correct
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-danger-red/10 px-2.5 py-0.5 text-xs font-medium text-danger-red">
      <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
        <path
          fillRule="evenodd"
          d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
          clipRule="evenodd"
        />
      </svg>
      Incorrect
    </span>
  );
}

// ── Prompt block renderer (self-contained for review) ──

interface PromptBlocksProps {
  blocks: Array<Record<string, unknown>>;
}

function PromptBlocks({ blocks }: PromptBlocksProps) {
  return (
    <div className="space-y-2">
      {blocks.map((block, i) => {
        const key = `pb-${i}`;
        switch (block.type) {
          case "text":
            return (
              <p
                key={key}
                className="text-sm text-text-primary leading-relaxed"
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
            const listClass = (block.ordered as boolean)
              ? "list-decimal"
              : "list-disc";
            return (
              <ListTag
                key={key}
                className={`ml-5 space-y-1 text-sm text-text-primary ${listClass}`}
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
                {block.attribution && (
                  <span className="mt-1 block text-xs not-italic">
                    — {block.attribution as string}
                  </span>
                )}
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

// ── Answer display by response type ──

interface AnswerDisplayProps {
  responseType: string;
  options: Array<{
    question_id: string;
    option_id: string;
    content: string;
    media_reference: unknown;
  }>;
  response: {
    response_data: Record<string, unknown>;
  } | null;
  breakdown: {
    correct_answer?: unknown;
  } | null;
}

function AnswerDisplay({
  responseType,
  options,
  response,
  breakdown,
}: AnswerDisplayProps) {
  const responseData = response?.response_data ?? null;
  const correctAnswer = breakdown?.correct_answer ?? null;

  switch (responseType) {
    case "mcq":
      return (
        <McqReview
          options={options}
          selectedId={responseData?.selectedOptionId as string | undefined}
          correctId={correctAnswer as string | undefined}
        />
      );

    case "multi":
      return (
        <MultiSelectReview
          options={options}
          selectedIds={
            (responseData?.selectedOptionIds as string[] | undefined) ?? []
          }
          correctIds={(correctAnswer as string[] | undefined) ?? []}
        />
      );

    case "short":
      return (
        <TextAnswerReview
          label="Your answer"
          answer={responseData?.answer as string | undefined}
          correctAnswer={
            // correct_answer for short may be a string or array
            typeof correctAnswer === "string"
              ? correctAnswer
              : Array.isArray(correctAnswer)
                ? (correctAnswer as string[]).join(", ")
                : undefined
          }
        />
      );

    case "numeric":
      return (
        <TextAnswerReview
          label="Your answer"
          answer={
            responseData?.answer !== undefined
              ? String(responseData.answer)
              : undefined
          }
          correctAnswer={
            correctAnswer !== undefined && correctAnswer !== null
              ? String(correctAnswer)
              : undefined
          }
        />
      );

    case "extended":
      return (
        <ExtendedReview answer={responseData?.answer as string | undefined} />
      );

    default:
      return (
        <p className="text-sm text-text-muted italic">
          Unsupported response type: {responseType}
        </p>
      );
  }
}

// ── MCQ review ──

function McqReview({
  options,
  selectedId,
  correctId,
}: {
  options: Array<{ option_id: string; content: string }>;
  selectedId?: string;
  correctId?: string;
}) {
  if (options.length === 0) {
    return (
      <p className="text-sm text-text-muted italic">No options available.</p>
    );
  }

  return (
    <div className="space-y-2">
      {options.map((opt) => {
        const isSelected = opt.option_id === selectedId;
        const isCorrectOption =
          correctId !== undefined && opt.option_id === correctId;

        let bgClass = "bg-white";
        let borderColorClass = "border-border-subtle";
        let iconSlot: React.ReactNode = null;

        if (isSelected && isCorrectOption) {
          bgClass = "bg-success-green/5";
          borderColorClass = "border-success-green";
          iconSlot = <CheckIcon className="text-success-green" />;
        } else if (isSelected && !isCorrectOption && correctId !== undefined) {
          bgClass = "bg-danger-red/5";
          borderColorClass = "border-danger-red";
          iconSlot = <CrossIcon className="text-danger-red" />;
        } else if (isCorrectOption) {
          bgClass = "bg-success-green/5";
          borderColorClass = "border-success-green/50";
          iconSlot = <CheckIcon className="text-success-green/60" />;
        }

        return (
          <div
            key={opt.option_id}
            className={`flex items-center gap-3 rounded-md border px-3 py-2.5 text-sm ${bgClass} ${borderColorClass}`}
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border-subtle text-xs font-semibold text-text-muted">
              {opt.option_id}
            </span>
            <span className="flex-1 text-text-primary">{opt.content}</span>
            {iconSlot}
          </div>
        );
      })}
      {!selectedId && (
        <p className="text-xs italic text-text-muted">No answer provided.</p>
      )}
    </div>
  );
}

// ── Multi-select review ──

function MultiSelectReview({
  options,
  selectedIds,
  correctIds,
}: {
  options: Array<{ option_id: string; content: string }>;
  selectedIds: string[];
  correctIds: string[];
}) {
  if (options.length === 0) {
    return (
      <p className="text-sm text-text-muted italic">No options available.</p>
    );
  }

  const selectedSet = new Set(selectedIds);
  const correctSet = new Set(correctIds);

  return (
    <div className="space-y-2">
      {options.map((opt) => {
        const isSelected = selectedSet.has(opt.option_id);
        const isCorrectOption = correctSet.has(opt.option_id);

        let bgClass = "bg-white";
        let borderColorClass = "border-border-subtle";
        let iconSlot: React.ReactNode = null;

        if (isSelected && isCorrectOption) {
          bgClass = "bg-success-green/5";
          borderColorClass = "border-success-green";
          iconSlot = <CheckIcon className="text-success-green" />;
        } else if (isSelected && !isCorrectOption && correctIds.length > 0) {
          bgClass = "bg-danger-red/5";
          borderColorClass = "border-danger-red";
          iconSlot = <CrossIcon className="text-danger-red" />;
        } else if (!isSelected && isCorrectOption) {
          bgClass = "bg-success-green/5";
          borderColorClass = "border-success-green/50";
          iconSlot = <CheckIcon className="text-success-green/60" />;
        }

        return (
          <div
            key={opt.option_id}
            className={`flex items-center gap-3 rounded-md border px-3 py-2.5 text-sm ${bgClass} ${borderColorClass}`}
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-border-subtle text-xs font-semibold text-text-muted">
              {opt.option_id}
            </span>
            <span className="flex-1 text-text-primary">{opt.content}</span>
            {iconSlot}
          </div>
        );
      })}
      {selectedIds.length === 0 && (
        <p className="text-xs italic text-text-muted">No answer provided.</p>
      )}
    </div>
  );
}

// ── Text-based answer review (short answer + numeric) ──

function TextAnswerReview({
  label,
  answer,
  correctAnswer,
}: {
  label: string;
  answer?: string;
  correctAnswer?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="rounded-md border border-border-subtle bg-background-soft px-3 py-2.5">
        <p className="text-xs font-medium text-text-muted">{label}</p>
        <p className="mt-0.5 text-sm text-text-primary">
          {answer ?? (
            <span className="italic text-text-muted">No answer provided</span>
          )}
        </p>
      </div>
      {correctAnswer !== undefined && (
        <div className="rounded-md border border-success-green/30 bg-success-green/5 px-3 py-2.5">
          <p className="text-xs font-medium text-success-green">
            Correct answer
          </p>
          <p className="mt-0.5 text-sm text-text-primary">{correctAnswer}</p>
        </div>
      )}
    </div>
  );
}

// ── Extended response review ──

function ExtendedReview({ answer }: { answer?: string }) {
  return (
    <div className="rounded-md border border-border-subtle bg-background-soft px-3 py-2.5">
      <p className="text-xs font-medium text-text-muted">Your response</p>
      {answer ? (
        <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-text-primary">
          {answer}
        </p>
      ) : (
        <p className="mt-1 text-sm italic text-text-muted">
          No response provided.
        </p>
      )}
    </div>
  );
}

// ── Icons ──

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={`h-5 w-5 shrink-0 ${className ?? ""}`}
      viewBox="0 0 20 20"
      fill="currentColor"
    >
      <path
        fillRule="evenodd"
        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function CrossIcon({ className }: { className?: string }) {
  return (
    <svg
      className={`h-5 w-5 shrink-0 ${className ?? ""}`}
      viewBox="0 0 20 20"
      fill="currentColor"
    >
      <path
        fillRule="evenodd"
        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
        clipRule="evenodd"
      />
    </svg>
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
