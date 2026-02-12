/**
 * useParentProgress — Calculate progress summary
 *
 * Aggregates exam results into overall progress metrics.
 */

import { useMemo } from "react";
import type {
  ParentExamSummary,
  ProgressSummary,
  SubjectSummary,
} from "../types/parent-dashboard.types";

export function useParentProgress(exams: ParentExamSummary[]): ProgressSummary {
  return useMemo(() => {
    const total = exams.length;
    const completed = exams.filter((e) => e.status === "submitted").length;
    const inProgress = exams.filter((e) => e.status === "in_progress").length;
    const notStarted = exams.filter((e) => e.status === "not_started").length;

    // Calculate average percentage (marked exams only)
    const markedExams = exams.filter(
      (e) => e.is_marked && e.percentage !== null,
    );
    const averagePercentage =
      markedExams.length > 0
        ? Math.round(
            markedExams.reduce((sum, e) => sum + (e.percentage || 0), 0) /
              markedExams.length,
          )
        : null;

    // Group by subject
    const subjectMap = new Map<string, ParentExamSummary[]>();
    exams.forEach((exam) => {
      const existing = subjectMap.get(exam.subject) || [];
      subjectMap.set(exam.subject, [...existing, exam]);
    });

    const examsBySubject: SubjectSummary[] = Array.from(
      subjectMap.entries(),
    ).map(([subject, subjectExams]) => {
      const markedInSubject = subjectExams.filter(
        (e) => e.is_marked && e.percentage !== null,
      );

      const avgPct =
        markedInSubject.length > 0
          ? Math.round(
              markedInSubject.reduce((sum, e) => sum + (e.percentage || 0), 0) /
                markedInSubject.length,
            )
          : null;

      const scores = markedInSubject
        .map((e) => e.percentage || 0)
        .filter((p) => p > 0);

      return {
        subject,
        exam_count: subjectExams.length,
        average_percentage: avgPct,
        highest_score: scores.length > 0 ? Math.max(...scores) : null,
        lowest_score: scores.length > 0 ? Math.min(...scores) : null,
      };
    });

    // Sort by subject name
    examsBySubject.sort((a, b) => a.subject.localeCompare(b.subject));

    return {
      total_exams: total,
      completed_exams: completed,
      in_progress: inProgress,
      not_started: notStarted,
      average_percentage: averagePercentage,
      exams_by_subject: examsBySubject,
    };
  }, [exams]);
}
