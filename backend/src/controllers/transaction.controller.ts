import { NextFunction, Request, Response } from 'express';

import { ListTransactionsQuery, UpdateCategoryBody } from '../schemas/transaction.schemas';
import {
  deleteTransaction,
  listTransactions,
  updateTransactionCategory,
} from '../services/transaction.service';

// GET /transactions
export async function listTransactionsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await listTransactions(
      req.user!.id,
      req.query as unknown as ListTransactionsQuery,
    );
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

// PATCH /transactions/:id/category
export async function updateCategoryHandler(
  req: Request<{ id: string }, object, UpdateCategoryBody>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await updateTransactionCategory(req.user!.id, req.params.id, req.body.category);
    res.status(200).json({ success: true, message: 'Category updated' });
  } catch (err) {
    next(err);
  }
}

// DELETE /transactions/:id
export async function deleteTransactionHandler(
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await deleteTransaction(req.user!.id, req.params.id);
    res.status(200).json({ success: true, message: 'Transaction deleted' });
  } catch (err) {
    next(err);
  }
}
