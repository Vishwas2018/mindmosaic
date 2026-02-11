/**
 * Day 19 Route Additions — Admin Question Bank & Exam Generation
 *
 * Add these routes to your existing router configuration under the admin layout.
 * All routes require admin role protection via RoleGuard.
 */

import { QuestionListPage } from "../pages/admin/questions/QuestionList";
import { QuestionEditorPage } from "../pages/admin/questions/QuestionEditor";
import { ExamGeneratePage } from "../pages/admin/exams/ExamGenerate";

// Add these to your admin routes section:

export const day19AdminRoutes = [
  {
    path: "/admin/questions",
    element: <QuestionListPage />,
  },
  {
    path: "/admin/questions/create",
    element: <QuestionEditorPage />,
  },
  {
    path: "/admin/questions/edit/:id",
    element: <QuestionEditorPage />,
  },
  {
    path: "/admin/exams/generate",
    element: <ExamGeneratePage />,
  },
];

// Example integration into existing router:
//
// <Route element={<AdminLayout />}>
//   <Route element={<RoleGuard allowed={["admin"]} />}>
//     {/* Existing admin routes */}
//     <Route path="/admin/dashboard" element={<AdminDashboard />} />
//     <Route path="/admin/exams" element={<ExamsList />} />
//
//     {/* Day 19: Question Bank & Generation */}
//     <Route path="/admin/questions" element={<QuestionListPage />} />
//     <Route path="/admin/questions/create" element={<QuestionEditorPage />} />
//     <Route path="/admin/questions/edit/:id" element={<QuestionEditorPage />} />
//     <Route path="/admin/exams/generate" element={<ExamGeneratePage />} />
//   </Route>
// </Route>
