'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/auth.context';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginForm) => {
    try {
      setServerError('');
      await login(data.email, data.password);
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
          <p className="mt-2 text-slate-400">Sign in to your account</p>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-slate-700 bg-slate-800 p-8">
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
            {serverError && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {serverError}
              </div>
            )}

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
                placeholder="Your password"
                autoComplete="current-password"
                error={errors.password?.message}
              />
            </FormField>

            <Button type="submit" isLoading={isSubmitting} size="lg" className="mt-2 w-full">
              Sign in
            </Button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-700" />
            <span className="text-xs text-slate-500">or</span>
            <div className="h-px flex-1 bg-slate-700" />
          </div>

          {/* Google OAuth */}
          <a
            href={`${API_URL}/auth/google`}
            className="flex w-full items-center justify-center gap-3 rounded-lg border border-slate-600 bg-slate-700 px-4 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-600 hover:text-white"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </a>

          <p className="mt-6 text-center text-sm text-slate-400">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-emerald-400 hover:text-emerald-300">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
