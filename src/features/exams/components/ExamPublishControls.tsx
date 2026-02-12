/**
 * ExamPublishControls — Admin controls for exam lifecycle
 *
 * Displays current status and provides actions:
 * - Publish (with optional scheduling)
 * - Unpublish (back to draft)
 * - Archive
 */

import { useState } from "react";
import { useExamPublishing } from "../hooks/useExamPublishing";
import type { ExamPackage, ExamStatus } from "../types/exam-publishing.types";

interface ExamPublishControlsProps {
  exam: ExamPackage;
  onStatusChange?: () => void;
}

export function ExamPublishControls({
  exam,
  onStatusChange,
}: ExamPublishControlsProps) {
  const { isUpdating, updateError, publishExam, unpublishExam, archiveExam } =
    useExamPublishing();

  // Scheduling state
  const [showScheduling, setShowScheduling] = useState(false);
  const [availableFrom, setAvailableFrom] = useState(
    exam.available_from
      ? new Date(exam.available_from).toISOString().slice(0, 16)
      : "",
  );
  const [availableUntil, setAvailableUntil] = useState(
    exam.available_until
      ? new Date(exam.available_until).toISOString().slice(0, 16)
      : "",
  );

  // Confirmation state
  const [confirmAction, setConfirmAction] = useState<
    "publish" | "unpublish" | "archive" | null
  >(null);

  // ──────────────────────────────────────────────────
  // Handle Publish
  // ──────────────────────────────────────────────────
  const handlePublish = async () => {
    const from = availableFrom || null;
    const until = availableUntil || null;

    const result = await publishExam(exam.id, from, until);

    if (result.success) {
      setConfirmAction(null);
      setShowScheduling(false);
      onStatusChange?.();
    }
  };

  // ──────────────────────────────────────────────────
  // Handle Unpublish
  // ──────────────────────────────────────────────────
  const handleUnpublish = async () => {
    const result = await unpublishExam(exam.id);

    if (result.success) {
      setConfirmAction(null);
      onStatusChange?.();
    }
  };

  // ──────────────────────────────────────────────────
  // Handle Archive
  // ──────────────────────────────────────────────────
  const handleArchive = async () => {
    const result = await archiveExam(exam.id);

    if (result.success) {
      setConfirmAction(null);
      onStatusChange?.();
    }
  };

  // ──────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Status Badge */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-text-muted">Status:</span>
        <StatusBadge status={exam.status} />
      </div>

      {/* Availability Info */}
      {exam.status === "published" && (
        <div className="rounded-md bg-background-soft p-3 text-sm">
          <div className="font-medium text-text-primary">
            Availability Window
          </div>
          <div className="mt-1 space-y-1 text-text-muted">
            {exam.available_from ? (
              <div>
                Opens:{" "}
                {new Date(exam.available_from).toLocaleString("en-AU", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </div>
            ) : (
              <div>Opens: Immediately</div>
            )}
            {exam.available_until ? (
              <div>
                Closes:{" "}
                {new Date(exam.available_until).toLocaleString("en-AU", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </div>
            ) : (
              <div>Closes: No end date</div>
            )}
          </div>
        </div>
      )}

      {/* Error Display */}
      {updateError && (
        <div className="rounded-md bg-danger-red/10 px-4 py-3 text-sm text-danger-red">
          {updateError}
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmAction && (
        <div className="rounded-md border border-border-subtle bg-background-soft p-4">
          <ConfirmationPrompt
            action={confirmAction}
            exam={exam}
            onConfirm={async () => {
              if (confirmAction === "publish") await handlePublish();
              if (confirmAction === "unpublish") await handleUnpublish();
              if (confirmAction === "archive") await handleArchive();
            }}
            onCancel={() => setConfirmAction(null)}
            isProcessing={isUpdating}
          />
        </div>
      )}

      {/* Scheduling Form (for publish) */}
      {showScheduling && (
        <div className="space-y-3 rounded-md border border-border-subtle bg-white p-4">
          <div className="font-medium text-text-primary">
            Set Availability Window (Optional)
          </div>

          <div>
            <label className="mb-1 block text-sm text-text-muted">
              Available From
            </label>
            <input
              type="datetime-local"
              value={availableFrom}
              onChange={(e) => setAvailableFrom(e.target.value)}
              className="w-full rounded-md border border-border-subtle px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-text-muted">
              Available Until
            </label>
            <input
              type="datetime-local"
              value={availableUntil}
              onChange={(e) => setAvailableUntil(e.target.value)}
              className="w-full rounded-md border border-border-subtle px-3 py-2 text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 border-t border-border-subtle pt-3">
            <button
              type="button"
              onClick={() => setShowScheduling(false)}
              className="rounded-md border border-border-subtle bg-white px-3 py-1.5 text-sm font-medium text-text-primary hover:bg-background-soft"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                setShowScheduling(false);
                setConfirmAction("publish");
              }}
              className="rounded-md bg-primary-blue px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-blue-light"
            >
              Continue to Publish
            </button>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {!confirmAction && !showScheduling && (
        <div className="flex flex-wrap gap-2">
          {exam.status === "draft" && (
            <>
              <button
                type="button"
                onClick={() => setConfirmAction("publish")}
                disabled={isUpdating}
                className="rounded-md bg-success-green px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                Publish Now
              </button>
              <button
                type="button"
                onClick={() => setShowScheduling(true)}
                disabled={isUpdating}
                className="rounded-md border border-border-subtle bg-white px-4 py-2 text-sm font-medium text-text-primary hover:bg-background-soft disabled:opacity-50"
              >
                Schedule Publish
              </button>
            </>
          )}

          {exam.status === "published" && (
            <>
              <button
                type="button"
                onClick={() => setConfirmAction("unpublish")}
                disabled={isUpdating}
                className="rounded-md border border-border-subtle bg-white px-4 py-2 text-sm font-medium text-text-primary hover:bg-background-soft disabled:opacity-50"
              >
                Unpublish
              </button>
              <button
                type="button"
                onClick={() => setConfirmAction("archive")}
                disabled={isUpdating}
                className="rounded-md border border-danger-red bg-white px-4 py-2 text-sm font-medium text-danger-red hover:bg-danger-red/10 disabled:opacity-50"
              >
                Archive
              </button>
            </>
          )}

          {exam.status === "archived" && (
            <div className="text-sm text-text-muted">
              Archived exams cannot be modified. Create a new version if needed.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────
// Status Badge
// ──────────────────────────────────────────────────

function StatusBadge({ status }: { status: ExamStatus }) {
  const styles: Record<ExamStatus, string> = {
    draft: "bg-gray-100 text-gray-700",
    published: "bg-success-green/10 text-success-green",
    archived: "bg-text-muted/10 text-text-muted",
  };

  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// ──────────────────────────────────────────────────
// Confirmation Prompt
// ──────────────────────────────────────────────────

interface ConfirmationPromptProps {
  action: "publish" | "unpublish" | "archive";
  exam: ExamPackage;
  onConfirm: () => void;
  onCancel: () => void;
  isProcessing: boolean;
}

function ConfirmationPrompt({
  action,
  exam,
  onConfirm,
  onCancel,
  isProcessing,
}: ConfirmationPromptProps) {
  const messages = {
    publish: {
      title: "Publish Exam?",
      body: "Once published, this exam becomes read-only and visible to students. You will not be able to edit questions or options.",
      confirmLabel: "Publish Exam",
      confirmStyle: "bg-success-green text-white hover:opacity-90",
    },
    unpublish: {
      title: "Unpublish Exam?",
      body: "This exam will return to draft status and become hidden from students. Any existing attempts will remain but students cannot start new attempts.",
      confirmLabel: "Unpublish",
      confirmStyle: "bg-primary-blue text-white hover:bg-primary-blue-light",
    },
    archive: {
      title: "Archive Exam?",
      body: "Archived exams are permanently hidden from students and cannot be edited. Existing student attempts and data will be preserved.",
      confirmLabel: "Archive Exam",
      confirmStyle: "bg-danger-red text-white hover:opacity-90",
    },
  };

  const config = messages[action];

  return (
    <div>
      <div className="mb-2 font-medium text-text-primary">{config.title}</div>
      <div className="mb-4 text-sm text-text-muted">{config.body}</div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isProcessing}
          className="rounded-md border border-border-subtle bg-white px-3 py-1.5 text-sm font-medium text-text-primary hover:bg-background-soft disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isProcessing}
          className={`rounded-md px-3 py-1.5 text-sm font-medium disabled:opacity-50 ${config.confirmStyle}`}
        >
          {isProcessing ? "Processing..." : config.confirmLabel}
        </button>
      </div>
    </div>
  );
}
