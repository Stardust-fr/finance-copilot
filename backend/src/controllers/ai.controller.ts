import { NextFunction, Request, Response } from 'express';

import { getAnalytics } from '../services/analytics.service';
import { getAIService } from '../services/ai';
import { CategorizeInput, ChatInput } from '../schemas/ai.schemas';

// POST /ai/categorize
export async function categorizeHandler(
  req: Request<object, object, CategorizeInput>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const aiService = getAIService();
    const result = await aiService.categorizeTransaction({
      merchant: req.body.merchant,
      amount: req.body.amount ?? 0,
      date: req.body.date,
      description: req.body.description,
    });

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// POST /ai/chat
export async function chatHandler(
  req: Request<object, object, ChatInput>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const aiService = getAIService();

    // Build grounding context from the user's real analytics data
    const analytics = await getAnalytics(req.user!.id);
    const context = JSON.stringify({
      totalIncome: analytics.summary.totalIncome,
      totalExpenses: analytics.summary.totalExpenses,
      netSavings: analytics.summary.netSavings,
      savingsRate: analytics.summary.savingsRate,
      transactionCount: analytics.summary.transactionCount,
      topCategories: analytics.categoryBreakdown.slice(0, 5).map((c) => ({
        category: c.category,
        total: c.total,
        percentage: c.percentage,
      })),
      topMerchants: analytics.topMerchants.map((m) => ({
        merchant: m.merchant,
        total: m.total,
      })),
    });

    const reply = await aiService.chat(req.body.message, context);

    res.status(200).json({ success: true, data: { reply } });
  } catch (err) {
    next(err);
  }
}
