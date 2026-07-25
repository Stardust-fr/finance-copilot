import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import app from '../app';
import { db } from '../lib/db';
import { MockAIService } from '../services/ai/MockAIService';

const USER_EMAIL = `ai_test_${Date.now()}@example.com`;
const USER_PASSWORD = 'AiTest1234';

let authToken: string;
let userId: string;
let accountId: string;

beforeAll(async () => {
  const reg = await request(app).post('/auth/register').send({
    name: 'AI Tester',
    email: USER_EMAIL,
    password: USER_PASSWORD,
  });
  authToken = reg.body.data.token;
  userId = reg.body.data.user.id;

  // Create account and seed transactions so chat has real context
  const account = await db.account.create({
    data: { userId, bankName: 'AI Bank', accountName: 'Checking' },
  });
  accountId = account.id;

  await db.transaction.createMany({
    data: [
      { accountId, merchant: 'Employer Inc', amount: 4000, type: 'INCOME', category: 'Income', date: new Date('2025-07-01') },
      { accountId, merchant: 'Starbucks', amount: 45, type: 'EXPENSE', category: 'Food', date: new Date('2025-07-05') },
      { accountId, merchant: 'Netflix', amount: 15, type: 'EXPENSE', category: 'Bills', date: new Date('2025-07-10') },
      { accountId, merchant: 'Amazon', amount: 120, type: 'EXPENSE', category: 'Shopping', date: new Date('2025-07-15') },
    ],
  });
});

afterAll(async () => {
  await db.transaction.deleteMany({ where: { accountId } });
  await db.account.delete({ where: { id: accountId } });
  await db.user.delete({ where: { id: userId } });
});

// ─── MockAIService unit tests ─────────────────────────────────────────────────
describe('MockAIService.categorizeTransaction', () => {
  const ai = new MockAIService();

  const cases: Array<[string, string]> = [
    ['Starbucks', 'FOOD'],
    ['McDonald\'s', 'FOOD'],
    ['Uber Eats', 'FOOD'],
    ['Uber', 'TRAVEL'],
    ['Delta Airlines', 'TRAVEL'],
    ['Amazon', 'SHOPPING'],
    ['Nike', 'SHOPPING'],
    ['Netflix', 'BILLS'],
    ['Verizon', 'BILLS'],
    ['CVS Pharmacy', 'HEALTHCARE'],
    ['AMC Theatres', 'ENTERTAINMENT'],
    ['Udemy', 'EDUCATION'],
    ['Employer Inc Salary', 'INCOME'],
    ['Random Unknown Merchant XYZ', 'OTHER'],
  ];

  cases.forEach(([merchant, expectedCategory]) => {
    it(`classifies "${merchant}" as ${expectedCategory}`, async () => {
      const result = await ai.categorizeTransaction({ merchant, amount: 10 });
      expect(result.category).toBe(expectedCategory);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });

  it('returns confidence >= 0.9 for well-known merchants', async () => {
    const result = await ai.categorizeTransaction({ merchant: 'Starbucks', amount: 6 });
    expect(result.confidence).toBeGreaterThanOrEqual(0.9);
  });

  it('returns lower confidence for unknown merchants', async () => {
    const result = await ai.categorizeTransaction({ merchant: 'XYZ Unknown Co', amount: 50 });
    expect(result.confidence).toBeLessThan(0.8);
  });
});

// ─── POST /ai/categorize ──────────────────────────────────────────────────────
describe('POST /ai/categorize', () => {
  it('returns 401 without a token', async () => {
    const res = await request(app).post('/ai/categorize').send({ merchant: 'Starbucks' });
    expect(res.status).toBe(401);
  });

  it('returns 400 when merchant is missing', async () => {
    const res = await request(app)
      .post('/ai/categorize')
      .set('Authorization', `Bearer ${authToken}`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.errors[0].field).toBe('merchant');
  });

  it('returns category and confidence for Starbucks', async () => {
    const res = await request(app)
      .post('/ai/categorize')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ merchant: 'Starbucks', amount: 6.75 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.category).toBe('FOOD');
    expect(res.body.data.confidence).toBeGreaterThan(0);
  });

  it('returns category and confidence for Uber', async () => {
    const res = await request(app)
      .post('/ai/categorize')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ merchant: 'Uber', amount: 18 });

    expect(res.status).toBe(200);
    expect(res.body.data.category).toBe('TRAVEL');
  });

  it('returns OTHER for an unrecognised merchant', async () => {
    const res = await request(app)
      .post('/ai/categorize')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ merchant: 'Unrecognised Co XYZ 99' });

    expect(res.status).toBe(200);
    expect(res.body.data.category).toBe('OTHER');
  });

  it('response shape always has category and confidence', async () => {
    const res = await request(app)
      .post('/ai/categorize')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ merchant: 'Test', amount: 10, description: 'Some desc', date: '2025-07-01' });

    expect(res.status).toBe(200);
    expect(typeof res.body.data.category).toBe('string');
    expect(typeof res.body.data.confidence).toBe('number');
  });
});

// ─── POST /ai/chat ────────────────────────────────────────────────────────────
describe('POST /ai/chat', () => {
  it('returns 401 without a token', async () => {
    const res = await request(app).post('/ai/chat').send({ message: 'Hello' });
    expect(res.status).toBe(401);
  });

  it('returns 400 when message is missing', async () => {
    const res = await request(app)
      .post('/ai/chat')
      .set('Authorization', `Bearer ${authToken}`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.errors[0].field).toBe('message');
  });

  it('returns a non-empty reply string', async () => {
    const res = await request(app)
      .post('/ai/chat')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ message: 'Where did I spend the most?' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.data.reply).toBe('string');
    expect(res.body.data.reply.length).toBeGreaterThan(0);
  });

  it('reply references real spending data', async () => {
    const res = await request(app)
      .post('/ai/chat')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ message: 'How much did I spend?' });

    expect(res.status).toBe(200);
    // The mock uses real analytics, so the reply should mention actual dollar amounts
    expect(res.body.data.reply).toMatch(/\$[\d,]+/);
  });

  it('answers savings question', async () => {
    const res = await request(app)
      .post('/ai/chat')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ message: 'How much did I save this month?' });

    expect(res.status).toBe(200);
    expect(res.body.data.reply.length).toBeGreaterThan(10);
  });

  it('returns 400 for message exceeding 1000 chars', async () => {
    const res = await request(app)
      .post('/ai/chat')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ message: 'a'.repeat(1001) });

    expect(res.status).toBe(400);
  });
});
