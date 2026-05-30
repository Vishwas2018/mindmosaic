import { randomUUID } from 'crypto'

/**
 * Signs up a fresh user via auth-svc and returns a JWT access token.
 *
 * Uses auth-svc (not raw /auth/v1/signup) so the synchronous app_metadata write
 * fires and the resulting JWT carries tenant_id. auth-svc returns
 * { data: { message } } on signup, so login is called separately.
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
    // Always 'parent' — the only role auth-svc accepts (G1 / handle_new_user trigger).
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
  const loginBody = (await loginRes.json()) as { data?: { access_token?: string } }
  const token = loginBody.data?.access_token
  if (token === undefined) throw new Error('login: no access_token in response')
  return token
}
