/**
 * QuestionEditorPage — Create or edit a question
 *
 * Routes:
 * - /admin/questions/create (new)
 * - /admin/questions/edit/:id (edit)
 */

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../../../lib/supabase";
import {
  useQuestionEditor,
  type SaveQuestionInput,
} from "../../../../features/questions/hooks/useQuestionEditor";
import type {
  PromptBlock,
  QuestionOption,
  CorrectAnswer,
} from "../../../../features/questions/types/question-bank.types";

export function QuestionEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isSaving, saveError, saveQuestion, deleteQuestion } =
    useQuestionEditor();

  const isEdit = !!id;

  // Form state
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">(
    "medium",
  );
  const [responseType, setResponseType] = useState<
    "mcq" | "multi" | "short" | "extended" | "numeric"
  >("mcq");
  const [marks, setMarks] = useState(1);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [hint, setHint] = useState("");

  // Prompt blocks
  const [promptBlocks, setPromptBlocks] = useState<PromptBlock[]>([
    { type: "text", content: "" },
  ]);

  // MCQ options
  const [options, setOptions] = useState<QuestionOption[]>([
    { question_id: "", option_id: "A", content: "", media_reference: null },
    { question_id: "", option_id: "B", content: "", media_reference: null },
    { question_id: "", option_id: "C", content: "", media_reference: null },
    { question_id: "", option_id: "D", content: "", media_reference: null },
  ]);

  // Correct answer
  const [correctAnswer, setCorrectAnswer] = useState<Partial<CorrectAnswer>>({
    answer_type: "mcq",
    correct_option_id: "A",
  });

  // Loading state
  const [isLoading, setIsLoading] = useState(isEdit);

  // Load existing question if editing
  useEffect(() => {
    if (!isEdit || !id) return;

    async function load() {
      try {
        const { data: q, error: qErr } = await supabase
          .from("exam_questions")
          .select("*")
          .eq("id", id)
          .single();

        if (qErr) throw qErr;

        setDifficulty(q.difficulty);
        setResponseType(q.response_type);
        setMarks(q.marks);
        setTags(q.tags ?? []);
        setHint(q.hint ?? "");
        setPromptBlocks(
          Array.isArray(q.prompt_blocks) && q.prompt_blocks.length > 0
            ? q.prompt_blocks
            : [{ type: "text", content: "" }],
        );

        // Load options if MCQ
        if (q.response_type === "mcq" || q.response_type === "multi") {
          const { data: opts } = await supabase
            .from("exam_question_options")
            .select("*")
            .eq("question_id", id)
            .order("option_id");

          if (opts && opts.length > 0) {
            setOptions(opts as QuestionOption[]);
          }
        }

        // Load correct answer
        const { data: ans } = await supabase
          .from("exam_correct_answers")
          .select("*")
          .eq("question_id", id)
          .single();

        if (ans) {
          setCorrectAnswer(ans);
        }

        setIsLoading(false);
      } catch (err) {
        console.error("Failed to load question:", err);
        setIsLoading(false);
      }
    }

    load();
  }, [isEdit, id]);

  // Handle save
  const handleSave = async () => {
    // Validation
    if (promptBlocks.length === 0 || !promptBlocks[0].content) {
      alert("Please add question content");
      return;
    }

    if (
      (responseType === "mcq" || responseType === "multi") &&
      options.some((o) => !o.content)
    ) {
      alert("Please fill in all options");
      return;
    }

    const input: SaveQuestionInput = {
      id: isEdit ? id : undefined,
      exam_package_id: "question-bank", // Special package ID for bank
      sequence_number: 1, // Will be overridden during generation
      difficulty,
      response_type: responseType,
      marks,
      prompt_blocks: promptBlocks as unknown[],
      tags,
      hint: hint || null,
      options:
        responseType === "mcq" || responseType === "multi"
          ? options
          : undefined,
      correctAnswer: correctAnswer as CorrectAnswer,
    };

    const result = await saveQuestion(input);

    if (result.success) {
      navigate("/admin/questions");
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!id) return;
    if (!confirm("Delete this question? This cannot be undone.")) return;

    const result = await deleteQuestion(id);

    if (result.success) {
      navigate("/admin/questions");
    }
  };

  // Add tag
  const handleAddTag = () => {
    if (tagInput && !tags.includes(tagInput)) {
      setTags([...tags, tagInput]);
      setTagInput("");
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-primary-blue border-t-transparent" />
          <p className="text-sm text-text-muted">Loading question…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <button
          type="button"
          onClick={() => navigate("/admin/questions")}
          className="mb-2 text-sm text-primary-blue hover:underline"
        >
          ← Back to Question Bank
        </button>
        <h1 className="text-xl font-bold text-text-primary">
          {isEdit ? "Edit Question" : "Create Question"}
        </h1>
      </div>

      {/* Form */}
      <div className="space-y-6 rounded-lg border border-border-subtle bg-white p-6">
        {/* Type & Difficulty */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">
              Question Type
            </label>
            <select
              value={responseType}
              onChange={(e) =>
                setResponseType(e.target.value as typeof responseType)
              }
              className="w-full rounded-md border border-border-subtle px-3 py-2 text-sm"
            >
              <option value="mcq">Multiple Choice</option>
              <option value="multi">Multi-Select</option>
              <option value="short">Short Answer</option>
              <option value="extended">Extended Response</option>
              <option value="numeric">Numeric</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">
              Difficulty
            </label>
            <select
              value={difficulty}
              onChange={(e) =>
                setDifficulty(e.target.value as typeof difficulty)
              }
              className="w-full rounded-md border border-border-subtle px-3 py-2 text-sm"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
        </div>

        {/* Marks */}
        <div>
          <label className="mb-1 block text-sm font-medium text-text-primary">
            Marks
          </label>
          <input
            type="number"
            min={1}
            max={10}
            value={marks}
            onChange={(e) => setMarks(parseInt(e.target.value) || 1)}
            className="w-full rounded-md border border-border-subtle px-3 py-2 text-sm"
          />
        </div>

        {/* Prompt */}
        <div>
          <label className="mb-1 block text-sm font-medium text-text-primary">
            Question Content
          </label>
          {promptBlocks.map((block, idx) => (
            <div key={idx} className="mb-2">
              <textarea
                value={block.type === "text" ? block.content : ""}
                onChange={(e) => {
                  const updated = [...promptBlocks];
                  updated[idx] = { type: "text", content: e.target.value };
                  setPromptBlocks(updated);
                }}
                rows={4}
                className="w-full rounded-md border border-border-subtle px-3 py-2 text-sm"
                placeholder="Enter question text..."
              />
            </div>
          ))}
        </div>

        {/* Options (MCQ/Multi only) */}
        {(responseType === "mcq" || responseType === "multi") && (
          <div>
            <label className="mb-2 block text-sm font-medium text-text-primary">
              Answer Options
            </label>
            <div className="space-y-2">
              {options.map((opt, idx) => (
                <div key={opt.option_id} className="flex items-center gap-2">
                  <span className="text-sm font-medium text-text-muted">
                    {opt.option_id}.
                  </span>
                  <input
                    type="text"
                    value={opt.content}
                    onChange={(e) => {
                      const updated = [...options];
                      updated[idx].content = e.target.value;
                      setOptions(updated);
                    }}
                    className="flex-1 rounded-md border border-border-subtle px-3 py-2 text-sm"
                    placeholder={`Option ${opt.option_id}`}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Correct Answer */}
        <div>
          <label className="mb-1 block text-sm font-medium text-text-primary">
            Correct Answer
          </label>
          {responseType === "mcq" && (
            <select
              value={correctAnswer.correct_option_id || "A"}
              onChange={(e) =>
                setCorrectAnswer({
                  ...correctAnswer,
                  correct_option_id: e.target.value,
                })
              }
              className="w-full rounded-md border border-border-subtle px-3 py-2 text-sm"
            >
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
              <option value="D">D</option>
            </select>
          )}
          {responseType === "short" && (
            <input
              type="text"
              value={
                Array.isArray(correctAnswer.accepted_answers)
                  ? (correctAnswer.accepted_answers as string[])[0] || ""
                  : ""
              }
              onChange={(e) =>
                setCorrectAnswer({
                  ...correctAnswer,
                  accepted_answers: [e.target.value],
                })
              }
              placeholder="Expected answer"
              className="w-full rounded-md border border-border-subtle px-3 py-2 text-sm"
            />
          )}
          {responseType === "numeric" && (
            <input
              type="number"
              value={correctAnswer.exact_value ?? ""}
              onChange={(e) =>
                setCorrectAnswer({
                  ...correctAnswer,
                  exact_value: parseFloat(e.target.value) || null,
                })
              }
              placeholder="Numeric answer"
              className="w-full rounded-md border border-border-subtle px-3 py-2 text-sm"
            />
          )}
          {responseType === "extended" && (
            <p className="text-sm text-text-muted">
              Extended responses require manual marking
            </p>
          )}
        </div>

        {/* Tags */}
        <div>
          <label className="mb-1 block text-sm font-medium text-text-primary">
            Tags
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddTag();
                }
              }}
              placeholder="Add tag..."
              className="flex-1 rounded-md border border-border-subtle px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={handleAddTag}
              className="rounded-md bg-primary-blue px-3 py-2 text-sm font-medium text-white hover:bg-primary-blue-light"
            >
              Add
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-full bg-background-soft px-2 py-1 text-xs"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => setTags(tags.filter((t) => t !== tag))}
                  className="text-text-muted hover:text-danger-red"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Hint */}
        <div>
          <label className="mb-1 block text-sm font-medium text-text-primary">
            Hint (optional)
          </label>
          <input
            type="text"
            value={hint}
            onChange={(e) => setHint(e.target.value)}
            placeholder="Hint for students..."
            className="w-full rounded-md border border-border-subtle px-3 py-2 text-sm"
          />
        </div>

        {/* Error */}
        {saveError && (
          <div className="rounded-md bg-danger-red/10 px-4 py-3 text-sm text-danger-red">
            {saveError}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between border-t border-border-subtle pt-4">
          <div>
            {isEdit && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isSaving}
                className="rounded-md border border-danger-red px-4 py-2 text-sm font-medium text-danger-red hover:bg-danger-red hover:text-white disabled:opacity-50"
              >
                Delete
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => navigate("/admin/questions")}
              disabled={isSaving}
              className="rounded-md border border-border-subtle bg-white px-4 py-2 text-sm font-medium text-text-primary hover:bg-background-soft disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="rounded-md bg-primary-blue px-4 py-2 text-sm font-medium text-white hover:bg-primary-blue-light disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save Question"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
