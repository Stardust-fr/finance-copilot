import Papa from 'papaparse';

export interface ParsedRow {
  date: Date;
  description: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  rawRow: Record<string, string>;
}

export interface ParseResult {
  rows: ParsedRow[];
  errors: string[];
}

// ─── Column name mappings ─────────────────────────────────────────────────────
const DATE_COLUMNS = ['date', 'transaction date', 'txn date', 'value date', 'posted date', 'trans date', 'txn date'];
const DESC_COLUMNS = ['description', 'narration', 'details', 'merchant', 'particulars', 'remarks', 'reference', 'trans description', 'transaction description'];
const AMOUNT_COLUMNS = ['amount', 'transaction amount', 'txn amount', 'value'];
const DEBIT_COLUMNS = ['debit', 'debit amount', 'withdrawal', 'withdrawal amount', 'dr'];
const CREDIT_COLUMNS = ['credit', 'credit amount', 'deposit', 'deposit amount', 'cr'];

// All known header keywords used for header-row detection
const ALL_KNOWN_HEADERS = [
  ...DATE_COLUMNS,
  ...DESC_COLUMNS,
  ...AMOUNT_COLUMNS,
  ...DEBIT_COLUMNS,
  ...CREDIT_COLUMNS,
];

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, ' ');
}

function findColumn(headers: string[], candidates: string[]): string | null {
  for (const h of headers) {
    if (candidates.includes(normalizeHeader(h))) return h;
  }
  return null;
}

// ─── Header row detection ─────────────────────────────────────────────────────
// Scans the first 30 lines to find the one that best resembles a header row.
// A line qualifies if it contains at least 2 recognised column keywords.
// This handles bank exports that prepend metadata rows like:
//   "Account Number: 1234"
//   "Statement Period: Jul 2025"
//   "Date,Narration,Debit,Credit"  ← actual header we want
export function findHeaderRowIndex(lines: string[]): number {
  let bestIndex = 0;
  let bestScore = 0;

  for (let i = 0; i < Math.min(lines.length, 30); i++) {
    const line = lines[i].toLowerCase();
    const score = ALL_KNOWN_HEADERS.filter((h) => {
      // Match as a whole word / column boundary to reduce false positives
      return new RegExp(`(^|,|\\s)${h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(,|\\s|$)`).test(line);
    }).length;

    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }

  // Only skip rows if we found a convincing header (score >= 2)
  return bestScore >= 2 ? bestIndex : 0;
}

// ─── Date normalization ───────────────────────────────────────────────────────
export function parseDate(raw: string): Date | null {
  if (!raw?.trim()) return null;

  const s = raw.trim();

  // ISO format YYYY-MM-DD or YYYY/MM/DD
  const iso = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (iso) {
    const d = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    return isNaN(d.getTime()) ? null : d;
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmy) {
    const day = Number(dmy[1]);
    const month = Number(dmy[2]);
    const year = Number(dmy[3]);
    const d = new Date(year, month - 1, day);
    return isNaN(d.getTime()) ? null : d;
  }

  // DD MMM YYYY  e.g. "15 Jan 2025"
  const dMonY = s.match(/^(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})$/);
  if (dMonY) {
    const d = new Date(`${dMonY[2]} ${dMonY[1]}, ${dMonY[3]}`);
    return isNaN(d.getTime()) ? null : d;
  }

  // MMM DD, YYYY  e.g. "Jan 15, 2025"
  const monDY = s.match(/^([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{4})$/);
  if (monDY) {
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }

  // Fallback — let JS try
  const fallback = new Date(s);
  return isNaN(fallback.getTime()) ? null : fallback;
}

// ─── Amount parsing ───────────────────────────────────────────────────────────
export function parseAmount(raw: string): number | null {
  if (!raw?.trim()) return null;
  const cleaned = raw.trim().replace(/[£$€,\s]/g, '').replace(/^\((.+)\)$/, '-$1');
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

// ─── Main parser ──────────────────────────────────────────────────────────────
export function parseCsv(csvContent: string): ParseResult {
  const errors: string[] = [];

  // Strip metadata rows above the real header.
  // Split on both \r\n and \n; filter completely blank lines for detection
  // but keep them in the slice so papaparse's line count stays accurate.
  const allLines = csvContent.split(/\r?\n/);
  const nonBlankLines = allLines.filter((l) => l.trim().length > 0);
  const headerRowIndexInNonBlank = findHeaderRowIndex(nonBlankLines);

  // Find that same line in the original array (preserving blank lines for papaparse)
  const headerLine = nonBlankLines[headerRowIndexInNonBlank];
  const headerRowIndexInAll = allLines.findIndex((l) => l === headerLine);
  const cleanedContent = allLines.slice(headerRowIndexInAll).join('\n');

  const result = Papa.parse<Record<string, string>>(cleanedContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  if (result.errors.length > 0) {
    result.errors.forEach((e) => errors.push(`CSV parse error row ${e.row}: ${e.message}`));
  }

  if (!result.data.length) {
    return { rows: [], errors: ['CSV file is empty or has no data rows'] };
  }

  const headers = Object.keys(result.data[0]);

  // ── Detect columns ──────────────────────────────────────────────────────────
  const dateCol = findColumn(headers, DATE_COLUMNS);
  const descCol = findColumn(headers, DESC_COLUMNS);
  const amountCol = findColumn(headers, AMOUNT_COLUMNS);
  const debitCol = findColumn(headers, DEBIT_COLUMNS);
  const creditCol = findColumn(headers, CREDIT_COLUMNS);

  if (!dateCol) errors.push('Could not find a date column. Expected: date, transaction date, etc.');
  if (!descCol) errors.push('Could not find a description column. Expected: description, merchant, narration, etc.');
  if (!amountCol && !debitCol && !creditCol) {
    errors.push('Could not find an amount column. Expected: amount, debit, credit, withdrawal, deposit, etc.');
  }

  if (!dateCol || !descCol || (!amountCol && !debitCol && !creditCol)) {
    return { rows: [], errors };
  }

  // ── Parse each row ──────────────────────────────────────────────────────────
  const rows: ParsedRow[] = [];

  result.data.forEach((raw, i) => {
    const rowNum = i + 2;

    const date = parseDate(raw[dateCol]);
    if (!date) {
      errors.push(`Row ${rowNum}: invalid date "${raw[dateCol]}"`);
      return;
    }

    const description = raw[descCol]?.trim();
    if (!description) {
      errors.push(`Row ${rowNum}: missing description`);
      return;
    }

    let amount: number | null = null;
    let type: 'INCOME' | 'EXPENSE' = 'EXPENSE';

    if (amountCol) {
      amount = parseAmount(raw[amountCol]);
      if (amount === null) {
        errors.push(`Row ${rowNum}: invalid amount "${raw[amountCol]}"`);
        return;
      }
      type = amount >= 0 ? 'INCOME' : 'EXPENSE';
      amount = Math.abs(amount);
    } else {
      const debit = debitCol ? parseAmount(raw[debitCol]) : null;
      const credit = creditCol ? parseAmount(raw[creditCol]) : null;

      if (debit && Math.abs(debit) > 0) {
        amount = Math.abs(debit);
        type = 'EXPENSE';
      } else if (credit && Math.abs(credit) > 0) {
        amount = Math.abs(credit);
        type = 'INCOME';
      } else {
        errors.push(`Row ${rowNum}: both debit and credit are empty or zero`);
        return;
      }
    }

    rows.push({ date, description, amount, type, rawRow: raw });
  });

  return { rows, errors };
}
