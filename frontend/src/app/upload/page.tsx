'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';

import { AppLayout } from '@/components/layout/app-layout';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ImportSummary, uploadCsv } from '@/services/transaction.service';

type UploadState = 'idle' | 'uploading' | 'done' | 'error';

export default function UploadPage() {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);

  const [state, setState] = useState<UploadState>('idle');
  const [isDragging, setIsDragging] = useState(false);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleFile = useCallback(
    async (file: File) => {
      const name = file.name.toLowerCase();
      const validExt = name.endsWith('.csv') || name.endsWith('.xlsx') || name.endsWith('.xls');
      if (!validExt) {
        setErrorMsg('Only CSV and Excel (.xlsx, .xls) files are supported.');
        setState('error');
        return;
      }

      setState('uploading');
      setErrorMsg('');
      setSummary(null);

      try {
        const result = await uploadCsv(file);
        setSummary(result);
        setState('done');
        // Invalidate transactions and summary so dashboard refreshes
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
        queryClient.invalidateQueries({ queryKey: ['summary'] });
      } catch {
        setErrorMsg('Upload failed. Please try again.');
        setState('error');
      }
    },
    [queryClient],
  );

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset so the same file can be re-uploaded after fixing errors
    e.target.value = '';
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const reset = () => {
    setState('idle');
    setSummary(null);
    setErrorMsg('');
  };

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Upload Transactions</h1>
        <p className="mt-1 text-sm text-slate-400">
          Import your bank statement CSV. Duplicates are skipped automatically.
        </p>
      </div>

      <div className="mx-auto max-w-xl">
        {/* ── Drop zone ─────────────────────────────────────────────── */}
        {state !== 'done' && (
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            onClick={() => state !== 'uploading' && inputRef.current?.click()}
            className={cn(
              'flex cursor-pointer flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed px-8 py-14 transition-colors',
              isDragging
                ? 'border-emerald-400 bg-emerald-500/5'
                : 'border-slate-600 bg-slate-800 hover:border-slate-500',
              state === 'uploading' && 'cursor-not-allowed opacity-60',
            )}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={onInputChange}
              disabled={state === 'uploading'}
            />

            {state === 'uploading' ? (
              <>
                <svg className="h-10 w-10 animate-spin text-emerald-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <p className="text-sm text-slate-400">Uploading and importing...</p>
              </>
            ) : (
              <>
                <svg className="h-10 w-10 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <div className="text-center">
                  <p className="text-sm font-medium text-slate-300">
                    Drop your CSV or Excel file here, or <span className="text-emerald-400">browse</span>
                  </p>
                  <p className="mt-1 text-xs text-slate-500">CSV, XLSX, XLS · Supports most bank export formats · Max 10 MB</p>
                </div>
              </>
            )}

            {state === 'error' && (
              <p className="text-sm text-red-400">{errorMsg}</p>
            )}
          </div>
        )}

        {/* ── Result summary ─────────────────────────────────────────── */}
        {state === 'done' && summary && (
          <div className="rounded-xl border border-slate-700 bg-slate-800 p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10">
                <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-white">Import complete</h2>
            </div>

            <div className="mb-6 grid grid-cols-3 gap-4">
              <div className="rounded-lg bg-emerald-500/10 p-4 text-center">
                <p className="text-2xl font-bold text-emerald-400">{summary.imported}</p>
                <p className="mt-1 text-xs text-slate-400">Imported</p>
              </div>
              <div className="rounded-lg bg-slate-700 p-4 text-center">
                <p className="text-2xl font-bold text-slate-300">{summary.skipped}</p>
                <p className="mt-1 text-xs text-slate-400">Skipped</p>
              </div>
              <div className="rounded-lg bg-red-500/10 p-4 text-center">
                <p className="text-2xl font-bold text-red-400">{summary.errors.length}</p>
                <p className="mt-1 text-xs text-slate-400">Errors</p>
              </div>
            </div>

            {summary.errors.length > 0 && (
              <div className="mb-6 rounded-lg border border-red-500/20 bg-red-500/5 p-3">
                <p className="mb-2 text-xs font-semibold text-red-400">Row errors:</p>
                <ul className="space-y-1">
                  {summary.errors.map((err, i) => (
                    <li key={i} className="text-xs text-slate-400">{err}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex gap-3">
              <Button onClick={reset} variant="outline" size="sm">
                Upload another file
              </Button>
              <Button
                onClick={() => window.location.href = '/dashboard'}
                size="sm"
              >
                View dashboard
              </Button>
            </div>
          </div>
        )}

        {/* ── Format hint ────────────────────────────────────────────── */}
        {state === 'idle' && (
          <div className="mt-6 rounded-xl border border-slate-700 bg-slate-800 p-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Supported formats
            </p>
            <div className="grid grid-cols-2 gap-3 text-xs text-slate-400">
              <div>
                <p className="font-medium text-slate-300">File types</p>
                <p>CSV, XLSX, XLS</p>
              </div>
              <div>
                <p className="font-medium text-slate-300">Debit / Credit</p>
                <p>Date, Narration, Debit, Credit</p>
              </div>
              <div>
                <p className="font-medium text-slate-300">Date formats</p>
                <p>YYYY-MM-DD, DD/MM/YYYY, DD MMM YYYY</p>
              </div>
              <div>
                <p className="font-medium text-slate-300">Currencies</p>
                <p>$, £, € symbols auto-stripped</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
