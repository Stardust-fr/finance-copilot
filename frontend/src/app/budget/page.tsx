'use client';

import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { AppLayout } from '@/components/layout/app-layout';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { useBudgets } from '@/hooks/useBudgets';
import { cn } from '@/lib/utils';
import {
  Budget,
  BUDGET_CATEGORIES,
  BudgetCategory,
  deleteBudget,
  upsertBudget,
} from '@/services/budget.service';

// ─── Form schema ──────────────────────────────────────────────────────────────
const budgetFormSchema = z.object({
  category: z.enum(BUDGET_CATEGORIES),
  monthlyLimit: z.coerce.number().positive('Must be greater than 0').max(1_000_000),
});
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BudgetForm = { category: BudgetCategory; monthlyLimit: any };

// ─── Category colour map ──────────────────────────────────────────────────────
const CATEGORY_COLORS: Record<string, string> = {
  FOOD: '#f97316',
  TRAVEL: '#3b82f6',
  SHOPPING: '#f59e0b',
  BILLS: '#6366f1',
  HEALTHCARE: '#8b5cf6',
  ENTERTAINMENT: '#ec4899',
  EDUCATION: '#14b8a6',
  OTHER: '#64748b',
};

function categoryLabel(cat: string) {
  return cat.charAt(0) + cat.slice(1).toLowerCase();
}

// ─── Progress bar ─────────────────────────────────────────────────────────────
function BudgetProgressBar({ budget }: { budget: Budget }) {
  const pct = Math.min(budget.percentUsed, 100);
  const isOver = budget.isOverBudget;
  const isWarning = !isOver && budget.percentUsed >= 80;
  const color = CATEGORY_COLORS[budget.category.toUpperCase()] ?? '#64748b';

  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-700">
      <div
        className={cn(
          'h-full rounded-full transition-all duration-700',
          isOver && 'bg-red-500',
          isWarning && 'bg-yellow-500',
          !isOver && !isWarning && 'transition-colors',
        )}
        style={{
          width: `${pct}%`,
          backgroundColor: isOver ? undefined : isWarning ? undefined : color,
        }}
      />
    </div>
  );
}

// ─── Single budget card ───────────────────────────────────────────────────────
function BudgetCard({
  budget,
  onEdit,
  onDelete,
}: {
  budget: Budget;
  onEdit: (b: Budget) => void;
  onDelete: (category: BudgetCategory) => void;
}) {
  const isOver = budget.isOverBudget;
  const isWarning = !isOver && budget.percentUsed >= 80;
  const color = CATEGORY_COLORS[budget.category.toUpperCase()] ?? '#64748b';
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Delete ${categoryLabel(budget.category)} budget?`)) return;
    setDeleting(true);
    try {
      await onDelete(budget.category as BudgetCategory);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      className={cn(
        'rounded-xl border bg-slate-800 p-5 transition-colors',
        isOver ? 'border-red-500/40' : isWarning ? 'border-yellow-500/40' : 'border-slate-700',
      )}
    >
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: color }}
          />
          <span className="text-sm font-semibold text-white">
            {categoryLabel(budget.category)}
          </span>
          {isOver && (
            <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-400">
              Over budget
            </span>
          )}
          {isWarning && (
            <span className="rounded-full bg-yellow-500/10 px-2 py-0.5 text-xs font-medium text-yellow-400">
              {budget.percentUsed}% used
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(budget)}
            className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-700 hover:text-slate-300"
            title="Edit"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-700 hover:text-red-400 disabled:opacity-40"
            title="Delete"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <BudgetProgressBar budget={budget} />

      {/* Amounts */}
      <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
        <span>
          <span className={cn('font-semibold', isOver ? 'text-red-400' : 'text-white')}>
            ${budget.spent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>{' '}
          spent
        </span>
        <span>
          of ${budget.monthlyLimit.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} limit
        </span>
      </div>

      {isOver ? (
        <p className="mt-1.5 text-xs text-red-400">
          ${Math.abs(budget.remaining).toFixed(2)} over budget this month
        </p>
      ) : (
        <p className="mt-1.5 text-xs text-slate-500">
          ${budget.remaining.toFixed(2)} remaining
        </p>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function BudgetPage() {
  const queryClient = useQueryClient();
  const { data: budgets, isLoading, isError } = useBudgets();
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<BudgetForm>({ resolver: zodResolver(budgetFormSchema) });

  const openAdd = () => {
    reset({ category: 'FOOD', monthlyLimit: undefined });
    setFormError('');
    setShowForm(true);
  };

  const openEdit = (b: Budget) => {
    reset({ category: b.category as BudgetCategory, monthlyLimit: b.monthlyLimit });
    setValue('category', b.category as BudgetCategory);
    setFormError('');
    setShowForm(true);
  };

  const onSubmit = async (data: BudgetForm) => {
    try {
      setFormError('');
      await upsertBudget(data.category, data.monthlyLimit);
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      setShowForm(false);
      reset();
    } catch {
      setFormError('Failed to save budget. Please try again.');
    }
  };

  const handleDelete = async (category: BudgetCategory) => {
    await deleteBudget(category);
    queryClient.invalidateQueries({ queryKey: ['budgets'] });
  };

  // Summary stats
  const overBudgetCount = budgets?.filter((b) => b.isOverBudget).length ?? 0;
  const totalBudgeted = budgets?.reduce((s, b) => s + b.monthlyLimit, 0) ?? 0;
  const totalSpent = budgets?.reduce((s, b) => s + b.spent, 0) ?? 0;

  // Categories that don't yet have a budget
  const usedCategories = new Set(budgets?.map((b) => b.category.toUpperCase()) ?? []);
  const availableCategories = BUDGET_CATEGORIES.filter((c) => !usedCategories.has(c));

  return (
    <AppLayout>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Budget</h1>
          <p className="mt-1 text-sm text-slate-400">
            Set monthly limits per category and track your spending.
          </p>
        </div>
        <Button onClick={openAdd} disabled={availableCategories.length === 0 && !showForm}>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add budget
        </Button>
      </div>

      {/* ── Summary strip ──────────────────────────────────────────── */}
      {budgets && budgets.length > 0 && (
        <div className="mb-6 grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
            <p className="text-xs text-slate-400">Total budgeted</p>
            <p className="mt-1 text-xl font-bold text-white">${totalBudgeted.toLocaleString()}</p>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
            <p className="text-xs text-slate-400">Total spent</p>
            <p className={cn('mt-1 text-xl font-bold', totalSpent > totalBudgeted ? 'text-red-400' : 'text-white')}>
              ${totalSpent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
            <p className="text-xs text-slate-400">Over budget</p>
            <p className={cn('mt-1 text-xl font-bold', overBudgetCount > 0 ? 'text-red-400' : 'text-emerald-400')}>
              {overBudgetCount} {overBudgetCount === 1 ? 'category' : 'categories'}
            </p>
          </div>
        </div>
      )}

      {/* ── Add / Edit form ─────────────────────────────────────────── */}
      {showForm && (
        <div className="mb-6 rounded-xl border border-indigo-500/30 bg-slate-800 p-6">
          <h2 className="mb-4 text-sm font-semibold text-slate-300">
            {usedCategories.size > 0 ? 'Set budget' : 'Add budget'}
          </h2>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-wrap items-end gap-4">
            {formError && (
              <p className="w-full text-xs text-red-400">{formError}</p>
            )}

            <FormField label="Category" className="w-44">
              <select
                {...register('category')}
                className="h-10 w-full rounded-lg border border-slate-600 bg-slate-700 px-3 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {BUDGET_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {categoryLabel(cat)}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Monthly limit ($)" error={errors.monthlyLimit?.message as string | undefined} className="w-44">
              <Input
                {...register('monthlyLimit')}
                type="number"
                min="1"
                step="1"
                placeholder="e.g. 300"
                error={errors.monthlyLimit?.message as string | undefined}
              />
            </FormField>

            <div className="flex gap-2 pb-0.5">
              <Button type="submit" isLoading={isSubmitting}>
                Save
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => { setShowForm(false); reset(); }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* ── Loading / Error / Empty ─────────────────────────────────── */}
      {isLoading && (
        <div className="flex h-48 items-center justify-center">
          <svg className="h-6 w-6 animate-spin text-emerald-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      )}

      {isError && (
        <div className="flex h-48 items-center justify-center rounded-xl border border-slate-700 bg-slate-800">
          <p className="text-sm text-red-400">Failed to load budgets. Try refreshing.</p>
        </div>
      )}

      {!isLoading && !isError && budgets?.length === 0 && !showForm && (
        <div className="flex h-56 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-600 bg-slate-800">
          <p className="text-sm text-slate-500">No budgets set yet.</p>
          <p className="text-xs text-slate-600">
            Click <span className="text-emerald-400">Add budget</span> to set your first monthly limit.
          </p>
          <p className="text-xs text-slate-600">
            Make sure you&apos;ve{' '}
            <Link href="/upload" className="text-emerald-400 hover:text-emerald-300">
              uploaded transactions
            </Link>{' '}
            so spent amounts are accurate.
          </p>
        </div>
      )}

      {/* ── Budget cards grid ──────────────────────────────────────── */}
      {!isLoading && budgets && budgets.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {budgets.map((b) => (
            <BudgetCard
              key={b.id}
              budget={b}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </AppLayout>
  );
}
