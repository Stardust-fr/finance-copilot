import { NextFunction, Request, Response } from 'express';

import { importCsv } from '../services/import.service';
import { isExcelFile, xlsxToCsv } from '../services/xlsx-converter.service';

// POST /transactions/upload
export async function uploadCsvHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        message: 'No file uploaded. Send a CSV or Excel file as multipart/form-data with field name "file".',
      });
      return;
    }

    let csvContent: string;

    if (isExcelFile(req.file.originalname)) {
      // Convert Excel buffer to CSV string, then use the same import pipeline
      try {
        csvContent = xlsxToCsv(req.file.buffer);
      } catch (err) {
        res.status(400).json({
          success: false,
          message: `Could not read Excel file: ${(err as Error).message}`,
        });
        return;
      }
    } else {
      csvContent = req.file.buffer.toString('utf-8');
    }

    const summary = await importCsv(req.user!.id, csvContent);

    res.status(200).json({
      success: true,
      data: summary,
      message: `Import complete: ${summary.imported} imported, ${summary.skipped} skipped, ${summary.errors.length} errors.`,
    });
  } catch (err) {
    next(err);
  }
}
