/**
 * ExamGeneratePage — Generate an exam from a blueprint
 *
 * Route: /admin/exams/generate
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useExamGeneration } from "../../../../features/exams/hooks/useExamGeneration";
import type {
  ExamBlueprint,
  BlueprintSection,
} from "../../../../features/questions/types/question-bank.types";

export function ExamGeneratePage() {
  const navigate = useNavigate();
  const { isGenerating, generateError, generateExam } = useExamGeneration();

  // Blueprint form state
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("numeracy");
  const [yearLevel, setYearLevel] = useState(3);
  const [assessmentType, setAssessmentType] = useState<"naplan" | "icas">(
    "naplan",
  );
  const [durationMinutes, setDurationMinutes] = useState(60);

  // Sections
  const [sections, setSections] = useState<BlueprintSection[]>([
    {
      name: "Section 1",
      question_count: 10,
      filters: {
        difficulty: ["easy", "medium"],
        response_type: ["mcq"],
      },
    },
  ]);

  // Generation result
  const [generatedPackageId, setGeneratedPackageId] = useState<string | null>(
    null,
  );

  // Add section
  const handleAddSection = () => {
    setSections([
      ...sections,
      {
        name: `Section ${sections.length + 1}`,
        question_count: 5,
        filters: {},
      },
    ]);
  };

  // Update section
  const handleUpdateSection = (
    idx: number,
    updates: Partial<BlueprintSection>,
  ) => {
    const updated = [...sections];
    updated[idx] = { ...updated[idx], ...updates };
    setSections(updated);
  };

  // Remove section
  const handleRemoveSection = (idx: number) => {
    setSections(sections.filter((_, i) => i !== idx));
  };

  // Handle generate
  const handleGenerate = async () => {
    if (!title) {
      alert("Please enter an exam title");
      return;
    }

    if (sections.length === 0) {
      alert("Please add at least one section");
      return;
    }

    const blueprint: ExamBlueprint = {
      title,
      subject,
      year_level: yearLevel,
      assessment_type: assessmentType,
      duration_minutes: durationMinutes,
      sections,
    };

    const result = await generateExam(blueprint);

    if (result.success && result.exam) {
      setGeneratedPackageId(result.exam.package_id);
    }
  };

  // Success view
  if (generatedPackageId) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6">
        <div className="rounded-lg border border-success-green bg-success-green/5 p-8 text-center">
          <div className="mb-4 text-5xl">✓</div>
          <h2 className="mb-2 text-xl font-semibold text-text-primary">
            Exam Generated Successfully
          </h2>
          <p className="mb-6 text-sm text-text-muted">
            Your exam package has been created in draft status.
          </p>
          <div className="flex justify-center gap-3">
            <button
              type="button"
              onClick={() =>
                navigate(`/admin/exams/${generatedPackageId}/attempts`)
              }
              className="rounded-md bg-primary-blue px-4 py-2 text-sm font-medium text-white hover:bg-primary-blue-light"
            >
              View Exam
            </button>
            <button
              type="button"
              onClick={() => {
                setGeneratedPackageId(null);
                setTitle("");
                setSections([
                  {
                    name: "Section 1",
                    question_count: 10,
                    filters: {
                      difficulty: ["easy", "medium"],
                      response_type: ["mcq"],
                    },
                  },
                ]);
              }}
              className="rounded-md border border-border-subtle bg-white px-4 py-2 text-sm font-medium text-text-primary hover:bg-background-soft"
            >
              Generate Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-text-primary">
          Generate Exam from Blueprint
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          Define selection rules to automatically generate an exam from the
          question bank
        </p>
      </div>

      {/* Form */}
      <div className="space-y-6 rounded-lg border border-border-subtle bg-white p-6">
        {/* Basic Info */}
        <div className="space-y-4">
          <h3 className="font-semibold text-text-primary">Exam Details</h3>

          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Year 3 Numeracy Practice Test"
              className="w-full rounded-md border border-border-subtle px-3 py-2 text-sm"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">
                Subject
              </label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full rounded-md border border-border-subtle px-3 py-2 text-sm"
              >
                <option value="numeracy">Numeracy</option>
                <option value="reading">Reading</option>
                <option value="writing">Writing</option>
                <option value="language-conventions">
                  Language Conventions
                </option>
                <option value="mathematics">Mathematics</option>
                <option value="english">English</option>
                <option value="science">Science</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">
                Year Level
              </label>
              <input
                type="number"
                min={1}
                max={9}
                value={yearLevel}
                onChange={(e) => setYearLevel(parseInt(e.target.value) || 3)}
                className="w-full rounded-md border border-border-subtle px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">
                Assessment Type
              </label>
              <select
                value={assessmentType}
                onChange={(e) =>
                  setAssessmentType(e.target.value as "naplan" | "icas")
                }
                className="w-full rounded-md border border-border-subtle px-3 py-2 text-sm"
              >
                <option value="naplan">NAPLAN</option>
                <option value="icas">ICAS</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">
              Duration (minutes)
            </label>
            <input
              type="number"
              min={5}
              max={180}
              value={durationMinutes}
              onChange={(e) =>
                setDurationMinutes(parseInt(e.target.value) || 60)
              }
              className="w-full rounded-md border border-border-subtle px-3 py-2 text-sm"
            />
          </div>
        </div>

        {/* Sections */}
        <div className="border-t border-border-subtle pt-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-text-primary">Sections</h3>
            <button
              type="button"
              onClick={handleAddSection}
              className="text-sm text-primary-blue hover:underline"
            >
              + Add Section
            </button>
          </div>

          <div className="space-y-4">
            {sections.map((section, idx) => (
              <SectionEditor
                key={idx}
                section={section}
                onUpdate={(updates) => handleUpdateSection(idx, updates)}
                onRemove={() => handleRemoveSection(idx)}
                canRemove={sections.length > 1}
              />
            ))}
          </div>
        </div>

        {/* Error */}
        {generateError && (
          <div className="rounded-md bg-danger-red/10 px-4 py-3 text-sm text-danger-red">
            {generateError}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 border-t border-border-subtle pt-4">
          <button
            type="button"
            onClick={() => navigate("/admin/exams")}
            disabled={isGenerating}
            className="rounded-md border border-border-subtle bg-white px-4 py-2 text-sm font-medium text-text-primary hover:bg-background-soft disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating}
            className="rounded-md bg-primary-blue px-4 py-2 text-sm font-medium text-white hover:bg-primary-blue-light disabled:opacity-50"
          >
            {isGenerating ? "Generating..." : "Generate Exam"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Section Editor ──

interface SectionEditorProps {
  section: BlueprintSection;
  onUpdate: (updates: Partial<BlueprintSection>) => void;
  onRemove: () => void;
  canRemove: boolean;
}

function SectionEditor({
  section,
  onUpdate,
  onRemove,
  canRemove,
}: SectionEditorProps) {
  return (
    <div className="rounded-md border border-border-subtle bg-background-soft p-4">
      <div className="mb-3 flex items-center justify-between">
        <input
          type="text"
          value={section.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          placeholder="Section name"
          className="rounded-md border border-border-subtle bg-white px-3 py-1.5 text-sm font-medium"
        />
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-sm text-danger-red hover:underline"
          >
            Remove
          </button>
        )}
      </div>

      <div className="space-y-3">
        {/* Question count */}
        <div>
          <label className="mb-1 block text-xs font-medium text-text-muted">
            Number of Questions
          </label>
          <input
            type="number"
            min={1}
            value={section.question_count}
            onChange={(e) =>
              onUpdate({ question_count: parseInt(e.target.value) || 1 })
            }
            className="w-full rounded-md border border-border-subtle bg-white px-3 py-1.5 text-sm"
          />
        </div>

        {/* Filters */}
        <div>
          <label className="mb-1 block text-xs font-medium text-text-muted">
            Filters (optional)
          </label>
          <div className="space-y-2">
            {/* Difficulty */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-muted">Difficulty:</span>
              <div className="flex gap-2">
                {(["easy", "medium", "hard"] as const).map((d) => (
                  <label key={d} className="flex items-center gap-1 text-xs">
                    <input
                      type="checkbox"
                      checked={section.filters.difficulty?.includes(d)}
                      onChange={(e) => {
                        const current = section.filters.difficulty || [];
                        const updated = e.target.checked
                          ? [...current, d]
                          : current.filter((x) => x !== d);
                        onUpdate({
                          filters: { ...section.filters, difficulty: updated },
                        });
                      }}
                      className="rounded"
                    />
                    {d}
                  </label>
                ))}
              </div>
            </div>

            {/* Type */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-muted">Type:</span>
              <div className="flex flex-wrap gap-2">
                {(
                  ["mcq", "multi", "short", "extended", "numeric"] as const
                ).map((t) => (
                  <label key={t} className="flex items-center gap-1 text-xs">
                    <input
                      type="checkbox"
                      checked={section.filters.response_type?.includes(t)}
                      onChange={(e) => {
                        const current = section.filters.response_type || [];
                        const updated = e.target.checked
                          ? [...current, t]
                          : current.filter((x) => x !== t);
                        onUpdate({
                          filters: {
                            ...section.filters,
                            response_type: updated,
                          },
                        });
                      }}
                      className="rounded"
                    />
                    {t}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
