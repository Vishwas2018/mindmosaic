/**
 * Day 19 Navigation Additions
 *
 * Add these navigation items to your AdminLayout sidebar/navigation.
 */

import { Link, useLocation } from "react-router-dom";

export function Day19AdminNavItems() {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname.startsWith(path);
  };

  return (
    <>
      {/* Question Bank */}
      <Link
        to="/admin/questions"
        className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
          isActive("/admin/questions")
            ? "bg-primary-blue text-white"
            : "text-text-primary hover:bg-background-soft"
        }`}
      >
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        Question Bank
      </Link>

      {/* Generate Exam */}
      <Link
        to="/admin/exams/generate"
        className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
          location.pathname === "/admin/exams/generate"
            ? "bg-primary-blue text-white"
            : "text-text-primary hover:bg-background-soft"
        }`}
      >
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
          />
        </svg>
        Generate Exam
      </Link>
    </>
  );
}

// Example integration into existing AdminLayout:
//
// <nav className="space-y-1">
//   <Link to="/admin/dashboard">Dashboard</Link>
//   <Link to="/admin/exams">Exams</Link>
//
//   {/* Day 19: Question Bank & Generation */}
//   <Day19AdminNavItems />
// </nav>
