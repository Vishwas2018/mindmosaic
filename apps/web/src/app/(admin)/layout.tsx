import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import { createClient } from '../../lib/supabase/server'

const ADMIN_ROLES = new Set(['org_admin', 'platform_admin'])

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session || !ADMIN_ROLES.has(session.user.app_metadata?.['role'] as string)) {
    redirect('/login')
  }

  return <>{children}</>
}
