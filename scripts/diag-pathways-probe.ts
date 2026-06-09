/**
 * diag-pathways-probe.ts — Q-50 diagnostic.
 * Remove after Q-50 closed. See docs/dev/OPEN_ISSUES.md.
 *
 * Runs two probes and prints results clearly labelled PARENT and STUDENT.
 *
 * PARENT probe: signs up via auth-svc (same path as E2E tests 8/10/11),
 * logs in, decodes JWT, then calls GET /content-svc/pathways.
 *
 * STUDENT probe: mirrors signUpAndInstallSessionAs(role='student') exactly
 * (apps/web/playwright/e2e/helpers/auth.ts:144-286):
 *   1. Admin-create user with user_metadata.role='parent' (auth.ts:167)
 *   2. PATCH user_profile.role → 'student' (auth.ts:188)
 *   3. PUT app_metadata = { role: 'student' } (auth.ts:203)
 *   4. Sign in via password → capture JWT (auth.ts:217)
 *   5. Decode JWT → print app_metadata, tenant_id, role claims
 *   6. GET /content-svc/pathways with student JWT
 *
 * Exits 0 regardless — diagnostic output only, not a gate.
 *
 * Env (resolved in order: apps/web/.env.e2e → .env.local → .env → shell):
 *   E2E_BASE_URL           Edge Functions base URL
 *   E2E_SUPABASE_ANON      Supabase anon key (sent as apikey header)
 *   E2E_TEST_SERVICE_ROLE  Service-role key (required for STUDENT probe)
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { randomUUID } from 'crypto'

config({ path: resolve(process.cwd(), 'apps/web/.env.e2e') })
config({ path: resolve(process.cwd(), '.env.local') })
config({ path: resolve(process.cwd(), '.env') })

const BASE_URL    = process.env['E2E_BASE_URL'] ?? ''
const ANON        = process.env['E2E_SUPABASE_ANON'] ?? ''
const SERVICE_KEY = process.env['E2E_TEST_SERVICE_ROLE'] ?? ''

// Supabase project origin (strip /functions/v1 suffix from Edge Functions base).
// e.g. https://xyz.supabase.co/functions/v1 → https://xyz.supabase.co
const SUPABASE_URL = BASE_URL ? new URL(BASE_URL).origin : ''

function decodeJwt(token: string): Record<string, unknown> {
  const part = token.split('.')[1]
  if (!part) return {}
  try {
    return JSON.parse(Buffer.from(part, 'base64url').toString('utf8')) as Record<string, unknown>
  } catch {
    return { error: 'failed to parse JWT payload' }
  }
}

function printJwtClaims(label: string, token: string): void {
  const payload = decodeJwt(token)
  console.log(`[${label}] JWT app_metadata:`, JSON.stringify(payload['app_metadata'] ?? null))
  console.log(`[${label}] JWT tenant_id claim:`, payload['tenant_id'] ?? '(not present)')
  console.log(`[${label}] JWT role claim:`, payload['role'] ?? '(not present)')
}

// ─── PARENT probe ─────────────────────────────────────────────────────────────

async function probeParent(): Promise<void> {
  console.log('\n══════════════════════════════════════════')
  console.log('PARENT PROBE')
  console.log('══════════════════════════════════════════')

  const email    = `diag-parent-${randomUUID()}@example.com`
  const password = 'DiagTest123!'
  console.log(`[PARENT] probe user: ${email}`)

  // Step 1 — signup via auth-svc (same path as E2E tests 8/10/11)
  let signupOk = false
  try {
    const res  = await fetch(`${BASE_URL}/auth-svc/auth/signup`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', apikey: ANON },
      body:    JSON.stringify({ email, password, fullName: 'Diag Parent', role: 'parent' }),
    })
    const body = await res.text()
    console.log(`[PARENT] signup → ${res.status}: ${body.slice(0, 300)}`)
    signupOk = res.ok
  } catch (e) {
    console.log(`[PARENT] signup error: ${e instanceof Error ? e.message : String(e)}`)
    return
  }

  if (!signupOk) {
    console.log('[PARENT] signup failed — cannot probe /pathways')
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
    console.log(`[PARENT] login → ${res.status}, token_length=${body.access_token?.length ?? 0}`)
    if (!res.ok || !body.access_token) {
      console.log('[PARENT] login failed — cannot probe /pathways')
      return
    }
    token = body.access_token
  } catch (e) {
    console.log(`[PARENT] login error: ${e instanceof Error ? e.message : String(e)}`)
    return
  }

  // Step 3 — decode and print JWT claims
  printJwtClaims('PARENT', token)

  // Step 4 — GET /content-svc/pathways
  try {
    const res  = await fetch(`${BASE_URL}/content-svc/pathways`, {
      headers: { Authorization: `Bearer ${token}`, apikey: ANON },
    })
    const body = await res.text()
    console.log(`\n[PARENT] GET /content-svc/pathways → ${res.status}`)
    console.log(body)
  } catch (e) {
    console.log(`[PARENT] /pathways error: ${e instanceof Error ? e.message : String(e)}`)
  }
}

// ─── STUDENT probe ────────────────────────────────────────────────────────────
// Mirrors signUpAndInstallSessionAs(role='student') exactly.
// Source: apps/web/playwright/e2e/helpers/auth.ts:144-286

async function probeStudent(): Promise<string | null> {
  console.log('\n══════════════════════════════════════════')
  console.log('STUDENT PROBE')
  console.log('══════════════════════════════════════════')

  if (!SERVICE_KEY) {
    console.log('[STUDENT] E2E_TEST_SERVICE_ROLE not set — skipping student probe')
    return null
  }

  const email    = `diag-student-${randomUUID()}@example.com`
  const password = 'DiagTest123!'
  console.log(`[STUDENT] probe user: ${email}`)

  // Step 1 — admin-create user with user_metadata.role='parent' to satisfy
  // the handle_new_user trigger (auth.ts:167-185)
  let userId = ''
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey:          SERVICE_KEY,
        Authorization:  `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: { role: 'parent', display_name: 'Diag Student' },
      }),
    })
    const body = (await res.json()) as { id?: string; message?: string }
    console.log(`[STUDENT] admin createUser → ${res.status}: id=${body.id ?? '(none)'} message=${body.message ?? '(none)'}`)
    if (!res.ok || !body.id) {
      console.log('[STUDENT] admin createUser failed — cannot continue')
      return null
    }
    userId = body.id
  } catch (e) {
    console.log(`[STUDENT] admin createUser error: ${e instanceof Error ? e.message : String(e)}`)
    return null
  }

  // Step 2 — PATCH user_profile.role → 'student' via service-role REST
  // Mirrors auth.ts:188-200
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/user_profile?id=eq.${userId}`, {
      method:  'PATCH',
      headers: {
        'Content-Type': 'application/json',
        apikey:          SERVICE_KEY,
        Authorization:  `Bearer ${SERVICE_KEY}`,
        Prefer:         'return=minimal',
      },
      body: JSON.stringify({ role: 'student' }),
    })
    const body = await res.text()
    console.log(`[STUDENT] user_profile PATCH → ${res.status}: ${body.slice(0, 200)}`)
    if (!res.ok) {
      console.log('[STUDENT] user_profile PATCH failed — tenant_id may be absent in profile row')
    }
  } catch (e) {
    console.log(`[STUDENT] user_profile PATCH error: ${e instanceof Error ? e.message : String(e)}`)
  }

  // Diagnostic: read back user_profile to verify tenant_id is populated
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/user_profile?id=eq.${userId}&select=id,role,tenant_id`, {
      headers: {
        apikey:         SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
      },
    })
    const body = await res.text()
    console.log(`[STUDENT] user_profile READ-BACK → ${res.status}: ${body.slice(0, 400)}`)
  } catch (e) {
    console.log(`[STUDENT] user_profile read-back error: ${e instanceof Error ? e.message : String(e)}`)
  }

  // Step 3 — PUT app_metadata = { role: 'student' } via admin API
  // Mirrors auth.ts:203-214
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
      method:  'PUT',
      headers: {
        'Content-Type': 'application/json',
        apikey:          SERVICE_KEY,
        Authorization:  `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify({ app_metadata: { role: 'student' } }),
    })
    const body = await res.text()
    console.log(`[STUDENT] admin PUT app_metadata → ${res.status}: ${body.slice(0, 300)}`)
    if (!res.ok) {
      console.log('[STUDENT] admin PUT app_metadata failed')
      return null
    }
  } catch (e) {
    console.log(`[STUDENT] admin PUT app_metadata error: ${e instanceof Error ? e.message : String(e)}`)
    return null
  }

  // Step 4 — sign in via password to get JWT
  // Mirrors auth.ts:217-241
  let token = ''
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', apikey: ANON },
      body:    JSON.stringify({ email, password }),
    })
    const body = (await res.json()) as { access_token?: string }
    console.log(`[STUDENT] password sign-in → ${res.status}, token_length=${body.access_token?.length ?? 0}`)
    if (!res.ok || !body.access_token) {
      console.log('[STUDENT] sign-in failed — cannot probe /pathways')
      return null
    }
    token = body.access_token
  } catch (e) {
    console.log(`[STUDENT] sign-in error: ${e instanceof Error ? e.message : String(e)}`)
    return null
  }

  // Step 5 — decode and print JWT claims
  printJwtClaims('STUDENT', token)

  // Step 6 — GET /content-svc/pathways with student JWT
  try {
    const res  = await fetch(`${BASE_URL}/content-svc/pathways`, {
      headers: { Authorization: `Bearer ${token}`, apikey: ANON },
    })
    const body = await res.text()
    console.log(`\n[STUDENT] GET /content-svc/pathways → ${res.status}`)
    console.log(body)
  } catch (e) {
    console.log(`[STUDENT] /pathways error: ${e instanceof Error ? e.message : String(e)}`)
  }

  return token
}

// ─── STUDENT no-apikey probe ───────────────────────────────────────────────────
// Mirrors the exact request shape MmClient sends from the browser:
//   Authorization: Bearer <jwt>   — NO apikey header.
// Decision:
//   200 → apikey not required with verify_jwt=false (H1 eliminated).
//   401 → apikey IS required   (H1 confirmed: add apikey to MmClient).

async function probeStudentNoApikey(token: string): Promise<void> {
  console.log('\n══════════════════════════════════════════')
  console.log('STUDENT no-apikey PROBE (R-DIAG-4)')
  console.log('══════════════════════════════════════════')
  console.log('[STUDENT no-apikey] Authorization: Bearer <token> — no apikey header')

  try {
    const res  = await fetch(`${BASE_URL}/content-svc/pathways`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const body = await res.text()
    console.log(`\n[STUDENT no-apikey] GET /content-svc/pathways → ${res.status}`)
    console.log(body)
  } catch (e) {
    console.log(`[STUDENT no-apikey] /pathways error: ${e instanceof Error ? e.message : String(e)}`)
  }
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  if (!BASE_URL || !ANON) {
    console.log('[diag] E2E_BASE_URL or E2E_SUPABASE_ANON not set — skipping')
    return
  }

  await probeParent()
  const studentJwt = await probeStudent()
  if (studentJwt) {
    await probeStudentNoApikey(studentJwt)
  }
}

main().catch((err: unknown) => {
  console.error('[diag] unhandled error:', err instanceof Error ? err.message : String(err))
})
