import { createContext, useContext, createElement, type ReactNode, type ReactElement } from 'react';
import { type MmClient } from './client.js';

const MmClientContext = createContext<MmClient | null>(null);

export interface MmClientProviderProps {
  client: MmClient;
  children?: ReactNode;
}

export function MmClientProvider({ client, children }: MmClientProviderProps): ReactElement {
  return createElement(MmClientContext.Provider, { value: client }, children);
}

export function useMmClient(): MmClient {
  const client = useContext(MmClientContext);
  if (client === null) {
    throw new Error('useMmClient: must be used inside <MmClientProvider>');
  }
  return client;
}
