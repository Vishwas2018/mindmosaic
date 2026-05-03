import type { Metadata } from 'next'
import { AppShell, EmptyState } from '@mm/ui'

export const metadata: Metadata = { title: 'Parent dashboard — MindMosaic' }

export default function ParentDashboardPage() {
  return (
    <AppShell variant="student-parent">
      <EmptyState
        title="Parent dashboard coming soon"
        description="Manage your children's accounts and track their progress. Available in a future release."
      />
    </AppShell>
  )
}
