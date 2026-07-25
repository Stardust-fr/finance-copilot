import { NextFunction, Request, Response } from 'express';

import { getAnalytics } from '../services/analytics.service';

// GET /analytics/summary
export async function analyticsSummaryHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { dateFrom, dateTo } = req.query as Record<string, string | undefined>;

    const result = await getAnalytics(
      req.user!.id,
      dateFrom ? new Date(dateFrom) : undefined,
      dateTo ? new Date(dateTo) : undefined,
    );

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}
