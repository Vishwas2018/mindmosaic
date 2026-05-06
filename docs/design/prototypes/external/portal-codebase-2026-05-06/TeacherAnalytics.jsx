/**
 * MindMosaic — Teacher Analytics
 * Class-level charts: mastery distribution, trend over time, skill heatmap.
 * Sidebar contextual: filters (date range, subject, class).
 */

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
  LineChart, Line,
} from "recharts";
import {
  Calendar, BookOpen, Users, Filter, Download, TrendingUp,
} from "lucide-react";
import { AppShell, Card, Pill, useCountUp, TONE_HEX, TONE_TEXT, TONE_BAR_BG, pctTone } from "../shell.jsx";

export const analyticsData = {
  user: { name: "Ms. Patel", role: "Teacher · Maths Year 7", plan: "School plan" },
  className: "Year 7 Maths",
  range: "Last 30 days",
  kpis: {
    avgMastery: 71,
    avgImprovement: 4,
    completionRate: 78,
    activeStudents: 26,
  },
  distribution: [
    { bucket: "0–20%", count: 1,  fill: "danger" },
    { bucket: "21–40%", count: 3, fill: "danger" },
    { bucket: "41–60%", count: 7, fill: "warn"   },
    { bucket: "61–80%", count: 12, fill: "primary" },
    { bucket: "81–100%", count: 5, fill: "success" },
  ],
  trend: [
    { week: "W1", mastery: 62 },
    { week: "W2", mastery: 64 },
    { week: "W3", mastery: 67 },
    { week: "W4", mastery: 71 },
  ],
  heatmap: {
    skills: ["Fractions", "Decimals", "Algebra", "Geometry", "Probability", "Equations"],
    students: ["Vish", "Aanya", "Marcus", "Lila", "Tom", "Sophie", "Ben", "Maria"],
    matrix: [
      [60, 78, 72, 88, 45, 70],
      [92, 88, 90, 95, 80, 85],
      [85, 82, 88, 90, 70, 80],
      [40, 55, 50, 70, 38, 45],
      [38, 62, 58, 65, 32, 40],
      [80, 78, 75, 88, 70, 75],
      [70, 75, 70, 80, 60, 68],
      [48, 60, 55, 72, 45, 50],
    ],
  },
};

function KPICard({ label, value, suffix = "", sub, icon: Icon, tone, delay = 0 }) {
  const tweened = useCountUp(value, { duration: 1100, delay });
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: delay / 1000 }}>
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</p>
          <span className={
            "flex h-8 w-8 items-center justify-center rounded-lg " +
            (tone === "warn" ? "bg-orange-50 text-orange-600" :
             tone === "success" ? "bg-emerald-50 text-emerald-600" : "bg-violet-50 text-violet-700")
          }>
            <Icon className="h-4 w-4" strokeWidth={2} />
          </span>
        </div>
        <p className="mt-3 text-3xl font-semibold tabular-nums leading-none text-slate-900">{tweened}{suffix}</p>
        {sub ? <p className="mt-2 text-xs text-slate-500">{sub}</p> : null}
      </Card>
    </motion.div>
  );
}

function ChartTooltip({ active, payload, label, suffix = "" }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-slate-900 tabular-nums">{payload[0].value}{suffix}</p>
    </div>
  );
}

function DistributionChart({ data }) {
  return (
    <Card className="p-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-violet-700">Distribution</p>
      <h3 className="mt-1.5 text-lg font-semibold tracking-tight text-slate-900">Mastery distribution</h3>
      <p className="mt-1 text-sm text-slate-500">How students cluster across the mastery spectrum.</p>
      <div className="mt-4 h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }} barCategoryGap="22%">
            <CartesianGrid stroke="#eef2f7" strokeDasharray="2 4" vertical={false} />
            <XAxis dataKey="bucket" tickLine={false} axisLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} width={28} />
            <Tooltip cursor={{ fill: "#f5f3ff" }} content={<ChartTooltip />} />
            <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={32}>
              {data.map((d, i) => <Cell key={i} fill={TONE_HEX[d.fill]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function TrendOverTime({ trend }) {
  return (
    <Card className="p-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-violet-700">Trend</p>
      <h3 className="mt-1.5 text-lg font-semibold tracking-tight text-slate-900">Class average over time</h3>
      <p className="mt-1 text-sm text-slate-500">Weekly mastery average.</p>
      <div className="mt-4 h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={trend} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid stroke="#eef2f7" strokeDasharray="2 4" vertical={false} />
            <XAxis dataKey="week" tickLine={false} axisLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} />
            <YAxis domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(v) => `${v}%`} width={36} />
            <Tooltip cursor={{ stroke: "#cbd5e1", strokeDasharray: "3 3" }} content={<ChartTooltip suffix="%" />} />
            <Line type="monotone" dataKey="mastery" stroke="#5B21B6" strokeWidth={2.5}
              dot={{ r: 4, fill: "#fff", stroke: "#5B21B6", strokeWidth: 2 }}
              activeDot={{ r: 6, strokeWidth: 2, stroke: "#fff", fill: "#5B21B6" }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function Heatmap({ heatmap }) {
  const cellTone = (pct) => pctTone(pct);
  return (
    <Card>
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-violet-700">Heatmap</p>
          <h3 className="mt-1.5 text-lg font-semibold tracking-tight text-slate-900">Skill mastery by student</h3>
          <p className="mt-1 text-sm text-slate-500">Spot patterns across the class at a glance.</p>
        </div>
        <Pill tone="neutral">{heatmap.students.length} students × {heatmap.skills.length} skills</Pill>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50/40">
              <th className="sticky left-0 z-10 bg-slate-50/40 px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                Student
              </th>
              {heatmap.skills.map((s) => (
                <th key={s} className="px-2 py-3 text-center text-[11px] font-semibold text-slate-500">{s}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {heatmap.students.map((student, r) => (
              <tr key={student} className="border-t border-slate-100">
                <td className="sticky left-0 z-10 bg-white px-6 py-2 text-sm font-medium text-slate-800">{student}</td>
                {heatmap.matrix[r].map((pct, c) => {
                  const tone = cellTone(pct);
                  return (
                    <td key={c} className="px-1.5 py-1.5 text-center">
                      <span className={
                        "inline-flex h-9 w-14 items-center justify-center rounded-md text-xs font-semibold tabular-nums " +
                        TONE_BAR_BG[tone] + " text-white"
                      } title={`${heatmap.skills[c]}: ${pct}%`}>
                        {pct}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-4 border-t border-slate-100 px-6 py-3 text-[11px] text-slate-500">
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" /> 80–100%</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-violet-700" /> 60–79%</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-orange-500" /> 40–59%</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-rose-500" /> &lt; 40%</span>
      </div>
    </Card>
  );
}

const RANGES = ["Last 7 days", "Last 30 days", "This term", "All time"];

export default function TeacherAnalyticsPage({ data = analyticsData }) {
  const [range, setRange] = useState(data.range);

  const contextualSection = {
    title: "Filters",
    items: [
      { id: "date",     icon: Calendar, label: range,                hint: "Date range" },
      { id: "subject",  icon: BookOpen, label: "Mathematics",        hint: "Subject" },
      { id: "class",    icon: Users,    label: data.className,       hint: "Class" },
      { id: "export",   icon: Download, label: "Export CSV",         hint: "All filters", tone: "accent" },
    ],
  };

  return (
    <AppShell
      role="teacher" active="analytics" pageTitle="Analytics"
      contextualSection={contextualSection}
      user={data.user}
      topBarSlot={
        <div className="hidden gap-1 lg:flex">
          {RANGES.map((r) => (
            <button key={r} onClick={() => setRange(r)}
              className={
                "rounded-lg px-2.5 py-1 text-xs font-medium transition-colors " +
                (range === r ? "bg-violet-50 text-violet-700" : "text-slate-600 hover:bg-slate-100")
              }>{r}</button>
          ))}
        </div>
      }
    >
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Class analytics</h1>
          <p className="mt-2 text-sm text-slate-500">{data.className} · {range}</p>
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KPICard label="Class avg"      value={data.kpis.avgMastery}     suffix="%" sub="Mastery"          icon={TrendingUp} tone="primary" delay={50} />
          <KPICard label="Improvement"    value={data.kpis.avgImprovement} suffix="%" sub="vs last period"   icon={TrendingUp} tone="success" delay={150} />
          <KPICard label="Completion"     value={data.kpis.completionRate} suffix="%" sub="Assigned tasks"  icon={Filter}     tone="warn"    delay={250} />
          <KPICard label="Active"         value={data.kpis.activeStudents}            sub="of 28 students"   icon={Users}      tone="primary" delay={350} />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <DistributionChart data={data.distribution} />
          <TrendOverTime trend={data.trend} />
        </div>
        <Heatmap heatmap={data.heatmap} />
      </div>
    </AppShell>
  );
}
