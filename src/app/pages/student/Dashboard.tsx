/**
 * MindMosaic — Student Dashboard
 *
 * Landing page for authenticated students.
 */

import { Link } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";

export function StudentDashboard() {
  const { user } = useAuth();

  return (
    <div className="space-y-8">
      {/* Welcome header */}
      <header>
        <h1 className="text-2xl font-semibold text-text-primary">
          Welcome back{user?.email ? `, ${user.email.split("@")[0]}` : ""}!
        </h1>
        <p className="text-text-muted mt-1">
          Ready to practice today?
        </p>
      </header>

      {/* Quick actions */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          to="/student/exams"
          className="bg-white rounded-xl border border-border-subtle p-6 hover:shadow-md transition-shadow"
        >
          <span className="text-4xl mb-4 block">📝</span>
          <h2 className="font-semibold text-text-primary mb-1">
            Practice Exams
          </h2>
          <p className="text-sm text-text-muted">
            Start or continue a practice exam
          </p>
        </Link>

        <div className="bg-white rounded-xl border border-border-subtle p-6 opacity-50">
          <span className="text-4xl mb-4 block">📊</span>
          <h2 className="font-semibold text-text-primary mb-1">
            My Progress
          </h2>
          <p className="text-sm text-text-muted">
            Coming soon
          </p>
        </div>

        <div className="bg-white rounded-xl border border-border-subtle p-6 opacity-50">
          <span className="text-4xl mb-4 block">🏆</span>
          <h2 className="font-semibold text-text-primary mb-1">
            Achievements
          </h2>
          <p className="text-sm text-text-muted">
            Coming soon
          </p>
        </div>
      </div>

      {/* Recent activity placeholder */}
      <section>
        <h2 className="text-lg font-medium text-text-primary mb-4">
          Recent Activity
        </h2>
        <div className="bg-white rounded-xl border border-border-subtle p-6 text-center">
          <p className="text-text-muted">
            No recent activity yet. Start a practice exam to see your progress here!
          </p>
          <Link
            to="/student/exams"
            className="inline-block mt-4 text-primary-blue hover:underline"
          >
            Browse exams →
          </Link>
        </div>
      </section>
    </div>
  );
}
