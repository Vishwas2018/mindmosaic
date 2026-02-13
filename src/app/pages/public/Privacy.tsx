/**
 * MindMosaic — Privacy Policy Page (Day 23)
 *
 * Static legal page. No backend calls.
 */

import { PublicFooter } from "./Home";

export function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-bold text-text-primary">Privacy Policy</h1>
        <p className="mt-2 text-sm text-text-muted">
          Last updated: February 2026
        </p>

        <div className="mt-8 space-y-8 text-sm leading-relaxed text-text-muted">
          <section>
            <h2 className="text-lg font-semibold text-text-primary">
              1. Overview
            </h2>
            <p className="mt-2">
              MindMosaic ("we", "us", "our") is committed to protecting the
              privacy of students, parents, and educators who use our platform.
              This Privacy Policy explains what information we collect, how we
              use it, and how we protect it.
            </p>
            <p className="mt-2">
              MindMosaic is an Australian-based service and complies with the
              Australian Privacy Act 1988 and the Australian Privacy Principles
              (APPs).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text-primary">
              2. Information We Collect
            </h2>
            <p className="mt-2">
              We collect the minimum information necessary to provide our
              service:
            </p>
            <p className="mt-2">
              <span className="font-medium text-text-primary">
                Account information:
              </span>{" "}
              email address and password (hashed), display name, year level, and
              account role (student, parent, or admin).
            </p>
            <p className="mt-2">
              <span className="font-medium text-text-primary">
                Assessment data:
              </span>{" "}
              exam responses, scores, marking comments, and completion
              timestamps.
            </p>
            <p className="mt-2">
              <span className="font-medium text-text-primary">
                Technical data:
              </span>{" "}
              browser type, device type, and session information necessary for
              platform functionality. We do not use analytics trackers or
              third-party cookies.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text-primary">
              3. How We Use Information
            </h2>
            <p className="mt-2">We use collected information solely to:</p>
            <p className="mt-2">
              Provide the assessment platform service, including delivering
              exams, scoring responses, and generating progress reports.
              Authenticate users and enforce role-based access controls.
              Communicate service updates, password resets, and account-related
              notifications. Improve the platform based on aggregate, anonymised
              usage patterns.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text-primary">
              4. Data Sharing
            </h2>
            <p className="mt-2">
              We do not sell, rent, or share student data with third parties for
              marketing or advertising purposes. Data may be shared only with
              infrastructure providers (Supabase for hosting and database
              services) who are contractually obligated to protect it, or when
              required by Australian law.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text-primary">
              5. Parent Access
            </h2>
            <p className="mt-2">
              Parents linked to a student account can view exam titles, attempt
              status, final scores, and progress summaries. Parents cannot view
              individual question content, student responses, correct answers,
              or teacher marking comments. This boundary is enforced at the
              application and database levels.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text-primary">
              6. Data Security
            </h2>
            <p className="mt-2">
              All data is stored in secured databases with row-level security
              policies that enforce access controls at the database layer.
              Passwords are hashed using industry-standard algorithms. All
              communication between your browser and our servers is encrypted
              using TLS.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text-primary">
              7. Data Retention
            </h2>
            <p className="mt-2">
              We retain account and assessment data for as long as the account
              is active. Upon account deletion, all associated personal data and
              assessment records are permanently removed within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text-primary">
              8. Children's Privacy
            </h2>
            <p className="mt-2">
              MindMosaic is designed for use by children under the supervision
              of a parent or guardian. Student accounts are created by a parent
              or administrator. We do not knowingly collect data from children
              without parental consent.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text-primary">
              9. Your Rights
            </h2>
            <p className="mt-2">
              Under Australian privacy law, you have the right to access,
              correct, or delete your personal information. To exercise these
              rights or if you have any privacy-related questions, contact us at{" "}
              <a
                href="mailto:privacy@mindmosaic.com.au"
                className="text-primary-blue hover:underline"
              >
                privacy@mindmosaic.com.au
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text-primary">
              10. Changes to This Policy
            </h2>
            <p className="mt-2">
              We may update this Privacy Policy from time to time. Material
              changes will be communicated via email or an in-platform
              notification. Continued use of the platform after changes
              constitutes acceptance of the updated policy.
            </p>
          </section>
        </div>
      </div>
      <PublicFooter />
    </div>
  );
}
