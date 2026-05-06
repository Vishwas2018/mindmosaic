/**
 * MindMosaic — Teacher Assignment Engine
 * Two views: "Create" (build a new assignment) and "Grade" (review submissions).
 * Sidebar contextual: library (templates, recent).
 */

import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Plus, Search, FileText, BookOpen, Users, Calendar, Send, Check,
  ChevronRight, Sparkles, Library, Clock,
} from "lucide-react";
import {
  AppShell, Card, CardHeader, Pill, pctTone, TONE_TEXT,
} from "../shell.jsx";

export const assignmentEngine = {
  user: { name: "Ms. Patel", role: "Teacher · Maths Year 7", plan: "School plan" },
  questionLibrary: [
    { id: "q1", text: "What is ¾ + ⅛?",                   topic: "Number & Algebra",       skill: "Fractions",   difficulty: "Medium" },
    { id: "q2", text: "Simplify: 2(3x + 4) − 5x",         topic: "Number & Algebra",       skill: "Algebra",     difficulty: "Medium" },
    { id: "q3", text: "Rectangle perimeter, l=12 w=8?",   topic: "Measurement & Geometry", skill: "Perimeter",   difficulty: "Easy" },
    { id: "q4", text: "³⁄₅ of 45?",                       topic: "Number & Algebra",       skill: "Fractions",   difficulty: "Easy" },
    { id: "q5", text: "Triangle angles 2:3:4 — largest?", topic: "Measurement & Geometry", skill: "Angles",      difficulty: "Hard" },
    { id: "q6", text: "Mean of 12, 15, 18, 21, 24?",      topic: "Statistics & Probability", skill: "Averages",  difficulty: "Easy" },
    { id: "q7", text: "0.625 as a fraction?",             topic: "Number & Algebra",       skill: "Fractions",   difficulty: "Medium" },
    { id: "q8", text: "Solve 3x − 7 = 14",                 topic: "Number & Algebra",       skill: "Equations",   difficulty: "Easy" },
  ],
  classes: [
    { id: "7m", name: "Year 7 Maths", students: 28 },
    { id: "8m", name: "Year 8 Maths", students: 26 },
  ],
  templates: [
    { id: "t1", name: "Fractions revision pack",  questions: 15 },
    { id: "t2", name: "Decimals diagnostic",      questions: 12 },
    { id: "t3", name: "Geometry quick check",     questions: 10 },
  ],
  pendingGrading: [
    { id: 1, student: "Vish",      assignment: "Fractions pack",  submittedAt: "10 min ago", autoScore: 76 },
    { id: 2, student: "Aanya R.",  assignment: "Fractions pack",  submittedAt: "1 hr ago",   autoScore: 92 },
    { id: 3, student: "Marcus T.", assignment: "Decimals quiz",   submittedAt: "2 hr ago",   autoScore: 84 },
    { id: 4, student: "Lila G.",   assignment: "Decimals quiz",   submittedAt: "Yesterday",  autoScore: 52 },
  ],
};

const DIFFICULTY_TONE = { Easy: "success", Medium: "primary", Hard: "warn" };

function TabBar({ tab, onChange }) {
  const tabs = [
    { id: "create", label: "Create" },
    { id: "grade",  label: "Grade" },
  ];
  return (
    <div role="tablist" className="inline-flex rounded-lg bg-slate-100 p-1">
      {tabs.map((t) => {
        const active = tab === t.id;
        return (
          <button key={t.id} role="tab" aria-selected={active} onClick={() => onChange(t.id)}
            className={
              "rounded-md px-4 py-1.5 text-sm font-medium transition-all " +
              (active ? "bg-white text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.06)]" : "text-slate-500 hover:text-slate-700")
            }>
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

function CreateView({ data }) {
  const [title, setTitle] = useState("Fractions revision pack");
  const [selected, setSelected] = useState(new Set(["q1", "q4", "q7"]));
  const [classId, setClassId] = useState("7m");
  const [dueDate, setDueDate] = useState("2026-04-15");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return data.questionLibrary;
    return data.questionLibrary.filter((q) =>
      q.text.toLowerCase().includes(s) || q.skill.toLowerCase().includes(s) || q.topic.toLowerCase().includes(s)
    );
  }, [search, data.questionLibrary]);

  const toggle = (id) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      {/* Question picker */}
      <Card>
        <CardHeader
          title="Question library"
          description="Pick questions to include in this assignment."
          action={<Pill tone="primary">{selected.size} selected</Pill>}
        />
        <div className="border-b border-slate-100 px-6 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" strokeWidth={2} />
            <input
              type="search" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by skill, topic, or question text…"
              className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-violet-300 focus:outline-none focus:ring-4 focus:ring-violet-100"
            />
          </div>
        </div>
        <ul className="divide-y divide-slate-100">
          {filtered.map((q) => {
            const isSelected = selected.has(q.id);
            return (
              <li key={q.id}>
                <button onClick={() => toggle(q.id)}
                  className={"flex w-full items-center gap-4 px-6 py-3.5 text-left transition-colors " +
                    (isSelected ? "bg-violet-50/60" : "hover:bg-slate-50/50")}>
                  <span className={
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border " +
                    (isSelected ? "border-violet-700 bg-violet-700 text-white" : "border-slate-300 bg-white")
                  }>
                    {isSelected ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">{q.text}</p>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                      <span>{q.topic}</span><span className="text-slate-300">·</span><span>{q.skill}</span>
                    </div>
                  </div>
                  <Pill tone={DIFFICULTY_TONE[q.difficulty]}>{q.difficulty}</Pill>
                </button>
              </li>
            );
          })}
        </ul>
      </Card>

      {/* Settings */}
      <div className="space-y-4">
        <Card className="p-5">
          <h3 className="text-base font-semibold tracking-tight text-slate-900">Assignment details</h3>
          <div className="mt-4 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">Title</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:border-violet-300 focus:outline-none focus:ring-4 focus:ring-violet-100" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">Class</label>
              <select value={classId} onChange={(e) => setClassId(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:border-violet-300 focus:outline-none focus:ring-4 focus:ring-violet-100">
                {data.classes.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.students} students</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">Due date</label>
              <div className="relative">
                <Calendar className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" strokeWidth={2} />
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm focus:border-violet-300 focus:outline-none focus:ring-4 focus:ring-violet-100" />
              </div>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <h3 className="text-base font-semibold tracking-tight text-slate-900">Summary</h3>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li className="flex items-center justify-between"><span className="text-slate-500">Title</span><span className="font-medium text-slate-800">{title || "—"}</span></li>
            <li className="flex items-center justify-between"><span className="text-slate-500">Questions</span><span className="font-semibold tabular-nums text-slate-900">{selected.size}</span></li>
            <li className="flex items-center justify-between"><span className="text-slate-500">Class</span><span className="font-medium text-slate-800">{data.classes.find((c) => c.id === classId)?.name}</span></li>
            <li className="flex items-center justify-between"><span className="text-slate-500">Due</span><span className="font-medium text-slate-800">{dueDate}</span></li>
          </ul>
          <div className="mt-5 space-y-2">
            <button disabled={selected.size === 0}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-violet-700 text-sm font-semibold text-white hover:bg-violet-800 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-violet-300">
              <Send className="h-4 w-4" strokeWidth={2.25} /> Publish to class
            </button>
            <button className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50">
              Save as draft
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}

function GradeView({ pending }) {
  return (
    <Card>
      <CardHeader title="Pending grading" description="Auto-scored submissions you can confirm or override." action={<Pill tone="warn">{pending.length}</Pill>} />
      <ul className="divide-y divide-slate-100">
        {pending.map((p) => {
          const tone = pctTone(p.autoScore);
          return (
            <li key={p.id} className="flex items-center gap-4 px-6 py-3.5 transition-colors hover:bg-violet-50/40">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-700 text-xs font-semibold text-white">
                {p.student.split(" ").map((s) => s[0]).join("").slice(0, 2)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">{p.student}</p>
                <p className="text-xs text-slate-500">{p.assignment} · <Clock className="inline h-3 w-3" strokeWidth={2} /> {p.submittedAt}</p>
              </div>
              <span className={"text-sm font-semibold tabular-nums " + TONE_TEXT[tone]}>{p.autoScore}%</span>
              <button className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800">
                Review <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

export default function TeacherAssignmentEnginePage({ data = assignmentEngine }) {
  const [tab, setTab] = useState("create");

  const contextualSection = {
    title: "Library",
    items: [
      ...data.templates.slice(0, 3).map((t) => ({
        id: t.id, icon: Library, label: t.name, hint: `${t.questions} questions`,
      })),
      { id: "scratch", icon: Plus, label: "Start from scratch", tone: "accent" },
    ],
  };

  return (
    <AppShell
      role="teacher" active="assignments" pageTitle="Assignments"
      contextualSection={contextualSection}
      user={data.user}
    >
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Assignments</h1>
            <p className="mt-2 text-sm text-slate-500">Create new tasks or grade what's been submitted.</p>
          </div>
          <TabBar tab={tab} onChange={setTab} />
        </div>
        {tab === "create" ? <CreateView data={data} /> : <GradeView pending={data.pendingGrading} />}
      </div>
    </AppShell>
  );
}
