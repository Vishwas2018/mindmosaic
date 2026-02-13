/**
 * MindMosaic — Pricing Page (Day 23)
 *
 * Static pricing information. No billing, subscriptions, or backend calls.
 */

import { Link } from "react-router-dom";
import { PublicFooter } from "./Home";

export function PricingPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-4xl px-6 py-16">
        <h1 className="text-center text-3xl font-bold text-text-primary">
          Simple, transparent pricing
        </h1>
        <p className="mt-3 text-center text-text-muted">
          Start free. Upgrade when you're ready.
        </p>

        <div className="mt-12 grid gap-8 sm:grid-cols-2">
          {/* Free tier */}
          <div className="rounded-lg border border-border-subtle bg-white p-8">
            <h2 className="text-lg font-semibold text-text-primary">Free</h2>
            <p className="mt-1 text-sm text-text-muted">
              Great for getting started
            </p>
            <p className="mt-6">
              <span className="text-4xl font-bold text-text-primary">$0</span>
              <span className="text-sm text-text-muted"> / month</span>
            </p>
            <ul className="mt-6 space-y-3 text-sm text-text-muted">
              <PricingItem text="Up to 5 practice exams per month" />
              <PricingItem text="Auto-scored objective questions" />
              <PricingItem text="Basic progress tracking" />
              <PricingItem text="1 student account" />
            </ul>
            <Link
              to="/signup"
              className="mt-8 block rounded-lg border border-primary-blue px-4 py-2.5 text-center text-sm font-medium text-primary-blue hover:bg-background-soft"
            >
              Get Started
            </Link>
          </div>

          {/* Premium tier */}
          <div className="rounded-lg border-2 border-primary-blue bg-white p-8">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-text-primary">
                Premium
              </h2>
              <span className="rounded-full bg-primary-blue px-2.5 py-0.5 text-xs font-medium text-white">
                Popular
              </span>
            </div>
            <p className="mt-1 text-sm text-text-muted">
              For serious exam preparation
            </p>
            <p className="mt-6">
              <span className="text-4xl font-bold text-text-primary">
                $9.99
              </span>
              <span className="text-sm text-text-muted"> / month</span>
            </p>
            <ul className="mt-6 space-y-3 text-sm text-text-muted">
              <PricingItem text="Unlimited practice exams" />
              <PricingItem text="Auto-scored and teacher-marked responses" />
              <PricingItem text="Detailed progress analytics" />
              <PricingItem text="Up to 3 student accounts" />
              <PricingItem text="Parent dashboard access" />
              <PricingItem text="Priority support" />
            </ul>
            <Link
              to="/signup"
              className="mt-8 block rounded-lg bg-primary-blue px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-primary-blue-light"
            >
              Start Free Trial
            </Link>
          </div>
        </div>

        <p className="mt-8 text-center text-sm text-text-muted">
          All prices in AUD. Cancel anytime. No lock-in contracts.
        </p>
      </div>
      <PublicFooter />
    </div>
  );
}

function PricingItem({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-2">
      <span className="mt-0.5 text-success-green" aria-hidden="true">
        ✓
      </span>
      <span>{text}</span>
    </li>
  );
}
