'use client'
// PHASE-2: entitlements fetched from /users/me; stubbed free tier for now
import { createContext, useContext, type ReactNode } from 'react'

interface EntitlementsContextValue {
  tier: 'free' | 'standard' | 'premium'
}

const EntitlementsContext = createContext<EntitlementsContextValue>({ tier: 'free' })

export function EntitlementsProvider({ children }: { children: ReactNode }) {
  return (
    <EntitlementsContext.Provider value={{ tier: 'free' }}>
      {children}
    </EntitlementsContext.Provider>
  )
}

export function useEntitlements() {
  return useContext(EntitlementsContext)
}
