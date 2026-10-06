'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { FormField } from '@/components/ui/form-field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/auth.context';

const registerSchema = z
  .object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain an uppercase letter')
      .regex(/[0-9]/, 'Must contain a number'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerUser } = useAuth();
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (data: RegisterForm) => {
    try {
      setServerError('');
      await registerUser(data.name, data.email, data.password);
      router.push('/dashboard');
    } catch (err: unknown) {
      const message =
        err &&
        typeof err === 'object' &&
        'response' in err &&
        err.response &&
        typeof err.response === 'object' &&
        'data' in err.response &&
        err.response.data &&
        typeof err.response.data === 'object' &&
        'message' in err.response.data
          ? String(err.response.data.message)
          : 'Something went wrong. Please try again.';
      setServerError(message);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-900 px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-white">
            Finance <span className="text-emerald-400">Copilot</span>
          </h1>
          <p className="mt-2 text-slate-400">Create your account</p>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-slate-700 bg-slate-800 p-8">
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
            {serverError && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {serverError}
              </div>
            )}

            <FormField label="Full name" error={errors.name?.message} required>
              <Input
                {...register('name')}
                type="text"
                placeholder="John Doe"
                autoComplete="name"
                error={errors.name?.message}
              />
            </FormField>

            <FormField label="Email" error={errors.email?.message} required>
              <Input
                {...register('email')}
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                error={errors.email?.message}
              />
            </FormField>

            <FormField label="Password" error={errors.password?.message} required>
              <Input
                {...register('password')}
                type="password"
                placeholder="Min 8 chars, 1 uppercase, 1 number"
                autoComplete="new-password"
                error={errors.password?.message}
              />
            </FormField>

            <FormField label="Confirm password" error={errors.confirmPassword?.message} required>
              <Input
                {...register('confirmPassword')}
                type="password"
                placeholder="Repeat your password"
                autoComplete="new-password"
                error={errors.confirmPassword?.message}
              />
            </FormField>

            <Button type="submit" isLoading={isSubmitting} size="lg" className="mt-2 w-full">
              Create account
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-400">
            Already have an account?{' '}
            <Link href="/login" className="text-emerald-400 hover:text-emerald-300">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
