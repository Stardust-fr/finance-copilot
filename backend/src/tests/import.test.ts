import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import app from '../app';
import { db } from '../lib/db';

const USER_EMAIL = `import_test_${Date.now()}@example.com`;
const USER_PASSWORD = 'Import1234';

let authToken: string;
let userId: string;

// ─── CSV fixtures ─────────────────────────────────────────────────────────────
const STANDARD_CSV = `Date,Description,Amount
2025-07-01,Starbucks,-6.75
2025-07-02,Employer Inc,3500.00
2025-07-03,Netflix,-15.49`;

const DEBIT_CREDIT_CSV = `Date,Particulars,Debit,Credit
2025-08-01,Coffee Shop,4.50,
2025-08-02,Freelance Payment,,800.00
2025-08-03,Amazon,55.99,`;

const NARRATION_CSV = `Transaction Date,Narration,Amount
15/07/2025,Nike,129.95
16/07/2025,Salary,3200.00`;

const BAD_DATE_CSV = `Date,Description,Amount
not-a-date,Bad Row,10.00
2025-07-05,Good Row,20.00`;

const EMPTY_CSV = `Date,Description,Amount`;

const NO_DATE_COL_CSV = `Description,Amount
Starbucks,6.75`;

beforeAll(async () => {
  const reg = await request(app).post('/auth/register').send({
    name: 'Import Tester',
    email: USER_EMAIL,
    password: USER_PASSWORD,
  });
  authToken = reg.body.data.token;
  userId = reg.body.data.user.id;
});

afterAll(async () => {
  // Clean up all transactions and accounts for this user
  const accounts = await db.account.findMany({ where: { userId } });
  for (const acc of accounts) {
    await db.transaction.deleteMany({ where: { accountId: acc.id } });
  }
  await db.account.deleteMany({ where: { userId } });
  await db.user.delete({ where: { id: userId } });
});

// ─── Auth guard ───────────────────────────────────────────────────────────────
describe('POST /transactions/upload — auth', () => {
  it('returns 401 without a token', async () => {
    const res = await request(app)
      .post('/transactions/upload')
      .attach('file', Buffer.from(STANDARD_CSV), 'test.csv');

    expect(res.status).toBe(401);
  });
});

// ─── Standard import ──────────────────────────────────────────────────────────
describe('POST /transactions/upload — standard CSV', () => {
  it('imports 3 rows from a standard Date/Description/Amount CSV', async () => {
    const res = await request(app)
      .post('/transactions/upload')
      .set('Authorization', `Bearer ${authToken}`)
      .attach('file', Buffer.from(STANDARD_CSV), { filename: 'bank.csv', contentType: 'text/csv' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.imported).toBe(3);
    expect(res.body.data.skipped).toBe(0);
    expect(res.body.data.errors).toHaveLength(0);
  });

  it('skips all rows on re-upload (duplicate detection)', async () => {
    const res = await request(app)
      .post('/transactions/upload')
      .set('Authorization', `Bearer ${authToken}`)
      .attach('file', Buffer.from(STANDARD_CSV), { filename: 'bank.csv', contentType: 'text/csv' });

    expect(res.status).toBe(200);
    expect(res.body.data.imported).toBe(0);
    expect(res.body.data.skipped).toBe(3);
  });

  it('transactions appear in GET /transactions after import', async () => {
    const res = await request(app)
      .get('/transactions')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(3);
  });

  it('correctly sets INCOME/EXPENSE type from amount sign', async () => {
    const res = await request(app)
      .get('/transactions')
      .set('Authorization', `Bearer ${authToken}`);

    const txs: Array<{ type: string; merchant: string }> = res.body.data;
    const income = txs.find((t) => t.merchant === 'Employer Inc');
    const expense = txs.find((t) => t.merchant === 'Starbucks');

    expect(income?.type).toBe('INCOME');
    expect(expense?.type).toBe('EXPENSE');
  });
});

// ─── Debit/Credit columns ─────────────────────────────────────────────────────
describe('POST /transactions/upload — debit/credit columns', () => {
  it('imports from separate Debit/Credit columns', async () => {
    const res = await request(app)
      .post('/transactions/upload')
      .set('Authorization', `Bearer ${authToken}`)
      .attach('file', Buffer.from(DEBIT_CREDIT_CSV), { filename: 'debit.csv', contentType: 'text/csv' });

    expect(res.status).toBe(200);
    expect(res.body.data.imported).toBe(3);
    expect(res.body.data.errors).toHaveLength(0);
  });
});

// ─── Alternative column names ─────────────────────────────────────────────────
describe('POST /transactions/upload — alternative column names', () => {
  it('handles Transaction Date and Narration column names', async () => {
    const res = await request(app)
      .post('/transactions/upload')
      .set('Authorization', `Bearer ${authToken}`)
      .attach('file', Buffer.from(NARRATION_CSV), { filename: 'narration.csv', contentType: 'text/csv' });

    expect(res.status).toBe(200);
    expect(res.body.data.imported).toBe(2);
  });
});

// ─── Error handling ───────────────────────────────────────────────────────────
describe('POST /transactions/upload — error handling', () => {
  it('returns 400 when no file is sent', async () => {
    const res = await request(app)
      .post('/transactions/upload')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('imports valid rows and reports errors for bad-date rows', async () => {
    const res = await request(app)
      .post('/transactions/upload')
      .set('Authorization', `Bearer ${authToken}`)
      .attach('file', Buffer.from(BAD_DATE_CSV), { filename: 'bad.csv', contentType: 'text/csv' });

    expect(res.status).toBe(200);
    expect(res.body.data.imported).toBe(1);
    expect(res.body.data.errors.length).toBeGreaterThan(0);
  });

  it('returns 0 imported for empty CSV (only headers)', async () => {
    const res = await request(app)
      .post('/transactions/upload')
      .set('Authorization', `Bearer ${authToken}`)
      .attach('file', Buffer.from(EMPTY_CSV), { filename: 'empty.csv', contentType: 'text/csv' });

    expect(res.status).toBe(200);
    expect(res.body.data.imported).toBe(0);
    expect(res.body.data.errors.length).toBeGreaterThan(0);
  });

  it('returns errors when required columns are missing', async () => {
    const res = await request(app)
      .post('/transactions/upload')
      .set('Authorization', `Bearer ${authToken}`)
      .attach('file', Buffer.from(NO_DATE_COL_CSV), { filename: 'bad_cols.csv', contentType: 'text/csv' });

    expect(res.status).toBe(200);
    expect(res.body.data.imported).toBe(0);
    expect(res.body.data.errors.length).toBeGreaterThan(0);
  });
});
