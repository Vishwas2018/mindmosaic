/**
 * MindMosaic — Exam Timer Component
 *
 * Displays countdown timer for exam attempts.
 * Mandatory for Years 3–9.
 *
 * Timer is derived from:
 * - Attempt start time
 * - Exam duration (minutes)
 *
 * No auto-submit (handled server-side).
 */

import { useState, useEffect, useMemo } from "react";

interface ExamTimerProps {
  /** When the attempt started */
  startedAt: Date;
  /** Exam duration in minutes */
  durationMinutes: number;
  /** Whether to show warning colors when time is low */
  showWarnings?: boolean;
  /** Callback when time expires (informational only) */
  onTimeExpired?: () => void;
}

interface TimeRemaining {
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
  isExpired: boolean;
}

function calculateTimeRemaining(
  startedAt: Date,
  durationMinutes: number
): TimeRemaining {
  const now = new Date();
  const endTime = new Date(startedAt.getTime() + durationMinutes * 60 * 1000);
  const diffMs = endTime.getTime() - now.getTime();

  if (diffMs <= 0) {
    return {
      hours: 0,
      minutes: 0,
      seconds: 0,
      totalSeconds: 0,
      isExpired: true,
    };
  }

  const totalSeconds = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return {
    hours,
    minutes,
    seconds,
    totalSeconds,
    isExpired: false,
  };
}

export function ExamTimer({
  startedAt,
  durationMinutes,
  showWarnings = true,
  onTimeExpired,
}: ExamTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>(() =>
    calculateTimeRemaining(startedAt, durationMinutes)
  );

  // Update timer every second
  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = calculateTimeRemaining(startedAt, durationMinutes);
      setTimeRemaining(remaining);

      if (remaining.isExpired) {
        clearInterval(interval);
        onTimeExpired?.();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [startedAt, durationMinutes, onTimeExpired]);

  // Determine warning level
  const warningLevel = useMemo(() => {
    if (!showWarnings) return "normal";

    const { totalSeconds, isExpired } = timeRemaining;
    const totalDurationSeconds = durationMinutes * 60;

    if (isExpired) return "expired";
    if (totalSeconds <= 60) return "critical"; // 1 minute
    if (totalSeconds <= 300) return "warning"; // 5 minutes
    if (totalSeconds <= totalDurationSeconds * 0.1) return "warning"; // 10% remaining

    return "normal";
  }, [timeRemaining, durationMinutes, showWarnings]);

  // Format time display
  const formattedTime = useMemo(() => {
    const { hours, minutes, seconds, isExpired } = timeRemaining;

    if (isExpired) return "00:00";

    const pad = (n: number) => String(n).padStart(2, "0");

    if (hours > 0) {
      return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }

    return `${pad(minutes)}:${pad(seconds)}`;
  }, [timeRemaining]);

  // Get styles based on warning level
  const getStyles = () => {
    switch (warningLevel) {
      case "expired":
        return {
          container: "bg-danger-red/10 border-danger-red",
          text: "text-danger-red",
          icon: "⏰",
        };
      case "critical":
        return {
          container: "bg-danger-red/10 border-danger-red animate-pulse",
          text: "text-danger-red",
          icon: "⚠️",
        };
      case "warning":
        return {
          container: "bg-accent-amber/10 border-accent-amber",
          text: "text-accent-amber",
          icon: "⏱️",
        };
      default:
        return {
          container: "bg-background-soft border-border-subtle",
          text: "text-text-primary",
          icon: "⏱️",
        };
    }
  };

  const styles = getStyles();

  return (
    <div
      className={`
        inline-flex items-center gap-2 px-4 py-2 rounded-lg border
        ${styles.container}
      `}
      role="timer"
      aria-live="polite"
      aria-label={`Time remaining: ${formattedTime}`}
    >
      <span className="text-lg" aria-hidden="true">
        {styles.icon}
      </span>
      <span className={`font-mono text-lg font-semibold ${styles.text}`}>
        {formattedTime}
      </span>
      {timeRemaining.isExpired && (
        <span className="text-sm text-danger-red font-medium">
          Time's up!
        </span>
      )}
    </div>
  );
}

// =============================================================================
// Compact Timer (for header)
// =============================================================================

interface CompactTimerProps {
  startedAt: Date;
  durationMinutes: number;
}

export function CompactTimer({ startedAt, durationMinutes }: CompactTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>(() =>
    calculateTimeRemaining(startedAt, durationMinutes)
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining(startedAt, durationMinutes));
    }, 1000);

    return () => clearInterval(interval);
  }, [startedAt, durationMinutes]);

  const { hours, minutes, seconds, isExpired, totalSeconds } = timeRemaining;
  const pad = (n: number) => String(n).padStart(2, "0");

  // Warning when less than 5 minutes
  const isWarning = totalSeconds <= 300;
  const isCritical = totalSeconds <= 60;

  const timeString =
    hours > 0
      ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
      : `${pad(minutes)}:${pad(seconds)}`;

  return (
    <span
      className={`
        font-mono font-medium
        ${isExpired ? "text-danger-red" : ""}
        ${isCritical ? "text-danger-red animate-pulse" : ""}
        ${isWarning && !isCritical ? "text-accent-amber" : ""}
        ${!isWarning && !isCritical && !isExpired ? "text-text-primary" : ""}
      `}
      aria-label={`Time remaining: ${timeString}`}
    >
      {timeString}
    </span>
  );
}
