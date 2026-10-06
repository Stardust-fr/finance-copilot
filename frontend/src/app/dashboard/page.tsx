'use client';

import Link from 'next/link';

import { CategoryPieChart, MonthlyBarChart } from '@/components/dashboard/spending-chart';
import { StatCard } from '@/components/dashboard/stat-card';
import { TransactionTable } from '@/components/dashboard/transaction-table';
import { AppLayout } from '@/components/layout/app-layout';
import { useAuth } from '@/contexts/auth.context';
import { useSummary } from '@/hooks/useSummary';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: summary, isLoading: summaryLoading } = useSummary();

  const income = summary?.totalIncome ?? 0;
  const expenses = summary?.totalExpenses ?? 0;
  const savings = summary?.netSavings ?? 0;
  const savingsRate = summary?.savingsRate ?? 0;

  return (
    <AppLayout>
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">
          Welcome back, <span className="text-emerald-400">{user?.name?.split(' ')[0]}</span>
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Here&apos;s your financial summary.
        </p>
      </div>

      {/* Empty state — no transactions yet */}
      {!summaryLoading && income === 0 && expenses === 0 && (
        <div className="mb-6 flex items-center gap-4 rounded-xl border border-dashed border-slate-600 bg-slate-800 px-6 py-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/10">
            <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-white">No transactions yet</p>
            <p className="text-xs text-slate-400">
              <Link href="/upload" className="text-emerald-400 hover:text-emerald-300">
                Upload a CSV
              </Link>{' '}
              to see your financial summary here.
            </p>
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="Total Income"
          value={summaryLoading ? '...' : formatCurrency(income)}
          iconBg="bg-emerald-500/10"
          icon={
            <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 11l5-5m0 0l5 5m-5-5v12" />
            </svg>
          }
        />
        <StatCard
          title="Total Expenses"
          value={summaryLoading ? '...' : formatCurrency(expenses)}
          iconBg="bg-red-500/10"
          icon={
            <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 13l-5 5m0 0l-5-5m5 5V6" />
            </svg>
          }
        />
        <StatCard
          title="Net Savings"
          value={summaryLoading ? '...' : formatCurrency(savings)}
          change={summaryLoading ? undefined : `${savingsRate}% savings rate`}
          changeType={savingsRate >= 20 ? 'positive' : savingsRate > 0 ? 'neutral' : 'negative'}
          iconBg="bg-indigo-500/10"
          icon={
            <svg className="h-5 w-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
        />
      </div>

      {/* Charts — still showing illustrative data until Task 9 analytics API */}
      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <MonthlyBarChart />
        </div>
        <div>
          <CategoryPieChart />
        </div>
      </div>

      {/* Real transaction table */}
      <TransactionTable />
    </AppLayout>
  );
}
