import { NextFunction, Request, Response } from 'express';

import { BulkDeleteBody, BulkRecategorizeBody, ListTransactionsQuery, UpdateCategoryBody } from '../schemas/transaction.schemas';
import {
  bulkDeleteTransactions,
  bulkRecategorizeTransactions,
  deleteTransaction,
  listTransactions,
  updateTransactionCategory,
} from '../services/transaction.service';
import { getAIService } from '../services/ai';

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

// POST /transactions/bulk-delete
export async function bulkDeleteHandler(
  req: Request<object, object, BulkDeleteBody>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await bulkDeleteTransactions(
      req.user!.id,
      req.body.transactionIds,
      req.body.deleteAll,
    );
    res.status(200).json({
      success: true,
      message: `${result.deleted} transaction(s) deleted`,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

// POST /transactions/bulk-recategorize
export async function bulkRecategorizeHandler(
  req: Request<object, object, BulkRecategorizeBody>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const aiService = getAIService();
    const result = await bulkRecategorizeTransactions(
      req.user!.id,
      aiService,
      req.body.transactionIds,
      req.body.recategorizeAll,
    );
    
    const message = result.skipped > 0 || result.failed > 0
      ? `${result.recategorized} recategorized, ${result.skipped} skipped, ${result.failed} failed`
      : `${result.recategorized} transaction(s) recategorized`;
    
    res.status(200).json({
      success: true,
      message,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}
