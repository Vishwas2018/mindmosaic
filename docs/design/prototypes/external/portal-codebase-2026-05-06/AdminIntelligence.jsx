/**
 * MindMosaic — Admin Intelligence
 * Top-level cross-school metrics for org admins.
 * Sidebar contextual: System (status, audit log, exports).
 */

import React from "react";
import { motion } from "framer-motion";
import {
  Building2, Users, GraduationCap, ShieldCheck, AlertCircle, ChevronRight,
  TrendingUp, FileDown, Activity, FileText,
} from "lucide-react";
import {
  AppShell, Card, CardHeader, Pill, useCountUp, pctTone, TONE_TEXT, TONE_BAR_BG,
} from "../shell.jsx";

export const adminData = {
  user: { name: "Alex P.", role: "Org Admin", plan: "Enterprise" },
  kpis: {
    schools:  { value: 28,    sub: "+2 this quarter" },
    students: { value: 12480, sub: "+340 this month" },
    teachers: { value: 612,   sub: "+18 this month"  },
    avgMastery: { value: 71,  sub: "+2% MoM"         },
  },
  schools: [
    { id: 1, name: "Trinity Grammar",      students: 1240, mastery: 78, plan: "Enterprise" },
    { id: 2, name: "Caulfield Primary",    students: 480,  mastery: 72, plan: "School"     },
    { id: 3, name: "Knox Grammar",         students: 1080, mastery: 76, plan: "Enterprise" },
    { id: 4, name: "Brisbane Boys",        students: 920,  mastery: 68, plan: "School"     },
    { id: 5, name: "SCEGGS Darlinghurst",  students: 600,  mastery: 81, plan: "Enterprise" },
    { id: 6, name: "Pymble Ladies",        students: 1320, mastery: 74, plan: "Enterprise" },
  ],
  alerts: [
    { id: 1, severity: "warn",    title: "Brisbane Boys engagement dropped 14% WoW", time: "2 hours ago" },
    { id: 2, severity: "danger",  title: "Failed login spike at Trinity Grammar",    time: "5 hours ago" },
    { id: 3, severity: "primary", title: "New school onboarding: St. Margaret's",    time: "Yesterday" },
    { id: 4, severity: "warn",    title: "License renewals due in 30 days (4 schools)", time: "2 days ago" },
  ],
};

const SEVERITY_TONE = {
  warn:    { bg: "bg-orange-50",  text: "text-orange-700",  iconBg: "bg-orange-100 text-orange-600" },
  danger:  { bg: "bg-rose-50",    text: "text-rose-700",    iconBg: "bg-rose-100 text-rose-600"     },
  primary: { bg: "bg-violet-50",  text: "text-violet-700",  iconBg: "bg-violet-100 text-violet-700" },
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
             tone === "success" ? "bg-emerald-50 text-emerald-600" : "bg-violet-50 text-violet-700")
          }>
            <Icon className="h-4 w-4" strokeWidth={2} />
          </span>
        </div>
        <p className="mt-3 text-3xl font-semibold tabular-nums leading-none text-slate-900">{tweened.toLocaleString()}</p>
        {sub ? <p className="mt-2 text-xs text-slate-500">{sub}</p> : null}
      </Card>
    </motion.div>
  );
}

function SchoolTable({ schools }) {
  return (
    <Card>
      <CardHeader
        title="Schools"
        description="Mastery and active students by school."
        action={
          <button className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-violet-700 hover:bg-violet-50">
            View all <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.25} />
          </button>
        }
      />
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50">
              <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">School</th>
              <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Students</th>
              <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Mastery</th>
              <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Plan</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {schools.map((s) => {
              const tone = pctTone(s.mastery);
              return (
                <tr key={s.id} className="cursor-pointer transition-colors hover:bg-violet-50/40">
                  <td className="px-6 py-3.5">
                    <span className="inline-flex items-center gap-2 font-medium text-slate-800">
                      <Building2 className="h-3.5 w-3.5 text-slate-400" strokeWidth={2} />
                      {s.name}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 tabular-nums text-slate-600">{s.students.toLocaleString()}</td>
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
                        <div className={"h-full rounded-full " + TONE_BAR_BG[tone]} style={{ width: `${s.mastery}%` }} />
                      </div>
                      <span className={"text-sm font-semibold tabular-nums " + TONE_TEXT[tone]}>{s.mastery}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-3.5">
                    <Pill tone={s.plan === "Enterprise" ? "primary" : "neutral"}>{s.plan}</Pill>
                  </td>
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

function AlertList({ alerts }) {
  return (
    <Card>
      <CardHeader title="Alerts" description="Things that may need your attention." />
      <ul className="divide-y divide-slate-100">
        {alerts.map((a) => {
          const meta = SEVERITY_TONE[a.severity];
          return (
            <li key={a.id} className="flex items-start gap-3 px-6 py-3.5 transition-colors hover:bg-slate-50/50">
              <span className={"flex h-9 w-9 shrink-0 items-center justify-center rounded-lg " + meta.iconBg}>
                <AlertCircle className="h-4 w-4" strokeWidth={2.25} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-800">{a.title}</p>
                <p className="mt-0.5 text-xs text-slate-500">{a.time}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

export default function AdminIntelligencePage({ data = adminData }) {
  const contextualSection = {
    title: "System",
    items: [
      { id: "status", icon: Activity,   label: "System status",  hint: "All green" },
      { id: "audit",  icon: FileText,   label: "Audit log",      hint: "Last 30 days" },
      { id: "export", icon: FileDown,   label: "Export data",    hint: "CSV, all schools", tone: "accent" },
    ],
  };

  return (
    <AppShell
      role="admin" active="intelligence" pageTitle="Intelligence"
      contextualSection={contextualSection}
      user={data.user}
    >
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Intelligence</h1>
          <p className="mt-2 text-sm text-slate-500">Org-wide overview across all schools and users.</p>
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KPICard label="Schools"      value={data.kpis.schools.value}    sub={data.kpis.schools.sub}    icon={Building2}    tone="primary" delay={50} />
          <KPICard label="Students"     value={data.kpis.students.value}   sub={data.kpis.students.sub}   icon={Users}        tone="primary" delay={150} />
          <KPICard label="Teachers"     value={data.kpis.teachers.value}   sub={data.kpis.teachers.sub}   icon={GraduationCap} tone="primary" delay={250} />
          <KPICard label="Avg mastery"  value={data.kpis.avgMastery.value} sub={data.kpis.avgMastery.sub} icon={TrendingUp}   tone="success" delay={350} />
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2"><SchoolTable schools={data.schools} /></div>
          <div className="lg:col-span-1"><AlertList alerts={data.alerts} /></div>
        </div>
      </div>
    </AppShell>
  );
}
