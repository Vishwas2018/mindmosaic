'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { Button, Input } from '@mm/ui'
import { createClient } from '../../lib/supabase/client'

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
})
type FormData = z.infer<typeof schema>

export function ForgotPasswordForm() {
  const [sent, setSent] = useState(false)
  const supabase = createClient()

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) {
      setError('root', { message: error.message })
      return
    }
    setSent(true)
  }

  if (sent) {
    return (
      <div className="space-y-4 text-center py-4">
        <p className="text-sm text-[var(--text)]">
          Check your inbox — we sent a password reset link.
        </p>
        <Link href="/login" className="text-sm text-[var(--primary)] hover:underline">
          Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <Input
        label="Email"
        type="email"
        autoComplete="email"
        error={errors.email?.message}
        {...register('email')}
      />

      {errors.root && (
        <p role="alert" className="text-sm text-[var(--error)]">
          {errors.root.message}
        </p>
      )}

      <Button type="submit" className="w-full" loading={isSubmitting}>
        Send reset link
      </Button>

      <p className="text-sm text-center pt-1">
        <Link href="/login" className="text-[var(--muted)] hover:underline">
          Back to sign in
        </Link>
      </p>
    </form>
  )
}
