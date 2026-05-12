'use client'

// Screen 17 — Billing (/billing). Three-tab UI: Plans / Compare / Billing.
// ADR-0034 Decision 5: No Stripe Elements. Checkout = redirect via checkout_url.
// ADR-0029: All API calls via @mm/sdk hooks.

import { useRef, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import {
  AppShell,
  TopBar,
  Brand,
  Tabs,
  type TabItem,
  Dialog,
  Button,
  Card,
  EmptyState,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeader,
  TableCell,
  useToast,
} from '@mm/ui'
import {
  usePlanCatalog,
  useSubscription,
  useInvoices,
  useCreateCheckout,
  useCreatePortalSession,
  useCancelSubscription,
  mmKeys,
} from '@mm/sdk'
import type { SubscriptionDTO, InvoiceStatus } from '@mm/types'
import { BILLING_COPY } from '../../../copy/billing'
import { formatAud, formatDate } from '../../../lib/format'

// ── type helpers ──────────────────────────────────────────────────────────────

type CheckoutableTier = 'standard' | 'premium' | 'institutional'

function isCheckoutableTier(tier: string): tier is CheckoutableTier {
  return tier === 'standard' || tier === 'premium' || tier === 'institutional'
}

// ── sub-components ────────────────────────────────────────────────────────────

function SubscriptionStatusBadge({ sub }: { sub: SubscriptionDTO }) {
  if (!sub.is_active) {
    return (
      <span
        aria-label="Subscription status: Cancelled"
        className="rounded-pill px-2 py-0.5 text-xs font-medium bg-[var(--error-50)] text-[var(--error)]"
      >
        Cancelled
      </span>
    )
  }
  if (sub.cancel_at) {
    return (
      <span
        aria-label={`Subscription status: Active until ${formatDate(sub.cancel_at)}`}
        className="rounded-pill px-2 py-0.5 text-xs font-medium bg-[var(--warn-50)] text-[var(--warn)]"
      >
        Active until {formatDate(sub.cancel_at)}
      </span>
    )
  }
  return (
    <span
      aria-label="Subscription status: Active"
      className="rounded-pill px-2 py-0.5 text-xs font-medium bg-[var(--success-50)] text-[var(--success)]"
    >
      Active
    </span>
  )
}

function InvoiceStatusPill({ status }: { status: InvoiceStatus }) {
  const styles: Record<InvoiceStatus, string> = {
    paid: 'bg-[var(--success-50)] text-[var(--success)]',
    open: 'bg-[var(--warn-50)] text-[var(--warn)]',
    draft: 'bg-[var(--slate-75)] text-[var(--muted)]',
    uncollectible: 'bg-[var(--error-50)] text-[var(--error)]',
    void: 'bg-[var(--slate-75)] text-[var(--muted)]',
  }
  return (
    <span className={`rounded-pill px-2 py-0.5 text-xs font-medium ${styles[status]}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

function BillingToggle({
  value,
  onChange,
}: {
  value: 'monthly' | 'yearly'
  onChange: (v: 'monthly' | 'yearly') => void
}) {
  return (
    <div role="group" aria-label="Billing interval" className="inline-flex rounded-btn border border-[var(--border)] p-0.5">
      {(['monthly', 'yearly'] as const).map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={`rounded-btn px-4 py-1.5 text-sm font-medium transition-colors ${
            value === v
              ? 'bg-[var(--primary)] text-white'
              : 'text-[var(--muted)] hover:text-[var(--text)]'
          }`}
        >
          {v === 'monthly' ? 'Monthly' : (
            <span>Yearly <span className="ml-1 text-xs opacity-75">Save 20%</span></span>
          )}
        </button>
      ))}
    </div>
  )
}

function renderCompareCell(value: boolean | string): React.ReactNode {
  if (typeof value === 'boolean') {
    return value ? (
      <span aria-label="Included" className="text-[var(--success)] font-bold text-base">✓</span>
    ) : (
      <span aria-label="Not included" className="text-[var(--muted)]">—</span>
    )
  }
  return <span className="text-[var(--text-2)] text-sm">{value}</span>
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function BillingPage() {
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  const [tab, setTab] = useState<'plans' | 'compare' | 'billing'>('plans')
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly')
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const returnHandledRef = useRef(false)

  const catalogQuery = usePlanCatalog()
  const subscriptionQuery = useSubscription()
  const invoicesQuery = useInvoices()
  const checkout = useCreateCheckout()
  const portal = useCreatePortalSession()
  const cancelSubscription = useCancelSubscription()

  const catalog = catalogQuery.data
  const subscription = subscriptionQuery.data
  const invoicesData = invoicesQuery.data

  const planMap = new Map<string, string>(
    catalog?.plans.map((p) => [p.tier, p.display_name]) ?? [],
  )
  const currentPlanName = planMap.get(subscription?.tier ?? 'free') ?? 'Subscription'

  // Handle checkout return params on mount (once only)
  useEffect(() => {
    if (returnHandledRef.current) return
    returnHandledRef.current = true

    const status = searchParams.get('status')
    const intent = searchParams.get('intent')
    const tierLabel = searchParams.get('tier')

    if (status === 'success') {
      addToast({
        title: `Welcome to ${tierLabel ?? 'your new plan'}!`,
        variant: 'success',
      })
      void queryClient.invalidateQueries({ queryKey: mmKeys.billing.all() })
    } else if (status === 'cancelled') {
      addToast({ title: 'Checkout cancelled.', variant: 'info' })
    }
    if (intent === 'upgrade') {
      setTab('plans')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Intent banner: ?pathway={slug}
  const pathwaySlug = searchParams.get('pathway')
  const pathwayName = pathwaySlug ? (BILLING_COPY.pathways[pathwaySlug] ?? pathwaySlug) : null

  function handleUpgrade(tier: CheckoutableTier) {
    const displayName = planMap.get(tier) ?? tier
    checkout.mutate(
      {
        tier,
        billing_interval: billingInterval,
        success_url: `${window.location.origin}/billing?status=success&tier=${encodeURIComponent(displayName)}`,
        cancel_url: `${window.location.origin}/billing?status=cancelled`,
      },
      {
        onSuccess: (data) => {
          window.location.href = data.checkout_url
        },
      },
    )
  }

  function handleOpenPortal() {
    portal.mutate(undefined, {
      onSuccess: (data) => {
        window.location.href = data.portal_url
      },
    })
  }

  const currentTier = subscription?.tier ?? 'free'

  // ── Plans tab ────────────────────────────────────────────────────────────────

  const displayPlans = (catalog?.plans ?? []).filter(
    (p) => p.tier === 'free' || p.tier === 'standard' || p.tier === 'premium',
  )

  const plansTab = (
    <div className="space-y-8 pb-8">
      {/* Hero */}
      <div className="text-center space-y-3">
        <h1 className="text-2xl font-bold text-[var(--text)]">Choose your plan</h1>
        <p className="text-[var(--muted)]">
          Unlock the full potential of adaptive learning for your child.
        </p>
        <BillingToggle value={billingInterval} onChange={setBillingInterval} />
      </div>

      {/* Intent banner */}
      {pathwayName && (
        <div className="rounded-card bg-[var(--primary-50)] border border-[var(--primary-100)] px-4 py-3 text-sm text-[var(--primary)] font-medium text-center">
          Upgrade to unlock {pathwayName}
        </div>
      )}

      {/* Plan cards */}
      {catalogQuery.isPending ? (
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              role="status"
              aria-label="Loading plan"
              className="rounded-card border border-[var(--border)] bg-[var(--surface)] animate-pulse h-80"
            />
          ))}
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {displayPlans.map((plan) => {
            const price =
              billingInterval === 'monthly'
                ? plan.price_monthly_cents
                : plan.price_yearly_cents
            const isCurrent = plan.tier === currentTier
            return (
              <article
                key={plan.tier}
                aria-label={`${plan.display_name} plan`}
                className={`relative rounded-card border p-6 flex flex-col gap-4 bg-[var(--surface)] ${
                  plan.popular
                    ? 'border-[var(--primary)] shadow-card-lg'
                    : 'border-[var(--border)]'
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-pill bg-[var(--primary)] text-white text-xs font-semibold px-3 py-1 whitespace-nowrap">
                    Most Popular
                  </span>
                )}
                <h2 className="text-lg font-semibold text-[var(--text)]">{plan.display_name}</h2>
                <div className="text-3xl font-bold text-[var(--text)]">
                  {price === 0 ? (
                    'Free'
                  ) : (
                    <>
                      {formatAud(price)}
                      <span className="text-sm font-normal text-[var(--muted)]">
                        /{billingInterval === 'monthly' ? 'mo' : 'yr'}
                      </span>
                    </>
                  )}
                </div>
                <ul className="flex-1 space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-[var(--text-2)]">
                      <span aria-hidden="true" className="text-[var(--success)] mt-0.5 flex-shrink-0">
                        ✓
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
                {isCurrent ? (
                  <Button
                    variant="ghost"
                    disabled
                    aria-label={`${plan.display_name} is your current plan`}
                  >
                    Current plan
                  </Button>
                ) : (
                  <Button
                    variant={plan.popular ? 'primary' : 'secondary'}
                    loading={checkout.isPending}
                    onClick={() => {
                      if (isCheckoutableTier(plan.tier)) handleUpgrade(plan.tier)
                    }}
                  >
                    Upgrade to {plan.display_name}
                  </Button>
                )}
              </article>
            )
          })}
        </div>
      )}

      {/* Trust strip */}
      <div className="flex flex-wrap justify-center gap-6 text-sm text-[var(--muted)]">
        {BILLING_COPY.trustBullets.map((bullet) => (
          <span key={bullet} className="flex items-center gap-1.5">
            {bullet}
          </span>
        ))}
      </div>

      {/* FAQ */}
      <section aria-label="Frequently asked questions" className="max-w-2xl mx-auto w-full">
        <h2 className="text-lg font-semibold text-[var(--text)] mb-4">
          Frequently asked questions
        </h2>
        <div className="space-y-3">
          {BILLING_COPY.faq.map((item) => (
            <details
              key={item.q}
              className="rounded-card border border-[var(--border)] bg-[var(--surface)]"
            >
              <summary className="px-5 py-4 text-sm font-medium text-[var(--text)] cursor-pointer hover:bg-[var(--slate-75)] rounded-card list-none flex justify-between items-center select-none">
                {item.q}
                <span aria-hidden="true" className="text-[var(--muted)] ml-4">+</span>
              </summary>
              <p className="px-5 pb-4 text-sm text-[var(--muted)]">{item.a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  )

  // ── Compare tab ──────────────────────────────────────────────────────────────

  const compareTab = (
    <div className="space-y-6 pb-8">
      <h2 className="text-xl font-bold text-[var(--text)] text-center">Plan Comparison</h2>
      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th
                  scope="col"
                  className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wide text-[var(--muted)] w-2/5"
                >
                  Feature
                </th>
                <th scope="col" className="text-center px-4 py-3 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                  Free
                </th>
                <th scope="col" className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--primary)] bg-[var(--primary-50)]">
                  Standard
                </th>
                <th scope="col" className="text-center px-4 py-3 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                  Premium
                </th>
              </tr>
            </thead>
            <tbody>
              {/* Price row — dynamic from usePlanCatalog */}
              <tr className="border-b border-[var(--border)] bg-[var(--slate-50)]">
                <td className="px-4 py-3 font-medium text-[var(--text)]">Monthly price</td>
                <td className="px-4 py-3 text-center text-[var(--text)]">Free</td>
                <td className="px-4 py-3 text-center font-medium text-[var(--primary)] bg-[var(--primary-50)]">
                  {catalog
                    ? `${formatAud(catalog.plans.find((p) => p.tier === 'standard')?.price_monthly_cents ?? 0)}/mo`
                    : '—'}
                </td>
                <td className="px-4 py-3 text-center text-[var(--text)]">
                  {catalog
                    ? `${formatAud(catalog.plans.find((p) => p.tier === 'premium')?.price_monthly_cents ?? 0)}/mo`
                    : '—'}
                </td>
              </tr>
              {/* Feature rows — static from BILLING_COPY */}
              {BILLING_COPY.compareRows.map((row) => (
                <tr key={row.feature} className="border-b border-[var(--border)] last:border-0">
                  <td className="px-4 py-3 text-[var(--text-2)]">{row.feature}</td>
                  <td className="px-4 py-3 text-center">
                    {renderCompareCell(row.free)}
                  </td>
                  <td className="px-4 py-3 text-center bg-[var(--primary-50)]">
                    {renderCompareCell(row.standard)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {renderCompareCell(row.premium)}
                  </td>
                </tr>
              ))}
              {/* CTA row */}
              <tr className="border-t-2 border-[var(--border)]">
                <td className="px-4 py-4" />
                <td className="px-4 py-4 text-center">
                  {currentTier === 'free' ? (
                    <Button variant="ghost" disabled size="sm">
                      Current plan
                    </Button>
                  ) : (
                    <span className="text-xs text-[var(--muted)]">—</span>
                  )}
                </td>
                <td className="px-4 py-4 text-center bg-[var(--primary-50)]">
                  {currentTier === 'standard' ? (
                    <Button variant="ghost" disabled size="sm">Current plan</Button>
                  ) : (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setTab('plans')}
                    >
                      Upgrade Standard
                    </Button>
                  )}
                </td>
                <td className="px-4 py-4 text-center">
                  {currentTier === 'premium' ? (
                    <Button variant="ghost" disabled size="sm">Current plan</Button>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setTab('plans')}
                    >
                      Upgrade Premium
                    </Button>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )

  // ── Billing tab ──────────────────────────────────────────────────────────────

  const billingTab = (
    <div className="max-w-3xl mx-auto space-y-6 pb-8">
      {/* Subscription card */}
      <Card className="border-t-4 border-t-[var(--primary)]">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-3">
          Current Plan
        </p>
        {subscriptionQuery.isPending ? (
          <div
            role="status"
            aria-label="Loading subscription"
            className="animate-pulse h-20 rounded bg-[var(--slate-75)]"
          />
        ) : subscription ? (
          <>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-3 mb-1 flex-wrap">
                  <span className="text-xl font-bold text-[var(--text)] capitalize">
                    {planMap.get(subscription.tier) ?? subscription.tier}
                  </span>
                  <SubscriptionStatusBadge sub={subscription} />
                </div>
                <p className="text-sm text-[var(--muted)]">
                  {subscription.tier === 'free'
                    ? '— (free tier)'
                    : subscription.cancel_at
                    ? `Ends ${formatDate(subscription.cancel_at)}`
                    : subscription.current_period_end
                    ? `Renews ${formatDate(subscription.current_period_end)}`
                    : '—'}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button variant="primary" size="sm" onClick={() => setTab('plans')}>
                  Upgrade Plan
                </Button>
                {subscription.tier !== 'free' &&
                  subscription.is_active &&
                  !subscription.cancel_at && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-[var(--error)]"
                      onClick={() => setCancelDialogOpen(true)}
                    >
                      Cancel
                    </Button>
                  )}
              </div>
            </div>

            {/* Undo cancel banner */}
            {subscription.cancel_at && (
              <div className="mt-4 rounded-card bg-[var(--warn-50)] border border-[var(--warn-100)] px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
                <p className="text-sm text-[var(--warn-900)]">
                  Your plan ends {formatDate(subscription.cancel_at)}.
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  loading={cancelSubscription.isPending}
                  onClick={() => cancelSubscription.mutate({ undo: true })}
                >
                  Keep subscription
                </Button>
              </div>
            )}
          </>
        ) : (
          <EmptyState title="Unable to load subscription" description="Please refresh to try again." />
        )}
      </Card>

      {/* Payment method card */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-[var(--text)]">Payment Method</h2>
          <Button variant="ghost" size="sm" loading={portal.isPending} onClick={handleOpenPortal}>
            Update
          </Button>
        </div>
        <p className="text-sm text-[var(--muted)] mb-4">{BILLING_COPY.paymentMethodNote}</p>
        <Button variant="secondary" loading={portal.isPending} onClick={handleOpenPortal}>
          Manage payment method →
        </Button>
      </Card>

      {/* Invoice history card */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-[var(--text)]">Invoice History</h2>
          <Button variant="ghost" size="sm" disabled aria-label="Download all invoices (coming soon)">
            ↓ Download All
          </Button>
        </div>
        {invoicesQuery.isPending ? (
          <div role="status" aria-label="Loading invoices" className="animate-pulse space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 rounded bg-[var(--slate-75)]" />
            ))}
          </div>
        ) : invoicesData && invoicesData.invoices.length > 0 ? (
          <>
            <Table caption="Invoice history">
              <TableHead>
                <TableRow>
                  <TableHeader>Invoice</TableHeader>
                  <TableHeader>Plan</TableHeader>
                  <TableHeader>Date</TableHeader>
                  <TableHeader>Amount</TableHeader>
                  <TableHeader>Status</TableHeader>
                  <TableHeader>
                    <span className="sr-only">Download</span>
                  </TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {invoicesData.invoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono text-xs text-[var(--muted)]">
                      {inv.stripe_invoice_id.slice(-8)}
                    </TableCell>
                    <TableCell>{currentPlanName}</TableCell>
                    <TableCell>{formatDate(inv.invoiced_at)}</TableCell>
                    <TableCell className="tabular-nums">{formatAud(inv.amount_cents)}</TableCell>
                    <TableCell>
                      <InvoiceStatusPill status={inv.status} />
                    </TableCell>
                    <TableCell>
                      {inv.invoice_pdf_url ? (
                        <a
                          href={inv.invoice_pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label="Download invoice PDF"
                          className="text-[var(--primary)] hover:underline text-sm"
                        >
                          ↓ PDF
                        </a>
                      ) : (
                        <span className="text-[var(--muted)] text-sm">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {/* ISSUE-0033: truncation notice when >50 invoices exist */}
            {invoicesData.truncated && (
              <p className="mt-3 text-xs text-[var(--muted)] text-center">
                Showing 50 most recent invoices.
              </p>
            )}
          </>
        ) : (
          <EmptyState title="No invoices yet." />
        )}
      </Card>
    </div>
  )

  // ── Tabs ─────────────────────────────────────────────────────────────────────

  const tabItems: TabItem[] = [
    { value: 'plans', label: 'Plans', content: plansTab },
    { value: 'compare', label: 'Compare', content: compareTab },
    { value: 'billing', label: 'Billing', content: billingTab },
  ]

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <AppShell variant="student-parent">
      <TopBar>
        <Brand logoSrc="/logo.svg" size="sm" />
      </TopBar>
      <main className="max-w-5xl mx-auto px-6 py-8">
        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as 'plans' | 'compare' | 'billing')}
          items={tabItems}
        />
      </main>

      {/* Cancel subscription dialog — focus-trapped via Radix Dialog */}
      <Dialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        title={BILLING_COPY.cancelDialog.title}
        maxWidth="sm"
      >
        <p className="text-sm text-[var(--muted)] mb-6">
          {BILLING_COPY.cancelDialog.body(
            subscription?.current_period_end
              ? formatDate(subscription.current_period_end)
              : '—',
          )}
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setCancelDialogOpen(false)}>
            {BILLING_COPY.cancelDialog.keep}
          </Button>
          <Button
            variant="danger"
            loading={cancelSubscription.isPending}
            onClick={() => {
              cancelSubscription.mutate(
                {},
                {
                  onSuccess: () => {
                    setCancelDialogOpen(false)
                    addToast({ title: 'Subscription cancelled.', variant: 'info' })
                  },
                },
              )
            }}
          >
            {BILLING_COPY.cancelDialog.confirm}
          </Button>
        </div>
      </Dialog>
    </AppShell>
  )
}
