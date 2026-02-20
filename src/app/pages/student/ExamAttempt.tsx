/**
 * MindMosaic — ExamAttemptPage v5 (Definitive)
 *
 * FIXES:
 * 1. Integrity banner PUSHES content down (flexbox column, not fixed overlay)
 * 2. answeredCount comes directly from useExamAttempt hook (always accurate)
 * 3. Portal escape from StudentLayout via createPortal
 * 4. Full premium glassmorphism UI, fully responsive
 * 5. Zero backend changes
 */

import { useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { useParams, useNavigate } from "react-router-dom";
import { useExamAttempt } from "../../../features/exam/hooks/useExamAttempt";
import { QuestionRenderer } from "../../../features/exam/components/QuestionRenderer";
import { ExamTimer } from "../../../features/exam/components/ExamTimer";
import { useExamIntegrity } from "../../../features/exam/hooks/useExamIntegrity";
import { ExamModeProvider } from "../../../context/ExamModeContext";
import {
  getExamModeForAttempt,
  clearExamModeForAttempt,
  type ExamMode,
} from "../../../types/exam-mode";
import type { ResponseData } from "../../../features/exam/types/exam.types";

// ─── outer page ──────────────────────────────────────────────────────────────
export function ExamAttemptPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const id = attemptId ?? "";
  const [mode] = useState<ExamMode>(() => getExamModeForAttempt(id));
  useEffect(() => () => clearExamModeForAttempt(id), [id]);

  return (
    <ExamModeProvider mode={mode}>
      <PortalShell attemptId={id} mode={mode} />
    </ExamModeProvider>
  );
}

// ─── portal ──────────────────────────────────────────────────────────────────
function PortalShell({
  attemptId,
  mode,
}: {
  attemptId: string;
  mode: ExamMode;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    document.body.classList.add("exam-runtime-active");
    return () => {
      setMounted(false);
      document.body.classList.remove("exam-runtime-active");
    };
  }, []);
  if (!mounted) return null;
  return createPortal(
    <ExamShell attemptId={attemptId} mode={mode} />,
    document.body,
  );
}

// ─── injected CSS (fully self-contained, scoped to #mm-exam-shell) ────────────
const CSS = (mode: ExamMode) => `
  #mm-exam-shell {
    position:fixed;inset:0;z-index:100;
    font-family:"Nunito",ui-rounded,system-ui,sans-serif;
    overflow:hidden;display:flex;flex-direction:column;
  }
  #mm-exam-shell {
    --B:#2563eb;--A:#14b8a6;--BG:#eaeff9;
    --SU:rgba(255,255,255,0.86);--SO:#fff;
    --TX:#0f172a;--MT:#64748b;
    --BD:rgba(15,23,42,0.10);--BDS:rgba(15,23,42,0.18);
    --OK:#16a34a;--WN:#f59e0b;--DG:#ef4444;--IN:#3b82f6;--FL:#f59e0b;--UN:#94a3b8;
    --CB:rgba(37,99,235,0.12);--CDB:rgba(37,99,235,0.52);
    --SB:rgba(37,99,235,0.09);--SDB:rgba(37,99,235,0.52);
    --RSM:10px;--RMD:14px;--RLG:18px;--RXL:24px;
    --SP:0 20px 60px rgba(2,6,23,0.10),0 4px 16px rgba(2,6,23,0.06);
    --SC:0 6px 20px rgba(2,6,23,0.07);
    --EZ:cubic-bezier(.22,.8,.22,1);--FO:0 0 0 3px rgba(37,99,235,0.25);
    --BH:48px;
  }
  ${mode === "naplan" ? `#mm-exam-shell{--B:#1e40af;--A:#0891b2;--BG:#edf0f7;--RSM:6px;--RMD:8px;--RLG:10px;--RXL:14px;}` : ""}

  /* Banner — flex item, pushes body down */
  .eb{flex-shrink:0;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:9px 18px;font-weight:700;font-size:13px;animation:esd .2s var(--EZ)}
  .eb-p{background:rgba(245,158,11,0.14);border-bottom:1px solid rgba(245,158,11,0.30);color:#92400e}
  .eb-n{background:#dc2626;color:#fff}

  /* Background fx */
  .ebg{position:absolute;inset:-80px;pointer-events:none;z-index:0;
    background:radial-gradient(1400px 800px at 10% 8%,rgba(37,99,235,0.18) 0%,transparent 55%),
               radial-gradient(1100px 700px at 90% 8%,rgba(20,184,166,0.14) 0%,transparent 52%),
               radial-gradient(800px 700px at 45% 98%,rgba(59,130,246,0.10) 0%,transparent 58%)}
  .ebg::after{content:"";position:absolute;inset:0;
    background-image:radial-gradient(circle,rgba(148,163,184,0.18) 1px,transparent 1px);
    background-size:24px 24px;opacity:0.40;
    mask-image:radial-gradient(900px 600px at 50% 20%,#000 55%,transparent 100%)}

  /* Body grid */
  .ebody{flex:1;min-height:0;position:relative;z-index:0;
    display:grid;grid-template-columns:280px 1fr;gap:16px;padding:16px;
    background:var(--BG);overflow:hidden}
  @media(max-width:900px){.ebody{grid-template-columns:1fr}.esb{display:none!important}}

  /* Glass */
  .egl{background:var(--SU);border:1px solid var(--BD);box-shadow:var(--SP);
    backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border-radius:var(--RXL);overflow:hidden}

  /* Sidebar */
  .esb{display:flex;flex-direction:column;min-height:0}
  .esbh{padding:15px 15px 11px;border-bottom:1px solid var(--BD);flex-shrink:0;
    background:linear-gradient(145deg,rgba(37,99,235,0.10),rgba(20,184,166,0.07))}
  .ebr{display:flex;align-items:center;justify-content:space-between;margin-bottom:11px}
  .elog{width:36px;height:36px;border-radius:11px;flex-shrink:0;
    background:linear-gradient(135deg,var(--B),var(--A));box-shadow:0 8px 20px rgba(37,99,235,0.28);
    position:relative;overflow:hidden}
  .elog::after{content:"";position:absolute;inset:-55%;
    background:radial-gradient(circle at 28% 28%,rgba(255,255,255,0.60),transparent 55%);transform:rotate(18deg)}
  .eib{width:34px;height:34px;border-radius:10px;border:1px solid var(--BD);
    background:rgba(148,163,184,0.12);cursor:pointer;display:grid;place-items:center;font-size:15px;
    transition:background .15s,transform .08s}
  .eib:hover{background:rgba(148,163,184,0.22)}.eib:active{transform:scale(0.95)}
  .eib:focus{outline:none;box-shadow:var(--FO)}
  .ests{display:grid;grid-template-columns:1fr 1fr;gap:7px}
  .est{padding:7px 9px;border-radius:999px;border:1px solid var(--BD);background:rgba(148,163,184,0.08);
    display:flex;align-items:center;gap:7px;font-weight:800;font-size:12px;color:var(--TX)}
  .edt{width:8px;height:8px;border-radius:999px;flex-shrink:0}
  .edt-ok  {background:var(--OK);box-shadow:0 0 0 3px rgba(22,163,74,0.16)}
  .edt-no  {background:var(--UN);box-shadow:0 0 0 3px rgba(148,163,184,0.16)}
  .edt-fl  {background:var(--FL);box-shadow:0 0 0 3px rgba(245,158,11,0.16)}
  .edt-in  {background:var(--IN);box-shadow:0 0 0 3px rgba(59,130,246,0.16)}
  .esbb{flex:1;min-height:0;overflow-y:auto;padding:11px 13px 13px;display:flex;flex-direction:column;gap:11px}
  .esbb::-webkit-scrollbar{width:3px}.esbb::-webkit-scrollbar-thumb{background:rgba(148,163,184,0.26);border-radius:2px}
  .esl{font-weight:900;font-size:12px;color:var(--TX)}.ess{font-size:11px;color:var(--MT);font-weight:600;margin-top:1px}

  /* Q grid */
  .eqg{display:grid;grid-template-columns:repeat(5,1fr);gap:7px;max-height:44vh;overflow-y:auto;padding-right:1px}
  .eqg::-webkit-scrollbar{width:3px}.eqg::-webkit-scrollbar-thumb{background:rgba(148,163,184,0.22);border-radius:2px}
  .eqb{height:42px;border-radius:var(--RMD);border:1px solid var(--BD);background:rgba(148,163,184,0.09);
    color:var(--TX);font-weight:900;font-size:12px;font-family:inherit;cursor:pointer;position:relative;
    transition:transform .08s var(--EZ),background .15s}
  .eqb:hover{background:rgba(148,163,184,0.18);transform:translateY(-1px)}.eqb:active{transform:scale(0.97)}
  .eqb:focus{outline:none;box-shadow:var(--FO)}
  .eqb::before{content:"";position:absolute;left:6px;right:6px;bottom:5px;height:3px;border-radius:999px;background:rgba(148,163,184,0.26)}
  .eqb[data-ans="true"]::before{background:rgba(22,163,74,0.68)}
  .eqb[data-cur="true"]{border-color:var(--CDB);background:var(--CB);box-shadow:0 0 0 3px rgba(37,99,235,0.12)}
  .eqb[data-flag="true"]::after{content:"";position:absolute;top:6px;right:7px;width:6px;height:6px;border-radius:999px;background:var(--FL);box-shadow:0 0 0 2px rgba(245,158,11,0.20)}
  .elg{padding:9px;border-radius:var(--RMD);border:1px solid var(--BD);background:rgba(148,163,184,0.05);display:grid;gap:5px}
  .elr{display:flex;align-items:center;gap:8px;font-size:11px;font-weight:700;color:var(--TX)}

  /* Main */
  .emn{display:flex;flex-direction:column;min-height:0}
  .etb{padding:10px 20px;border-bottom:1px solid var(--BD);display:flex;align-items:center;justify-content:space-between;gap:12px;flex-shrink:0;background:linear-gradient(180deg,rgba(148,163,184,0.07),transparent)}
  .etc{display:inline-flex;align-items:center;gap:8px;padding:8px 13px;border-radius:999px;border:1px solid var(--BD);background:rgba(148,163,184,0.10);font-weight:900;font-size:14px;white-space:nowrap}
  .ern{width:40px;height:40px;border-radius:999px;display:grid;place-items:center;border:1px solid var(--BD);flex-shrink:0}
  .eri{width:30px;height:30px;border-radius:999px;background:var(--SO);display:grid;place-items:center;font-weight:900;font-size:10px;color:var(--TX)}
  .ebt{height:8px;border-radius:999px;border:1px solid var(--BD);background:rgba(148,163,184,0.18);overflow:hidden;flex:1;min-width:100px}
  .ebf{height:100%;border-radius:999px;background:linear-gradient(90deg,var(--B),var(--A));transition:width .28s var(--EZ)}
  .econ{flex:1;overflow-y:auto;padding:18px 20px 12px;min-height:0}
  .econ::-webkit-scrollbar{width:5px}.econ::-webkit-scrollbar-thumb{background:rgba(148,163,184,0.24);border-radius:3px}
  .eqh{display:flex;justify-content:space-between;align-items:flex-start;gap:14px;margin-bottom:15px}

  /* MCQ overrides */
  #mm-exam-shell .econ .bg-white{background:rgba(255,255,255,0.90)!important;border-radius:var(--RLG)!important;border:1px solid var(--BD)!important;box-shadow:var(--SC)!important}
  #mm-exam-shell .econ .border-primary-blue,#mm-exam-shell .econ .border-blue-500,
  #mm-exam-shell .econ [aria-checked="true"],#mm-exam-shell .econ [data-selected="true"]{border-color:var(--SDB)!important;background:var(--SB)!important;box-shadow:0 0 0 3px rgba(37,99,235,0.12)!important}
  #mm-exam-shell .econ .space-y-2>*,#mm-exam-shell .econ .space-y-3>*{border-radius:var(--RMD)!important;transition:transform .08s,background .15s!important}
  #mm-exam-shell .econ .space-y-2>*:hover,#mm-exam-shell .econ .space-y-3>*:hover{transform:translateY(-1px)}

  /* Dock */
  .edk{padding:11px 20px;border-top:1px solid var(--BD);background:rgba(255,255,255,0.65);backdrop-filter:blur(16px);display:flex;justify-content:space-between;align-items:center;gap:10px;flex-shrink:0;flex-wrap:wrap}

  /* Buttons */
  .ebn{height:var(--BH);padding:0 16px;border-radius:var(--RMD);border:1px solid var(--BD);background:rgba(148,163,184,0.12);color:var(--TX);font-weight:900;font-size:13px;font-family:inherit;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:7px;white-space:nowrap;transition:transform .08s var(--EZ),background .15s;user-select:none}
  .ebn:hover{background:rgba(148,163,184,0.20);transform:translateY(-1px)}.ebn:active{transform:scale(0.98)}
  .ebn:focus{outline:none;box-shadow:var(--FO)}.ebn:disabled{opacity:0.45;cursor:not-allowed;transform:none!important}
  .ebn-p{color:#fff;border-color:rgba(37,99,235,0.38);background:linear-gradient(135deg,#2563eb,#14b8a6);box-shadow:0 8px 26px rgba(37,99,235,0.25)}
  .ebn-p:hover{filter:brightness(1.06)}
  .ebn-g{background:transparent!important}.ebn-w{border-color:rgba(245,158,11,0.36);background:rgba(245,158,11,0.09)}
  .ebn-w[aria-pressed="true"]{border-color:rgba(245,158,11,0.62);background:rgba(245,158,11,0.18);box-shadow:0 0 0 3px rgba(245,158,11,0.14)}

  /* Modal */
  .emb{position:fixed;inset:0;z-index:200;display:grid;place-items:center;background:rgba(2,6,23,0.60);backdrop-filter:blur(6px);padding:20px;animation:ef .18s ease both}
  .emd{width:min(520px,100%);border-radius:var(--RXL);border:1px solid var(--BD);background:var(--SO);box-shadow:0 28px 70px rgba(2,6,23,0.16);overflow:hidden;animation:esu .22s var(--EZ) both}
  .emh{padding:19px 21px;border-bottom:1px solid var(--BD);background:linear-gradient(135deg,rgba(37,99,235,0.08),rgba(20,184,166,0.06))}
  .embd{padding:19px 21px;color:var(--MT);font-weight:700;font-size:13px}
  .emf{padding:12px 21px;border-top:1px solid var(--BD);background:rgba(148,163,184,0.05);display:flex;justify-content:flex-end;gap:9px}
  .esb2{padding:9px 11px;border-radius:var(--RSM);border:1px solid var(--BD);background:rgba(148,163,184,0.06)}

  /* Skeleton */
  .esk{border-radius:999px;background:linear-gradient(90deg,rgba(148,163,184,0.14),rgba(148,163,184,0.26),rgba(148,163,184,0.14));background-size:200% 100%;animation:esm 1.1s linear infinite}

  /* Drawer */
  .edbg{display:none;position:fixed;inset:0;z-index:110;background:rgba(2,6,23,0.46)}
  .edbg.open{display:block}
  .edrw{position:fixed;top:0;left:0;bottom:0;z-index:115;width:285px;max-width:88vw;background:var(--SO);border-right:1px solid var(--BD);box-shadow:4px 0 26px rgba(2,6,23,0.12);display:flex;flex-direction:column;transform:translateX(-100%);transition:transform .26s var(--EZ)}
  .edrw.open{transform:translateX(0)}
  .ehb{display:none}.ehn{display:none}
  @media(max-width:900px){.ehb{display:grid}.ehn{display:block}}

  @keyframes ef {from{opacity:0}to{opacity:1}}
  @keyframes esu{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
  @keyframes esd{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
  @keyframes esm{0%{background-position:200% 0}100%{background-position:-200% 0}}
  @keyframes esp{to{transform:rotate(360deg)}}
  @keyframes epu{0%,100%{opacity:1}50%{opacity:0.45}}
  @keyframes esh{0%,100%{transform:translateX(0)}20%{transform:translateX(-5px)}50%{transform:translateX(5px)}80%{transform:translateX(-4px)}}
  @media(prefers-reduced-motion:reduce){#mm-exam-shell *,#mm-exam-shell *::before,#mm-exam-shell *::after{animation-duration:0.01ms!important;transition-duration:0.01ms!important}}
`;

// ─── main shell ───────────────────────────────────────────────────────────────
function ExamShell({ attemptId, mode }: { attemptId: string; mode: ExamMode }) {
  const navigate = useNavigate();
  const {
    isLoading,
    error,
    attempt,
    examPackage,
    questions,
    responses,
    currentQuestionIndex,
    currentQuestion,
    totalQuestions,
    answeredCount,
    goToQuestion,
    goToNext,
    goToPrevious,
    canGoNext,
    canGoPrevious,
    setResponse,
    getResponse,
    isSaving,
    lastSavedAt,
    isSubmitting,
    submitAttempt,
    isSubmitted,
    startedAt,
    durationMinutes,
  } = useExamAttempt({ attemptId });

  const [flaggedIds, setFlaggedIds] = useState<Set<string>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const [shakeSubmit, setShakeSubmit] = useState(false);
  const [showSkel, setShowSkel] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { containerProps, warningMessage, dismissWarning } = useExamIntegrity({
    attemptId,
    mode,
    isActive: !isSubmitted && !isLoading,
    onViolation: (t, c) => console.warn("[integrity]", t, c),
    onThresholdReached: () => console.error("[integrity] threshold"),
  });
  useEffect(() => {
    if (warningMessage) setBanner(warningMessage);
  }, [warningMessage]);

  const unansweredCount = totalQuestions - answeredCount;
  const flaggedCount = flaggedIds.size;
  const isFlagged = currentQuestion
    ? flaggedIds.has(currentQuestion.id)
    : false;
  const pct =
    totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  // Check answered state for a response (mirrors useExamAttempt logic)
  const isAnswered = useCallback(
    (qid: string) => {
      const r = responses.get(qid);
      if (!r) return false;
      if (
        "selectedOptionId" in r &&
        (r as { selectedOptionId: string }).selectedOptionId
      )
        return true;
      if (
        "selectedOptionIds" in r &&
        (r as { selectedOptionIds: string[] }).selectedOptionIds.length > 0
      )
        return true;
      if ("answer" in r && String((r as { answer: unknown }).answer).trim())
        return true;
      return false;
    },
    [responses],
  );

  const jumpWithSkeleton = useCallback(
    (i: number) => {
      setShowSkel(true);
      setDrawerOpen(false);
      setTimeout(() => setShowSkel(false), 180);
      goToQuestion(i);
    },
    [goToQuestion],
  );

  const prevQ = useCallback(() => {
    setShowSkel(true);
    setTimeout(() => setShowSkel(false), 180);
    goToPrevious();
  }, [goToPrevious]);
  const nextQ = useCallback(() => {
    setShowSkel(true);
    setTimeout(() => setShowSkel(false), 180);
    goToNext();
  }, [goToNext]);

  const toggleFlag = useCallback(() => {
    if (!currentQuestion) return;
    setFlaggedIds((prev) => {
      const n = new Set(prev);
      n.has(currentQuestion.id)
        ? n.delete(currentQuestion.id)
        : n.add(currentQuestion.id);
      return n;
    });
  }, [currentQuestion]);

  const handleChange = useCallback(
    (d: ResponseData) => {
      if (currentQuestion) setResponse(currentQuestion.id, d);
    },
    [currentQuestion, setResponse],
  );
  const clearResponse = useCallback(() => {
    if (currentQuestion) setResponse(currentQuestion.id, {} as ResponseData);
  }, [currentQuestion, setResponse]);

  const handleSubmitClick = useCallback(() => {
    if (unansweredCount > 0) {
      setShakeSubmit(true);
      setTimeout(() => setShakeSubmit(false), 500);
    }
    setShowModal(true);
  }, [unansweredCount]);

  const handleConfirm = useCallback(async () => {
    const r = await submitAttempt();
    if (r.success) {
      setShowModal(false);
      setTimeout(() => navigate(`/student/review/${attemptId}`), 600);
    }
  }, [submitAttempt, navigate, attemptId]);

  const SidebarInner = () => (
    <>
      <div className="esbh">
        <div className="ebr">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              minWidth: 0,
            }}
          >
            <div className="elog" aria-hidden="true" />
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontWeight: 900,
                  fontSize: 13,
                  color: "var(--TX)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                MindMosaic
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--MT)",
                  fontWeight: 700,
                  marginTop: 1,
                }}
              >
                {mode === "practice" ? "Practice Mode" : "NAPLAN Simulation"}
              </div>
            </div>
          </div>
        </div>
        <div className="ests">
          {(
            [
              ["edt-ok", answeredCount, "Answered"],
              ["edt-no", unansweredCount, "Remaining"],
              ["edt-fl", flaggedCount, "Flagged"],
              ["edt-in", totalQuestions, "Total"],
            ] as [string, number, string][]
          ).map(([cls, val, label]) => (
            <div className="est" key={label}>
              <span className={`edt ${cls}`} aria-hidden="true" />
              <span>
                <strong>{val}</strong> {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="esbb">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
          }}
        >
          <div>
            <div className="esl">Questions</div>
            <div className="ess">Tap to jump</div>
          </div>
          <span style={{ fontSize: 11, color: "var(--MT)", fontWeight: 800 }}>
            Q{currentQuestionIndex + 1}/{totalQuestions}
          </span>
        </div>
        <div className="eqg" role="list">
          {questions.map((q, i) => (
            <button
              key={q.id}
              type="button"
              role="listitem"
              className="eqb"
              data-ans={isAnswered(q.id) ? "true" : "false"}
              data-cur={i === currentQuestionIndex ? "true" : "false"}
              data-flag={flaggedIds.has(q.id) ? "true" : "false"}
              onClick={() => jumpWithSkeleton(i)}
              aria-label={`Q${i + 1}${isAnswered(q.id) ? " answered" : ""}${flaggedIds.has(q.id) ? " flagged" : ""}`}
              aria-current={i === currentQuestionIndex ? "step" : undefined}
            >
              {i + 1}
            </button>
          ))}
        </div>
        <div className="elg">
          {(
            [
              ["edt-ok", "Answered"],
              ["edt-no", "Unanswered"],
              ["edt-fl", "Flagged"],
            ] as [string, string][]
          ).map(([cls, label]) => (
            <div className="elr" key={label}>
              <span className={`edt ${cls}`} aria-hidden="true" />
              {label}
            </div>
          ))}
        </div>
      </div>
    </>
  );

  const sp: React.CSSProperties = {
    animation: "esp .7s linear infinite",
    width: 14,
    height: 14,
    borderRadius: "50%",
    border: "2px solid rgba(255,255,255,0.4)",
    borderTopColor: "#fff",
    display: "inline-block",
  };

  if (isLoading)
    return (
      <div id="mm-exam-shell">
        <style>{CSS(mode)}</style>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <div
            style={{
              ...sp,
              width: 34,
              height: 34,
              border: "4px solid #2563eb",
              borderTopColor: "transparent",
            }}
          />
          <p
            style={{
              color: "#64748b",
              fontWeight: 700,
              margin: 0,
              fontFamily: "Nunito,sans-serif",
            }}
          >
            Getting your exam ready…
          </p>
        </div>
      </div>
    );

  if (error || !attempt || !examPackage || !questions.length)
    return (
      <div id="mm-exam-shell">
        <style>{CSS(mode)}</style>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            flexDirection: "column",
            gap: 12,
            padding: 32,
          }}
        >
          <span style={{ fontSize: 48 }}>😕</span>
          <h2
            style={{
              margin: 0,
              fontFamily: "Nunito,sans-serif",
              color: "#0f172a",
            }}
          >
            Something went wrong
          </h2>
          <p style={{ margin: 0, color: "#64748b", textAlign: "center" }}>
            {error ?? "We couldn't load this exam."}
          </p>
          <button
            className="ebn ebn-p"
            style={{ marginTop: 8 }}
            onClick={() => navigate("/student/exams")}
          >
            Back to Exams
          </button>
        </div>
      </div>
    );

  if (isSubmitted)
    return (
      <div id="mm-exam-shell">
        <style>{CSS(mode)}</style>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            flexDirection: "column",
            gap: 14,
            padding: 32,
            textAlign: "center",
          }}
        >
          <span style={{ fontSize: 56 }}>🎉</span>
          <h2
            style={{
              margin: 0,
              fontFamily: "Nunito,sans-serif",
              color: "#0f172a",
            }}
          >
            {mode === "practice" ? "Great work!" : "Exam Submitted"}
          </h2>
          <p
            style={{
              margin: 0,
              color: "#64748b",
              maxWidth: 360,
              lineHeight: 1.6,
            }}
          >
            {mode === "practice"
              ? "Your answers are saved. Ready to see how you did?"
              : "Your responses have been recorded."}
          </p>
          <button
            className="ebn ebn-p"
            style={{ marginTop: 10 }}
            onClick={() => navigate(`/student/review/${attemptId}`)}
          >
            {mode === "practice" ? "See Your Answers" : "View Results"}
          </button>
        </div>
      </div>
    );

  return (
    <div id="mm-exam-shell" {...containerProps}>
      <style>{CSS(mode)}</style>

      {/* Integrity banner — flex item, pushes everything below it down */}
      {banner && (
        <div
          className={`eb ${mode === "naplan" ? "eb-n" : "eb-p"}`}
          role="alert"
          aria-live="assertive"
        >
          <span>⚠️ {banner}</span>
          <button
            style={{
              fontWeight: 700,
              fontSize: 12,
              textDecoration: "underline",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "inherit",
            }}
            onClick={() => {
              setBanner(null);
              dismissWarning();
            }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Background */}
      <div className="ebg" aria-hidden="true" />

      {/* Mobile drawer */}
      <div
        className={`edbg ${drawerOpen ? "open" : ""}`}
        onClick={() => setDrawerOpen(false)}
        aria-hidden="true"
      />
      <aside
        className={`edrw ${drawerOpen ? "open" : ""}`}
        aria-label="Question navigation (mobile)"
      >
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            padding: "9px 11px 0",
          }}
        >
          <button
            className="eib"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <SidebarInner />
      </aside>

      {/* Body grid */}
      <div className="ebody">
        <aside className="egl esb" aria-label="Question navigation">
          <SidebarInner />
        </aside>

        <main className="egl emn" aria-label="Exam">
          <header className="etb">
            <button
              className="eib ehb"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open navigation"
            >
              ☰
            </button>

            {startedAt && durationMinutes > 0 ? (
              <div className="etc">
                <span aria-hidden="true">⏱</span>
                <ExamTimer
                  startedAt={startedAt}
                  durationMinutes={durationMinutes}
                  showWarnings
                  onTimeExpired={handleConfirm}
                />
              </div>
            ) : (
              <div className="etc">
                <span aria-hidden="true">⏱</span>
                <span style={{ color: "var(--MT)", fontSize: 12, fontWeight: 700 }}>
                  Untimed
                </span>
              </div>
            )}

            <div
              style={{
                fontSize: 11,
                color: "var(--MT)",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
              aria-live="polite"
            >
              {isSaving ? (
                <>
                  <span
                    style={{
                      color: "var(--WN)",
                      animation: "epu 1.4s ease infinite",
                    }}
                  >
                    ●
                  </span>{" "}
                  Saving…
                </>
              ) : lastSavedAt ? (
                <>
                  <span style={{ color: "var(--OK)" }}>●</span> Saved
                </>
              ) : null}
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                flexShrink: 0,
              }}
            >
              <div
                className="ern"
                style={{
                  background: `conic-gradient(from 90deg,#2563eb ${pct * 3.6}deg,rgba(148,163,184,0.22) 0)`,
                }}
                aria-hidden="true"
              >
                <div className="eri">{pct}%</div>
              </div>
              <div style={{ display: "grid", gap: 3, minWidth: 110 }}>
                <div className="ebt">
                  <div className="ebf" style={{ width: `${pct}%` }} />
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 9,
                    color: "var(--MT)",
                    fontWeight: 800,
                  }}
                >
                  <span>Progress</span>
                  <strong>{pct}%</strong>
                </div>
              </div>
            </div>
          </header>

          <div className="econ">
            {currentQuestion ? (
              <section
                key={currentQuestion.id}
                style={{ animation: "ef .16s ease both" }}
              >
                <div className="eqh">
                  <div>
                    <h1
                      style={{
                        fontSize: "clamp(18px,1.6vw,24px)",
                        fontWeight: 900,
                        color: "var(--TX)",
                        margin: 0,
                        lineHeight: 1.2,
                      }}
                    >
                      Question {currentQuestionIndex + 1}
                    </h1>
                    <p
                      style={{
                        fontSize: 12,
                        color: "var(--MT)",
                        fontWeight: 600,
                        margin: "3px 0 0",
                      }}
                    >
                      {mode === "practice"
                        ? "Choose the best answer. Flag to review later."
                        : "Choose the best answer."}
                    </p>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 9,
                      flexShrink: 0,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        color: "var(--MT)",
                        fontWeight: 700,
                      }}
                    >
                      {currentQuestion.marks}{" "}
                      {currentQuestion.marks === 1 ? "mark" : "marks"}
                    </span>
                    <button
                      className="ebn ebn-w"
                      type="button"
                      onClick={toggleFlag}
                      aria-pressed={isFlagged}
                    >
                      🚩 {isFlagged ? "Flagged" : "Flag"}
                    </button>
                  </div>
                </div>

                {showSkel ? (
                  <div style={{ display: "grid", gap: 10 }} aria-hidden="true">
                    {[80, 52, 52, 52, 52].map((h, i) => (
                      <div
                        key={i}
                        className="esk"
                        style={{ height: h, borderRadius: 14 }}
                      />
                    ))}
                  </div>
                ) : (
                  <QuestionRenderer
                    question={currentQuestion}
                    questionNumber={currentQuestionIndex + 1}
                    totalQuestions={totalQuestions}
                    value={getResponse(currentQuestion.id)}
                    onChange={handleChange}
                    disabled={false}
                    showHint={mode === "practice"}
                  />
                )}

                {mode === "practice" && !showSkel && (
                  <div
                    style={{
                      marginTop: 12,
                      borderRadius: 11,
                      border: "1px solid rgba(59,130,246,0.22)",
                      background: "rgba(59,130,246,0.06)",
                      padding: "9px 13px",
                      display: "flex",
                      gap: 9,
                      fontSize: 12,
                      fontWeight: 700,
                      color: "var(--TX)",
                    }}
                    role="note"
                  >
                    <span aria-hidden="true">💡</span> Tip: If there's a
                    diagram, you can tap it to zoom.
                  </div>
                )}
              </section>
            ) : (
              <p style={{ color: "var(--MT)" }}>No question to display.</p>
            )}
          </div>

          <footer className="edk">
            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="ebn"
                type="button"
                onClick={prevQ}
                disabled={!canGoPrevious || isSubmitting}
              >
                ⬅ Previous
              </button>
              <button
                className="ebn"
                type="button"
                onClick={nextQ}
                disabled={!canGoNext || isSubmitting}
              >
                Next ➡
              </button>
            </div>
            <span style={{ fontSize: 12, color: "var(--MT)", fontWeight: 800 }}>
              {currentQuestionIndex + 1} / {totalQuestions}
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="ebn ebn-g"
                type="button"
                onClick={clearResponse}
              >
                🧽 Clear
              </button>
              <button
                className="ebn ebn-p"
                type="button"
                onClick={handleSubmitClick}
                disabled={isSubmitting}
                style={{ animation: shakeSubmit ? "esh 0.4s ease" : undefined }}
              >
                {isSubmitting ? (
                  <>
                    <span style={sp} />
                    Submitting…
                  </>
                ) : (
                  `✅ ${mode === "naplan" ? "Submit Exam" : "Submit"}`
                )}
              </button>
            </div>
          </footer>
        </main>
      </div>

      {/* Submit modal */}
      {showModal && (
        <div
          className="emb"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowModal(false);
          }}
        >
          <div className="emd" role="dialog" aria-modal="true">
            <div className="emh">
              <h2
                style={{
                  margin: 0,
                  fontWeight: 900,
                  fontSize: "clamp(16px,1.6vw,21px)",
                  color: "var(--TX)",
                }}
              >
                {mode === "naplan"
                  ? "Submit NAPLAN Exam?"
                  : "Submit your exam?"}
              </h2>
              {unansweredCount > 0 && (
                <div
                  style={{
                    marginTop: 8,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 7,
                    padding: "6px 11px",
                    borderRadius: 999,
                    border: "1px solid rgba(245,158,11,0.30)",
                    background: "rgba(245,158,11,0.10)",
                    fontWeight: 800,
                    fontSize: 12,
                    color: "#92400e",
                  }}
                >
                  ⚠️ {unansweredCount} unanswered question
                  {unansweredCount > 1 ? "s" : ""}
                </div>
              )}
            </div>
            <div className="embd">
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 9,
                  marginBottom: 13,
                }}
              >
                {(
                  [
                    ["Total", totalQuestions, undefined],
                    [
                      "Answered",
                      answeredCount,
                      answeredCount === totalQuestions
                        ? "var(--OK)"
                        : undefined,
                    ],
                    [
                      "Unanswered",
                      unansweredCount,
                      unansweredCount > 0 ? "var(--WN)" : undefined,
                    ],
                    [
                      "Flagged",
                      flaggedCount,
                      flaggedCount > 0 ? "var(--FL)" : undefined,
                    ],
                  ] as [string, number, string | undefined][]
                ).map(([label, value, color]) => (
                  <div className="esb2" key={label}>
                    <div
                      style={{
                        fontSize: 10,
                        color: "var(--MT)",
                        fontWeight: 700,
                      }}
                    >
                      {label}
                    </div>
                    <div
                      style={{
                        fontSize: 20,
                        fontWeight: 900,
                        color: color ?? "var(--TX)",
                        lineHeight: 1.2,
                        marginTop: 2,
                      }}
                    >
                      {value}
                    </div>
                  </div>
                ))}
              </div>
              <p style={{ margin: 0, lineHeight: 1.6 }}>
                {mode === "naplan"
                  ? "Once submitted, you cannot change your answers. This cannot be undone."
                  : "You'll see explanations and your results after submitting."}
              </p>
            </div>
            <div className="emf">
              <button
                className="ebn"
                onClick={() => setShowModal(false)}
                disabled={isSubmitting}
              >
                {mode === "naplan" ? "Cancel" : "Go Back"}
              </button>
              <button
                className="ebn ebn-p"
                onClick={handleConfirm}
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? "Submitting…"
                  : mode === "naplan"
                    ? "Confirm & Submit"
                    : "Yes, Submit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
