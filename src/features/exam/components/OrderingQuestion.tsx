/**
 * MindMosaic — Ordering Question Component
 *
 * response_type: "ordering"
 * Students arrange items in the correct order using up/down buttons.
 * No drag interactions — keyboard-first, child-friendly.
 *
 * Data shape:
 *   prompt_blocks may contain { type: "ordering", instruction, items }
 *   validation: { correctOrder: [...] }
 *   response: { orderedItems: [...] }
 */

import { useCallback } from "react";
import type { OrderingResponseData } from "../types/exam.types";

interface OrderingQuestionProps {
  questionId: string;
  /** The initial shuffled items from the prompt block */
  items: string[];
  value: OrderingResponseData | undefined;
  onChange: (data: OrderingResponseData) => void;
  disabled?: boolean;
}

export function OrderingQuestion({
  questionId,
  items,
  value,
  onChange,
  disabled = false,
}: OrderingQuestionProps) {
  // Use the current ordering from response, or fall back to the initial items
  const currentOrder = value?.orderedItems ?? items;

  const moveItem = useCallback(
    (index: number, direction: -1 | 1) => {
      if (disabled) return;
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= currentOrder.length) return;

      const newOrder = [...currentOrder];
      [newOrder[index], newOrder[targetIndex]] = [
        newOrder[targetIndex],
        newOrder[index],
      ];
      onChange({ orderedItems: newOrder });
    },
    [currentOrder, disabled, onChange],
  );

  return (
    <div
      className="space-y-2"
      role="list"
      aria-labelledby={`question-${questionId}`}
      aria-describedby={`ordering-hint-${questionId}`}
    >
      <p
        id={`ordering-hint-${questionId}`}
        className="text-sm text-text-muted mb-3"
      >
        Arrange these items in the correct order. Use the arrows to move items
        up or down.
      </p>

      {currentOrder.map((item, index) => (
        <div
          key={`${item}-${index}`}
          role="listitem"
          className={`
            flex items-center gap-3 rounded-lg border-2 bg-white p-4
            transition-all
            ${disabled ? "opacity-60" : ""}
            ${value ? "border-primary-blue/30" : "border-border-subtle"}
          `}
        >
          {/* Position number */}
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-blue text-sm font-bold text-white">
            {index + 1}
          </span>

          {/* Item content */}
          <span className="flex-1 text-text-primary">{item}</span>

          {/* Move buttons */}
          <div className="flex flex-col gap-1">
            <button
              type="button"
              disabled={disabled || index === 0}
              onClick={() => moveItem(index, -1)}
              aria-label={`Move "${item}" up`}
              className={`
                rounded p-1.5 transition-colors touch-target focus-ring
                ${
                  disabled || index === 0
                    ? "text-gray-300 cursor-not-allowed"
                    : "text-text-muted hover:bg-background-soft hover:text-primary-blue"
                }
              `}
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 15l7-7 7 7"
                />
              </svg>
            </button>
            <button
              type="button"
              disabled={disabled || index === currentOrder.length - 1}
              onClick={() => moveItem(index, 1)}
              aria-label={`Move "${item}" down`}
              className={`
                rounded p-1.5 transition-colors touch-target focus-ring
                ${
                  disabled || index === currentOrder.length - 1
                    ? "text-gray-300 cursor-not-allowed"
                    : "text-text-muted hover:bg-background-soft hover:text-primary-blue"
                }
              `}
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
