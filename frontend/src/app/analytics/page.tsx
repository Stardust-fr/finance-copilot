'use client';

import Link from 'next/link';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { AppLayout } from '@/components/layout/app-layout';
import { useAnalytics } from '@/hooks/useAnalytics';
import { cn } from '@/lib/utils';

const CATEGORY_COLORS = [
  '#10b981', '#6366f1', '#f59e0b', '#3b82f6',
  '#ec4899', '#8b5cf6', '#14b8a6', '#f97316', '#64748b',
];

const TOOLTIP_STYLE = {
  backgroundColor: '#1e293b',
  border: '1px solid #334155',
  borderRadius: '8px',
  color: '#f1f5f9',
  fontSize: '12px',
};

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function shortMonth(ym: string) {
  const [y, m] = ym.split('-');
  return new Date(Number(y), Number(m) - 1).toLocaleString('en-US', {
    month: 'short',
    year: '2-digit',
  });
}

function Spinner() {
  return (
    <div className="flex h-52 items-center justify-center">
      <svg className="h-6 w-6 animate-spin text-emerald-400" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-52 items-center justify-center text-sm text-slate-500">{message}</div>
  );
}

export default function AnalyticsPage() {
  const { data, isLoading, isError } = useAnalytics();

  const hasData = !isLoading && !isError && (data?.summary.transactionCount ?? 0) > 0;
  const isEmpty = !isLoading && !isError && (data?.summary.transactionCount ?? 0) === 0;

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
        <p className="mt-1 text-sm text-slate-400">
          Spending trends and category breakdowns from your imported transactions.
        </p>
      </div>

      {/* Error */}
      {isError && (
        <div className="flex h-64 items-center justify-center rounded-xl border border-slate-700 bg-slate-800">
          <p className="text-sm text-red-400">Failed to load analytics. Try refreshing.</p>
        </div>
      )}

      {/* Empty state */}
      {isEmpty && (
        <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-600 bg-slate-800">
          <p className="text-sm text-slate-500">No transaction data yet.</p>
          <Link href="/upload" className="text-xs text-emerald-400 hover:text-emerald-300">
            Upload a CSV to see your analytics →
          </Link>
        </div>
      )}

      {(isLoading || hasData) && (
        <>
          {/* ── Summary strip ──────────────────────────────────────── */}
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: 'Total Income', value: isLoading ? '...' : fmt(data!.summary.totalIncome), color: 'text-emerald-400' },
              { label: 'Total Expenses', value: isLoading ? '...' : fmt(data!.summary.totalExpenses), color: 'text-red-400' },
              { label: 'Net Savings', value: isLoading ? '...' : fmt(data!.summary.netSavings), color: 'text-indigo-400' },
              { label: 'Savings Rate', value: isLoading ? '...' : `${data!.summary.savingsRate}%`, color: 'text-yellow-400' },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-xl border border-slate-700 bg-slate-800 p-4">
                <p className="text-xs text-slate-400">{label}</p>
                <p className={cn('mt-1 text-xl font-bold', color)}>{value}</p>
              </div>
            ))}
          </div>

          {/* ── Monthly trend — Line chart ──────────────────────────── */}
          <div className="mb-6 rounded-xl border border-slate-700 bg-slate-800 p-6">
            <h3 className="mb-4 text-sm font-semibold text-slate-300">
              Monthly Income vs Expenses
            </h3>
            {isLoading ? (
              <Spinner />
            ) : (data!.monthlyTrend.length === 0) ? (
              <EmptyChart message="No monthly data" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart
                  data={data!.monthlyTrend.map((t) => ({ ...t, month: shortMonth(t.month) }))}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) =>
                      `$${Number(v) >= 1000 ? `${(Number(v) / 1000).toFixed(0)}k` : v}`
                    }
                  />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(v) => [`$${Number(v).toLocaleString()}`, '']}
                  />
                  <Line type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} dot={false} name="Income" />
                  <Line type="monotone" dataKey="expenses" stroke="#6366f1" strokeWidth={2} dot={false} name="Expenses" />
                </LineChart>
              </ResponsiveContainer>
            )}
            <div className="mt-3 flex gap-4">
              <span className="flex items-center gap-1.5 text-xs text-slate-400">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Income
              </span>
              <span className="flex items-center gap-1.5 text-xs text-slate-400">
                <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" /> Expenses
              </span>
            </div>
          </div>

          {/* ── Pie + Top merchants ─────────────────────────────────── */}
          <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Pie chart */}
            <div className="rounded-xl border border-slate-700 bg-slate-800 p-6">
              <h3 className="mb-4 text-sm font-semibold text-slate-300">Spending by Category</h3>
              {isLoading ? (
                <Spinner />
              ) : data!.categoryBreakdown.length === 0 ? (
                <EmptyChart message="No expense categories" />
              ) : (
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width={160} height={180}>
                    <PieChart>
                      <Pie
                        data={data!.categoryBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={75}
                        dataKey="total"
                        strokeWidth={0}
                      >
                        {data!.categoryBreakdown.map((_, i) => (
                          <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={TOOLTIP_STYLE}
                        formatter={(v) => [`$${Number(v).toLocaleString()}`, '']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <ul className="flex flex-1 flex-col gap-2 overflow-y-auto" style={{ maxHeight: 200 }}>
                    {data!.categoryBreakdown.map((c, i) => (
                      <li key={c.category} className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 text-slate-300">
                          <span
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{ backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }}
                          />
                          {c.category}
                        </span>
                        <span className="ml-2 font-medium text-white">
                          {fmt(c.total)}{' '}
                          <span className="text-slate-500">({c.percentage}%)</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Top merchants horizontal bar */}
            <div className="rounded-xl border border-slate-700 bg-slate-800 p-6">
              <h3 className="mb-4 text-sm font-semibold text-slate-300">Top 5 Merchants</h3>
              {isLoading ? (
                <Spinner />
              ) : data!.topMerchants.length === 0 ? (
                <EmptyChart message="No merchant data" />
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={data!.topMerchants} layout="vertical" barSize={14}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) =>
                        `$${Number(v) >= 1000 ? `${(Number(v) / 1000).toFixed(0)}k` : v}`
                      }
                    />
                    <YAxis
                      type="category"
                      dataKey="merchant"
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      width={100}
                    />
                    <Tooltip
                      contentStyle={TOOLTIP_STYLE}
                      formatter={(v) => [`$${Number(v).toLocaleString()}`, 'Total spent']}
                    />
                    <Bar dataKey="total" fill="#6366f1" radius={[0, 4, 4, 0]} name="Total spent" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* ── Monthly net savings bar ─────────────────────────────── */}
          {(isLoading || (data?.monthlyTrend ?? []).length > 1) && (
            <div className="rounded-xl border border-slate-700 bg-slate-800 p-6">
              <h3 className="mb-4 text-sm font-semibold text-slate-300">Monthly Net Savings</h3>
              {isLoading ? (
                <Spinner />
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart
                    data={data!.monthlyTrend.map((t) => ({ ...t, month: shortMonth(t.month) }))}
                    barSize={20}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) =>
                        `$${Number(v) >= 1000 ? `${(Number(v) / 1000).toFixed(0)}k` : v}`
                      }
                    />
                    <Tooltip
                      contentStyle={TOOLTIP_STYLE}
                      formatter={(v) => [`$${Number(v).toLocaleString()}`, 'Net savings']}
                    />
                    <Bar dataKey="net" radius={[4, 4, 0, 0]} name="Net savings">
                      {data!.monthlyTrend.map((t, i) => (
                        <Cell key={i} fill={t.net >= 0 ? '#10b981' : '#ef4444'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          )}
        </>
      )}
    </AppLayout>
  );
}
