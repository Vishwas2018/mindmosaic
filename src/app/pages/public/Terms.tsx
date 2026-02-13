/**
 * MindMosaic — Terms of Service Page (Day 23)
 *
 * Static legal page. No backend calls.
 */

import { PublicFooter } from "./Home";

export function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-bold text-text-primary">
          Terms of Service
        </h1>
        <p className="mt-2 text-sm text-text-muted">
          Last updated: February 2026
        </p>

        <div className="mt-8 space-y-8 text-sm leading-relaxed text-text-muted">
          <section>
            <h2 className="text-lg font-semibold text-text-primary">
              1. Acceptance of Terms
            </h2>
            <p className="mt-2">
              By accessing or using MindMosaic ("the Service"), you agree to be
              bound by these Terms of Service. If you are creating an account on
              behalf of a minor, you represent that you are the child's parent
              or legal guardian and accept these terms on their behalf.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text-primary">
              2. Service Description
            </h2>
            <p className="mt-2">
              MindMosaic is an educational assessment platform that provides
              practice exams for Australian students in Years 1–9. The Service
              includes exam delivery, automated scoring, teacher marking,
              progress tracking, and parent visibility features.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text-primary">
              3. Accounts and Roles
            </h2>
            <p className="mt-2">
              The Service offers three account types: Student, Parent, and
              Administrator. Each role has specific access permissions enforced
              at the application and database levels. You are responsible for
              maintaining the confidentiality of your account credentials and
              for all activity under your account.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text-primary">
              4. Acceptable Use
            </h2>
            <p className="mt-2">
              You agree to use the Service only for its intended educational
              purpose. You must not: attempt to access another user's account or
              data; interfere with or disrupt the Service; reverse-engineer,
              decompile, or extract source code; use automated tools to scrape
              content; or redistribute exam content without written permission.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text-primary">
              5. Intellectual Property
            </h2>
            <p className="mt-2">
              All exam content, platform code, and associated materials are the
              intellectual property of MindMosaic or its licensors. Students
              retain ownership of their own written responses. By submitting
              responses through the platform, you grant MindMosaic a limited
              licence to store, process, and display those responses for the
              purpose of providing the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text-primary">
              6. Subscriptions and Payment
            </h2>
            <p className="mt-2">
              Some features require a paid subscription. Pricing is displayed on
              our Pricing page in Australian Dollars. Subscriptions renew
              automatically unless cancelled before the renewal date. Refunds
              are handled on a case-by-case basis; contact{" "}
              <a
                href="mailto:support@mindmosaic.com.au"
                className="text-primary-blue hover:underline"
              >
                support@mindmosaic.com.au
              </a>{" "}
              for assistance.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text-primary">
              7. Availability and Warranties
            </h2>
            <p className="mt-2">
              The Service is provided "as is" without warranties of any kind. We
              aim for high availability but do not guarantee uninterrupted
              access. We may perform maintenance with reasonable notice. We are
              not liable for data loss resulting from circumstances beyond our
              reasonable control.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text-primary">
              8. Limitation of Liability
            </h2>
            <p className="mt-2">
              To the maximum extent permitted by Australian law, MindMosaic's
              total liability for any claim arising from use of the Service is
              limited to the amount you paid for the Service in the 12 months
              preceding the claim. We are not liable for indirect, incidental,
              or consequential damages.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text-primary">
              9. Termination
            </h2>
            <p className="mt-2">
              You may close your account at any time. We reserve the right to
              suspend or terminate accounts that violate these terms. Upon
              termination, your data will be handled in accordance with our
              Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text-primary">
              10. Governing Law
            </h2>
            <p className="mt-2">
              These terms are governed by the laws of the State of Victoria,
              Australia. Any disputes will be resolved in the courts of
              Victoria.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text-primary">
              11. Changes to These Terms
            </h2>
            <p className="mt-2">
              We may update these Terms from time to time. Material changes will
              be communicated via email or in-platform notification at least 14
              days before taking effect. Continued use of the Service after
              changes constitutes acceptance of the updated terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text-primary">
              12. Contact
            </h2>
            <p className="mt-2">
              For questions about these Terms, contact us at{" "}
              <a
                href="mailto:hello@mindmosaic.com.au"
                className="text-primary-blue hover:underline"
              >
                hello@mindmosaic.com.au
              </a>
              .
            </p>
          </section>
        </div>
      </div>
      <PublicFooter />
    </div>
  );
}
