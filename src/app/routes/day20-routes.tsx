/**
 * Day 20 Routes — Exam Publishing & Scheduling
 *
 * Add to your router configuration:
 *
 * <Route element={<AdminLayout />}>
 *   <Route element={<RoleGuard allowed={["admin"]} />}>
 *     <Route path="/admin/exams/:id/publish" element={<ExamPublishPage />} />
 *   </Route>
 * </Route>
 */

import { Route } from "react-router-dom";
import { ExamPublishPage } from "../pages/admin/exams/ExamPublish";

export const day20Routes = (
  <>
    <Route path="/admin/exams/:id/publish" element={<ExamPublishPage />} />
  </>
);
