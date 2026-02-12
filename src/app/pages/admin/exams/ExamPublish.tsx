/**
 * ExamPublishPage — Manage exam lifecycle and scheduling
 *
 * Route: /admin/exams/:id/publish
 */

import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "../../../lib/supabase";
import { ExamPublishControls } from "../../../features/exams/components/ExamPublishControls";
import type { ExamPackage } from "../../../features/exams/types/exam-publishing.types";

export function ExamPublishPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [exam, setExam] = useState<ExamPackage | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ──────────────────────────────────────────────────
  // Load Exam
  // ──────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;

    const loadExam = async () => {
      setStatus("loading");
      setError(null);

      try {
        const { data, error: err } = await supabase
          .from("exam_packages")
          .select("*")
          .eq("id", id)
          .single();

        if (err) throw err;

        if (!data) {
          throw new Error("Exam not found");
        }

        setExam(data as ExamPackage);
        setStatus("idle");
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load exam";
        setError(message);
        setStatus("error");
      }
    };

    loadExam();
  }, [id]);

  // ──────────────────────────────────────────────────
  // Handle Status Change
  // ──────────────────────────────────────────────────
  const handleStatusChange = async () => {
    // Reload exam to get updated status
    if (!id) return;

    const { data } = await supabase
      .from("exam_packages")
      .select("*")
      .eq("id", id)
      .single();

    if (data) {
      setExam(data as ExamPackage);
    }
  };

  // ──────────────────────────────────────────────────
  // Render Loading
  // ──────────────────────────────────────────────────
  if (status === "loading") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6">
        <div className="text-center text-text-muted">Loading exam...</div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────
  // Render Error
  // ──────────────────────────────────────────────────
  if (status === "error" || !exam) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6">
        <div className="rounded-md bg-danger-red/10 px-4 py-3 text-sm text-danger-red">
          {error || "Exam not found"}
        </div>
        <div className="mt-4">
          <Link
            to="/admin/exams"
            className="text-sm text-primary-blue hover:underline"
          >
            ← Back to Exams
          </Link>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────
  // Render Main
  // ──────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/admin/exams"
          className="mb-2 inline-block text-sm text-primary-blue hover:underline"
        >
          ← Back to Exams
        </Link>
        <h1 className="text-xl font-bold text-text-primary">{exam.title}</h1>
        <div className="mt-1 flex items-center gap-4 text-sm text-text-muted">
          <span>
            Year {exam.year_level} {exam.subject}
          </span>
          <span>{exam.duration_minutes} minutes</span>
          <span>{exam.total_marks} marks</span>
        </div>
      </div>

      {/* Publishing Controls */}
      <div className="rounded-lg border border-border-subtle bg-white p-6">
        <h2 className="mb-4 font-semibold text-text-primary">
          Exam Lifecycle & Scheduling
        </h2>
        <ExamPublishControls exam={exam} onStatusChange={handleStatusChange} />
      </div>

      {/* Info Boxes */}
      <div className="mt-6 space-y-4">
        <InfoBox
          title="Lifecycle Rules"
          items={[
            "Draft: Editable by admins, hidden from students",
            "Published: Read-only, visible to students",
            "Archived: Hidden from students, preserved for reporting",
          ]}
        />

        <InfoBox
          title="Scheduling"
          items={[
            "Set availability window to control when students can start attempts",
            "Students can still review submitted attempts after window closes",
            "Leave blank for immediate/indefinite availability",
          ]}
        />

        {exam.status === "published" && (
          <InfoBox
            title="Important"
            items={[
              "Published exams cannot be edited",
              "To make changes, unpublish first (only if no student attempts exist)",
              "If attempts exist, archive this version and create a new exam",
            ]}
            variant="warning"
          />
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────
// Info Box
// ──────────────────────────────────────────────────

interface InfoBoxProps {
  title: string;
  items: string[];
  variant?: "info" | "warning";
}

function InfoBox({ title, items, variant = "info" }: InfoBoxProps) {
  const styles = {
    info: "bg-primary-blue/5 border-primary-blue/20",
    warning: "bg-warning-yellow/10 border-warning-yellow/30",
  };

  return (
    <div className={`rounded-md border p-4 ${styles[variant]}`}>
      <div className="mb-2 text-sm font-medium text-text-primary">{title}</div>
      <ul className="space-y-1 text-sm text-text-muted">
        {items.map((item, idx) => (
          <li key={idx} className="flex gap-2">
            <span className="text-text-muted">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
