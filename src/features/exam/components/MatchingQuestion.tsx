/**
 * MindMosaic — Matching Question Component
 *
 * response_type: "matching"
 * Students match left items to right items using dropdown selects.
 * No drag interactions — keyboard-first, child-friendly.
 *
 * Data shape:
 *   prompt_blocks may contain { type: "matching", pairs: [{ left, right }] }
 *   validation: { correctPairs: { "France": "Paris", ... } }
 *   response: { pairs: { "France": "Paris", ... } }
 */

import { useMemo } from "react";
import type { MatchingResponseData } from "../types/exam.types";

interface MatchingQuestionProps {
  questionId: string;
  /** Left-side items (keys) */
  leftItems: string[];
  /** Right-side items (values, shuffled) */
  rightItems: string[];
  value: MatchingResponseData | undefined;
  onChange: (data: MatchingResponseData) => void;
  disabled?: boolean;
}

export function MatchingQuestion({
  questionId,
  leftItems,
  rightItems,
  value,
  onChange,
  disabled = false,
}: MatchingQuestionProps) {
  const currentPairs = value?.pairs ?? {};

  // Shuffle right items once for display (stable via useMemo)
  const shuffledRight = useMemo(() => {
    return [...rightItems].sort(() => 0.5 - Math.random());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rightItems.join(",")]);

  const handlePairChange = (leftItem: string, rightItem: string) => {
    if (disabled) return;
    const newPairs = { ...currentPairs };
    if (rightItem === "") {
      delete newPairs[leftItem];
    } else {
      newPairs[leftItem] = rightItem;
    }
    onChange({ pairs: newPairs });
  };

  // Track which right items are already used
  const usedRightItems = new Set(Object.values(currentPairs));

  return (
    <div
      className="space-y-4"
      role="group"
      aria-labelledby={`question-${questionId}`}
      aria-describedby={`matching-hint-${questionId}`}
    >
      <p
        id={`matching-hint-${questionId}`}
        className="text-sm text-text-muted mb-2"
      >
        Match each item on the left with the correct item on the right.
      </p>

      <div className="space-y-3">
        {leftItems.map((leftItem) => {
          const selectedRight = currentPairs[leftItem] ?? "";

          return (
            <div
              key={leftItem}
              className={`
                flex items-center gap-4 rounded-lg border-2 bg-white p-4
                transition-all
                ${disabled ? "opacity-60" : ""}
                ${selectedRight ? "border-primary-blue/30" : "border-border-subtle"}
              `}
            >
              {/* Left item */}
              <span className="flex-1 font-medium text-text-primary">
                {leftItem}
              </span>

              {/* Arrow */}
              <span className="text-text-muted shrink-0" aria-hidden="true">
                →
              </span>

              {/* Right item dropdown */}
              <select
                value={selectedRight}
                onChange={(e) => handlePairChange(leftItem, e.target.value)}
                disabled={disabled}
                aria-label={`Match for ${leftItem}`}
                className={`
                  flex-1 rounded-lg border-2 px-3 py-2.5 text-text-primary
                  transition-colors focus-ring
                  ${disabled ? "bg-gray-50 cursor-not-allowed" : "bg-white cursor-pointer"}
                  ${selectedRight ? "border-primary-blue" : "border-border-subtle"}
                `}
              >
                <option value="">Select a match…</option>
                {shuffledRight.map((rightItem) => {
                  // Show option if: it's the currently selected one, or it's not used elsewhere
                  const isCurrentSelection = rightItem === selectedRight;
                  const isUsedElsewhere =
                    usedRightItems.has(rightItem) && !isCurrentSelection;

                  return (
                    <option
                      key={rightItem}
                      value={rightItem}
                      disabled={isUsedElsewhere}
                    >
                      {rightItem}
                      {isUsedElsewhere ? " (used)" : ""}
                    </option>
                  );
                })}
              </select>
            </div>
          );
        })}
      </div>

      {/* Progress indicator */}
      <p className="text-xs text-text-muted text-right">
        {Object.keys(currentPairs).length} of {leftItems.length} matched
      </p>
    </div>
  );
}
