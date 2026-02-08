/**
 * MindMosaic — Exam Review Page
 *
 * Read-only view of submitted exam responses.
 * Does NOT show correct answers (respects RLS).
 * Shows score if attempt has been evaluated.
 */

import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../../../lib/supabase";
import type {
  ExamPackage,
  ExamAttempt,
  ExamResponse,
  ExamResult,
} from "../../../lib/database.types";
import type {
  QuestionWithOptions,
  ResponseData,
  PromptBlock,
} from "../../../features/exam/types/exam.types";
import { PromptBlockRenderer } from "../../../features/exam/components";

export function ExamReviewPage() {
  const { attemptId } = useParams<{ attemptId: string }>();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState<ExamAttempt | null>(null);
  const [examPackage, setExamPackage] = useState<ExamPackage | null>(null);
  const [questions, setQuestions] = useState<QuestionWithOptions[]>([]);
  const [responses, setResponses] = useState<Map<string, ResponseData>>(
    new Map()
  );
  const [result, setResult] = useState<ExamResult | null>(null);

  // Load all data
  useEffect(() => {
    async function loadData() {
      if (!attemptId) return;

      setIsLoading(true);
      setError(null);

      try {
        // 1. Load attempt
        const { data: attemptData, error: attemptError } = await supabase
          .from("exam_attempts")
          .select("*")
          .eq("id", attemptId)
          .single();

        if (attemptError) {
          throw new Error(`Failed to load attempt: ${attemptError.message}`);
        }

        setAttempt(attemptData);

        // Check if attempt is submitted
        if (attemptData.status === "started") {
          throw new Error("This exam has not been submitted yet.");
        }

        // 2. Load exam package
        const { data: packageData, error: packageError } = await supabase
          .from("exam_packages")
          .select("*")
          .eq("id", attemptData.exam_package_id)
          .single();

        if (packageError) {
          throw new Error(`Failed to load exam: ${packageError.message}`);
        }

        setExamPackage(packageData);

        // 3. Load questions
        const { data: questionsData, error: questionsError } = await supabase
          .from("exam_questions")
          .select("*")
          .eq("exam_package_id", attemptData.exam_package_id)
          .order("sequence_number");

        if (questionsError) {
          throw new Error(`Failed to load questions: ${questionsError.message}`);
        }

        // 4. Load options for MCQ questions
        const mcqQuestionIds = questionsData
          .filter((q) => q.response_type === "mcq" || q.response_type === "multi")
          .map((q) => q.id);

        let optionsMap = new Map<
          string,
          Array<{
            question_id: string;
            option_id: string;
            content: string;
            media_reference: unknown;
          }>
        >();

        if (mcqQuestionIds.length > 0) {
          const { data: opts } = await supabase
            .from("exam_question_options")
            .select("*")
            .in("question_id", mcqQuestionIds)
            .order("option_id");

          if (opts) {
            opts.forEach((opt) => {
              const existing = optionsMap.get(opt.question_id) || [];
              optionsMap.set(opt.question_id, [...existing, opt]);
            });
          }
        }

        // Build questions with options
        const questionsWithOptions: QuestionWithOptions[] = questionsData.map(
          (q) => ({
            ...q,
            options: optionsMap.get(q.id),
            prompt_blocks: Array.isArray(q.prompt_blocks) ? q.prompt_blocks : [],
            media_references: Array.isArray(q.media_references)
              ? q.media_references
              : null,
          })
        );

        setQuestions(questionsWithOptions);

        // 5. Load responses
        const { data: responsesData } = await supabase
          .from("exam_responses")
          .select("question_id, response_data")
          .eq("attempt_id", attemptId);

        if (responsesData) {
          const responseMap = new Map<string, ResponseData>();
          responsesData.forEach((r) => {
            responseMap.set(r.question_id, r.response_data as ResponseData);
          });
          setResponses(responseMap);
        }

        // 6. Load result if evaluated
        if (attemptData.status === "evaluated") {
          const { data: resultData } = await supabase
            .from("exam_results")
            .select("*")
            .eq("attempt_id", attemptId)
            .single();

          if (resultData) {
            setResult(resultData);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [attemptId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary-blue border-t-transparent mx-auto" />
          <p className="text-text-muted">Loading review...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-danger-red mb-4">⚠️ {error}</p>
          <Link to="/student/exams" className="text-primary-blue hover:underline">
            Back to exam list
          </Link>
        </div>
      </div>
    );
  }

  if (!attempt || !examPackage) {
    return null;
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <header className="mb-8">
        <Link
          to="/student/exams"
          className="inline-flex items-center gap-1 text-text-muted hover:text-primary-blue mb-4"
        >
          ← Back to exams
        </Link>

        <h1 className="text-2xl font-semibold text-text-primary mb-2">
          {examPackage.title}
        </h1>

        <div className="flex flex-wrap items-center gap-4 text-sm text-text-muted">
          <span>
            Submitted{" "}
            {attempt.submitted_at
              ? new Date(attempt.submitted_at).toLocaleDateString()
              : "—"}
          </span>
          <span>•</span>
          <span>{questions.length} questions</span>
        </div>
      </header>

      {/* Result summary (if evaluated) */}
      {result && (
        <div
          className={`
            rounded-xl p-6 mb-8
            ${result.passed ? "bg-success-green/10" : "bg-danger-red/10"}
          `}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-muted mb-1">Your Score</p>
              <p
                className={`text-3xl font-bold ${result.passed ? "text-success-green" : "text-danger-red"}`}
              >
                {result.total_score} / {result.max_score}
              </p>
              <p className="text-lg text-text-muted">{result.percentage}%</p>
            </div>
            <div className="text-right">
              <span
                className={`
                  inline-block px-4 py-2 rounded-full text-lg font-semibold
                  ${result.passed ? "bg-success-green text-white" : "bg-danger-red text-white"}
                `}
              >
                {result.passed ? "PASSED" : "NOT PASSED"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Pending evaluation notice */}
      {attempt.status === "submitted" && !result && (
        <div className="bg-primary-blue/10 rounded-xl p-6 mb-8">
          <p className="text-primary-blue font-medium">
            ⏳ Your exam is awaiting evaluation
          </p>
          <p className="text-sm text-text-muted mt-1">
            Check back later to see your score.
          </p>
        </div>
      )}

      {/* Questions and responses */}
      <div className="space-y-6">
        {questions.map((question, index) => (
          <QuestionReviewCard
            key={question.id}
            question={question}
            questionNumber={index + 1}
            response={responses.get(question.id)}
            // Note: We don't have scoring breakdown per question in the basic result
            // This could be enhanced if breakdown is available
          />
        ))}
      </div>

      {/* Footer */}
      <footer className="mt-8 pt-8 border-t border-border-subtle text-center">
        <Link
          to="/student/exams"
          className="inline-block px-6 py-3 bg-primary-blue text-white rounded-lg font-medium hover:bg-primary-blue-light transition-colors"
        >
          Take Another Exam
        </Link>
      </footer>
    </div>
  );
}

// =============================================================================
// Question Review Card
// =============================================================================

interface QuestionReviewCardProps {
  question: QuestionWithOptions;
  questionNumber: number;
  response?: ResponseData;
}

function QuestionReviewCard({
  question,
  questionNumber,
  response,
}: QuestionReviewCardProps) {
  const promptBlocks = question.prompt_blocks as PromptBlock[];
  const isAnswered = response !== undefined;

  return (
    <div className="bg-white rounded-xl border border-border-subtle overflow-hidden">
      {/* Question header */}
      <div className="px-6 py-4 bg-gray-50 border-b border-border-subtle flex items-center justify-between">
        <span className="font-medium text-text-primary">
          Question {questionNumber}
        </span>
        <span className="text-sm text-text-muted">
          {question.marks} {question.marks === 1 ? "mark" : "marks"}
        </span>
      </div>

      {/* Question content */}
      <div className="px-6 py-4">
        <PromptBlockRenderer blocks={promptBlocks} />
      </div>

      {/* Student's response */}
      <div className="px-6 py-4 bg-background-soft border-t border-border-subtle">
        <p className="text-sm text-text-muted mb-2">Your answer:</p>

        {!isAnswered ? (
          <p className="text-text-muted italic">No answer provided</p>
        ) : (
          <ResponseDisplay
            question={question}
            response={response}
          />
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Response Display
// =============================================================================

interface ResponseDisplayProps {
  question: QuestionWithOptions;
  response: ResponseData;
}

function ResponseDisplay({ question, response }: ResponseDisplayProps) {
  // MCQ response
  if ("selectedOptionId" in response) {
    const selectedOption = question.options?.find(
      (o) => o.option_id === response.selectedOptionId
    );

    return (
      <div className="flex items-center gap-3">
        <span className="w-8 h-8 rounded-full bg-primary-blue text-white flex items-center justify-center font-semibold text-sm">
          {response.selectedOptionId}
        </span>
        <span className="text-text-primary">
          {selectedOption?.content || response.selectedOptionId}
        </span>
      </div>
    );
  }

  // Multi-select response
  if ("selectedOptionIds" in response) {
    if (response.selectedOptionIds.length === 0) {
      return <p className="text-text-muted italic">No options selected</p>;
    }

    return (
      <div className="flex flex-wrap gap-2">
        {response.selectedOptionIds.map((optionId) => {
          const option = question.options?.find((o) => o.option_id === optionId);
          return (
            <span
              key={optionId}
              className="inline-flex items-center gap-2 px-3 py-1 bg-primary-blue/10 text-primary-blue rounded-full text-sm"
            >
              <span className="font-semibold">{optionId}</span>
              {option?.content && (
                <span className="text-text-primary">{option.content}</span>
              )}
            </span>
          );
        })}
      </div>
    );
  }

  // Text/numeric response
  if ("answer" in response) {
    const answerText = String(response.answer);

    if (!answerText.trim()) {
      return <p className="text-text-muted italic">No answer provided</p>;
    }

    // Extended answers get special formatting
    if (question.response_type === "extended") {
      return (
        <div className="bg-white rounded-lg border border-border-subtle p-4">
          <p className="text-text-primary whitespace-pre-wrap">{answerText}</p>
        </div>
      );
    }

    return <p className="text-text-primary font-medium">{answerText}</p>;
  }

  return <p className="text-text-muted italic">Unknown response format</p>;
}
