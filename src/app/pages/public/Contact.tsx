/**
 * MindMosaic — Contact Page (Day 23)
 *
 * Static contact information. No forms, no backend calls.
 * Uses mailto link only.
 */

import { PublicFooter } from "./Home";

export function ContactPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-bold text-text-primary">Contact Us</h1>
        <p className="mt-3 text-text-muted">
          We'd love to hear from you. Whether you have a question, feedback, or
          need help with your account, reach out and we'll get back to you as
          soon as we can.
        </p>

        <div className="mt-10 space-y-8">
          <div className="rounded-lg border border-border-subtle bg-background-soft p-6">
            <h2 className="font-semibold text-text-primary">
              General Enquiries
            </h2>
            <p className="mt-2 text-sm text-text-muted">
              For questions about MindMosaic, partnerships, or anything else.
            </p>
            <a
              href="mailto:hello@mindmosaic.com.au"
              className="mt-3 inline-block text-sm font-medium text-primary-blue hover:underline"
            >
              hello@mindmosaic.com.au
            </a>
          </div>

          <div className="rounded-lg border border-border-subtle bg-background-soft p-6">
            <h2 className="font-semibold text-text-primary">
              Technical Support
            </h2>
            <p className="mt-2 text-sm text-text-muted">
              Having trouble logging in, accessing exams, or something isn't
              working as expected? Let us know.
            </p>
            <a
              href="mailto:support@mindmosaic.com.au"
              className="mt-3 inline-block text-sm font-medium text-primary-blue hover:underline"
            >
              support@mindmosaic.com.au
            </a>
          </div>

          <div className="rounded-lg border border-border-subtle bg-background-soft p-6">
            <h2 className="font-semibold text-text-primary">
              Privacy Concerns
            </h2>
            <p className="mt-2 text-sm text-text-muted">
              Questions about how we handle student data or privacy matters.
            </p>
            <a
              href="mailto:privacy@mindmosaic.com.au"
              className="mt-3 inline-block text-sm font-medium text-primary-blue hover:underline"
            >
              privacy@mindmosaic.com.au
            </a>
          </div>
        </div>

        <p className="mt-10 text-sm text-text-muted">
          We aim to respond to all enquiries within 2 business days.
        </p>
      </div>
      <PublicFooter />
    </div>
  );
}
