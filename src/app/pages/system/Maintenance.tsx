/**
 * MindMosaic — Maintenance Page (Day 23)
 *
 * Static page shown during planned maintenance.
 * No logic, no backend calls, no guards.
 *
 * Usage: Point the root route to this component during maintenance,
 * or serve it as a static HTML page via CDN.
 */

export function MaintenancePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background-soft px-4">
      <div className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent-amber/10">
          <span className="text-2xl" aria-hidden="true">
            🔧
          </span>
        </div>
        <h1 className="mt-4 text-2xl font-bold text-text-primary">
          Under Maintenance
        </h1>
        <p className="mt-2 max-w-md text-sm text-text-muted">
          MindMosaic is temporarily unavailable while we perform scheduled
          maintenance. We'll be back shortly.
        </p>
        <p className="mt-4 text-sm text-text-muted">
          If you need immediate help, email{" "}
          <a
            href="mailto:support@mindmosaic.com.au"
            className="font-medium text-primary-blue hover:underline"
          >
            support@mindmosaic.com.au
          </a>
          .
        </p>
      </div>
    </div>
  );
}
