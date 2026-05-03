import type { Metadata } from 'next'
import { AppShell, EmptyState } from '@mm/ui'

export const metadata: Metadata = { title: 'Teacher dashboard — MindMosaic' }

export default function TeacherDashboardPage() {
  return (
    <AppShell variant="teacher">
      <EmptyState
        title="Teacher dashboard coming soon"
        description="Class management and student analytics. Available in a future release."
      />
    </AppShell>
  )
}
