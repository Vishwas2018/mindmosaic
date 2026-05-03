import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import { createClient } from '../../lib/supabase/server'

const TEACHER_ROLES = new Set(['teacher', 'tutor'])

export default async function TeacherLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session || !TEACHER_ROLES.has(session.user.app_metadata?.['role'] as string)) {
    redirect('/login')
  }

  return <>{children}</>
}
