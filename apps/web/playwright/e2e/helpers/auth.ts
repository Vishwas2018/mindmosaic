import { randomUUID } from 'crypto'

/**
 * Signs up a new user via auth-svc and returns a JWT access token.
 *
 * Uses auth-svc (not raw /auth/v1/signup) so the synchronous app_metadata write
 * fires and the resulting JWT carries tenant_id + role. auth-svc/signup returns
 * { data: { message } }, not a session, so login is called separately to get the JWT.
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
    body: JSON.stringify({ email, password, role }),
  })
  if (!signupRes.ok) throw new Error(`signup failed: ${signupRes.status}`)

  const loginRes = await fetch(`${baseUrl}/auth-svc/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: anon },
    body: JSON.stringify({ email, password }),
  })
  if (!loginRes.ok) throw new Error(`login failed: ${loginRes.status}`)
  const loginBody = (await loginRes.json()) as { data?: { access_token?: string } }
  const token = loginBody.data?.access_token
  if (token === undefined) throw new Error('login: no access_token in response')
  return token
}
