import { APP_NAME } from '@/config/brand';

export function Footer() {
  return (
    <footer className="w-full border-t border-border-subtle p-4 text-sm text-text-primaryMuted">
      © {new Date().getFullYear()} {APP_NAME}
    </footer>
  );
}
