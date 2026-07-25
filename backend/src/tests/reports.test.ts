import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import app from '../app';
import { db } from '../lib/db';
import { buildReportData } from '../services/report.service';

const USER_EMAIL = `report_test_${Date.now()}@example.com`;
const USER_PASSWORD = 'Report1234';

let authToken: string;
let userId: string;
let accountId: string;

const TEST_MONTH = '2025-07';

beforeAll(async () => {
  const reg = await request(app).post('/auth/register').send({
    name: 'Report Tester',
    email: USER_EMAIL,
    password: USER_PASSWORD,
  });
  authToken = reg.body.data.token;
  userId = reg.body.data.user.id;

  const account = await db.account.create({
    data: { userId, bankName: 'Report Bank', accountName: 'Checking' },
  });
  accountId = account.id;

  await db.transaction.createMany({
    data: [
      { accountId, merchant: 'Employer Inc', amount: 3500, type: 'INCOME', category: 'Income', date: new Date('2025-07-01') },
      { accountId, merchant: 'Starbucks', amount: 45, type: 'EXPENSE', category: 'Food', date: new Date('2025-07-05') },
      { accountId, merchant: 'Netflix', amount: 15, type: 'EXPENSE', category: 'Bills', date: new Date('2025-07-10') },
      { accountId, merchant: 'Amazon', amount: 120, type: 'EXPENSE', category: 'Shopping', date: new Date('2025-07-15') },
      { accountId, merchant: 'Starbucks', amount: 30, type: 'EXPENSE', category: 'Food', date: new Date('2025-07-20') },
    ],
  });
});

afterAll(async () => {
  await db.transaction.deleteMany({ where: { accountId } });
  await db.account.delete({ where: { id: accountId } });
  await db.user.delete({ where: { id: userId } });
});

// ─── Auth guard ───────────────────────────────────────────────────────────────
describe('GET /reports/monthly — auth', () => {
  it('returns 401 without a token', async () => {
    const res = await request(app).get(`/reports/monthly?month=${TEST_MONTH}`);
    expect(res.status).toBe(401);
  });
});

// ─── Validation ───────────────────────────────────────────────────────────────
describe('GET /reports/monthly — validation', () => {
  it('returns 400 for invalid month format', async () => {
    const res = await request(app)
      .get('/reports/monthly?month=July-2025')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/YYYY-MM/);
  });

  it('returns 400 for month without year', async () => {
    const res = await request(app)
      .get('/reports/monthly?month=07-2025')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(400);
  });
});

// ─── buildReportData unit tests ───────────────────────────────────────────────
describe('buildReportData', () => {
  it('assembles correct totals for July 2025', async () => {
    const data = await buildReportData(userId, 'Report Tester', TEST_MONTH);

    expect(data.month).toBe(TEST_MONTH);
    expect(data.monthLabel).toBe('July 2025');
    expect(data.userName).toBe('Report Tester');
    expect(data.totalIncome).toBe(3500);
    expect(data.totalExpenses).toBe(210);   // 45 + 15 + 120 + 30
    expect(data.netSavings).toBe(3290);
    expect(data.transactionCount).toBe(5);
    expect(data.savingsRate).toBeGreaterThan(0);
  });

  it('returns top categories sorted by total descending', async () => {
    const data = await buildReportData(userId, 'Report Tester', TEST_MONTH);

    expect(data.topCategories.length).toBeGreaterThan(0);
    // Shopping (120) > Food (75) > Bills (15)
    expect(data.topCategories[0].category).toBe('Shopping');
    expect(data.topCategories[0].total).toBe(120);
  });

  it('returns top merchants', async () => {
    const data = await buildReportData(userId, 'Report Tester', TEST_MONTH);

    expect(data.topMerchants.length).toBeGreaterThan(0);
    // Amazon 120 > Starbucks 75 > Netflix 15
    expect(data.topMerchants[0].merchant).toBe('Amazon');
  });

  it('includes a non-empty AI summary', async () => {
    const data = await buildReportData(userId, 'Report Tester', TEST_MONTH);
    expect(typeof data.aiSummary).toBe('string');
    expect(data.aiSummary.length).toBeGreaterThan(10);
  });

  it('returns empty data for a month with no transactions', async () => {
    const data = await buildReportData(userId, 'Report Tester', '2020-01');
    expect(data.totalIncome).toBe(0);
    expect(data.totalExpenses).toBe(0);
    expect(data.transactionCount).toBe(0);
  });
});

// ─── PDF endpoint ─────────────────────────────────────────────────────────────
describe('GET /reports/monthly — PDF generation', () => {
  it('returns a PDF with correct content-type and content-disposition', async () => {
    const res = await request(app)
      .get(`/reports/monthly?month=${TEST_MONTH}`)
      .set('Authorization', `Bearer ${authToken}`)
      .buffer(true)
      .parse((res, callback) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => callback(null, Buffer.concat(chunks)));
      });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/pdf');
    expect(res.headers['content-disposition']).toContain(`finance-report-${TEST_MONTH}.pdf`);

    // PDF files always start with %PDF
    const body = res.body as Buffer;
    expect(body.slice(0, 4).toString()).toBe('%PDF');
  }, 30000); // PDF generation takes up to ~10s

  it('uses current month when no month param is provided', async () => {
    const res = await request(app)
      .get('/reports/monthly')
      .set('Authorization', `Bearer ${authToken}`)
      .buffer(true)
      .parse((res, callback) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => callback(null, Buffer.concat(chunks)));
      });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/pdf');
  }, 30000);
});
