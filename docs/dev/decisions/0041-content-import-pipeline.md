# ADR-0041 — Content Import Pipeline Patterns

- Status: accepted
- Date: 2026-05-19
- Stage: v1.1-S6 prep
- Tags: backend | data | security | dx

## Context

v1.1 Stage 6 (Bulk Content Import Pipeline + Authoring Spec Templates) is the first content-operation
stage. Stages S1–S5 built the machinery (content-svc CRUD, lifecycle FSM, Zod-validated write paths at
b3eb668). S6 builds the leverage point: a batch import pipeline that lets content operators populate the
item bank at scale, and authoring spec templates that define the format contract for original items.

Spec §21.2 Content Service names `POST /content/import` as the key endpoint: "Bulk import items from JSON
(admin, with dry-run validation)." The v1.1-phase-plan.md §S6 describes the deliverables as a "Batch
import endpoint / script — `POST /content/items/batch` or a `scripts/import-items.ts`." These two sources
name different paths; spec §21.2 is authoritative (Q-1.1-6.2 resolution).

The copyright constraint from v1.1-phase-plan.md §Critical constraint is binding on every part of S6 and S7:

> "NAPLAN and ICAS are real, copyrighted assessment products with protected names. The content operation
> produces **original items only** — written fresh to match the _format, year-level curriculum strand,
> difficulty band, and question type_ of those assessments, without reproducing any actual past-paper item.
> No scraping of past papers, no licensed-bank ingestion, no copying. This constraint shapes every part of
> S6 and S7. It is not optional and not negotiable; treat it with the same weight as the child-safety and
> security non-negotiables in CLAUDE.md."

Five decisions were deferred to S6 morning ritual (v1.1-phase-plan.md §Open decisions). All five were
resolved via T3 round-trips on 2026-05-19, recorded in Q-1.1-6.1–6.6. This ADR documents those decisions
and their implementation consequences.

## Options considered

### Decision 1 — Batch import mechanism: HTTP endpoint shape (Q-1.1-6.1, Q-1.1-6.2)

1. **Option A — `POST /content/import` HTTP endpoint** — primary delivery mechanism; spec §21.2
   authoritative. Pattern G strict (platform_admin + service-role). Idempotency-Key required. Dry-run
   mode (`?dry_run=true`). No standalone script in S6 scope.
2. **Option B — `scripts/import-items.ts` service-role script** — avoids HTTP overhead; no
   Idempotency-Key required; simpler auth model. Pros: no new endpoint. Cons: non-authoritative per spec;
   no idempotency; harder to test as contract.
3. **Option C — Both** — HTTP endpoint + script wrapper. Pros: convenience. Cons: unneeded scope in S6.

### Decision 2 — Manifest copyright guardrail (Q-1.1-6.3 sub-question i)

1. **`copyright_declaration: z.literal('original')` required field** — manifest Zod schema rejects any
   item without explicit declaration. 422 on missing/invalid.
2. **No declaration field; lifecycle FSM gate only** — `draft → review` transition is the enforcement
   point; relies entirely on human review.
3. **Optional declaration field** — present but not required.

### Decision 3 — Duplicate-similarity check depth (Q-1.1-6.3 sub-question ii)

1. **Exact-match SHA of normalised stem JSON** — hash the `stem` JSON (keys sorted, whitespace
   normalised); compare against existing `item_version.stem` SHAs. O(1) lookup per item. Does not
   detect near-duplicates or paraphrase.
2. **Fuzzy / embedding-based check** — semantic similarity via pgvector embeddings or MinHash shingling.
   Catches near-duplicates. Requires additional infrastructure.

### Decision 4 — Legal review ownership (Q-1.1-6.3 sub-question iii)

Operational ownership question only; no code option. Owner = operator-side.

### Decision 5 — assessment-svc ISSUE-0042 carry (Q-1.1-6.4)

1. **Fix in S6** — add `CreateSessionRequestSchema.safeParse()` to `assessment-svc/index.ts:222`.
2. **Carry per ADR-0040** — non-blocking; address at next assessment-svc touch.

### Decision 6 — Lifecycle for imported items (Q-1.1-6.6)

1. **Draft only** — all imports land as `draft`; no override field in manifest.
2. **Optional lifecycle override** — manifest may specify target lifecycle (e.g., `review`).

## Decision

1. **Option A.** `POST /content/import` per spec §21.2. Phase plan's `/content/items/batch` is
   non-authoritative. No script in S6 scope. Idempotency-Key required on POST per CLAUDE.md
   non-negotiable. Pattern G strict: `platform_admin` role check (Bearer) OR service-role header
   (`x-mm-service-role`) — matching the dual-gate model used for `/content/select` (index.ts:116).
2. **Option 1.** `copyright_declaration: z.literal('original')` required field in manifest Zod
   schema. 422 on missing/invalid. The lifecycle FSM `draft → review` gate provides a second
   enforcement layer; the manifest field provides the first.
3. **Option 1 for S6.** Exact-match SHA on normalised stem JSON. Fuzzy deferred as ISSUE-0049.

   **§Decision 3 amendment (2026-05-19, Gate III):** Cross-DB stem SHA dedup deferred per
   Q-1.1-6.7 Option C — S6 delivers intra-manifest SHA Set only. Cross-import external_key
   dedup deferred per Q-1.1-6.8 Option B — S6 delivers intra-manifest Map only. Empty-bank
   rationale: at S6 launch the item bank contains 0 prior imports; cross-lookup against an
   empty set has no implementation value. Both `DUPLICATE_STEM` and `DUPLICATE_EXTERNAL_KEY`
   outcome codes are reserved in the response schema for the upgrade path. Upgrade tracked:
   ISSUE-0049 (fuzzy/embedding — DB schema + pgvector) + ISSUE-0050 (cross-DB SHA +
   cross-import external_key — idempotency store extension; distinct upgrade path).
4. Legal review owner: operator-side. S6 ships templates ready for review. No code gate.
5. **Carry per ADR-0040.** S6 does not touch assessment-svc write path.
6. **Draft only.** All imports land as `draft`. No lifecycle override field in manifest.

## Rationale

Pattern G strict (Decision 1): ADR-0035 §Decision 2 explicitly names "batch ingest" as a service-role
use case. Content writes are platform_admin + service-role only per established RLS policy.

Copyright declaration (Decision 2): The copyright constraint is a CLAUDE.md-equivalent non-negotiable.
Making it machine-enforceable at the import boundary is the minimum viable implementation. The declaration
field is the intake gate; human review at `draft → review` is the quality gate. Without the intake gate,
a batch of non-original items could be submitted without any machine-detectable signal.

Exact-match SHA (Decision 3): Scope-appropriate for S6. Verbatim duplicates (same batch re-imported) are
the primary dedup target for S6 operational use. Paraphrase detection requires infrastructure investment
that should be validated against actual content volume at scale. ISSUE-0049 tracks the upgrade path.

Draft-only lifecycle (Decision 6): Consistent with spec §15.3 FSM start state (`draft`). The `draft →
review` gate requires "all required fields populated" and is "partly for" copyright review (spec §15.3).
A lifecycle override in the manifest would bypass this gate — not acceptable given the copyright
constraint.

assessment-svc carry (Decision 5): ADR-0040 §Decision explicitly scoped the ISSUE-0042 fix to
content-svc. Expanding S6 to fix assessment-svc would add untracked scope and create a traceability
break for the ADR-0040 decision boundary.

## Consequences

- Positive: Import pipeline has machine-enforceable copyright guardrail at two levels (manifest
  `copyright_declaration` field + lifecycle FSM `draft → review` gate).
- Positive: Spec §21.2 `POST /content/import` path honored; no path drift from spec.
- Positive: Dry-run mode (`?dry_run=true`) enables pre-flight validation without DB writes — essential
  for S7 authoring iteration at volume.
- Positive: Per-item partial-failure reporting ensures no silent half-import.
- Negative: No fuzzy similarity check in S6; paraphrase-level reproduction detection depends on human
  review at `draft → review` lifecycle gate.
- Negative: No script-based import convenience in S6; CLI batch use requires calling the authenticated
  endpoint with Idempotency-Key.
- Follow-ups:
  - ISSUE-0049: fuzzy/embedding-based duplicate detection (post-launch, tracked).
  - ISSUE-0050: cross-DB exact-match stem SHA dedup + cross-import external_key dedup
    (Q-1.1-6.7 + Q-1.1-6.8 deferral upgrade path; distinct from ISSUE-0049 fuzzy approach).
  - Legal review of authoring spec templates (operator-side gate before S7.1 — no code action).
  - assessment-svc ISSUE-0042 second half: carry to next assessment-svc touch (ADR-0040).

## Implementation notes

**Manifest format (versioned JSON — `docs/content/manifest-format.md` Gate III deliverable):**

Each manifest item must include:
- `external_key: string` — operator-supplied stable key for per-item idempotency dedup (survives re-import)
- `copyright_declaration: 'original'` — required `z.literal('original')` field; 422 on missing/invalid
- `response_type`, `skill_ids`, `difficulty`, `year_levels`, `exam_families` — required (matching `ItemCreateDTOSchema`)
- `stem`, `response_config` — required (matching `ItemVersionCreateDTOSchema`)
- Optional: `source_item_id`, `stimulus_id`, `discrimination`, `expected_time_secs`, `programs`,
  `countries`, `curricula`, `bloom_level`, `distractor_rationale`, `explanation`
- NOT included: `lifecycle` — always `draft`; no override (Decision 6)

Manifest root must include `"version": "1"` for forward-compatible schema evolution.

**Dry-run mode:** `?dry_run=true` query param. Runs full Zod parse + curriculum-strand coverage check
+ SHA dup check; returns same partial-failure shape as live import but performs no DB writes. Required
per spec §21.2 ("with dry-run validation").

**Partial-failure response shape:**
```json
{
  "imported": 42,
  "rejected": 3,
  "dry_run": false,
  "items": [
    { "external_key": "item-001", "status": "ok", "item_id": "uuid" },
    { "external_key": "item-002", "status": "rejected", "reason": "exam_families: Required" },
    { "external_key": "item-003", "status": "duplicate", "reason": "SHA match: existing item_id uuid" }
  ]
}
```

Never a silent half-import: every item in the manifest appears in `items[]` with `status: ok | rejected
| duplicate`. The endpoint returns 200 even when items are rejected (per-item status carries the
outcome); 422 is reserved for manifest-level parse failures (malformed JSON or missing version field).

**SHA dup check:** `SHA-256(JSON.stringify(normaliseStem(stem)))` where `normaliseStem` sorts object keys
recursively and strips insignificant whitespace. Compared against SHAs computed from `item_version.stem`
for `is_current = true` rows at batch start. Items matching an existing SHA are recorded as `status:
"duplicate"` with the matching `item_id`. Does not block import of distinct items in the same batch.

**Idempotency model:** `Idempotency-Key` header applies to the entire batch request — prevents duplicate
batch submission (same key = same response). Per-item idempotency uses the manifest `external_key`
field: items with a matching `external_key` in the idempotency record for `POST /content/import` return
the previously-created `item_id` without re-inserting. Re-importing the same manifest is idempotent.

**T5 backend-artefact adaptation (Q-1.1-6.5):** S6 has no UI. T5's three-gate flow is adapted:
- Gate I: API design sketch (`docs/content/manifest-format.md` draft + this ADR, status `proposed`) →
  operator "proceed to checkpoint B" before any handler code
- Gate II: `importItems` handler skeleton in `handlers.ts` (signature + Zod parse + throw stubs) +
  `ItemImportManifestSchema` in `packages/types/src/content.ts` + router branch in `index.ts` +
  test stubs → operator "proceed to fill" before business logic
- Gate III: Full implementation (idempotency, partial-failure loop, SHA dup check, dry-run branch,
  contract tests ≥5, authoring spec templates, manifest-format.md final) → V1–V11 + "create the commit"
  ADR-0041 status updated to `accepted` at Gate III.

**Implementation tightenings (Gate III):**
- **T1 — normaliseStem: no case folding.** `normaliseStem(stem)` = `JSON.stringify(sortKeys(stem)).trim()`.
  No `.toLowerCase()`. Casing is semantic in stem text: mathematical variables (`x`/`X`), chemical
  notation (`pH`/`PH`), units (`mL`/`ML`). Recorded in `docs/content/manifest-format.md §5`.
- **T2 — version.supersedes omitted.** `version.supersedes` is not a field in
  `ImportManifestItemSchema`. Batch import creates fresh `draft` items only. `supersedes` is a
  separate admin operation for relating a new `item_version` to an existing item — not an import
  concern.

**Legal review hard gate for S7.1:** Authoring spec templates (`docs/content/specs/`) shipped at Gate III
ready for legal review. S7.1 batch authoring does not begin until sign-off received. Owner: operator-side.
No code gate — operational process only. Recorded here for traceability.

Files: `supabase/functions/content-svc/handlers.ts` · `supabase/functions/content-svc/index.ts` ·
`packages/types/src/content.ts` · `docs/content/manifest-format.md` · `docs/content/specs/`
Commit: 28e85e2 (impl) · this chore close
Related: Q-1.1-6.1, Q-1.1-6.2, Q-1.1-6.3, Q-1.1-6.4, Q-1.1-6.5, Q-1.1-6.6, Q-1.1-6.7, Q-1.1-6.8,
ADR-0035, ADR-0040, ISSUE-0049, ISSUE-0050, spec §21.2, spec §15.3, v1.1-phase-plan.md §S6
