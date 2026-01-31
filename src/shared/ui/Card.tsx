import { type ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
}

export function Card({ children }: CardProps) {
  return (
    <div className="p-4 border border-brand-borderSubtle rounded-lg bg-white">
      {children}
    </div>
  );
}
