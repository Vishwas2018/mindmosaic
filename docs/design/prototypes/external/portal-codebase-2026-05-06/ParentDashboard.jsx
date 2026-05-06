/**
 * MindMosaic — Parent Dashboard
 * Multi-child overview. Sidebar contextual: switch child + report actions.
 */

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Users, Mail, FileText, Settings, ArrowRight, ArrowUpRight, Calendar,
  TrendingUp, Trophy, Flame, Clock, Sparkles, ChevronRight,
} from "lucide-react";
import {
  AppShell, Card, CardHeader, Pill, useCountUp,
  pctTone, trendIcon, trendText, TONE_TEXT, TONE_BAR_BG,
} from "../shell.jsx";

export const parentData = {
  user: { name: "Sarah K.", role: "Parent", plan: "Family plan" },
  children: [
    { id: "c1", name: "Vish",  year: "Year 7", masteryPct: 72, streakDays: 12, weeklyHours: 4.2, trend: "up",   lastActivity: "Today, 4:12 pm", current: true },
    { id: "c2", name: "Anika", year: "Year 4", masteryPct: 64, streakDays: 5,  weeklyHours: 2.1, trend: "down", lastActivity: "Yesterday",      current: false },
  ],
  selectedChildId: "c1",
  weeklyHighlights: [
    { tone: "success", icon: TrendingUp, text: "Vish improved Geometry mastery by 12% this week." },
    { tone: "warn",    icon: Sparkles,   text: "Anika's Reading streak ended on Friday — gentle reminder may help." },
    { tone: "primary", icon: Trophy,     text: "Vish placed 3rd in his class XP leaderboard." },
  ],
  reports: [
    { id: 1, title: "Weekly summary — Vish",  range: "31 Mar – 6 Apr",  ready: true,  href: "#" },
    { id: 2, title: "Weekly summary — Anika", range: "31 Mar – 6 Apr",  ready: true,  href: "#" },
    { id: 3, title: "Term 1 report — Vish",   range: "Term 1 2026",     ready: true,  href: "#" },
    { id: 4, title: "Weekly summary — Vish",  range: "24 – 30 Mar",     ready: true,  href: "#" },
  ],
};

function StatTile({ label, value, suffix = "", subline, tone = "neutral", icon: Icon, delay = 0 }) {
  const numeric = typeof value === "number" ? value : null;
  const tweened = useCountUp(numeric ?? 0, { duration: 1100, delay });
  const display = numeric != null ? `${tweened}${suffix}` : value;
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: delay / 1000 }}>
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</p>
          {Icon ? (
            <span className={
              "flex h-8 w-8 items-center justify-center rounded-lg " +
              (tone === "warn" ? "bg-orange-50 text-orange-600" :
               tone === "success" ? "bg-emerald-50 text-emerald-600" :
               "bg-violet-50 text-violet-700")
            }>
              <Icon className="h-4 w-4" strokeWidth={2} />
            </span>
          ) : null}
        </div>
        <p className={"mt-3 text-3xl font-semibold tabular-nums leading-none " + TONE_TEXT[tone]}>{display}</p>
        {subline ? <p className="mt-2 text-xs text-slate-500">{subline}</p> : null}
      </Card>
    </motion.div>
  );
}

function ChildSummaryCard({ child, isSelected }) {
  const tone = pctTone(child.masteryPct);
  const TrendIconCmp = trendIcon(child.trend);
  return (
    <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.15 }}
      className={
        "relative overflow-hidden rounded-2xl border p-6 text-left transition-shadow " +
        (isSelected
          ? "border-violet-300 bg-violet-50/40 ring-2 ring-violet-200"
          : "border-slate-200/70 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:shadow-[0_8px_24px_-4px_rgba(15,23,42,0.08)]")
      }
    >
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-700 text-base font-semibold text-white">
          {child.name[0]}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold tracking-tight text-slate-900">{child.name}</p>
          <p className="text-xs text-slate-500">{child.year}</p>
        </div>
        {isSelected ? <Pill tone="primary">Viewing</Pill> : <ChevronRight className="h-4 w-4 text-slate-300" strokeWidth={2} />}
      </div>
      <div className="mt-5 grid grid-cols-3 gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">Mastery</p>
          <p className={"mt-1 text-xl font-semibold tabular-nums " + TONE_TEXT[tone]}>
            {child.masteryPct}%
          </p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">Streak</p>
          <p className="mt-1 inline-flex items-center gap-1 text-xl font-semibold tabular-nums text-slate-900">
            <Flame className="h-3.5 w-3.5 text-orange-500" strokeWidth={2.25} />
            {child.streakDays}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">Weekly</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-slate-900">{child.weeklyHours}h</p>
        </div>
      </div>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <motion.div className={"h-full rounded-full " + TONE_BAR_BG[tone]}
          initial={{ width: 0 }} animate={{ width: `${child.masteryPct}%` }} transition={{ duration: 0.9 }} />
      </div>
      <div className="mt-4 flex items-center justify-between text-xs">
        <span className={"inline-flex items-center gap-1 font-medium " + trendText(child.trend)}>
          <TrendIconCmp className="h-3.5 w-3.5" strokeWidth={2.25} />
          {child.trend === "up" ? "Improving" : child.trend === "down" ? "Slowing" : "Steady"}
        </span>
        <span className="text-slate-500">Last active: {child.lastActivity}</span>
      </div>
    </motion.div>
  );
}

function WeeklyHighlights({ items }) {
  return (
    <Card className="p-6">
      <h3 className="text-base font-semibold tracking-tight text-slate-900">This week</h3>
      <p className="mt-1 text-xs text-slate-500">Highlights across all of your children.</p>
      <ul className="mt-5 space-y-4">
        {items.map((it, i) => {
          const Icon = it.icon;
          return (
            <li key={i} className="flex items-start gap-3">
              <span className={
                "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg " +
                (it.tone === "warn" ? "bg-orange-50 text-orange-600" :
                 it.tone === "success" ? "bg-emerald-50 text-emerald-600" :
                 "bg-violet-50 text-violet-700")
              }>
                <Icon className="h-3.5 w-3.5" strokeWidth={2.25} />
              </span>
              <p className="text-sm leading-relaxed text-slate-700">{it.text}</p>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function ReportsList({ reports }) {
  return (
    <Card>
      <CardHeader
        title="Recent reports"
        description="Weekly summaries and term reports — ready to read or download."
        action={
          <button className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-violet-700 hover:bg-violet-50">
            View all <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2.25} />
          </button>
        }
      />
      <ul className="divide-y divide-slate-100">
        {reports.map((r) => (
          <li key={r.id} className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-violet-50/40">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
              <FileText className="h-4 w-4" strokeWidth={2} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900">{r.title}</p>
              <p className="text-xs text-slate-500">{r.range}</p>
            </div>
            {r.ready ? <Pill tone="success">Ready</Pill> : <Pill tone="neutral">Pending</Pill>}
            <button className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
              <ArrowRight className="h-4 w-4" strokeWidth={2} />
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export default function ParentDashboardPage({ data = parentData }) {
  const [selectedId, setSelectedId] = useState(data.selectedChildId);
  const selected = data.children.find((c) => c.id === selectedId) ?? data.children[0];

  const contextualSection = {
    title: "Children",
    items: data.children.map((c) => ({
      id: c.id,
      icon: Users,
      label: c.name,
      hint: `${c.year} · ${c.masteryPct}%`,
      tone: c.id === selectedId ? "accent" : undefined,
    })),
  };

  return (
    <AppShell
      role="parent" active="dashboard" pageTitle="Overview"
      contextualSection={contextualSection}
      recentSection={{ title: "Quick actions", items: [
        { id: "msg",      title: "Message school",         date: "Compose" },
        { id: "settings", title: "Notification settings",  date: "Manage"  },
      ] }}
      user={data.user}
    >
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
            Hi <span className="text-violet-700">{data.user.name.split(" ")[0]}</span>
          </h1>
          <p className="mt-2 text-sm text-slate-500">Here's how your children are progressing this week.</p>
        </div>
        <div>
          <h2 className="mb-4 text-base font-semibold tracking-tight text-slate-900">Your children</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {data.children.map((c) => (
              <button key={c.id} type="button" onClick={() => setSelectedId(c.id)} className="text-left">
                <ChildSummaryCard child={c} isSelected={c.id === selectedId} />
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="mb-4 flex items-center gap-2">
            <h2 className="text-base font-semibold tracking-tight text-slate-900">{selected.name}'s snapshot</h2>
            <Pill tone="primary">{selected.year}</Pill>
          </div>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatTile label="Mastery"      value={selected.masteryPct} suffix="%" tone={pctTone(selected.masteryPct)} icon={Trophy}     delay={50}  subline="Across all subjects" />
            <StatTile label="Day streak"   value={selected.streakDays}             tone="warn"                        icon={Flame}      delay={150} subline="Keep it going" />
            <StatTile label="This week"    value={selected.weeklyHours} suffix="h" tone="primary"                     icon={Clock}      delay={250} subline="Time practising" />
            <StatTile label="Improvement"  value={selected.trend === "up" ? 8 : -4} suffix="%" tone={selected.trend === "up" ? "success" : "danger"} icon={TrendingUp} delay={350} subline="vs last week" />
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <WeeklyHighlights items={data.weeklyHighlights} />
          </div>
          <div className="lg:col-span-2">
            <ReportsList reports={data.reports} />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
