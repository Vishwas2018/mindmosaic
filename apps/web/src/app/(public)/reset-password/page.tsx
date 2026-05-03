import type { Metadata } from 'next'
import { AuthPageShell } from '../../../components/auth/AuthPageShell'
import { ResetPasswordForm } from '../../../components/auth/ResetPasswordForm'

export const metadata: Metadata = { title: 'Set new password — MindMosaic' }

export default function ResetPasswordPage() {
  return (
    <AuthPageShell
      heading="Set new password"
      subheading="Choose a strong password for your account"
    >
      <ResetPasswordForm />
    </AuthPageShell>
  )
}
