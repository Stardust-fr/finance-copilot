import { api } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AnalyticsSummary {
  totalIncome: number;
  totalExpenses: number;
  netSavings: number;
  savingsRate: number;
  transactionCount: number;
}

export interface CategoryBreakdown {
  category: string;
  total: number;
  count: number;
  percentage: number;
}

export interface MonthlyTrend {
  month: string; // "YYYY-MM"
  income: number;
  expenses: number;
  net: number;
}

export interface TopMerchant {
  merchant: string;
  total: number;
  count: number;
}

export interface AnalyticsData {
  summary: AnalyticsSummary;
  categoryBreakdown: CategoryBreakdown[];
  monthlyTrend: MonthlyTrend[];
  topMerchants: TopMerchant[];
}

export interface AnalyticsFilters {
  dateFrom?: string;
  dateTo?: string;
}

// ─── API call ─────────────────────────────────────────────────────────────────

export async function getAnalytics(filters: AnalyticsFilters = {}): Promise<AnalyticsData> {
  const params = new URLSearchParams();
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.set('dateTo', filters.dateTo);

  const res = await api.get<{ success: boolean; data: AnalyticsData }>(
    `/analytics/summary?${params.toString()}`,
  );
  return res.data.data;
}
