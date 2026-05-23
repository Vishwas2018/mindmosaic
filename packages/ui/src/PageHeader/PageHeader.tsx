import { forwardRef } from 'react';
import type { ReactNode } from 'react';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export const PageHeader = forwardRef<HTMLHeadingElement, PageHeaderProps>(
  function PageHeader({ title, subtitle, action }, ref) {
    return (
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1
            ref={ref}
            tabIndex={-1}
            className="text-2xl font-semibold text-[var(--text)]"
          >
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-sm text-[var(--muted)]">{subtitle}</p>
          )}
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
    );
  }
);
