/**
 * seed-e2e.ts — Seed the database with deterministic E2E test data.
 *
 * Creates (idempotent — safe to re-run):
 *   1. framework_config  au_numeracy_y5_format / version 'e2e-v1'
 *   2. pathway           'e2e-numeracy-y5'  (engine_type adaptive)
 *   3. items 1–10        lifecycle: 1-2 draft, 3-4 review, 5 retired,
 *                                   6-7 monitored, 8 retired, 9-10 active
 *   4. item_version 1    for each item (is_current true, authoring_method human)
 *
 * After seeding, performs a read-back that resolves the engine's delivery
 * chain: active item → item_version(is_current) → pathway → framework_config.
 * Exits 1 if any link in the chain returns 0 rows — a seeded-but-unservable
 * item would fail every session E2E opaquely.
 *
 * Usage (from repo root):
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... pnpm tsx scripts/seed-e2e.ts
 *
 * Env resolved in order (first file found wins):
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

// ── Fixed UUIDs — deterministic across re-runs ────────────────────────────────

const FC_ID = '00000000-e2e0-0000-0000-000000000001'
const PW_ID = '00000000-e2e0-0000-0000-000000000002'
// item.skill_ids is uuid[] with no FK constraint — any non-null UUID satisfies the
// CHECK (array_length(skill_ids, 1) >= 1) guard without needing a real skill_node row.
const DUMMY_SKILL = 'aaaaaaaa-e2e0-0000-0000-000000000001'
const EXAM_FAMILY = 'au_numeracy_y5_format'

function itemId(n: number): string {
  return `00000000-e2e0-0000-0000-${String(n).padStart(12, '0')}`
}

type Lifecycle = 'draft' | 'review' | 'active' | 'monitored' | 'retired'

// items #9 and #10 are the deliverable (active) items
const ITEM_LIFECYCLES: Lifecycle[] = [
  'draft',     // 1
  'draft',     // 2
  'review',    // 3
  'review',    // 4
  'retired',   // 5
  'monitored', // 6
  'monitored', // 7
  'retired',   // 8
  'active',    // 9 ← first deliverable
  'active',    // 10 ← second deliverable
]

// ── helpers ───────────────────────────────────────────────────────────────────

function die(msg: string): never {
  console.error('SEED FAIL:', msg)
  process.exit(1)
}

// ── seed steps ────────────────────────────────────────────────────────────────

async function seedFrameworkConfig(): Promise<void> {
  const { error } = await db.from('framework_config').upsert(
    {
      id: FC_ID,
      exam_family: EXAM_FAMILY,
      version: 'e2e-v1',
      structure: {
        sections: 1,
        items_per_section: 10,
        time_limit_minutes: 50,
      },
      adaptive_rules: {
        min_items: 5,
        max_items: 10,
        target_ability_precision: 0.3,
      },
      scoring_rules: {
        method: 'percent_correct',
        pass_threshold: 0.6,
      },
      constraints: {},
      difficulty_bands: {
        easy:   [0.0, 0.35],
        medium: [0.35, 0.65],
        hard:   [0.65, 1.0],
      },
      blueprint: {
        strand_weights: {
          number:      0.4,
          algebra:     0.2,
          measurement: 0.2,
          statistics:  0.2,
        },
      },
    },
    { onConflict: 'exam_family,version', ignoreDuplicates: true },
  )
  if (error) throw new Error(`framework_config: ${error.message}`)
  console.log('  ✓ framework_config (e2e-v1, au_numeracy_y5_format)')
}

async function seedPathway(): Promise<void> {
  const { error } = await db.from('pathway').upsert(
    {
      id: PW_ID,
      slug: 'e2e-numeracy-y5',
      display_name: 'E2E — Numeracy Y5 (adaptive)',
      exam_family: EXAM_FAMILY,
      program: 'au_numeracy_y5',
      country: 'AU',
      curriculum: 'australian_curriculum_v9',
      framework_config_id: FC_ID,
      engine_type: 'adaptive',
      year_levels: [5],
      required_feature_key: 'pathway_naplan_y5',
      is_active: true,
    },
    { onConflict: 'slug', ignoreDuplicates: true },
  )
  if (error) throw new Error(`pathway: ${error.message}`)
  console.log('  ✓ pathway (e2e-numeracy-y5)')
}

async function seedItems(): Promise<void> {
  const items = ITEM_LIFECYCLES.map((lifecycle, i) => ({
    id: itemId(i + 1),
    response_type: 'mcq',
    skill_ids: [DUMMY_SKILL],
    difficulty: Number((0.30 + i * 0.04).toFixed(2)),
    year_levels: [5],
    exam_families: [EXAM_FAMILY],
    lifecycle,
    is_active: lifecycle === 'active',
    current_version: 1,
  }))

  const { error } = await db
    .from('item')
    .upsert(items, { onConflict: 'id', ignoreDuplicates: true })
  if (error) throw new Error(`items: ${error.message}`)

  const activeCount = items.filter((x) => x.lifecycle === 'active').length
  console.log(`  ✓ ${items.length} items (${activeCount} active — items #9 + #10)`)
}

async function seedItemVersions(): Promise<void> {
  const versions = ITEM_LIFECYCLES.map((_, i) => ({
    item_id: itemId(i + 1),
    version: 1,
    stem: {
      kind: 'plain_text',
      value: `E2E seed item ${i + 1} — ${ITEM_LIFECYCLES[i]}`,
    },
    response_config: {
      options: [
        { id: 'a', content: { kind: 'plain_text', value: 'Option A' } },
        { id: 'b', content: { kind: 'plain_text', value: 'Option B' } },
        { id: 'c', content: { kind: 'plain_text', value: 'Option C' } },
        { id: 'd', content: { kind: 'plain_text', value: 'Option D' } },
      ],
      correct_option_id: 'a',
    },
    difficulty: Number((0.30 + i * 0.04).toFixed(2)),
    is_current: true,
    authoring_method: 'human',
  }))

  const { error } = await db
    .from('item_version')
    .upsert(versions, { onConflict: 'item_id,version', ignoreDuplicates: true })
  if (error) throw new Error(`item_versions: ${error.message}`)
  console.log(`  ✓ ${versions.length} item_versions (all is_current=true)`)
}

// ── read-back chain verification ──────────────────────────────────────────────
//
// Mirrors the engine's delivery resolution order:
//   item → item_version(is_current) → pathway → framework_config
//
// Step 1: v_item_current is the join of item + item_version WHERE is_current = true
//         (security_invoker view — RLS policies apply). If this returns 0 rows
//         the item was seeded but the view cannot serve it.
// Step 2: pathway + framework_config resolved by exam_family array containment.
//         If this returns 0 rows no pathway can deliver the seeded items.

async function verifyChain(): Promise<void> {
  console.log('\nRead-back: item → item_version(is_current) → pathway → framework_config')

  // step 1 — active items servable via v_item_current
  const { data: items, error: e1 } = await db
    .from('v_item_current')
    .select('id, lifecycle, exam_families')
    .eq('lifecycle', 'active')
    .eq('is_active', true)

  if (e1) die(`step 1 (v_item_current): ${e1.message}`)
  if (!items || items.length === 0) {
    die(
      'step 1: v_item_current returns 0 rows for lifecycle=active. ' +
        'Items were inserted but are not servable — ' +
        'check item_version.is_current=true and item.lifecycle=active.',
    )
  }
  console.log(`  ✓ step 1: ${items.length} active item(s) in v_item_current`)

  // step 2 — pathway + framework_config chain for the seeded exam_family
  const families = [
    ...new Set(
      items.flatMap((item) => (item.exam_families as string[]) ?? []),
    ),
  ]

  const { data: pathways, error: e2 } = await db
    .from('pathway')
    .select('id, slug, exam_family, framework_config:framework_config_id(id, exam_family)')
    .eq('is_active', true)
    .in('exam_family', families)

  if (e2) die(`step 2 (pathway → framework_config): ${e2.message}`)
  if (!pathways || pathways.length === 0) {
    die(
      `step 2: no active pathway found for exam_families [${families.join(', ')}]. ` +
        'Pathway was inserted but is not visible — ' +
        'check pathway.exam_family and is_active=true.',
    )
  }
  const pw = pathways[0]!
  console.log(`  ✓ step 2: pathway '${pw.slug}' → framework_config resolved`)

  console.log('\nseed-e2e: chain OK — E2E data is seeded and servable.')
  console.log(`  pathway_id for E2E specs: ${pw.id}`)
  console.log(`  Set E2E_TEST_PATHWAY_ID=${pw.id} in .env.e2e or CI secrets.`)
}

// ── main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('seed-e2e: seeding E2E fixture data...\n')
  await seedFrameworkConfig()
  await seedPathway()
  await seedItems()
  await seedItemVersions()
  await verifyChain()
}

main().catch((err: unknown) => {
  console.error('SEED ERROR:', err instanceof Error ? err.message : String(err))
  process.exit(1)
})
