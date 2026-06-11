import { clsx } from 'clsx';

export interface UpgradeStateProps {
  tier: string;
  title?: string;
  description?: string;
  onUpgrade: () => void;
  className?: string;
}

function LockIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="4" y="9" width="12" height="9" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M7 9V6a3 3 0 116 0v3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function UpgradeState({
  tier,
  title = 'Upgrade your plan',
  description,
  onUpgrade,
  className,
}: UpgradeStateProps) {
  return (
    <div
      role="status"
      aria-label="Upgrade required"
      className={clsx(
        'rounded-xl border p-4 flex flex-col items-center gap-2 text-center',
        'bg-[var(--primary-l)] border-[var(--brand-200)]',
        className,
      )}
    >
      <div className="text-[var(--primary)]" aria-hidden="true">
        <LockIcon />
      </div>
      <p className="text-sm font-semibold text-[var(--text)]">{title}</p>
      {description && (
        <p className="text-xs text-[var(--muted)] max-w-xs">{description}</p>
      )}
      <button
        type="button"
        onClick={onUpgrade}
        className={clsx(
          'mt-1 h-8 px-3 rounded-btn inline-flex items-center justify-center',
          'text-xs font-medium bg-[var(--primary)] text-white hover:bg-[var(--primary-d)] active:bg-[var(--primary-ink)]',
          'transition-colors duration-fast',
          'focus-visible:outline-none focus-visible:shadow-focus',
        )}
      >
        Upgrade to {tier}
      </button>
    </div>
  );
}
