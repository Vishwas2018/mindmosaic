'use client'
import { createContext, useContext, type ReactNode } from 'react'
import { useSubscription } from '@mm/sdk'
import type { SubscriptionTier } from '@mm/types'

interface EntitlementsContextValue {
  tier: SubscriptionTier
}

const EntitlementsContext = createContext<EntitlementsContextValue>({ tier: 'free' })

export function EntitlementsProvider({ children }: { children: ReactNode }) {
  const { data } = useSubscription()
  return (
    <EntitlementsContext.Provider value={{ tier: data?.tier ?? 'free' }}>
      {children}
    </EntitlementsContext.Provider>
  )
}

export function useEntitlements() {
  return useContext(EntitlementsContext)
}
