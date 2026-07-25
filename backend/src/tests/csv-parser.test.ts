import { describe, expect, it } from 'vitest';

import { parseAmount, parseDate, parseCsv } from '../services/csv-parser.service';

// ─── parseDate unit tests ─────────────────────────────────────────────────────
describe('parseDate', () => {
  it('parses ISO YYYY-MM-DD', () => {
    const d = parseDate('2025-07-15');
    expect(d?.getFullYear()).toBe(2025);
    expect(d?.getMonth()).toBe(6); // July = 6
    expect(d?.getDate()).toBe(15);
  });

  it('parses DD/MM/YYYY', () => {
    const d = parseDate('15/07/2025');
    expect(d?.getFullYear()).toBe(2025);
    expect(d?.getMonth()).toBe(6);
    expect(d?.getDate()).toBe(15);
  });

  it('parses DD-MM-YYYY', () => {
    const d = parseDate('15-07-2025');
    expect(d?.getFullYear()).toBe(2025);
    expect(d?.getDate()).toBe(15);
  });

  it('parses YYYY/MM/DD', () => {
    const d = parseDate('2025/07/15');
    expect(d?.getFullYear()).toBe(2025);
    expect(d?.getMonth()).toBe(6);
  });

  it('parses DD MMM YYYY', () => {
    const d = parseDate('15 Jul 2025');
    expect(d?.getFullYear()).toBe(2025);
    expect(d?.getMonth()).toBe(6);
    expect(d?.getDate()).toBe(15);
  });

  it('parses MMM DD, YYYY', () => {
    const d = parseDate('Jul 15, 2025');
    expect(d?.getFullYear()).toBe(2025);
    expect(d?.getMonth()).toBe(6);
  });

  it('returns null for invalid date', () => {
    expect(parseDate('not-a-date')).toBeNull();
    expect(parseDate('')).toBeNull();
  });
});

// ─── parseAmount unit tests ───────────────────────────────────────────────────
describe('parseAmount', () => {
  it('parses plain number', () => {
    expect(parseAmount('42.50')).toBe(42.5);
  });

  it('parses with comma separator', () => {
    expect(parseAmount('1,234.56')).toBe(1234.56);
  });

  it('strips £ symbol', () => {
    expect(parseAmount('£99.99')).toBe(99.99);
  });

  it('strips $ symbol', () => {
    expect(parseAmount('$1,500.00')).toBe(1500);
  });

  it('parses negative number', () => {
    expect(parseAmount('-45.00')).toBe(-45);
  });

  it('parses parenthesised negative', () => {
    expect(parseAmount('(45.00)')).toBe(-45);
  });

  it('returns null for empty string', () => {
    expect(parseAmount('')).toBeNull();
  });

  it('returns null for non-numeric', () => {
    expect(parseAmount('N/A')).toBeNull();
  });
});

// ─── parseCsv unit tests ──────────────────────────────────────────────────────
describe('parseCsv', () => {
  it('parses standard Date/Description/Amount CSV', () => {
    const csv = `Date,Description,Amount
2025-07-01,Starbucks,-6.75
2025-07-02,Salary,3500.00`;

    const { rows, errors } = parseCsv(csv);
    expect(errors.filter(e => !e.includes('parse error'))).toHaveLength(0);
    expect(rows).toHaveLength(2);
    expect(rows[0].description).toBe('Starbucks');
    expect(rows[0].amount).toBe(6.75);
    expect(rows[0].type).toBe('EXPENSE');
    expect(rows[1].amount).toBe(3500);
    expect(rows[1].type).toBe('INCOME');
  });

  it('detects narration and transaction date column names', () => {
    const csv = `Transaction Date,Narration,Amount
15/07/2025,Amazon,55.99`;

    const { rows, errors } = parseCsv(csv);
    expect(errors.filter(e => !e.includes('parse error'))).toHaveLength(0);
    expect(rows[0].description).toBe('Amazon');
    expect(rows[0].date.getDate()).toBe(15);
  });

  it('handles separate Debit/Credit columns', () => {
    const csv = `Date,Details,Debit,Credit
2025-07-01,Coffee Shop,4.50,
2025-07-02,Paycheck,,2500.00`;

    const { rows } = parseCsv(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0].type).toBe('EXPENSE');
    expect(rows[0].amount).toBe(4.5);
    expect(rows[1].type).toBe('INCOME');
    expect(rows[1].amount).toBe(2500);
  });

  it('handles Withdrawal/Deposit column names', () => {
    const csv = `Date,Particulars,Withdrawal Amount,Deposit Amount
2025-07-10,Netflix,15.49,
2025-07-11,Freelance,,800.00`;

    const { rows } = parseCsv(csv);
    expect(rows[0].type).toBe('EXPENSE');
    expect(rows[0].amount).toBe(15.49);
    expect(rows[1].type).toBe('INCOME');
    expect(rows[1].amount).toBe(800);
  });

  it('returns error when date column is missing', () => {
    const csv = `Description,Amount
Starbucks,6.75`;

    const { rows, errors } = parseCsv(csv);
    expect(rows).toHaveLength(0);
    expect(errors.some((e) => e.toLowerCase().includes('date'))).toBe(true);
  });

  it('returns error when description column is missing', () => {
    const csv = `Date,Amount
2025-07-01,6.75`;

    const { rows, errors } = parseCsv(csv);
    expect(rows).toHaveLength(0);
    expect(errors.some((e) => e.toLowerCase().includes('description'))).toBe(true);
  });

  it('skips rows with invalid dates and records the error', () => {
    const csv = `Date,Description,Amount
invalid-date,Starbucks,6.75
2025-07-02,Amazon,55.99`;

    const { rows, errors } = parseCsv(csv);
    expect(rows).toHaveLength(1);
    expect(errors.some((e) => e.includes('invalid date'))).toBe(true);
  });

  it('handles amounts with currency symbols and commas', () => {
    const csv = `Date,Description,Amount
2025-07-01,Rent,"$1,200.00"`;

    const { rows } = parseCsv(csv);
    expect(rows[0].amount).toBe(1200);
  });
});

// ─── Metadata header skipping ─────────────────────────────────────────────────
describe('parseCsv — metadata rows before header', () => {
  it('skips HDFC-style metadata rows and parses correctly', () => {
    const csv = `HDFC Bank Limited
Account Statement
Customer Name: John Doe
Account Number: 1234567890
Statement Period: 01/07/2025 to 31/07/2025

Date,Narration,Debit,Credit
2025-07-01,Starbucks,6.75,
2025-07-02,Salary,,3000.00`;

    const { rows, errors } = parseCsv(csv);
    expect(errors.filter((e) => !e.includes('parse error'))).toHaveLength(0);
    expect(rows).toHaveLength(2);
    expect(rows[0].description).toBe('Starbucks');
    expect(rows[0].type).toBe('EXPENSE');
    expect(rows[0].amount).toBe(6.75);
    expect(rows[1].description).toBe('Salary');
    expect(rows[1].type).toBe('INCOME');
    expect(rows[1].amount).toBe(3000);
  });

  it('handles blank lines before header', () => {
    const csv = `
Account: SAVINGS ••4821


Date,Description,Amount
2025-07-10,Netflix,-15.49
2025-07-11,Employer,3500.00`;

    const { rows } = parseCsv(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0].description).toBe('Netflix');
    expect(rows[0].amount).toBe(15.49);
    expect(rows[1].amount).toBe(3500);
  });

  it('handles multiple metadata rows then a Narration/Debit/Credit header', () => {
    const csv = `ICICI Bank
Branch: Andheri
Account: 123456789012
Period: April 2025 to June 2025
Currency: INR

Transaction Date,Value Date,Description,Debit,Credit,Balance
01/04/2025,01/04/2025,Amazon,500,,15000
02/04/2025,02/04/2025,Salary Direct Credit,,50000,65000`;

    const { rows, errors } = parseCsv(csv);
    expect(errors.filter((e) => !e.includes('parse error') && !e.includes('balance'))).toHaveLength(0);
    expect(rows.length).toBeGreaterThanOrEqual(2);
    const amazon = rows.find((r) => r.description.toLowerCase().includes('amazon'));
    const salary = rows.find((r) => r.description.toLowerCase().includes('salary'));
    expect(amazon?.type).toBe('EXPENSE');
    expect(salary?.type).toBe('INCOME');
  });

  it('falls back gracefully when no recognisable header is found', () => {
    const csv = `This file contains no recognisable columns
Foo,Bar,Baz
1,2,3`;

    const { rows, errors } = parseCsv(csv);
    expect(rows).toHaveLength(0);
    expect(errors.length).toBeGreaterThan(0);
  });
});
