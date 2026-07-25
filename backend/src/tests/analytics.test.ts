import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import app from '../app';
import { db } from '../lib/db';

const USER_EMAIL = `analytics_test_${Date.now()}@example.com`;
const USER_PASSWORD = 'Analytics123';

let authToken: string;
let userId: string;
let accountId: string;

beforeAll(async () => {
  // Register test user
  const reg = await request(app).post('/auth/register').send({
    name: 'Analytics Tester',
    email: USER_EMAIL,
    password: USER_PASSWORD,
  });
  authToken = reg.body.data.token;
  userId = reg.body.data.user.id;

  // Create account
  const account = await db.account.create({
    data: { userId, bankName: 'Analytics Bank', accountName: 'Checking' },
  });
  accountId = account.id;

  // Seed transactions across two months
  await db.transaction.createMany({
    data: [
      // Month 1 — July
      { accountId, merchant: 'Employer Inc', amount: 3000, type: 'INCOME', category: 'Income', date: new Date('2025-07-01') },
      { accountId, merchant: 'Starbucks', amount: 25, type: 'EXPENSE', category: 'Food', date: new Date('2025-07-05') },
      { accountId, merchant: 'Netflix', amount: 15, type: 'EXPENSE', category: 'Bills', date: new Date('2025-07-10') },
      { accountId, merchant: 'Starbucks', amount: 20, type: 'EXPENSE', category: 'Food', date: new Date('2025-07-15') },
      { accountId, merchant: 'Amazon', amount: 100, type: 'EXPENSE', category: 'Shopping', date: new Date('2025-07-20') },
      // Month 2 — August
      { accountId, merchant: 'Employer Inc', amount: 3200, type: 'INCOME', category: 'Income', date: new Date('2025-08-01') },
      { accountId, merchant: 'Nike', amount: 150, type: 'EXPENSE', category: 'Shopping', date: new Date('2025-08-05') },
      { accountId, merchant: 'Starbucks', amount: 30, type: 'EXPENSE', category: 'Food', date: new Date('2025-08-10') },
    ],
  });
});

afterAll(async () => {
  await db.transaction.deleteMany({ where: { accountId } });
  await db.account.delete({ where: { id: accountId } });
  await db.user.delete({ where: { id: userId } });
});

// ─── Auth guard ───────────────────────────────────────────────────────────────
describe('GET /analytics/summary — auth', () => {
  it('returns 401 without a token', async () => {
    const res = await request(app).get('/analytics/summary');
    expect(res.status).toBe(401);
  });
});

// ─── Summary totals ───────────────────────────────────────────────────────────
describe('GET /analytics/summary — summary', () => {
  it('returns correct income, expenses and savings totals', async () => {
    const res = await request(app)
      .get('/analytics/summary')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const { summary } = res.body.data;
    expect(summary.totalIncome).toBe(6200);     // 3000 + 3200
    expect(summary.totalExpenses).toBe(340);    // 25+15+20+100+150+30
    expect(summary.netSavings).toBe(5860);
    expect(summary.transactionCount).toBe(8);
    expect(summary.savingsRate).toBeGreaterThan(0);
  });

  it('returns 0 totals for a user with no transactions', async () => {
    const other = await request(app).post('/auth/register').send({
      name: 'Empty User',
      email: `empty_${Date.now()}@example.com`,
      password: 'Empty1234',
    });

    const res = await request(app)
      .get('/analytics/summary')
      .set('Authorization', `Bearer ${other.body.data.token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.summary.totalIncome).toBe(0);
    expect(res.body.data.summary.totalExpenses).toBe(0);
    expect(res.body.data.summary.transactionCount).toBe(0);

    await db.user.delete({ where: { id: other.body.data.user.id } });
  });
});

// ─── Category breakdown ───────────────────────────────────────────────────────
describe('GET /analytics/summary — categoryBreakdown', () => {
  it('groups expenses by category sorted by total descending', async () => {
    const res = await request(app)
      .get('/analytics/summary')
      .set('Authorization', `Bearer ${authToken}`);

    const { categoryBreakdown } = res.body.data;
    expect(Array.isArray(categoryBreakdown)).toBe(true);
    expect(categoryBreakdown.length).toBeGreaterThan(0);

    // Shopping = 100+150 = 250, Food = 25+20+30 = 75, Bills = 15
    const shopping = categoryBreakdown.find((c: { category: string }) => c.category === 'Shopping');
    const food = categoryBreakdown.find((c: { category: string }) => c.category === 'Food');
    const bills = categoryBreakdown.find((c: { category: string }) => c.category === 'Bills');

    expect(shopping?.total).toBe(250);
    expect(food?.total).toBe(75);
    expect(bills?.total).toBe(15);

    // Sorted by total desc
    expect(categoryBreakdown[0].total).toBeGreaterThanOrEqual(categoryBreakdown[1].total);
  });

  it('includes percentage that sums to ~100', async () => {
    const res = await request(app)
      .get('/analytics/summary')
      .set('Authorization', `Bearer ${authToken}`);

    const { categoryBreakdown } = res.body.data;
    const total = categoryBreakdown.reduce(
      (sum: number, c: { percentage: number }) => sum + c.percentage,
      0,
    );
    // Allow for rounding differences
    expect(total).toBeGreaterThan(95);
    expect(total).toBeLessThanOrEqual(101);
  });

  it('does not include INCOME in category breakdown', async () => {
    const res = await request(app)
      .get('/analytics/summary')
      .set('Authorization', `Bearer ${authToken}`);

    const { categoryBreakdown } = res.body.data;
    const incomeCategory = categoryBreakdown.find(
      (c: { category: string }) => c.category.toUpperCase() === 'INCOME',
    );
    expect(incomeCategory).toBeUndefined();
  });
});

// ─── Monthly trend ────────────────────────────────────────────────────────────
describe('GET /analytics/summary — monthlyTrend', () => {
  it('returns monthly buckets sorted chronologically', async () => {
    const res = await request(app)
      .get('/analytics/summary')
      .set('Authorization', `Bearer ${authToken}`);

    const { monthlyTrend } = res.body.data;
    expect(Array.isArray(monthlyTrend)).toBe(true);
    expect(monthlyTrend.length).toBe(2); // July and August

    expect(monthlyTrend[0].month).toBe('2025-07');
    expect(monthlyTrend[1].month).toBe('2025-08');
  });

  it('calculates correct monthly income and expenses', async () => {
    const res = await request(app)
      .get('/analytics/summary')
      .set('Authorization', `Bearer ${authToken}`);

    const { monthlyTrend } = res.body.data;
    const july = monthlyTrend.find((t: { month: string }) => t.month === '2025-07');
    const august = monthlyTrend.find((t: { month: string }) => t.month === '2025-08');

    expect(july.income).toBe(3000);
    expect(july.expenses).toBe(160);  // 25+15+20+100
    expect(july.net).toBe(2840);

    expect(august.income).toBe(3200);
    expect(august.expenses).toBe(180); // 150+30
    expect(august.net).toBe(3020);
  });
});

// ─── Top merchants ────────────────────────────────────────────────────────────
describe('GET /analytics/summary — topMerchants', () => {
  it('returns top 5 merchants sorted by total spent', async () => {
    const res = await request(app)
      .get('/analytics/summary')
      .set('Authorization', `Bearer ${authToken}`);

    const { topMerchants } = res.body.data;
    expect(Array.isArray(topMerchants)).toBe(true);
    expect(topMerchants.length).toBeLessThanOrEqual(5);

    // Starbucks spent: 25+20+30 = 75, Amazon: 100, Nike: 150
    // Nike should be highest expense merchant
    expect(topMerchants[0].merchant).toBe('Nike');
    expect(topMerchants[0].total).toBe(150);

    // Starbucks should have count of 3
    const starbucks = topMerchants.find((m: { merchant: string }) => m.merchant === 'Starbucks');
    expect(starbucks?.count).toBe(3);
    expect(starbucks?.total).toBe(75);
  });

  it('does not include income merchants', async () => {
    const res = await request(app)
      .get('/analytics/summary')
      .set('Authorization', `Bearer ${authToken}`);

    const { topMerchants } = res.body.data;
    const employer = topMerchants.find(
      (m: { merchant: string }) => m.merchant === 'Employer Inc',
    );
    expect(employer).toBeUndefined();
  });
});

// ─── Date range filter ────────────────────────────────────────────────────────
describe('GET /analytics/summary — date range filter', () => {
  it('filters to July only with dateFrom and dateTo', async () => {
    const res = await request(app)
      .get('/analytics/summary?dateFrom=2025-07-01&dateTo=2025-07-31')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    const { summary, monthlyTrend } = res.body.data;

    expect(summary.totalIncome).toBe(3000);
    expect(summary.totalExpenses).toBe(160);
    expect(summary.transactionCount).toBe(5);
    expect(monthlyTrend.length).toBe(1);
    expect(monthlyTrend[0].month).toBe('2025-07');
  });

  it('returns empty data for a date range with no transactions', async () => {
    const res = await request(app)
      .get('/analytics/summary?dateFrom=2020-01-01&dateTo=2020-12-31')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.summary.transactionCount).toBe(0);
    expect(res.body.data.categoryBreakdown).toHaveLength(0);
    expect(res.body.data.monthlyTrend).toHaveLength(0);
    expect(res.body.data.topMerchants).toHaveLength(0);
  });
});
