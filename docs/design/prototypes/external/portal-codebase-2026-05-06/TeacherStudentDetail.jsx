/**
 * MindMosaic — Teacher → Student Detail
 * Drill-into-one-student page. Shows profile, mastery by strand, recent
 * submissions, and intervention actions in the contextual sidebar.
 */

import React from "react";
import { motion } from "framer-motion";
import {
  Mail, MessageSquare, Plus, StickyNote, ArrowUpRight, Flame, Trophy,
  Clock, Target, ChevronRight,
} from "lucide-react";
import {
  AppShell, Card, CardHeader, Pill, useCountUp,
  pctTone, TONE_TEXT, TONE_BAR_BG,
} from "../shell.jsx";

export const studentDetail = {
  user: { name: "Ms. Patel", role: "Teacher · Maths Year 7", plan: "School plan" },
  student: {
    id: "vish",
    name: "Vish Reddy",
    year: "Year 7",
    className: "Year 7 Maths",
    parentName: "Sarah K.",
    parentEmail: "sarah.k@example.com",
    overallMastery: 72,
    streakDays: 12,
    weeklyHours: 4.2,
    rank: 3,
    classOf: 28,
  },
  strands: [
    { name: "Number & Algebra",        pct: 78 },
    { name: "Measurement & Geometry",  pct: 84 },
    { name: "Statistics & Probability", pct: 52 },
    { name: "Reading Comprehension",   pct: 76 },
  ],
  submissions: [
    { id: 1, title: "Fractions revision pack",     score: 76, date: "7 Apr",  type: "Practice"   },
    { id: 2, title: "Geometry quiz",                 score: 92, date: "5 Apr",  type: "Diagnostic" },
    { id: 3, title: "Decimals workbook",            score: 70, date: "3 Apr",  type: "Practice"   },
    { id: 4, title: "Mock NAPLAN — Numeracy",       score: 76, date: "1 Apr",  type: "Mock Exam"  },
    { id: 5, title: "Reading comprehension — Ch 4", score: 88, date: "29 Mar", type: "Practice"   },
  ],
  notes: [
    { id: 1, author: "Ms. Patel", date: "5 Apr",  body: "Discussed fractions struggle in 1:1. Plan: 10 min daily for two weeks." },
    { id: 2, author: "Ms. Patel", date: "20 Mar", body: "Strong improvement in geometry — hand-raised more this week." },
  ],
};

function StatTile({ label, value, sub, suffix = "", icon: Icon, tone, delay = 0 }) {
  const numeric = typeof value === "number" ? value : null;
  const tweened = useCountUp(numeric ?? 0, { duration: 1100, delay });
  const display = numeric != null ? `${tweened}${suffix}` : value;
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</p>
        {Icon ? (
          <span className={
            "flex h-8 w-8 items-center justify-center rounded-lg " +
            (tone === "warn" ? "bg-orange-50 text-orange-600" :
             tone === "primary" ? "bg-violet-50 text-violet-700" :
             tone === "success" ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-600")
          }>
            <Icon className="h-4 w-4" strokeWidth={2} />
          </span>
        ) : null}
      </div>
      <p className="mt-3 text-3xl font-semibold tabular-nums leading-none text-slate-900">{display}</p>
      {sub ? <p className="mt-2 text-xs text-slate-500">{sub}</p> : null}
    </Card>
  );
}

function ProfileCard({ student }) {
  const tone = pctTone(student.overallMastery);
  return (
    <Card className="p-6">
      <div className="flex items-start gap-4">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-700 text-xl font-semibold text-white">
          {student.name.split(" ").map((p) => p[0]).join("").slice(0, 2)}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{student.name}</h1>
          <p className="mt-1 text-sm text-slate-500">{student.year} · {student.className}</p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Pill tone="primary">Rank {student.rank} of {student.classOf}</Pill>
            <Pill tone={tone}>{student.overallMastery}% mastery</Pill>
            <Pill tone="warn"><Flame className="h-3 w-3" strokeWidth={2.5} />{student.streakDays}-day streak</Pill>
          </div>
        </div>
        <div className="hidden sm:block">
          <button className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
            <Mail className="h-3.5 w-3.5" strokeWidth={2} /> Message parent
          </button>
        </div>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3 border-t border-slate-100 pt-5 text-sm sm:grid-cols-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">Parent</p>
          <p className="mt-1 font-medium text-slate-800">{student.parentName}</p>
          <p className="text-xs text-slate-500">{student.parentEmail}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">This week</p>
          <p className="mt-1 font-medium text-slate-800 tabular-nums">{student.weeklyHours} hours</p>
          <p className="text-xs text-slate-500">Practice time</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">Streak</p>
          <p className="mt-1 inline-flex items-center gap-1 font-medium text-slate-800 tabular-nums">
            <Flame className="h-3.5 w-3.5 text-orange-500" strokeWidth={2.25} />
            {student.streakDays} days
          </p>
          <p className="text-xs text-slate-500">Current</p>
        </div>
      </div>
    </Card>
  );
}

function MasteryByStrand({ strands }) {
  return (
    <Card>
      <CardHeader title="Mastery by strand" description="Where this student is strong vs needs support." />
      <div className="space-y-5 px-6 py-5">
        {strands.map((s) => {
          const tone = pctTone(s.pct);
          return (
            <div key={s.name}>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-800">{s.name}</span>
                <span className={"text-sm font-semibold tabular-nums " + TONE_TEXT[tone]}>{s.pct}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                <motion.div className={"h-full rounded-full " + TONE_BAR_BG[tone]}
                  initial={{ width: 0 }} animate={{ width: `${s.pct}%` }} transition={{ duration: 0.9 }} />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function SubmissionsList({ rows }) {
  return (
    <Card>
      <CardHeader
        title="Recent submissions"
        description="Last assignments and exams completed."
        action={
          <button className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-violet-700 hover:bg-violet-50">
            View all <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2.25} />
          </button>
        }
      />
      <ul className="divide-y divide-slate-100">
        {rows.map((r) => {
          const tone = pctTone(r.score);
          return (
            <li key={r.id} className="group flex items-center gap-4 px-6 py-3.5 transition-colors hover:bg-violet-50/40">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">{r.title}</p>
                <p className="text-xs text-slate-500">{r.type} · {r.date}</p>
              </div>
              <span className={"text-sm font-semibold tabular-nums " + TONE_TEXT[tone]}>{r.score}%</span>
              <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-violet-600" strokeWidth={2} />
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function Notes({ notes }) {
  return (
    <Card>
      <CardHeader
        title="Teacher notes"
        description="Private to teaching staff."
        action={
          <button className="inline-flex items-center gap-1 rounded-lg bg-violet-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-800">
            <Plus className="h-3.5 w-3.5" strokeWidth={2.25} /> Add note
          </button>
        }
      />
      <ul className="divide-y divide-slate-100">
        {notes.map((n) => (
          <li key={n.id} className="px-6 py-4">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-slate-700">{n.author}</span>
              <span className="text-slate-300">·</span>
              <span className="text-slate-500">{n.date}</span>
            </div>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-700">{n.body}</p>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export default function TeacherStudentDetailPage({ data = studentDetail }) {
  const contextualSection = {
    title: "Actions",
    items: [
      { id: "msg",   icon: Mail,         label: "Message parent",   hint: data.student.parentEmail },
      { id: "assign", icon: Plus,         label: "Set assignment",   hint: "Personalised", tone: "accent" },
      { id: "note",  icon: StickyNote,   label: "Add private note" },
      { id: "chat",  icon: MessageSquare, label: "Class comment" },
    ],
  };
  const tone = pctTone(data.student.overallMastery);

  return (
    <AppShell
      role="teacher" active="classes" pageTitle={data.student.name}
      breadcrumbs={["Classes", data.student.className]}
      contextualSection={contextualSection}
      user={data.user}
    >
      <div className="space-y-8">
        <ProfileCard student={data.student} />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatTile label="Overall mastery" value={data.student.overallMastery} suffix="%" sub="Across all strands" icon={Trophy} tone={tone}      delay={50} />
          <StatTile label="Streak"          value={data.student.streakDays}                sub="Current"             icon={Flame}  tone="warn"     delay={150} />
          <StatTile label="This week"       value={data.student.weeklyHours} suffix="h"    sub="Practice time"        icon={Clock}  tone="primary"  delay={250} />
          <StatTile label="Class rank"      value={data.student.rank}                      sub={`of ${data.student.classOf}`} icon={Target} tone="success" delay={350} />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <MasteryByStrand strands={data.strands} />
          <SubmissionsList rows={data.submissions} />
        </div>
        <Notes notes={data.notes} />
      </div>
    </AppShell>
  );
}
