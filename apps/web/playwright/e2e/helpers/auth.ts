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
 * Creates a user with the given role via Supabase Admin API and installs
 * the session cookie into the Playwright browser context.
 *
 * For 'parent': delegates to signUpAndInstallSession (auth-svc path).
 * For 'student' | 'teacher' | 'admin':
 *   1. Admin-creates user with user_metadata.role='parent' to satisfy the
 *      handle_new_user trigger (which only permits parent self-signup in v1).
 *      The trigger creates the tenant + user_profile row synchronously.
 *   2. PATCHes user_profile.role to the target role (service-role REST).
 *   3. PUTs app_metadata.role so the JWT carries the correct role claim.
 *   4. Signs in via password auth and installs the session cookie.
 *
 * Requires: E2E_TEST_SERVICE_ROLE env var. Module-level test.skip guards in
 * affected specs must include || E2E_TEST_SERVICE_ROLE === undefined.
 *
 * ISSUE-0073 fix — see docs/dev/OPEN_ISSUES.md.
 */
export async function signUpAndInstallSessionAs(
  page: Page,
  webUrl: string,
  baseUrl: string,
  anon: string,
  role: 'student' | 'teacher' | 'admin' | 'parent',
  emailPrefix: string,
): Promise<void> {
  if (role === 'parent') {
    return signUpAndInstallSession(page, webUrl, baseUrl, anon, role, emailPrefix)
  }

  const serviceKey = process.env['E2E_TEST_SERVICE_ROLE']
  if (!serviceKey) {
    throw new Error('signUpAndInstallSessionAs: E2E_TEST_SERVICE_ROLE is not set')
  }

  // Supabase project origin (strip /functions/v1 suffix from Edge Functions base).
  const supabaseUrl = new URL(baseUrl).origin
  const email = `${emailPrefix}-${randomUUID()}@example.com`
  const password = 'TestPassword123!'

  // Step 1 — admin-create with role='parent' to satisfy handle_new_user trigger.
  const createRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: 'parent', display_name: 'E2E Test' },
    }),
  })
  if (!createRes.ok) {
    throw new Error(`admin createUser failed: ${createRes.status} ${await createRes.text()}`)
  }
  const created = (await createRes.json()) as { id: string }
  const userId = created.id

  // Step 2 — set user_profile.role to the target role via service-role REST.
  const profileRes = await fetch(`${supabaseUrl}/rest/v1/user_profile?id=eq.${userId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({ role }),
  })
  if (!profileRes.ok) {
    throw new Error(`user_profile PATCH failed: ${profileRes.status} ${await profileRes.text()}`)
  }

  // Step 3 — set app_metadata.role so the JWT carries the correct role claim.
  const metaRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({ app_metadata: { role } }),
  })
  if (!metaRes.ok) {
    throw new Error(`admin updateUser app_metadata failed: ${metaRes.status} ${await metaRes.text()}`)
  }

  // Step 4 — sign in via password to get a session with the updated claims.
  const tokenRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: anon },
    body: JSON.stringify({ email, password }),
  })
  if (!tokenRes.ok) {
    throw new Error(`password sign-in failed: ${tokenRes.status} ${await tokenRes.text()}`)
  }
  const tokenBody = (await tokenRes.json()) as {
    access_token?: string
    refresh_token?: string
    expires_in?: number
    expires_at?: number
  }
  const { access_token, refresh_token } = tokenBody
  const expires_at =
    tokenBody.expires_at ??
    (tokenBody.expires_in !== undefined
      ? Math.floor(Date.now() / 1000) + tokenBody.expires_in
      : undefined)
  if (!access_token || !refresh_token || !expires_at) {
    throw new Error(
      `sign-in: missing session fields — got ${JSON.stringify(Object.keys(tokenBody))}`,
    )
  }

  // Step 5 — build and install the session cookie (same encoding as signUpAndInstallSession).
  const jwtPart = access_token.split('.')[1]
  if (!jwtPart) throw new Error('sign-in: malformed JWT — missing payload segment')
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

  const cookieValue =
    'base64-' + Buffer.from(JSON.stringify(session), 'utf8').toString('base64url')
  const projectRef = new URL(baseUrl).hostname.split('.')[0]
  const cookieName = `sb-${projectRef}-auth-token`

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
