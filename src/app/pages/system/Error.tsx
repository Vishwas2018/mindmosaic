/**
 * MindMosaic — Generic Error Page (Day 23)
 *
 * Displayed for unexpected application errors.
 * Can be used as a React Router errorElement.
 * No logic, no guards.
 */

import { Link, useRouteError, isRouteErrorResponse } from "react-router-dom";

export function ErrorPage() {
  const error = useRouteError();

  let title = "Something went wrong";
  let message =
    "An unexpected error occurred. Please try again or contact support if the problem persists.";

  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      title = "Page not found";
      message = "The page you're looking for doesn't exist or has been moved.";
    } else if (error.status === 403) {
      title = "Access denied";
      message = "You don't have permission to view this page.";
    } else if (error.status === 500) {
      title = "Server error";
      message = "Something went wrong on our end. Please try again later.";
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background-soft px-4">
      <div className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-danger-red/10">
          <span className="text-2xl text-danger-red" aria-hidden="true">
            !
          </span>
        </div>
        <h1 className="mt-4 text-2xl font-bold text-text-primary">{title}</h1>
        <p className="mt-2 max-w-md text-sm text-text-muted">{message}</p>
        <div className="mt-6 flex items-center justify-center gap-4">
          <Link
            to="/"
            className="rounded-lg bg-primary-blue px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-blue-light"
          >
            Go Home
          </Link>
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg border border-border-subtle px-6 py-2.5 text-sm font-medium text-text-primary hover:bg-white"
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
}
