'use client';

import { useEffect, useRef, useState } from 'react';

// circumference of a circle with r=52 (used for stroke-dasharray + dashoffset calc)
const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function bandColor(score: number, scoreBand: string | null | undefined): string {
  if (scoreBand === 'high') return 'var(--correct-500)';
  if (scoreBand === 'medium') return 'var(--warn-500)';
  if (scoreBand === 'low') return 'var(--incorrect-500)';
  if (score >= 80) return 'var(--correct-500)';
  if (score >= 60) return 'var(--warn-500)';
  return 'var(--incorrect-500)';
}

function scoreCopy(score: number): string {
  if (score >= 80) return 'Well done';
  if (score >= 60) return 'Good effort';
  return 'Keep practising';
}

export interface HeroRingProps {
  score: number;
  scoreBand?: string | null;
}

export function HeroRing({ score, scoreBand }: HeroRingProps) {
  const prefersReducedMotion = useRef(
    typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  const finalOffset = CIRCUMFERENCE * (1 - score / 100);
  const [offset, setOffset] = useState(
    prefersReducedMotion.current ? finalOffset : CIRCUMFERENCE,
  );

  useEffect(() => {
    if (prefersReducedMotion.current) return;
    const raf = requestAnimationFrame(() => {
      setOffset(finalOffset);
    });
    return () => cancelAnimationFrame(raf);
  }, [finalOffset]);

  const color = bandColor(score, scoreBand);
  const copy = scoreCopy(score);

  return (
    <div className="flex flex-col items-center gap-3 print:gap-1">
      <div className="relative" style={{ width: 120, height: 120 }}>
        <svg
          width="120"
          height="120"
          viewBox="0 0 120 120"
          aria-hidden="true"
          className="print:[&_circle]:transition-none"
        >
          {/* Track */}
          <circle
            cx="60"
            cy="60"
            r={RADIUS}
            fill="none"
            stroke="var(--border)"
            strokeWidth="10"
          />
          {/* Progress arc */}
          <circle
            cx="60"
            cy="60"
            r={RADIUS}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            style={{
              transformOrigin: '60px 60px',
              transform: 'rotate(-90deg)',
              transition: prefersReducedMotion.current
                ? 'none'
                : 'stroke-dashoffset 1000ms ease-out',
            }}
          />
        </svg>
        {/* Centre label */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          aria-label={`Score: ${score}%`}
        >
          <span
            className="text-2xl font-bold tabular-nums"
            style={{ color }}
          >
            {score}%
          </span>
        </div>
      </div>
      <p className="text-base font-semibold text-[var(--text)]">{copy}</p>
    </div>
  );
}
