import { NextFunction, Request, Response } from 'express';

import { buildReportData, generatePdf } from '../services/report.service';

// GET /reports/monthly?month=YYYY-MM
export async function monthlyReportHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { month } = req.query as { month?: string };

    // Default to current month if not provided
    const target = month ?? new Date().toISOString().slice(0, 7);

    // Validate format
    if (!/^\d{4}-\d{2}$/.test(target)) {
      res.status(400).json({
        success: false,
        message: 'Invalid month format. Use YYYY-MM (e.g. 2025-07)',
      });
      return;
    }

    const user = req.user!;
    const data = await buildReportData(user.id, user.name, target);
    const pdf = await generatePdf(data);

    const filename = `finance-report-${target}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdf.length);
    res.status(200).end(pdf);
  } catch (err) {
    next(err);
  }
}
