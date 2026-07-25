import puppeteer from 'puppeteer-core';

import { getAnalytics } from './analytics.service';
import { getAIService } from './ai';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ReportData {
  month: string;           // "YYYY-MM"
  monthLabel: string;      // "July 2025"
  userName: string;
  totalIncome: number;
  totalExpenses: number;
  netSavings: number;
  savingsRate: number;
  transactionCount: number;
  topCategories: { category: string; total: number; percentage: number }[];
  topMerchants: { merchant: string; total: number }[];
  aiSummary: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(n);
}

function monthLabel(ym: string): string {
  const [y, m] = ym.split('-');
  return new Date(Number(y), Number(m) - 1, 1).toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

function getChromePath(): string {
  const paths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
  ];

  for (const p of paths) {
    try {
      require('fs').accessSync(p);
      return p;
    } catch {
      continue;
    }
  }

  throw new Error(
    'No Chrome/Edge/Chromium found. Install Chrome or set PUPPETEER_EXECUTABLE_PATH.',
  );
}

// ─── Assemble report data ─────────────────────────────────────────────────────

export async function buildReportData(
  userId: string,
  userName: string,
  month: string, // "YYYY-MM"
): Promise<ReportData> {
  const [y, m] = month.split('-').map(Number);
  const dateFrom = new Date(y, m - 1, 1);
  const dateTo = new Date(y, m, 0, 23, 59, 59);

  const analytics = await getAnalytics(userId, dateFrom, dateTo);

  // AI summary grounded in this month's data
  const aiService = getAIService();
  const context = JSON.stringify({
    month,
    totalIncome: analytics.summary.totalIncome,
    totalExpenses: analytics.summary.totalExpenses,
    netSavings: analytics.summary.netSavings,
    savingsRate: analytics.summary.savingsRate,
    transactionCount: analytics.summary.transactionCount,
    topCategories: analytics.categoryBreakdown.slice(0, 5),
    topMerchants: analytics.topMerchants,
  });

  let aiSummary = '';
  try {
    aiSummary = await aiService.chat(
      `Provide a concise 2-3 sentence financial summary for ${monthLabel(month)}.`,
      context,
    );
  } catch {
    aiSummary = `Your financial summary for ${monthLabel(month)}: income ${fmt(analytics.summary.totalIncome)}, expenses ${fmt(analytics.summary.totalExpenses)}, net savings ${fmt(analytics.summary.netSavings)}.`;
  }

  return {
    month,
    monthLabel: monthLabel(month),
    userName,
    totalIncome: analytics.summary.totalIncome,
    totalExpenses: analytics.summary.totalExpenses,
    netSavings: analytics.summary.netSavings,
    savingsRate: analytics.summary.savingsRate,
    transactionCount: analytics.summary.transactionCount,
    topCategories: analytics.categoryBreakdown.slice(0, 6),
    topMerchants: analytics.topMerchants,
    aiSummary,
  };
}

// ─── HTML template ────────────────────────────────────────────────────────────

function buildHtml(data: ReportData): string {
  const categoryRows = data.topCategories
    .map(
      (c) => `
      <tr>
        <td>${c.category}</td>
        <td>${fmt(c.total)}</td>
        <td>
          <div style="background:#334155;border-radius:4px;height:8px;width:100%">
            <div style="background:#6366f1;border-radius:4px;height:8px;width:${Math.min(c.percentage, 100)}%"></div>
          </div>
        </td>
        <td style="text-align:right">${c.percentage}%</td>
      </tr>`,
    )
    .join('');

  const merchantRows = data.topMerchants
    .map((m) => `<tr><td>${m.merchant}</td><td style="text-align:right">${fmt(m.total)}</td></tr>`)
    .join('');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
         background: #0f172a; color: #e2e8f0; padding: 40px; font-size: 13px; }
  h1 { font-size: 24px; font-weight: 700; color: #fff; }
  h2 { font-size: 14px; font-weight: 600; color: #94a3b8; text-transform: uppercase;
       letter-spacing: 0.06em; margin-bottom: 12px; margin-top: 28px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start;
            border-bottom: 1px solid #334155; padding-bottom: 20px; margin-bottom: 24px; }
  .logo { font-size: 20px; font-weight: 700; }
  .logo span { color: #10b981; }
  .meta { text-align: right; color: #64748b; font-size: 12px; line-height: 1.6; }
  .cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px; }
  .card { background: #1e293b; border: 1px solid #334155; border-radius: 10px; padding: 16px; }
  .card-label { font-size: 11px; color: #94a3b8; margin-bottom: 4px; }
  .card-value { font-size: 20px; font-weight: 700; }
  .green { color: #10b981; } .red { color: #ef4444; } .indigo { color: #818cf8; }
  table { width: 100%; border-collapse: collapse; }
  td, th { padding: 8px 10px; border-bottom: 1px solid #1e293b; }
  th { color: #94a3b8; font-weight: 600; font-size: 11px; text-transform: uppercase; text-align: left; }
  .ai-box { background: #1e293b; border: 1px solid #334155; border-radius: 10px;
             padding: 16px; line-height: 1.7; color: #cbd5e1; margin-top: 8px; }
  .footer { border-top: 1px solid #334155; margin-top: 32px; padding-top: 12px;
             text-align: center; font-size: 11px; color: #475569; }
</style>
</head>
<body>

<div class="header">
  <div>
    <div class="logo">Finance <span>Copilot</span></div>
    <h1 style="margin-top:6px">${data.monthLabel} Report</h1>
  </div>
  <div class="meta">
    <div>${data.userName}</div>
    <div>Generated ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
    <div>${data.transactionCount} transactions</div>
  </div>
</div>

<div class="cards">
  <div class="card">
    <div class="card-label">Total Income</div>
    <div class="card-value green">${fmt(data.totalIncome)}</div>
  </div>
  <div class="card">
    <div class="card-label">Total Expenses</div>
    <div class="card-value red">${fmt(data.totalExpenses)}</div>
  </div>
  <div class="card">
    <div class="card-label">Net Savings (${data.savingsRate}%)</div>
    <div class="card-value indigo">${fmt(data.netSavings)}</div>
  </div>
</div>

${data.topCategories.length > 0 ? `
<h2>Spending by Category</h2>
<table>
  <thead><tr><th>Category</th><th>Amount</th><th style="width:40%">Progress</th><th>%</th></tr></thead>
  <tbody>${categoryRows}</tbody>
</table>
` : ''}

${data.topMerchants.length > 0 ? `
<h2>Top Merchants</h2>
<table>
  <thead><tr><th>Merchant</th><th style="text-align:right">Total Spent</th></tr></thead>
  <tbody>${merchantRows}</tbody>
</table>
` : ''}

<h2>AI Financial Summary</h2>
<div class="ai-box">${data.aiSummary.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')}</div>

<div class="footer">Finance Copilot · Monthly Report · ${data.monthLabel}</div>

</body>
</html>`;
}

// ─── PDF generation ───────────────────────────────────────────────────────────

export async function generatePdf(data: ReportData): Promise<Buffer> {
  const executablePath =
    process.env.PUPPETEER_EXECUTABLE_PATH ?? getChromePath();

  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(buildHtml(data), { waitUntil: 'load' });
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
