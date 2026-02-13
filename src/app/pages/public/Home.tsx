/**
 * MindMosaic — Home Page (Day 23)
 *
 * Public landing page. Static content only.
 * No analytics, tracking, or backend calls.
 */

import { Link } from "react-router-dom";

export function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="bg-background-soft px-6 py-20 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-text-primary sm:text-5xl">
          Practice smarter for NAPLAN &amp; ICAS
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-text-muted">
          MindMosaic helps Australian students in Years 1–9 build confidence
          with realistic practice exams, instant feedback, and clear progress
          tracking.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Link
            to="/signup"
            className="rounded-lg bg-primary-blue px-6 py-3 font-medium text-white hover:bg-primary-blue-light"
          >
            Get Started Free
          </Link>
          <Link
            to="/about"
            className="rounded-lg border border-border-subtle bg-white px-6 py-3 font-medium text-text-primary hover:bg-background-soft"
          >
            Learn More
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="text-center text-2xl font-semibold text-text-primary">
          Everything students need to succeed
        </h2>
        <div className="mt-10 grid gap-8 sm:grid-cols-3">
          <FeatureCard
            icon="📝"
            title="Realistic Practice Exams"
            description="Timed assessments modelled on NAPLAN and ICAS formats across all subjects and year levels."
          />
          <FeatureCard
            icon="✅"
            title="Instant Scoring"
            description="Objective questions are auto-scored immediately. Extended responses are marked by teachers with rubric-guided feedback."
          />
          <FeatureCard
            icon="📊"
            title="Progress Tracking"
            description="Students and parents can review results, identify strengths, and focus on areas that need improvement."
          />
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-background-soft px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-2xl font-semibold text-text-primary">
            How it works
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-4">
            <StepCard
              step="1"
              title="Sign Up"
              description="Create a free account for your child."
            />
            <StepCard
              step="2"
              title="Choose an Exam"
              description="Browse exams by year level and subject."
            />
            <StepCard
              step="3"
              title="Practice"
              description="Complete timed exams with auto-save."
            />
            <StepCard
              step="4"
              title="Review"
              description="See scores, correct answers, and progress."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-16 text-center">
        <h2 className="text-2xl font-semibold text-text-primary">
          Ready to start practising?
        </h2>
        <p className="mt-2 text-text-muted">
          Join families across Australia preparing for NAPLAN and ICAS.
        </p>
        <Link
          to="/signup"
          className="mt-6 inline-block rounded-lg bg-primary-blue px-6 py-3 font-medium text-white hover:bg-primary-blue-light"
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
    <div className="rounded-lg border border-border-subtle bg-white p-6 text-center">
      <span className="text-3xl" aria-hidden="true">
        {icon}
      </span>
      <h3 className="mt-3 font-semibold text-text-primary">{title}</h3>
      <p className="mt-2 text-sm text-text-muted">{description}</p>
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
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary-blue text-sm font-bold text-white">
        {step}
      </span>
      <h3 className="mt-3 font-semibold text-text-primary">{title}</h3>
      <p className="mt-1 text-sm text-text-muted">{description}</p>
    </div>
  );
}

// Shared footer used across all public pages
export function PublicFooter() {
  return (
    <footer className="border-t border-border-subtle bg-white px-6 py-8">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 sm:flex-row sm:justify-between">
        <p className="text-sm text-text-muted">
          &copy; {new Date().getFullYear()} MindMosaic. All rights reserved.
        </p>
        <nav
          className="flex gap-6 text-sm text-text-muted"
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
