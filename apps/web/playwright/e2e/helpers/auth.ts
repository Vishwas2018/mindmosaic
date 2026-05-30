import { randomUUID } from 'crypto'
import type { Page } from '@playwright/test'

/**
 * Signs up a fresh user via auth-svc and installs the Supabase session
 * into the Playwright browser context as a cookie.
 *
 * WHY cookies, not localStorage:
 * @supabase/ssr createBrowserClient stores sessions in document.cookie (not
 * localStorage). The cookie name is sb-{projectRef}-auth-token where
 * projectRef = supabaseHostname.split('.')[0] (SupabaseClient.ts:294).
 * The middleware calls createServerClient.auth.getSession() which reads the
 * same cookies from request headers. Seeding via page.context().addCookies()
 * installs the cookie before the first HTTP request so the middleware never
 * redirects to /login.
 *
 * Cookie value encoding (@supabase/ssr cookies.js):
 *   "base64-" + base64url(JSON.stringify(session))
 *
 * Minimum valid session shape (@supabase/auth-js GoTrueClient._isValidSession):
 *   { access_token, refresh_token, expires_at }
 *   A user object is also included (decoded from the JWT) so client-side
 *   components that read session.user render correctly.
 *
 * v1 G1 constraint: auth-svc only accepts parent self-signup. The `role`
 * argument is for documentation and future admin-API support only.
 */
export async function signUpAndInstallSession(
  page: Page,
  webUrl: string,
  baseUrl: string,
  anon: string,
  role: 'student' | 'teacher' | 'parent',
  emailPrefix: string,
): Promise<void> {
  const email = `${emailPrefix}-${randomUUID()}@example.com`
  const password = 'TestPassword123!'

  const signupRes = await fetch(`${baseUrl}/auth-svc/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: anon },
    body: JSON.stringify({ email, password, fullName: 'E2E Test', role: 'parent' }),
  })
  if (!signupRes.ok) {
    throw new Error(
      `signup failed (intended role: ${role}): ${signupRes.status} ${await signupRes.text()}`,
    )
  }

  const loginRes = await fetch(`${baseUrl}/auth-svc/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: anon },
    body: JSON.stringify({ email, password }),
  })
  if (!loginRes.ok)
    throw new Error(`login failed: ${loginRes.status} ${await loginRes.text()}`)

  const loginBody = (await loginRes.json()) as {
    access_token?: string
    refresh_token?: string
    expires_at?: number
  }

  const { access_token, refresh_token, expires_at } = loginBody
  if (!access_token || !refresh_token || !expires_at) {
    throw new Error(
      `login: missing session fields — got ${JSON.stringify(Object.keys(loginBody))}`,
    )
  }

  // Decode JWT payload to build a minimal user object for client-side rendering.
  // GoTrueClient._isValidSession only requires access_token + refresh_token +
  // expires_at, but including user avoids issues with components that read
  // session.user.app_metadata.role.
  const jwtPart = access_token.split('.')[1]
  if (!jwtPart) throw new Error('login: malformed JWT — missing payload segment')
  const jwtPayload = JSON.parse(
    Buffer.from(jwtPart, 'base64url').toString('utf8'),
  ) as {
    sub: string
    email?: string
    app_metadata?: Record<string, unknown>
    user_metadata?: Record<string, unknown>
    aud?: string | string[]
  }

  const session = {
    access_token,
    refresh_token,
    expires_at,
    expires_in: expires_at - Math.floor(Date.now() / 1000),
    token_type: 'bearer' as const,
    user: {
      id: jwtPayload.sub,
      email: jwtPayload.email ?? email,
      app_metadata: jwtPayload.app_metadata ?? {},
      user_metadata: jwtPayload.user_metadata ?? {},
      aud: Array.isArray(jwtPayload.aud) ? jwtPayload.aud[0] : (jwtPayload.aud ?? 'authenticated'),
      created_at: '',
    },
  }

  // @supabase/ssr encodes cookie values as "base64-" + base64url(jsonString).
  // Node.js Buffer.toString('base64url') uses the same RFC 4648 §5 alphabet
  // (A-Za-z0-9-_) as @supabase/ssr's stringToBase64URL — no padding, no +/.
  const cookieValue = 'base64-' + Buffer.from(JSON.stringify(session), 'utf8').toString('base64url')

  // Cookie name: sb-{projectRef}-auth-token
  // Matches SupabaseClient.ts:294: `sb-${baseUrl.hostname.split('.')[0]}-auth-token`
  const projectRef = new URL(baseUrl).hostname.split('.')[0]
  const cookieName = `sb-${projectRef}-auth-token`

  // addCookies with `url` infers domain (e.g. "localhost") and path ("/").
  // sameSite:"Lax" + httpOnly:false matches @supabase/ssr DEFAULT_COOKIE_OPTIONS.
  await page.context().addCookies([
    {
      name: cookieName,
      value: cookieValue,
      url: webUrl,
      sameSite: 'Lax',
      httpOnly: false,
    },
  ])
}

/**
 * Signs up a fresh user via auth-svc and returns a JWT access token.
 *
 * Use for pure API tests (no page navigation). Navigating specs must use
 * signUpAndInstallSession instead — this helper only returns a token and
 * never seeds the browser cookie, so the middleware would redirect to /login.
 *
 * v1 G1 constraint: auth-svc only supports parent self-signup. The
 * handle_new_user DB trigger raises for any non-parent role, and auth-svc
 * hardcodes role:'parent' in the Supabase signUp call regardless of what is
 * passed. All E2E accounts are therefore created as parent; the `role` argument
 * is for documentation and future admin-API support only.
 */
export async function signUpAndGetToken(
  baseUrl: string,
  anon: string,
  role: 'student' | 'teacher' | 'parent',
  emailPrefix: string,
): Promise<string> {
  const email = `${emailPrefix}-${randomUUID()}@example.com`
  const password = 'TestPassword123!'

  const signupRes = await fetch(`${baseUrl}/auth-svc/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: anon },
    body: JSON.stringify({ email, password, fullName: 'E2E Test', role: 'parent' }),
  })
  if (!signupRes.ok) {
    throw new Error(`signup failed (intended role: ${role}): ${signupRes.status} ${await signupRes.text()}`)
  }

  const loginRes = await fetch(`${baseUrl}/auth-svc/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: anon },
    body: JSON.stringify({ email, password }),
  })
  if (!loginRes.ok) throw new Error(`login failed: ${loginRes.status} ${await loginRes.text()}`)
  const loginBody = (await loginRes.json()) as { access_token?: string }
  const token = loginBody.access_token
  if (token === undefined) throw new Error('login: no access_token in response')
  return token
}
