'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { useAnalytics } from '@/hooks/useAnalytics';

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

function shortMonth(ym: string) {
  const [y, m] = ym.split('-');
  return new Date(Number(y), Number(m) - 1).toLocaleString('en-US', { month: 'short' });
}

function Spinner() {
  return (
    <div className="flex h-[220px] items-center justify-center">
      <svg className="h-6 w-6 animate-spin text-emerald-400" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>
  );
}

// ─── Monthly income vs expenses bar chart ────────────────────────────────────
export function MonthlyBarChart() {
  const { data, isLoading } = useAnalytics();

  const chartData = (data?.monthlyTrend ?? [])
    .slice(-6)
    .map((t) => ({ month: shortMonth(t.month), income: t.income, expenses: t.expenses }));

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800 p-6">
      <h3 className="mb-4 text-sm font-semibold text-slate-300">Income vs Expenses (6 months)</h3>

      {isLoading ? (
        <Spinner />
      ) : chartData.length === 0 ? (
        <div className="flex h-[220px] items-center justify-center text-sm text-slate-500">
          No data yet — upload a CSV to see your trend.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} barSize={16} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
            <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `$${Number(v) >= 1000 ? `${(Number(v) / 1000).toFixed(0)}k` : v}`}
            />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`$${Number(v).toLocaleString()}`, '']} />
            <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} name="Income" />
            <Bar dataKey="expenses" fill="#6366f1" radius={[4, 4, 0, 0]} name="Expenses" />
          </BarChart>
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
  );
}

// ─── Category pie chart ───────────────────────────────────────────────────────
export function CategoryPieChart() {
  const { data, isLoading } = useAnalytics();

  const chartData = (data?.categoryBreakdown ?? []).slice(0, 7);

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800 p-6">
      <h3 className="mb-4 text-sm font-semibold text-slate-300">Spending by Category</h3>

      {isLoading ? (
        <div className="flex h-[160px] items-center justify-center">
          <svg className="h-6 w-6 animate-spin text-emerald-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : chartData.length === 0 ? (
        <div className="flex h-[160px] items-center justify-center text-sm text-slate-500">
          No expense data yet.
        </div>
      ) : (
        <div className="flex items-center gap-4">
          <ResponsiveContainer width={160} height={160}>
            <PieChart>
              <Pie data={chartData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="total" strokeWidth={0}>
                {chartData.map((_, i) => (
                  <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`$${Number(v).toLocaleString()}`, '']} />
            </PieChart>
          </ResponsiveContainer>
          <ul className="flex flex-1 flex-col gap-2">
            {chartData.map((c, i) => (
              <li key={`${c.category}-${i}`} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                  {c.category}
                </span>
                <span className="font-medium text-white">
                  ${c.total.toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
