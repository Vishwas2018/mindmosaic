import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import { createClient } from '../../lib/supabase/server'

export default async function ParentLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  // Stage 45 Q-45.5: extend guard to allow org_admin alongside parent
  const role = session?.user.app_metadata?.['role']
  if (!session || !(role === 'parent' || role === 'org_admin')) {
    redirect('/dashboard') // Stage 45 Q-45.4: redirect authenticated non-parents to dashboard
  }

  return <>{children}</>
}
