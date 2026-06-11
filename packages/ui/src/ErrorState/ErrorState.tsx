import type { ReactNode } from 'react';
import { clsx } from 'clsx';

export interface ErrorStateProps {
  title: string;
  description?: string;
  onRetry?: () => void;
  icon?: ReactNode;
  className?: string;
}

function WarningIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path
        d="M10 2.5L2 16.5h16L10 2.5z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M10 8v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="10" cy="14" r="0.75" fill="currentColor" />
    </svg>
  );
}

export function ErrorState({
  title,
  description,
  onRetry,
  icon,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      aria-label={title}
      className={clsx(
        'rounded-xl border p-4 flex flex-col items-center gap-2 text-center',
        'bg-[var(--error-bg)] border-[var(--incorrect-200)]',
        className,
      )}
    >
      <div className="text-[var(--error)]" aria-hidden="true">
        {icon ?? <WarningIcon />}
      </div>
      <p className="text-sm font-medium text-[var(--text)]">{title}</p>
      {description && (
        <p className="text-xs text-[var(--muted)] max-w-xs">{description}</p>
      )}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className={clsx(
            'mt-1 h-8 px-3 rounded-btn inline-flex items-center justify-center',
            'text-xs font-medium text-[var(--text-2)] hover:bg-[var(--slate-75)] hover:text-[var(--text)]',
            'transition-colors duration-fast',
            'focus-visible:outline-none focus-visible:shadow-focus',
          )}
        >
          Try again
        </button>
      )}
    </div>
  );
}
