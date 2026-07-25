import { z } from 'zod';

export const categorizeSchema = z.object({
  body: z.object({
    merchant: z.string().min(1, 'Merchant is required').max(200),
    amount: z.coerce.number().optional(),
    date: z.string().optional(),
    description: z.string().optional(),
  }),
});

export const chatSchema = z.object({
  body: z.object({
    message: z.string().min(1, 'Message is required').max(1000),
  }),
});

export type CategorizeInput = z.infer<typeof categorizeSchema>['body'];
export type ChatInput = z.infer<typeof chatSchema>['body'];
