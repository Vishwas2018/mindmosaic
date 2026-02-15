import { type ReactNode } from 'react';

interface AppShellProps {
  header: ReactNode;
  sidebar?: ReactNode;
  children: ReactNode;
  footer: ReactNode;
}

export function AppShell({
  header,
  sidebar,
  children,
  footer,
}: AppShellProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background-soft text-text-primary">
      {header}
      <div className="flex flex-1">
        {sidebar && <aside className="w-64 border-r border-border-subtle p-4">{sidebar}</aside>}
        <main className="flex-1 p-6">{children}</main>
      </div>
      {footer}
    </div>
  );
}
