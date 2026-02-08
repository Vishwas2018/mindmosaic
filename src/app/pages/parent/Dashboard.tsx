/**
 * MindMosaic — Parent Dashboard
 *
 * Placeholder for parent functionality (Day 15 out of scope)
 */

export function ParentDashboard() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-text-primary">
          Parent Dashboard
        </h1>
        <p className="text-text-muted mt-1">
          Monitor your child's learning progress
        </p>
      </header>

      <div className="bg-white rounded-xl border border-border-subtle p-8 text-center">
        <span className="text-6xl mb-4 block">👪</span>
        <h2 className="text-xl font-semibold text-text-primary mb-2">
          Coming Soon
        </h2>
        <p className="text-text-muted max-w-md mx-auto">
          Parent dashboard features including progress reports, 
          performance analytics, and learning insights will be 
          available in a future update.
        </p>
      </div>
    </div>
  );
}
