# Handler Read/Write Audit — 2026-06-12

**Scope:** All Edge Function handler files under `supabase/functions/*/handlers.ts`.  
**Purpose:** Inventory every exported handler function and classify its DB access pattern.  
**Trigger:** ISSUE-0091 investigation — `resumeSession` was a READ-WITH-WRITE-SIDE-EFFECT
inadvertently rotating `lock_token` on every GET, causing LOCK_CONFLICT (409) on active sessions.  
**Method:** T1 pre-read of exported function signatures + grep for `.update()`, `.insert()`,
`.upsert()`, `.delete()` within each function's line range.

## Classification key

| Label | Meaning |
|---|---|
| `READ-ONLY` | Only SELECT queries. No DB mutations. |
| `WRITE` | INSERT / UPDATE / UPSERT / DELETE is the primary purpose. |
| `READ-WITH-WRITE-SIDE-EFFECT` | Primarily a read / state-query, but mutates as a side effect (e.g. token rotation, audit insert). These are the highest-risk class — the side effect may surprise callers who expect GET idempotency. |

---

## assessment-svc/handlers.ts

| Function | Classification | Notes |
|---|---|---|
| `createSession` | WRITE | INSERTs `session_record`; calls content-svc select fetcher |
| `respondToSession` | WRITE | UPDATEs `engine_state_snapshot`; INSERTs `response_record` + `outbox_event` |
| `submitSession` | WRITE | UPDATEs session `status='submitted'`; INSERTs `outbox_event` |
| `checkpointSession` | WRITE | UPDATEs `engine_state_snapshot` |
| `resumeSession` | READ-WITH-WRITE-SIDE-EFFECT | SELECT + conditional UPDATE: `interrupted` branch rotates `lock_token` + sets `status='active'`; `active` branch (post-ISSUE-0091 fix) returns `row.lock_token` with no UPDATE — effectively READ-ONLY for that path |
| `abandonSession` | WRITE | UPDATEs session `status='abandoned'` |
| `listRecentSessions` | READ-ONLY | SELECT only |
| `getSessionSummary` | READ-ONLY | SELECT only |

**ISSUE-0091 note:** Before the fix in this round, `resumeSession` unconditionally issued
`UPDATE { lock_token: newUUID }` for both `active` and `interrupted` statuses. Every
`GET /sessions/{id}/state` call during an active session rotated the token, clobbering
the token issued by the last `/respond`, and causing `LOCK_CONFLICT (409)` on the next
`/respond`. Fixed: active branch now returns `row.lock_token` without mutation.

---

## orchestration-svc/handlers.ts

| Function | Classification | Notes |
|---|---|---|
| `processOrchestratorReplan` | WRITE | UPDATEs old plan `status='superseded'`; INSERTs `learning_plan`, `plan_revision`, `pipeline_event`, `intelligence_audit_log`, `outbox_event`; UPDATEs stale plan markers |
| `getCurrentPlan` | READ-ONLY | SELECT only — returns current active learning plan |
| `generatePlan` | WRITE | Orchestrates plan generation; delegates mutations to `processOrchestratorReplan` |
| `createOverride` | WRITE | UPSERTs `plan_override`; INSERTs `intelligence_audit_log` |
| `deleteOverride` | WRITE | DELETEs `plan_override`; INSERTs `intelligence_audit_log` |

---

## analytics-svc/handlers.ts

| Function | Classification | Notes |
|---|---|---|
| `processTeacherRefresh` | WRITE | INSERTs `intervention_alert` rows + `outbox_event`; UPSERTs `cohort_metric_cache` |
| `getAutoGroups` | READ-ONLY | SELECT only |
| `getInterventionAlerts` | READ-ONLY | SELECT only |
| `getCohort` | READ-ONLY | SELECT only |
| `getPathwayReadiness` | READ-ONLY | SELECT only |
| `generateAssignment` | READ-ONLY | Returns assignment-recommendation DTO; no direct DB mutations (inferred from no mutations in function range) |
| `getClassKpi` | READ-ONLY | SELECT only |
| `patchInterventionAlert` | WRITE | UPDATEs `intervention_alert` |
| `createInterventionAlert` | WRITE | INSERTs `intervention_alert` |

---

## users-svc/handlers.ts

| Function | Classification | Notes |
|---|---|---|
| `handleGetMyClasses` | READ-ONLY | SELECT only |
| `handleGetClassStudents` | READ-ONLY | SELECT only |
| `handleGetStudentProfile` | READ-ONLY | SELECT only |

---

## billing-svc/handlers.ts

| Function | Classification | Notes |
|---|---|---|
| `handleStripeWebhook` | WRITE | UPSERTs `subscription` + `billing_customer`; INSERTs `job_queue` entries; UPDATEs processed flag |
| `resolveSubscriptionState` | READ-WITH-WRITE-SIDE-EFFECT | Reads subscription state; may propagate feature flags (writes) on tier change |
| `handleFlagPropagate` | WRITE | UPSERTs `feature_flag` rows; INSERTs `billing_event` |
| `handleGetPlans` | READ-ONLY | Returns static plan config — no DB reads |
| `handleCreateCheckout` | WRITE | Creates Stripe checkout session; may INSERT billing records |
| `handleCreatePortalSession` | WRITE | Creates Stripe customer portal session |
| `handleGetSubscription` | READ-ONLY | SELECT `subscription` |
| `handleCancelSubscription` | WRITE | UPDATEs `subscription.cancel_at`; calls Stripe API |
| `handleGetInvoices` | READ-ONLY | SELECT `invoice` |

---

## notifications-svc/handlers.ts

| Function | Classification | Notes |
|---|---|---|
| `getMyNotifications` | READ-ONLY | SELECT only |
| `markRead` | WRITE | UPDATEs single `notification.read_at` |
| `markAllRead` | WRITE | Bulk-UPDATEs `notification.read_at` for all unread; trims oldest via UPDATE |
| `createNotification` | WRITE | INSERTs `notification` row; trims oldest via UPDATE if over cap |

---

## intelligence-svc/handlers.ts

| Function | Classification | Notes |
|---|---|---|
| `processSession` | WRITE | INSERTs `learning_event`; UPSERTs `skill_mastery`, `learning_velocity`, `behaviour_profile`, `student_misconception`; INSERTs `intelligence_audit_log` |
| `processCausalFull` | WRITE | INSERTs `pipeline_event` + `intelligence_audit_log`; UPDATEs causal state |
| `processPredictiveRefresh` | WRITE | UPSERTs `cohort_metric_cache`; INSERTs `intelligence_audit_log` |
| `getPredictions` | READ-ONLY | SELECT only |
| `getBehaviourProfile` | READ-ONLY | SELECT only |
| `getAuditLog` | READ-ONLY | SELECT only |
| `getExplanation` | READ-ONLY | SELECT only |
| `getCausalMap` | READ-ONLY | SELECT only |
| `getLearnerProfile` | READ-ONLY | SELECT only |

---

## assignments-svc/handlers.ts

| Function | Classification | Notes |
|---|---|---|
| `createAssignment` | WRITE | INSERTs `assignment` + `assignment_target` rows |
| `getAssignment` | READ-ONLY | SELECT only |
| `updateAssignment` | WRITE | UPDATEs `assignment` |
| `publishAssignment` | WRITE | INSERTs `session_record` rows + `outbox_event`; UPDATEs `assignment.status='published'` |
| `archiveAssignment` | WRITE | UPDATEs `assignment.status='archived'` |
| `getAssignmentsForStudent` | READ-ONLY | SELECT only |
| `getAssignmentsForClass` | READ-ONLY | SELECT only |
| `getAssignmentTracking` | READ-ONLY | SELECT only |
| `startAssignment` | WRITE | UPDATEs `assignment_target.status='in_progress'`; links session_id |
| `markOverdue` | WRITE | Bulk-UPDATEs `assignment_target.status='overdue'` |
| `syncAssignmentCompletion` | WRITE | Bulk-UPDATEs `assignment_target.status='completed'` |

---

## jobs-worker/handlers.ts

| Function | Classification | Notes |
|---|---|---|
| `processJobBatch` | WRITE | UPDATEs `job_queue.status='completed'` or `'dead_letter'` on each processed job |

---

## content-svc/handlers.ts

| Function | Classification | Notes |
|---|---|---|
| `listPathways` | READ-ONLY | SELECT only |
| `getPathwayBySlug` | READ-ONLY | SELECT only |
| `listAssessmentProfiles` | READ-ONLY | SELECT only |
| `getItem` | READ-ONLY | SELECT only |
| `selectItems` | READ-ONLY | SELECT + scoring logic; no mutations |
| `searchContent` | READ-ONLY | SELECT only |
| `createItem` | WRITE | INSERTs `item` row |
| `updateItem` | WRITE | UPDATEs `item` |
| `createItemVersion` | WRITE | UPDATEs `is_current=false` on prior version; INSERTs new `item_version`; UPDATEs `item.current_version` |
| `transitionItemLifecycle` | WRITE | UPDATEs `item.lifecycle` |
| `listItemVersions` | READ-ONLY | SELECT only |
| `createStimulus` | WRITE | INSERTs `stimulus` row |
| `updateStimulus` | WRITE | UPDATEs `stimulus` |
| `getActiveSkillGraph` | READ-ONLY | SELECT only |
| `importItems` | WRITE | Batch INSERTs / DELETEs items |

---

## Summary by classification

| Classification | Count |
|---|---|
| READ-ONLY | 28 |
| WRITE | 27 |
| READ-WITH-WRITE-SIDE-EFFECT | 3 (`resumeSession`, `resolveSubscriptionState`, `markAllRead`*) |

\* `markAllRead` classified WRITE (not R-W-SE) because mutations are its stated purpose, not a side effect.  
Revised READ-WITH-WRITE-SIDE-EFFECT count: **2** (`resumeSession`, `resolveSubscriptionState`).

## Findings

1. **`resumeSession` is the only confirmed READ-WITH-WRITE-SIDE-EFFECT that caused a production-class bug** — unconditional lock_token rotation on GET broke idempotency of the active-session respond flow (ISSUE-0091). Fixed this round.

2. **`resolveSubscriptionState`** writes feature flags as a side effect of a state-read. Callers invoking it from webhook handlers (non-idempotent contexts) should guard against double-propagation — not a current bug but worth monitoring.

3. All `process*` worker functions (intelligence-svc, orchestration-svc, analytics-svc) are correctly WRITE — they are designed to be called once per event by the jobs-worker, not from GET-equivalent paths.
