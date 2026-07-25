import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import bcryptjs from 'bcryptjs';
import { Pool } from 'pg';

import { AiCategory, PrismaClient, TransactionType } from '../src/generated/prisma/client';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding database...');

  // ─── Clean existing seed data ─────────────────────────────────────────────
  await prisma.report.deleteMany();
  await prisma.budget.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany({ where: { email: 'demo@financecopilot.dev' } });

  // ─── User ─────────────────────────────────────────────────────────────────
  const passwordHash = await bcryptjs.hash('Demo1234!', 10);

  const user = await prisma.user.create({
    data: {
      name: 'Demo User',
      email: 'demo@financecopilot.dev',
      passwordHash,
    },
  });
  console.log(`✅ Created user: ${user.email}`);

  // ─── Account ──────────────────────────────────────────────────────────────
  const account = await prisma.account.create({
    data: {
      userId: user.id,
      bankName: 'Chase Bank',
      accountName: 'Checking ••4821',
    },
  });
  console.log(`✅ Created account: ${account.accountName}`);

  // ─── Transactions (last 60 days, realistic mix) ───────────────────────────
  const now = new Date();
  const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000);

  const transactions: Array<{
    merchant: string;
    amount: number;
    type: TransactionType;
    aiCategory: AiCategory;
    date: Date;
    description?: string;
  }> = [
    // Income
    { merchant: 'Employer Inc.', amount: 3500, type: 'INCOME', aiCategory: 'INCOME', date: daysAgo(1), description: 'Monthly salary' },
    { merchant: 'Freelance Client', amount: 850, type: 'INCOME', aiCategory: 'INCOME', date: daysAgo(15), description: 'Freelance project payment' },

    // Food
    { merchant: 'Starbucks', amount: 6.75, type: 'EXPENSE', aiCategory: 'FOOD', date: daysAgo(1) },
    { merchant: 'Chipotle', amount: 13.50, type: 'EXPENSE', aiCategory: 'FOOD', date: daysAgo(2) },
    { merchant: 'Whole Foods', amount: 87.32, type: 'EXPENSE', aiCategory: 'FOOD', date: daysAgo(4) },
    { merchant: 'Dominos Pizza', amount: 24.99, type: 'EXPENSE', aiCategory: 'FOOD', date: daysAgo(6) },
    { merchant: 'Starbucks', amount: 5.45, type: 'EXPENSE', aiCategory: 'FOOD', date: daysAgo(8) },
    { merchant: 'McDonalds', amount: 9.30, type: 'EXPENSE', aiCategory: 'FOOD', date: daysAgo(10) },
    { merchant: 'Trader Joes', amount: 62.18, type: 'EXPENSE', aiCategory: 'FOOD', date: daysAgo(14) },
    { merchant: 'Uber Eats', amount: 31.50, type: 'EXPENSE', aiCategory: 'FOOD', date: daysAgo(18) },

    // Bills
    { merchant: 'Spotify', amount: 9.99, type: 'EXPENSE', aiCategory: 'BILLS', date: daysAgo(3), description: 'Monthly subscription' },
    { merchant: 'Netflix', amount: 15.49, type: 'EXPENSE', aiCategory: 'BILLS', date: daysAgo(3), description: 'Monthly subscription' },
    { merchant: 'Verizon', amount: 85.00, type: 'EXPENSE', aiCategory: 'BILLS', date: daysAgo(5), description: 'Phone bill' },
    { merchant: 'Con Edison', amount: 112.40, type: 'EXPENSE', aiCategory: 'BILLS', date: daysAgo(12), description: 'Electricity bill' },
    { merchant: 'Amazon Prime', amount: 14.99, type: 'EXPENSE', aiCategory: 'BILLS', date: daysAgo(20), description: 'Monthly subscription' },

    // Shopping
    { merchant: 'Amazon', amount: 43.99, type: 'EXPENSE', aiCategory: 'SHOPPING', date: daysAgo(3) },
    { merchant: 'Nike', amount: 129.95, type: 'EXPENSE', aiCategory: 'SHOPPING', date: daysAgo(9) },
    { merchant: 'Target', amount: 58.72, type: 'EXPENSE', aiCategory: 'SHOPPING', date: daysAgo(16) },
    { merchant: 'Amazon', amount: 22.50, type: 'EXPENSE', aiCategory: 'SHOPPING', date: daysAgo(22) },

    // Travel
    { merchant: 'Uber', amount: 18.40, type: 'EXPENSE', aiCategory: 'TRAVEL', date: daysAgo(2) },
    { merchant: 'Delta Airlines', amount: 320.00, type: 'EXPENSE', aiCategory: 'TRAVEL', date: daysAgo(25), description: 'Flight booking' },
    { merchant: 'Uber', amount: 14.75, type: 'EXPENSE', aiCategory: 'TRAVEL', date: daysAgo(7) },
    { merchant: 'Lyft', amount: 11.20, type: 'EXPENSE', aiCategory: 'TRAVEL', date: daysAgo(11) },

    // Entertainment
    { merchant: 'AMC Theatres', amount: 16.50, type: 'EXPENSE', aiCategory: 'ENTERTAINMENT', date: daysAgo(5) },
    { merchant: 'Steam', amount: 29.99, type: 'EXPENSE', aiCategory: 'ENTERTAINMENT', date: daysAgo(13) },
    { merchant: 'Ticketmaster', amount: 75.00, type: 'EXPENSE', aiCategory: 'ENTERTAINMENT', date: daysAgo(28) },

    // Healthcare
    { merchant: 'CVS Pharmacy', amount: 34.20, type: 'EXPENSE', aiCategory: 'HEALTHCARE', date: daysAgo(8) },
    { merchant: 'NY Presbyterian', amount: 150.00, type: 'EXPENSE', aiCategory: 'HEALTHCARE', date: daysAgo(30), description: 'Doctor visit copay' },

    // Education
    { merchant: 'Udemy', amount: 19.99, type: 'EXPENSE', aiCategory: 'EDUCATION', date: daysAgo(17), description: 'Online course' },
    { merchant: 'Coursera', amount: 49.00, type: 'EXPENSE', aiCategory: 'EDUCATION', date: daysAgo(35), description: 'Monthly subscription' },
  ];

  // Build dedup hashes and insert
  const created = await prisma.transaction.createMany({
    data: transactions.map((t) => ({
      accountId: account.id,
      merchant: t.merchant,
      description: t.description ?? null,
      amount: t.amount,
      type: t.type,
      aiCategory: t.aiCategory,
      category: t.aiCategory.charAt(0) + t.aiCategory.slice(1).toLowerCase(),
      confidence: t.type === 'INCOME' ? 0.99 : 0.92,
      date: t.date,
      hash: Buffer.from(`${account.id}|${t.date.toISOString()}|${t.amount}|${t.merchant}`)
        .toString('base64')
        .slice(0, 64),
    })),
  });
  console.log(`✅ Created ${created.count} transactions`);

  // ─── Budgets ──────────────────────────────────────────────────────────────
  const budgets = [
    { category: 'FOOD', monthlyLimit: 300 },
    { category: 'SHOPPING', monthlyLimit: 200 },
    { category: 'ENTERTAINMENT', monthlyLimit: 100 },
    { category: 'TRAVEL', monthlyLimit: 250 },
    { category: 'BILLS', monthlyLimit: 400 },
  ];

  await prisma.budget.createMany({
    data: budgets.map((b) => ({ userId: user.id, ...b, monthlyLimit: b.monthlyLimit })),
  });
  console.log(`✅ Created ${budgets.length} budgets`);

  // ─── Summary ──────────────────────────────────────────────────────────────
  const txCount = await prisma.transaction.count();
  const userCount = await prisma.user.count();
  console.log(`\n📊 Database summary:`);
  console.log(`   Users:        ${userCount}`);
  console.log(`   Accounts:     1`);
  console.log(`   Transactions: ${txCount}`);
  console.log(`   Budgets:      ${budgets.length}`);
  console.log(`\n🔑 Login credentials:`);
  console.log(`   Email:    demo@financecopilot.dev`);
  console.log(`   Password: Demo1234!`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
