import { NextFunction, Request, Response } from 'express';

import { importCsv } from '../services/import.service';

// POST /transactions/upload
export async function uploadCsvHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'No file uploaded. Send a CSV as multipart/form-data with field name "file".' });
      return;
    }

    const csvContent = req.file.buffer.toString('utf-8');
    const summary = await importCsv(req.user!.id, csvContent);

    // Return 200 whether some rows were skipped — the summary explains what happened
    res.status(200).json({
      success: true,
      data: summary,
      message: `Import complete: ${summary.imported} imported, ${summary.skipped} skipped, ${summary.errors.length} errors.`,
    });
  } catch (err) {
    next(err);
  }
}
