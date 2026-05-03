import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import { createClient } from '../../lib/supabase/server'

export default async function ParentLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session || session.user.app_metadata?.['role'] !== 'parent') {
    redirect('/login')
  }

  return <>{children}</>
}
