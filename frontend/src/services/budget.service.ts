import { api } from '@/lib/api';

export interface Budget {
  id: string;
  category: string;
  monthlyLimit: number;
  spent: number;
  remaining: number;
  percentUsed: number;
  isOverBudget: boolean;
}

export const BUDGET_CATEGORIES = [
  'FOOD', 'TRAVEL', 'SHOPPING', 'BILLS',
  'HEALTHCARE', 'ENTERTAINMENT', 'EDUCATION', 'OTHER',
] as const;

export type BudgetCategory = typeof BUDGET_CATEGORIES[number];

export async function getBudgets(): Promise<Budget[]> {
  const res = await api.get<{ success: boolean; data: Budget[] }>('/budget');
  return res.data.data;
}

export async function upsertBudget(category: BudgetCategory, monthlyLimit: number): Promise<Budget> {
  const res = await api.post<{ success: boolean; data: Budget }>('/budget', {
    category,
    monthlyLimit,
  });
  return res.data.data;
}

export async function deleteBudget(category: BudgetCategory): Promise<void> {
  await api.delete(`/budget/${category}`);
}
