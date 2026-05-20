export const EXAM_FAMILY_DISPLAY_LABELS: Record<string, string> = {
  au_numeracy_y5_format: 'Numeracy Y5',
  au_math_paper_c_format: 'Math Paper C',
};

export function getExamFamilyLabel(examFamily: string): string {
  return EXAM_FAMILY_DISPLAY_LABELS[examFamily] ?? examFamily;
}
