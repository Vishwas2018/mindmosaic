// Stage 36: SVG circular progress ring for parent dashboard readiness hero.
// Q-36.4: no new deps; stroke-dasharray approach; role="img" + aria-label.

export interface ReadinessRingProps {
  /** 0–1 fraction of completion. Clamped to [0, 1]. */
  value: number;
  /** Accessible label, e.g. "NAPLAN readiness". */
  label: string;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_CONFIG = {
  sm: { radius: 24, stroke: 4, dim: 56 },
  md: { radius: 36, stroke: 5, dim: 80 },
  lg: { radius: 52, stroke: 6, dim: 112 },
} as const;

export function ReadinessRing({ value, label, size = 'md' }: ReadinessRingProps) {
  const { radius, stroke, dim } = SIZE_CONFIG[size];
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(1, Math.max(0, value));
  const dashoffset = circumference * (1 - progress);
  const pct = Math.round(progress * 100);
  const cx = dim / 2;
  const cy = dim / 2;

  return (
    <div
      role="img"
      aria-label={`${label}: ${pct}%`}
      className="inline-flex flex-col items-center gap-2"
    >
      <svg width={dim} height={dim} aria-hidden="true" focusable="false">
        {/* Track */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth={stroke}
        />
        {/* Fill */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={dashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
        />
      </svg>
      <span
        className="text-sm font-semibold tabular-nums text-[var(--text)]"
        aria-hidden="true"
      >
        {pct}%
      </span>
    </div>
  );
}
