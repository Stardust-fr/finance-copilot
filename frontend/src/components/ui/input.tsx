import * as React from 'react';

import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          'w-full rounded-lg border bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-500',
          'focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'transition-colors',
          error ? 'border-red-500' : 'border-slate-600 hover:border-slate-500',
          className,
        )}
        {...props}
      />
    );
  },
);

Input.displayName = 'Input';
