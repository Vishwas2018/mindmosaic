/**
 * MindMosaic — Parent Billing
 * Current plan + payment method + invoice history + plan switcher.
 */

import React from "react";
import { motion } from "framer-motion";
import {
  CreditCard, Download, ArrowRight, Check, Sparkles, Receipt, Building2,
  ShieldCheck, FileText,
} from "lucide-react";
import { AppShell, Card, CardHeader, Pill } from "../shell.jsx";

export const billingData = {
  user: { name: "Sarah K.", role: "Parent", plan: "Family plan" },
  currentPlan: {
    id: "family",
    name: "Family plan",
    pricePerMonth: 19,
    nextBilling: "1 May 2026",
    children: 2,
    childLimit: 3,
  },
  paymentMethod: {
    brand: "Visa",
    last4: "4242",
    expiry: "08 / 28",
  },
  invoices: [
    { id: "INV-2026-04", date: "1 Apr 2026", amount: 19, status: "paid" },
    { id: "INV-2026-03", date: "1 Mar 2026", amount: 19, status: "paid" },
    { id: "INV-2026-02", date: "1 Feb 2026", amount: 19, status: "paid" },
    { id: "INV-2026-01", date: "1 Jan 2026", amount: 19, status: "paid" },
    { id: "INV-2025-12", date: "1 Dec 2025", amount: 19, status: "paid" },
  ],
  plans: [
    { id: "free",   name: "Free",       price: 0,  features: ["1 diagnostic", "Weekly insights"], current: false },
    { id: "family", name: "Family",     price: 19, features: ["Unlimited practice", "Up to 3 children", "Full reports"], current: true,  highlighted: true },
    { id: "premium", name: "Premium",   price: 39, features: ["Everything in Family", "1-on-1 tutor sessions", "Priority support"], current: false },
  ],
};

function PlanSummaryCard({ plan }) {
  const used = plan.children;
  const limit = plan.childLimit;
  const pct = Math.round((used / limit) * 100);
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
      className="relative overflow-hidden rounded-3xl bg-violet-700 p-7 text-white shadow-[0_10px_30px_-10px_rgba(91,33,182,0.45)] sm:p-9"
    >
      <div className="pointer-events-none absolute -top-20 -right-12 h-72 w-72 rounded-full bg-orange-500/30 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -bottom-24 -left-12 h-72 w-72 rounded-full bg-violet-900/40 blur-3xl" aria-hidden="true" />
      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-orange-300">Current plan</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">{plan.name}</h2>
          <p className="mt-2 text-sm text-white/80">
            ${plan.pricePerMonth} / month · Next charge on {plan.nextBilling}
          </p>
          <div className="mt-5 max-w-xs">
            <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-white/70">
              <span>Children seats</span>
              <span className="tabular-nums">{used} / {limit}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/15">
              <motion.div className="h-full rounded-full bg-orange-400"
                initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.9, delay: 0.2 }} />
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <button className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-violet-700 hover:bg-violet-50 active:scale-[0.98]">
            Change plan <ArrowRight className="h-4 w-4" strokeWidth={2.25} />
          </button>
          <button className="text-xs font-medium text-white/70 hover:text-white">
            Cancel subscription
          </button>
        </div>
      </div>
    </motion.section>
  );
}

function PaymentMethodCard({ method }) {
  return (
    <Card className="p-6">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
          <CreditCard className="h-5 w-5" strokeWidth={2} />
        </span>
        <div>
          <p className="text-base font-semibold tracking-tight text-slate-900">Payment method</p>
          <p className="mt-0.5 text-xs text-slate-500">Used for monthly subscription billing</p>
        </div>
      </div>
      <div className="mt-5 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/60 p-4">
        <div>
          <p className="text-sm font-semibold text-slate-900">{method.brand} ending in {method.last4}</p>
          <p className="mt-0.5 text-xs text-slate-500">Expires {method.expiry}</p>
        </div>
        <button className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
          Update
        </button>
      </div>
      <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
        <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" strokeWidth={2.25} />
        Secured by Stripe · Never stored on our servers
      </div>
    </Card>
  );
}

function InvoiceList({ invoices }) {
  return (
    <Card>
      <CardHeader
        title="Invoices"
        description="Download receipts for your records."
        action={<Pill tone="neutral">{invoices.length} total</Pill>}
      />
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50">
              <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Invoice</th>
              <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Date</th>
              <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Amount</th>
              <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Status</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {invoices.map((i) => (
              <tr key={i.id} className="hover:bg-slate-50/50">
                <td className="px-6 py-3.5">
                  <span className="inline-flex items-center gap-2 font-medium text-slate-800">
                    <FileText className="h-3.5 w-3.5 text-slate-400" strokeWidth={2} />
                    {i.id}
                  </span>
                </td>
                <td className="px-6 py-3.5 text-slate-600">{i.date}</td>
                <td className="px-6 py-3.5 font-semibold tabular-nums text-slate-900">${i.amount}.00</td>
                <td className="px-6 py-3.5"><Pill tone="success"><Check className="h-3 w-3" strokeWidth={3} />Paid</Pill></td>
                <td className="px-6 py-3.5 text-right">
                  <button className="inline-flex items-center gap-1 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                    <Download className="h-3.5 w-3.5" strokeWidth={2} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function PlanSwitcher({ plans }) {
  return (
    <div>
      <h2 className="text-base font-semibold tracking-tight text-slate-900">Available plans</h2>
      <p className="mt-1 text-sm text-slate-500">Upgrade or downgrade anytime. Prorated automatically.</p>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {plans.map((p) => {
          const isPro = p.highlighted;
          return (
            <div key={p.id}
              className={
                "relative rounded-2xl p-6 " +
                (isPro
                  ? "bg-violet-700 text-white shadow-[0_10px_30px_-10px_rgba(91,33,182,0.45)]"
                  : "border border-slate-200/70 bg-white")
              }>
              {p.current ? (
                <span className="absolute -top-2.5 left-5 rounded-full bg-orange-500 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-white">
                  Current
                </span>
              ) : null}
              <h3 className={"text-lg font-semibold tracking-tight " + (isPro ? "text-white" : "text-slate-900")}>{p.name}</h3>
              <p className="mt-3 flex items-baseline gap-1">
                <span className={"text-3xl font-semibold tabular-nums " + (isPro ? "text-white" : "text-slate-900")}>${p.price}</span>
                <span className={"text-sm " + (isPro ? "text-white/70" : "text-slate-500")}>/ month</span>
              </p>
              <ul className="mt-5 space-y-2">
                {p.features.map((f) => (
                  <li key={f} className={"flex items-start gap-2 text-sm " + (isPro ? "text-white/85" : "text-slate-600")}>
                    <Check className={"h-4 w-4 shrink-0 " + (isPro ? "text-orange-300" : "text-emerald-500")} strokeWidth={2.5} />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                disabled={p.current}
                className={
                  "mt-6 inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-xl text-sm font-semibold transition-colors disabled:cursor-default " +
                  (isPro
                    ? "bg-white text-violet-700 hover:bg-violet-50 disabled:opacity-100"
                    : "border border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50")
                }>
                {p.current ? "Current plan" : `Switch to ${p.name}`}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ParentBillingPage({ data = billingData }) {
  const contextualSection = {
    title: "Billing",
    items: [
      { id: "method",  icon: CreditCard, label: "Update payment", hint: "Card, bank transfer" },
      { id: "history", icon: Receipt,    label: "Invoice history", hint: `${data.invoices.length} invoices` },
      { id: "school",  icon: Building2,  label: "School billing",  hint: "Enterprise", tone: "accent" },
    ],
  };

  return (
    <AppShell
      role="parent" active="billing" pageTitle="Billing"
      contextualSection={contextualSection}
      user={data.user}
    >
      <div className="space-y-8">
        <PlanSummaryCard plan={data.currentPlan} />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1"><PaymentMethodCard method={data.paymentMethod} /></div>
          <div className="lg:col-span-2"><InvoiceList invoices={data.invoices} /></div>
        </div>
        <PlanSwitcher plans={data.plans} />
      </div>
    </AppShell>
  );
}
