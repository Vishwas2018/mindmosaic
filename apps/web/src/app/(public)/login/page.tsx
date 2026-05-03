import type { Metadata } from 'next'
import { AuthPageShell } from '../../../components/auth/AuthPageShell'
import { LoginForm } from '../../../components/auth/LoginForm'

export const metadata: Metadata = { title: 'Sign in — MindMosaic' }

export default function LoginPage() {
  return (
    <AuthPageShell heading="Welcome back" subheading="Sign in to your MindMosaic account">
      <LoginForm />
    </AuthPageShell>
  )
}
