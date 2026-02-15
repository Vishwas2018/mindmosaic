import { type ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
}

export function Card({ children }: CardProps) {
  return (
    <div className="p-4 border border-border-subtle rounded-lg bg-white">
      {children}
    </div>
  );
}
