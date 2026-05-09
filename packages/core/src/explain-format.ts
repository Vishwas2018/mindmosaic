// Stage 36: ExplanationCard type + versioned copy-builder for parent dashboard.
// Input: CausalMapDTO.active_misconceptions[] (arch §6.4, Stage 32).
// Q-36.6: input field is misconception_id (CausalMapDTOSchema shape), maps to ExplanationCard.id.

export const EXPLANATION_FORMATTER_VERSION = 'v1' as const;

export interface ExplanationCard {
  id: string;
  observation: string;
  interpretation: string;
  suggestion: string;
}

// Mirrors CausalMapDTOSchema.active_misconceptions exactly (Q-36.6).
export interface MisconceptionInput {
  misconception_id: string;
  name: string;
  category: string;
  confidence: number;
  severity: string;
  affected_skill_count: number;
}

// Copy templates tiered by severity — pinned const map per Q-36.3.
const SEVERITY_TEMPLATES = {
  high: {
    observation: (name: string) =>
      `We noticed ${name} is causing significant difficulties.`,
    interpretation: (name: string) =>
      `This misunderstanding about ${name} is affecting several skills and needs focused attention.`,
    suggestion:
      'Spend dedicated time on this concept before moving to the next topic.',
  },
  medium: {
    observation: (name: string) =>
      `${name} appeared in some of your recent answers.`,
    interpretation: (name: string) =>
      `There is a partial gap in understanding ${name} that we can address.`,
    suggestion: 'A short focused practice session on this area should help.',
  },
  low: {
    observation: (name: string) =>
      `We spotted a minor pattern related to ${name}.`,
    interpretation: (name: string) =>
      `This is a small gap in ${name} that is easy to build on.`,
    suggestion: 'Keep practising and this will likely resolve naturally.',
  },
} as const;

type SeverityKey = keyof typeof SEVERITY_TEMPLATES;

function normaliseSeverity(severity: string): SeverityKey {
  if (severity === 'high' || severity === 'medium' || severity === 'low') return severity;
  return 'low';
}

export function buildExplanationCards(misconceptions: MisconceptionInput[]): ExplanationCard[] {
  return misconceptions.map((m) => {
    const key = normaliseSeverity(m.severity);
    const tmpl = SEVERITY_TEMPLATES[key];
    return {
      id: m.misconception_id,
      observation: tmpl.observation(m.name),
      interpretation: tmpl.interpretation(m.name),
      suggestion: tmpl.suggestion,
    };
  });
}
