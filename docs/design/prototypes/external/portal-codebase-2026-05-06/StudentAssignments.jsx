/**
 * MindMosaic — Student Assignments
 * List of teacher-assigned tasks with status pills, due dates, filters.
 */

import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ClipboardList, ArrowRight, Clock, AlertCircle, Calendar, FileText, Inbox,
} from "lucide-react";
import { AppShell, Card, CardHeader, Pill, CheckMark, useCountUp } from "../shell.jsx";

const STATUS_META = {
  due:        { label: "Due",        tone: "warn"    },
  overdue:    { label: "Overdue",    tone: "danger"  },
  done:       { label: "Done",       tone: "success" },
  in_progress: { label: "In progress", tone: "primary" },
  upcoming:   { label: "Upcoming",   tone: "neutral" },
};

export const assignmentsData = {
  user: { name: "Vish", role: "Year 7", plan: "Family plan" },
  assignments: [
    { id: 1, title: "Fractions revision pack",         subject: "Maths",   teacher: "Ms. Patel",     due: "Tomorrow",    questions: 15, status: "due"        },
    { id: 2, title: "Reading comprehension — Chapter 4", subject: "English", teacher: "Mr. Wilson",    due: "8 Apr",        questions: 12, status: "in_progress", progress: { done: 5, total: 12 } },
    { id: 3, title: "Decimals workbook",                subject: "Maths",   teacher: "Ms. Patel",     due: "5 Apr (1d ago)", questions: 10, status: "overdue"   },
    { id: 4, title: "Inferring author intent",          subject: "English", teacher: "Mr. Wilson",    due: "3 Apr",        questions: 8,  status: "done", score: 88 },
    { id: 5, title: "Geometry — angle types",           subject: "Maths",   teacher: "Ms. Patel",     due: "1 Apr",        questions: 14, status: "done", score: 92 },
    { id: 6, title: "Probability puzzles",              subject: "Maths",   teacher: "Ms. Patel",     due: "12 Apr",       questions: 10, status: "upcoming"   },
  ],
};

function StatTile({ label, value, tone = "neutral", icon: Icon, delay = 0 }) {
  const tweened = useCountUp(value, { duration: 1100, delay });
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</p>
        {Icon ? (
          <span className={
            "flex h-8 w-8 items-center justify-center rounded-lg " +
            (tone === "warn" ? "bg-orange-50 text-orange-600" :
             tone === "danger" ? "bg-rose-50 text-rose-600" :
             tone === "success" ? "bg-emerald-50 text-emerald-600" :
             "bg-violet-50 text-violet-700")
          }>
            <Icon className="h-4 w-4" strokeWidth={2} />
          </span>
        ) : null}
      </div>
      <p className="mt-3 text-3xl font-semibold tabular-nums leading-none text-slate-900">{tweened}</p>
    </Card>
  );
}

function AssignmentRow({ a }) {
  const meta = STATUS_META[a.status];
  return (
    <motion.li
      initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
      className="group flex items-center gap-4 px-6 py-4 transition-colors hover:bg-violet-50/40"
    >
      <span className={
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl " +
        (a.status === "done" ? "bg-emerald-50 text-emerald-600" :
         a.status === "overdue" ? "bg-rose-50 text-rose-600" :
         a.status === "in_progress" ? "bg-violet-50 text-violet-700" :
         "bg-slate-100 text-slate-500")
      }>
        {a.status === "done" ? <CheckMark className="h-5 w-5" /> :
         a.status === "overdue" ? <AlertCircle className="h-4 w-4" strokeWidth={2.25} /> :
         <FileText className="h-4 w-4" strokeWidth={2} />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900">{a.title}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
          <span>{a.subject}</span>
          <span className="text-slate-300">·</span>
          <span>{a.teacher}</span>
          <span className="text-slate-300">·</span>
          <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{a.due}</span>
          {a.progress ? <><span className="text-slate-300">·</span><span>{a.progress.done}/{a.progress.total} done</span></> : null}
          {a.score ? <><span className="text-slate-300">·</span><span className="font-semibold text-emerald-600">Scored {a.score}%</span></> : null}
        </div>
      </div>
      <Pill tone={meta.tone}>{meta.label}</Pill>
      {a.status === "done" ? (
        <button className="hidden items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 sm:inline-flex">
          View result <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      ) : (
        <button className="hidden items-center gap-1 rounded-lg bg-violet-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-800 sm:inline-flex">
          {a.status === "in_progress" ? "Continue" : "Start"}
          <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.25} />
        </button>
      )}
    </motion.li>
  );
}

const FILTERS = [
  { id: "all",      label: "All" },
  { id: "due",      label: "Due" },
  { id: "in_progress", label: "In progress" },
  { id: "overdue",  label: "Overdue" },
  { id: "done",     label: "Done" },
  { id: "upcoming", label: "Upcoming" },
];

export default function StudentAssignmentsPage({ data = assignmentsData }) {
  const [filter, setFilter] = useState("all");
  const counts = useMemo(() => {
    const c = { all: data.assignments.length, due: 0, overdue: 0, done: 0, in_progress: 0, upcoming: 0 };
    for (const a of data.assignments) c[a.status] = (c[a.status] ?? 0) + 1;
    return c;
  }, [data]);
  const filtered = filter === "all" ? data.assignments : data.assignments.filter((a) => a.status === filter);

  const contextualSection = {
    title: "Filters",
    items: [
      { id: "due",      icon: Clock,        label: "Due soon",  hint: `${counts.due} assignments` },
      { id: "overdue",  icon: AlertCircle,  label: "Overdue",   hint: `${counts.overdue} overdue`, tone: "accent" },
      { id: "calendar", icon: Calendar,     label: "Calendar view" },
    ],
  };

  return (
    <AppShell
      role="student" active="assignments" pageTitle="Assignments"
      contextualSection={contextualSection}
      user={data.user}
    >
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Assignments</h1>
          <p className="mt-2 text-sm text-slate-500">Tasks set by your teachers. Stay on top of due dates.</p>
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatTile label="Due soon"    value={counts.due}        tone="warn"    icon={Clock}        delay={50} />
          <StatTile label="Overdue"     value={counts.overdue}    tone="danger"  icon={AlertCircle}  delay={150} />
          <StatTile label="In progress" value={counts.in_progress} tone="primary" icon={ClipboardList} delay={250} />
          <StatTile label="Done"        value={counts.done}       tone="success" icon={Inbox}        delay={350} />
        </div>
        <Card>
          <CardHeader title="All assignments" description={`${counts.all} total · ${counts.done} completed`} />
          <div className="border-b border-slate-100 px-6 py-3">
            <div role="tablist" className="flex flex-wrap gap-1">
              {FILTERS.map((f) => {
                const active = filter === f.id;
                return (
                  <button key={f.id} role="tab" aria-selected={active} onClick={() => setFilter(f.id)}
                    className={
                      "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-colors " +
                      (active ? "bg-violet-700 text-white" : "text-slate-600 hover:bg-slate-100")
                    }>
                    {f.label}
                    <span className={
                      "rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums " +
                      (active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600")
                    }>{counts[f.id] ?? 0}</span>
                  </button>
                );
              })}
            </div>
          </div>
          {filtered.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-slate-500">No assignments in this view.</div>
          ) : (
            <ul className="divide-y divide-slate-100">{filtered.map((a) => <AssignmentRow key={a.id} a={a} />)}</ul>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
