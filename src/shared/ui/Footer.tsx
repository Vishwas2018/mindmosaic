import { APP_NAME } from '@/config/brand';

export function Footer() {
  return (
    <footer className="w-full border-t border-brand-borderSubtle p-4 text-sm text-brand-textMuted">
      © {new Date().getFullYear()} {APP_NAME}
    </footer>
  );
}
