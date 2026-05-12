type CompareRow = {
  feature: string
  free: boolean | string
  standard: boolean | string
  premium: boolean | string
}

export const BILLING_COPY: {
  faq: Array<{ q: string; a: string }>
  compareRows: CompareRow[]
  trustBullets: string[]
  paymentMethodNote: string
  cancelDialog: {
    title: string
    body: (periodEnd: string) => string
    confirm: string
    keep: string
  }
  pathways: Record<string, string>
} = {
  faq: [
    {
      q: 'Can I cancel my subscription?',
      a: 'Yes. You can cancel from the Billing tab whenever you like. You will keep full access until the end of your current billing period.',
    },
    {
      q: "What happens to my child's progress if I downgrade?",
      a: "Your child's learning history and progress are always retained. On the Free plan, some advanced pathways and features will become unavailable, but no data is deleted.",
    },
    {
      q: 'Do you offer a free trial?',
      a: "The Free plan is always available with no time limit. You can start using MindMosaic for free and upgrade whenever you're ready to unlock more pathways.",
    },
    {
      q: 'What is the difference between monthly and yearly billing?',
      a: 'Yearly billing saves approximately 20% compared to the monthly rate. The full year is charged upfront, and you keep access for the entire period even if you cancel.',
    },
    {
      q: 'Is my payment information secure?',
      a: 'All payments are processed securely by Stripe. MindMosaic never stores your card details. Your data is hosted in Australia under Australian privacy law.',
    },
    {
      q: 'Can I switch plans mid-cycle?',
      a: 'Yes. You can upgrade immediately and changes take effect straight away. Downgrades take effect at the end of your current billing period.',
    },
  ],

  compareRows: [
    { feature: 'Adaptive practice sessions', free: true, standard: true, premium: true },
    { feature: 'NAPLAN Y5 Numeracy pathway', free: true, standard: true, premium: true },
    { feature: 'ICAS Math Paper C pathway', free: false, standard: true, premium: true },
    { feature: 'Active pathways', free: '1', standard: '3', premium: 'Unlimited' },
    { feature: 'Monthly session limit', free: '10', standard: 'Unlimited', premium: 'Unlimited' },
    { feature: 'Detailed parent insights', free: 'Basic', standard: 'Full', premium: 'Full' },
    { feature: 'Learning DNA analysis', free: false, standard: true, premium: true },
    { feature: 'Causal reasoning insights', free: false, standard: false, premium: true },
    { feature: 'Priority support', free: false, standard: false, premium: true },
    { feature: 'Data export (CSV)', free: false, standard: true, premium: true },
  ],

  trustBullets: ['SSL encrypted', 'Cancel easily', 'AU data residency'],

  paymentMethodNote:
    'Managed via Stripe · Update your card details in the portal.',

  cancelDialog: {
    title: 'Cancel your subscription?',
    body: (periodEnd: string) =>
      `You'll keep full access until ${periodEnd}. Your plan will then revert to Free.`,
    confirm: 'Cancel plan',
    keep: 'Keep subscription',
  },

  pathways: {
    naplan_y5_numeracy: 'NAPLAN Y5 Numeracy',
    icas_math_c: 'ICAS Math Paper C',
  },
}
