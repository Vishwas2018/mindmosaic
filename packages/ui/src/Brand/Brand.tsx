/*
 * Deliberate deviation from mockup layout idiom:
 * Mockup uses margin-right: -30px on the brain SVG to pull wordmark closer.
 * We use flexbox gap + correct SVG sizing — identical visual result,
 * no magic negative margins. Documented per P2 instruction.
 *
 * Two color variants:
 * - default:  "Mosaic" in --accent-500 (#ef6843) — light backgrounds
 * - on-dark:  "Mosaic" in --accent-400 (#ef8c56) — purple/dark backgrounds
 */
import { forwardRef } from 'react';
import { clsx } from 'clsx';

export type BrandSize = 'sm' | 'md' | 'lg';
export type BrandVariant = 'default' | 'on-dark';

export interface BrandProps {
  /** Public-path URL to the logo image. Passed by the consuming app — not bundled into @mm/ui. */
  logoSrc?: string;
  size?: BrandSize;
  variant?: BrandVariant;
  showSlogan?: boolean;
  className?: string;
}

const logoSizes: Record<BrandSize, string> = {
  sm: 'w-5 h-4',
  md: 'w-7 h-6',
  lg: 'w-14 h-11',
};

const wordmarkSizes: Record<BrandSize, string> = {
  sm: 'text-xs font-extrabold tracking-tight',
  md: 'text-sm font-extrabold tracking-tight',
  lg: 'text-base font-extrabold tracking-tight',
};

export const Brand = forwardRef<HTMLDivElement, BrandProps>(
  ({ logoSrc = '/logo.svg', size = 'md', variant = 'default', showSlogan = false, className }, ref) => {
    const mosaicColor =
      variant === 'on-dark'
        ? 'text-[var(--accent-400)]'
        : 'text-brand-secondary';

    return (
      <div
        ref={ref}
        className={clsx('flex flex-col items-center gap-1', className)}
        aria-label="MindMosaic"
      >
        <div className="flex items-center gap-2">
          <img
            src={logoSrc}
            alt=""
            aria-hidden="true"
            className={clsx(logoSizes[size], 'flex-shrink-0')}
          />
          <span className={clsx(wordmarkSizes[size], 'leading-none select-none')}>
            <span className="text-brand-primary">Mind</span>
            <span className={mosaicColor}>Mosaic</span>
          </span>
        </div>

        {showSlogan && (
          <p
            className={clsx(
              'font-serif text-center leading-snug',
              size === 'lg' ? 'text-lg' : 'text-xs',
              variant === 'on-dark' ? 'text-white/82' : 'text-[var(--muted)]',
            )}
          >
            Turning practice into Mastery!
          </p>
        )}
      </div>
    );
  },
);
Brand.displayName = 'Brand';
