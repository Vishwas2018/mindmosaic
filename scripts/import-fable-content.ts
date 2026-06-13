/**
 * import-fable-content.ts — Translate Fable SQL seed fragments to MindMosaic ImportManifest JSON.
 *
 * Usage:  npx tsx scripts/import-fable-content.ts --input <sql-file>
 * Output: output/fable-y5-num-batch-01.json, -02.json, ...  (max 100 items per batch)
 *
 * Filters in:  question_type = 'multiple_choice'  AND  year_level = 5
 * Filters out: multi-correct answer keys (correct.length > 1)
 * Filters out: skills mapped to TBD (reported in STOP output)
 */

import * as fs from 'fs'
import * as path from 'path'

// ── Domain types ──────────────────────────────────────────────────────────────

interface FableSkill {
  id: string
  code: string
  name: string
  strand: string
}

interface FableMcqOption {
  id: string
  label: string
}

interface FableQuestionContent {
  stem: string
  options: FableMcqOption[]
  stimulus?: { title: string; body: string }
}

interface FableQuestion {
  id: string
  skillId: string
  questionType: string
  yearLevel: number
  difficulty: number
  content: FableQuestionContent
}

interface FableAnswerKey {
  questionId: string
  correct: string[]
}

type ExamFamily = 'au_numeracy_y5_format' | 'au_math_paper_c_format'

interface ManifestItem {
  external_key: string
  copyright_declaration: 'original'
  authoring_method: 'ai_assisted_human_reviewed'
  item: {
    response_type: 'mcq'
    skill_ids: string[]
    difficulty: number
    year_levels: number[]
    exam_families: ExamFamily[]
  }
  version: {
    stem: Record<string, unknown>
    response_config: Record<string, unknown>
    difficulty: number
  }
}

interface ImportManifest {
  manifest_version: '1.0'
  items: ManifestItem[]
}

// ── Skill lookup ──────────────────────────────────────────────────────────────

// Exam family for all items produced by this run.
// NAPLAN Y5 Numeracy items always emit au_numeracy_y5_format regardless of
// which Fable skill code they carry (adaptive variants reuse ICAS skill codes).
const EXAM_FAMILY: ExamFamily = 'au_numeracy_y5_format'

// Fable skill code → MindMosaic skill_node UUID.
// Strand-level UUIDs (002, 003) are used where no leaf node exists yet.
const FABLE_TO_MM_SKILL: Record<string, string> = {
  // ── V01 codes (from 0500 seed) ────────────────────────────────────────────
  'NUM.PV':      'a0000001-0000-0000-0000-000000000004', // Place Value (leaf)
  'NUM.FR':      'a0000001-0000-0000-0000-000000000005', // Fractions & Decimals (leaf)
  'MEAS.LEN':    'a0000001-0000-0000-0000-000000000003', // Measurement & Space (strand — no leaf yet)
  'MEAS.TIME':   'a0000001-0000-0000-0000-000000000003', // Measurement & Space (strand — no leaf yet)
  'STAT.CH':     'a0000001-0000-0000-0000-000000000009', // Data Interpretation (leaf — best fit for Chance & data)
  'ALG.PAT':     'a0000001-0000-0000-0000-000000000002', // Number & Algebra (strand — no leaf yet)
  // ── V02-V10 adaptive variant codes (from 0800 seed) ──────────────────────
  'NUM.FR5':     'a0000001-0000-0000-0000-000000000005', // Fractions & Decimals (leaf)
  'NUM.OP5I':    'a0000001-0000-0000-0000-000000000006', // Operations (leaf)
  'NUM.PV5':     'a0000001-0000-0000-0000-000000000004', // Place Value (leaf)
  'GEO.SHAPE5I': 'a0000001-0000-0000-0000-000000000008', // Geometry (leaf)
  'STAT.PROB5':  'a0000001-0000-0000-0000-000000000009', // Data Interpretation (leaf)
  'MEAS.MEAS5I': 'a0000001-0000-0000-0000-000000000003', // Measurement & Space (strand — no leaf yet)
  'ALG.PAT5I':   'a0000001-0000-0000-0000-000000000002', // Number & Algebra (strand — no leaf yet)
}

// ── SQL parser ────────────────────────────────────────────────────────────────

function ch(s: string, i: number): string {
  return s[i] ?? ''
}

function extractQuotedString(
  sql: string,
  start: number,
): { value: string; end: number } | null {
  if (ch(sql, start) !== "'") return null
  let i = start + 1
  let result = ''
  while (i < sql.length) {
    const c = ch(sql, i)
    if (c === "'") {
      if (ch(sql, i + 1) === "'") {
        result += "'"
        i += 2
      } else {
        return { value: result, end: i + 1 }
      }
    } else {
      result += c
      i++
    }
  }
  return null // unclosed string
}

type SqlValue = string | number | null

function parseValuesTuple(
  sql: string,
  start: number,
): { values: SqlValue[]; end: number } | null {
  let i = start
  while (i < sql.length && /\s/.test(ch(sql, i))) i++
  if (ch(sql, i) !== '(') return null
  i++

  const values: SqlValue[] = []

  while (i < sql.length) {
    while (i < sql.length && /\s/.test(ch(sql, i))) i++
    const c = ch(sql, i)
    if (c === ')') return { values, end: i + 1 }
    if (c === ',') { i++; continue }

    if (c === "'") {
      const r = extractQuotedString(sql, i)
      if (!r) return null
      i = r.end
      // Skip optional ::jsonb / ::text type cast
      if (sql.slice(i, i + 2) === '::') {
        while (i < sql.length && ch(sql, i) !== ',' && ch(sql, i) !== ')') i++
      }
      values.push(r.value)
    } else if (sql.slice(i, i + 4) === 'NULL') {
      values.push(null)
      i += 4
    } else {
      // Unquoted numeric token
      let tok = ''
      while (i < sql.length && ch(sql, i) !== ',' && ch(sql, i) !== ')') {
        tok += ch(sql, i)
        i++
      }
      const n = parseFloat(tok.trim())
      values.push(isNaN(n) ? null : n)
    }
  }
  return null // unclosed tuple
}

function parseSkills(sql: string): FableSkill[] {
  const result: FableSkill[] = []
  const re = /insert\s+into\s+public\.skills\s*\([^)]+\)\s+values\s*/gi
  let m: RegExpExecArray | null = null
  while ((m = re.exec(sql)) !== null) {
    const r = parseValuesTuple(sql, m.index + m[0].length)
    if (!r) continue
    const [id, code, name, strand] = r.values
    if (
      typeof id === 'string' &&
      typeof code === 'string' &&
      typeof name === 'string' &&
      typeof strand === 'string'
    ) {
      result.push({ id, code, name, strand })
    }
  }
  return result
}

function parseQuestions(sql: string): FableQuestion[] {
  const result: FableQuestion[] = []
  const re = /insert\s+into\s+public\.questions\s*\([^)]+\)\s+values\s*/gi
  let m: RegExpExecArray | null = null
  while ((m = re.exec(sql)) !== null) {
    const r = parseValuesTuple(sql, m.index + m[0].length)
    if (!r) continue
    const [id, skillId, questionType, yearLevel, difficulty, contentRaw] = r.values
    if (
      typeof id !== 'string' ||
      typeof skillId !== 'string' ||
      typeof questionType !== 'string' ||
      typeof yearLevel !== 'number' ||
      typeof difficulty !== 'number' ||
      typeof contentRaw !== 'string'
    ) continue
    let content: FableQuestionContent
    try {
      content = JSON.parse(contentRaw) as FableQuestionContent
    } catch {
      continue
    }
    result.push({ id, skillId, questionType, yearLevel, difficulty, content })
  }
  return result
}

function parseAnswerKeys(sql: string): FableAnswerKey[] {
  const result: FableAnswerKey[] = []
  const re = /insert\s+into\s+public\.question_answer_keys\s*\([^)]+\)\s+values\s*/gi
  let m: RegExpExecArray | null = null
  while ((m = re.exec(sql)) !== null) {
    const r = parseValuesTuple(sql, m.index + m[0].length)
    if (!r) continue
    const [questionId, keyRaw] = r.values
    if (typeof questionId !== 'string' || typeof keyRaw !== 'string') continue
    let key: { correct?: string[] }
    try {
      key = JSON.parse(keyRaw) as { correct?: string[] }
    } catch {
      continue
    }
    result.push({ questionId, correct: key.correct ?? [] })
  }
  return result
}

// ── Translation ───────────────────────────────────────────────────────────────

interface TbdItem {
  questionId: string
  fableSkillCode: string
  stemPreview: string
  reason: string
}

function translateQuestion(
  q: FableQuestion,
  skillId: string,
  correctLetter: string,
): ManifestItem {
  const correctOption = q.content.options.find(o => o.id === correctLetter)
  if (!correctOption) {
    throw new Error(`correct letter "${correctLetter}" not found in options for ${q.id}`)
  }

  const optionLabels = q.content.options.map(o => o.label)
  const difficulty = (q.difficulty - 1) / 4

  const stem: Record<string, unknown> = { text: q.content.stem }
  if (q.content.stimulus) stem['stimulus'] = q.content.stimulus

  const responseConfig: Record<string, unknown> = {
    options: optionLabels,
    correct_option_id: correctOption.label,
    scoring: { correct: 1, incorrect: 0 },
  }

  return {
    external_key: `fable:${q.id}`,
    copyright_declaration: 'original',
    authoring_method: 'ai_assisted_human_reviewed',
    item: {
      response_type: 'mcq',
      skill_ids: [skillId],
      difficulty,
      year_levels: [5],
      exam_families: [EXAM_FAMILY],
    },
    version: { stem, response_config: responseConfig, difficulty },
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

function main(): void {
  const args = process.argv.slice(2)
  const inputIdx = args.indexOf('--input')
  const inputPath = inputIdx !== -1 ? args[inputIdx + 1] : undefined
  if (!inputPath) {
    console.error('Usage: npx tsx scripts/import-fable-content.ts --input <sql-file>')
    process.exit(1)
  }

  const sql = fs.readFileSync(inputPath, 'utf-8')

  const skills = parseSkills(sql)
  const questions = parseQuestions(sql)
  const answerKeys = parseAnswerKeys(sql)

  const skillById = new Map<string, FableSkill>(skills.map(s => [s.id, s]))
  const keyByQid = new Map<string, FableAnswerKey>(answerKeys.map(k => [k.questionId, k]))

  // Filter: year_level = 5, question_type = 'multiple_choice'
  const eligible = questions.filter(
    q => q.yearLevel === 5 && q.questionType === 'multiple_choice',
  )
  // Deterministic ordering for stable batch assignment
  eligible.sort((a, b) => a.id.localeCompare(b.id))

  const items: ManifestItem[] = []
  const tbdList: TbdItem[] = []
  let excludedMultiCorrect = 0
  let excludedNoKey = 0
  let excludedNoSkill = 0

  for (const q of eligible) {
    const key = keyByQid.get(q.id)
    if (!key) { excludedNoKey++; continue }

    if (key.correct.length !== 1) { excludedMultiCorrect++; continue }

    const correctLetter = key.correct[0]
    if (!correctLetter) { excludedMultiCorrect++; continue }

    const skill = skillById.get(q.skillId)
    if (!skill) { excludedNoSkill++; continue }

    const skillId = FABLE_TO_MM_SKILL[skill.code]
    if (!skillId) {
      tbdList.push({
        questionId: q.id,
        fableSkillCode: skill.code,
        stemPreview: q.content.stem.slice(0, 80),
        reason: 'skill code not in FABLE_TO_MM_SKILL lookup',
      })
      continue
    }

    try {
      items.push(translateQuestion(q, skillId, correctLetter))
    } catch (err) {
      tbdList.push({
        questionId: q.id,
        fableSkillCode: skill.code,
        stemPreview: q.content.stem.slice(0, 80),
        reason: err instanceof Error ? err.message : String(err),
      })
    }
  }

  // Write output batches
  const BATCH_SIZE = 100
  const outputDir = path.join(process.cwd(), 'output')
  fs.mkdirSync(outputDir, { recursive: true })

  let batchNum = 0
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    batchNum++
    const batch = items.slice(i, i + BATCH_SIZE)
    const manifest: ImportManifest = { manifest_version: '1.0', items: batch }
    const outPath = path.join(
      outputDir,
      `fable-y5-num-batch-${String(batchNum).padStart(2, '0')}.json`,
    )
    fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2), 'utf-8')
    console.log(`✓  ${outPath}  (${batch.length} items)`)
  }
  if (batchNum === 0) console.log('No items emitted.')

  // STOP report
  console.log('')
  console.log('── STOP REPORT ──────────────────────────────────────────────────────────────')
  console.log(`Input:                   ${inputPath}`)
  console.log(`Skills parsed:           ${skills.length}`)
  console.log(`Questions parsed:        ${questions.length} total`)
  console.log(`Y5 MCQ eligible:         ${eligible.length}`)
  console.log(`Excluded multi-correct:  ${excludedMultiCorrect}`)
  console.log(`Excluded no answer key:  ${excludedNoKey}`)
  console.log(`Excluded skill not found:${excludedNoSkill}`)
  console.log(`TBD (unmapped):          ${tbdList.length}`)
  console.log(`Emitted:                 ${items.length} items across ${batchNum} batch(es)`)

  if (tbdList.length > 0) {
    console.log('')
    console.log('TBD items (require skill node additions to MindMosaic graph):')
    for (const t of tbdList) {
      console.log(`  [${t.fableSkillCode}]  ${t.questionId}`)
      console.log(`    stem: "${t.stemPreview}${t.stemPreview.length >= 80 ? '...' : ''}"`)
      console.log(`    reason: ${t.reason}`)
    }
  }
}

main()
