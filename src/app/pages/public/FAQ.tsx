/**
 * MindMosaic — FAQ Page (Day 23)
 *
 * Static FAQ content. No backend calls.
 */

import { useState } from "react";
import { PublicFooter } from "./Home";

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: "What is MindMosaic?",
    answer:
      "MindMosaic is an online assessment platform that helps Australian students in Years 1–9 prepare for NAPLAN and ICAS standardised tests through realistic practice exams.",
  },
  {
    question: "What types of questions are supported?",
    answer:
      "MindMosaic supports multiple choice, multi-select, short answer, numeric, and extended response question types — matching the formats used in real NAPLAN and ICAS exams.",
  },
  {
    question: "How is scoring handled?",
    answer:
      "Objective questions (multiple choice, numeric, short answer) are auto-scored instantly after submission. Extended response questions are marked by teachers using rubric-based guidelines.",
  },
  {
    question: "Can parents see their child's results?",
    answer:
      "Yes. Parents have read-only access to their child's exam scores, attempt history, and progress summaries. Parents cannot see individual question responses, correct answers, or teacher comments.",
  },
  {
    question: "Is my child's data safe?",
    answer:
      "We take privacy seriously. All data is stored securely with row-level access controls. We collect only the minimum information needed and never sell or share student data with third parties. See our Privacy Policy for full details.",
  },
  {
    question: "Can I cancel my subscription?",
    answer:
      "Yes. You can cancel anytime from your account settings. There are no lock-in contracts. After cancellation, your account will revert to the free tier at the end of the billing period.",
  },
  {
    question: "What year levels are covered?",
    answer:
      "MindMosaic currently covers Years 1 through 9, with content aligned to the Australian Curriculum. Exams are available across multiple subjects including literacy, numeracy, science, and reasoning.",
  },
  {
    question: "How do I reset my password?",
    answer:
      "Click 'Forgot Password' on the login page and enter your email address. You'll receive a password reset link within a few minutes. If you don't see it, check your spam folder.",
  },
];

export function FAQPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-bold text-text-primary">
          Frequently Asked Questions
        </h1>
        <p className="mt-3 text-text-muted">
          Common questions about MindMosaic. Can't find what you're looking for?{" "}
          <a href="/contact" className="text-primary-blue hover:underline">
            Contact us
          </a>
          .
        </p>

        <div className="mt-10 divide-y divide-border-subtle">
          {faqs.map((faq, index) => (
            <FAQAccordion key={index} item={faq} />
          ))}
        </div>
      </div>
      <PublicFooter />
    </div>
  );
}

function FAQAccordion({ item }: { item: FAQItem }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="py-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between text-left"
        aria-expanded={isOpen}
      >
        <span className="font-medium text-text-primary">{item.question}</span>
        <span className="ml-4 flex-shrink-0 text-text-muted" aria-hidden="true">
          {isOpen ? "−" : "+"}
        </span>
      </button>
      {isOpen && (
        <p className="mt-3 text-sm leading-relaxed text-text-muted">
          {item.answer}
        </p>
      )}
    </div>
  );
}
