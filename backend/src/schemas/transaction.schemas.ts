import { z } from 'zod';

export const listTransactionsSchema = z.object({
  query: z.object({
    // Pagination
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),

    // Filters
    type: z.enum(['INCOME', 'EXPENSE']).optional(),
    category: z.string().optional(),
    merchant: z.string().optional(),
    flagged: z
      .enum(['true', 'false'])
      .transform((v) => v === 'true')
      .optional(),

    // Date range
    dateFrom: z.coerce.date().optional(),
    dateTo: z.coerce.date().optional(),

    // Sort
    sortBy: z.enum(['date', 'amount', 'merchant']).default('date'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  }),
});

export const deleteTransactionSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Transaction ID is required'),
  }),
});

export const updateCategorySchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Transaction ID is required'),
  }),
  body: z.object({
    category: z.enum([
      'FOOD', 'TRAVEL', 'SHOPPING', 'BILLS',
      'HEALTHCARE', 'ENTERTAINMENT', 'EDUCATION', 'INCOME', 'OTHER',
    ], { error: 'category must be one of the valid AI category values' }),
  }),
});

export type ListTransactionsQuery = z.infer<typeof listTransactionsSchema>['query'];
export type UpdateCategoryBody = z.infer<typeof updateCategorySchema>['body'];
