/**
 * MindMosaic — Engagement
 * Gamification page: level + XP, streak history, badges (earned + locked),
 * weekly leaderboard. Sidebar contextual: rewards.
 */

import React from "react";
import { motion } from "framer-motion";
import {
  Flame, Award, Sparkles, Trophy, Star, Gift, Crown, Rocket, Zap, Lock, Target,
} from "lucide-react";
import { AppShell, Card, CardHeader, Pill, useCountUp, TONE_BAR_BG, TONE_TEXT } from "../shell.jsx";

export const engagementData = {
  user: { name: "Vish", role: "Year 7", plan: "Family plan" },
  level: { current: 7, label: "Practice Pro", xpInLevel: 420, xpForNext: 600 },
  streak: { current: 12, longest: 18, weekDays: [true, true, false, true, true, true, true] },
  badges: [
    { id: "b1", name: "First steps",      desc: "Completed your first session",        earned: true,  icon: Star,   tone: "warn"    },
    { id: "b2", name: "Geometry whiz",    desc: "Mastered every geometry skill",        earned: true,  icon: Sparkles, tone: "primary" },
    { id: "b3", name: "5-day streak",     desc: "Practised 5 days in a row",            earned: true,  icon: Flame,  tone: "warn"    },
    { id: "b4", name: "Quick thinker",    desc: "Answered 10 questions in under 60 s",  earned: true,  icon: Zap,    tone: "success" },
    { id: "b5", name: "10-day streak",    desc: "Practise 10 days in a row",            earned: false, icon: Flame,  tone: "warn"    },
    { id: "b6", name: "Perfectionist",    desc: "Score 100% on a full diagnostic",      earned: false, icon: Crown,  tone: "warn"    },
    { id: "b7", name: "Subject master",   desc: "Reach 90% mastery in any subject",     earned: false, icon: Trophy, tone: "primary" },
    { id: "b8", name: "Comeback kid",     desc: "Improve by 20% on any retake",         earned: false, icon: Rocket, tone: "primary" },
  ],
  leaderboard: [
    { rank: 1, name: "Aanya R.",  xp: 2840, you: false },
    { rank: 2, name: "Marcus T.", xp: 2510, you: false },
    { rank: 3, name: "Vish",       xp: 2310, you: true  },
    { rank: 4, name: "Sophie L.", xp: 2120, you: false },
    { rank: 5, name: "Ben P.",     xp: 1980, you: false },
  ],
};

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

function LevelCard({ level }) {
  const pct = Math.round((level.xpInLevel / level.xpForNext) * 100);
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}
      className="relative overflow-hidden rounded-3xl bg-violet-700 p-7 text-white shadow-[0_10px_30px_-10px_rgba(91,33,182,0.45)] sm:p-9"
    >
      <div className="pointer-events-none absolute -top-20 -right-12 h-72 w-72 rounded-full bg-orange-500/30 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -bottom-24 -left-12 h-72 w-72 rounded-full bg-violet-900/40 blur-3xl" aria-hidden="true" />
      <div className="relative">
        <div className="flex items-center gap-2">
          <Pill tone="warn" className="!bg-white/15 !text-orange-200 !ring-0">
            <Sparkles className="h-3.5 w-3.5" /> Level {level.current}
          </Pill>
        </div>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-[2.25rem]">{level.label}</h2>
        <p className="mt-2 max-w-md text-sm text-white/80">
          {level.xpForNext - level.xpInLevel} XP until level {level.current + 1}.
        </p>
        <div className="mt-6 max-w-md">
          <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-white/70">
            <span className="tabular-nums">{level.xpInLevel} XP</span>
            <span className="tabular-nums">{level.xpForNext} XP</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/15">
            <motion.div className="h-full rounded-full bg-orange-400"
              initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.9, delay: 0.2 }} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function StreakCard({ streak }) {
  return (
    <Card className="p-6">
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
          <Flame className="h-4 w-4" strokeWidth={2.25} />
        </span>
        <h3 className="text-base font-semibold tracking-tight text-slate-900">Streak</h3>
      </div>
      <div className="mt-5 flex items-end gap-6">
        <div>
          <p className="text-4xl font-semibold tabular-nums leading-none text-slate-900">{streak.current}</p>
          <p className="mt-2 text-[11px] uppercase tracking-[0.1em] text-slate-500">Current</p>
        </div>
        <div>
          <p className="text-2xl font-semibold tabular-nums leading-none text-slate-500">{streak.longest}</p>
          <p className="mt-2 text-[11px] uppercase tracking-[0.1em] text-slate-500">Longest</p>
        </div>
      </div>
      <div className="mt-6">
        <p className="mb-2 text-xs font-medium text-slate-500">This week</p>
        <div className="flex gap-1.5">
          {streak.weekDays.map((on, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <span className={
                "flex h-9 w-9 items-center justify-center rounded-lg text-xs font-semibold " +
                (on ? "bg-orange-500 text-white" : "border border-dashed border-slate-200 text-slate-300")
              }>
                {on ? <Flame className="h-3.5 w-3.5" strokeWidth={2.5} /> : "·"}
              </span>
              <span className="text-[10px] font-medium text-slate-400">{DAY_LABELS[i]}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function StatTile({ label, value, tone, icon: Icon, delay = 0 }) {
  const tweened = useCountUp(value, { duration: 1100, delay });
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</p>
        <span className={
          "flex h-8 w-8 items-center justify-center rounded-lg " +
          (tone === "warn" ? "bg-orange-50 text-orange-600" :
           tone === "primary" ? "bg-violet-50 text-violet-700" :
           tone === "success" ? "bg-emerald-50 text-emerald-600" :
           "bg-slate-100 text-slate-600")
        }>
          <Icon className="h-4 w-4" strokeWidth={2} />
        </span>
      </div>
      <p className="mt-3 text-3xl font-semibold tabular-nums leading-none text-slate-900">{tweened}</p>
    </Card>
  );
}

function BadgeCard({ b }) {
  const Icon = b.icon;
  return (
    <motion.div
      whileHover={{ y: -2 }} transition={{ duration: 0.15 }}
      className={
        "flex flex-col items-center gap-3 rounded-2xl border p-5 text-center transition-shadow " +
        (b.earned
          ? "border-slate-200/70 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:shadow-[0_8px_24px_-4px_rgba(15,23,42,0.08)]"
          : "border-dashed border-slate-200 bg-slate-50/40")
      }
    >
      <span className={
        "flex h-14 w-14 items-center justify-center rounded-2xl " +
        (b.earned
          ? (b.tone === "warn" ? "bg-orange-50 text-orange-600" :
             b.tone === "primary" ? "bg-violet-50 text-violet-700" :
             b.tone === "success" ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-600")
          : "bg-slate-100 text-slate-300")
      }>
        {b.earned ? <Icon className="h-6 w-6" strokeWidth={2} /> : <Lock className="h-5 w-5" strokeWidth={2} />}
      </span>
      <div>
        <p className={"text-sm font-semibold " + (b.earned ? "text-slate-900" : "text-slate-500")}>{b.name}</p>
        <p className={"mt-1 text-xs " + (b.earned ? "text-slate-500" : "text-slate-400")}>{b.desc}</p>
      </div>
    </motion.div>
  );
}

function Leaderboard({ entries }) {
  return (
    <Card>
      <CardHeader title="Class leaderboard" description="This week's XP — top of the class." />
      <ol className="divide-y divide-slate-100">
        {entries.map((e) => (
          <li key={e.rank} className={"flex items-center gap-4 px-6 py-3.5 " + (e.you ? "bg-violet-50/60" : "")}>
            <span className={
              "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold tabular-nums " +
              (e.rank === 1 ? "bg-orange-100 text-orange-700" :
               e.rank === 2 ? "bg-slate-100 text-slate-700" :
               e.rank === 3 ? "bg-amber-100 text-amber-700" : "bg-slate-50 text-slate-500")
            }>{e.rank}</span>
            <span className="flex-1 text-sm font-medium text-slate-800">
              {e.name} {e.you ? <span className="ml-1 text-xs font-semibold text-violet-700">(you)</span> : null}
            </span>
            <span className="text-sm font-semibold tabular-nums text-slate-900">{e.xp.toLocaleString()} XP</span>
          </li>
        ))}
      </ol>
    </Card>
  );
}

export default function StudentEngagementPage({ data = engagementData }) {
  const earnedCount = data.badges.filter((b) => b.earned).length;

  const contextualSection = {
    title: "Rewards",
    items: [
      { id: "rewards", icon: Gift,   label: "Redeem rewards", hint: "Coming soon", tone: "accent" },
      { id: "goals",   icon: Target, label: "Set a goal" },
    ],
  };

  return (
    <AppShell
      role="student" active="dashboard" pageTitle="Achievements"
      contextualSection={contextualSection}
      user={data.user}
    >
      <div className="space-y-8">
        <LevelCard level={data.level} />
        <div className="grid gap-6 lg:grid-cols-3">
          <StreakCard streak={data.streak} />
          <div className="space-y-4 lg:col-span-2">
            <div className="grid grid-cols-3 gap-4">
              <StatTile label="Total XP"     value={2310} tone="primary" icon={Sparkles} delay={50} />
              <StatTile label="Badges"       value={earnedCount} tone="warn" icon={Award} delay={150} />
              <StatTile label="Class rank"   value={3}    tone="success" icon={Trophy}  delay={250} />
            </div>
            <Leaderboard entries={data.leaderboard} />
          </div>
        </div>
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-slate-900">Badges</h2>
          <p className="mt-1 text-sm text-slate-500">{earnedCount} of {data.badges.length} earned. Keep going.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {data.badges.map((b) => <BadgeCard key={b.id} b={b} />)}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
