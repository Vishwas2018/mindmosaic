import { createBrowserRouter } from "react-router-dom";

/* =========================
   Layouts
========================= */
import { PublicLayout } from "./layouts/PublicLayout";
import { AuthLayout } from "./layouts/AuthLayout";
import { StudentLayout } from "./layouts/StudentLayout";
import { ParentLayout } from "./layouts/ParentLayout";
import { AdminLayout } from "./layouts/AdminLayout";

/* =========================
   Guards
========================= */
import { AuthGuard } from "@/guards/AuthGuard";
import { RoleGuard } from "@/guards/RoleGuard";

/* =========================
   System Pages
========================= */
import { ErrorPage, NotFoundPage } from "./pages/system";

/* =========================
   Public Pages (Day 23)
========================= */
import {
  HomePage,
  PricingPage,
  AboutPage,
  FAQPage,
  ContactPage,
  PrivacyPage,
  TermsPage,
} from "./pages/public";

/* =========================
   Auth Pages
========================= */
import {
  LoginPage,
  SignupPage,
  ForgotPasswordPage,
  ResetPasswordPage,
  VerifyEmailPage,
  AuthCallbackPage,
} from "./pages/auth";

/* =========================
   Student Pages
========================= */
import {
  StudentDashboard,
  ExamListPage,
  ExamDetailPage,
  ExamAttemptPage,
  ExamReviewPage,
} from "./pages/student";

/* =========================
   Parent Pages
========================= */
import {
  ParentDashboard,
  ParentExamResults,
  ParentProgressOverview,
} from "./pages/parent";

/* =========================
   Admin Pages
========================= */
import { AdminDashboard } from "./pages/admin/Dashboard";
import { ExamGeneratePage } from "./pages/admin/exams/ExamGenerate";
import { ExamPublishPage } from "./pages/admin/exams/ExamPublish";
import { QuestionListPage } from "./pages/admin/questions/QuestionList";
import { QuestionEditorPage } from "./pages/admin/questions/QuestionEditor";
import { MarkingQueuePage } from "./pages/admin/reporting/MarkingQueue";
import { AttemptMarkingPage } from "./pages/admin/reporting/AttemptMarking";

/* =========================
   Router
========================= */
export const router = createBrowserRouter([
  /* ---------- Public ---------- */
  {
    path: "/",
    element: <PublicLayout />,
    errorElement: <ErrorPage />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "pricing", element: <PricingPage /> },
      { path: "about", element: <AboutPage /> },
      { path: "faq", element: <FAQPage /> },
      { path: "contact", element: <ContactPage /> },
      { path: "privacy", element: <PrivacyPage /> },
      { path: "terms", element: <TermsPage /> },
    ],
  },

  /* ---------- Auth ---------- */
  {
    path: "/auth",
    element: <AuthLayout />,
    errorElement: <ErrorPage />,
    children: [
      { path: "login", element: <LoginPage /> },
      { path: "signup", element: <SignupPage /> },
      { path: "forgot-password", element: <ForgotPasswordPage /> },
      { path: "reset-password", element: <ResetPasswordPage /> },
      { path: "verify-email", element: <VerifyEmailPage /> },
      { path: "callback", element: <AuthCallbackPage /> },
    ],
  },

  /* ---------- Student ---------- */
  {
    path: "/student",
    errorElement: <ErrorPage />,
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
      { path: "exams/:examId", element: <ExamDetailPage /> },
      { path: "attempt/:attemptId", element: <ExamAttemptPage /> },
      { path: "review/:attemptId", element: <ExamReviewPage /> },
    ],
  },

  /* ---------- Parent ---------- */
  {
    path: "/parent",
    errorElement: <ErrorPage />,
    element: (
      <AuthGuard>
        <RoleGuard allowed={["parent"]}>
          <ParentLayout />
        </RoleGuard>
      </AuthGuard>
    ),
    children: [
      { index: true, element: <ParentDashboard /> },
      { path: "results/:attemptId", element: <ParentExamResults /> },
      { path: "progress", element: <ParentProgressOverview /> },
    ],
  },

  /* ---------- Admin ---------- */
  {
    path: "/admin",
    errorElement: <ErrorPage />,
    element: (
      <AuthGuard>
        <RoleGuard allowed={["admin"]}>
          <AdminLayout />
        </RoleGuard>
      </AuthGuard>
    ),
    children: [
      { index: true, element: <AdminDashboard /> },
      { path: "exams/generate", element: <ExamGeneratePage /> },
      { path: "exams/publish", element: <ExamPublishPage /> },
      { path: "questions", element: <QuestionListPage /> },
      { path: "questions/:id", element: <QuestionEditorPage /> },
      { path: "marking", element: <MarkingQueuePage /> },
      { path: "marking/:attemptId", element: <AttemptMarkingPage /> },
    ],
  },

  /* ---------- Fallback ---------- */
  {
    path: "*",
    element: <NotFoundPage />,
  },
]);
