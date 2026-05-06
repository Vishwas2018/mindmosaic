/**
 * Stage 19 e2e — happy path through the assessment-svc lifecycle.
 *
 * Flow (DEV_PLAN Stage 19 deliverable):
 *   1. Sign up a fresh student via auth-svc.
 *   2. POST /sessions/create — assert 201 + first item + lock_token.
 *   3. POST /sessions/{id}/respond × 5 — assert version + lock rotation.
 *   4. POST /sessions/{id}/submit — assert score returned.
 *   5. Assert outbox_event row exists with event_type='session.submitted'
 *      and processed_at IS NULL (Q-19.2 — Stage 20 picks up sync drain).
 *
 * Env required (set via .env.test or shell):
 *   E2E_BASE_URL          base URL for assessment-svc + auth-svc (e.g.
 *                         http://localhost:54321/functions/v1)
 *   E2E_SUPABASE_URL      Supabase REST URL (for outbox assertion)
 *   E2E_SUPABASE_ANON     Anon key for the API
 *   E2E_TEST_PATHWAY_ID   Pathway UUID seeded for the test tenant
 *   E2E_TEST_SERVICE_ROLE Service-role key for outbox query (skip if unset)
 *
 * If env vars are missing the spec is skipped — this allows the contract
 * tests to remain the authoritative gate while the full e2e is opt-in.
 */
import { expect, test } from '@playwright/test';

const E2E_BASE_URL = process.env['E2E_BASE_URL'];
const E2E_PATHWAY = process.env['E2E_TEST_PATHWAY_ID'];
const E2E_ANON = process.env['E2E_SUPABASE_ANON'];

test.skip(
  E2E_BASE_URL === undefined || E2E_PATHWAY === undefined || E2E_ANON === undefined,
  'Stage 19 e2e requires E2E_BASE_URL + E2E_TEST_PATHWAY_ID + E2E_SUPABASE_ANON',
);

test('session lifecycle — signup → 5 responses → submit → score returned + outbox row', async ({
  request,
}) => {
  const baseUrl = E2E_BASE_URL!;
  const pathwayId = E2E_PATHWAY!;
  const anon = E2E_ANON!;

  // ── 1. Sign up ───────────────────────────────────────────────────────────
  const email = `e2e-${Date.now()}@example.com`;
  const password = 'pw-' + Math.random().toString(36).slice(2);
  const signup = await request.post(`${baseUrl}/auth-svc/auth/signup`, {
    headers: {
      'Content-Type': 'application/json',
      apikey: anon,
    },
    data: { email, password, role: 'student' },
  });
  expect(signup.ok(), `signup body: ${await signup.text()}`).toBeTruthy();
  const signupJson = await signup.json();
  const accessToken = signupJson?.data?.access_token ?? signupJson?.access_token;
  expect(accessToken, 'access token from signup').toBeTruthy();

  // ── 2. Create session ────────────────────────────────────────────────────
  const create = await request.post(`${baseUrl}/assessment-svc/sessions/create`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'Idempotency-Key': crypto.randomUUID(),
      apikey: anon,
    },
    data: {
      pathway_id: pathwayId,
      assessment_profile_id: null,
      repair_sequence_id: null,
      assignment_id: null,
      mode: 'practice',
      target_skills: null,
    },
  });
  expect(create.ok(), `create body: ${await create.text()}`).toBeTruthy();
  const createBody = await create.json();
  const session = createBody?.data ?? createBody;
  const sessionId: string = session.session_id;
  let lockToken: string = session.lock_token;
  let version: number = session.version;
  let nextItem = session.first_item;

  // ── 3. 5 responses ───────────────────────────────────────────────────────
  for (let i = 0; i < 5; i += 1) {
    const respond = await request.post(
      `${baseUrl}/assessment-svc/sessions/${sessionId}/respond`,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
          'X-Session-Lock': lockToken,
          'Idempotency-Key': crypto.randomUUID(),
          apikey: anon,
        },
        data: {
          item_id: nextItem.item_id,
          response_data: { option_id: 'a' },
          telemetry: {
            time_to_answer_ms: 5000,
            time_to_first_action_ms: 500,
            answer_changes: 0,
            items_since_session_start: i + 1,
            time_since_session_start_ms: 5000 * (i + 1),
            skipped_then_returned: false,
            scroll_to_bottom: null,
          },
          expected_version: version,
        },
      },
    );
    expect(respond.ok(), `respond ${i} body: ${await respond.text()}`).toBeTruthy();
    const r = await respond.json();
    const rd = r?.data ?? r;
    expect(rd.lock_token, 'lock_token rotated').not.toBe(lockToken);
    expect(rd.version, 'version bumped').toBeGreaterThan(version);
    lockToken = rd.lock_token;
    version = rd.version;
    if (rd.next_item === null) break;
    nextItem = rd.next_item;
  }

  // ── 4. Submit ────────────────────────────────────────────────────────────
  const submit = await request.post(
    `${baseUrl}/assessment-svc/sessions/${sessionId}/submit`,
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        'Idempotency-Key': crypto.randomUUID(),
        apikey: anon,
      },
    },
  );
  expect(submit.ok(), `submit body: ${await submit.text()}`).toBeTruthy();
  const sb = await submit.json();
  const submitData = sb?.data ?? sb;
  expect(submitData.status).toBe('submitted');
  expect(submitData.score).toBeDefined();
  // Stage 20 (Q-20.1, ADR-0027): when intelligence-svc is reachable inline,
  // pipeline_status flips to 'sync_complete'; on timeout / error it stays
  // 'pending' (soft-fallback per Q-20.15). Both are valid e2e outcomes.
  expect(['sync_complete', 'pending']).toContain(submitData.pipeline_status);

  // ── 5. Outbox assertion (Q-19.2) ─────────────────────────────────────────
  // Requires service-role key. Skip if not provided — the contract test
  // covers the outbox write at unit level; this is the integration check.
  const serviceKey = process.env['E2E_TEST_SERVICE_ROLE'];
  const supabaseUrl = process.env['E2E_SUPABASE_URL'];
  if (serviceKey !== undefined && supabaseUrl !== undefined) {
    const outboxQuery = await request.get(
      `${supabaseUrl}/rest/v1/outbox_event?aggregate_id=eq.${sessionId}&select=event_type,processed_at`,
      {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
      },
    );
    expect(outboxQuery.ok()).toBeTruthy();
    const rows = (await outboxQuery.json()) as Array<{
      event_type: string;
      processed_at: string | null;
    }>;
    expect(rows.length, 'one outbox row per submit').toBeGreaterThanOrEqual(1);
    expect(rows[0]?.event_type).toBe('session.submitted');
    expect(rows[0]?.processed_at).toBeNull();
  }
});
