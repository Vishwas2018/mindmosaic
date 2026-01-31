import { type ReactNode } from 'react';

interface PageProps {
  title: string;
  children: ReactNode;
}

export function Page({ title, children }: PageProps) {
  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold tracking-heading">{title}</h1>
      {children}
    </main>
  );
}
