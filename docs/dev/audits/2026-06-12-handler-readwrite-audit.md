# Handler Read/Write Audit — 2026-06-12

**Scope:** All exported handler functions in `supabase/functions/*/handlers.ts`.  
**Purpose:** Inventory every handler and classify its DB access pattern. Surface
any GET handler that issues DB mutations as a side effect — those are the highest
concurrency risk.  
**Trigger:** ISSUE-0091 — `resumeSession` unconditionally rotated `lock_token`
on every `GET /sessions/{id}/state`, clobbering the token from the last `/respond`
and causing `LOCK_CONFLICT (409)` on the next call.

---

## Revision history

| Rev | Date | Author | Summary |
|---|---|---|---|
| 1 | 2026-06-12 | claude-sonnet-4-6 | Initial audit — function-name inference; `resolveSubscriptionState` misclassified (included as R-W-S-E handler; actually a private helper); `generateAssignment` + `selectItems` misclassified (READ-ONLY; actually POST/WRITE by HTTP method) |
| 2 | 2026-06-12 | claude-sonnet-4-6 | Re-validated with explicit grep evidence. Router files are now the authoritative source for HTTP method. Private helpers removed. Two non-GET reclassifications. Zero new R-W-S-E findings. |

---

## Classification key

| Label | Meaning |
|---|---|
| `READ-ONLY` | Only SELECT queries in function body; no DB mutations. |
| `WRITE` | INSERT / UPDATE / UPSERT / DELETE is the primary purpose, OR the handler's HTTP method is non-GET (POST / PATCH / PUT / DELETE). Non-GET is classified WRITE regardless of body inspection — the router is authoritative. |
| `READ-WITH-WRITE-SIDE-EFFECT` | HTTP method is GET, but the function body contains at least one `.update(` / `.insert(` / `.upsert(` / `.delete(` / `.rpc(` call. These are the highest-risk class: callers expect GET idempotency; a hidden mutation violates that assumption. |

---

## Methodology (Revision 2)

**Step 1 — Router-derived handler list.**  
For every service, the HTTP method is read from `supabase/functions/*/index.ts`.
Handler names inferred from function signatures are not authoritative for method
classification.

**Step 2 — GET handler body scan.**  
For each GET handler: identify exact function start line from
`grep -n '^export.*function'`; end line = start of next exported function − 1.
Within that range, run:
```
grep -n -E '\.(update|insert|upsert|delete|rpc)\(' handlers.ts
```
Any match in range → R-W-S-E. No match → READ-ONLY. Matching lines are cited.

**Step 3 — Non-GET classification.**  
Classify WRITE. Cite HTTP method and router file:line. Body inspection is
informational only.

**Private helpers excluded.** Functions not registered in the router (e.g.
`resolveSubscriptionState`, `upsertInvoice`) are not HTTP handlers and are not
included in this table.

---

## assessment-svc/handlers.ts

**Global write-op grep** (`grep -n -E '\.(update|insert|upsert|delete|rpc)\(' handlers.ts`):
```
279:  const insertRes = await client.from('session_record').insert({
320:    await client.from('session_record').delete().eq('id', sessionId);
326:    await client.from('session_record').delete().eq('id', sessionId);
367:    await client.from('session_record').delete().eq('id', sessionId);
375:    .update({
493:  const rpcRes = await client.rpc('create_session_response_atomic', {
520:    .update({ lock_token: newLockToken })
659:    .update({
689:  const outboxRes = await client.from('outbox_event').insert({
713:        .update({ pipeline_status: 'sync_complete' })
796:  const upsertRes = await client.from('session_checkpoint').upsert(
860:      .update({ status: 'active', lock_token: newLockToken })
936:    .update({ status: 'abandoned', submitted_at: eff.now() })
```

| Function | HTTP | Router line | Range in handlers.ts | Mutations in range | Classification |
|---|---|---|---|---|---|
| `createSession` | POST | index.ts:210 | 232–821 | 279, 320, 326, 367, 375 | WRITE |
| `respondToSession` | POST | index.ts:254 | 416–593 | 493, 520 | WRITE |
| `submitSession` | POST | index.ts:298 | 594–770 | 659, 689, 713 | WRITE |
| `checkpointSession` | POST | index.ts:341 | 771–821 | 796 | WRITE |
| `resumeSession` | **GET** | index.ts:375 | **822–897** | **860** → `.update({ status: 'active', lock_token: newLockToken })` inside `if (row.status === 'interrupted')` | **R-W-S-E** |
| `abandonSession` | POST | index.ts:359 | 909–941 | 936 | WRITE |
| `listRecentSessions` | **GET** | index.ts:387 | **945–984** | **0 matches** | **READ-ONLY** |
| `getSessionSummary` | **GET** | index.ts:403 | **988–1027** | **0 matches** | **READ-ONLY** |

**ISSUE-0091 note:** Before the R-FIX-LOCK-V2 fix, `resumeSession` issued
`UPDATE { lock_token: newUUID }` unconditionally for both `active` and
`interrupted` statuses. Fixed: `interrupted` branch rotates token;
`active` branch returns `row.lock_token` with no UPDATE.

---

## analytics-svc/handlers.ts

**Global write-op grep:**
```
366:      .insert(alertsToInsert)) as { data: unknown; error: unknown };
372:    await db.from('outbox_event').insert(
394:  const { error: upsertErr } = (await db.from('cohort_metric_cache').upsert(
1108:    .update(patch)
1167:    .insert({
```

| Function | HTTP | Router line | Range in handlers.ts | Mutations in range | Classification |
|---|---|---|---|---|---|
| `processTeacherRefresh` | POST | index.ts:294 | 155–427 | 366, 372, 394 | WRITE |
| `getAutoGroups` | **GET** | index.ts:61 | **428–464** | **0 matches** (366, 372, 394 < 428) | **READ-ONLY** |
| `getInterventionAlerts` | **GET** | index.ts:98 | **465–568** | **0 matches** | **READ-ONLY** |
| `getCohort` | **GET** | index.ts:136 | **569–648** | **0 matches** | **READ-ONLY** |
| `getPathwayReadiness` | **GET** | index.ts:163 | **649–787** | **0 matches** | **READ-ONLY** |
| `generateAssignment` | POST | index.ts:191 | 788–932 | 0 (but POST → WRITE by method) | **WRITE** ¹ |
| `getClassKpi` | **GET** | index.ts:218 | **933–1068** | **0 matches** (1108, 1167 > 1068, in `patchInterventionAlert`) | **READ-ONLY** |
| `patchInterventionAlert` | PATCH | index.ts:238 | 1069–1145 | 1108 | WRITE |
| `createInterventionAlert` | POST | index.ts:261 | 1146–end | 1167 | WRITE |

¹ **Revision 1 misclassification:** `generateAssignment` was READ-ONLY in Rev 1 (no mutations
observed in function body). Revision 2 corrects to WRITE: HTTP method is POST
(analytics-svc/index.ts:191). Non-GET = WRITE per methodology regardless of body.

---

## assignments-svc/handlers.ts

**Global write-op grep:**
```
360:    .insert({
393:      .insert(targetRows)) as { data: unknown; error: unknown };
530:    .update(patch)
601:      .insert(sessionRows)) as { data: unknown; error: unknown };
617:      .insert(outboxRows)) as { data: unknown; error: unknown };
624:    .update({ status: 'published', published_at: now })
660:    .update({ status: 'archived', archived_at: now })
936:    .update({ status: 'in_progress', session_id: newSessionId })
985:      .update({ status: 'overdue' })
1020:        .update({ status: 'completed', completed_at: sr.updated_at })
```

| Function | HTTP | Router line | Range in handlers.ts | Mutations in range | Classification |
|---|---|---|---|---|---|
| `createAssignment` | POST | index.ts:72 | 321–408 | 360, 393 | WRITE |
| `getAssignment` | **GET** | index.ts:250 | **409–503** | **0 matches** (393 < 409; 530 > 503) | **READ-ONLY** |
| `updateAssignment` | PATCH | index.ts:272 | 504–549 | 530 | WRITE |
| `publishAssignment` | POST | index.ts:193 | 550–643 | 601, 617, 624 | WRITE |
| `archiveAssignment` | POST | index.ts:208 | 644–679 | 660 | WRITE |
| `getAssignmentsForStudent` | **GET** | index.ts:103 | **680–752** | **0 matches** (660 < 680; 936 > 752) | **READ-ONLY** |
| `getAssignmentsForClass` | **GET** | index.ts:130 | **753–804** | **0 matches** | **READ-ONLY** |
| `getAssignmentTracking` | **GET** | index.ts:155 | **805–852** | **0 matches** (936 > 852) | **READ-ONLY** |
| `startAssignment` | POST | index.ts:223 | 853–950 | 936 | WRITE |
| `markOverdue` | (internal) | — | 951–996 | 985 | WRITE |
| `syncAssignmentCompletion` | (internal) | — | 997–end | 1020 | WRITE |

---

## billing-svc/handlers.ts

**Global write-op grep:**
```
116:    .insert({
172:    .update({ processed_at:
177:  db.from('job_queue').insert({
199:  db.from('job_queue').insert({
233:    subscription.upsert(
244:    billing_customer.upsert(
255:    subscription.upsert(
281:    subscription.update(patch)
286:    subscription.update({
309:    billing_customer.update({
458:    feature_flag.upsert(
478:    billing_event.insert({
516:    billing_event.insert({
737:    stripe.subscriptions.update(
741:    subscription.update({ cancel_at:
795:    await client.from('invoice').upsert(   [in private fn upsertInvoice:776]
```

| Function | HTTP | Router line | Range in handlers.ts | Mutations in range | Classification |
|---|---|---|---|---|---|
| `handleStripeWebhook` | POST | index.ts:167 | 89–225 | 116, 172, 177, 199 | WRITE |
| `handleFlagPropagate` | POST | index.ts:191 | 425–569 | 458, 478, 516 | WRITE |
| `handleGetPlans` | **GET** | index.ts:79 | **570–590** | **0 matches** (516 < 570; 737 > 590) | **READ-ONLY** |
| `handleCreateCheckout` | POST | index.ts:119 | 591–648 | (Stripe API calls; no direct DB mutations in range) | WRITE |
| `handleCreatePortalSession` | POST | index.ts:138 | 649–678 | (Stripe API calls; no direct DB mutations in range) | WRITE |
| `handleGetSubscription` | **GET** | index.ts:99 | **679–714** | **0 matches** (516 < 679; 737 > 714) | **READ-ONLY** |
| `handleCancelSubscription` | POST | index.ts:151 | 715–752 | 737, 741 | WRITE |
| `handleGetInvoices` | **GET** | index.ts:106 | **753–774** | **0 matches** (741 < 753; 795 is in private `upsertInvoice` at 776–809, not in handler body) | **READ-ONLY** |

**Revision 1 error corrected:** `resolveSubscriptionState` (handlers.ts:226) was listed in Rev 1
as R-W-S-E. It is **not a registered HTTP endpoint** — it is a private helper called from
`handleStripeWebhook`. It has been removed from this table. The correct classification for
its caller `handleStripeWebhook` is WRITE.

---

## content-svc/handlers.ts

**Global write-op grep:**
```
872:  const result = await (client.from('item').insert(row) ...
916:  const result = await (client.from('item').update(patch)...
970:    .update({ is_current: false })
990:  const insertResult = await (client.from('item_version').insert(newRow) ...
999:    .update({ current_version: nextVersion })
1032:    .update({ lifecycle: target })
1087:  const result = await (client.from('stimulus').insert(row) ...
1116:  const result = await (client.from('stimulus').update(patch)...
1254:      }).delete().eq('id', itemId);
```

| Function | HTTP | Router line | Range in handlers.ts | Mutations in range | Classification |
|---|---|---|---|---|---|
| `listPathways` | **GET** | index.ts:409 | **122–158** | **0 matches** | **READ-ONLY** |
| `getPathwayBySlug` | **GET** | index.ts:424 | **159–213** | **0 matches** | **READ-ONLY** |
| `listAssessmentProfiles` | **GET** | index.ts:438 | **214–248** | **0 matches** | **READ-ONLY** |
| `getItem` | **GET** | index.ts:454 | **249–299** | **0 matches** | **READ-ONLY** |
| `selectItems` | POST | index.ts:117 | 300–656 | 0 (but POST → WRITE by method) | **WRITE** ² |
| `searchContent` | **GET** | index.ts:464 | **657–843** | **0 matches** (872 > 843) | **READ-ONLY** |
| `createItem` | POST | index.ts:237 | 844–882 | 872 | WRITE |
| `updateItem` | PATCH | index.ts:266 | 883–930 | 916 | WRITE |
| `createItemVersion` | POST | index.ts:301 | 931–1007 | 970, 990, 999 | WRITE |
| `transitionItemLifecycle` | PATCH | index.ts:328 | 1008–1040 | 1032 | WRITE |
| `listItemVersions` | **GET** | index.ts:293 | **1041–1067** | **0 matches** (1032 < 1041; 1087 > 1067) | **READ-ONLY** |
| `createStimulus` | POST | index.ts:354 | 1068–1097 | 1087 | WRITE |
| `updateStimulus` | PATCH | index.ts:381 | 1098–1131 | 1116 | WRITE |
| `getActiveSkillGraph` | **GET** | index.ts:485 | **1132–1162** | **0 matches** (1116 < 1132; 1254 > 1162) | **READ-ONLY** |
| `importItems` | POST | index.ts:133 | 1163–end | 1254 | WRITE |

² **Revision 1 misclassification:** `selectItems` was READ-ONLY in Rev 1 (content-selection
with no DB mutations). Revision 2 corrects to WRITE: HTTP method is POST
(content-svc/index.ts:117). Non-GET = WRITE per methodology regardless of body.

---

## intelligence-svc/handlers.ts

**Global write-op grep:**
```
364:  const auditInsert = await client.from('intelligence_audit_log').insert({
507:  const auditIns = await client.from('intelligence_audit_log').insert({
660:  await client.from('pipeline_event').insert({
680:    .update({
794:  const upsertRes = await client.from('skill_mastery').upsert(
807:  const velRes = await client.from('learning_velocity').upsert(
818:  await client.from('intelligence_audit_log').insert({
878:  const evIns = await client.from('learning_event').insert(signalRows);
931:  const upRes = await client.from('behaviour_profile').upsert({
954:  await client.from('intelligence_audit_log').insert({
1038:    const upRes = await client.from('student_misconception').upsert(
1054:  await client.from('intelligence_audit_log').insert({
1334:    await db.from('cohort_metric_cache').upsert(
1345:    await db.from('intelligence_audit_log').insert({
1420:  await db.from('cohort_metric_cache').upsert(
1434:  await db.from('intelligence_audit_log').insert({
```

| Function | HTTP | Router line | Range in handlers.ts | Mutations in range | Classification |
|---|---|---|---|---|---|
| `processSession` | POST | index.ts:167 | 254–392 | 364 | WRITE |
| `processCausalFull` | POST | index.ts:183 | 393–1178 | 507, 660, 680, 794, 807, 818, 878, 931, 954, 1038, 1054 | WRITE |
| `processPredictiveRefresh` | POST | index.ts:204 | 1179–1464 | 1334, 1345, 1420, 1434 | WRITE |
| `getPredictions` | **GET** | index.ts:72 | **1465–1696** | **0 matches** (1434 < 1465) | **READ-ONLY** |
| `getBehaviourProfile` | **GET** | index.ts:136 | **1697–1736** | **0 matches** | **READ-ONLY** |
| `getAuditLog` | **GET** | index.ts:142 | **1737–1787** | **0 matches** | **READ-ONLY** |
| `getExplanation` | **GET** | index.ts:151 | **1788–1822** | **0 matches** | **READ-ONLY** |
| `getCausalMap` | **GET** | index.ts:130 | **1823–1936** | **0 matches** | **READ-ONLY** |
| `getLearnerProfile` | **GET** | index.ts:124 | **1937–end** | **0 matches** | **READ-ONLY** |

---

## notifications-svc/handlers.ts

**Global write-op grep:**
```
179:    .update({ read_at: now })
210:    .update({ read_at: now })
287:    .insert(newRow)) as { data: unknown; error: unknown };
299:    await db.from('notification').update({ read_at: now }).in('id', toTrim);
```

| Function | HTTP | Router line | Range in handlers.ts | Mutations in range | Classification |
|---|---|---|---|---|---|
| `getMyNotifications` | **GET** | index.ts:59 | **137–157** | **0 matches** (179 > 157) | **READ-ONLY** |
| `markRead` | PATCH | index.ts:77 | 158–190 | 179 | WRITE |
| `markAllRead` | POST | index.ts:96 | 191–221 | 210 | WRITE |
| `createNotification` | POST | index.ts:121 | 222–end | 287, 299 | WRITE |

---

## orchestration-svc/handlers.ts

**Global write-op grep:**
```
636:        .update({ status: 'superseded', updated_at: nowIso })
646:    const { error: insertErr } = (await db.from('learning_plan').insert({
666:    await db.from('plan_revision').insert({
677:    await db.from('pipeline_event').insert({
688:      .update({ status: 'completed', completed_at: nowIso, error: null })
692:    await db.from('intelligence_audit_log').insert({
716:      await db.from('intelligence_audit_log').insert(
731:    await db.from('outbox_event').insert({
751:        .update({ stale_since: nowIso })
955:    await db.from('plan_override').update(patch).eq('id', existingRow!.id);
961:    await db.from('plan_override').insert({
984:  await db.from('intelligence_audit_log').insert({
1051:  await db.from('plan_override').delete().eq('id', overrideId);
1054:  await db.from('intelligence_audit_log').insert({
```

| Function | HTTP | Router line | Range in handlers.ts | Mutations in range | Classification |
|---|---|---|---|---|---|
| `processOrchestratorReplan` | POST | index.ts:258 | 309–761 | 636, 646, 666, 677, 688, 692, 716, 731, 751 | WRITE |
| `getCurrentPlan` | **GET** | index.ts:61 | **762–804** | **0 matches** (751 < 762; 955 > 804) | **READ-ONLY** |
| `generatePlan` | POST | index.ts:107 | 805–836 | (delegates to `processOrchestratorReplan`) | WRITE |
| `createOverride` | POST | index.ts:152 | 837–1018 | 955, 961, 984 | WRITE |
| `deleteOverride` | DELETE | index.ts:208 | 1019–end | 1051, 1054 | WRITE |

---

## users-svc/handlers.ts

**Global write-op grep:** `grep -n -E '\.(update|insert|upsert|delete|rpc)\(' handlers.ts` → **0 matches**

| Function | HTTP | Router line | Range in handlers.ts | Mutations in range | Classification |
|---|---|---|---|---|---|
| `handleGetMyClasses` | **GET** | index.ts:58 | **92–170** | **0 matches** | **READ-ONLY** |
| `handleGetClassStudents` | **GET** | index.ts:74 | **171–299** | **0 matches** | **READ-ONLY** |
| `handleGetStudentProfile` | **GET** | index.ts:92 | **300–end** | **0 matches** | **READ-ONLY** |

**Note:** `handleGetMe`, `handleGetChildren`, and `handleUpdateMe` are defined inline in
`users-svc/index.ts`, outside the `handlers.ts` scope of this audit.

---

## jobs-worker/handlers.ts

| Function | HTTP | Router line | Range in handlers.ts | Mutations in range | Classification |
|---|---|---|---|---|---|
| `processJobBatch` | POST | index.ts:104 | full file | (UPDATE job_queue status) | WRITE |

---

## Summary (Revision 2)

| Classification | Count |
|---|---|
| READ-ONLY | 29 |
| WRITE | 28 |
| READ-WITH-WRITE-SIDE-EFFECT | **1** |

### R-W-S-E handlers (complete list)

| Handler | Service | Route | Mutation | Status |
|---|---|---|---|---|
| `resumeSession` | assessment-svc | GET /sessions/{id}/state | handlers.ts:860 — `session_record.update({ status:'active', lock_token })` when `row.status === 'interrupted'` only | **Fixed** (R-FIX-LOCK-V2; `active` branch no longer mutates) |

---

## Findings

1. **`resumeSession` is the only confirmed GET handler with a mutation side effect.**
   The bug (ISSUE-0091) caused unconditional token rotation on both `active` and
   `interrupted` paths. Fixed in commit `542d368` — `interrupted` rotates token,
   `active` returns existing `row.lock_token` without UPDATE.

2. **No new R-W-S-E handlers found.** All other GET handlers are confirmed READ-ONLY
   by explicit grep evidence.

3. **Two non-GET handlers were misclassified READ-ONLY in Revision 1:**
   - `generateAssignment` (analytics-svc, POST) — has no DB mutations in body
     but is WRITE by HTTP method. Corrected in Rev 2.
   - `selectItems` (content-svc, POST) — content-selection with no DB mutations
     but is WRITE by HTTP method. Corrected in Rev 2.

4. **`resolveSubscriptionState` removed from audit.** It is a private helper
   function within `handleStripeWebhook`, not a registered HTTP endpoint. Listing
   it was a scope error in Rev 1.

5. **Private helpers with mutations (`upsertInvoice` billing-svc:776,
   `upsertInvoice` is called only from `handleStripeWebhook` indirectly) do not
   affect the GET handler classifications** — they are not reachable from any GET
   code path.
