import { NextFunction, Request, Response } from 'express';

import { UpsertBudgetBody } from '../schemas/budget.schemas';
import { deleteBudget, getBudgets, upsertBudget } from '../services/budget.service';

// GET /budget
export async function getBudgetsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const budgets = await getBudgets(req.user!.id);
    res.status(200).json({ success: true, data: budgets });
  } catch (err) {
    next(err);
  }
}

// POST /budget  (upsert — creates or updates for the given category)
export async function upsertBudgetHandler(
  req: Request<object, object, UpsertBudgetBody>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const budget = await upsertBudget(
      req.user!.id,
      req.body.category,
      req.body.monthlyLimit,
    );
    res.status(200).json({ success: true, data: budget });
  } catch (err) {
    next(err);
  }
}

// DELETE /budget/:category
export async function deleteBudgetHandler(
  req: Request<{ category: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await deleteBudget(req.user!.id, req.params.category);
    res.status(200).json({ success: true, message: 'Budget deleted' });
  } catch (err) {
    next(err);
  }
}
