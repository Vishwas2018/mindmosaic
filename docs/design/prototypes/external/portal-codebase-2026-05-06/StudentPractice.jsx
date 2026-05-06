/**
 * MindMosaic — Practice (in-session)
 * Mid-session UI: question stem, multiple choice, progress strip, instant feedback.
 * Sidebar contextual: session info (skill, target, est. remaining).
 */

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, ArrowLeft, Flag, Lightbulb, Pause, X, Check,
  Target, Clock, BookOpen,
} from "lucide-react";
import { AppShell, Card, Pill, CheckMark, CrossMark } from "../shell.jsx";

export const practiceSession = {
  user: { name: "Vish", role: "Year 7", plan: "Family plan" },
  topic: "Number & Algebra",
  skill: "Fractions",
  target: 80,
  questions: [
    { id: 1, text: "What is ¾ + ⅛?",        options: ["⁷⁄₈", "⁴⁄₁₂", "⅞", "⁵⁄₈"], correctIndex: 0, explanation: "Common denominator 8: 6/8 + 1/8 = 7/8." },
    { id: 2, text: "Which is largest?",     options: ["⅔", "⁵⁄₈", "¾", "⁷⁄₁₂"],  correctIndex: 2, explanation: "Convert to decimals: 0.667, 0.625, 0.75, 0.583." },
    { id: 3, text: "Simplify: ⁹⁄₁₂",        options: ["⅔", "¾", "⁹⁄₁₂", "²⁄₃"],  correctIndex: 1, explanation: "Divide top and bottom by 3 → 3/4." },
    { id: 4, text: "What is ⅖ × ¾?",        options: ["⁶⁄₂₀", "³⁄₁₀", "⁵⁄₈", "⅖"], correctIndex: 1, explanation: "Multiply: (2×3)/(5×4) = 6/20 = 3/10." },
    { id: 5, text: "Convert 1¼ to improper.", options: ["⁵⁄₄", "¼", "⁴⁄₅", "²⁄₄"], correctIndex: 0, explanation: "1×4 + 1 = 5, over 4 → 5/4." },
  ],
};

const LETTERS = ["A", "B", "C", "D"];

function ProgressStrip({ index, total, correctSoFar }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-slate-500">Question {index + 1} of {total}</span>
        <span className="font-semibold text-violet-700 tabular-nums">{correctSoFar} correct so far</span>
      </div>
      <div className="flex gap-1">
        {Array.from({ length: total }, (_, i) => (
          <div key={i} className={
            "h-1.5 flex-1 rounded-full " +
            (i < index ? "bg-violet-700" : i === index ? "bg-violet-300" : "bg-slate-200")
          } />
        ))}
      </div>
    </div>
  );
}

function QuestionCard({ q, picked, revealed, onPick }) {
  return (
    <Card className="p-7 sm:p-9">
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-violet-700">Q{q.id}</p>
      <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 sm:text-[1.75rem]">{q.text}</h2>
      <ul className="mt-7 space-y-3">
        {q.options.map((opt, i) => {
          const isPicked = picked === i;
          const isCorrect = i === q.correctIndex;
          let cls = "flex w-full items-center gap-4 rounded-xl border px-4 py-3.5 text-left text-sm transition-all";
          if (revealed) {
            if (isCorrect) cls += " border-emerald-300 bg-emerald-50 text-emerald-800";
            else if (isPicked) cls += " border-rose-300 bg-rose-50 text-rose-800";
            else cls += " border-slate-200 bg-white text-slate-500";
          } else if (isPicked) {
            cls += " border-violet-400 bg-violet-50 text-violet-900 shadow-[0_0_0_4px_rgba(91,33,182,0.08)]";
          } else {
            cls += " border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50";
          }
          return (
            <li key={i}>
              <button onClick={() => onPick(i)} disabled={revealed} className={cls}>
                <span className={
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-xs font-semibold tabular-nums " +
                  (revealed && isCorrect ? "border-emerald-300 bg-white text-emerald-700" :
                   revealed && isPicked ? "border-rose-300 bg-white text-rose-700" :
                   isPicked ? "border-violet-400 bg-white text-violet-700" :
                   "border-slate-200 bg-white text-slate-500")
                }>{LETTERS[i]}</span>
                <span className="flex-1 font-medium">{opt}</span>
                {revealed && isCorrect ? <CheckMark className="h-4 w-4 text-emerald-600" /> : null}
                {revealed && isPicked && !isCorrect ? <CrossMark className="h-4 w-4 text-rose-600" /> : null}
              </button>
            </li>
          );
        })}
      </ul>
      <AnimatePresence>
        {revealed ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }} className="mt-6 overflow-hidden"
          >
            <div className="flex items-start gap-3 rounded-xl bg-violet-50/60 p-4 ring-1 ring-inset ring-violet-100">
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-violet-700" strokeWidth={2.25} />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-violet-700">Explanation</p>
                <p className="mt-1 text-sm leading-relaxed text-violet-900">{q.explanation}</p>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </Card>
  );
}

function SessionToolbar({ onCheck, onNext, onPrev, onSkip, canCheck, revealed, isLast }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <button onClick={onPrev} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100">
          <ArrowLeft className="h-4 w-4" strokeWidth={2} /> Previous
        </button>
        <button onClick={onSkip} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100">
          <Flag className="h-4 w-4" strokeWidth={2} /> Skip
        </button>
      </div>
      {revealed ? (
        <button onClick={onNext}
          className="inline-flex items-center gap-2 rounded-xl bg-violet-700 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_4px_12px_-2px_rgba(91,33,182,0.35)] hover:bg-violet-800 active:scale-[0.98]">
          {isLast ? "Finish" : "Next question"} <ArrowRight className="h-4 w-4" strokeWidth={2.25} />
        </button>
      ) : (
        <button onClick={onCheck} disabled={!canCheck}
          className="inline-flex items-center gap-2 rounded-xl bg-violet-700 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_4px_12px_-2px_rgba(91,33,182,0.35)] hover:bg-violet-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-violet-300">
          <Check className="h-4 w-4" strokeWidth={2.25} /> Check answer
        </button>
      )}
    </div>
  );
}

export default function StudentPracticePage({ session = practiceSession }) {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);

  const q = session.questions[index];
  const isLast = index === session.questions.length - 1;

  const handleCheck = () => {
    if (picked === null) return;
    setRevealed(true);
    if (picked === q.correctIndex) setCorrectCount((c) => c + 1);
  };
  const handleNext = () => {
    if (isLast) return;
    setIndex((i) => i + 1);
    setPicked(null);
    setRevealed(false);
  };
  const handlePrev = () => {
    if (index === 0) return;
    setIndex((i) => i - 1);
    setPicked(null);
    setRevealed(false);
  };

  const contextualSection = {
    title: "Session",
    items: [
      { id: "skill",    icon: BookOpen, label: session.skill,           hint: session.topic },
      { id: "target",   icon: Target,   label: `Target ${session.target}%`, hint: "Keep going!" },
      { id: "estimate", icon: Clock,    label: "Est. remaining",          hint: `${session.questions.length - index} questions` },
    ],
  };

  return (
    <AppShell
      role="student" active="practice" pageTitle={session.skill} breadcrumbs={["Practice"]}
      contextualSection={contextualSection}
      user={session.user}
      contentMaxWidth="max-w-3xl"
      topBarSlot={
        <button className="hidden items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 sm:inline-flex">
          <Pause className="h-3.5 w-3.5" strokeWidth={2.25} /> Pause
        </button>
      }
    >
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Pill tone="primary">{session.topic}</Pill>
          <Pill tone="warn">{session.skill}</Pill>
        </div>
        <ProgressStrip index={index} total={session.questions.length} correctSoFar={correctCount} />
        <QuestionCard q={q} picked={picked} revealed={revealed} onPick={(i) => setPicked(i)} />
        <SessionToolbar
          onCheck={handleCheck} onNext={handleNext} onPrev={handlePrev} onSkip={handleNext}
          canCheck={picked !== null} revealed={revealed} isLast={isLast}
        />
      </div>
    </AppShell>
  );
}
