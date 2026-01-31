import { Link } from 'react-router-dom';
import { Page } from '@/shared/ui/Page';

export function NotFound() {
  return (
    <Page title="Page Not Found">
      <p className="text-brand-textMuted mb-4">The page you are looking for does not exist.</p>
      <Link to="/" className="text-brand-primary hover:text-brand-primaryLight">
        Return to Home
      </Link>
    </Page>
  );
}
