/**
 * MindMosaic — Exam Timer Component (Day 25)
 *
 * Enhancements:
 * - ProgressRing visual indicator alongside countdown text
 * - Ring color changes by urgency (blue → amber → red)
 * - aria-live="assertive" for critical time warnings
 * - animate-pulse-soft replaces generic animate-pulse for critical state
 *
 * All timer logic, ref guards, and calculations are IDENTICAL to Day 22.
 * Only visual presentation changed.
 */

import { useState, useEffect, useMemo, useRef } from "react";
import { ProgressRing } from "../../../components/ui/ProgressRing";

interface ExamTimerProps {
  startedAt: Date;
  durationMinutes: number;
  showWarnings?: boolean;
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
  durationMinutes: number,
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

  return { hours, minutes, seconds, totalSeconds, isExpired: false };
}

export function ExamTimer({
  startedAt,
  durationMinutes,
  showWarnings = true,
  onTimeExpired,
}: ExamTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>(() =>
    calculateTimeRemaining(startedAt, durationMinutes),
  );

  // BUG-7 FIX: Ref guard (unchanged from Day 22)
  const hasExpiredRef = useRef(false);

  useEffect(() => {
    hasExpiredRef.current = false;
  }, [startedAt, durationMinutes]);

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = calculateTimeRemaining(startedAt, durationMinutes);
      setTimeRemaining(remaining);

      if (remaining.isExpired && !hasExpiredRef.current) {
        hasExpiredRef.current = true;
        clearInterval(interval);
        onTimeExpired?.();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [startedAt, durationMinutes, onTimeExpired]);

  // Warning level (unchanged logic)
  const warningLevel = useMemo(() => {
    if (!showWarnings) return "normal";

    const { totalSeconds, isExpired } = timeRemaining;
    const totalDurationSeconds = durationMinutes * 60;

    if (isExpired) return "expired";
    if (totalSeconds <= 60) return "critical";
    if (totalSeconds <= 300) return "warning";
    if (totalSeconds <= totalDurationSeconds * 0.1) return "warning";

    return "normal";
  }, [timeRemaining, durationMinutes, showWarnings]);

  // Formatted time (unchanged)
  const formattedTime = useMemo(() => {
    const { hours, minutes, seconds, isExpired } = timeRemaining;
    if (isExpired) return "00:00";
    const pad = (n: number) => String(n).padStart(2, "0");
    if (hours > 0) return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    return `${pad(minutes)}:${pad(seconds)}`;
  }, [timeRemaining]);

  // Ring and text styling by urgency
  const totalDurationSeconds = durationMinutes * 60;
  const elapsed = totalDurationSeconds - timeRemaining.totalSeconds;
  const ringColor: "primary-blue" | "accent-amber" | "danger-red" =
    warningLevel === "critical" || warningLevel === "expired"
      ? "danger-red"
      : warningLevel === "warning"
        ? "accent-amber"
        : "primary-blue";

  const textColorClass =
    warningLevel === "critical" || warningLevel === "expired"
      ? "text-danger-red"
      : warningLevel === "warning"
        ? "text-accent-amber"
        : "text-text-primary";

  const containerClass =
    warningLevel === "critical"
      ? "bg-danger-red/10 border-danger-red animate-pulse-soft"
      : warningLevel === "expired"
        ? "bg-danger-red/10 border-danger-red"
        : warningLevel === "warning"
          ? "bg-accent-amber/10 border-accent-amber"
          : "bg-background-soft border-border-subtle";

  // Use assertive for critical, polite otherwise
  const ariaLive = warningLevel === "critical" ? "assertive" : "polite";

  return (
    <div
      className={`inline-flex items-center gap-3 rounded-xl border px-4 py-2.5 ${containerClass}`}
      role="timer"
      aria-live={ariaLive as "polite" | "assertive"}
      aria-label={`Time remaining: ${formattedTime}`}
    >
      <ProgressRing
        value={Math.min(elapsed, totalDurationSeconds)}
        max={totalDurationSeconds}
        size="sm"
        color={ringColor}
        aria-label={`Timer progress`}
      />
      <span className={`font-mono text-lg font-semibold ${textColorClass}`}>
        {formattedTime}
      </span>
      {timeRemaining.isExpired && (
        <span className="text-sm font-medium text-danger-red">Time's up!</span>
      )}
    </div>
  );
}

// =============================================================================
// Compact Timer (for header) — unchanged from Day 22
// =============================================================================

interface CompactTimerProps {
  startedAt: Date;
  durationMinutes: number;
}

export function CompactTimer({
  startedAt,
  durationMinutes,
}: CompactTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>(() =>
    calculateTimeRemaining(startedAt, durationMinutes),
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining(startedAt, durationMinutes));
    }, 1000);

    return () => clearInterval(interval);
  }, [startedAt, durationMinutes]);

  const { hours, minutes, seconds, isExpired, totalSeconds } = timeRemaining;
  const pad = (n: number) => String(n).padStart(2, "0");

  const isWarning = totalSeconds <= 300;
  const isCritical = totalSeconds <= 60;

  const timeString =
    hours > 0
      ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
      : `${pad(minutes)}:${pad(seconds)}`;

  return (
    <span
      className={`font-mono font-medium ${
        isExpired || isCritical
          ? "text-danger-red animate-pulse-soft"
          : isWarning
            ? "text-accent-amber"
            : "text-text-primary"
      }`}
      aria-label={`Time remaining: ${timeString}`}
    >
      {timeString}
    </span>
  );
}
