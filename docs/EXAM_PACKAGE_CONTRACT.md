# MindMosaic – Exam Package Contract

## Overview

The Exam Package Contract defines the authoritative structure for all assessment content in MindMosaic. Every exam, quiz, and practice test must conform to this contract.

**Current Schema Version: 1.0.0**

## Purpose

The exam package contract serves as:

1. **Single Source of Truth** – One definition used by all system components
2. **Validation Layer** – Ensures content integrity before storage/display
3. **Communication Protocol** – Shared language between admin, engine, and UI
4. **Documentation** – Self-documenting content structure

## Design Principles

### Render-Agnostic Content

Content is stored as **structured blocks**, not HTML or Markdown.

**Why?**
- Consistent rendering across platforms (web, mobile, print)
- Easier content migration and transformation
- Better accessibility support
- Prevents XSS and injection vulnerabilities

**Example:**
```typescript
// ❌ Bad: HTML in content
{ content: "<p>What is <strong>2 + 2</strong>?</p>" }

// ✅ Good: Structured blocks
{
  promptBlocks: [
    { type: "text", content: "What is 2 + 2?" }
  ]
}
```

### Explicit Over Implicit

Every field has explicit constraints:
- String lengths are bounded
- Enums are exhaustive
- Optional fields are marked
- Defaults are specified

### Versionable

The schema includes:
- `schemaVersion` in metadata (must match current version)
- Semantic versioning for exam content (`version`)
- Breaking changes require schema version bump

## Schema Structure

### Top Level

```
ExamPackage
├── metadata        # Exam information
├── questions[]     # Array of questions
└── mediaAssets[]   # Media manifest
```

### Metadata

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Unique identifier |
| title | string | Exam title (1-200 chars) |
| yearLevel | number | Australian year level (1-9) |
| subject | enum | Subject area |
| assessmentType | enum | `naplan` or `icas` |
| durationMinutes | number | Time limit (5-180) |
| totalMarks | number | Sum of all question marks |
| version | string | Semantic version (e.g., "1.0.0") |
| schemaVersion | string | Must be "1.0.0" |
| status | enum | `draft` or `published` |
| createdAt | datetime | ISO 8601 timestamp |
| updatedAt | datetime | ISO 8601 timestamp |
| instructions | string[] | Optional exam instructions |

### Questions

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Unique identifier |
| sequenceNumber | number | Display order (1-based) |
| difficulty | enum | `easy`, `medium`, `hard` |
| responseType | enum | `mcq`, `short`, `extended`, `numeric` |
| marks | number | Points for question (1-10) |
| promptBlocks | PromptBlock[] | Question content |
| mediaReferences | MediaReference[] | Optional media |
| options | McqOption[] | Required for MCQ (exactly 4) |
| correctAnswer | CorrectAnswer | Answer schema |
| tags | string[] | Categorisation tags |
| hint | string | Optional hint text |

### Prompt Blocks

Structured content blocks:

| Type | Fields | Usage |
|------|--------|-------|
| text | content | Main question text |
| heading | level, content | Section headings |
| list | ordered, items | Bullet or numbered lists |
| quote | content, attribution | Quoted passages |
| instruction | content | Student instructions |

### Media References

| Field | Type | Description |
|-------|------|-------------|
| mediaId | UUID | References MediaAsset.id |
| type | enum | `image`, `diagram`, `graph` |
| placement | enum | `above`, `inline`, `below` |
| altText | string | Accessibility text (required) |
| caption | string | Optional visible caption |

### Correct Answers

Discriminated by response type:

**MCQ:**
```typescript
{ type: "mcq", correctOptionId: "B" }
```

**Short Answer:**
```typescript
{
  type: "short",
  acceptedAnswers: ["answer1", "answer2"],
  caseSensitive: false
}
```

**Numeric:**
```typescript
{
  type: "numeric",
  exactValue: 42,
  tolerance: 0.1,
  unit: "cm"
}
```

**Extended Response:**
```typescript
{
  type: "extended",
  rubric: [
    { criterion: "Clear explanation", maxMarks: 2 },
    { criterion: "Correct answer", maxMarks: 1 }
  ],
  sampleResponse: "..."
}
```

## Validation Rules

### Schema Validation

Both frontend (Zod) and backend (JSON Schema) perform:
- Type checking
- Constraint validation
- Required field verification
- Enum value validation

### Business Rules

Additional validation beyond schema:

1. **Media Reference Integrity**
   - Every `mediaId` in questions must exist in `mediaAssets`

2. **Marks Consistency**
   - Sum of question marks must equal `metadata.totalMarks`

3. **MCQ Completeness**
   - MCQ questions must have exactly 4 options
   - `correctOptionId` must match an option

## Usage by System Components

### Admin Import

```
JSON/CSV Upload → Parse → Validate → Store
```

1. Content is uploaded in JSON format
2. Zod schema validates structure
3. Business rules are checked
4. Valid packages are stored in database

### Exam Runner

```
Load Package → Validate → Render Questions → Score Answers
```

1. Package is retrieved from database
2. Schema version is verified
3. Questions are rendered using prompt blocks
4. Answers are scored against `correctAnswer`

### Edge Function Validation

```
Request → JSON Schema Validation → Process
```

1. Incoming data is validated with JSON Schema
2. Invalid requests are rejected with details
3. Valid data proceeds to business logic

## Versioning Strategy

### Schema Versions

| Version | Status | Changes |
|---------|--------|---------|
| 1.0.0 | Current | Initial release |

### Upgrading Schema

When the schema changes:

1. Increment schema version
2. Update both Zod and JSON Schema
3. Create migration path for existing content
4. Update documentation

### Content Versions

Exam content uses semantic versioning:
- **Major**: Structural changes affecting scoring
- **Minor**: New questions or content updates
- **Patch**: Typo fixes, clarifications

## Files

| File | Purpose |
|------|---------|
| `src/contracts/exam-package.schema.ts` | Zod schema (frontend) |
| `src/contracts/exam-package.json-schema.ts` | JSON Schema (backend) |
| `src/contracts/examples/*.ts` | Example packages |
| `scripts/validate-exam-examples.mjs` | Validation script |

## Examples

Three validated example packages are provided:

1. **Year 2 Numeracy** – Simple MCQ with images
2. **Year 5 Mathematics** – Fractions with diagrams
3. **Year 9 Reading** – Long-form comprehension

Run validation:
```bash
npm run validate:exams
```

## Decisions and Rationale

### Why Zod + JSON Schema?

- Zod: Type-safe validation with TypeScript inference
- JSON Schema: Language-agnostic, works in edge functions
- Both must remain in sync

### Why UUID for IDs?

- Globally unique without central coordination
- Safe for distributed content creation
- No sequential prediction

### Why Structured Blocks?

- Platform-independent rendering
- Content can be transformed (e.g., to PDF)
- Easier content analysis and search
- Prevents injection attacks

### Why Exactly 4 MCQ Options?

- Consistent with NAPLAN format
- Reduces guessing probability
- Standardised UI layout
