/**
 * MindMosaic — Router Configuration
 *
 * Day 15: Added student exam runtime routes
 * Day 16: Cleaned up duplicate review route
 * Day 17: Added admin marking routes
 *
 * Routes:
 * - /student/exams              → Exam discovery list
 * - /student/exams/:packageId   → Exam detail / start
 * - /student/attempts/:attemptId → Exam taking (attempt-centric)
 * - /student/attempts/:attemptId/review → Review submitted attempt
 * - /admin/marking              → Teacher marking queue
 * - /admin/marking/:attemptId   → Mark / review a single attempt
 */

import { createBrowserRouter, Navigate } from "react-router-dom";

// Layouts (existing)
import { PublicLayout } from "./layouts/PublicLayout";
import { AuthLayout } from "./layouts/AuthLayout";
import { StudentLayout } from "./layouts/StudentLayout";
import { ParentLayout } from "./layouts/ParentLayout";
import { AdminLayout } from "./layouts/AdminLayout";

// Guards
import { AuthGuard } from "../guards/AuthGuard";
import { RoleGuard } from "../guards/RoleGuard";

// Auth pages
import { LoginPage } from "./pages/auth/Login";
import { SignupPage } from "./pages/auth/Signup";

// Student pages (Day 15)
import {
  ExamListPage,
  ExamDetailPage,
  ExamAttemptPage,
  ExamReviewPage,
} from "./pages/student";

// Dashboards
import { StudentDashboard } from "./pages/student/Dashboard";
import { ParentDashboard } from "./pages/parent/Dashboard";
import { AdminDashboard } from "./pages/admin/Dashboard";

// Admin marking pages (Day 17)
import { MarkingQueuePage, AttemptMarkingPage } from "./pages/admin/marking";

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
      {
        index: true,
        element: <StudentDashboard />,
      },
      {
        path: "exams",
        element: <ExamListPage />,
      },
      {
        path: "exams/:packageId",
        element: <ExamDetailPage />,
      },
      {
        path: "attempts/:attemptId",
        element: <ExamAttemptPage />,
      },
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
      // Day 17: Marking routes
      {
        path: "marking",
        element: <MarkingQueuePage />,
      },
      {
        path: "marking/:attemptId",
        element: <AttemptMarkingPage />,
      },
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
