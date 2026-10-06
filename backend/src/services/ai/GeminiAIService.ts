import { GoogleGenerativeAI } from '@google/generative-ai';

import { AIService, AiCategoryValue, CategorizationResult, TransactionContext } from './AIService';
import { MockAIService } from './MockAIService';

// ─── Valid category values ────────────────────────────────────────────────────
const VALID_CATEGORIES: AiCategoryValue[] = [
  'FOOD', 'TRAVEL', 'SHOPPING', 'BILLS',
  'HEALTHCARE', 'ENTERTAINMENT', 'EDUCATION', 'INCOME', 'OTHER',
];

function isValidCategory(s: string): s is AiCategoryValue {
  return VALID_CATEGORIES.includes(s.toUpperCase() as AiCategoryValue);
}

// ─── GeminiAIService ──────────────────────────────────────────────────────────

export class GeminiAIService implements AIService {
  private readonly genAI: GoogleGenerativeAI;
  private readonly fallback: MockAIService;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.fallback = new MockAIService();
  }

  // ─── Categorization ─────────────────────────────────────────────────────────
  async categorizeTransaction(tx: TransactionContext): Promise<CategorizationResult> {
    const prompt = `You are a finance assistant. Categorize this transaction into exactly one of:
FOOD, TRAVEL, SHOPPING, BILLS, HEALTHCARE, ENTERTAINMENT, EDUCATION, INCOME, OTHER.

Transaction: merchant="${tx.merchant}", amount=${tx.amount}${tx.description ? `, description="${tx.description}"` : ''}

Respond with valid JSON only, no markdown, no explanation:
{"category": "CATEGORY_NAME", "confidence": 0.95}`;

    try {
      // Use gemini-3.8-flash (latest model as of 2025)
      const model = this.genAI.getGenerativeModel({ model: 'gemini-3.8-flash' });
      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();

      // Strip markdown code fences if present
      const cleaned = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
      const parsed = JSON.parse(cleaned) as { category: string; confidence: number };

      const category = parsed.category?.toUpperCase();
      if (!isValidCategory(category)) {
        console.warn(`[gemini] Unexpected category "${category}" — falling back to mock`);
        return this.fallback.categorizeTransaction(tx);
      }

      return {
        category: category as AiCategoryValue,
        confidence: Math.min(Math.max(Number(parsed.confidence) || 0.8, 0), 1),
      };
    } catch (err) {
      // Rate limit (429) or any other API error → fall back to mock silently
      const isRateLimit =
        err instanceof Error &&
        (err.message.includes('429') || err.message.includes('quota') || err.message.includes('RESOURCE_EXHAUSTED'));

      if (isRateLimit) {
        console.warn('[gemini] Rate limit hit — falling back to mock for categorization');
      } else {
        console.error('[gemini] categorizeTransaction error:', (err as Error).message);
      }

      return this.fallback.categorizeTransaction(tx);
    }
  }

  // ─── Chat ────────────────────────────────────────────────────────────────────
  async chat(userMessage: string, context: string): Promise<string> {
    const systemPrompt = `You are an AI financial advisor. You ONLY answer questions based on the user's transaction data provided in the context below. If information is unavailable from the context, say so clearly.

Transaction context (JSON):
${context}`;

    try {
      const model = this.genAI.getGenerativeModel({
        model: 'gemini-3.8-flash',
        systemInstruction: systemPrompt,
      });

      const result = await model.generateContent(userMessage);
      const reply = result.response.text().trim();

      if (!reply) {
        return this.fallback.chat(userMessage, context);
      }

      return reply;
    } catch (err) {
      const isRateLimit =
        err instanceof Error &&
        (err.message.includes('429') || err.message.includes('quota') || err.message.includes('RESOURCE_EXHAUSTED'));

      if (isRateLimit) {
        console.warn('[gemini] Rate limit hit — falling back to mock for chat');
      } else {
        console.error('[gemini] chat error:', (err as Error).message);
      }

      return this.fallback.chat(userMessage, context);
    }
  }
}
