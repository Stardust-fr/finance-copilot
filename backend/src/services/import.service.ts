import crypto from 'crypto';

import { $Enums } from '../generated/prisma/client';
import { db } from '../lib/db';
import { getAIService } from './ai';
import { parseCsv, ParsedRow } from './csv-parser.service';
import { scoreFraudBatch } from './fraud.service';

export interface ImportSummary {
  imported: number;
  skipped: number;
  errors: string[];
}

function buildHash(accountId: string, row: ParsedRow): string {
  const raw = `${accountId}|${row.date.toISOString().slice(0, 10)}|${row.amount.toFixed(2)}|${row.description.toLowerCase()}`;
  return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 64);
}

async function getOrCreateAccount(userId: string): Promise<string> {
  const existing = await db.account.findFirst({ where: { userId } });
  if (existing) return existing.id;
  const created = await db.account.create({
    data: { userId, bankName: 'Imported', accountName: 'CSV Import' },
  });
  return created.id;
}

export async function importCsv(userId: string, csvContent: string): Promise<ImportSummary> {
  const { rows, errors } = parseCsv(csvContent);
  if (!rows.length) return { imported: 0, skipped: 0, errors };

  const accountId = await getOrCreateAccount(userId);

  // Deduplicate within the file
  const hashMap = new Map<string, ParsedRow>();
  for (const row of rows) {
    const hash = buildHash(accountId, row);
    if (!hashMap.has(hash)) hashMap.set(hash, row);
  }

  const hashes = Array.from(hashMap.keys());

  const existing = await db.transaction.findMany({
    where: { accountId, hash: { in: hashes } },
    select: { hash: true },
  });
  const existingHashes = new Set(existing.map((t) => t.hash as string));

  const toInsert: Array<{ hash: string; row: ParsedRow }> = [];
  let skipped = 0;

  for (const [hash, row] of hashMap) {
    if (existingHashes.has(hash)) skipped++;
    else toInsert.push({ hash, row });
  }

  if (toInsert.length === 0) return { imported: 0, skipped, errors };

  // ── Step 1: AI categorization ─────────────────────────────────────────────
  const aiService = getAIService();
  const categorized = await Promise.all(
    toInsert.map(async ({ hash, row }) => {
      try {
        const result = await aiService.categorizeTransaction({
          merchant: row.description,
          amount: row.amount,
        });
        return { hash, row, aiCategory: result.category, confidence: result.confidence };
      } catch {
        return { hash, row, aiCategory: null, confidence: null };
      }
    }),
  );

  // ── Step 2: Fraud scoring (sequential so intra-batch duplicates are caught) ─
  const fraudResults = await scoreFraudBatch(
    toInsert.map(({ row }) => ({
      accountId,
      merchant: row.description,
      amount: row.amount,
      date: row.date,
    })),
  );

  // ── Step 3: Bulk insert with AI + fraud data ───────────────────────────────
  await db.transaction.createMany({
    data: categorized.map(({ hash, row, aiCategory, confidence }, i) => {
      const fraud = fraudResults[i];
      return {
        accountId,
        merchant: row.description,
        description: row.description,
        amount: row.amount,
        type: row.type,
        date: row.date,
        hash,
        aiCategory: aiCategory as $Enums.AiCategory | null,
        confidence,
        category: aiCategory
          ? aiCategory.charAt(0) + aiCategory.slice(1).toLowerCase()
          : null,
        riskScore: fraud.riskScore,
        isFlagged: fraud.isFlagged,
      };
    }),
  });

  return { imported: toInsert.length, skipped, errors };
}
