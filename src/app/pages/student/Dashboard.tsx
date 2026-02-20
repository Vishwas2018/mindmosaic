/**
 * MindMosaic — Student Dashboard
 *
 * Changes from previous version:
 * - Welcome card now uses bg-white so it contrasts against the page
 *   background (both were bg-background-soft → card was invisible)
 * - Removed the wave-hand emoji from the greeting heading (too casual
 *   for an exam product; the name personalisation is warm enough)
 * - "Coming soon" cards replaced with a single neutral placeholder row
 *   so the grid doesn't mislead students into thinking features exist
 *
 * No logic, routing, or data-fetching changes.
 */

import { Link } from "react-router-dom";
import { useAuth } from "../../../context/useAuth";
import { Card } from "../../../components/ui/Card";
import { Avatar } from "../../../components/ui/Avatar";
import { FloatingShapes } from "../../../components/ui/FloatingShapes";

// Inline SVG icons for the quick-action cards
function BookOpenIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}

export function StudentDashboard() {
  const { user } = useAuth();
  const email = user?.email || "";
  const firstName = email ? email.split("@")[0] : "";

  return (
    <div className="space-y-8">
      {/* ── Welcome banner ──────────────────────────────────────────────── */}
      <header className="relative overflow-hidden rounded-2xl bg-white border border-border-subtle p-8 sm:p-10 shadow-sm">
        <FloatingShapes variant="cool" />
        <div className="relative z-10 flex items-center gap-5">
          <Avatar name={email} size="lg" />
          <div>
            <h1 className="text-2xl font-bold leading-tight text-text-primary">
              Welcome back{firstName ? `, ${firstName}` : ""}
            </h1>
            <p className="mt-1 text-base leading-relaxed text-text-muted">
              What would you like to practise today?
            </p>
          </div>
        </div>
      </header>

      {/* ── Quick actions ────────────────────────────────────────────────── */}
      <div className="grid gap-5 sm:grid-cols-2">
        <Link
          to="/student/exams"
          className="focus-ring rounded-2xl animate-slide-up"
          aria-label="Browse practice exams"
        >
          <Card variant="interactive" padding="normal" className="h-full">
            <div className="mb-4 text-primary-blue">
              <BookOpenIcon />
            </div>
            <h2 className="text-base font-bold text-text-primary">
              Practice Exams
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-text-muted">
              Start a new exam or pick up where you left off
            </p>
          </Card>
        </Link>

        {/* Placeholder card — no link, clearly labelled as unavailable */}
        <div className="animate-slide-up" aria-hidden="true">
          <Card
            padding="normal"
            className="h-full select-none"
            style={{ opacity: 0.5 }}
          >
            <div className="mb-4 text-gray-400">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
            </div>
            <h2 className="text-base font-bold text-text-primary">
              My Progress
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-text-muted">
              Progress reports — coming soon
            </p>
          </Card>
        </div>
      </div>

      {/* ── Recent activity ──────────────────────────────────────────────── */}
      <section className="animate-fade-in">
        <h2 className="mb-4 text-base font-bold text-text-primary">
          Recent Activity
        </h2>
        <Card padding="spacious" className="text-center">
          <p className="text-sm leading-relaxed text-text-muted">
            Once you complete an exam, your recent activity will appear here.
          </p>
          <Link
            to="/student/exams"
            className="focus-ring touch-target mt-6 inline-block rounded-xl bg-primary-blue px-7 py-3 text-sm font-semibold text-white hover:bg-primary-blue-light transition-colors"
          >
            Browse Exams
          </Link>
        </Card>
      </section>
    </div>
  );
}
