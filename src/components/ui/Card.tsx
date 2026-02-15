/**
 * MindMosaic — Card Component
 *
 * Reusable card primitive with consistent styling.
 * Uses existing Tailwind v4 theme tokens.
 *
 * Variants:
 *   default  — static card with subtle border and shadow
 *   interactive — hover shadow lift effect
 *   highlighted — primary-blue left border accent
 *
 * This complements (does NOT replace) src/shared/ui/Card.
 * Use this for new student-facing cards where consistent
 * rounded-2xl + shadow-sm + p-8 is desired.
 */

import type { ReactNode } from "react";

type CardVariant = "default" | "interactive" | "highlighted";
type CardPadding = "compact" | "normal" | "spacious";

interface CardProps {
  children: ReactNode;
  variant?: CardVariant;
  padding?: CardPadding;
  className?: string;
  as?: "div" | "article" | "section";
}

const VARIANT_CLASSES: Record<CardVariant, string> = {
  default: "rounded-2xl border border-border-subtle bg-white shadow-sm",
  interactive:
    "rounded-2xl border border-border-subtle bg-white shadow-sm hover:shadow-md transition-shadow",
  highlighted:
    "rounded-2xl border border-border-subtle bg-white shadow-sm border-l-4 border-l-primary-blue",
};

const PADDING_CLASSES: Record<CardPadding, string> = {
  compact: "p-4 sm:p-6",
  normal: "p-6 sm:p-8",
  spacious: "p-8 sm:p-10",
};

export function Card({
  children,
  variant = "default",
  padding = "normal",
  className = "",
  as: Tag = "div",
}: CardProps) {
  return (
    <Tag
      className={`${VARIANT_CLASSES[variant]} ${PADDING_CLASSES[padding]} ${className}`}
    >
      {children}
    </Tag>
  );
}
