/**
 * MindMosaic — Student Dashboard (Day 24)
 *
 * Enhancements over UI polish pass:
 * - Uses <Card> primitive (variant="interactive" for active tiles)
 * - Uses <Avatar> in welcome header
 * - Uses <FloatingShapes> for soft background in welcome area
 * - Uses animate-slide-up for staggered card entrance
 * - Uses focus-ring on all interactive elements
 * - Uses touch-target on CTA buttons
 * - layout-container for consistent horizontal centering
 *
 * No logic, routing, or data flow changes.
 */

import { Link } from "react-router-dom";
import { useAuth } from "../../../context/useAuth";
import { Card } from "../../../components/ui/Card";
import { Avatar } from "../../../components/ui/Avatar";
import { FloatingShapes } from "../../../components/ui/FloatingShapes";

export function StudentDashboard() {
  const { user } = useAuth();
  const email = user?.email || "";
  const firstName = email ? email.split("@")[0] : "";

  return (
    <div className="space-y-10">
      {/* Welcome header with floating background */}
      <header className="relative overflow-hidden rounded-2xl bg-background-soft p-8 sm:p-10">
        <FloatingShapes variant="cool" />
        <div className="relative z-10 flex items-center gap-4">
          <Avatar name={email} size="lg" />
          <div>
            <h1 className="text-3xl font-semibold leading-tight text-text-primary">
              Welcome back{firstName ? `, ${firstName}` : ""}! 👋
            </h1>
            <p className="mt-1 text-lg leading-relaxed text-text-muted">
              What would you like to practise today?
            </p>
          </div>
        </div>
      </header>

      {/* Quick actions */}
      <div className="stagger-children grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          to="/student/exams"
          className="animate-slide-up focus-ring rounded-2xl"
          aria-label="Browse practice exams"
        >
          <Card variant="interactive" padding="normal" className="h-full">
            <span className="mb-4 block text-4xl" aria-hidden="true">
              📝
            </span>
            <h2 className="text-lg font-semibold text-text-primary">
              Practice Exams
            </h2>
            <p className="mt-1 text-base leading-relaxed text-text-muted">
              Start a new exam or pick up where you left off
            </p>
          </Card>
        </Link>

        <div className="animate-slide-up">
          <Card padding="normal" className="h-full opacity-60">
            <span className="mb-4 block text-4xl" aria-hidden="true">
              📊
            </span>
            <h2 className="text-lg font-semibold text-text-primary">
              My Progress
            </h2>
            <p className="mt-1 text-base leading-relaxed text-text-muted">
              See how you're going — available soon!
            </p>
          </Card>
        </div>

        <div className="animate-slide-up">
          <Card padding="normal" className="h-full opacity-60">
            <span className="mb-4 block text-4xl" aria-hidden="true">
              ⭐
            </span>
            <h2 className="text-lg font-semibold text-text-primary">
              Achievements
            </h2>
            <p className="mt-1 text-base leading-relaxed text-text-muted">
              Your milestones — available soon!
            </p>
          </Card>
        </div>
      </div>

      {/* Recent activity */}
      <section className="animate-fade-in">
        <h2 className="mb-4 text-xl font-medium text-text-primary">
          Recent Activity
        </h2>
        <Card padding="spacious" className="text-center">
          <p className="text-lg leading-relaxed text-text-muted">
            Nothing here yet — that's okay! Once you complete an exam, your
            recent activity will show up here.
          </p>
          <Link
            to="/student/exams"
            className="focus-ring touch-target mt-6 inline-block rounded-xl bg-primary-blue px-8 py-3.5 text-base font-medium text-white hover:bg-primary-blue-light"
          >
            Browse Exams
          </Link>
        </Card>
      </section>
    </div>
  );
}
