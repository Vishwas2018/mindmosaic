/**
 * MindMosaic — ProgressRing Component
 *
 * Circular progress indicator using SVG.
 * Uses theme tokens for colors.
 *
 * Usage:
 *   <ProgressRing value={75} max={100} />
 *   <ProgressRing value={8} max={10} size="lg" showLabel />
 */

type ProgressRingSize = "sm" | "md" | "lg";

interface ProgressRingProps {
  /** Current value */
  value: number;
  /** Maximum value */
  max: number;
  /** Visual size */
  size?: ProgressRingSize;
  /** Show percentage/fraction label in center */
  showLabel?: boolean;
  /** Label format: "percentage" (75%) or "fraction" (8/10) */
  labelFormat?: "percentage" | "fraction";
  /** Override track color (Tailwind color class without prefix) */
  color?: "primary-blue" | "success-green" | "accent-amber" | "danger-red";
  /** Accessible label */
  "aria-label"?: string;
}

const SIZE_CONFIG: Record<
  ProgressRingSize,
  { size: number; stroke: number; fontSize: string }
> = {
  sm: { size: 40, stroke: 3, fontSize: "text-xs" },
  md: { size: 64, stroke: 4, fontSize: "text-sm" },
  lg: { size: 96, stroke: 5, fontSize: "text-lg" },
};

const COLOR_MAP: Record<string, string> = {
  "primary-blue": "#1D4ED8",
  "success-green": "#16A34A",
  "accent-amber": "#F59E0B",
  "danger-red": "#DC2626",
};

export function ProgressRing({
  value,
  max,
  size = "md",
  showLabel = false,
  labelFormat = "percentage",
  color = "primary-blue",
  "aria-label": ariaLabel,
}: ProgressRingProps) {
  const config = SIZE_CONFIG[size];
  const radius = (config.size - config.stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(Math.max(value, 0), max);
  const percentage = max > 0 ? (clamped / max) * 100 : 0;
  const offset = circumference - (percentage / 100) * circumference;
  const strokeColor = COLOR_MAP[color] || COLOR_MAP["primary-blue"];

  const label =
    labelFormat === "fraction"
      ? `${clamped}/${max}`
      : `${Math.round(percentage)}%`;

  return (
    <div
      className="relative inline-flex items-center justify-center"
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={ariaLabel || `Progress: ${label}`}
    >
      <svg width={config.size} height={config.size} className="-rotate-90">
        {/* Background track */}
        <circle
          cx={config.size / 2}
          cy={config.size / 2}
          r={radius}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth={config.stroke}
        />
        {/* Progress arc */}
        <circle
          cx={config.size / 2}
          cy={config.size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={config.stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-500 ease-out"
        />
      </svg>
      {showLabel && (
        <span
          className={`absolute font-semibold text-text-primary ${config.fontSize}`}
          aria-hidden="true"
        >
          {label}
        </span>
      )}
    </div>
  );
}
