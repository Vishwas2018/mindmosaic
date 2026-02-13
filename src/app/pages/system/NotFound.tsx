/**
 * MindMosaic — 404 Not Found Page (Day 23)
 *
 * Static error page for broken/unknown routes.
 * No logic, no guards.
 */

import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background-soft px-4">
      <div className="text-center">
        <p className="text-6xl font-bold text-primary-blue">404</p>
        <h1 className="mt-4 text-2xl font-bold text-text-primary">
          Page not found
        </h1>
        <p className="mt-2 text-sm text-text-muted">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6 flex items-center justify-center gap-4">
          <Link
            to="/"
            className="rounded-lg bg-primary-blue px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-blue-light"
          >
            Go Home
          </Link>
          <Link
            to="/contact"
            className="rounded-lg border border-border-subtle px-6 py-2.5 text-sm font-medium text-text-primary hover:bg-white"
          >
            Contact Support
          </Link>
        </div>
      </div>
    </div>
  );
}
