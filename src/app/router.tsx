/**
 * MindMosaic — Router Configuration
 *
 * Day 15: Student exam runtime routes
 * Day 16: Student review routes
 * Day 17: Admin marking routes
 * Day 18: Admin reporting routes
 * Day 19: Question bank & exam authoring routes
 */
import { Route } from "react-router-dom";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { ExamPublishPage } from "./pages/admin/exams/ExamPublish";

// Layouts
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

// Student pages
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

// Admin marking (Day 17)
import { MarkingQueuePage, AttemptMarkingPage } from "./pages/admin/marking";

// Admin reporting (Day 18)
import { AdminExamListPage, ExamAttemptsPage } from "./pages/admin/reporting";

// Admin authoring (Day 19)
import { QuestionListPage } from "./pages/admin/questions/QuestionList";
import { QuestionEditorPage } from "./pages/admin/questions/QuestionEditor";
import { ExamGeneratePage } from "./pages/admin/exams/ExamGenerate";

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
  // Auth Routes
  // -------------------------------------------------------------------------
  {
    path: "/",
    element: <AuthLayout />,
    children: [
      { path: "login", element: <LoginPage /> },
      { path: "signup", element: <SignupPage /> },
    ],
  },

  // -------------------------------------------------------------------------
  // Student Routes
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
      { index: true, element: <StudentDashboard /> },
      { path: "exams", element: <ExamListPage /> },
      { path: "exams/:packageId", element: <ExamDetailPage /> },
      { path: "attempts/:attemptId", element: <ExamAttemptPage /> },
      { path: "attempts/:attemptId/review", element: <ExamReviewPage /> },
    ],
  },

  // -------------------------------------------------------------------------
  // Parent Routes
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
    children: [{ index: true, element: <ParentDashboard /> }],
  },

  // -------------------------------------------------------------------------
  // Admin Routes
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
      { index: true, element: <AdminDashboard /> },

      // Day 17: Marking
      { path: "marking", element: <MarkingQueuePage /> },
      { path: "marking/:attemptId", element: <AttemptMarkingPage /> },

      // Day 18: Reporting
      { path: "exams", element: <AdminExamListPage /> },
      { path: "exams/:id/attempts", element: <ExamAttemptsPage /> },

      // Day 19: Question Bank
      { path: "questions", element: <QuestionListPage /> },
      { path: "questions/create", element: <QuestionEditorPage /> },
      { path: "questions/edit/:id", element: <QuestionEditorPage /> },

      // Day 19: Exam Authoring
      { path: "exams/generate", element: <ExamGeneratePage /> },
      { path: "/admin/exams/:id/publish", element: <ExamPublishPage /> },
    ],
  },

  // -------------------------------------------------------------------------
  // 404
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
