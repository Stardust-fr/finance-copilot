'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTransactions } from '@/hooks/useTransactions';
import { cn } from '@/lib/utils';
import {
  AI_CATEGORIES,
  AiCategory,
  bulkDeleteTransactions,
  bulkRecategorizeTransactions,
  deleteTransaction,
  Transaction,
  updateCategory,
} from '@/services/transaction.service';

// ─── Tabs ─────────────────────────────────────────────────────────────────────
type ActiveTab = 'all' | 'flagged';

// ─── Category colour map ──────────────────────────────────────────────────────
const CATEGORY_COLORS: Record<string, string> = {
  INCOME: 'bg-emerald-500/10 text-emerald-400',
  FOOD: 'bg-orange-500/10 text-orange-400',
  BILLS: 'bg-indigo-500/10 text-indigo-400',
  TRAVEL: 'bg-blue-500/10 text-blue-400',
  SHOPPING: 'bg-yellow-500/10 text-yellow-400',
  ENTERTAINMENT: 'bg-pink-500/10 text-pink-400',
  HEALTHCARE: 'bg-purple-500/10 text-purple-400',
  EDUCATION: 'bg-teal-500/10 text-teal-400',
  OTHER: 'bg-slate-500/10 text-slate-400',
};

function getCategoryKey(tx: Transaction): string {
  return (tx.category ?? tx.aiCategory ?? '').toUpperCase();
}

function getCategoryLabel(tx: Transaction): string {
  const raw = tx.category ?? tx.aiCategory ?? null;
  if (!raw) return '—';
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
}

// ─── Inline category badge with override dropdown ─────────────────────────────
function CategoryBadge({ tx }: { tx: Transaction }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const key = getCategoryKey(tx);
  const colorClass = CATEGORY_COLORS[key] ?? 'bg-slate-700 text-slate-300';
  // Flag low-confidence AI assignments visually (< 0.7)
  const isLowConfidence = tx.confidence !== null && tx.confidence < 0.7;

  const handleSelect = async (category: AiCategory) => {
    setOpen(false);
    if (category === key) return;
    setSaving(true);
    try {
      await updateCategory(tx.id, category);
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={saving}
        title={
          isLowConfidence
            ? `Low AI confidence (${((tx.confidence ?? 0) * 100).toFixed(0)}%) — click to override`
            : 'Click to change category'
        }
        className={cn(
          'rounded-full px-2.5 py-0.5 text-xs font-medium transition-opacity hover:opacity-80 disabled:opacity-40',
          colorClass,
          isLowConfidence && 'ring-1 ring-yellow-500/60',
        )}
      >
        {saving ? '...' : getCategoryLabel(tx)}
        {isLowConfidence && <span className="ml-1 text-yellow-400">⚠</span>}
      </button>

      {open && (
        <>
          {/* Backdrop to close on outside click */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-1 w-44 rounded-xl border border-slate-700 bg-slate-800 py-1 shadow-xl">
            <p className="border-b border-slate-700 px-3 py-1.5 text-xs text-slate-500">
              Override category
            </p>
            {AI_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => handleSelect(cat)}
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors hover:bg-slate-700',
                  cat === key ? 'font-semibold text-white' : 'text-slate-300',
                )}
              >
                <span
                  className={cn(
                    'h-2 w-2 shrink-0 rounded-full',
                    (CATEGORY_COLORS[cat] ?? '').split(' ')[0],
                  )}
                />
                {cat.charAt(0) + cat.slice(1).toLowerCase()}
                {cat === key && <span className="ml-auto text-emerald-400">✓</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main table ───────────────────────────────────────────────────────────────
export function TransactionTable() {
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<ActiveTab>('all');
  const [merchant, setMerchant] = useState('');
  const [type, setType] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  const { data, isLoading, isError } = useTransactions({
    page,
    limit: 15,
    merchant: merchant || undefined,
    type: type === 'ALL' ? undefined : type,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    flagged: activeTab === 'flagged' ? true : undefined,
    sortBy: 'date',
    sortOrder: 'desc',
  });

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this transaction?')) return;
    setDeletingId(id);
    try {
      await deleteTransaction(id);
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      queryClient.invalidateQueries({ queryKey: ['summary'] });
    } finally {
      setDeletingId(null);
    }
  };

  const handleBulkDelete = async (deleteAll = false) => {
    const message = deleteAll
      ? 'Delete ALL transactions? This cannot be undone.'
      : `Delete ${selectedIds.size} selected transaction(s)?`;
    
    if (!confirm(message)) return;
    
    setBulkActionLoading(true);
    try {
      await bulkDeleteTransactions(
        deleteAll ? undefined : Array.from(selectedIds),
        deleteAll,
      );
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      queryClient.invalidateQueries({ queryKey: ['summary'] });
    } catch (error) {
      alert('Failed to delete transactions. Please try again.');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkRecategorize = async (recategorizeAll = false) => {
    const message = recategorizeAll
      ? 'Recategorize ALL transactions using AI? This may take a while.'
      : `Recategorize ${selectedIds.size} selected transaction(s) using AI?`;
    
    if (!confirm(message)) return;
    
    setBulkActionLoading(true);
    try {
      const result = await bulkRecategorizeTransactions(
        recategorizeAll ? undefined : Array.from(selectedIds),
        recategorizeAll,
      );
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      
      // Show result summary
      const messages = [];
      if (result.recategorized > 0) messages.push(`${result.recategorized} recategorized`);
      if (result.skipped > 0) messages.push(`${result.skipped} skipped`);
      if (result.failed > 0) messages.push(`${result.failed} failed`);
      
      if (messages.length > 0) {
        alert(`Recategorization complete:\n${messages.join(', ')}`);
      }
    } catch (error) {
      alert('Failed to recategorize transactions. Please try again.');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (!data?.data) return;
    if (selectedIds.size === data.data.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(data.data.map((tx) => tx.id)));
    }
  };

  const resetFilters = () => {
    setMerchant('');
    setType('ALL');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800">
      {/* ── Filters ───────────────────────────────────────────────── */}
      <div className="border-b border-slate-700 px-6 py-4">
        {/* Tab row */}
        <div className="mb-3 flex items-center justify-between">
          <div className="flex gap-1">
            {(['all', 'flagged'] as ActiveTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setPage(1); }}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                  activeTab === tab
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-400 hover:text-slate-300',
                )}
              >
                {tab === 'all' ? 'All' : '⚠ Flagged'}
              </button>
            ))}
          </div>
          {data && <span className="text-xs text-slate-500">{data.meta.total} total</span>}
        </div>

        {/* Bulk actions row */}
        {selectedIds.size > 0 && (
          <div className="mb-3 flex items-center justify-between rounded-lg bg-emerald-500/10 px-3 py-2">
            <span className="text-sm text-emerald-400">{selectedIds.size} selected</span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkRecategorize(false)}
                disabled={bulkActionLoading}
                className="h-7 text-xs"
              >
                {bulkActionLoading ? 'Processing...' : 'Recategorize Selected'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkDelete(false)}
                disabled={bulkActionLoading}
                className="h-7 text-xs text-red-400 hover:text-red-300"
              >
                {bulkActionLoading ? 'Deleting...' : 'Delete Selected'}
              </Button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-xs text-slate-500 hover:text-slate-300"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Global bulk actions */}
        <div className="mb-3 flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleBulkRecategorize(true)}
            disabled={bulkActionLoading}
            className="h-7 text-xs"
          >
            Recategorize All
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleBulkDelete(true)}
            disabled={bulkActionLoading}
            className="h-7 text-xs text-red-400 hover:text-red-300"
          >
            Delete All
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Search merchant..."
            value={merchant}
            onChange={(e) => { setMerchant(e.target.value); setPage(1); }}
            className="h-8 w-44 text-xs"
          />
          <select
            value={type}
            onChange={(e) => { setType(e.target.value as typeof type); setPage(1); }}
            className="h-8 rounded-lg border border-slate-600 bg-slate-700 px-2 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="ALL">All types</option>
            <option value="INCOME">Income</option>
            <option value="EXPENSE">Expense</option>
          </select>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            className="h-8 rounded-lg border border-slate-600 bg-slate-700 px-2 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <span className="text-xs text-slate-500">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            className="h-8 rounded-lg border border-slate-600 bg-slate-700 px-2 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          {(merchant || type !== 'ALL' || dateFrom || dateTo) && (
            <button onClick={resetFilters} className="text-xs text-slate-500 hover:text-slate-300">
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Body ──────────────────────────────────────────────────── */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <svg className="h-6 w-6 animate-spin text-emerald-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      )}

      {isError && (
        <div className="py-12 text-center text-sm text-red-400">
          Failed to load transactions. Try refreshing.
        </div>
      )}

      {!isLoading && !isError && data?.data.length === 0 && (
        <div className="py-16 text-center">
          <p className="text-sm text-slate-500">No transactions found.</p>
          <p className="mt-1 text-xs text-slate-600">
            {merchant || type !== 'ALL' || dateFrom || dateTo
              ? 'Try clearing the filters.'
              : activeTab === 'flagged'
              ? 'No flagged transactions — your transactions look clean.'
              : 'Upload a CSV to get started.'}
          </p>
        </div>
      )}

      {!isLoading && data && data.data.length > 0 && (
        <>
          {/* Header row with select all checkbox */}
          <div className="flex items-center gap-3 border-b border-slate-700/50 px-6 py-2.5 text-xs font-medium text-slate-400">
            <input
              type="checkbox"
              checked={data.data.length > 0 && selectedIds.size === data.data.length}
              onChange={toggleSelectAll}
              className="h-4 w-4 cursor-pointer rounded border-slate-600 bg-slate-700 text-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
            <span className="flex-1">Transaction</span>
            <span className="w-24 text-right">Category</span>
            <span className="w-24 text-right">Amount</span>
            <span className="w-4"></span>
          </div>

          <div className="divide-y divide-slate-700/50">
            {data.data.map((tx) => (
              <div
                key={tx.id}
                className={cn(
                  'flex items-center gap-3 px-6 py-3.5 transition-colors hover:bg-slate-700/30',
                  tx.isFlagged && 'bg-red-500/5',
                  selectedIds.has(tx.id) && 'bg-emerald-500/5',
                )}
              >
                {/* Checkbox */}
                <input
                  type="checkbox"
                  checked={selectedIds.has(tx.id)}
                  onChange={() => toggleSelection(tx.id)}
                  className="h-4 w-4 cursor-pointer rounded border-slate-600 bg-slate-700 text-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  onClick={(e) => e.stopPropagation()}
                />

                {/* Left */}
                <div className="flex flex-1 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-700 text-sm font-bold text-slate-300">
                    {tx.merchant[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-white">{tx.merchant}</p>
                      {tx.isFlagged && (
                        <span
                          className="rounded-full bg-red-500/10 px-1.5 py-0.5 text-xs text-red-400"
                          title={`Risk score: ${tx.riskScore ?? 0}/100`}
                        >
                          ⚠ flagged {tx.riskScore !== null && tx.riskScore > 0 ? `(${tx.riskScore})` : ''}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">
                      {new Date(tx.date).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric',
                      })}
                      {tx.account && (
                        <span className="ml-2 text-slate-600">· {tx.account.bankName}</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Right */}
                <div className="flex items-center gap-3">
                  <CategoryBadge tx={tx} />
                  <span
                    className={cn(
                      'w-24 text-right text-sm font-semibold',
                      tx.type === 'INCOME' ? 'text-emerald-400' : 'text-white',
                    )}
                  >
                    {tx.type === 'INCOME' ? '+' : '-'}${parseFloat(tx.amount).toFixed(2)}
                  </span>
                  <button
                    onClick={() => handleDelete(tx.id)}
                    disabled={deletingId === tx.id}
                    className="ml-1 text-slate-600 transition-colors hover:text-red-400 disabled:opacity-40"
                    title="Delete transaction"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Pagination ─────────────────────────────────────────────── */}
      {data && data.meta.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-700 px-6 py-3">
          <span className="text-xs text-slate-500">
            Page {data.meta.page} of {data.meta.totalPages}
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setPage((p) => p - 1)} disabled={!data.meta.hasPrevPage}>
              Previous
            </Button>
            <Button size="sm" variant="outline" onClick={() => setPage((p) => p + 1)} disabled={!data.meta.hasNextPage}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
