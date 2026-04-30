import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'MindMosaic',
  description: 'Adaptive learning for NAPLAN Y5 Numeracy + ICAS Math',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
