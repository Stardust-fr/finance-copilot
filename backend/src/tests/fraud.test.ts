import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import app from '../app';
import { db } from '../lib/db';
import { scoreFraud } from '../services/fraud.service';

const USER_EMAIL = `fraud_test_${Date.now()}@example.com`;
const USER_PASSWORD = 'Fraud1234';

let authToken: string;
let userId: string;
let accountId: string;

beforeAll(async () => {
  const reg = await request(app).post('/auth/register').send({
    name: 'Fraud Tester',
    email: USER_EMAIL,
    password: USER_PASSWORD,
  });
  authToken = reg.body.data.token;
  userId = reg.body.data.user.id;

  const account = await db.account.create({
    data: { userId, bankName: 'Fraud Bank', accountName: 'Checking' },
  });
  accountId = account.id;
});

afterAll(async () => {
  await db.transaction.deleteMany({ where: { accountId } });
  await db.account.delete({ where: { id: accountId } });
  await db.user.delete({ where: { id: userId } });
});

// ─── FraudService unit tests ──────────────────────────────────────────────────
describe('FraudService — Rule 1: large amount', () => {
  it('scores 0 when there is no historical average yet', async () => {
    const result = await scoreFraud({
      accountId,
      merchant: 'Test Store',
      amount: 10000,
      date: new Date('2025-07-15T10:00:00'),
    });
    // No prior transactions → no average → rule doesn't fire
    expect(result.triggeredRules).not.toContain('large_amount');
  });

  it('flags a transaction that is >3x the 90-day average', async () => {
    // Seed small average expenses
    await db.transaction.createMany({
      data: [
        { accountId, merchant: 'Coffee', amount: 5, type: 'EXPENSE', date: new Date('2025-07-01') },
        { accountId, merchant: 'Coffee', amount: 5, type: 'EXPENSE', date: new Date('2025-07-02') },
        { accountId, merchant: 'Coffee', amount: 5, type: 'EXPENSE', date: new Date('2025-07-03') },
      ],
    });

    // avg = $5, 3x = $15, score $50 > $15
    const result = await scoreFraud({
      accountId,
      merchant: 'Big Purchase',
      amount: 50,
      date: new Date('2025-07-15T10:00:00'),
    });

    expect(result.triggeredRules).toContain('large_amount');
    expect(result.riskScore).toBeGreaterThanOrEqual(40);
  });

  it('does not flag a transaction close to the average', async () => {
    // avg is ~$5, $12 is not > 3x
    const result = await scoreFraud({
      accountId,
      merchant: 'Lunch',
      amount: 12,
      date: new Date('2025-07-15T10:00:00'),
    });
    expect(result.triggeredRules).not.toContain('large_amount');
  });
});

describe('FraudService — Rule 2: repeat merchant', () => {
  it('flags when same merchant appears 3+ times within 24 hours', async () => {
    // Seed 2 recent transactions from same merchant (already in DB from above seeds
    // but let's be explicit with a known merchant)
    const now = new Date('2025-08-01T12:00:00');
    await db.transaction.createMany({
      data: [
        { accountId, merchant: 'SuspiciousMerchant', amount: 10, type: 'EXPENSE', date: new Date(now.getTime() - 1 * 60 * 60 * 1000) },
        { accountId, merchant: 'SuspiciousMerchant', amount: 10, type: 'EXPENSE', date: new Date(now.getTime() - 2 * 60 * 60 * 1000) },
      ],
    });

    const result = await scoreFraud({
      accountId,
      merchant: 'SuspiciousMerchant',
      amount: 10,
      date: now,
    });

    expect(result.triggeredRules).toContain('repeat_merchant');
    expect(result.riskScore).toBeGreaterThanOrEqual(30);
    expect(result.isFlagged).toBe(true);
  });

  it('does not flag when merchant appears only twice in 24 hours', async () => {
    const now = new Date('2025-08-05T12:00:00');
    await db.transaction.create({
      data: { accountId, merchant: 'NormalMerchant', amount: 20, type: 'EXPENSE', date: new Date(now.getTime() - 3 * 60 * 60 * 1000) },
    });

    const result = await scoreFraud({
      accountId,
      merchant: 'NormalMerchant',
      amount: 20,
      date: now,
    });

    expect(result.triggeredRules).not.toContain('repeat_merchant');
  });
});

describe('FraudService — Rule 3: midnight transaction', () => {
  it('flags transactions between 00:00 and 04:00', async () => {
    const result = await scoreFraud({
      accountId,
      merchant: 'Night Store',
      amount: 5,
      date: new Date('2025-07-20T02:30:00'),
    });

    expect(result.triggeredRules).toContain('midnight_transaction');
    expect(result.riskScore).toBeGreaterThanOrEqual(15);
  });

  it('does not flag a daytime transaction', async () => {
    const result = await scoreFraud({
      accountId,
      merchant: 'Day Store',
      amount: 5,
      date: new Date('2025-07-20T14:00:00'),
    });

    expect(result.triggeredRules).not.toContain('midnight_transaction');
  });

  it('flags at exactly midnight (00:00)', async () => {
    const result = await scoreFraud({
      accountId,
      merchant: 'Midnight',
      amount: 5,
      date: new Date('2025-07-21T00:00:00'),
    });
    expect(result.triggeredRules).toContain('midnight_transaction');
  });
});

describe('FraudService — Rule 4: duplicate payment', () => {
  it('flags same merchant + same amount within 48 hours', async () => {
    // Use midnight time so midnight rule (15) + duplicate rule (30) = 45 >= threshold (40)
    const now = new Date('2025-09-01T02:00:00'); // 02:00 — triggers midnight rule too
    await db.transaction.create({
      data: {
        accountId,
        merchant: 'DupeMerchant',
        amount: 50,
        type: 'EXPENSE',
        date: new Date(now.getTime() - 6 * 60 * 60 * 1000),
      },
    });

    const result = await scoreFraud({
      accountId,
      merchant: 'DupeMerchant',
      amount: 50,
      date: now,
    });

    expect(result.triggeredRules).toContain('duplicate_payment');
    expect(result.triggeredRules).toContain('midnight_transaction');
    expect(result.isFlagged).toBe(true); // 30 + 15 = 45 >= 40
  });

  it('does not flag same merchant with different amount', async () => {
    const now = new Date('2025-09-05T10:00:00');
    await db.transaction.create({
      data: { accountId, merchant: 'ShopA', amount: 50, type: 'EXPENSE', date: new Date(now.getTime() - 2 * 60 * 60 * 1000) },
    });

    const result = await scoreFraud({
      accountId,
      merchant: 'ShopA',
      amount: 75, // different amount
      date: now,
    });

    expect(result.triggeredRules).not.toContain('duplicate_payment');
  });
});

describe('FraudService — riskScore capping and isFlagged', () => {
  it('caps riskScore at 100', async () => {
    // Trigger all rules: midnight + large + repeat + duplicate → 15+40+30+30 = 115 → capped at 100
    const now = new Date('2025-10-01T02:00:00'); // midnight ✓

    // Seed: small average → make amount huge (large rule ✓)
    await db.transaction.createMany({
      data: [
        { accountId, merchant: 'AllRulesMerchant', amount: 1, type: 'EXPENSE', date: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000) },
        // 2 recent same merchant (repeat rule ✓)
        { accountId, merchant: 'AllRulesMerchant', amount: 500, type: 'EXPENSE', date: new Date(now.getTime() - 1 * 60 * 60 * 1000) },
        { accountId, merchant: 'AllRulesMerchant', amount: 500, type: 'EXPENSE', date: new Date(now.getTime() - 2 * 60 * 60 * 1000) },
        // same amount for duplicate rule ✓
        { accountId, merchant: 'AllRulesMerchant', amount: 500, type: 'EXPENSE', date: new Date(now.getTime() - 3 * 60 * 60 * 1000) },
      ],
    });

    const result = await scoreFraud({
      accountId,
      merchant: 'AllRulesMerchant',
      amount: 500,
      date: now,
    });

    expect(result.riskScore).toBeLessThanOrEqual(100);
    expect(result.isFlagged).toBe(true);
  });

  it('returns isFlagged=false and riskScore=0 for a clean transaction', async () => {
    // Use a fresh account with no history
    const cleanUser = await db.user.create({
      data: { name: 'Clean', email: `clean_fraud_${Date.now()}@test.com`, passwordHash: 'x' },
    });
    const cleanAccount = await db.account.create({
      data: { userId: cleanUser.id, bankName: 'Clean Bank', accountName: 'Checking' },
    });

    const result = await scoreFraud({
      accountId: cleanAccount.id,
      merchant: 'Normal Store',
      amount: 10,
      date: new Date('2025-07-15T14:00:00'),
    });

    expect(result.riskScore).toBe(0);
    expect(result.isFlagged).toBe(false);
    expect(result.triggeredRules).toHaveLength(0);

    await db.account.delete({ where: { id: cleanAccount.id } });
    await db.user.delete({ where: { id: cleanUser.id } });
  });
});

// ─── Flagged tab via API ───────────────────────────────────────────────────────
describe('GET /transactions?flagged=true', () => {
  it('returns only flagged transactions', async () => {
    // Seed one explicitly flagged transaction
    await db.transaction.create({
      data: {
        accountId,
        merchant: 'FlaggedStore',
        amount: 10,
        type: 'EXPENSE',
        date: new Date('2025-11-01'),
        isFlagged: true,
        riskScore: 70,
      },
    });

    const res = await request(app)
      .get('/transactions?flagged=true')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.every((t: { isFlagged: boolean }) => t.isFlagged)).toBe(true);
    const flagged = res.body.data.find((t: { merchant: string }) => t.merchant === 'FlaggedStore');
    expect(flagged).toBeDefined();
    expect(flagged.riskScore).toBe(70);
  });
});
