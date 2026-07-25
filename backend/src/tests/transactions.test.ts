import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import app from '../app';
import { db } from '../lib/db';

const USER_EMAIL = `tx_test_${Date.now()}@example.com`;
const USER_PASSWORD = 'TxTest123';

let authToken: string;
let userId: string;
let accountId: string;
let transactionId: string;

beforeAll(async () => {
  // Register test user
  const reg = await request(app).post('/auth/register').send({
    name: 'Tx Tester',
    email: USER_EMAIL,
    password: USER_PASSWORD,
  });
  authToken = reg.body.data.token;
  userId = reg.body.data.user.id;

  // Create an account for this user
  const account = await db.account.create({
    data: { userId, bankName: 'Test Bank', accountName: 'Checking' },
  });
  accountId = account.id;

  // Seed 3 transactions
  await db.transaction.createMany({
    data: [
      {
        accountId,
        merchant: 'Starbucks',
        amount: 6.75,
        type: 'EXPENSE',
        aiCategory: 'FOOD',
        category: 'Food',
        date: new Date('2025-07-01'),
      },
      {
        accountId,
        merchant: 'Employer Inc.',
        amount: 3500,
        type: 'INCOME',
        aiCategory: 'INCOME',
        category: 'Income',
        date: new Date('2025-07-15'),
      },
      {
        accountId,
        merchant: 'Amazon',
        amount: 55.99,
        type: 'EXPENSE',
        aiCategory: 'SHOPPING',
        category: 'Shopping',
        date: new Date('2025-07-10'),
        isFlagged: true,
        riskScore: 72,
      },
    ],
  });

  // Grab the first transaction for delete tests
  const first = await db.transaction.findFirst({
    where: { accountId },
    orderBy: { date: 'asc' },
  });
  transactionId = first!.id;
});

afterAll(async () => {
  await db.transaction.deleteMany({ where: { accountId } });
  await db.account.delete({ where: { id: accountId } });
  await db.user.delete({ where: { id: userId } });
});

// ─── GET /transactions ────────────────────────────────────────────────────────
describe('GET /transactions', () => {
  it('returns 401 without a token', async () => {
    const res = await request(app).get('/transactions');
    expect(res.status).toBe(401);
  });

  it('returns paginated transactions for the authenticated user', async () => {
    const res = await request(app)
      .get('/transactions')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(3);
    expect(res.body.meta).toMatchObject({
      total: 3,
      page: 1,
      limit: 20,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false,
    });
  });

  it('includes the account relation on each transaction', async () => {
    const res = await request(app)
      .get('/transactions')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.body.data[0].account).toBeDefined();
    expect(res.body.data[0].account.bankName).toBe('Test Bank');
  });

  it('filters by type=INCOME', async () => {
    const res = await request(app)
      .get('/transactions?type=INCOME')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].merchant).toBe('Employer Inc.');
  });

  it('filters by type=EXPENSE', async () => {
    const res = await request(app)
      .get('/transactions?type=EXPENSE')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(2);
    expect(res.body.data.every((t: { type: string }) => t.type === 'EXPENSE')).toBe(true);
  });

  it('filters by merchant (case-insensitive partial match)', async () => {
    const res = await request(app)
      .get('/transactions?merchant=star')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].merchant).toBe('Starbucks');
  });

  it('filters flagged=true', async () => {
    const res = await request(app)
      .get('/transactions?flagged=true')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].isFlagged).toBe(true);
  });

  it('paginates correctly with page=1&limit=2', async () => {
    const res = await request(app)
      .get('/transactions?page=1&limit=2')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(2);
    expect(res.body.meta.total).toBe(3);
    expect(res.body.meta.totalPages).toBe(2);
    expect(res.body.meta.hasNextPage).toBe(true);
  });

  it('returns page 2 correctly', async () => {
    const res = await request(app)
      .get('/transactions?page=2&limit=2')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.meta.hasPrevPage).toBe(true);
    expect(res.body.meta.hasNextPage).toBe(false);
  });

  it('returns 400 for invalid type param', async () => {
    const res = await request(app)
      .get('/transactions?type=INVALID')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(400);
    expect(res.body.errors[0].field).toBe('type');
  });

  it('does not return transactions from other users', async () => {
    const other = await request(app).post('/auth/register').send({
      name: 'Other',
      email: `other_${Date.now()}@example.com`,
      password: 'OtherPass1',
    });

    const res = await request(app)
      .get('/transactions')
      .set('Authorization', `Bearer ${other.body.data.token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(0);

    await db.user.delete({ where: { id: other.body.data.user.id } });
  });
});

// ─── DELETE /transactions/:id ─────────────────────────────────────────────────
describe('DELETE /transactions/:id', () => {
  it('returns 401 without a token', async () => {
    const res = await request(app).delete(`/transactions/${transactionId}`);
    expect(res.status).toBe(401);
  });

  it('returns 403 when another user tries to delete', async () => {
    const other = await request(app).post('/auth/register').send({
      name: 'Stealer',
      email: `stealer_${Date.now()}@example.com`,
      password: 'StealPass1',
    });

    const res = await request(app)
      .delete(`/transactions/${transactionId}`)
      .set('Authorization', `Bearer ${other.body.data.token}`);

    expect(res.status).toBe(403);

    await db.user.delete({ where: { id: other.body.data.user.id } });
  });

  it('returns 404 for a non-existent transaction', async () => {
    const res = await request(app)
      .delete('/transactions/nonexistent_id_xyz')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(404);
  });

  it('deletes the transaction and returns 200', async () => {
    const res = await request(app)
      .delete(`/transactions/${transactionId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const check = await db.transaction.findUnique({ where: { id: transactionId } });
    expect(check).toBeNull();
  });

  it('returns 404 when deleting an already-deleted transaction', async () => {
    const res = await request(app)
      .delete(`/transactions/${transactionId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(404);
  });
});
