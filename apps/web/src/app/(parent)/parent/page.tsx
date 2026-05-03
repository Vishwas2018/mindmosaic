import type { Metadata } from 'next'
import { AppShell, TopBar, Brand, EmptyState } from '@mm/ui'

export const metadata: Metadata = { title: 'Parent dashboard — MindMosaic' }

export default function ParentDashboardPage() {
  return (
    <AppShell variant="student-parent">
      <TopBar>
        <Brand logoSrc="/logo.svg" size="sm" />
      </TopBar>
      <EmptyState
        title="Parent dashboard coming soon"
        description="Manage your children's accounts and track their progress. Available in a future release."
      />
    </AppShell>
  )
}
