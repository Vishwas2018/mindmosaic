import type { Metadata } from 'next'
import { AuthPageShell } from '../../../components/auth/AuthPageShell'
import { ForgotPasswordForm } from '../../../components/auth/ForgotPasswordForm'

export const metadata: Metadata = { title: 'Reset password — MindMosaic' }

export default function ForgotPasswordPage() {
  return (
    <AuthPageShell
      heading="Forgot your password?"
      subheading="Enter your email and we'll send you a reset link"
    >
      <ForgotPasswordForm />
    </AuthPageShell>
  )
}
