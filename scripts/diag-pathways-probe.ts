/**
 * diag-pathways-probe.ts — Q-50 diagnostic.
 * Remove after Q-50 closed. See docs/dev/OPEN_ISSUES.md.
 *
 * Signs up a fresh parent via auth-svc, then calls content-svc /pathways
 * and prints the raw status + body verbatim. Exits 0 regardless — this is
 * diagnostic output, not a gate.
 *
 * Env (resolved in order: apps/web/.env.e2e → .env.local → .env → shell):
 *   E2E_BASE_URL        Edge Functions base URL
 *   E2E_SUPABASE_ANON   Supabase anon key (sent as apikey header)
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { randomUUID } from 'crypto'

config({ path: resolve(process.cwd(), 'apps/web/.env.e2e') })
config({ path: resolve(process.cwd(), '.env.local') })
config({ path: resolve(process.cwd(), '.env') })

const BASE_URL = process.env['E2E_BASE_URL'] ?? ''
const ANON     = process.env['E2E_SUPABASE_ANON'] ?? ''

async function main(): Promise<void> {
  if (!BASE_URL || !ANON) {
    console.log('[diag] E2E_BASE_URL or E2E_SUPABASE_ANON not set — skipping')
    return
  }

  const email    = `diag-${randomUUID()}@example.com`
  const password = 'DiagTest123!'
  console.log(`[diag] probe user: ${email}`)

  // Step 1 — signup via auth-svc (same path as E2E tests 8/10/11)
  let signupOk = false
  try {
    const res  = await fetch(`${BASE_URL}/auth-svc/auth/signup`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', apikey: ANON },
      body:    JSON.stringify({ email, password, fullName: 'Diag Probe', role: 'parent' }),
    })
    const body = await res.text()
    console.log(`[diag] signup → ${res.status}: ${body.slice(0, 300)}`)
    signupOk = res.ok
  } catch (e) {
    console.log(`[diag] signup error: ${e instanceof Error ? e.message : String(e)}`)
    return
  }

  if (!signupOk) {
    console.log('[diag] signup failed — cannot probe /pathways')
    return
  }

  // Step 2 — login to get JWT
  let token = ''
  try {
    const res  = await fetch(`${BASE_URL}/auth-svc/auth/login`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', apikey: ANON },
      body:    JSON.stringify({ email, password }),
    })
    const body = (await res.json()) as { access_token?: string }
    console.log(`[diag] login → ${res.status}, token_length=${body.access_token?.length ?? 0}`)
    if (!res.ok || !body.access_token) {
      console.log('[diag] login failed — cannot probe /pathways')
      return
    }
    token = body.access_token
  } catch (e) {
    console.log(`[diag] login error: ${e instanceof Error ? e.message : String(e)}`)
    return
  }

  // Step 3 — GET /content-svc/pathways with the JWT
  try {
    const res  = await fetch(`${BASE_URL}/content-svc/pathways`, {
      headers: { Authorization: `Bearer ${token}`, apikey: ANON },
    })
    const body = await res.text()
    console.log(`\n[diag] GET /content-svc/pathways → ${res.status}`)
    console.log(body)
  } catch (e) {
    console.log(`[diag] /pathways error: ${e instanceof Error ? e.message : String(e)}`)
  }
}

main().catch((err: unknown) => {
  console.error('[diag] unhandled error:', err instanceof Error ? err.message : String(err))
})
