import { type ReactNode } from 'react';

interface SectionHeaderProps {
  children: ReactNode;
}

export function SectionHeader({ children }: SectionHeaderProps) {
  return (
    <h2 className="text-xl font-semibold tracking-heading mt-6 mb-2">
      {children}
    </h2>
  );
}
