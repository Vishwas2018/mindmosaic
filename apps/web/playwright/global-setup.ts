import { chromium } from '@playwright/test';

const BYPASS_STATE_PATH = './playwright/.bypass-state.json';

export default async function globalSetup(): Promise<void> {
  const secret = process.env['VERCEL_AUTOMATION_BYPASS_SECRET'];
  const webUrl = process.env['E2E_WEB_URL'];

  if (!secret || !webUrl) return;

  // One navigation with bypass headers lets Vercel set the __vp_bypass_* cookie;
  // storageState distributes it. Cookie domain-scoping keeps it off Supabase.
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({
      extraHTTPHeaders: {
        'x-vercel-protection-bypass': secret,
        'x-vercel-set-bypass-cookie': 'true',
      },
    });
    const page = await context.newPage();
    await page.goto(webUrl);
    await context.storageState({ path: BYPASS_STATE_PATH });
  } finally {
    await browser.close();
  }
}
