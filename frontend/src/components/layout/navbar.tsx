'use client';

import { useState } from 'react';

import { useAuth } from '@/contexts/auth.context';
import { cn } from '@/lib/utils';

export function Navbar() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const initials = user?.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-700 bg-slate-900 px-6">
      {/* Page title slot — filled by each page via the h1 */}
      <div />

      {/* Right side */}
      <div className="relative">
        <button
          onClick={() => setMenuOpen((o) => !o)}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
          aria-haspopup="true"
          aria-expanded={menuOpen}
        >
          {/* Avatar */}
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white">
            {initials}
          </span>
          <span className="hidden sm:inline">{user?.name}</span>
          <svg
            className={cn('h-4 w-4 transition-transform', menuOpen && 'rotate-180')}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown */}
        {menuOpen && (
          <div className="absolute right-0 top-12 z-50 w-48 rounded-xl border border-slate-700 bg-slate-800 py-1 shadow-xl">
            <div className="border-b border-slate-700 px-4 py-2">
              <p className="text-sm font-medium text-white">{user?.name}</p>
              <p className="truncate text-xs text-slate-400">{user?.email}</p>
            </div>
            <button
              onClick={() => {
                setMenuOpen(false);
                logout();
              }}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
