'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { Button, Input } from '@mm/ui'
import { createClient } from '../../lib/supabase/client'

const schema = z
  .object({
    password:        z.string().min(8, 'Minimum 8 characters'),
    confirmPassword: z.string(),
  })
  .refine(d => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
type FormData = z.infer<typeof schema>

export function ResetPasswordForm() {
  const router = useRouter()
  const supabase = createClient()

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    const { error } = await supabase.auth.updateUser({ password: data.password })
    if (error) {
      setError('root', { message: error.message })
      return
    }
    router.push('/login')
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <Input
        label="New password"
        type="password"
        autoComplete="new-password"
        error={errors.password?.message}
        {...register('password')}
      />
      <Input
        label="Confirm new password"
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
        Set new password
      </Button>
    </form>
  )
}
