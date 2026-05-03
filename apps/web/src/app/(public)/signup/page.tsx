import type { Metadata } from 'next'
import { AuthPageShell } from '../../../components/auth/AuthPageShell'
import { SignupForm } from '../../../components/auth/SignupForm'

export const metadata: Metadata = { title: 'Create account — MindMosaic' }

export default function SignupPage() {
  return (
    <AuthPageShell
      heading="Create your account"
      subheading="Start your child's learning journey today"
    >
      <SignupForm />
    </AuthPageShell>
  )
}
