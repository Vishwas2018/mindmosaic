/**
 * MindMosaic — Exam Engine
 * Full-screen test-taking UI. NO portal shell — distraction-free.
 * Includes a top utility bar (logo + timer + submit) and a question navigator
 * grid for jumping between questions. Flagging supported.
 *
 * Out of scope: actual scoring, persistence, anti-cheat. The parent component
 * supplies handlers via props.
 */

import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Clock, Flag, ChevronLeft, ChevronRight, Send, X, AlertCircle, Check,
} from "lucide-react";
import { Logo, Wordmark, Favicon } from "../shell.jsx";

const LETTERS = ["A", "B", "C", "D"];

export const examData = {
  title: "NAPLAN Practice — Numeracy",
  totalMinutes: 40,
  questions: Array.from({ length: 20 }, (_, i) => ({
    id: i + 1,
    text: [
      "What is 3² + 4²?",
      "Simplify: 2(3x + 4) − 5x",
      "Rectangle perimeter, length 12 cm, width 8 cm?",
      "³⁄₅ of 45?",
      "0.625 as a simplified fraction?",
      "Triangle angles 2:3:4 — largest?",
      "Mean of 12, 15, 18, 21, 24?",
      "$40 shirt, 15% off — sale price?",
      "Next in 2, 6, 18, 54, …?",
      "7/20 as a percentage?",
      "Cube side 5 cm — volume?",
      "Solve 3x − 7 = 14",
      "Probability of even roll on a die?",
      "Car: 240 km in 3 hours — speed?",
      "Triangle area, base 10, height 6?",
      "Round 3.4567 to 2 dp.",
      "What is −3 × (−4)?",
      "Median of 5, 8, 3, 12, 7?",
      "If y = 2x + 3, x = −2, y?",
      "30 students, 18 girls — % boys?",
    ][i],
    options: [
      ["25","12","7","49"],["x + 8","11x + 8","x + 4","6x + 8"],["96 cm","20 cm","40 cm","48 cm"],
      ["15","27","30","9"],["³⁄₁₀","⁵⁄₈","⁵⁄₁₂","⁷⁄₂₀"],["60°","80°","90°","100°"],
      ["18","15","21","90"],["$34","$25","$38","$6"],["72","108","162","216"],
      ["35%","70%","3.5%","14%"],["25 cm³","125 cm³","150 cm³","75 cm³"],
      ["x = 3","x = 7","x = 21","x = 5"],["¹⁄₃","¹⁄₂","²⁄₃","¹⁄₆"],
      ["60 km/h","80 km/h","720 km/h","120 km/h"],["60 cm²","30 cm²","16 cm²","36 cm²"],
      ["3.45","3.46","3.50","3.47"],["−12","12","−7","7"],
      ["8","5","7","3"],["−1","1","7","−7"],["60%","40%","12%","18%"],
    ][i],
  })),
};

function formatTime(seconds) {
  const m = Math.max(0, Math.floor(seconds / 60));
  const s = Math.max(0, seconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function ExamTopBar({ secondsLeft, onSubmit, answeredCount, totalCount }) {
  const lowTime = secondsLeft < 5 * 60;
  return (
    <div className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-slate-200/70 bg-white/85 px-4 backdrop-blur-xl md:px-6 lg:px-8">
      <div className="flex items-center gap-2.5">
        <Logo size={28} />
        <Wordmark className="hidden text-base sm:inline" />
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Answered</p>
          <p className="mt-0.5 text-sm font-semibold tabular-nums text-slate-900">{answeredCount} / {totalCount}</p>
        </div>
        <div className={
          "flex items-center gap-2 rounded-lg px-3 py-2 ring-1 ring-inset " +
          (lowTime ? "bg-rose-50 text-rose-700 ring-rose-100" : "bg-slate-50 text-slate-700 ring-slate-200")
        }>
          <Clock className="h-4 w-4" strokeWidth={2.25} />
          <span className="text-sm font-semibold tabular-nums">{formatTime(secondsLeft)}</span>
        </div>
        <button
          onClick={onSubmit}
          className="inline-flex items-center gap-1.5 rounded-lg bg-violet-700 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-800 active:scale-[0.98]"
        >
          <Send className="h-3.5 w-3.5" strokeWidth={2.25} /> Submit
        </button>
      </div>
    </div>
  );
}

function QuestionPanel({ q, picked, flagged, onPick, onFlag }) {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700 ring-1 ring-inset ring-violet-100">
            Question {q.id}
          </span>
          {flagged ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700 ring-1 ring-inset ring-orange-100">
              <Flag className="h-3 w-3" strokeWidth={2.25} /> Flagged
            </span>
          ) : null}
        </div>
        <button
          onClick={onFlag}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
        >
          <Flag className={"h-3.5 w-3.5 " + (flagged ? "fill-orange-500 text-orange-500" : "")} strokeWidth={2} />
          {flagged ? "Unflag" : "Flag for review"}
        </button>
      </div>
      <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-[1.75rem]">{q.text}</h2>
      <ul className="mt-7 space-y-3">
        {q.options.map((opt, i) => {
          const isPicked = picked === i;
          let cls = "flex w-full items-center gap-4 rounded-xl border px-4 py-3.5 text-left text-sm transition-all";
          cls += isPicked
            ? " border-violet-400 bg-violet-50 text-violet-900 shadow-[0_0_0_4px_rgba(91,33,182,0.08)]"
            : " border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50";
          return (
            <li key={i}>
              <button onClick={() => onPick(i)} className={cls}>
                <span className={
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-xs font-semibold tabular-nums " +
                  (isPicked ? "border-violet-400 bg-white text-violet-700" : "border-slate-200 bg-white text-slate-500")
                }>{LETTERS[i]}</span>
                <span className="flex-1 font-medium">{opt}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Navigator({ questions, answers, flagged, current, onPick }) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Question navigator</h3>
        <p className="text-xs text-slate-500">{Object.keys(answers).length} / {questions.length} answered</p>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {questions.map((q, i) => {
          const isCurrent = current === i;
          const isAnswered = answers[q.id] !== undefined;
          const isFlagged = flagged[q.id];
          return (
            <button key={q.id} onClick={() => onPick(i)}
              className={
                "relative h-9 rounded-lg text-xs font-semibold tabular-nums transition-all " +
                (isCurrent ? "bg-violet-700 text-white ring-2 ring-violet-700 ring-offset-2 ring-offset-white" :
                 isAnswered ? "bg-violet-100 text-violet-700 hover:bg-violet-200" :
                 "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50")
              }>
              {q.id}
              {isFlagged ? <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-orange-500 ring-2 ring-white" /> : null}
            </button>
          );
        })}
      </div>
      <div className="mt-4 space-y-1.5 text-[11px] text-slate-500">
        <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-md bg-violet-700" /> Current</span>
        <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-md bg-violet-100" /> Answered</span>
        <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-md border border-slate-200 bg-white" /> Unanswered</span>
        <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-orange-500" /> Flagged</span>
      </div>
    </div>
  );
}

function SubmitDialog({ open, onClose, onConfirm, totalCount, answeredCount, flaggedCount }) {
  if (!open) return null;
  const unanswered = totalCount - answeredCount;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/50" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
      >
        <button onClick={onClose} className="absolute right-3 top-3 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
          <X className="h-4 w-4" />
        </button>
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
          <AlertCircle className="h-5 w-5" strokeWidth={2} />
        </span>
        <h2 className="mt-5 text-xl font-semibold tracking-tight text-slate-900">Submit your exam?</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          You can't change your answers after submitting.
        </p>
        <ul className="mt-5 space-y-2 rounded-xl bg-slate-50 p-4 text-sm">
          <li className="flex items-center justify-between">
            <span className="text-slate-600">Answered</span>
            <span className="font-semibold tabular-nums text-slate-900">{answeredCount} of {totalCount}</span>
          </li>
          {unanswered > 0 ? (
            <li className="flex items-center justify-between">
              <span className="text-slate-600">Unanswered</span>
              <span className="font-semibold tabular-nums text-rose-600">{unanswered}</span>
            </li>
          ) : null}
          {flaggedCount > 0 ? (
            <li className="flex items-center justify-between">
              <span className="text-slate-600">Flagged</span>
              <span className="font-semibold tabular-nums text-orange-600">{flaggedCount}</span>
            </li>
          ) : null}
        </ul>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Keep working
          </button>
          <button onClick={onConfirm} className="inline-flex items-center gap-1.5 rounded-lg bg-violet-700 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-800">
            <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> Submit now
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function ExamEnginePage({ exam = examData, onSubmit }) {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [flagged, setFlagged] = useState({});
  const [secondsLeft, setSecondsLeft] = useState(exam.totalMinutes * 60);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [secondsLeft > 0]);

  const q = exam.questions[current];
  const answeredCount = Object.keys(answers).length;
  const flaggedCount = useMemo(() => Object.values(flagged).filter(Boolean).length, [flagged]);

  return (
    <div className="min-h-screen bg-slate-50/60 font-sans text-slate-900 antialiased">
      <Favicon />
      <ExamTopBar
        secondsLeft={secondsLeft}
        onSubmit={() => setSubmitting(true)}
        answeredCount={answeredCount}
        totalCount={exam.questions.length}
      />
      <main className="mx-auto grid max-w-7xl gap-8 px-4 pb-24 pt-8 md:px-6 lg:grid-cols-[1fr_280px] lg:px-10">
        <div className="rounded-2xl border border-slate-200/70 bg-white p-7 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-9">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">{exam.title}</p>
          <QuestionPanel
            q={q}
            picked={answers[q.id]}
            flagged={!!flagged[q.id]}
            onPick={(i) => setAnswers((a) => ({ ...a, [q.id]: i }))}
            onFlag={() => setFlagged((f) => ({ ...f, [q.id]: !f[q.id] }))}
          />
          <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-6">
            <button
              onClick={() => setCurrent(Math.max(0, current - 1))}
              disabled={current === 0}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={2} /> Previous
            </button>
            <button
              onClick={() => setCurrent(Math.min(exam.questions.length - 1, current + 1))}
              disabled={current === exam.questions.length - 1}
              className="inline-flex items-center gap-1.5 rounded-lg bg-violet-700 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-800 disabled:cursor-not-allowed disabled:bg-violet-300"
            >
              Next <ChevronRight className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
        </div>
        <aside className="rounded-2xl border border-slate-200/70 bg-white p-5 lg:sticky lg:top-20 lg:self-start">
          <Navigator questions={exam.questions} answers={answers} flagged={flagged} current={current} onPick={setCurrent} />
        </aside>
      </main>
      <SubmitDialog
        open={submitting}
        onClose={() => setSubmitting(false)}
        onConfirm={() => { setSubmitting(false); onSubmit?.({ answers, flagged, secondsLeft }); }}
        totalCount={exam.questions.length}
        answeredCount={answeredCount}
        flaggedCount={flaggedCount}
      />
    </div>
  );
}
