/**
 * MindMosaic — Numeric Question Component
 *
 * Number input for numeric answers.
 * Supports decimal values and optional unit display.
 */

import { useId, useState } from "react";
import type { NumericResponseData } from "../types/exam.types";

interface NumericQuestionProps {
  questionId: string;
  value: NumericResponseData | undefined;
  onChange: (data: NumericResponseData) => void;
  disabled?: boolean;
  /** Placeholder text. Default: "Enter a number" */
  placeholder?: string;
  /** Unit to display (e.g., "cm", "kg"). Optional */
  unit?: string;
  /** Minimum value. Optional */
  min?: number;
  /** Maximum value. Optional */
  max?: number;
  /** Step value for increment/decrement. Default: "any" */
  step?: number | "any";
}

export function NumericQuestion({
  value,
  onChange,
  disabled = false,
  placeholder = "Enter a number",
  unit,
  min,
  max,
  step = "any",
}: NumericQuestionProps) {
  const inputId = useId();

  // Track raw input value for better UX with decimals and negative numbers
  const [inputValue, setInputValue] = useState<string>(
    value?.answer !== undefined ? String(value.answer) : ""
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;

    const rawValue = e.target.value;
    setInputValue(rawValue);

    // Parse the value
    const numValue = parseFloat(rawValue);

    if (!isNaN(numValue)) {
      onChange({ answer: numValue });
    }
  };

  const handleBlur = () => {
    // On blur, format the display value to match the actual value
    if (value?.answer !== undefined) {
      setInputValue(String(value.answer));
    }
  };

  return (
    <div className="space-y-2">
      <label htmlFor={inputId} className="sr-only">
        Your numeric answer
      </label>

      <div className="relative">
        <input
          id={inputId}
          type="number"
          value={inputValue}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={disabled}
          placeholder={placeholder}
          min={min}
          max={max}
          step={step}
          className={`
            w-full px-4 py-3 rounded-lg border-2 text-text-primary
            transition-colors
            focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-offset-2
            placeholder:text-text-muted
            ${disabled ? "bg-gray-50 cursor-not-allowed" : "bg-white"}
            ${inputValue ? "border-primary-blue" : "border-border-subtle"}
            ${unit ? "pr-16" : ""}
            [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none
          `}
        />

        {unit && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted font-medium">
            {unit}
          </span>
        )}
      </div>

      <p className="text-xs text-text-muted">
        Enter a numeric value
        {min !== undefined && max !== undefined && ` between ${min} and ${max}`}
        {min !== undefined && max === undefined && ` (minimum: ${min})`}
        {max !== undefined && min === undefined && ` (maximum: ${max})`}
      </p>
    </div>
  );
}
