/**
 * MindMosaic — About Page (Day 23)
 *
 * Static informational page about the platform.
 */

import { PublicFooter } from "./Home";

export function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-bold text-text-primary">
          About MindMosaic
        </h1>

        <div className="mt-8 space-y-6 text-text-muted leading-relaxed">
          <p>
            MindMosaic is an educational assessment platform built for
            Australian primary and secondary students in Years 1–9. We help
            students prepare for NAPLAN and ICAS standardised tests with
            realistic, timed practice exams.
          </p>
          <p>
            Our platform supports multiple question types including multiple
            choice, multi-select, short answer, numeric, and extended response.
            Objective questions are auto-scored instantly, while extended
            responses receive teacher-guided marking with rubric-based feedback.
          </p>

          <h2 className="pt-4 text-xl font-semibold text-text-primary">
            Built for families
          </h2>
          <p>
            MindMosaic is designed with families in mind. Students have a
            focused, distraction-free exam experience. Parents get read-only
            access to their child's results and progress, helping them support
            learning without adding pressure.
          </p>

          <h2 className="pt-4 text-xl font-semibold text-text-primary">
            Privacy first
          </h2>
          <p>
            We take student privacy seriously. MindMosaic collects only the
            minimum information needed to provide the service. We never sell
            student data, and parents can only see aggregate scores — never
            individual question responses or teacher comments.
          </p>
          <p>
            For full details, see our{" "}
            <a href="/privacy" className="text-primary-blue hover:underline">
              Privacy Policy
            </a>{" "}
            and{" "}
            <a href="/terms" className="text-primary-blue hover:underline">
              Terms of Service
            </a>
            .
          </p>

          <h2 className="pt-4 text-xl font-semibold text-text-primary">
            Australian-made
          </h2>
          <p>
            MindMosaic is developed in Australia and aligned with the Australian
            Curriculum. All exam content is created or reviewed by qualified
            Australian educators.
          </p>
        </div>
      </div>
      <PublicFooter />
    </div>
  );
}
