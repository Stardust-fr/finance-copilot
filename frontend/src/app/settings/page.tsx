'use client';

import { useState } from 'react';

import { AppLayout } from '@/components/layout/app-layout';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth.context';
import { api } from '@/lib/api';

// ─── Generate last 6 months list ─────────────────────────────────────────────
function getLast6Months(): { value: string; label: string }[] {
  const months = [];
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    months.push({ value, label });
  }
  return months;
}

// ─── Download report helper ───────────────────────────────────────────────────
async function downloadReport(month: string): Promise<void> {
  const res = await api.get(`/reports/monthly?month=${month}`, {
    responseType: 'blob',
  });
  const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `finance-report-${month}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function SettingsPage() {
  const { user } = useAuth();
  const months = getLast6Months();
  const [selectedMonth, setSelectedMonth] = useState(months[0].value);
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportError, setReportError] = useState('');

  const handleDownload = async () => {
    setReportError('');
    setIsGenerating(true);
    try {
      await downloadReport(selectedMonth);
    } catch {
      setReportError('Failed to generate report. Make sure you have transactions for this month.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="mt-1 text-sm text-slate-400">Manage your account and download reports.</p>
      </div>

      <div className="flex max-w-xl flex-col gap-6">
        {/* ── Account info ──────────────────────────────────────────── */}
        <div className="rounded-xl border border-slate-700 bg-slate-800 p-6">
          <h2 className="mb-4 text-sm font-semibold text-slate-300">Account</h2>
          <div className="flex flex-col gap-3">
            {[
              { label: 'Name', value: user?.name },
              { label: 'Email', value: user?.email },
              {
                label: 'Member since',
                value: user?.createdAt
                  ? new Date(user.createdAt).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : '—',
              },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-slate-400">{label}</span>
                <span className="text-white">{value ?? '—'}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Monthly reports ───────────────────────────────────────── */}
        <div className="rounded-xl border border-slate-700 bg-slate-800 p-6">
          <h2 className="mb-1 text-sm font-semibold text-slate-300">Monthly Reports</h2>
          <p className="mb-4 text-xs text-slate-500">
            Download a PDF report containing your income, expenses, category breakdown, top
            merchants, and an AI-generated summary.
          </p>

          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-400">Month</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                disabled={isGenerating}
                className="h-10 rounded-lg border border-slate-600 bg-slate-700 px-3 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
              >
                {months.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <Button
              onClick={handleDownload}
              isLoading={isGenerating}
              disabled={isGenerating}
              className="h-10"
            >
              {!isGenerating && (
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
              )}
              Download PDF
            </Button>
          </div>

          {isGenerating && (
            <p className="mt-3 text-xs text-slate-400">
              Generating report… this may take a few seconds.
            </p>
          )}

          {reportError && (
            <p className="mt-3 text-xs text-red-400">{reportError}</p>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
