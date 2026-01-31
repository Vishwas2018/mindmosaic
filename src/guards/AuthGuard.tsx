import { type ReactNode } from "react";

export function AuthGuard({ children }: { children: ReactNode }) {
  const isAuthenticated = true; // placeholder

  if (!isAuthenticated) {
    return (
      <div className="p-6 text-brand-textMuted">
        Authentication required (placeholder)
      </div>
    );
  }

  return <>{children}</>;
}
