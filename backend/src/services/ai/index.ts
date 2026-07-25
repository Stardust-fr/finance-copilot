import { AIService } from './AIService';
import { GeminiAIService } from './GeminiAIService';
import { MockAIService } from './MockAIService';

/**
 * Returns the active AI service based on AI_PROVIDER env var.
 *
 *   AI_PROVIDER=mock    → MockAIService   (default, no API key needed)
 *   AI_PROVIDER=gemini  → GeminiAIService (requires GEMINI_API_KEY)
 *
 * GeminiAIService falls back to MockAIService automatically on:
 *   - Rate limit errors (429 / RESOURCE_EXHAUSTED)
 *   - Any other API error
 *   - Invalid / unexpected response from Gemini
 */
export function getAIService(): AIService {
  const provider = (process.env.AI_PROVIDER ?? 'mock').toLowerCase();

  if (provider === 'gemini') {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn(
        '[ai] AI_PROVIDER=gemini but GEMINI_API_KEY is not set — falling back to mock.',
      );
      return new MockAIService();
    }
    return new GeminiAIService(apiKey);
  }

  return new MockAIService();
}

export type { AIService } from './AIService';
export type { AiCategoryValue, CategorizationResult, TransactionContext, ChatMessage } from './AIService';
