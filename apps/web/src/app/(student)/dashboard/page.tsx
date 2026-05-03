import type { Metadata } from 'next'
import { AppShell, EmptyState } from '@mm/ui'

export const metadata: Metadata = { title: 'Dashboard — MindMosaic' }

export default function StudentDashboardPage() {
  return (
    <AppShell variant="student-parent">
      <EmptyState
        title="Dashboard coming soon"
        description="Your learning dashboard is being built. Available in a future release."
      />
    </AppShell>
  )
}
