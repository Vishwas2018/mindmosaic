/**
 * Day 21 Routes — Parent Dashboard (Read-Only)
 *
 * Add to your router configuration:
 *
 * <Route element={<ParentLayout />}>
 *   <Route element={<RoleGuard allowed={["parent"]} />}>
 *     <Route path="/parent/dashboard" element={<ParentDashboard />} />
 *     <Route path="/parent/exams/:attemptId" element={<ParentExamResults />} />
 *     <Route path="/parent/progress" element={<ParentProgressOverview />} />
 *   </Route>
 * </Route>
 */

import { Route } from "react-router-dom";
import { ParentDashboard } from "../pages/parent/Dashboard";
import { ParentExamResults } from "../pages/parent/ExamResults";
import { ParentProgressOverview } from "../pages/parent/ProgressOverview";

export const day21Routes = (
  <>
    <Route path="/parent/dashboard" element={<ParentDashboard />} />
    <Route path="/parent/exams/:attemptId" element={<ParentExamResults />} />
    <Route path="/parent/progress" element={<ParentProgressOverview />} />
  </>
);
