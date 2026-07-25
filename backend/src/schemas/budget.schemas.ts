import { z } from 'zod';

const VALID_CATEGORIES = [
  'FOOD', 'TRAVEL', 'SHOPPING', 'BILLS',
  'HEALTHCARE', 'ENTERTAINMENT', 'EDUCATION', 'INCOME', 'OTHER',
] as const;

export const upsertBudgetSchema = z.object({
  body: z.object({
    category: z.enum(VALID_CATEGORIES),
    monthlyLimit: z.coerce
      .number()
      .positive('Monthly limit must be greater than 0')
      .max(1_000_000, 'Monthly limit is too large'),
  }),
});

export const deleteBudgetSchema = z.object({
  params: z.object({
    category: z.enum(VALID_CATEGORIES),
  }),
});

export type UpsertBudgetBody = z.infer<typeof upsertBudgetSchema>['body'];
