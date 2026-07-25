import { db } from '../lib/db';

export interface BudgetWithSpend {
  id: string;
  category: string;
  monthlyLimit: number;
  spent: number;           // actual spend this calendar month
  remaining: number;       // monthlyLimit - spent (can be negative)
  percentUsed: number;     // 0–100+
  isOverBudget: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function currentMonthRange(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

function toNum(val: unknown): number {
  return parseFloat(String(val ?? '0')) || 0;
}

// ─── Get all budgets with current-month spend ─────────────────────────────────
export async function getBudgets(userId: string): Promise<BudgetWithSpend[]> {
  const { start, end } = currentMonthRange();

  const budgets = await db.budget.findMany({
    where: { userId },
    orderBy: { category: 'asc' },
  });

  if (budgets.length === 0) return [];

  // Fetch this month's expense totals per category in one query
  const transactions = await db.transaction.findMany({
    where: {
      account: { userId },
      type: 'EXPENSE',
      date: { gte: start, lte: end },
    },
    select: { category: true, aiCategory: true, amount: true },
  });

  // Aggregate spend by normalised category key
  const spendMap = new Map<string, number>();
  for (const tx of transactions) {
    const key = (tx.category ?? tx.aiCategory ?? 'OTHER').toUpperCase();
    spendMap.set(key, (spendMap.get(key) ?? 0) + toNum(tx.amount));
  }

  return budgets.map((b) => {
    const limit = toNum(b.monthlyLimit);
    const spent = Math.round((spendMap.get(b.category.toUpperCase()) ?? 0) * 100) / 100;
    const remaining = Math.round((limit - spent) * 100) / 100;
    const percentUsed = limit > 0 ? Math.round((spent / limit) * 100) : 0;

    return {
      id: b.id,
      category: b.category,
      monthlyLimit: limit,
      spent,
      remaining,
      percentUsed,
      isOverBudget: spent > limit,
    };
  });
}

// ─── Upsert (create or update) ────────────────────────────────────────────────
export async function upsertBudget(
  userId: string,
  category: string,
  monthlyLimit: number,
): Promise<BudgetWithSpend> {
  await db.budget.upsert({
    where: { userId_category: { userId, category: category.toUpperCase() } },
    create: { userId, category: category.toUpperCase(), monthlyLimit },
    update: { monthlyLimit },
  });

  const all = await getBudgets(userId);
  const updated = all.find((b) => b.category === category.toUpperCase());
  if (!updated) throw new Error('Budget not found after upsert');
  return updated;
}

// ─── Delete ───────────────────────────────────────────────────────────────────
export async function deleteBudget(userId: string, category: string): Promise<void> {
  const existing = await db.budget.findUnique({
    where: { userId_category: { userId, category: category.toUpperCase() } },
  });

  if (!existing) {
    throw Object.assign(new Error('Budget not found'), { statusCode: 404 });
  }

  await db.budget.delete({
    where: { userId_category: { userId, category: category.toUpperCase() } },
  });
}
