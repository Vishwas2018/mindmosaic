/**
 * MindMosaic — Teacher Dashboard
 * Class roster + at-risk students + recent submissions + KPIs.
 */

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Users, FileText, AlertCircle, TrendingUp, ArrowRight, ArrowUpRight, Plus,
  Megaphone, Clock, Trophy, BookOpen, ChevronRight,
} from "lucide-react";
import {
  AppShell, Card, CardHeader, Pill, useCountUp,
  pctTone, TONE_TEXT, TONE_BAR_BG,
} from "../shell.jsx";

export const teacherData = {
  user: { name: "Ms. Patel", role: "Teacher · Maths Year 7", plan: "School plan" },
  classes: [
    { id: "7m", name: "Year 7 Maths",   students: 28, avgMastery: 71 },
    { id: "8m", name: "Year 8 Maths",   students: 26, avgMastery: 68 },
  ],
  selectedClassId: "7m",
  kpis: {
    students:   { value: 28, sub: "in class" },
    avgMastery: { value: 71, sub: "+3% this week" },
    atRisk:     { value: 4,  sub: "below 50%" },
    submitted:  { value: 22, sub: "of 28 weekly" },
  },
  atRisk: [
    { id: "s1", name: "Tom B.",       skill: "Fractions",    pct: 38, lastActive: "3 days ago" },
    { id: "s2", name: "Lila G.",      skill: "Probability",  pct: 42, lastActive: "Yesterday" },
    { id: "s3", name: "Daniel K.",   skill: "Algebra",      pct: 44, lastActive: "Today" },
    { id: "s4", name: "Maria S.",    skill: "Decimals",     pct: 48, lastActive: "2 days ago" },
  ],
  topPerformers: [
    { id: "p1", name: "Aanya R.",   pct: 92, trend: "up"   },
    { id: "p2", name: "Marcus T.",  pct: 88, trend: "up"   },
    { id: "p3", name: "Vish",        pct: 86, trend: "up"   },
    { id: "p4", name: "Sophie L.",  pct: 84, trend: "steady" },
  ],
  recentSubmissions: [
    { id: 1, student: "Vish",       assignment: "Fractions revision pack", score: 76, when: "10 min ago" },
    { id: 2, student: "Aanya R.",   assignment: "Fractions revision pack", score: 92, when: "1 hr ago"   },
    { id: 3, student: "Marcus T.",  assignment: "Decimals workbook",       score: 84, when: "2 hr ago"   },
    { id: 4, student: "Lila G.",    assignment: "Decimals workbook",       score: 52, when: "Yesterday"  },
    { id: 5, student: "Sophie L.",  assignment: "Geometry quiz",           score: 80, when: "Yesterday"  },
  ],
};

function KPICard({ label, value, sub, icon: Icon, tone, delay = 0 }) {
  const tweened = useCountUp(value, { duration: 1100, delay });
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: delay / 1000 }}>
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</p>
          <span className={
            "flex h-8 w-8 items-center justify-center rounded-lg " +
            (tone === "warn" ? "bg-orange-50 text-orange-600" :
             tone === "danger" ? "bg-rose-50 text-rose-600" :
             tone === "success" ? "bg-emerald-50 text-emerald-600" :
             "bg-violet-50 text-violet-700")
          }>
            <Icon className="h-4 w-4" strokeWidth={2} />
          </span>
        </div>
        <p className="mt-3 text-3xl font-semibold tabular-nums leading-none text-slate-900">{tweened}</p>
        {sub ? <p className="mt-2 text-xs text-slate-500">{sub}</p> : null}
      </Card>
    </motion.div>
  );
}

function StudentRow({ s, kind = "risk" }) {
  const tone = pctTone(s.pct);
  return (
    <li className="group flex items-center gap-4 px-6 py-3.5 transition-colors hover:bg-violet-50/40">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-700 text-xs font-semibold text-white">
        {s.name.split(" ").map((p) => p[0]).join("").slice(0, 2)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900">{s.name}</p>
        <p className="text-xs text-slate-500">
          {kind === "risk" ? `${s.skill} · last active ${s.lastActive}` : kind === "top" ? "Across all skills" : ""}
        </p>
      </div>
      <span className={"text-sm font-semibold tabular-nums " + TONE_TEXT[tone]}>{s.pct}%</span>
      <ChevronRight className="h-4 w-4 text-slate-300 transition-all group-hover:translate-x-0.5 group-hover:text-violet-600" strokeWidth={2} />
    </li>
  );
}

function SubmissionsTable({ rows }) {
  return (
    <Card>
      <CardHeader
        title="Recent submissions"
        description="Latest assignment results across your classes."
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
              <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Student</th>
              <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Assignment</th>
              <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Score</th>
              <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">When</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => {
              const tone = pctTone(r.score);
              return (
                <tr key={r.id} className="cursor-pointer transition-colors hover:bg-violet-50/40">
                  <td className="px-6 py-3.5 font-medium text-slate-800">{r.student}</td>
                  <td className="px-6 py-3.5 text-slate-600">{r.assignment}</td>
                  <td className={"px-6 py-3.5 font-semibold tabular-nums " + TONE_TEXT[tone]}>{r.score}%</td>
                  <td className="px-6 py-3.5 text-slate-500">{r.when}</td>
                  <td className="px-6 py-3.5 text-right">
                    <ChevronRight className="ml-auto h-4 w-4 text-slate-300" strokeWidth={2} />
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

export default function TeacherDashboardPage({ data = teacherData }) {
  const [classId, setClassId] = useState(data.selectedClassId);

  const contextualSection = {
    title: "Quick actions",
    items: [
      { id: "assign",   icon: Plus,      label: "New assignment",  hint: "Set for class",     tone: "accent" },
      { id: "announce", icon: Megaphone, label: "Class announcement" },
      { id: "lessons",  icon: BookOpen,  label: "Browse lessons" },
    ],
  };

  return (
    <AppShell
      role="teacher" active="dashboard" pageTitle="Teacher dashboard"
      contextualSection={contextualSection}
      recentSection={{
        title: "Your classes",
        items: data.classes.map((c) => ({
          id: c.id, title: c.name, date: `${c.students} students · ${c.avgMastery}% avg`,
          score: c.avgMastery, current: c.id === classId,
        })),
      }}
      user={data.user}
    >
      <div className="space-y-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
              Welcome, <span className="text-violet-700">{data.user.name.split(" ").pop()}</span>
            </h1>
            <p className="mt-2 text-sm text-slate-500">Here's how Year 7 Maths is tracking this week.</p>
          </div>
          <button className="inline-flex items-center gap-2 rounded-xl bg-violet-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-800 active:scale-[0.98]">
            <Plus className="h-4 w-4" strokeWidth={2.25} /> New assignment
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KPICard label="Students"      value={data.kpis.students.value}   sub={data.kpis.students.sub}   icon={Users}        tone="primary" delay={50} />
          <KPICard label="Avg mastery"   value={data.kpis.avgMastery.value} sub={data.kpis.avgMastery.sub} icon={TrendingUp}   tone="success" delay={150} />
          <KPICard label="At risk"       value={data.kpis.atRisk.value}     sub={data.kpis.atRisk.sub}     icon={AlertCircle}  tone="danger"  delay={250} />
          <KPICard label="Submitted"     value={data.kpis.submitted.value}  sub={data.kpis.submitted.sub}  icon={FileText}     tone="warn"    delay={350} />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader title="Needs attention" description="Students under 50% on a current skill." action={<Pill tone="danger">{data.atRisk.length}</Pill>} />
            <ul className="divide-y divide-slate-100">
              {data.atRisk.map((s) => <StudentRow key={s.id} s={s} kind="risk" />)}
            </ul>
          </Card>
          <Card>
            <CardHeader title="Top performers" description="Highest mastery this week." action={<Pill tone="success"><Trophy className="h-3 w-3" strokeWidth={2.5} />Top 4</Pill>} />
            <ul className="divide-y divide-slate-100">
              {data.topPerformers.map((s) => <StudentRow key={s.id} s={s} kind="top" />)}
            </ul>
          </Card>
        </div>
        <SubmissionsTable rows={data.recentSubmissions} />
      </div>
    </AppShell>
  );
}
