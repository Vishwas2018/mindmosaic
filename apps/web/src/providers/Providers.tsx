'use client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { AuthProvider } from './AuthProvider'
import { EntitlementsProvider } from './EntitlementsProvider'

export function Providers({
  children,
  initialSession,
}: {
  children: ReactNode
  initialSession: Session | null
}) {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 60_000 } } }),
  )

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider initialSession={initialSession}>
        <EntitlementsProvider>
          {children}
        </EntitlementsProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}
