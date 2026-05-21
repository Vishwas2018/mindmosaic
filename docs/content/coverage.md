# Content Coverage Matrix

> Append-only. One section per batch. Updated at commit time.
> Governs: `docs/content/specs/australian-y5-numeracy.md §2` strand targets.

---

## S7.1 Batch 01 — 2026-05-21

**Manifest:** `docs/content/manifests/s7.1-batch-01-preview.json`
**Items imported:** 8 (lifecycle: `draft`; authoring_method: `ai_assisted_human_reviewed`)
**Exam family:** `au_numeracy_y5_format` · Year: 5 · Curriculum: `ac_v9` · Country: AU
**Gate III r2:** HTTP 200, imported: 8, rejected: 0, idempotency-key: `s7.1-batch-01-live-import-20260521-r2`

### Skill spread

| Skill node | Slug | Items | External keys |
|---|---|---|---|
| `a0000001-0000-0000-0000-000000000004` | place-value | 2 | 001, 003 |
| `a0000001-0000-0000-0000-000000000005` | fractions-decimals | 1 | 006 |
| `a0000001-0000-0000-0000-000000000006` | operations | 2 | 004, 005 |
| `a0000001-0000-0000-0000-000000000007` | word-problems | 3 | 002, 007, 008 |
| **Total** | | **8** | |

Notes: geometry and data-interpretation skill nodes not covered in this batch. Probability node absent from seed (ISSUE-0053).

### Difficulty spread

| Band | [0,1] value | Label | Items | External keys |
|---|---|---|---|---|
| B1 | 0.10 | Foundation / Very Easy | 1 | 001 |
| B2 | 0.30 | Developing / Easy | 2 | 002, 003 |
| B3 | 0.50 | Proficient / Average | 2 | 004, 005 |
| B4 | 0.70 | Advanced / Hard | 2 | 006, 007 |
| B5 | 0.90 | Expert / Very Hard | 1 | 008 |
| **Total** | | | **8** | |

Scale: linear band-midpoint per spec §6.4. IRT-logit-to-[0,1] mapping adopted (ISSUE-0058 resolution, 2026-05-21).

### Response type spread

| Type | Count | External keys |
|---|---|---|
| `mcq` | 6 | 001, 002, 003, 004, 006, 007 |
| `short_answer` | 2 | 005, 008 |
| **Total** | **8** | |

### Bloom level spread

| Level | Count | External keys |
|---|---|---|
| remember | 1 | 001 |
| understand | 1 | 003 |
| apply | 5 | 002, 004, 005, 006, 007 |
| analyse | 1 | 008 |
| evaluate | 0 | — |
| create | 0 | — |
| **Total** | **8** | |

### Running totals (cumulative across all S7 batches)

| Metric | Batch 01 | Cumulative |
|---|---|---|
| Items imported (all lifecycle) | 8 | 8 |
| Items draft | 8 | 8 |
| Items review | 0 | 0 |
| Items active | 0 | 0 |
| Skill nodes covered | 4 of 6 seeded | 4 of 6 |
| Difficulty bands covered | 5 of 5 | 5 of 5 |
| Response types covered | 2 of 4 | 2 of 4 |

Notes: `review → active` transition blocked by DEV-20260520-1 legal gate. Items remain `draft` until ISSUE-0054 (MCQ scoring) fix + legal sign-off.

---
