import { APP_NAME } from '@/config/brand';

export function Header() {
  return (
    <header className="w-full border-b border-brand-borderSubtle p-4 flex items-center justify-between">
      <span className="font-semibold tracking-heading text-lg">{APP_NAME}</span>
    </header>
  );
}
