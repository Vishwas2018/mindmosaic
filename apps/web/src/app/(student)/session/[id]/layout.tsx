import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import { createClient } from '../../../../lib/supabase/server'

// SCREEN_SPECS §10 route guard: session must exist, belong to student,
// be in_progress (mode practice/diagnostic for the practice route).
// The parent (student) layout already enforces auth + role=student. This
// layout adds the session-state branch:
//   submitted    → /results/{id}    (Stage 24 page; navigation wires now)
//   abandoned    → /session-selection
//   expired      → /session-selection
//   active /     → render children
//   in_progress  /
// On any DB error or missing row, fall back to /session-selection so the
// user is never trapped on an unrenderable page.
export default async function SessionLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: session } = await supabase
    .from('session_record')
    .select('id, status')
    .eq('id', id)
    .maybeSingle()

  if (!session) {
    redirect('/session-selection')
  }

  if (session.status === 'submitted') {
    redirect(`/results/${id}`)
  }
  if (session.status === 'abandoned' || session.status === 'expired') {
    redirect('/session-selection')
  }
  return <>{children}</>
}
