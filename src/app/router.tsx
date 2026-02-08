/**
 * MindMosaic — Router Configuration
 *
 * Day 15: Added student exam runtime routes
 * Day 16: Cleaned up duplicate review route
 *
 * Routes:
 * - /student/exams           → Exam discovery list
 * - /student/exams/:packageId → Exam detail / start
 * - /student/attempts/:attemptId → Exam taking (attempt-centric)
 * - /student/attempts/:attemptId/review → Review submitted attempt
 */

import { createBrowserRouter, Navigate } from "react-router-dom";

// Layouts (existing)
import { PublicLayout } from "./layouts/PublicLayout";
import { AuthLayout } from "./layouts/AuthLayout";
import { StudentLayout } from "./layouts/StudentLayout";
import { ParentLayout } from "./layouts/ParentLayout";
import { AdminLayout } from "./layouts/AdminLayout";

// Guards (updated for Day 15)
import { AuthGuard } from "../guards/AuthGuard";
import { RoleGuard } from "../guards/RoleGuard";

// Auth pages (existing placeholders)
import { LoginPage } from "./pages/auth/Login";
import { SignupPage } from "./pages/auth/Signup";

// Student pages (Day 15)
import {
  ExamListPage,
  ExamDetailPage,
  ExamAttemptPage,
  ExamReviewPage,
} from "./pages/student";

// Placeholder dashboards (existing)
import { StudentDashboard } from "./pages/student/Dashboard";
import { ParentDashboard } from "./pages/parent/Dashboard";
import { AdminDashboard } from "./pages/admin/Dashboard";

// =============================================================================
// Router Definition
// =============================================================================

export const router = createBrowserRouter([
  // -------------------------------------------------------------------------
  // Public Routes
  // -------------------------------------------------------------------------
  {
    path: "/",
    element: <PublicLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="/login" replace />,
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Auth Routes (unauthenticated only)
  // -------------------------------------------------------------------------
  {
    path: "/",
    element: <AuthLayout />,
    children: [
      {
        path: "login",
        element: <LoginPage />,
      },
      {
        path: "signup",
        element: <SignupPage />,
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Student Routes (authenticated + student role)
  // -------------------------------------------------------------------------
  {
    path: "/student",
    element: (
      <AuthGuard>
        <RoleGuard allowed={["student"]}>
          <StudentLayout />
        </RoleGuard>
      </AuthGuard>
    ),
    children: [
      // Dashboard
      {
        index: true,
        element: <StudentDashboard />,
      },

      // Exam Discovery (package-centric)
      {
        path: "exams",
        element: <ExamListPage />,
      },
      {
        path: "exams/:packageId",
        element: <ExamDetailPage />,
      },

      // Exam Runtime (attempt-centric)
      {
        path: "attempts/:attemptId",
        element: <ExamAttemptPage />,
      },

      // Exam Review (Day 16) — read-only post-submission view
      {
        path: "attempts/:attemptId/review",
        element: <ExamReviewPage />,
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Parent Routes (authenticated + parent role)
  // -------------------------------------------------------------------------
  {
    path: "/parent",
    element: (
      <AuthGuard>
        <RoleGuard allowed={["parent"]}>
          <ParentLayout />
        </RoleGuard>
      </AuthGuard>
    ),
    children: [
      {
        index: true,
        element: <ParentDashboard />,
      },
      // TODO: Parent-specific routes for viewing student progress
    ],
  },

  // -------------------------------------------------------------------------
  // Admin Routes (authenticated + admin role)
  // -------------------------------------------------------------------------
  {
    path: "/admin",
    element: (
      <AuthGuard>
        <RoleGuard allowed={["admin"]}>
          <AdminLayout />
        </RoleGuard>
      </AuthGuard>
    ),
    children: [
      {
        index: true,
        element: <AdminDashboard />,
      },
      // TODO: Admin routes for exam management, user management
    ],
  },

  // -------------------------------------------------------------------------
  // Catch-all (404)
  // -------------------------------------------------------------------------
  {
    path: "*",
    element: (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-text-primary mb-2">404</h1>
          <p className="text-text-muted mb-4">Page not found</p>
          <a href="/" className="text-primary-blue hover:underline">
            Go home
          </a>
        </div>
      </div>
    ),
  },
]);
