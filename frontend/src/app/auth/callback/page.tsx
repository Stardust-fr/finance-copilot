'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';

import { useAuth } from '@/contexts/auth.context';

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loginWithToken } = useAuth();

  useEffect(() => {
    const token = searchParams.get('token');
    const error = searchParams.get('error');

    if (error) {
      router.replace('/login?error=oauth');
      return;
    }

    if (!token) {
      router.replace('/login?error=missing_token');
      return;
    }

    loginWithToken(token)
      .then(() => router.replace('/dashboard'))
      .catch(() => router.replace('/login?error=invalid_token'));
  }, [searchParams, loginWithToken, router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-900 text-white">
      <div className="flex flex-col items-center gap-4">
        <svg
          className="h-8 w-8 animate-spin text-emerald-400"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-label="Loading"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
        <p className="text-slate-400">Completing sign in...</p>
      </div>
    </main>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense>
      <CallbackHandler />
    </Suspense>
  );
}
