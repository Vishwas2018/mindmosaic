/**
 * MindMosaic — Student Dashboard
 * --------------------------------------------------------------------------
 * Wired into <AppShell role="student" active="dashboard" />.
 * Contextual sidebar group: Quick start (Diagnostic / Practice / Mock exam).
 * Recent sidebar list: Recent results.
 *
 * Page composition:
 *   WelcomeRow → NextBestActionCard (royal purple, flat)
 *   KPIGrid (4 count-up tiles)
 *   WeeklyLearningPlan + MasterySnapshot (5/2 grid)
 *   ActivityChart + QuickInsights (5/2 grid)
 *   RecentSessionsTable
 *
 * State prop drives 'active' | 'loading' | 'empty'. A small dev StateSwitcher
 * is included; pass `showStateSwitcher={false}` to hide in production.
 */

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from "recharts";
import {
  ArrowRight, ArrowUpRight, Play, Star, Trophy, Target, Check, Clock, Loader2,
  AlertCircle, Flame, TrendingUp, ClipboardCheck, Pencil, FileText, Sparkles,
  ChevronRight,
} from "lucide-react";
import {
  AppShell, Card, CardHeader, Pill, Skeleton, useCountUp, CheckMark,
  pctTone, trendIcon, trendText,
  TONE_HEX, TONE_TEXT, TONE_BAR_BG, TONE_ICON_BG,
} from "../shell.jsx";

/* ============================================================================
 * DUMMY DATA
 * ========================================================================== */

export const dashboardData = {
  user: { name: "Vish", role: "Year 7", plan: "Family plan" },
  yearTarget: "NAPLAN",
  weekRange: "Week of 7 Apr",

  nextBestAction: {
    title: "Continue: Number & Algebra — Fractions",
    description: "You scored 65% on fractions last session. Practising this skill now will strengthen your weakest area before your next diagnostic.",
    progress: { answered: 8, total: 15 },
  },

  kpis: {
    sessions:        { value: 24, deltaText: "+3 this week",      trend: "up" },
    masteryPct:      { value: 72, deltaText: "+4% from last week", trend: "up" },
    weeklyTasksDone: { value: 3,  total: 5 },
    lastScorePct:    { value: 78, deltaText: "+6% improvement",   trend: "up" },
  },

  weeklyPlan: {
    rangeLabel: "Week of 7 Apr",
    tasks: [
      { id: 1, title: "Measurement & Geometry — Angles",                  type: "Diagnostic", count: 15, status: "done" },
      { id: 2, title: "Reading Comprehension — Inference",                type: "Practice",   count: 10, status: "done" },
      { id: 3, title: "Number & Algebra — Decimals",                      type: "Practice",   count: 12, status: "done" },
      { id: 4, title: "Number & Algebra — Fractions",                     type: "Practice",   count: 15, status: "in_progress", progress: { answered: 8, total: 15 } },
      { id: 5, title: "Statistics & Probability — Data Interpretation",   type: "Diagnostic", count: 15, status: "not_started" },
    ],
  },

  mastery: {
    skills: [
      { name: "Geometry — Angles",  pct: 85, trend: "up",     deltaText: "+12%" },
      { name: "Reading — Inference", pct: 78, trend: "up",     deltaText: "+5%"  },
      { name: "Decimals",           pct: 70, trend: "steady" },
      { name: "Fractions",          pct: 52, trend: "down",   deltaText: "−3%"  },
      { name: "Data Interpretation", pct: 45, trend: "down",   deltaText: "−1%"  },
    ],
  },

  activity: [
    { day: "M", date: "25 Mar", sessions: 1 },
    { day: "T", date: "26 Mar", sessions: 2 },
    { day: "W", date: "27 Mar", sessions: 0 },
    { day: "T", date: "28 Mar", sessions: 1 },
    { day: "F", date: "29 Mar", sessions: 0 },
    { day: "S", date: "30 Mar", sessions: 0 },
    { day: "S", date: "31 Mar", sessions: 1 },
    { day: "M", date: "1 Apr",  sessions: 1 },
    { day: "T", date: "2 Apr",  sessions: 2 },
    { day: "W", date: "3 Apr",  sessions: 0 },
    { day: "T", date: "4 Apr",  sessions: 0 },
    { day: "F", date: "5 Apr",  sessions: 2 },
    { day: "S", date: "6 Apr",  sessions: 1 },
    { day: "S", date: "7 Apr",  sessions: 1, isToday: true },
  ],

  insights: [
    { tone: "success", icon: TrendingUp,  body: ["Your ", { strong: "Geometry" }, " mastery improved by ", { strongTone: "success", text: "12%" }, " this week — great progress."] },
    { tone: "warn",    icon: AlertCircle, body: [{ strong: "Fractions" }, " is your biggest opportunity. Two more practice sessions could lift you above ", { strong: "65%" }, "."] },
    { tone: "primary", icon: Flame,       body: ["You're on a ", { strongTone: "primary", text: "3-day streak" }, ". Consistency is driving your improvement."] },
  ],

  recentSessions: [
    { id: 1, title: "Measurement & Geometry — Angles",   type: "Diagnostic", score: 85, date: "7 Apr 2026" },
    { id: 2, title: "Reading Comprehension — Inference", type: "Practice",   score: 78, date: "6 Apr 2026" },
    { id: 3, title: "Number & Algebra — Decimals",       type: "Practice",   score: 70, date: "5 Apr 2026" },
    { id: 4, title: "Number & Algebra — Fractions",      type: "Diagnostic", score: 52, date: "3 Apr 2026" },
  ],

  recentResults: [
    { id: "r1", title: "NAPLAN — Numeracy",   date: "7 Apr",  score: 76 },
    { id: "r2", title: "NAPLAN — Reading",    date: "2 Apr",  score: 82 },
    { id: "r3", title: "ICAS — Mathematics",  date: "28 Mar", score: 68 },
    { id: "r4", title: "NAPLAN — Numeracy",   date: "15 Mar", score: 64 },
  ],
};

const ASSESSMENT_TYPE_TONE = {
  Diagnostic: "blue",
  Practice:   "primary",
  "Mock Exam": "warn",
};

/* ============================================================================
 * COMPONENTS
 * ========================================================================== */

function WelcomeRow({ data }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <div>
        <h1 className="text-[1.75rem] font-semibold tracking-tight text-slate-900 sm:text-3xl">
          Welcome back, <span className="text-violet-700">{data.user.name}</span>
        </h1>
        <p className="mt-1 text-sm text-slate-500">Here's what's next in your learning journey.</p>
      </div>
      <div className="flex items-center gap-2">
        <Pill tone="primary">{data.user.role}</Pill>
        <Pill tone="warn" icon={Star}>{data.yearTarget} target</Pill>
      </div>
    </motion.div>
  );
}

function NextBestActionCard({ nba }) {
  const pct = nba.progress ? Math.round((nba.progress.answered / nba.progress.total) * 100) : 0;
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1], delay: 0.05 }}
      className="relative overflow-hidden rounded-3xl bg-violet-700 text-white shadow-[0_10px_30px_-10px_rgba(91,33,182,0.45)]"
    >
      <div className="pointer-events-none absolute -top-20 -right-12 h-72 w-72 rounded-full bg-orange-500/25 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-violet-900/40 blur-3xl" aria-hidden="true" />
      <div className="relative p-6 sm:p-8 md:p-10">
        <div className="mb-3 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-orange-200">
            Next best action
          </span>
          {nba.progress ? (
            <span className="hidden items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white/85 sm:inline-flex">
              <Clock className="h-3 w-3" strokeWidth={2} />
              {nba.progress.answered}/{nba.progress.total} answered
            </span>
          ) : null}
        </div>
        <h2 className="text-2xl font-semibold tracking-tight sm:text-[1.75rem] md:max-w-2xl">{nba.title}</h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/80 sm:text-base">{nba.description}</p>
        {nba.progress ? (
          <div className="mt-6 max-w-md">
            <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-white/70">
              <span>Session progress</span>
              <span className="tabular-nums">{pct}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/15">
              <motion.div
                className="h-full rounded-full bg-orange-400"
                initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
              />
            </div>
          </div>
        ) : null}
        <div className="mt-7 flex flex-wrap items-center gap-3">
          <button className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-violet-700 transition-all hover:bg-violet-50 active:scale-[0.98]">
            <Play className="h-4 w-4 fill-current" strokeWidth={2} />
            Continue practice
          </button>
          <button className="inline-flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-white/85 transition-colors hover:bg-white/10 hover:text-white">
            View all recommendations
            <ArrowRight className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
      </div>
    </motion.section>
  );
}

function KPICard({ label, value, suffix = "", subline, delay = 0, icon: Icon, iconTone = "primary" }) {
  const numeric = typeof value === "number" ? value : null;
  const tweened = useCountUp(numeric ?? 0, { duration: 1100, delay });
  const display = numeric !== null ? `${tweened}${suffix}` : value;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1], delay: delay / 1000 }}
    >
      <Card className="p-5 transition-all hover:-translate-y-0.5 hover:shadow-[0_2px_4px_rgba(15,23,42,0.04),0_8px_24px_-4px_rgba(15,23,42,0.08)]">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</p>
          {Icon ? (
            <span className={"flex h-8 w-8 items-center justify-center rounded-lg " + TONE_ICON_BG[iconTone]}>
              <Icon className="h-4 w-4" strokeWidth={2} />
            </span>
          ) : null}
        </div>
        <p className="mt-3 text-3xl font-semibold tabular-nums leading-none text-slate-900">{display}</p>
        {subline ? <div className="mt-2.5">{subline}</div> : null}
      </Card>
    </motion.div>
  );
}

function TrendDelta({ trend, children }) {
  const Icon = trendIcon(trend);
  return (
    <span className={"inline-flex items-center gap-1 text-xs font-medium " + trendText(trend)}>
      <Icon className="h-3.5 w-3.5" strokeWidth={2.25} />
      {children}
    </span>
  );
}

function KPIGrid({ kpis }) {
  const wp = Math.round((kpis.weeklyTasksDone.value / kpis.weeklyTasksDone.total) * 100);
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <KPICard label="Sessions" value={kpis.sessions.value} icon={ClipboardCheck} iconTone="primary" delay={50}
        subline={<TrendDelta trend={kpis.sessions.trend}>{kpis.sessions.deltaText}</TrendDelta>} />
      <KPICard label="Mastery" value={kpis.masteryPct.value} suffix="%" icon={Trophy} iconTone="success" delay={150}
        subline={<TrendDelta trend={kpis.masteryPct.trend}>{kpis.masteryPct.deltaText}</TrendDelta>} />
      <KPICard label="Weekly progress" value={wp} suffix="%" icon={Target} iconTone="warn" delay={250}
        subline={
          <div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
              <motion.div className="h-full rounded-full bg-orange-500"
                initial={{ width: 0 }} animate={{ width: `${wp}%` }}
                transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.4 }} />
            </div>
            <p className="mt-1.5 text-[11px] text-slate-500">
              {kpis.weeklyTasksDone.value} of {kpis.weeklyTasksDone.total} tasks done
            </p>
          </div>
        } />
      <KPICard label="Last score" value={kpis.lastScorePct.value} suffix="%" icon={Star} iconTone="warn" delay={350}
        subline={<TrendDelta trend={kpis.lastScorePct.trend}>{kpis.lastScorePct.deltaText}</TrendDelta>} />
    </div>
  );
}

function TaskRow({ task }) {
  if (task.status === "done") {
    return (
      <li className="flex items-center gap-4 px-6 py-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
          <CheckMark className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-800">{task.title}</p>
          <p className="text-xs text-slate-500">{task.type} · {task.count} questions</p>
        </div>
        <Pill tone="success">Done</Pill>
      </li>
    );
  }
  if (task.status === "in_progress") {
    const pct = task.progress ? Math.round((task.progress.answered / task.progress.total) * 100) : 0;
    return (
      <li className="flex items-center gap-4 bg-violet-50/50 px-6 py-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
          <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.25} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-800">{task.title}</p>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-xs text-slate-500">{task.type} · {task.progress.answered} of {task.progress.total} answered</span>
            <span className="text-xs font-semibold tabular-nums text-violet-700">{pct}%</span>
          </div>
        </div>
        <button className="inline-flex items-center gap-1.5 rounded-lg bg-violet-700 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-violet-800">
          Resume
          <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.25} />
        </button>
      </li>
    );
  }
  return (
    <li className="flex items-center gap-4 px-6 py-4">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
        <span className="h-2.5 w-2.5 rounded-full ring-2 ring-current" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-800">{task.title}</p>
        <p className="text-xs text-slate-500">{task.type} · {task.count} questions</p>
      </div>
      <button className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50">
        Start
      </button>
    </li>
  );
}

function WeeklyLearningPlan({ plan }) {
  const doneCount = plan.tasks.filter((t) => t.status === "done").length;
  return (
    <Card>
      <CardHeader
        title="Weekly learning plan"
        description={`${plan.rangeLabel} · ${plan.tasks.length} tasks assigned`}
        action={<Pill tone="success"><Check className="h-3 w-3" strokeWidth={3} />{doneCount}/{plan.tasks.length} Done</Pill>}
      />
      <ul className="divide-y divide-slate-100">
        {plan.tasks.map((task) => <TaskRow key={task.id} task={task} />)}
      </ul>
    </Card>
  );
}

function MasterySkillRow({ skill }) {
  const tone = pctTone(skill.pct);
  const TrendIconCmp = trendIcon(skill.trend);
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <span className="min-w-0 truncate text-sm text-slate-700">{skill.name}</span>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="text-sm font-semibold tabular-nums text-slate-900">{skill.pct}%</span>
          <TrendIconCmp className={"h-3.5 w-3.5 " + trendText(skill.trend)} strokeWidth={2.5} />
        </div>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
        <motion.div className={"h-full rounded-full " + TONE_BAR_BG[tone]}
          initial={{ width: 0 }} animate={{ width: `${skill.pct}%` }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.2 }} />
      </div>
    </div>
  );
}

function MasterySnapshot({ mastery }) {
  const strong = mastery.skills.filter((s) => s.pct >= 60);
  const weak = mastery.skills.filter((s) => s.pct < 60);
  return (
    <Card>
      <CardHeader title="Mastery snapshot" description="Skill progression across strands" />
      <div className="space-y-4 px-6 py-5">
        {strong.map((s) => <MasterySkillRow key={s.name} skill={s} />)}
        {weak.length > 0 ? (
          <div className="border-t border-slate-100 pt-4">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-orange-600">Needs attention</p>
            <div className="space-y-4">
              {weak.map((s) => <MasterySkillRow key={s.name} skill={s} />)}
            </div>
          </div>
        ) : null}
      </div>
    </Card>
  );
}

function ActivityTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg">
      <p className="text-xs font-medium text-slate-500">{item.date}</p>
      <p className="mt-0.5 text-sm font-semibold text-slate-900 tabular-nums">
        {item.sessions} session{item.sessions === 1 ? "" : "s"}
      </p>
    </div>
  );
}

function ActivityChart({ activity }) {
  const totalThisWeek = activity.slice(-7).reduce((a, d) => a + d.sessions, 0);
  const totalLastWeek = activity.slice(0, 7).reduce((a, d) => a + d.sessions, 0);
  const delta = totalThisWeek - totalLastWeek;
  return (
    <Card className="p-6">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-violet-700">Activity</p>
          <h3 className="mt-1.5 text-lg font-semibold tracking-tight text-slate-900">Practice over the last 14 days</h3>
        </div>
        <div className="text-right">
          <p className="text-2xl font-semibold tabular-nums leading-none text-slate-900">{totalThisWeek}</p>
          <p className="mt-2 text-[11px] text-slate-500">
            this week
            {delta !== 0 ? (
              <span className={"ml-1.5 font-medium " + (delta > 0 ? "text-emerald-600" : "text-rose-600")}>
                {delta > 0 ? "+" : ""}{delta} vs last
              </span>
            ) : null}
          </p>
        </div>
      </div>
      <div className="h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={activity} margin={{ top: 8, right: 8, left: -16, bottom: 0 }} barCategoryGap="22%">
            <CartesianGrid stroke="#eef2f7" strokeDasharray="2 4" vertical={false} />
            <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} interval={0} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} width={28} />
            <Tooltip cursor={{ fill: "#f5f3ff" }} content={<ActivityTooltip />} />
            <Bar dataKey="sessions" radius={[6, 6, 0, 0]} barSize={14}>
              {activity.map((d, i) => (
                <Cell key={i} fill={d.isToday ? TONE_HEX.warn : d.sessions === 0 ? "#E2E8F0" : TONE_HEX.primary} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex items-center gap-4 text-[11px] text-slate-500">
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-violet-700" /> Practice day</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-orange-500" /> Today</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-slate-300" /> No activity</span>
      </div>
    </Card>
  );
}

function renderInsightBody(body) {
  return body.map((part, i) => {
    if (typeof part === "string") return <React.Fragment key={i}>{part}</React.Fragment>;
    if (part.strong) return <span key={i} className="font-semibold text-slate-900">{part.strong}</span>;
    if (part.strongTone) return <span key={i} className={"font-semibold " + TONE_TEXT[part.strongTone]}>{part.text}</span>;
    return null;
  });
}

function QuickInsights({ insights }) {
  return (
    <Card className="p-6">
      <h3 className="text-base font-semibold tracking-tight text-slate-900">Quick insights</h3>
      <ul className="mt-4 space-y-4">
        {insights.map((insight, i) => {
          const Icon = insight.icon ?? Sparkles;
          return (
            <li key={i} className="flex items-start gap-3">
              <span className={"mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg " + TONE_ICON_BG[insight.tone]}>
                <Icon className="h-3.5 w-3.5" strokeWidth={2.25} />
              </span>
              <p className="text-sm leading-relaxed text-slate-600">{renderInsightBody(insight.body)}</p>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function RecentSessionsTable({ sessions }) {
  return (
    <Card>
      <CardHeader
        title="Recent sessions"
        description="Your last completed assessments"
        action={
          <button className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-violet-700 hover:bg-violet-50">
            View all <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2.25} />
          </button>
        }
      />
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50">
              <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Assessment</th>
              <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Type</th>
              <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Score</th>
              <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Date</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sessions.map((s) => {
              const tone = pctTone(s.score);
              const typeTone = ASSESSMENT_TYPE_TONE[s.type] ?? "neutral";
              return (
                <tr key={s.id} className="group cursor-pointer transition-colors hover:bg-violet-50/40" tabIndex={0}>
                  <td className="px-6 py-3.5 font-medium text-slate-800">{s.title}</td>
                  <td className="px-6 py-3.5"><Pill tone={typeTone}>{s.type}</Pill></td>
                  <td className={"px-6 py-3.5 font-semibold tabular-nums " + TONE_TEXT[tone]}>{s.score}%</td>
                  <td className="px-6 py-3.5 text-slate-500">{s.date}</td>
                  <td className="px-6 py-3.5 text-right">
                    <ChevronRight className="ml-auto h-4 w-4 text-slate-300 transition-all group-hover:translate-x-0.5 group-hover:text-violet-600" strokeWidth={2} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

/* ============================================================================
 * STATES
 * ========================================================================== */

function ActiveState({ data }) {
  return (
    <div className="space-y-8">
      <WelcomeRow data={data} />
      <NextBestActionCard nba={data.nextBestAction} />
      <KPIGrid kpis={data.kpis} />
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }} className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3"><WeeklyLearningPlan plan={data.weeklyPlan} /></div>
        <div className="lg:col-span-2"><MasterySnapshot mastery={data.mastery} /></div>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }} className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3"><ActivityChart activity={data.activity} /></div>
        <div className="lg:col-span-2"><QuickInsights insights={data.insights} /></div>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.5 }}>
        <RecentSessionsTable sessions={data.recentSessions} />
      </motion.div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-48 w-full rounded-3xl" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0,1,2,3].map((i) => (<Card key={i} className="p-5"><Skeleton className="h-3 w-20" /><Skeleton className="mt-4 h-7 w-16" /><Skeleton className="mt-3 h-3 w-24" /></Card>))}
      </div>
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="p-6 lg:col-span-3"><Skeleton className="h-5 w-40" />
          <div className="mt-5 space-y-3">{[0,1,2,3,4].map((i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}</div>
        </Card>
        <Card className="p-6 lg:col-span-2"><Skeleton className="h-5 w-36" />
          <div className="mt-5 space-y-4">{[0,1,2,3].map((i) => <div key={i}><Skeleton className="mb-2 h-3 w-32" /><Skeleton className="h-1.5 w-full rounded-full" /></div>)}</div>
        </Card>
      </div>
    </div>
  );
}

function EmptyState({ data }) {
  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-[1.75rem] font-semibold tracking-tight text-slate-900 sm:text-3xl">
          Welcome, <span className="text-violet-700">{data.user.name}</span>
        </h1>
        <p className="mt-1 text-sm text-slate-500">Let's get started with your first assessment.</p>
      </div>
      <Card className="mx-auto max-w-xl p-10 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
          <Sparkles className="h-7 w-7" strokeWidth={2} />
        </div>
        <h2 className="mt-6 text-xl font-semibold tracking-tight text-slate-900">Start your learning journey</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
          Take a short diagnostic so MindMosaic can understand your strengths and build a personalised learning plan.
        </p>
        <button className="mt-7 inline-flex items-center gap-2 rounded-xl bg-violet-700 px-6 py-3 text-[15px] font-semibold text-white shadow-[0_4px_12px_-2px_rgba(91,33,182,0.35)] hover:bg-violet-800 active:scale-[0.98]">
          Take your first diagnostic
          <ArrowRight className="h-4 w-4" strokeWidth={2.25} />
        </button>
        <p className="mt-4 text-xs text-slate-400">~20 minutes · 25 questions · Covers all strands</p>
      </Card>
    </div>
  );
}

/* ============================================================================
 * STATE SWITCHER (DEMO)
 * ========================================================================== */

function StateSwitcher({ value, onChange }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
      <span className="px-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">Demo state</span>
      {["active", "loading", "empty"].map((s) => (
        <button key={s} onClick={() => onChange(s)}
          className={"rounded-lg px-2.5 py-1.5 text-xs font-semibold capitalize " +
            (value === s ? "bg-violet-700 text-white" : "text-slate-600 hover:bg-slate-100")}>
          {s}
        </button>
      ))}
    </div>
  );
}

/* ============================================================================
 * PAGE
 * ========================================================================== */

export default function StudentDashboardPage({ data = dashboardData, state: initialState = "active", showStateSwitcher = true }) {
  const [state, setState] = useState(initialState);

  const contextualSection = {
    title: "Quick start",
    items: [
      { id: "diagnostic", icon: ClipboardCheck, label: "Diagnostic",     hint: "25 questions · 20 min" },
      { id: "practice",   icon: Pencil,         label: "Quick practice", hint: "10–15 questions" },
      { id: "mock",       icon: FileText,       label: "Mock exam",      hint: "Full NAPLAN-style", tone: "accent" },
    ],
  };

  const recentSection = {
    title: "Recent results",
    actionLabel: "See all",
    items: data.recentResults,
  };

  return (
    <>
      <AppShell
        role="student"
        active="dashboard"
        pageTitle="Dashboard"
        contextualSection={contextualSection}
        recentSection={recentSection}
        user={data.user}
      >
        {state === "active"  ? <ActiveState data={data} />  : null}
        {state === "loading" ? <LoadingState />              : null}
        {state === "empty"   ? <EmptyState data={data} />    : null}
      </AppShell>
      {showStateSwitcher ? <StateSwitcher value={state} onChange={setState} /> : null}
    </>
  );
}

export { ActiveState, LoadingState, EmptyState };
