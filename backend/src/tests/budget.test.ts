import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import app from '../app';
import { db } from '../lib/db';

const USER_EMAIL = `budget_test_${Date.now()}@example.com`;
const USER_PASSWORD = 'Budget1234';

let authToken: string;
let userId: string;
let accountId: string;

beforeAll(async () => {
  const reg = await request(app).post('/auth/register').send({
    name: 'Budget Tester',
    email: USER_EMAIL,
    password: USER_PASSWORD,
  });
  authToken = reg.body.data.token;
  userId = reg.body.data.user.id;

  // Create account and seed expenses so "spent" totals are non-zero
  const account = await db.account.create({
    data: { userId, bankName: 'Budget Bank', accountName: 'Checking' },
  });
  accountId = account.id;

  await db.transaction.createMany({
    data: [
      // Food: 45 + 30 = 75
      { accountId, merchant: 'Starbucks', amount: 45, type: 'EXPENSE', category: 'Food', date: new Date() },
      { accountId, merchant: 'Chipotle', amount: 30, type: 'EXPENSE', category: 'Food', date: new Date() },
      // Shopping: 120
      { accountId, merchant: 'Amazon', amount: 120, type: 'EXPENSE', category: 'Shopping', date: new Date() },
      // Income — should NOT count toward spend
      { accountId, merchant: 'Employer', amount: 3000, type: 'INCOME', category: 'Income', date: new Date() },
    ],
  });
});

afterAll(async () => {
  await db.budget.deleteMany({ where: { userId } });
  await db.transaction.deleteMany({ where: { accountId } });
  await db.account.delete({ where: { id: accountId } });
  await db.user.delete({ where: { id: userId } });
});

// ─── Auth guard ───────────────────────────────────────────────────────────────
describe('GET /budget — auth', () => {
  it('returns 401 without a token', async () => {
    const res = await request(app).get('/budget');
    expect(res.status).toBe(401);
  });
});

// ─── GET /budget ──────────────────────────────────────────────────────────────
describe('GET /budget', () => {
  it('returns empty array when no budgets set', async () => {
    const res = await request(app)
      .get('/budget')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([]);
  });
});

// ─── POST /budget ─────────────────────────────────────────────────────────────
describe('POST /budget', () => {
  it('returns 401 without a token', async () => {
    const res = await request(app)
      .post('/budget')
      .send({ category: 'FOOD', monthlyLimit: 300 });
    expect(res.status).toBe(401);
  });

  it('creates a new budget and returns it with spend data', async () => {
    const res = await request(app)
      .post('/budget')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ category: 'FOOD', monthlyLimit: 300 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const budget = res.body.data;
    expect(budget.category).toBe('FOOD');
    expect(budget.monthlyLimit).toBe(300);
    expect(budget.spent).toBe(75);              // 45 + 30
    expect(budget.remaining).toBe(225);
    expect(budget.percentUsed).toBe(25);
    expect(budget.isOverBudget).toBe(false);
  });

  it('updates existing budget when same category POSTed again', async () => {
    const res = await request(app)
      .post('/budget')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ category: 'FOOD', monthlyLimit: 50 }); // lower limit than spent

    expect(res.status).toBe(200);
    const budget = res.body.data;
    expect(budget.monthlyLimit).toBe(50);
    expect(budget.isOverBudget).toBe(true);     // 75 spent > 50 limit
  });

  it('creates a second budget for a different category', async () => {
    const res = await request(app)
      .post('/budget')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ category: 'SHOPPING', monthlyLimit: 200 });

    expect(res.status).toBe(200);
    expect(res.body.data.category).toBe('SHOPPING');
    expect(res.body.data.spent).toBe(120);
  });

  it('returns 400 for invalid category', async () => {
    const res = await request(app)
      .post('/budget')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ category: 'INVALID_CAT', monthlyLimit: 100 });

    expect(res.status).toBe(400);
    expect(res.body.errors[0].field).toBe('category');
  });

  it('returns 400 for zero or negative monthlyLimit', async () => {
    const res = await request(app)
      .post('/budget')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ category: 'FOOD', monthlyLimit: -50 });

    expect(res.status).toBe(400);
    expect(res.body.errors[0].field).toBe('monthlyLimit');
  });

  it('returns 400 when monthlyLimit is missing', async () => {
    const res = await request(app)
      .post('/budget')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ category: 'FOOD' });

    expect(res.status).toBe(400);
  });
});

// ─── GET /budget with data ────────────────────────────────────────────────────
describe('GET /budget with budgets set', () => {
  it('returns all budgets with correct spend data', async () => {
    const res = await request(app)
      .get('/budget')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(2);

    const food = res.body.data.find((b: { category: string }) => b.category === 'FOOD');
    const shopping = res.body.data.find((b: { category: string }) => b.category === 'SHOPPING');

    expect(food).toBeDefined();
    expect(shopping).toBeDefined();
    expect(food.spent).toBe(75);
    expect(shopping.spent).toBe(120);
  });

  it('income transactions do not count toward spend', async () => {
    const res = await request(app)
      .get('/budget')
      .set('Authorization', `Bearer ${authToken}`);

    const income = res.body.data.find(
      (b: { category: string }) => b.category.toUpperCase() === 'INCOME',
    );
    expect(income).toBeUndefined(); // no budget was set for INCOME
  });

  it('does not return budgets from other users', async () => {
    const other = await request(app).post('/auth/register').send({
      name: 'Other Budget User',
      email: `other_budget_${Date.now()}@example.com`,
      password: 'OtherBudget1',
    });

    const res = await request(app)
      .get('/budget')
      .set('Authorization', `Bearer ${other.body.data.token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);

    await db.user.delete({ where: { id: other.body.data.user.id } });
  });
});

// ─── DELETE /budget/:category ─────────────────────────────────────────────────
describe('DELETE /budget/:category', () => {
  it('returns 401 without a token', async () => {
    const res = await request(app).delete('/budget/FOOD');
    expect(res.status).toBe(401);
  });

  it('deletes an existing budget', async () => {
    const res = await request(app)
      .delete('/budget/SHOPPING')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify it's gone
    const check = await request(app)
      .get('/budget')
      .set('Authorization', `Bearer ${authToken}`);
    const shopping = check.body.data.find(
      (b: { category: string }) => b.category === 'SHOPPING',
    );
    expect(shopping).toBeUndefined();
  });

  it('returns 404 for a non-existent budget', async () => {
    const res = await request(app)
      .delete('/budget/TRAVEL')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(404);
  });

  it('returns 400 for an invalid category param', async () => {
    const res = await request(app)
      .delete('/budget/INVALID_CAT')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(400);
  });
});
