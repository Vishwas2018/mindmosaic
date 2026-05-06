/**
 * MindMosaic — Landing page
 * --------------------------------------------------------------------------
 * Public marketing page. Standalone — no portal shell.
 *
 * Sections: top nav, hero, social proof, feature trio, "how it works",
 * curriculum coverage, pricing teaser, testimonial, footer CTA, footer.
 *
 * Goals: communicate trust + premium feel + concrete value (NAPLAN/ICAS),
 * push toward "Get started free" or "See how it works".
 */

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  Menu,
  X,
  Sparkles,
  Target,
  TrendingUp,
  ShieldCheck,
  BookOpen,
  Trophy,
  Users,
  ChevronRight,
} from "lucide-react";
import { Logo, Wordmark, Favicon } from "../shell.jsx";

const FEATURES = [
  {
    icon: Target,
    title: "Adaptive practice",
    body: "Questions adjust to your child's level in real time. They never feel bored or overwhelmed.",
  },
  {
    icon: TrendingUp,
    title: "Real progress tracking",
    body: "Skill-by-skill mastery, not vanity metrics. See exactly where they're improving and where they're stuck.",
  },
  {
    icon: ShieldCheck,
    title: "Curriculum-aligned",
    body: "Every question maps to the Australian Curriculum and NAPLAN/ICAS standards. No off-syllabus filler.",
  },
];

const STEPS = [
  { n: "01", title: "Take a diagnostic",   body: "20 minutes. We map your child's strengths and gaps across every strand." },
  { n: "02", title: "Get a learning plan", body: "A personalised weekly plan built from the diagnostic. Updates as they grow." },
  { n: "03", title: "Practise daily",      body: "Short, focused sessions. Insights for parents, mastery for students." },
];

const STRANDS = [
  "Number & Algebra", "Measurement & Geometry", "Statistics & Probability",
  "Reading Comprehension", "Spelling & Grammar", "Writing",
];

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Get started with a full diagnostic and weekly insights.",
    cta: "Get started free",
    features: ["Full diagnostic assessment", "Weekly learning plan", "Basic progress tracking"],
    highlighted: false,
  },
  {
    id: "family",
    name: "Family",
    price: "$19",
    period: "/ month",
    description: "Everything in Free, plus unlimited practice and full reports.",
    cta: "Start 14-day free trial",
    features: ["Everything in Free", "Unlimited adaptive practice", "Full mastery reports", "Up to 3 children", "Priority support"],
    highlighted: true,
  },
  {
    id: "school",
    name: "School",
    price: "Custom",
    period: "",
    description: "Multi-class, teacher dashboards, and analytics for whole schools.",
    cta: "Contact sales",
    features: ["Everything in Family", "Teacher dashboards", "Class analytics", "Bulk roster import", "Dedicated success manager"],
    highlighted: false,
  },
];

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how" },
  { label: "Pricing", href: "#pricing" },
  { label: "For schools", href: "#schools" },
];

/* ============================================================================
 * HEADER
 * ========================================================================== */

function LandingHeader({ onSignIn, onSignUp }) {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-10">
        <a href="#" className="flex items-center gap-2.5">
          <Logo size={32} />
          <Wordmark className="text-lg" />
        </a>
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900">
              {l.label}
            </a>
          ))}
        </nav>
        <div className="hidden items-center gap-2 lg:flex">
          <button onClick={onSignIn} className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100">
            Sign in
          </button>
          <button
            onClick={onSignUp}
            className="inline-flex items-center gap-1.5 rounded-lg bg-violet-700 px-4 py-2 text-sm font-semibold text-white shadow-[0_4px_10px_-2px_rgba(91,33,182,0.35)] transition-colors hover:bg-violet-800"
          >
            Get started free
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.5} />
          </button>
        </div>
        <button onClick={() => setOpen((o) => !o)} className="rounded-lg p-2 text-slate-700 lg:hidden" aria-label="Toggle menu">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open ? (
        <div className="border-t border-slate-200 bg-white px-6 py-4 lg:hidden">
          <nav className="flex flex-col gap-1">
            {NAV_LINKS.map((l) => (
              <a key={l.href} href={l.href} className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
                {l.label}
              </a>
            ))}
          </nav>
          <div className="mt-3 flex flex-col gap-2 border-t border-slate-100 pt-3">
            <button onClick={onSignIn} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">
              Sign in
            </button>
            <button onClick={onSignUp} className="rounded-lg bg-violet-700 px-4 py-2 text-sm font-semibold text-white">
              Get started free
            </button>
          </div>
        </div>
      ) : null}
    </header>
  );
}

/* ============================================================================
 * SECTIONS
 * ========================================================================== */

function Hero({ onSignUp }) {
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute -top-40 -right-32 h-[28rem] w-[28rem] rounded-full bg-violet-200/50 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -bottom-40 -left-32 h-[24rem] w-[24rem] rounded-full bg-orange-100/60 blur-3xl" aria-hidden="true" />
      <div className="relative mx-auto max-w-7xl px-6 pb-20 pt-20 text-center lg:px-10 lg:pt-28">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700 ring-1 ring-inset ring-violet-100">
            <Sparkles className="h-3.5 w-3.5" strokeWidth={2.25} />
            New: Year 9 NAPLAN packs available
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl lg:text-[3.5rem] lg:leading-[1.05]">
            The learning platform that{" "}
            <span className="text-violet-700">grows with</span>{" "}
            your child.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
            Personalised K–9 practice aligned to NAPLAN and ICAS. Built for Australian families and the schools that serve them.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={onSignUp}
              className="inline-flex items-center gap-2 rounded-xl bg-violet-700 px-6 py-3 text-base font-semibold text-white shadow-[0_8px_20px_-6px_rgba(91,33,182,0.45)] transition-all hover:bg-violet-800 hover:shadow-[0_12px_24px_-8px_rgba(91,33,182,0.55)] active:scale-[0.98]"
            >
              Get started free
              <ArrowRight className="h-4 w-4" strokeWidth={2.25} />
            </button>
            <button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 text-base font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50">
              Watch the 90-second tour
            </button>
          </div>
          <p className="mt-4 text-xs text-slate-500">No credit card · Free diagnostic · ~20 minutes</p>
        </motion.div>

        {/* Hero preview card */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
          className="mx-auto mt-16 max-w-5xl"
        >
          <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-[0_24px_48px_-12px_rgba(15,23,42,0.18)]">
            <div className="grid gap-0 sm:grid-cols-3">
              <div className="border-r border-slate-100 p-5 text-left">
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-violet-700">Mastery</p>
                <p className="mt-2 text-3xl font-semibold tabular-nums leading-none text-slate-900">72%</p>
                <p className="mt-2 text-xs text-emerald-600">+4% from last week</p>
              </div>
              <div className="border-r border-slate-100 p-5 text-left">
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-violet-700">Streak</p>
                <p className="mt-2 text-3xl font-semibold tabular-nums leading-none text-slate-900">12 days</p>
                <p className="mt-2 text-xs text-orange-600">Best ever</p>
              </div>
              <div className="p-5 text-left">
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-violet-700">Next session</p>
                <p className="mt-2 text-base font-semibold text-slate-900">Fractions practice</p>
                <p className="mt-1 text-xs text-slate-500">15 questions · ~12 min</p>
              </div>
            </div>
            <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-3 text-left text-[11px] text-slate-500">
              Live preview from a real student dashboard
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function SocialProof() {
  return (
    <section className="border-y border-slate-100 bg-white py-10">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <p className="text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
          Trusted by parents at schools across Australia
        </p>
        <div className="mx-auto mt-6 flex max-w-3xl flex-wrap items-center justify-center gap-x-10 gap-y-4 text-sm font-semibold text-slate-400">
          <span>Trinity Grammar</span>
          <span>Caulfield Primary</span>
          <span>Knox Grammar</span>
          <span>Brisbane Boys</span>
          <span>SCEGGS Darlinghurst</span>
        </div>
      </div>
    </section>
  );
}

function Features() {
  return (
    <section id="features" className="py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-violet-700">Why MindMosaic</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            A premium learning experience, not another quiz app.
          </h2>
        </div>
        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: i * 0.1 }}
              className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-shadow hover:shadow-[0_8px_24px_-4px_rgba(15,23,42,0.08)]"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
                <f.icon className="h-5 w-5" strokeWidth={2} />
              </span>
              <h3 className="mt-5 text-lg font-semibold tracking-tight text-slate-900">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="how" className="bg-slate-50/60 py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-orange-600">How it works</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            From sign-up to confident learner in three steps.
          </h2>
        </div>
        <div className="mt-14 grid gap-4 lg:grid-cols-3">
          {STEPS.map((s, i) => (
            <motion.div
              key={s.n}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: i * 0.1 }}
              className="relative rounded-2xl border border-slate-200/70 bg-white p-7"
            >
              <span className="text-2xl font-semibold tracking-tight text-orange-600 tabular-nums">{s.n}</span>
              <h3 className="mt-4 text-lg font-semibold tracking-tight text-slate-900">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{s.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Curriculum() {
  return (
    <section className="py-20 lg:py-24">
      <div className="mx-auto max-w-5xl px-6 lg:px-10">
        <div className="rounded-3xl border border-slate-200/70 bg-white p-10">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-violet-700">Curriculum coverage</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
                Every strand, every skill.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-slate-600">
                Our content team maps every question to the Australian Curriculum and to NAPLAN / ICAS marking criteria. Nothing in the platform is filler.
              </p>
            </div>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {STRANDS.map((s) => (
                <li key={s} className="flex items-center gap-2.5 rounded-xl border border-slate-200/70 px-4 py-3 text-sm font-medium text-slate-700">
                  <Check className="h-4 w-4 text-emerald-500" strokeWidth={2.5} />
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function Pricing({ onSignUp }) {
  return (
    <section id="pricing" className="bg-slate-50/60 py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-violet-700">Pricing</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            Start free. Upgrade when you're ready.
          </h2>
        </div>
        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {PLANS.map((p) => {
            const isPro = p.highlighted;
            return (
              <div
                key={p.id}
                className={
                  "relative flex flex-col rounded-2xl p-7 " +
                  (isPro
                    ? "bg-violet-700 text-white shadow-[0_16px_40px_-12px_rgba(91,33,182,0.55)]"
                    : "border border-slate-200/70 bg-white")
                }
              >
                {isPro ? (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-orange-500 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.1em] text-white">
                    Most popular
                  </span>
                ) : null}
                <h3 className={"text-lg font-semibold tracking-tight " + (isPro ? "text-white" : "text-slate-900")}>{p.name}</h3>
                <p className={"mt-1 text-sm " + (isPro ? "text-white/75" : "text-slate-500")}>{p.description}</p>
                <p className="mt-6 flex items-baseline gap-1">
                  <span className={"text-4xl font-semibold tracking-tight " + (isPro ? "text-white" : "text-slate-900")}>{p.price}</span>
                  <span className={"text-sm " + (isPro ? "text-white/70" : "text-slate-500")}>{p.period}</span>
                </p>
                <ul className="mt-6 space-y-2.5">
                  {p.features.map((f) => (
                    <li key={f} className={"flex items-start gap-2.5 text-sm " + (isPro ? "text-white/85" : "text-slate-600")}>
                      <Check className={"h-4 w-4 shrink-0 " + (isPro ? "text-orange-300" : "text-emerald-500")} strokeWidth={2.5} />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={onSignUp}
                  className={
                    "mt-8 inline-flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all active:scale-[0.99] " +
                    (isPro
                      ? "bg-white text-violet-700 hover:bg-violet-50"
                      : "border border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50")
                  }
                >
                  {p.cta}
                  <ArrowRight className="h-4 w-4" strokeWidth={2.25} />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Testimonial() {
  return (
    <section className="py-20 lg:py-24">
      <div className="mx-auto max-w-3xl px-6 text-center lg:px-10">
        <Sparkles className="mx-auto h-6 w-6 text-orange-500" strokeWidth={2} />
        <p className="mt-5 text-2xl font-medium leading-relaxed text-slate-800 sm:text-3xl sm:leading-relaxed">
          "My son went from dreading maths homework to asking for extra practice. The weekly reports finally gave us a clear picture of where he was struggling."
        </p>
        <div className="mt-7 flex items-center justify-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-700 text-sm font-semibold text-white">
            S
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-slate-900">Sarah K.</p>
            <p className="text-xs text-slate-500">Parent · Year 5 student</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function FooterCTA({ onSignUp }) {
  return (
    <section id="schools" className="px-6 pb-20 lg:px-10">
      <div className="relative mx-auto max-w-7xl overflow-hidden rounded-3xl bg-violet-700 p-10 text-white sm:p-14">
        <div className="pointer-events-none absolute -top-24 -right-12 h-72 w-72 rounded-full bg-orange-500/30 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-24 -left-12 h-72 w-72 rounded-full bg-violet-900/40 blur-3xl" aria-hidden="true" />
        <div className="relative grid gap-8 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-orange-300">For families and schools</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Give your child the edge they deserve.
            </h2>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-white/80">
              Try MindMosaic free today. Or speak to our schools team about district-wide rollouts.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 lg:justify-end">
            <button
              onClick={onSignUp}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-violet-700 transition-colors hover:bg-violet-50 active:scale-[0.98]"
            >
              Get started free
              <ArrowRight className="h-4 w-4" strokeWidth={2.25} />
            </button>
            <button className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10">
              Talk to schools team
              <ChevronRight className="h-4 w-4" strokeWidth={2.25} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function LandingFooter() {
  return (
    <footer className="border-t border-slate-200/70 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-6 py-10 lg:flex-row lg:items-center lg:px-10">
        <div className="flex items-center gap-2.5">
          <Logo size={28} />
          <Wordmark className="text-base" />
          <span className="text-xs text-slate-500">© {new Date().getFullYear()}</span>
        </div>
        <div className="flex flex-wrap gap-6 text-sm text-slate-500">
          <a href="#" className="hover:text-slate-900">Privacy</a>
          <a href="#" className="hover:text-slate-900">Terms</a>
          <a href="#" className="hover:text-slate-900">Contact</a>
          <a href="#" className="hover:text-slate-900">Security</a>
        </div>
      </div>
    </footer>
  );
}

/* ============================================================================
 * LANDING PAGE
 * ========================================================================== */

export default function LandingPage({ onSignIn, onSignUp }) {
  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 antialiased">
      <Favicon />
      <LandingHeader onSignIn={onSignIn} onSignUp={onSignUp} />
      <Hero onSignUp={onSignUp} />
      <SocialProof />
      <Features />
      <HowItWorks />
      <Curriculum />
      <Pricing onSignUp={onSignUp} />
      <Testimonial />
      <FooterCTA onSignUp={onSignUp} />
      <LandingFooter />
    </div>
  );
}
