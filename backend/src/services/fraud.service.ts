/**
 * Rule-based fraud detection service.
 *
 * Four rules, each contributes a weighted score:
 *   1. Large amount    — amount > 3× the user's 90-day average expense  (+40)
 *   2. Repeat merchant — same merchant 3+ times within 24 hours          (+30)
 *   3. Midnight        — transaction between 00:00 and 04:00             (+15)
 *   4. Duplicate       — identical amount + merchant within 48 hours     (+30)
 *
 * riskScore = sum of triggered rule weights, capped at 100.
 * isFlagged = riskScore >= 40  (at least one significant rule triggered).
 */

import { db } from '../lib/db';

export interface FraudResult {
  riskScore: number;   // 0–100
  isFlagged: boolean;
  triggeredRules: string[];
}

export interface TransactionInput {
  accountId: string;
  merchant: string;
  amount: number;
  date: Date;
}

// ─── Rule weights ─────────────────────────────────────────────────────────────
const WEIGHT_LARGE_AMOUNT = 40;
const WEIGHT_REPEAT_MERCHANT = 30;
const WEIGHT_MIDNIGHT = 15;
const WEIGHT_DUPLICATE = 30;
const FLAG_THRESHOLD = 40;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function toNum(val: unknown): number {
  return parseFloat(String(val ?? '0')) || 0;
}

function hoursAgo(date: Date, hours: number): Date {
  return new Date(date.getTime() - hours * 60 * 60 * 1000);
}

function daysAgo(date: Date, days: number): Date {
  return new Date(date.getTime() - days * 24 * 60 * 60 * 1000);
}

// ─── Core scoring function ────────────────────────────────────────────────────
export async function scoreFraud(tx: TransactionInput): Promise<FraudResult> {
  let score = 0;
  const triggeredRules: string[] = [];

  const hour = tx.date.getHours();

  // ── Rule 3: Midnight (00:00–04:00) — cheap check, no DB hit ──────────────
  if (hour >= 0 && hour < 4) {
    score += WEIGHT_MIDNIGHT;
    triggeredRules.push('midnight_transaction');
  }

  // ── Batch DB lookups ──────────────────────────────────────────────────────
  const [avgResult, recentSameMerchant, recentSameAmountMerchant] = await Promise.all([
    // Rule 1: 90-day average expense for this account
    db.transaction.aggregate({
      where: {
        accountId: tx.accountId,
        type: 'EXPENSE',
        date: { gte: daysAgo(tx.date, 90) },
      },
      _avg: { amount: true },
    }),

    // Rule 2: same merchant within last 24 hours
    db.transaction.count({
      where: {
        accountId: tx.accountId,
        merchant: { equals: tx.merchant, mode: 'insensitive' },
        date: { gte: hoursAgo(tx.date, 24) },
      },
    }),

    // Rule 4: same merchant + same amount within last 48 hours
    db.transaction.count({
      where: {
        accountId: tx.accountId,
        merchant: { equals: tx.merchant, mode: 'insensitive' },
        amount: tx.amount,
        date: { gte: hoursAgo(tx.date, 48) },
      },
    }),
  ]);

  // ── Rule 1: Large amount ──────────────────────────────────────────────────
  if (tx.amount > 0) {
    const avg = toNum(avgResult._avg.amount);
    if (avg > 0 && tx.amount > avg * 3) {
      score += WEIGHT_LARGE_AMOUNT;
      triggeredRules.push('large_amount');
    }
  }

  // ── Rule 2: Repeat merchant ───────────────────────────────────────────────
  // recentSameMerchant counts existing transactions; >= 2 means this would be the 3rd+
  if (recentSameMerchant >= 2) {
    score += WEIGHT_REPEAT_MERCHANT;
    triggeredRules.push('repeat_merchant');
  }

  // ── Rule 4: Duplicate payment ─────────────────────────────────────────────
  if (recentSameAmountMerchant >= 1) {
    score += WEIGHT_DUPLICATE;
    triggeredRules.push('duplicate_payment');
  }

  const riskScore = Math.min(score, 100);
  return {
    riskScore,
    isFlagged: riskScore >= FLAG_THRESHOLD,
    triggeredRules,
  };
}

// ─── Batch scoring for import ─────────────────────────────────────────────────
// Runs sequentially (not concurrently) so each scored transaction is visible
// to subsequent duplicate checks within the same batch.
export async function scoreFraudBatch(
  transactions: TransactionInput[],
): Promise<FraudResult[]> {
  const results: FraudResult[] = [];
  for (const tx of transactions) {
    const result = await scoreFraud(tx);
    results.push(result);
  }
  return results;
}
