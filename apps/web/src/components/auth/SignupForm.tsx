'use client'
// G1: only parents self-register; students are created via parent or invite flow
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button, Input } from '@mm/ui'
import { createClient } from '../../lib/supabase/client'

const schema = z
  .object({
    fullName:        z.string().min(2, 'Enter your full name'),
    email:           z.string().email('Enter a valid email address'),
    password:        z.string().min(8, 'Minimum 8 characters'),
    confirmPassword: z.string(),
  })
  .refine(d => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
type FormData = z.infer<typeof schema>

export function SignupForm() {
  const router = useRouter()
  const supabase = createClient()

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: { full_name: data.fullName, role: 'parent' },
      },
    })
    if (error) {
      setError('root', { message: error.message })
      return
    }
    router.push('/auth/verify')
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <Input
        label="Full name"
        autoComplete="name"
        error={errors.fullName?.message}
        {...register('fullName')}
      />
      <Input
        label="Email"
        type="email"
        autoComplete="email"
        error={errors.email?.message}
        {...register('email')}
      />
      <Input
        label="Password"
        type="password"
        autoComplete="new-password"
        error={errors.password?.message}
        {...register('password')}
      />
      <Input
        label="Confirm password"
        type="password"
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        {...register('confirmPassword')}
      />

      {errors.root && (
        <p role="alert" className="text-sm text-[var(--error)]">
          {errors.root.message}
        </p>
      )}

      <Button type="submit" className="w-full" loading={isSubmitting}>
        Create account
      </Button>

      <p className="text-sm text-center text-[var(--muted)] pt-1">
        Already have an account?{' '}
        <Link href="/login" className="text-[var(--primary)] hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  )
}
