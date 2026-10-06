import { api } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface Transaction {
  id: string;
  merchant: string;
  description: string | null;
  amount: string; // Decimal as string from backend
  date: string;
  type: 'INCOME' | 'EXPENSE';
  category: string | null;
  aiCategory: string | null;
  confidence: number | null;
  riskScore: number | null;
  isFlagged: boolean;
  account: { id: string; bankName: string; accountName: string };
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface TransactionListResponse {
  data: Transaction[];
  meta: PaginationMeta;
}

export interface TransactionFilters {
  page?: number;
  limit?: number;
  type?: 'INCOME' | 'EXPENSE';
  category?: string;
  merchant?: string;
  flagged?: boolean;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: 'date' | 'amount' | 'merchant';
  sortOrder?: 'asc' | 'desc';
}

export interface ImportSummary {
  imported: number;
  skipped: number;
  errors: string[];
}

export const AI_CATEGORIES = [
  'FOOD', 'TRAVEL', 'SHOPPING', 'BILLS',
  'HEALTHCARE', 'ENTERTAINMENT', 'EDUCATION', 'INCOME', 'OTHER',
] as const;

export type AiCategory = typeof AI_CATEGORIES[number];

// ─── API calls ────────────────────────────────────────────────────────────────
export async function getTransactions(
  filters: TransactionFilters = {},
): Promise<TransactionListResponse> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== '') params.set(k, String(v));
  });
  const res = await api.get<{ success: boolean } & TransactionListResponse>(
    `/transactions?${params.toString()}`,
  );
  return { data: res.data.data, meta: res.data.meta };
}

export async function updateCategory(id: string, category: AiCategory): Promise<void> {
  await api.patch(`/transactions/${id}/category`, { category });
}

export async function deleteTransaction(id: string): Promise<void> {
  await api.delete(`/transactions/${id}`);
}

export async function uploadCsv(file: File): Promise<ImportSummary> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await api.post<{ success: boolean; data: ImportSummary }>(
    '/transactions/upload',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return res.data.data;
}

export async function bulkDeleteTransactions(
  transactionIds?: string[],
  deleteAll = false,
): Promise<{ deleted: number }> {
  const res = await api.post<{ success: boolean; data: { deleted: number } }>(
    '/transactions/bulk-delete',
    { transactionIds, deleteAll },
  );
  return res.data.data;
}

export async function bulkRecategorizeTransactions(
  transactionIds?: string[],
  recategorizeAll = false,
): Promise<{ recategorized: number; skipped: number; failed: number }> {
  const res = await api.post<{ success: boolean; data: { recategorized: number; skipped: number; failed: number } }>(
    '/transactions/bulk-recategorize',
    { transactionIds, recategorizeAll },
  );
  return res.data.data;
}
