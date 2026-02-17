/**
 * MindMosaic — Home Page (UI Polish Pass)
 *
 * Changes from Day 23 original:
 * - Larger hero heading (text-5xl/6xl) with more line height
 * - Body text bumped to text-lg with leading-relaxed
 * - Feature cards use rounded-2xl, p-8, shadow-sm
 * - Step cards are larger with more breathing room
 * - CTA buttons slightly larger (py-3.5, px-8)
 * - More generous section padding (py-20 → py-24)
 * - Footer has more padding
 * - Copy is slightly warmer without being informal
 *
 * No logic changes. Still fully static.
 */

import { Link } from "react-router-dom";

export function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="bg-background-soft px-6 py-24 text-center">
        <h1 className="text-4xl font-bold leading-tight tracking-tight text-text-primary sm:text-5xl lg:text-6xl">
          Practise smarter for
          <br className="hidden sm:block" /> NAPLAN &amp; ICAS
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-text-muted">
          MindMosaic helps Australian students in Years 1–9 build confidence
          with realistic practice exams, instant feedback, and clear progress
          tracking — all in one calm, focused space.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link
            to="/auth/signup"
            className="rounded-xl bg-primary-blue px-8 py-3.5 text-base font-medium text-white hover:bg-primary-blue-light"
          >
            Get Started Free
          </Link>
          <Link
            to="/about"
            className="rounded-xl border border-border-subtle bg-white px-8 py-3.5 text-base font-medium text-text-primary hover:bg-background-soft"
          >
            Learn More
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <h2 className="text-center text-2xl font-semibold text-text-primary sm:text-3xl">
          Everything students need to succeed
        </h2>
        <div className="mt-12 grid gap-8 sm:grid-cols-3">
          <FeatureCard
            icon="📝"
            title="Realistic Practice Exams"
            description="Timed assessments modelled on NAPLAN and ICAS formats, covering all subjects and year levels."
          />
          <FeatureCard
            icon="✅"
            title="Instant Scoring"
            description="Objective questions are auto-scored immediately. Extended responses are marked by teachers with clear, rubric-based feedback."
          />
          <FeatureCard
            icon="📊"
            title="Progress Tracking"
            description="Students and parents can review results, celebrate strengths, and focus on areas that need a little extra practice."
          />
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-background-soft px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-2xl font-semibold text-text-primary sm:text-3xl">
            How it works
          </h2>
          <div className="mt-12 grid gap-8 sm:grid-cols-4">
            <StepCard
              step="1"
              title="Sign Up"
              description="Create a free account for your child in under a minute."
            />
            <StepCard
              step="2"
              title="Choose an Exam"
              description="Browse practice exams by year level and subject."
            />
            <StepCard
              step="3"
              title="Practise"
              description="Complete timed exams with auto-save — no work is lost."
            />
            <StepCard
              step="4"
              title="Review"
              description="See scores, correct answers, and progress over time."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-20 text-center">
        <h2 className="text-2xl font-semibold text-text-primary sm:text-3xl">
          Ready to start practising?
        </h2>
        <p className="mt-3 text-lg leading-relaxed text-text-muted">
          Join families across Australia preparing for NAPLAN and ICAS.
        </p>
        <Link
          to="/auth/signup"
          className="mt-8 inline-block rounded-xl bg-primary-blue px-8 py-3.5 text-base font-medium text-white hover:bg-primary-blue-light"
        >
          Create Free Account
        </Link>
      </section>

      {/* Footer */}
      <PublicFooter />
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-border-subtle bg-white p-8 text-center shadow-sm">
      <span className="text-4xl" aria-hidden="true">
        {icon}
      </span>
      <h3 className="mt-4 text-lg font-semibold text-text-primary">{title}</h3>
      <p className="mt-2 text-base leading-relaxed text-text-muted">
        {description}
      </p>
    </div>
  );
}

function StepCard({
  step,
  title,
  description,
}: {
  step: string;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary-blue text-base font-bold text-white">
        {step}
      </span>
      <h3 className="mt-4 text-lg font-semibold text-text-primary">{title}</h3>
      <p className="mt-2 text-base leading-relaxed text-text-muted">
        {description}
      </p>
    </div>
  );
}

export function PublicFooter() {
  return (
    <footer className="border-t border-border-subtle bg-white px-6 py-10">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 sm:flex-row sm:justify-between">
        <p className="text-sm text-text-muted">
          &copy; {new Date().getFullYear()} MindMosaic. All rights reserved.
        </p>
        <nav
          className="flex flex-wrap gap-6 text-sm text-text-muted"
          aria-label="Footer navigation"
        >
          <Link to="/about" className="hover:text-primary-blue">
            About
          </Link>
          <Link to="/pricing" className="hover:text-primary-blue">
            Pricing
          </Link>
          <Link to="/faq" className="hover:text-primary-blue">
            FAQ
          </Link>
          <Link to="/contact" className="hover:text-primary-blue">
            Contact
          </Link>
          <Link to="/privacy" className="hover:text-primary-blue">
            Privacy
          </Link>
          <Link to="/terms" className="hover:text-primary-blue">
            Terms
          </Link>
        </nav>
      </div>
    </footer>
  );
}
