import { db } from '../lib/db';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SummaryResult {
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

export interface AnalyticsResult {
  summary: SummaryResult;
  categoryBreakdown: CategoryBreakdown[];
  monthlyTrend: MonthlyTrend[];
  topMerchants: TopMerchant[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toNum(decimal: unknown): number {
  return parseFloat(String(decimal ?? '0')) || 0;
}

function monthKey(date: Date): string {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// ─── Main analytics function ─────────────────────────────────────────────────

export async function getAnalytics(
  userId: string,
  dateFrom?: Date,
  dateTo?: Date,
): Promise<AnalyticsResult> {
  const transactions = await db.transaction.findMany({
    where: {
      account: { userId },
      ...(dateFrom || dateTo
        ? {
            date: {
              ...(dateFrom && { gte: dateFrom }),
              ...(dateTo && { lte: dateTo }),
            },
          }
        : {}),
    },
    select: {
      amount: true,
      type: true,
      category: true,
      aiCategory: true,
      merchant: true,
      date: true,
    },
    orderBy: { date: 'asc' },
  });

  let totalIncome = 0;
  let totalExpenses = 0;

  const categoryMap = new Map<string, { total: number; count: number }>();
  const monthMap = new Map<string, { income: number; expenses: number }>();
  const merchantMap = new Map<string, { total: number; count: number }>();

  for (const tx of transactions) {
    const amount = toNum(tx.amount);
    const isIncome = tx.type === 'INCOME';
    const month = monthKey(new Date(tx.date));
    // Normalize category to lowercase for grouping, handle casing differences
    const categoryRaw = (tx.category ?? tx.aiCategory ?? 'Other').trim();
    const category = categoryRaw.toLowerCase();

    if (isIncome) {
      totalIncome += amount;
    } else {
      totalExpenses += amount;

      // Category aggregation (expenses only)
      const cat = categoryMap.get(category) ?? { total: 0, count: 0 };
      categoryMap.set(category, { total: cat.total + amount, count: cat.count + 1 });

      // Merchant aggregation (expenses only)
      const mer = merchantMap.get(tx.merchant) ?? { total: 0, count: 0 };
      merchantMap.set(tx.merchant, { total: mer.total + amount, count: mer.count + 1 });
    }

    // Monthly trend (both income and expenses)
    const mon = monthMap.get(month) ?? { income: 0, expenses: 0 };
    if (isIncome) mon.income += amount;
    else mon.expenses += amount;
    monthMap.set(month, mon);
  }

  const netSavings = totalIncome - totalExpenses;
  const savingsRate =
    totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0;

  // Category breakdown sorted by total, with percentages
  const categoryBreakdown: CategoryBreakdown[] = Array.from(categoryMap.entries())
    .map(([category, { total, count }]) => ({
      category:
        category.charAt(0).toUpperCase() + category.slice(1).toLowerCase(),
      total: Math.round(total * 100) / 100,
      count,
      percentage:
        totalExpenses > 0
          ? Math.round((total / totalExpenses) * 1000) / 10
          : 0,
    }))
    .sort((a, b) => b.total - a.total);

  // Monthly trend — last 12 months, sorted chronologically
  const monthlyTrend: MonthlyTrend[] = Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([month, { income, expenses }]) => ({
      month,
      income: Math.round(income * 100) / 100,
      expenses: Math.round(expenses * 100) / 100,
      net: Math.round((income - expenses) * 100) / 100,
    }));

  // Top 5 merchants by total spend
  const topMerchants: TopMerchant[] = Array.from(merchantMap.entries())
    .map(([merchant, { total, count }]) => ({
      merchant,
      total: Math.round(total * 100) / 100,
      count,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  return {
    summary: {
      totalIncome: Math.round(totalIncome * 100) / 100,
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      netSavings: Math.round(netSavings * 100) / 100,
      savingsRate,
      transactionCount: transactions.length,
    },
    categoryBreakdown,
    monthlyTrend,
    topMerchants,
  };
}
