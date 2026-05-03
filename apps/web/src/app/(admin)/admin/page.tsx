import type { Metadata } from 'next'
import { AppShell, TopBar, Brand, EmptyState } from '@mm/ui'

export const metadata: Metadata = { title: 'Admin — MindMosaic' }

export default function AdminDashboardPage() {
  return (
    <AppShell variant="admin">
      <TopBar>
        <Brand logoSrc="/logo.svg" size="sm" />
      </TopBar>
      <EmptyState
        title="Admin dashboard coming soon"
        description="Platform administration and tenant management. Available in a future release."
      />
    </AppShell>
  )
}
