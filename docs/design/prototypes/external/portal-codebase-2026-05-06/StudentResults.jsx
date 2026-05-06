/**
 * MindMosaic — Student Results
 * Wired into <AppShell role="student" active="results" />.
 * Sidebar: "This exam" group (retake / retry / share / pdf), Recent results.
 */

import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  AreaChart, Area, Cell, ReferenceLine,
} from "recharts";
import {
  ChevronDown, ArrowRight, CalendarDays, Share2, Check, AlertCircle, Lightbulb,
  Target, BookOpen, Trophy, RotateCcw, Repeat, Download, TrendingUp,
} from "lucide-react";
import {
  AppShell, Card, CardHeader, Pill, useCountUp,
  CheckMark, CrossMark, QuestionMark,
  pctTone, TONE_HEX, TONE_TEXT, TONE_BAR_BG,
} from "../shell.jsx";

/* ============================================================================
 * DATA + HELPERS
 * ========================================================================== */

export const examResult = {
  examTitle: "NAPLAN Practice — Numeracy",
  examType: "Mock Exam",
  date: "7 Apr 2026",
  user: { name: "Vish", role: "Year 7", plan: "Family plan" },
  timeSpentMinutes: 32,
  totalTimeMinutes: 40,
  previousScore: 64,
  attempt: 2,
  history: [
    { label: "Dec", score: 48 }, { label: "Jan", score: 56 },
    { label: "Feb", score: 60 }, { label: "Mar", score: 64 },
  ],
  recentResults: [
    { id: "r1", title: "NAPLAN — Numeracy",   date: "7 Apr",  score: 76, current: true  },
    { id: "r2", title: "NAPLAN — Reading",    date: "2 Apr",  score: 82, current: false },
    { id: "r3", title: "ICAS — Mathematics",  date: "28 Mar", score: 68, current: false },
    { id: "r4", title: "NAPLAN — Numeracy",   date: "15 Mar", score: 64, current: false },
  ],
  questions: [
    { id: 1,  text: "What is 3² + 4²?",                                   topic: "Number & Algebra",       skill: "Indices",       options: ["25","12","7","49"],            correctIndex: 0, userIndex: 0,    explanation: "9 + 16 = 25.",                  tip: null },
    { id: 2,  text: "Simplify: 2(3x + 4) − 5x",                           topic: "Number & Algebra",       skill: "Algebra",       options: ["x + 8","11x + 8","x + 4","6x + 8"], correctIndex: 0, userIndex: 0, explanation: "Expand and collect like terms.", tip: null },
    { id: 3,  text: "Rectangle perimeter, length 12 cm, width 8 cm?",     topic: "Measurement & Geometry", skill: "Perimeter",     options: ["96 cm","20 cm","40 cm","48 cm"], correctIndex: 2, userIndex: 2,   explanation: "P = 2(12+8) = 40 cm.",          tip: null },
    { id: 4,  text: "³⁄₅ of 45?",                                         topic: "Number & Algebra",       skill: "Fractions",     options: ["15","27","30","9"],            correctIndex: 1, userIndex: 3,    explanation: "3 × 9 = 27.",                  tip: "Divide first, multiply second." },
    { id: 5,  text: "0.625 as a simplified fraction?",                    topic: "Number & Algebra",       skill: "Fractions",     options: ["³⁄₁₀","⁵⁄₈","⁵⁄₁₂","⁷⁄₂₀"], correctIndex: 1, userIndex: 0,  explanation: "625/1000 → 5/8.",              tip: null },
    { id: 6,  text: "Triangle angles 2:3:4 — largest?",                   topic: "Measurement & Geometry", skill: "Angles",        options: ["60°","80°","90°","100°"],      correctIndex: 1, userIndex: 1,    explanation: "(4/9) × 180 = 80°.",            tip: null },
    { id: 7,  text: "Mean of 12, 15, 18, 21, 24?",                        topic: "Statistics & Probability", skill: "Averages",    options: ["18","15","21","90"],           correctIndex: 0, userIndex: 0,    explanation: "90 / 5 = 18.",                  tip: null },
    { id: 8,  text: "$40 shirt, 15% off — sale price?",                   topic: "Number & Algebra",       skill: "Percentages",   options: ["$34","$25","$38","$6"],         correctIndex: 0, userIndex: 2,    explanation: "$40 − $6 = $34.",               tip: null },
    { id: 9,  text: "Next in 2, 6, 18, 54, …?",                           topic: "Number & Algebra",       skill: "Patterns",      options: ["72","108","162","216"],         correctIndex: 2, userIndex: 2,    explanation: "× 3 each step.",                tip: null },
    { id: 10, text: "7/20 as a percentage?",                               topic: "Number & Algebra",       skill: "Percentages",   options: ["35%","70%","3.5%","14%"],       correctIndex: 0, userIndex: 0,    explanation: "0.35 = 35%.",                   tip: null },
    { id: 11, text: "Cube side 5 cm, volume?",                            topic: "Measurement & Geometry", skill: "Volume",        options: ["25 cm³","125 cm³","150 cm³","75 cm³"], correctIndex: 1, userIndex: 1, explanation: "5³ = 125.",                  tip: null },
    { id: 12, text: "Solve 3x − 7 = 14",                                   topic: "Number & Algebra",       skill: "Equations",     options: ["x = 3","x = 7","x = 21","x = 5"], correctIndex: 1, userIndex: 1,   explanation: "3x = 21, x = 7.",              tip: null },
    { id: 13, text: "Calculate: 2.5 × 0.4",                                topic: "Number & Algebra",       skill: "Decimals",      options: ["10","1","0.1","1.0"],           correctIndex: 1, userIndex: null, explanation: "= 1.0.",                       tip: "Count decimal places." },
    { id: 14, text: "Round 3.4567 to 2 dp.",                               topic: "Number & Algebra",       skill: "Rounding",      options: ["3.45","3.46","3.50","3.47"],   correctIndex: 1, userIndex: 0,    explanation: "Third digit is 6.",             tip: null },
    { id: 15, text: "If y = 2x + 3, x = −2, y?",                          topic: "Number & Algebra",       skill: "Substitution",  options: ["−1","1","7","−7"],              correctIndex: 0, userIndex: null, explanation: "−4 + 3 = −1.",                 tip: null },
  ],
};

const LETTERS = ["A", "B", "C", "D"];

function getStatus(q) {
  if (q.userIndex === null || q.userIndex === undefined) return "unanswered";
  return q.userIndex === q.correctIndex ? "correct" : "incorrect";
}

function verdict(pct) {
  if (pct >= 85) return { headline: "Excellent result", sub: "You're showing strong, consistent understanding across the board." };
  if (pct >= 70) return { headline: "Solid performance", sub: "Good foundations — a few targeted areas left to strengthen." };
  if (pct >= 55) return { headline: "Room to grow", sub: "You're building real understanding. Focused practice will close the gaps." };
  return { headline: "Let's build from here", sub: "This result shows clear places to improve." };
}

function deriveMetrics(result) {
  const qs = result.questions;
  const total = qs.length;
  const correct = qs.filter((q) => q.userIndex === q.correctIndex).length;
  const incorrect = qs.filter((q) => q.userIndex != null && q.userIndex !== q.correctIndex).length;
  const unanswered = qs.filter((q) => q.userIndex == null).length;
  const accuracy = Math.round((correct / total) * 100);
  const topicMap = new Map();
  for (const q of qs) {
    if (!topicMap.has(q.topic)) topicMap.set(q.topic, { total: 0, correct: 0, skills: new Map() });
    const t = topicMap.get(q.topic);
    t.total += 1; if (q.userIndex === q.correctIndex) t.correct += 1;
    if (!t.skills.has(q.skill)) t.skills.set(q.skill, { total: 0, correct: 0 });
    const s = t.skills.get(q.skill); s.total += 1; if (q.userIndex === q.correctIndex) s.correct += 1;
  }
  const topics = [...topicMap.entries()].map(([name, d]) => ({
    name, total: d.total, correct: d.correct, pct: Math.round((d.correct / d.total) * 100),
    skills: [...d.skills.entries()].map(([n, s]) => ({ name: n, total: s.total, correct: s.correct, pct: Math.round((s.correct / s.total) * 100) })).sort((a, b) => a.pct - b.pct),
  })).sort((a, b) => b.pct - a.pct);
  const allSkills = topics.flatMap((t) => t.skills.map((s) => ({ ...s, topic: t.name })));
  return {
    total, correct, incorrect, unanswered, accuracy, topics,
    strongest: topics[0] ?? null,
    weakest: topics[topics.length - 1] ?? null,
    improvement: result.previousScore != null ? accuracy - result.previousScore : null,
    strongSkills: allSkills.filter((s) => s.pct === 100).slice(0, 4),
    weakSkills: allSkills.filter((s) => s.pct < 100).sort((a, b) => a.pct - b.pct).slice(0, 4),
  };
}

/* ============================================================================
 * SCORE RING + HERO
 * ========================================================================== */

function ScoreRing({ value, size = 200, stroke = 14, tone = "primary" }) {
  const safe = Math.max(0, Math.min(100, value));
  const radius = (size - stroke) / 2;
  const cx = size / 2, cy = size / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (safe / 100) * circumference;
  const display = useCountUp(safe, { duration: 1100 });
  const angle = (safe / 100) * 2 * Math.PI - Math.PI / 2;
  const dotX = cx + radius * Math.cos(angle);
  const dotY = cy + radius * Math.sin(angle);
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} aria-hidden="true">
        <g transform={`rotate(-90 ${cx} ${cy})`}>
          <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#EDE9FE" strokeWidth={stroke} />
          <motion.circle cx={cx} cy={cy} r={radius} fill="none" stroke={TONE_HEX[tone]}
            strokeWidth={stroke} strokeLinecap="round" strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }} animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }} />
        </g>
        {safe > 0 ? (
          <motion.circle cx={dotX} cy={dotY} r={6} fill="#EA580C" stroke="#fff" strokeWidth={3}
            initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1, duration: 0.4 }} />
        ) : null}
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-[3.75rem] font-semibold tracking-tight tabular-nums leading-none text-slate-900">
          {display}<span className="ml-0.5 text-3xl text-slate-400">%</span>
        </span>
        <span className="mt-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">accuracy</span>
      </div>
    </div>
  );
}

function ResultSummaryCard({ result, metrics }) {
  const tone = pctTone(metrics.accuracy);
  const v = verdict(metrics.accuracy);
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}
      className="relative overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(91,33,182,0.16)]"
    >
      <div className="pointer-events-none absolute -top-24 -right-16 h-72 w-72 rounded-full bg-violet-100/70 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -bottom-24 -left-12 h-56 w-56 rounded-full bg-orange-100/60 blur-3xl" aria-hidden="true" />
      <div className="relative p-6 md:p-10">
        <div className="flex flex-col items-center gap-10 md:flex-row md:gap-14">
          <ScoreRing value={metrics.accuracy} tone={tone} />
          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-wrap items-center justify-center gap-2 md:justify-start">
              <Pill tone="primary" icon={CalendarDays}>{result.examType} · {result.date}</Pill>
              {result.attempt > 1 ? <Pill tone="neutral">Attempt {result.attempt}</Pill> : null}
              {metrics.improvement != null ? (
                <Pill tone={metrics.improvement >= 0 ? "success" : "danger"} icon={TrendingUp}>
                  {metrics.improvement >= 0 ? "+" : ""}{metrics.improvement}% vs last
                </Pill>
              ) : null}
            </div>
            <h1 className="mt-5 text-[2.25rem] font-semibold tracking-tight text-slate-900 md:text-[2.75rem] md:leading-[1.05]">{v.headline}</h1>
            <p className="mt-3 max-w-xl text-base leading-relaxed text-slate-600">{v.sub}</p>
            <p className="mt-2 text-sm font-medium text-slate-500">{result.examTitle} · {metrics.correct} of {metrics.total} correct · {result.timeSpentMinutes} min</p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3 md:justify-start">
              <button className="inline-flex items-center gap-2 rounded-xl bg-violet-700 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_4px_12px_-2px_rgba(91,33,182,0.35)] hover:bg-violet-800 active:scale-[0.98]">
                Continue practising <ArrowRight className="h-4 w-4" strokeWidth={2.25} />
              </button>
              <button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50">
                <Share2 className="h-4 w-4" /> Share with parent
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}

/* ============================================================================
 * STATS
 * ========================================================================== */

function StatTile({ label, value, sublabel, tone = "neutral", suffix = "", delay = 0, animate = true }) {
  const numeric = typeof value === "number" ? value : null;
  const tweened = useCountUp(numeric ?? 0, { duration: 1100, delay });
  const display = numeric !== null && animate ? `${tweened}${suffix}` : value;
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: delay / 1000 }}>
      <Card className="p-5 transition-all hover:-translate-y-0.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</p>
        <p className={"mt-2 text-3xl font-semibold tabular-nums leading-none " + TONE_TEXT[tone]}>{display}</p>
        {sublabel ? <p className="mt-2 text-xs text-slate-500">{sublabel}</p> : null}
      </Card>
    </motion.div>
  );
}

function StatGrid({ result, metrics }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      <StatTile label="Accuracy" value={metrics.accuracy} suffix="%" sublabel={`${metrics.correct} of ${metrics.total} correct`} tone={pctTone(metrics.accuracy)} delay={50} />
      <StatTile label="Time used" value={result.timeSpentMinutes} suffix="m" sublabel={`of ${result.totalTimeMinutes}m allowed`} delay={150} />
      <StatTile label="Mistakes" value={metrics.incorrect + metrics.unanswered} sublabel={`${metrics.incorrect} wrong · ${metrics.unanswered} skipped`} tone={metrics.incorrect + metrics.unanswered > 0 ? "warn" : "success"} delay={250} />
      <StatTile label="vs Previous" value={metrics.improvement == null ? "—" : metrics.improvement} suffix={metrics.improvement == null ? "" : "%"} sublabel={metrics.improvement == null ? "First attempt" : metrics.improvement >= 0 ? "Improvement" : "Change"} tone={metrics.improvement == null ? "neutral" : metrics.improvement >= 0 ? "success" : "danger"} delay={350} animate={metrics.improvement != null} />
    </div>
  );
}

/* ============================================================================
 * CHARTS
 * ========================================================================== */

function ChartTooltip({ active, payload, label, suffix = "%" }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-slate-900 tabular-nums">{payload[0].value}{suffix}</p>
    </div>
  );
}

function PerformanceChart({ topics }) {
  const data = useMemo(() => topics.map((t) => ({ name: t.name, pct: t.pct, fill: TONE_HEX[pctTone(t.pct)] })), [topics]);
  return (
    <Card className="p-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-violet-700">Performance</p>
      <h3 className="mt-1.5 text-lg font-semibold tracking-tight text-slate-900">By curriculum strand</h3>
      <p className="mt-1 text-sm text-slate-500">Accuracy across the major topic areas in this exam.</p>
      <div className="mt-4 h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 8, right: 24, left: 0, bottom: 8 }} barCategoryGap="28%">
            <CartesianGrid horizontal={false} stroke="#eef2f7" strokeDasharray="2 4" />
            <XAxis type="number" domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickLine={false} axisLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
            <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} tick={{ fill: "#475569", fontSize: 12 }} width={170} />
            <Tooltip cursor={{ fill: "#f5f3ff" }} content={<ChartTooltip />} />
            <Bar dataKey="pct" radius={[0, 8, 8, 0]} barSize={18}>
              {data.map((d) => <Cell key={d.name} fill={d.fill} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function TrendChart({ series }) {
  const hasHistory = series.length > 1;
  return (
    <Card className="p-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-violet-700">Progress</p>
      <h3 className="mt-1.5 text-lg font-semibold tracking-tight text-slate-900">Score trend</h3>
      <p className="mt-1 text-sm text-slate-500">{hasHistory ? "Your last few attempts of this exam." : "Trend will appear after your next attempt."}</p>
      <div className="mt-4 h-[260px]">
        {hasHistory ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ top: 8, right: 8, left: -16, bottom: 8 }}>
              <CartesianGrid stroke="#eef2f7" strokeDasharray="2 4" vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickLine={false} axisLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
              <Tooltip cursor={{ stroke: "#cbd5e1", strokeDasharray: "3 3" }} content={<ChartTooltip />} />
              <ReferenceLine y={80} stroke="#10b981" strokeDasharray="4 4" strokeOpacity={0.5} />
              <Area type="monotone" dataKey="score" stroke="#5B21B6" strokeWidth={2.5} fill="#5B21B6" fillOpacity={0.1}
                dot={(props) => {
                  const { cx, cy, payload } = props;
                  if (typeof cx !== "number") return null;
                  return payload.current ? (
                    <g key={`${cx}-${cy}`}>
                      <circle cx={cx} cy={cy} r={7} fill="#fff" stroke="#EA580C" strokeWidth={2.5} />
                      <circle cx={cx} cy={cy} r={3} fill="#EA580C" />
                    </g>
                  ) : <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={4} fill="#fff" stroke="#94a3b8" strokeWidth={2} />;
                }}
                activeDot={{ r: 6, strokeWidth: 2, stroke: "#fff", fill: "#5B21B6" }} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">No previous attempts yet.</div>
        )}
      </div>
    </Card>
  );
}

/* ============================================================================
 * TOPIC + INSIGHTS + RECOMMENDATIONS
 * ========================================================================== */

function TopicBreakdown({ topics }) {
  return (
    <Card>
      <CardHeader title="Topic breakdown" description="Drill into each strand to see which sub-skills carried the score." />
      <ul className="divide-y divide-slate-100">
        {topics.map((t) => {
          const tone = pctTone(t.pct);
          return (
            <li key={t.name} className="px-6 py-5">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-slate-900">{t.name}</span>
                  <Pill tone={tone}>{t.pct}%</Pill>
                </div>
                <span className="text-xs font-medium text-slate-500 tabular-nums">{t.correct}/{t.total} correct</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <motion.div className={"h-full rounded-full " + TONE_BAR_BG[tone]}
                  initial={{ width: 0 }} animate={{ width: `${t.pct}%` }} transition={{ duration: 0.9, delay: 0.1 }} />
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function InsightsPanel({ metrics }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <Card className="p-6">
        <div className="mb-4 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <Check className="h-4 w-4" strokeWidth={2.5} />
          </span>
          <h3 className="text-base font-semibold tracking-tight text-slate-900">What you did well</h3>
        </div>
        {metrics.strongSkills.length > 0 ? (
          <ul className="space-y-3">
            {metrics.strongSkills.map((s) => (
              <li key={s.name} className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">{s.name}</p>
                  <p className="text-xs text-slate-500">{s.topic}</p>
                </div>
                <span className="text-xs font-semibold text-emerald-600 tabular-nums">{s.correct}/{s.total}</span>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-slate-500">No skills at 100% — but you're close on a few.</p>}
      </Card>
      <Card className="p-6">
        <div className="mb-4 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
            <AlertCircle className="h-4 w-4" strokeWidth={2.25} />
          </span>
          <h3 className="text-base font-semibold tracking-tight text-slate-900">Needs improvement</h3>
        </div>
        <ul className="space-y-4">
          {metrics.weakSkills.map((s) => {
            const tone = pctTone(s.pct);
            return (
              <li key={s.name}>
                <div className="mb-1.5 flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">{s.name}</p>
                    <p className="text-xs text-slate-500">{s.topic}</p>
                  </div>
                  <span className={"text-sm font-semibold tabular-nums " + TONE_TEXT[tone]}>{s.pct}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <motion.div className={"h-full rounded-full " + TONE_BAR_BG[tone]}
                    initial={{ width: 0 }} animate={{ width: `${s.pct}%` }} transition={{ duration: 0.9, delay: 0.15 }} />
                </div>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}

function RecommendationCard({ variant = "secondary", icon: Icon, eyebrow, title, description, cta, meta }) {
  const isPrimary = variant === "primary";
  return (
    <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.15 }}
      className={"relative overflow-hidden rounded-2xl " +
        (isPrimary
          ? "bg-violet-700 text-white shadow-[0_8px_24px_-8px_rgba(91,33,182,0.55)]"
          : "border border-slate-200/70 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]")}>
      {isPrimary ? (
        <>
          <div className="pointer-events-none absolute -top-16 -right-12 h-44 w-44 rounded-full bg-orange-500/30 blur-3xl" aria-hidden="true" />
          <div className="pointer-events-none absolute -bottom-20 -left-10 h-44 w-44 rounded-full bg-violet-900/40 blur-3xl" aria-hidden="true" />
        </>
      ) : null}
      <div className="relative p-6">
        <span className={"flex h-10 w-10 items-center justify-center rounded-xl " + (isPrimary ? "bg-white/15 text-white" : "bg-violet-50 text-violet-700")}>
          <Icon className="h-5 w-5" strokeWidth={2} />
        </span>
        <p className={"mt-5 text-[11px] font-semibold uppercase tracking-[0.1em] " + (isPrimary ? "text-orange-300" : "text-violet-700")}>{eyebrow}</p>
        <h3 className={"mt-1.5 text-lg font-semibold tracking-tight " + (isPrimary ? "text-white" : "text-slate-900")}>{title}</h3>
        <p className={"mt-2 text-sm leading-relaxed " + (isPrimary ? "text-white/80" : "text-slate-600")}>{description}</p>
        {meta ? <p className={"mt-3 text-xs font-medium " + (isPrimary ? "text-white/70" : "text-slate-500")}>{meta}</p> : null}
        <button className={"mt-6 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all active:scale-[0.98] " +
          (isPrimary ? "bg-white text-violet-700 hover:bg-violet-50" : "bg-slate-900 text-white hover:bg-slate-800")}>
          {cta} <ArrowRight className="h-4 w-4" strokeWidth={2.25} />
        </button>
      </div>
    </motion.div>
  );
}

function RecommendationGrid({ metrics }) {
  const weakestSkill = metrics.weakest?.skills?.[0];
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-violet-700">Next steps</p>
      <h2 className="text-lg font-semibold tracking-tight text-slate-900">What to do next</h2>
      <p className="mt-1 text-sm text-slate-500">Personalised actions based on this result.</p>
      <div className="mt-4 grid gap-5 lg:grid-cols-3">
        <RecommendationCard variant="primary" icon={Target} eyebrow="Recommended"
          title={weakestSkill ? `Practise ${weakestSkill.name}` : "Targeted practice"}
          description={weakestSkill ? `${weakestSkill.name} was your weakest skill at ${weakestSkill.pct}%.` : "We'll find the highest-impact area."}
          meta={metrics.weakest ? `Strand · ${metrics.weakest.name}` : null} cta="Start practice" />
        <RecommendationCard icon={BookOpen} eyebrow="Learn"
          title={metrics.weakest ? `Refresh ${metrics.weakest.name}` : "Open the learning hub"}
          description="Short lessons broken down by sub-skill — watch one before your next session."
          meta="5–10 min lessons" cta="Open lessons" />
        <RecommendationCard icon={Trophy} eyebrow="Stretch" title="Try the next level up"
          description="You're holding a steady upward trend. Try a Year 8 set to push your range further."
          meta="20 questions · 25 min" cta="Level up" />
      </div>
    </div>
  );
}

/* ============================================================================
 * QUESTION REVIEW
 * ========================================================================== */

const REVIEW_FILTERS = [
  { id: "all", label: "All" }, { id: "incorrect", label: "Incorrect" },
  { id: "unanswered", label: "Unanswered" }, { id: "correct", label: "Correct" },
];

const STATUS_META = {
  correct:    { label: "Correct",    Mark: CheckMark,    container: "bg-emerald-50 text-emerald-600", chip: "bg-emerald-50 text-emerald-700 ring-emerald-200/70" },
  incorrect:  { label: "Incorrect",  Mark: CrossMark,    container: "bg-rose-50 text-rose-600",       chip: "bg-rose-50 text-rose-700 ring-rose-200/70"           },
  unanswered: { label: "Unanswered", Mark: QuestionMark, container: "bg-orange-50 text-orange-600",   chip: "bg-orange-50 text-orange-700 ring-orange-200/70"     },
};

function QuestionReview({ questions }) {
  const [filter, setFilter] = useState("all");
  const [openId, setOpenId] = useState(null);
  const counts = useMemo(() => ({
    all: questions.length,
    correct: questions.filter((q) => getStatus(q) === "correct").length,
    incorrect: questions.filter((q) => getStatus(q) === "incorrect").length,
    unanswered: questions.filter((q) => getStatus(q) === "unanswered").length,
  }), [questions]);
  const filtered = useMemo(() => filter === "all" ? questions : questions.filter((q) => getStatus(q) === filter), [questions, filter]);

  return (
    <Card>
      <div className="border-b border-slate-100 px-6 pt-5">
        <h2 className="text-lg font-semibold tracking-tight text-slate-900">Question review</h2>
        <p className="mt-1 text-sm text-slate-500">Read every question with the correct answer and an explanation.</p>
        <div role="tablist" className="-mb-px mt-4 flex gap-1 overflow-x-auto">
          {REVIEW_FILTERS.map((f) => {
            const active = filter === f.id;
            return (
              <button key={f.id} role="tab" aria-selected={active}
                onClick={() => { setFilter(f.id); setOpenId(null); }}
                className={"inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors " +
                  (active ? "border-violet-700 text-violet-800" : "border-transparent text-slate-500 hover:text-slate-800")}>
                {f.label}
                <span className={"rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ring-1 ring-inset " +
                  (active ? "bg-violet-50 text-violet-700 ring-violet-100" : "bg-slate-100 text-slate-600 ring-slate-200/70")}>
                  {counts[f.id]}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      {filtered.length === 0 ? (
        <div className="px-6 py-12 text-center text-sm text-slate-500">No questions match this filter.</div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {filtered.map((q) => <QuestionItem key={q.id} question={q} isOpen={openId === q.id} onToggle={() => setOpenId(openId === q.id ? null : q.id)} />)}
        </ul>
      )}
    </Card>
  );
}

function QuestionItem({ question, isOpen, onToggle }) {
  const status = getStatus(question);
  const meta = STATUS_META[status];
  const Mark = meta.Mark;
  const userAnswer = question.userIndex != null ? question.options[question.userIndex] : "—";
  const correctAnswer = question.options[question.correctIndex];
  return (
    <li>
      <button onClick={onToggle} aria-expanded={isOpen}
        className="flex w-full items-center gap-4 px-6 py-4 text-left transition-colors hover:bg-slate-50/70">
        <span className={"flex h-10 w-10 shrink-0 items-center justify-center rounded-xl " + meta.container}>
          <Mark className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500">
            <span className="font-semibold text-slate-700">Q{question.id}</span>
            <span className="text-slate-300">·</span><span>{question.topic}</span>
            <span className="hidden text-slate-300 sm:inline">·</span><span className="hidden sm:inline">{question.skill}</span>
          </div>
          <p className="mt-0.5 truncate text-sm text-slate-800">{question.text}</p>
        </div>
        <span className={"hidden rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset sm:inline-flex " + meta.chip}>{meta.label}</span>
        <ChevronDown className={"h-4 w-4 shrink-0 text-slate-400 transition-transform " + (isOpen ? "rotate-180" : "")} strokeWidth={2} />
      </button>
      <AnimatePresence initial={false}>
        {isOpen ? (
          <motion.div key="content" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }} className="overflow-hidden">
            <div className="space-y-4 pb-5 pl-[4.5rem] pr-6">
              <p className="text-sm leading-relaxed text-slate-700">{question.text}</p>
              <ul className="space-y-2">
                {question.options.map((opt, i) => {
                  const isCorrect = i === question.correctIndex;
                  const isWrong = question.userIndex === i && !isCorrect;
                  let cls = "flex items-center gap-3 rounded-lg border px-3 py-2 text-sm";
                  cls += isCorrect ? " border-emerald-200 bg-emerald-50/60 text-emerald-800" :
                         isWrong ? " border-rose-200 bg-rose-50/60 text-rose-800 line-through" :
                         " border-slate-200 bg-white text-slate-600";
                  return (
                    <li key={i} className={cls}>
                      <span className="w-5 text-xs font-semibold tabular-nums">{LETTERS[i]}</span>
                      <span className="flex-1">{opt}</span>
                      {isCorrect ? <CheckMark className="h-4 w-4 text-emerald-600" /> : isWrong ? <CrossMark className="h-4 w-4 text-rose-600" /> : null}
                    </li>
                  );
                })}
              </ul>
              <div className="rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-inset ring-slate-100">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Explanation</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-700">{question.explanation}</p>
              </div>
              {question.tip ? (
                <div className="flex gap-3 rounded-xl bg-violet-50/60 px-4 py-3 ring-1 ring-inset ring-violet-100">
                  <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-violet-700" strokeWidth={2.25} />
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-violet-700">Learning tip</p>
                    <p className="mt-1 text-sm leading-relaxed text-violet-900">{question.tip}</p>
                  </div>
                </div>
              ) : null}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </li>
  );
}

/* ============================================================================
 * PAGE
 * ========================================================================== */

export default function StudentResultsPage({ result = examResult }) {
  const metrics = useMemo(() => deriveMetrics(result), [result]);
  const trendSeries = useMemo(() => buildTrendSeries(result, metrics.accuracy), [result, metrics.accuracy]);
  const incorrectCount = metrics.incorrect + metrics.unanswered;

  const contextualSection = {
    title: "This exam",
    items: [
      { id: "retake",  icon: RotateCcw, label: "Retake exam",      hint: `All ${metrics.total} questions` },
      { id: "retry",   icon: Repeat,    label: "Retry mistakes",   hint: incorrectCount > 0 ? `${incorrectCount} questions` : "Clean run", tone: "accent" },
      { id: "share",   icon: Share2,    label: "Share with parent", hint: "Email or link" },
      { id: "pdf",     icon: Download,  label: "Export PDF",       hint: "Full report" },
    ],
  };

  return (
    <AppShell
      role="student" active="results"
      pageTitle={result.examTitle} breadcrumbs={["Results"]}
      contextualSection={contextualSection}
      recentSection={{ title: "Recent results", actionLabel: "See all", items: result.recentResults }}
      user={result.user}
    >
      <div className="space-y-10">
        <ResultSummaryCard result={result} metrics={metrics} />
        <StatGrid result={result} metrics={metrics} />
        <div className="grid gap-6 lg:grid-cols-2">
          <PerformanceChart topics={metrics.topics} />
          <TrendChart series={trendSeries} />
        </div>
        <TopicBreakdown topics={metrics.topics} />
        <InsightsPanel metrics={metrics} />
        <RecommendationGrid metrics={metrics} />
        <QuestionReview questions={result.questions} />
      </div>
    </AppShell>
  );
}

function buildTrendSeries(result, currentScore) {
  const history = result?.history ?? [];
  const latestLabel = result?.date ? result.date.split(" ").slice(-2).join(" ") : "Now";
  return [...history, { label: latestLabel, score: currentScore, current: true }];
}
