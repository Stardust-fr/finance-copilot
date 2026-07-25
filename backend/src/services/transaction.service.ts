import { $Enums, Prisma } from '../generated/prisma/client';
import { db } from '../lib/db';
import { ListTransactionsQuery } from '../schemas/transaction.schemas';

export interface PaginatedTransactions {
  data: TransactionRow[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface TransactionRow {
  id: string;
  merchant: string;
  description: string | null;
  amount: string;
  date: Date;
  type: string;
  category: string | null;
  aiCategory: string | null;
  confidence: number | null;
  riskScore: number | null;
  isFlagged: boolean;
  account: { id: string; bankName: string; accountName: string };
}

// ─── List (paginated + filtered) ─────────────────────────────────────────────
export async function listTransactions(
  userId: string,
  query: ListTransactionsQuery,
): Promise<PaginatedTransactions> {
  const page = Number(query.page) || 1;
  const limit = Math.min(Number(query.limit) || 20, 100);
  const type = query.type;
  const category = query.category as string | undefined;
  const merchant = query.merchant as string | undefined;
  const flagged =
    query.flagged === undefined
      ? undefined
      : query.flagged === true || (query.flagged as unknown as string) === 'true';
  const dateFrom = query.dateFrom ? new Date(query.dateFrom) : undefined;
  const dateTo = query.dateTo ? new Date(query.dateTo) : undefined;
  const sortBy = (query.sortBy as string) || 'date';
  const sortOrder = (query.sortOrder as string) || 'desc';

  const skip = (page - 1) * limit;

  const where: Prisma.TransactionWhereInput = {
    account: { userId },
    ...(type && { type }),
    ...(category && {
      OR: [
        { category: { contains: category, mode: 'insensitive' as const } },
        { aiCategory: { equals: category.toUpperCase() as $Enums.AiCategory } },
      ],
    }),
    ...(merchant && { merchant: { contains: merchant, mode: 'insensitive' as const } }),
    ...(flagged !== undefined && { isFlagged: flagged }),
    ...((dateFrom || dateTo) && {
      date: {
        ...(dateFrom && { gte: dateFrom }),
        ...(dateTo && { lte: dateTo }),
      },
    }),
  };

  const [total, rows] = await Promise.all([
    db.transaction.count({ where }),
    db.transaction.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      select: {
        id: true,
        merchant: true,
        description: true,
        amount: true,
        date: true,
        type: true,
        category: true,
        aiCategory: true,
        confidence: true,
        riskScore: true,
        isFlagged: true,
        account: { select: { id: true, bankName: true, accountName: true } },
      },
    }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    data: rows.map((r) => ({ ...r, amount: r.amount.toString() })),
    meta: { total, page, limit, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1 },
  };
}

// ─── Update category (manual override) ───────────────────────────────────────
export async function updateTransactionCategory(
  userId: string,
  transactionId: string,
  category: string,
): Promise<void> {
  const tx = await db.transaction.findUnique({
    where: { id: transactionId },
    select: { account: { select: { userId: true } } },
  });

  if (!tx) {
    throw Object.assign(new Error('Transaction not found'), { statusCode: 404 });
  }
  if (tx.account.userId !== userId) {
    throw Object.assign(new Error('You do not have permission to update this transaction'), {
      statusCode: 403,
    });
  }

  // Update user-visible category; aiCategory stays unchanged (preserves original AI result)
  await db.transaction.update({
    where: { id: transactionId },
    data: {
      category: category.charAt(0).toUpperCase() + category.slice(1).toLowerCase(),
    },
  });
}

// ─── Delete ───────────────────────────────────────────────────────────────────
export async function deleteTransaction(userId: string, transactionId: string): Promise<void> {
  const tx = await db.transaction.findUnique({
    where: { id: transactionId },
    select: { account: { select: { userId: true } } },
  });

  if (!tx) {
    throw Object.assign(new Error('Transaction not found'), { statusCode: 404 });
  }
  if (tx.account.userId !== userId) {
    throw Object.assign(new Error('You do not have permission to delete this transaction'), {
      statusCode: 403,
    });
  }

  await db.transaction.delete({ where: { id: transactionId } });
}
