/**
 * MindMosaic — Learning Hub
 * Browse subjects → strands → lessons. Sidebar contextual: subject filter.
 */

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  BookOpen, Play, Clock, ChevronRight, Sparkles, Calculator, Library,
  FlaskConical, Globe2, Search, Filter,
} from "lucide-react";
import { AppShell, Card, Pill, pctTone, TONE_BAR_BG, TONE_TEXT } from "../shell.jsx";

export const learnData = {
  user: { name: "Vish", role: "Year 7", plan: "Family plan" },
  subjects: [
    { id: "math",     label: "Mathematics", icon: Calculator,    pct: 72, lessons: 48 },
    { id: "english",  label: "English",     icon: Library,       pct: 68, lessons: 32 },
    { id: "science",  label: "Science",     icon: FlaskConical,  pct: 54, lessons: 24 },
    { id: "hass",     label: "HASS",        icon: Globe2,        pct: 41, lessons: 18 },
  ],
  strands: [
    { id: 1,  subject: "math",    title: "Number & Algebra",        skills: 12, pct: 78, lessons: 18, recommended: true },
    { id: 2,  subject: "math",    title: "Measurement & Geometry",  skills: 10, pct: 84, lessons: 14 },
    { id: 3,  subject: "math",    title: "Statistics & Probability", skills: 8,  pct: 52, lessons: 10, recommended: true },
    { id: 4,  subject: "english", title: "Reading Comprehension",   skills: 9,  pct: 76, lessons: 12 },
    { id: 5,  subject: "english", title: "Writing",                  skills: 7,  pct: 62, lessons: 10 },
    { id: 6,  subject: "english", title: "Grammar & Spelling",       skills: 6,  pct: 70, lessons: 10 },
    { id: 7,  subject: "science", title: "Biological Sciences",      skills: 6,  pct: 48, lessons: 8 },
    { id: "8a", subject: "science", title: "Chemical Sciences",      skills: 5,  pct: 60, lessons: 8 },
    { id: 9,  subject: "hass",    title: "Geography",                skills: 4,  pct: 38, lessons: 6 },
  ],
  recentLessons: [
    { id: "l1", title: "Equivalent fractions",       date: "7 Apr",  score: 80 },
    { id: "l2", title: "Probability of events",      date: "5 Apr",  score: 65 },
    { id: "l3", title: "Inferring author intent",    date: "3 Apr",  score: 88 },
  ],
};

function SubjectFilter({ subjects, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onChange("all")}
        className={
          "rounded-full px-3 py-1.5 text-sm font-medium ring-1 ring-inset transition-colors " +
          (value === "all"
            ? "bg-violet-700 text-white ring-violet-700"
            : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50")
        }
      >
        All subjects
      </button>
      {subjects.map((s) => {
        const active = value === s.id;
        return (
          <button
            key={s.id}
            onClick={() => onChange(s.id)}
            className={
              "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium ring-1 ring-inset transition-colors " +
              (active
                ? "bg-violet-700 text-white ring-violet-700"
                : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50")
            }
          >
            <s.icon className="h-3.5 w-3.5" strokeWidth={2} />
            {s.label}
          </button>
        );
      })}
    </div>
  );
}

function SubjectOverview({ subjects }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {subjects.map((s, i) => {
        const tone = pctTone(s.pct);
        return (
          <motion.div key={s.id}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: i * 0.05 }}
          >
            <Card className="p-5 transition-shadow hover:shadow-[0_8px_24px_-4px_rgba(15,23,42,0.08)]">
              <div className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
                  <s.icon className="h-5 w-5" strokeWidth={2} />
                </span>
                <span className={"text-sm font-semibold tabular-nums " + TONE_TEXT[tone]}>{s.pct}%</span>
              </div>
              <p className="mt-4 text-sm font-semibold text-slate-900">{s.label}</p>
              <p className="mt-1 text-xs text-slate-500">{s.lessons} lessons</p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <motion.div className={"h-full rounded-full " + TONE_BAR_BG[tone]}
                  initial={{ width: 0 }} animate={{ width: `${s.pct}%` }} transition={{ duration: 0.9, delay: 0.1 }} />
              </div>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}

function StrandCard({ strand, subjectLabel }) {
  const tone = pctTone(strand.pct);
  return (
    <motion.button whileHover={{ y: -2 }} transition={{ duration: 0.15 }}
      className="group flex w-full flex-col items-start gap-4 rounded-2xl border border-slate-200/70 bg-white p-5 text-left shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:shadow-[0_8px_24px_-4px_rgba(15,23,42,0.08)]"
    >
      <div className="flex w-full items-center justify-between">
        <Pill tone="neutral">{subjectLabel}</Pill>
        {strand.recommended ? <Pill tone="warn" icon={Sparkles}>For you</Pill> : null}
      </div>
      <div className="w-full">
        <h3 className="text-base font-semibold tracking-tight text-slate-900">{strand.title}</h3>
        <p className="mt-1 text-xs text-slate-500">{strand.skills} skills · {strand.lessons} lessons</p>
      </div>
      <div className="w-full">
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="font-medium text-slate-500">Mastery</span>
          <span className={"font-semibold tabular-nums " + TONE_TEXT[tone]}>{strand.pct}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
          <motion.div className={"h-full rounded-full " + TONE_BAR_BG[tone]}
            initial={{ width: 0 }} animate={{ width: `${strand.pct}%` }} transition={{ duration: 0.9, delay: 0.1 }} />
        </div>
      </div>
      <span className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-violet-700">
        Continue learning
        <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2.25} />
      </span>
    </motion.button>
  );
}

export default function StudentLearningHubPage({ data = learnData }) {
  const [subject, setSubject] = useState("all");
  const filtered = subject === "all" ? data.strands : data.strands.filter((s) => s.subject === subject);
  const subjectLabel = (id) => data.subjects.find((s) => s.id === id)?.label ?? id;

  const contextualSection = {
    title: "Filters",
    items: [
      { id: "search", icon: Search, label: "Search lessons" },
      { id: "filter", icon: Filter, label: "Difficulty" },
      { id: "play",   icon: Play,   label: "Resume last lesson", tone: "accent" },
    ],
  };

  return (
    <AppShell
      role="student" active="learn" pageTitle="Learn"
      contextualSection={contextualSection}
      recentSection={{ title: "Recent lessons", items: data.recentLessons }}
      user={data.user}
    >
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Learning hub</h1>
          <p className="mt-2 text-sm text-slate-500">Browse subjects and pick up exactly where you left off.</p>
        </div>
        <SubjectOverview subjects={data.subjects} />
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold tracking-tight text-slate-900">All strands</h2>
            <SubjectFilter subjects={data.subjects} value={subject} onChange={setSubject} />
          </div>
          {filtered.length === 0 ? (
            <Card className="p-12 text-center text-sm text-slate-500">No strands match this filter.</Card>
          ) : (
            <div className="grid gap-4 lg:grid-cols-3">
              {filtered.map((s) => <StrandCard key={s.id} strand={s} subjectLabel={subjectLabel(s.subject)} />)}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
