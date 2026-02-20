/**
 * MindMosaic — ExamReviewPage (Premium)
 *
 * Features:
 * - Hero score banner: % ring, score, pass/fail badge, stat grid
 * - Filter bar: All / Correct / Incorrect / Flagged (and by topic if available)
 * - Each question card: prompt, student answer, correct answer, explanation
 * - Zero backend changes — uses existing useExamReview hook as-is
 */

import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useExamReview } from "../../../features/exam/hooks/useExamReview";
import type { ReviewQuestionData } from "../../../features/exam/hooks/useExamReview";

type Filter = "all" | "correct" | "incorrect" | "unanswered";

export function ExamReviewPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const { status, data, error } = useExamReview(attemptId);
  const [filter, setFilter] = useState<Filter>("all");

  // ─── Loading ──────────────────────────────────────────────────────────────
  if (status === "loading")
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "40vh",
          flexDirection: "column",
          gap: 14,
          fontFamily: '"Nunito",ui-rounded,system-ui,sans-serif',
        }}
      >
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            border: "4px solid #2563eb",
            borderTopColor: "transparent",
            animation: "spin .7s linear infinite",
          }}
        />
        <p style={{ color: "#64748b", fontWeight: 700, margin: 0 }}>
          Loading your results…
        </p>
      </div>
    );

  if (status === "not-submitted")
    return (
      <div
        style={{
          maxWidth: 400,
          margin: "80px auto",
          textAlign: "center",
          padding: "0 24px",
        }}
      >
        <span style={{ fontSize: 52 }}>⏳</span>
        <h2 style={{ margin: "16px 0 8px", fontWeight: 900, color: "#0f172a" }}>
          Exam still in progress
        </h2>
        <p style={{ color: "#64748b", lineHeight: 1.65, marginBottom: 24 }}>
          Submit the exam first to review your results.
        </p>
        <button
          onClick={() => navigate(`/student/attempt/${attemptId}`)}
          style={btnStyle("#2563eb")}
        >
          Continue Exam
        </button>
      </div>
    );

  if (status === "not-found" || status === "error" || !data)
    return (
      <div
        style={{
          maxWidth: 400,
          margin: "80px auto",
          textAlign: "center",
          padding: "0 24px",
        }}
      >
        <span style={{ fontSize: 52 }}>😕</span>
        <h2 style={{ margin: "16px 0 8px", fontWeight: 900, color: "#0f172a" }}>
          Review not found
        </h2>
        <p style={{ color: "#64748b", lineHeight: 1.65, marginBottom: 24 }}>
          {error ?? "We couldn't load this review."}
        </p>
        <button
          onClick={() => navigate("/student/exams")}
          style={btnStyle("#2563eb")}
        >
          Back to Exams
        </button>
      </div>
    );

  const { attempt, examPackage, questions, result } = data;
  const isScored = !!result;

  // ─── Stats ────────────────────────────────────────────────────────────────
  const correctCount = questions.filter(
    (q) => q.breakdown?.correct === true,
  ).length;
  const incorrectCount = questions.filter(
    (q) =>
      q.breakdown?.correct === false && !q.breakdown.requires_manual_review,
  ).length;
  const unanswCount = questions.filter(
    (q) => !q.response || isEmptyResponse(q.response),
  ).length;
  const manualCount = questions.filter(
    (q) => q.breakdown?.requires_manual_review,
  ).length;
  const pct = result ? Math.round(result.percentage) : 0;

  // ─── Filter ───────────────────────────────────────────────────────────────
  const filtered = useMemo(
    () =>
      questions.filter((q) => {
        if (filter === "all") return true;
        if (filter === "correct") return q.breakdown?.correct === true;
        if (filter === "incorrect")
          return (
            q.breakdown?.correct === false &&
            !q.breakdown.requires_manual_review
          );
        if (filter === "unanswered")
          return !q.response || isEmptyResponse(q.response);
        return true;
      }),
    [questions, filter],
  );

  const submittedDate = attempt.submitted_at
    ? new Date(attempt.submitted_at).toLocaleDateString("en-AU", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

  return (
    <div
      style={{
        maxWidth: 900,
        margin: "0 auto",
        padding: "32px 16px 64px",
        fontFamily: '"Nunito",ui-rounded,system-ui,sans-serif',
      }}
    >
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .rv-card { font-family:"Nunito",ui-rounded,system-ui,sans-serif; background:#fff; border:1px solid rgba(15,23,42,0.10); border-radius:16px; box-shadow:0 2px 8px rgba(2,6,23,0.06),0 4px 18px rgba(2,6,23,0.05); overflow:hidden; }
        .rv-opt  { display:flex; align-items:center; gap:10px; padding:10px 14px; border-radius:10px; border:1px solid rgba(15,23,42,0.10); background:rgba(148,163,184,0.06); font-size:14px; font-weight:700; }
        .rv-badge{ width:28px; height:28px; border-radius:9px; display:grid; place-items:center; font-weight:900; font-size:12px; flex-shrink:0; }
      `}</style>

      {/* Back link */}
      <button
        onClick={() => navigate("/student/exams")}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "#64748b",
          fontWeight: 700,
          fontSize: 13,
          padding: 0,
          marginBottom: 24,
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontFamily: '"Nunito",ui-rounded,system-ui,sans-serif',
          transition: "color 0.15s",
        }}
        onMouseEnter={(e) =>
          ((e.currentTarget as HTMLButtonElement).style.color = "#0f172a")
        }
        onMouseLeave={(e) =>
          ((e.currentTarget as HTMLButtonElement).style.color = "#64748b")
        }
      >
        ← Back to Exams
      </button>

      {/* ── Hero score banner ─────────────────────────────────────────────── */}
      <div
        style={{
          borderRadius: 24,
          overflow: "hidden",
          marginBottom: 24,
          background: "linear-gradient(135deg, #eef2f9, #e8f0fc)",
          border: "1px solid rgba(37,99,235,0.15)",
          boxShadow: "0 8px 32px rgba(37,99,235,0.10)",
        }}
      >
        <div
          style={{
            padding: "28px 28px 0",
            background:
              "linear-gradient(135deg, rgba(37,99,235,0.12), rgba(20,184,166,0.08))",
          }}
        >
          <p
            style={{
              margin: "0 0 4px",
              fontSize: 13,
              fontWeight: 700,
              color: "#64748b",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            {examPackage.title}
          </p>
          <p
            style={{
              margin: 0,
              fontSize: 12,
              color: "#94a3b8",
              fontWeight: 600,
            }}
          >
            {submittedDate} · {questions.length} question
            {questions.length !== 1 ? "s" : ""}
          </p>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 28,
              flexWrap: "wrap",
              margin: "20px 0 0",
              paddingBottom: 24,
            }}
          >
            {/* Conic ring */}
            <div
              style={{
                position: "relative",
                width: 96,
                height: 96,
                flexShrink: 0,
              }}
            >
              <svg
                width="96"
                height="96"
                style={{ transform: "rotate(-90deg)" }}
              >
                <circle
                  cx="48"
                  cy="48"
                  r="38"
                  fill="none"
                  stroke="rgba(148,163,184,0.22)"
                  strokeWidth="9"
                />
                <circle
                  cx="48"
                  cy="48"
                  r="38"
                  fill="none"
                  stroke={
                    isScored
                      ? result.passed
                        ? "#16a34a"
                        : "#f59e0b"
                      : "#2563eb"
                  }
                  strokeWidth="9"
                  strokeLinecap="round"
                  strokeDasharray={`${(pct / 100) * 2 * Math.PI * 38} ${2 * Math.PI * 38}`}
                />
              </svg>
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span
                  style={{
                    fontSize: 22,
                    fontWeight: 900,
                    color: "#0f172a",
                    lineHeight: 1,
                  }}
                >
                  {pct}%
                </span>
                {isScored && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: "#64748b",
                      marginTop: 1,
                    }}
                  >
                    Score
                  </span>
                )}
              </div>
            </div>

            {/* Score text + badge */}
            <div>
              {isScored ? (
                <>
                  <div
                    style={{
                      fontSize: 32,
                      fontWeight: 900,
                      color: result.passed ? "#16a34a" : "#f59e0b",
                      lineHeight: 1,
                    }}
                  >
                    {result.total_score}{" "}
                    <span style={{ fontSize: 18, color: "#94a3b8" }}>
                      / {result.max_score}
                    </span>
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "5px 14px",
                        borderRadius: 999,
                        fontWeight: 900,
                        fontSize: 13,
                        color: "#fff",
                        background: result.passed ? "#16a34a" : "#f59e0b",
                      }}
                    >
                      {result.passed ? "✓ Well done!" : "Keep practising!"}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div
                    style={{
                      fontSize: 22,
                      fontWeight: 900,
                      color: "#0f172a",
                      lineHeight: 1.2,
                    }}
                  >
                    Exam Submitted
                  </div>
                  <div
                    style={{
                      marginTop: 8,
                      fontSize: 13,
                      color: "#64748b",
                      fontWeight: 700,
                    }}
                  >
                    Results will be available shortly.
                  </div>
                </>
              )}
            </div>

            {/* Stat chips */}
            {isScored && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2,1fr)",
                  gap: 10,
                  marginLeft: "auto",
                }}
              >
                {[
                  { label: "Correct", val: correctCount, col: "#16a34a" },
                  { label: "Incorrect", val: incorrectCount, col: "#ef4444" },
                  { label: "Unanswered", val: unanswCount, col: "#94a3b8" },
                  { label: "Manual review", val: manualCount, col: "#f59e0b" },
                ].map(({ label, val, col }) => (
                  <div
                    key={label}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 12,
                      border: "1px solid rgba(15,23,42,0.10)",
                      background: "rgba(255,255,255,0.70)",
                      backdropFilter: "blur(8px)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: "#64748b",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      {label}
                    </div>
                    <div
                      style={{
                        fontSize: 20,
                        fontWeight: 900,
                        color: col,
                        lineHeight: 1.2,
                        marginTop: 2,
                      }}
                    >
                      {val}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Filter bar ───────────────────────────────────────────────────── */}
      <div
        style={{ display: "flex", gap: 9, flexWrap: "wrap", marginBottom: 22 }}
      >
        {(
          [
            ["all", `All (${questions.length})`],
            ["correct", `✓ Correct (${correctCount})`],
            ["incorrect", `✗ Incorrect (${incorrectCount})`],
            ["unanswered", `○ Unanswered (${unanswCount})`],
          ] as [Filter, string][]
        ).map(([f, label]) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: "8px 16px",
              borderRadius: 999,
              border: "1px solid",
              fontWeight: 800,
              fontSize: 13,
              cursor: "pointer",
              borderColor: filter === f ? "#2563eb" : "rgba(15,23,42,0.14)",
              background:
                filter === f
                  ? "rgba(37,99,235,0.10)"
                  : "rgba(255,255,255,0.80)",
              color: filter === f ? "#2563eb" : "#64748b",
              boxShadow:
                filter === f ? "0 0 0 3px rgba(37,99,235,0.12)" : "none",
              transition: "all 0.15s",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Results count */}
      <p
        style={{
          margin: "0 0 16px",
          fontSize: 13,
          color: "#94a3b8",
          fontWeight: 700,
        }}
      >
        Showing {filtered.length} of {questions.length} question
        {questions.length !== 1 ? "s" : ""}
      </p>

      {/* ── Question cards ────────────────────────────────────────────────── */}
      <div style={{ display: "grid", gap: 16 }}>
        {filtered.map((q) => (
          <ReviewCard key={q.question.id} data={q} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div
          style={{ textAlign: "center", padding: "48px 0", color: "#94a3b8" }}
        >
          <span style={{ fontSize: 40 }}>🎯</span>
          <p style={{ marginTop: 12, fontWeight: 700 }}>
            No questions match this filter.
          </p>
        </div>
      )}

      {/* Footer */}
      <div
        style={{
          marginTop: 48,
          paddingTop: 24,
          borderTop: "1px solid rgba(15,23,42,0.10)",
          textAlign: "center",
        }}
      >
        <p style={{ color: "#64748b", fontWeight: 700, marginBottom: 16 }}>
          {result?.passed
            ? "Excellent! Ready to try another exam?"
            : "Every practice makes you stronger. Keep going!"}
        </p>
        <button
          onClick={() => navigate("/student/exams")}
          style={btnStyle("#2563eb")}
        >
          Try Another Exam →
        </button>
      </div>
    </div>
  );
}

// ─── individual question review card ──────────────────────────────────────────
function ReviewCard({ data }: { data: ReviewQuestionData }) {
  const [expanded, setExpanded] = useState(false);
  const { question, options, response, breakdown } = data;

  const isScored = breakdown !== null;
  const isCorrect = breakdown?.correct ?? null;
  const isManual = breakdown?.requires_manual_review ?? false;
  const empty = !response || isEmptyResponse(response);

  const borderCol = !isScored
    ? "#d8e2f3"
    : isCorrect
      ? "#16a34a"
      : isManual
        ? "#f59e0b"
        : "#ef4444";

  const bgCol = !isScored
    ? "transparent"
    : isCorrect
      ? "rgba(22,163,74,0.04)"
      : isManual
        ? "rgba(245,158,11,0.04)"
        : "rgba(239,68,68,0.04)";

  const badge = !isScored
    ? null
    : isCorrect
      ? { label: "Correct", bg: "#16a34a" }
      : isManual
        ? { label: "Review", bg: "#f59e0b" }
        : { label: "Incorrect", bg: "#ef4444" };

  // Get the selected option id(s)
  const selectedId =
    response && "selectedOptionId" in response
      ? (response as { selectedOptionId: string }).selectedOptionId
      : null;

  // Get text blocks from prompt_blocks
  const promptText = Array.isArray(question.prompt_blocks)
    ? question.prompt_blocks
        .filter((b: { type: string }) => b.type === "text")
        .map((b: { content: string }) => b.content)
        .join("\n")
    : "";

  const correctOption = options?.find(
    (o) => o.option_id === breakdown?.correct_option_id,
  );

  return (
    <div
      className="rv-card"
      style={{ borderLeft: `4px solid ${borderCol}`, background: `${bgCol}` }}
    >
      {/* Card header */}
      <div
        style={{
          padding: "16px 18px 14px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
          borderBottom: "1px solid rgba(15,23,42,0.08)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: "#2563eb",
              color: "#fff",
              fontWeight: 900,
              fontSize: 12,
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            {question.sequence_number}
          </span>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#64748b" }}>
            {question.marks} {question.marks === 1 ? "mark" : "marks"} ·{" "}
            {formatType(question.response_type)}
          </span>
        </div>
        {badge && (
          <span
            style={{
              padding: "4px 12px",
              borderRadius: 999,
              background: badge.bg,
              color: "#fff",
              fontSize: 12,
              fontWeight: 900,
              flexShrink: 0,
            }}
          >
            {badge.label}
          </span>
        )}
        {!isScored && (
          <span
            style={{
              fontSize: 12,
              color: "#94a3b8",
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            Pending review
          </span>
        )}
      </div>

      {/* Question prompt */}
      <div
        style={{
          padding: "14px 18px",
          background: "rgba(255,255,255,0.80)",
          borderBottom: "1px solid rgba(15,23,42,0.07)",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 14,
            fontWeight: 700,
            color: "#0f172a",
            lineHeight: 1.6,
          }}
        >
          {promptText || "(No prompt text)"}
        </p>
      </div>

      {/* Options (MCQ) */}
      {options && options.length > 0 && (
        <div style={{ padding: "12px 18px", display: "grid", gap: 8 }}>
          {options.map((opt, idx) => {
            const isSelected = opt.option_id === selectedId;
            const isCorrectOpt = opt.option_id === breakdown?.correct_option_id;
            const letter = String.fromCharCode(65 + idx);

            const optBg =
              isCorrectOpt && isScored
                ? "rgba(22,163,74,0.10)"
                : isSelected && !isCorrectOpt && isScored
                  ? "rgba(239,68,68,0.08)"
                  : "rgba(148,163,184,0.06)";
            const optBorder =
              isCorrectOpt && isScored
                ? "rgba(22,163,74,0.40)"
                : isSelected && !isCorrectOpt && isScored
                  ? "rgba(239,68,68,0.40)"
                  : "rgba(15,23,42,0.10)";
            const badgeBg =
              isCorrectOpt && isScored
                ? "#16a34a"
                : isSelected && !isCorrectOpt && isScored
                  ? "#ef4444"
                  : "rgba(148,163,184,0.18)";
            const badgeCol =
              (isCorrectOpt || (isSelected && !isCorrectOpt)) && isScored
                ? "#fff"
                : "#64748b";

            return (
              <div
                key={opt.option_id}
                className="rv-opt"
                style={{
                  background: optBg,
                  borderColor: optBorder,
                  border: `1px solid ${optBorder}`,
                }}
              >
                <span
                  className="rv-badge"
                  style={{ background: badgeBg, color: badgeCol }}
                >
                  {letter}
                </span>
                <span style={{ flex: 1, color: "#0f172a" }}>
                  {String(opt.content)}
                </span>
                {isSelected && (
                  <span
                    style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}
                  >
                    Your answer
                  </span>
                )}
                {isCorrectOpt && isScored && !isSelected && (
                  <span
                    style={{ fontSize: 11, fontWeight: 700, color: "#16a34a" }}
                  >
                    ✓ Correct answer
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Non-MCQ response */}
      {(!options || options.length === 0) && !empty && (
        <div style={{ padding: "12px 18px" }}>
          <div
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid rgba(15,23,42,0.10)",
              background: "rgba(148,163,184,0.06)",
              fontSize: 14,
              color: "#0f172a",
              fontWeight: 700,
            }}
          >
            Your answer: {getResponseText(response)}
          </div>
          {correctOption && (
            <div
              style={{
                marginTop: 8,
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid rgba(22,163,74,0.30)",
                background: "rgba(22,163,74,0.08)",
                fontSize: 14,
                color: "#15803d",
                fontWeight: 700,
              }}
            >
              ✓ Correct: {String(correctOption.content)}
            </div>
          )}
        </div>
      )}

      {/* Empty response */}
      {empty && (
        <div style={{ padding: "12px 18px" }}>
          <div
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid rgba(148,163,184,0.28)",
              background: "rgba(148,163,184,0.07)",
              fontSize: 13,
              color: "#94a3b8",
              fontWeight: 700,
            }}
          >
            No answer provided
          </div>
        </div>
      )}

      {/* Explanation (collapsible) */}
      {breakdown?.explanation && (
        <div
          style={{
            borderTop: "1px solid rgba(15,23,42,0.07)",
            padding: "12px 18px",
          }}
        >
          <button
            onClick={() => setExpanded((e) => !e)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#2563eb",
              fontWeight: 800,
              fontSize: 13,
              padding: 0,
              display: "flex",
              alignItems: "center",
              gap: 7,
            }}
          >
            {expanded ? "▾" : "▸"}{" "}
            {expanded ? "Hide explanation" : "Show explanation"}
          </button>
          {expanded && (
            <div
              style={{
                marginTop: 10,
                padding: "12px 14px",
                borderRadius: 10,
                border: "1px solid rgba(37,99,235,0.18)",
                background: "rgba(37,99,235,0.05)",
                fontSize: 13,
                color: "#1e3a8a",
                fontWeight: 700,
                lineHeight: 1.65,
              }}
            >
              💬 {breakdown.explanation}
            </div>
          )}
        </div>
      )}

      {/* Manual review notice */}
      {isManual && (
        <div
          style={{
            padding: "10px 18px",
            background: "rgba(245,158,11,0.06)",
            borderTop: "1px solid rgba(245,158,11,0.20)",
            fontSize: 13,
            color: "#92400e",
            fontWeight: 700,
          }}
        >
          📝 This question requires manual review by your teacher.
        </div>
      )}
    </div>
  );
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function isEmptyResponse(r: unknown): boolean {
  if (!r || typeof r !== "object") return true;
  const obj = r as Record<string, unknown>;
  if ("selectedOptionId" in obj && obj.selectedOptionId) return false;
  if (
    "selectedOptionIds" in obj &&
    Array.isArray(obj.selectedOptionIds) &&
    obj.selectedOptionIds.length > 0
  )
    return false;
  if ("answer" in obj && String(obj.answer).trim()) return false;
  return true;
}

function getResponseText(r: unknown): string {
  if (!r || typeof r !== "object") return "";
  const obj = r as Record<string, unknown>;
  if ("answer" in obj) return String(obj.answer);
  if ("selectedOptionId" in obj) return String(obj.selectedOptionId);
  return JSON.stringify(obj);
}

function formatType(t: string): string {
  const map: Record<string, string> = {
    mcq: "Multiple Choice",
    multi_select: "Multi Select",
    multi: "Multi Select",
    short: "Short Answer",
    numeric: "Numeric",
    boolean: "True/False",
    ordering: "Ordering",
    matching: "Matching",
    extended: "Extended",
  };
  return map[t] ?? t;
}

function btnStyle(bg: string): React.CSSProperties {
  return {
    padding: "12px 24px",
    borderRadius: 12,
    border: "none",
    background: bg,
    color: "#fff",
    fontWeight: 900,
    fontSize: 14,
    cursor: "pointer",
    boxShadow: `0 8px 24px ${bg}44`,
    fontFamily: "inherit",
  };
}
