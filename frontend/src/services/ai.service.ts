import { api } from '@/lib/api';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export async function sendChatMessage(message: string): Promise<string> {
  const res = await api.post<{ success: boolean; data: { reply: string } }>('/ai/chat', {
    message,
  });
  return res.data.data.reply;
}
