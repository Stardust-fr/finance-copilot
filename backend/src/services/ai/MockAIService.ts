import { AIService, AiCategoryValue, CategorizationResult, TransactionContext } from './AIService';

// ─── Merchant → category lookup table ────────────────────────────────────────
// Lowercase keyword → category. Checked against merchant.toLowerCase().
const MERCHANT_RULES: Array<{ keywords: string[]; category: AiCategoryValue; confidence: number }> = [
  { keywords: ['starbucks', 'mcdonald', 'subway', 'chipotle', 'domino', 'pizza', 'burger', 'kfc', 'taco', 'dunkin', 'panera', 'chick-fil', 'olive garden', 'applebee', 'denny', 'ihop', 'whole foods', 'trader joe', 'doordash', 'uber eat', 'grubhub', 'instacart', 'food', 'restaurant', 'cafe', 'coffee', 'bakery', 'sushi', 'ramen', 'diner', 'buffet'], category: 'FOOD', confidence: 0.95 },
  { keywords: ['uber', 'lyft', 'delta', 'united', 'american airline', 'southwest', 'jetblue', 'spirit', 'frontier', 'amtrak', 'airbnb', 'hilton', 'marriott', 'hyatt', 'hotel', 'motel', 'flight', 'airline', 'rental car', 'hertz', 'enterprise', 'avis', 'parking', 'transit', 'metro', 'bus'], category: 'TRAVEL', confidence: 0.93 },
  { keywords: ['amazon', 'walmart', 'target', 'best buy', 'ebay', 'etsy', 'nike', 'adidas', 'gap', 'h&m', 'zara', 'uniqlo', 'nordstrom', 'macys', 'kohls', 'tjmaxx', 'marshalls', 'costco', 'sam\'s club', 'ikea', 'wayfair', 'homedepot', 'lowes', 'shopify', 'apple store'], category: 'SHOPPING', confidence: 0.92 },
  { keywords: ['netflix', 'spotify', 'hulu', 'disney+', 'hbo', 'apple tv', 'youtube premium', 'amazon prime', 'verizon', 'at&t', 't-mobile', 'comcast', 'xfinity', 'con edison', 'pg&e', 'electric', 'gas company', 'water bill', 'internet', 'phone bill', 'insurance', 'rent', 'mortgage', 'subscription'], category: 'BILLS', confidence: 0.94 },
  { keywords: ['cvs', 'walgreens', 'rite aid', 'pharmacy', 'doctor', 'hospital', 'clinic', 'dentist', 'vision', 'optometrist', 'urgent care', 'medical', 'health', 'lab corp', 'quest diagnostic', 'aetna', 'cigna', 'blue cross'], category: 'HEALTHCARE', confidence: 0.93 },
  { keywords: ['amc', 'cinemark', 'regal', 'movie', 'theater', 'ticketmaster', 'stubhub', 'spotify', 'steam', 'playstation', 'xbox', 'nintendo', 'twitch', 'patreon', 'concert', 'festival', 'bowling', 'arcade', 'escape room', 'comedy', 'museum', 'zoo', 'theme park', 'golf', 'gym', 'fitness', 'planet fitness'], category: 'ENTERTAINMENT', confidence: 0.91 },
  { keywords: ['udemy', 'coursera', 'skillshare', 'linkedin learning', 'pluralsight', 'codecademy', 'duolingo', 'chegg', 'amazon kindle', 'audible', 'book', 'library', 'tutor', 'university', 'college', 'school', 'course', 'class', 'education', 'training'], category: 'EDUCATION', confidence: 0.92 },
  { keywords: ['salary', 'payroll', 'direct deposit', 'employer', 'paycheck', 'income', 'dividend', 'interest', 'refund', 'cashback', 'freelance', 'consulting', 'invoice'], category: 'INCOME', confidence: 0.97 },
];

function classifyMerchant(merchant: string): CategorizationResult {
  const lower = merchant.toLowerCase();
  for (const rule of MERCHANT_RULES) {
    if (rule.keywords.some((kw) => lower.includes(kw))) {
      return { category: rule.category, confidence: rule.confidence };
    }
  }
  return { category: 'OTHER', confidence: 0.6 };
}

// ─── Chat response templates ──────────────────────────────────────────────────
function buildChatResponse(userMessage: string, context: string): string {
  const lower = userMessage.toLowerCase();

  const spendMatch = context.match(/totalExpenses["\s:]+([0-9.]+)/);
  const incomeMatch = context.match(/totalIncome["\s:]+([0-9.]+)/);
  const savingsMatch = context.match(/netSavings["\s:]+([0-9.]+)/);
  const rateMatch = context.match(/savingsRate["\s:]+([0-9.]+)/);

  const spend = spendMatch ? parseFloat(spendMatch[1]) : null;
  const income = incomeMatch ? parseFloat(incomeMatch[1]) : null;
  const savings = savingsMatch ? parseFloat(savingsMatch[1]) : null;
  const rate = rateMatch ? parseFloat(rateMatch[1]) : null;

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

  if (lower.includes('spend') || lower.includes('spent') || lower.includes('most')) {
    if (spend !== null) {
      return `Based on your transaction data, your total expenses are **${fmt(spend)}**. I can see breakdowns by category in your analytics — Shopping, Food, and Bills tend to be the largest buckets for most users. Check your Analytics page for a full category breakdown.`;
    }
  }

  if (lower.includes('save') || lower.includes('saving') || lower.includes('savings')) {
    if (savings !== null && income !== null) {
      return `Your net savings are **${fmt(savings)}**, which is a **${rate ?? '?'}% savings rate** on income of ${fmt(income)}. ${(rate ?? 0) >= 20 ? "That's a healthy savings rate — great work!" : (rate ?? 0) > 0 ? "There's room to improve. Try reviewing your Bills and Subscriptions for services you no longer use." : "Your expenses are exceeding your income. Review your largest spending categories immediately."}`;
    }
  }

  if (lower.includes('subscription') || lower.includes('cancel') || lower.includes('recurring')) {
    return `To identify subscriptions you might cancel, look at your Bills category on the Analytics page. Common candidates include streaming services (Netflix, Hulu, Disney+), software subscriptions, and gym memberships. If a service hasn't been used actively in the past 30 days, it's worth cancelling.`;
  }

  if (lower.includes('budget') || lower.includes('advice') || lower.includes('tip')) {
    if (spend !== null && income !== null) {
      const ratio = income > 0 ? (spend / income) * 100 : 0;
      return `Based on your data, you're spending **${ratio.toFixed(0)}%** of your income. The 50/30/20 rule suggests: 50% on needs (bills, food), 30% on wants (shopping, entertainment), and 20% on savings. ${ratio > 80 ? 'Your spending ratio is high — focus on reducing discretionary expenses.' : ratio > 60 ? 'You have some room to increase savings. Target your largest spending categories first.' : 'Your spending ratio looks healthy. Consider investing the surplus.'}`;
    }
  }

  if (lower.includes('income') || lower.includes('earn') || lower.includes('salary')) {
    if (income !== null) {
      return `Your recorded income is **${fmt(income)}**. If this doesn't match your expected income, make sure all income transactions are properly categorised as INCOME in your transaction list.`;
    }
  }

  // Fallback
  if (income === null && spend === null) {
    return `I don't see any transaction data yet. Please upload a CSV bank statement first, then I'll be able to answer questions about your spending, savings, and financial habits.`;
  }

  return `Based on your transaction data (income: ${income !== null ? fmt(income) : 'N/A'}, expenses: ${spend !== null ? fmt(spend) : 'N/A'}): I can help you analyse spending patterns, savings rates, budget advice, and subscription audits. Try asking something like "Where did I spend the most?" or "How much did I save this month?"`;
}

// ─── Mock implementation ──────────────────────────────────────────────────────

export class MockAIService implements AIService {
  async categorizeTransaction(tx: TransactionContext): Promise<CategorizationResult> {
    // Simulate a small async delay to behave like a real API call
    await new Promise((resolve) => setTimeout(resolve, 10));
    return classifyMerchant(tx.merchant);
  }

  async chat(userMessage: string, context: string): Promise<string> {
    await new Promise((resolve) => setTimeout(resolve, 20));
    return buildChatResponse(userMessage, context);
  }
}
