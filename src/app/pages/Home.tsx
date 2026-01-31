import { APP_NAME, APP_TAGLINE } from '@/config/brand';
import { Page } from '@/shared/ui/Page';

export function Home() {
  return (
    <Page title={APP_NAME}>
      <p className="text-brand-textMuted">{APP_TAGLINE}</p>
    </Page>
  );
}
