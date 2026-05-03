import type { Metadata } from 'next'
import { AppShell, EmptyState } from '@mm/ui'

export const metadata: Metadata = { title: 'Admin — MindMosaic' }

export default function AdminDashboardPage() {
  return (
    <AppShell variant="admin">
      <EmptyState
        title="Admin dashboard coming soon"
        description="Platform administration and tenant management. Available in a future release."
      />
    </AppShell>
  )
}
