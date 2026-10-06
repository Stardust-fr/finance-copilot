import * as XLSX from 'xlsx';

/**
 * Converts an Excel buffer (.xls or .xlsx) to a CSV string.
 * Uses the first sheet in the workbook.
 * Returns the CSV string ready to be passed to parseCsv().
 */
export function xlsxToCsv(buffer: Buffer): string {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error('Excel file contains no sheets');
  }

  const sheet = workbook.Sheets[sheetName];
  // defval: '' ensures empty cells are included as empty strings (not skipped)
  const csv = XLSX.utils.sheet_to_csv(sheet);
  return csv;
}

/**
 * Returns true if the filename looks like an Excel file.
 */
export function isExcelFile(filename: string): boolean {
  const lower = filename.toLowerCase();
  return lower.endsWith('.xlsx') || lower.endsWith('.xls');
}
