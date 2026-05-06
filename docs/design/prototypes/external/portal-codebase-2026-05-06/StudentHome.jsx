/**
 * MindMosaic — Student Home
 * Younger / friendlier landing inside the portal. Sidebar same as dashboard
 * but contextual section is "Today" — what to do *right now*.
 * Design intent: less data-heavy than the dashboard, more action-forward
 * and warmer copy. Suitable for primary-school year-levels.
 */

import React from "react";
import { motion } from "framer-motion";
import {
  Play, Sparkles, Flame, Star, Trophy, ArrowRight, Target,
  ClipboardCheck, Pencil, FileText, BookOpen, Award,
} from "lucide-react";
import { AppShell, Card, Pill, useCountUp, TONE_BAR_BG } from "../shell.jsx";

export const homeData = {
  user: { name: "Vish", role: "Year 7", plan: "Family plan" },
  streak: 12,
  todayMission: {
    title: "Today's mission: Fractions practice",
    description: "Just 10 questions. You're 1 session away from levelling up Fractions to 60%.",
    durationMin: 12,
  },
  recentResults: [
    { id: "r1", title: "NAPLAN — Numeracy",   date: "7 Apr",  score: 76 },
    { id: "r2", title: "NAPLAN — Reading",    date: "2 Apr",  score: 82 },
    { id: "r3", title: "ICAS — Mathematics",  date: "28 Mar", score: 68 },
  ],
  badges: [
    { id: "b1", label: "5-day streak",  earned: true,  tone: "warn"    },
    { id: "b2", label: "Geometry whiz", earned: true,  tone: "primary" },
    { id: "b3", label: "Quick thinker", earned: true,  tone: "success" },
    { id: "b4", label: "10-day streak", earned: false, tone: "neutral" },
  ],
  picks: [
    { id: 1, title: "Fractions — quick refresh", subject: "Maths",    duration: "5 min", icon: BookOpen },
    { id: 2, title: "Inference practice",         subject: "Reading", duration: "8 min", icon: Pencil   },
    { id: 3, title: "Probability puzzles",        subject: "Maths",    duration: "6 min", icon: Sparkles },
  ],
};

const BADGE_TONE = {
  primary: "bg-violet-50 text-violet-700 ring-violet-100",
  warn:    "bg-orange-50 text-orange-700 ring-orange-100",
  success: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  neutral: "bg-slate-50 text-slate-500 ring-slate-200/70",
};

function HeroGreeting({ user, streak }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}
      className="relative overflow-hidden rounded-3xl bg-violet-700 p-8 text-white sm:p-10"
    >
      <div className="pointer-events-none absolute -top-20 -right-12 h-72 w-72 rounded-full bg-orange-500/30 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -bottom-24 -left-12 h-72 w-72 rounded-full bg-violet-900/40 blur-3xl" aria-hidden="true" />
      <div className="relative flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-orange-300">Good afternoon</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Hey {user.name} 👋</h1>
          <p className="mt-3 max-w-md text-base text-white/85">Ready to keep your streak going?</p>
        </div>
        <div className="flex items-center gap-3 rounded-2xl bg-white/10 px-5 py-4 backdrop-blur-sm">
          <Flame className="h-7 w-7 text-orange-300" strokeWidth={2} />
          <div>
            <p className="text-2xl font-semibold tabular-nums leading-none">{streak} days</p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.1em] text-white/70">Streak</p>
          </div>
        </div>
      </div>
    </motion.section>
  );
}

function MissionCard({ mission }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}
    >
      <Card className="overflow-hidden p-7">
        <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Pill tone="warn" icon={Target}>Mission</Pill>
              <Pill tone="neutral">{mission.durationMin} min</Pill>
            </div>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">{mission.title}</h2>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-slate-600">{mission.description}</p>
          </div>
          <button className="inline-flex items-center gap-2 rounded-xl bg-violet-700 px-6 py-3 text-base font-semibold text-white shadow-[0_8px_20px_-6px_rgba(91,33,182,0.45)] hover:bg-violet-800 active:scale-[0.98]">
            <Play className="h-4 w-4 fill-current" strokeWidth={2} /> Start now
          </button>
        </div>
      </Card>
    </motion.div>
  );
}

function StreakStat({ value, label, tone, icon: Icon }) {
  const tweened = useCountUp(typeof value === "number" ? value : 0, { duration: 1100 });
  return (
    <Card className="p-5">
      <div className="flex items-center gap-3">
        <span className={"flex h-10 w-10 items-center justify-center rounded-xl " +
          (tone === "warn" ? "bg-orange-50 text-orange-600" :
           tone === "primary" ? "bg-violet-50 text-violet-700" : "bg-emerald-50 text-emerald-600")}>
          <Icon className="h-5 w-5" strokeWidth={2} />
        </span>
        <div>
          <p className="text-2xl font-semibold tabular-nums leading-none text-slate-900">{tweened}</p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.08em] text-slate-500">{label}</p>
        </div>
      </div>
    </Card>
  );
}

function PicksGrid({ picks }) {
  return (
    <div>
      <h2 className="text-lg font-semibold tracking-tight text-slate-900">Picked for you</h2>
      <p className="mt-1 text-sm text-slate-500">Short, focused activities matched to your level.</p>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {picks.map((p, i) => (
          <motion.button key={p.id}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: i * 0.05 }}
            whileHover={{ y: -2 }}
            className="group flex w-full items-start gap-4 rounded-2xl border border-slate-200/70 bg-white p-5 text-left transition-shadow hover:shadow-[0_8px_24px_-4px_rgba(15,23,42,0.08)]"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
              <p.icon className="h-5 w-5" strokeWidth={2} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900">{p.title}</p>
              <p className="mt-1 text-xs text-slate-500">{p.subject} · {p.duration}</p>
            </div>
            <ArrowRight className="mt-1 h-4 w-4 text-slate-300 transition-all group-hover:translate-x-0.5 group-hover:text-violet-600" strokeWidth={2} />
          </motion.button>
        ))}
      </div>
    </div>
  );
}

function BadgeStrip({ badges }) {
  return (
    <Card className="p-6">
      <div className="flex items-center gap-2">
        <Award className="h-4 w-4 text-orange-600" strokeWidth={2.25} />
        <h3 className="text-base font-semibold tracking-tight text-slate-900">Your badges</h3>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {badges.map((b) => (
          <span key={b.id}
            className={"inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset " +
              BADGE_TONE[b.tone] + (b.earned ? "" : " opacity-60")}
          >
            <Star className="h-3 w-3" strokeWidth={2.5} />
            {b.label}
            {!b.earned ? <span className="text-[10px] font-medium text-slate-400">(locked)</span> : null}
          </span>
        ))}
      </div>
    </Card>
  );
}

export default function StudentHomePage({ data = homeData }) {
  const contextualSection = {
    title: "Today",
    items: [
      { id: "diagnostic", icon: ClipboardCheck, label: "Take a diagnostic", hint: "20 min" },
      { id: "practice",   icon: Pencil,         label: "Quick practice",     hint: "10 min" },
      { id: "mock",       icon: FileText,       label: "Mock exam",          hint: "Full timed",  tone: "accent" },
    ],
  };
  return (
    <AppShell
      role="student" active="dashboard" pageTitle="Home"
      contextualSection={contextualSection}
      recentSection={{ title: "Recent results", actionLabel: "See all", items: data.recentResults }}
      user={data.user}
    >
      <div className="space-y-8">
        <HeroGreeting user={data.user} streak={data.streak} />
        <MissionCard mission={data.todayMission} />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          <StreakStat value={12} label="Day streak"    tone="warn"    icon={Flame} />
          <StreakStat value={72} label="Mastery %"     tone="primary" icon={Trophy} />
          <StreakStat value={3}  label="Badges earned" tone="success" icon={Award} />
        </div>
        <PicksGrid picks={data.picks} />
        <BadgeStrip badges={data.badges} />
      </div>
    </AppShell>
  );
}
