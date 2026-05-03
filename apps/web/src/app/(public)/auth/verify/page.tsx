import type { Metadata } from 'next'
import Link from 'next/link'
import { AuthPageShell } from '../../../../components/auth/AuthPageShell'

export const metadata: Metadata = { title: 'Verify your email — MindMosaic' }

export default function VerifyEmailPage() {
  return (
    <AuthPageShell heading="Check your inbox">
      <div className="space-y-4">
        <p className="text-sm text-[var(--text)]">
          We sent a confirmation link to your email address. Click the link to activate your
          account.
        </p>
        <p className="text-sm text-[var(--muted)]">
          Didn&apos;t receive it? Check your spam folder, or{' '}
          <Link href="/signup" className="text-[var(--primary)] hover:underline">
            try a different email
          </Link>
          .
        </p>
      </div>
    </AuthPageShell>
  )
}
