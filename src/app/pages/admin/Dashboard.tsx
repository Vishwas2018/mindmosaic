/**
 * MindMosaic — Admin Dashboard
 *
 * Placeholder for admin functionality (Day 15 out of scope)
 */

export function AdminDashboard() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-text-primary">
          Admin Dashboard
        </h1>
        <p className="text-text-muted mt-1">
          Manage exams, users, and platform settings
        </p>
      </header>

      <div className="bg-white rounded-xl border border-border-subtle p-8 text-center">
        <span className="text-6xl mb-4 block" aria-hidden="true">
          ⚙️
        </span>
        <h2 className="text-xl font-semibold text-text-primary mb-2">
          Coming Soon
        </h2>
        <p className="text-text-muted max-w-md mx-auto">
          Admin dashboard features including exam management, user
          administration, and analytics will be available in a future update.
        </p>
      </div>
    </div>
  );
}
