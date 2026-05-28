/**
 * backfill-app-metadata.ts — Write app_metadata { tenant_id, role } to auth.users
 * for any user whose JWT claims lack tenant_id (created before the auth-svc fix).
 *
 * Idempotent — skips users who already have app_metadata.tenant_id set.
 * Run after deploying the auth-svc fix to repair accounts created before it.
 *
 * Usage (from repo root):
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... pnpm tsx scripts/backfill-app-metadata.ts
 *
 * Env resolved in order (first found wins):
 *   apps/web/.env.e2e → .env.local → .env → shell env
 * Variables read:
 *   SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

config({ path: resolve(process.cwd(), 'apps/web/.env.e2e') })
config({ path: resolve(process.cwd(), '.env.local') })
config({ path: resolve(process.cwd(), '.env') })

const SUPABASE_URL =
  process.env['SUPABASE_URL'] ?? process.env['NEXT_PUBLIC_SUPABASE_URL'] ?? ''
const SERVICE_KEY = process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? ''

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.')
  process.exit(1)
}

const db = createClient(SUPABASE_URL, SERVICE_KEY)

function die(msg: string): never {
  console.error('BACKFILL FAIL:', msg)
  process.exit(1)
}

async function main(): Promise<void> {
  console.log('backfill-app-metadata: fetching user_profile rows...\n')

  const { data: profiles, error: fetchErr } = await db
    .from('user_profile')
    .select('id, tenant_id, role')

  if (fetchErr || !profiles) die(fetchErr?.message ?? 'no profiles returned')

  console.log(`Found ${profiles.length} user_profile row(s).\n`)

  let ok = 0, skipped = 0, failed = 0

  for (const profile of profiles) {
    const { data: authData, error: getUserErr } =
      await db.auth.admin.getUserById(profile.id)

    if (getUserErr || !authData?.user) {
      console.error(`  FAIL  ${profile.id}: getUserById — ${getUserErr?.message ?? 'no user'}`)
      failed++
      continue
    }

    const existing = authData.user.app_metadata as Record<string, unknown> | undefined
    if (existing?.['tenant_id']) {
      console.log(`  SKIP  ${profile.id} — tenant_id already set`)
      skipped++
      continue
    }

    const { error: updateErr } = await db.auth.admin.updateUserById(profile.id, {
      app_metadata: { tenant_id: profile.tenant_id, role: profile.role },
    })

    if (updateErr) {
      console.error(`  FAIL  ${profile.id}: ${updateErr.message}`)
      failed++
    } else {
      console.log(`  OK    ${profile.id}  tenant_id=${profile.tenant_id}  role=${profile.role}`)
      ok++
    }
  }

  console.log(`\nDone. ok=${ok}  skipped=${skipped}  failed=${failed}`)
  if (failed > 0) {
    console.error('Some users failed — check above. Re-run is idempotent.')
    process.exit(1)
  }
}

main().catch((err: unknown) => {
  console.error('BACKFILL ERROR:', err instanceof Error ? err.message : String(err))
  process.exit(1)
})
