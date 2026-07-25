// ─── Shared types ─────────────────────────────────────────────────────────────

export type AiCategoryValue =
  | 'FOOD'
  | 'TRAVEL'
  | 'SHOPPING'
  | 'BILLS'
  | 'HEALTHCARE'
  | 'ENTERTAINMENT'
  | 'EDUCATION'
  | 'INCOME'
  | 'OTHER';

export interface CategorizationResult {
  category: AiCategoryValue;
  confidence: number; // 0.0 – 1.0
}

export interface TransactionContext {
  merchant: string;
  amount: number;
  date?: string;
  description?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// ─── Interface ────────────────────────────────────────────────────────────────

/**
 * Contract every AI provider must implement.
 * Swap MockAIService ↔ GeminiAIService by changing AI_PROVIDER env var.
 */
export interface AIService {
  /**
   * Categorises a single transaction into one of the AiCategoryValue buckets.
   */
  categorizeTransaction(tx: TransactionContext): Promise<CategorizationResult>;

  /**
   * Answers a financial question grounded in the user's transaction data.
   * @param userMessage  The user's natural-language question.
   * @param context      Pre-aggregated transaction summary to include as context.
   */
  chat(userMessage: string, context: string): Promise<string>;
}
