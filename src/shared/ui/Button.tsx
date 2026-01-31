import { type ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';
type ButtonSize = 'sm' | 'md';

interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  asChild?: boolean;
  children: ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-brand-primary text-white hover:bg-brand-primaryLight',
  secondary: 'bg-brand-bgSoft text-brand-text border border-brand-borderSubtle hover:bg-white',
  ghost: 'text-brand-text hover:bg-brand-bgSoft',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
};

export function Button({
  variant = 'primary',
  size = 'md',
  asChild = false,
  children,
}: ButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center rounded font-medium transition-colors';
  const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]}`;

  if (asChild) {
    return <span className={classes}>{children}</span>;
  }

  return <button className={classes}>{children}</button>;
}
