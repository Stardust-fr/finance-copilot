'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { AppLayout } from '@/components/layout/app-layout';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ChatMessage, sendChatMessage } from '@/services/ai.service';

// ─── Suggested starter questions ─────────────────────────────────────────────
const SUGGESTED_QUESTIONS = [
  'Where did I spend the most this month?',
  'How much did I save?',
  'Which subscriptions can I cancel?',
  'Give me budgeting advice.',
  'How much did I earn?',
];

// Characters revealed per tick — higher = faster stream
const STREAM_CHARS_PER_TICK = 3;
const STREAM_INTERVAL_MS = 18;

// ─── Render message content with basic bold markdown ─────────────────────────
function RenderContent({
  content,
  isStreaming,
}: {
  content: string;
  isStreaming?: boolean;
}) {
  return (
    <>
      {content.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
        part.startsWith('**') && part.endsWith('**') ? (
          <strong key={i} className="text-white">
            {part.slice(2, -2)}
          </strong>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
      {/* Blinking cursor while streaming */}
      {isStreaming && (
        <span className="ml-0.5 inline-block h-3.5 w-0.5 animate-pulse bg-indigo-400 align-middle" />
      )}
    </>
  );
}

// ─── Message bubble ───────────────────────────────────────────────────────────
function MessageBubble({
  message,
}: {
  message: ChatMessage & { isStreaming?: boolean };
}) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex w-full gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}>
      {/* Avatar */}
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold',
          isUser ? 'bg-emerald-500 text-white' : 'bg-indigo-500 text-white',
        )}
      >
        {isUser ? 'You' : 'AI'}
      </div>

      {/* Bubble */}
      <div
        className={cn(
          'max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
          isUser
            ? 'rounded-tr-sm bg-emerald-500/10 text-slate-200'
            : 'rounded-tl-sm bg-slate-700 text-slate-200',
        )}
      >
        <RenderContent content={message.content} isStreaming={message.isStreaming} />
        {!message.isStreaming && (
          <p className="mt-1 text-right text-xs text-slate-500">
            {message.timestamp.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Typing / thinking indicator shown while waiting for the API ──────────────
function ThinkingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-xs font-bold text-white">
        AI
      </div>
      <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm bg-slate-700 px-4 py-3">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-2 w-2 animate-bounce rounded-full bg-slate-400"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Extended message type with streaming flag ────────────────────────────────
type StreamMessage = ChatMessage & { isStreaming?: boolean };

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AiChatPage() {
  const [messages, setMessages] = useState<StreamMessage[]>([]);
  const [input, setInput] = useState('');
  // isThinking = waiting for API; isStreaming = typewriter in progress
  const [isThinking, setIsThinking] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const streamIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isLoading = isThinking || isStreaming;

  // Auto-scroll on every render tick during streaming
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (streamIntervalRef.current) clearInterval(streamIntervalRef.current);
    };
  }, []);

  // Typewriter: reveal `fullText` character-by-character into the last message
  const startTypewriter = useCallback((messageId: string, fullText: string) => {
    let revealed = 0;
    setIsStreaming(true);

    streamIntervalRef.current = setInterval(() => {
      revealed = Math.min(revealed + STREAM_CHARS_PER_TICK, fullText.length);
      const isDone = revealed >= fullText.length;

      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, content: fullText.slice(0, revealed), isStreaming: !isDone }
            : m,
        ),
      );

      if (isDone) {
        clearInterval(streamIntervalRef.current!);
        streamIntervalRef.current = null;
        setIsStreaming(false);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    }, STREAM_INTERVAL_MS);
  }, []);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    setError('');
    setInput('');

    const userMsg: StreamMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsThinking(true);

    try {
      const reply = await sendChatMessage(trimmed);
      setIsThinking(false);

      // Add AI message with empty content — typewriter will fill it
      const assistantId = crypto.randomUUID();
      const assistantMsg: StreamMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isStreaming: true,
      };
      setMessages((prev) => [...prev, assistantMsg]);

      // Small delay so the empty bubble renders before we start typing
      setTimeout(() => startTypewriter(assistantId, reply), 60);
    } catch {
      setIsThinking(false);
      setError('Something went wrong. Please try again.');
      setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const clearChat = () => {
    if (streamIntervalRef.current) {
      clearInterval(streamIntervalRef.current);
      streamIntervalRef.current = null;
    }
    setMessages([]);
    setError('');
    setIsThinking(false);
    setIsStreaming(false);
  };

  const isEmpty = messages.length === 0;

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-8rem)] flex-col">
        {/* ── Header ──────────────────────────────────────────────── */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">AI Chat</h1>
            <p className="mt-0.5 text-sm text-slate-400">
              Ask anything about your finances — answers are grounded in your transaction data.
            </p>
          </div>
          {messages.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearChat}>
              Clear chat
            </Button>
          )}
        </div>

        {/* ── Message area ────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto rounded-xl border border-slate-700 bg-slate-800">
          {isEmpty ? (
            <div className="flex h-full flex-col items-center justify-center gap-6 px-6 py-10">
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-500/10">
                  <svg
                    className="h-7 w-7 text-indigo-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.8}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                    />
                  </svg>
                </div>
                <p className="text-sm font-medium text-slate-300">Your AI financial advisor</p>
                <p className="mt-1 text-xs text-slate-500">
                  Answers are based on your imported transaction data.
                </p>
              </div>

              <div className="grid w-full max-w-lg grid-cols-1 gap-2 sm:grid-cols-2">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="rounded-xl border border-slate-700 bg-slate-700/50 px-4 py-2.5 text-left text-xs text-slate-300 transition-colors hover:border-indigo-500/50 hover:bg-indigo-500/5 hover:text-white"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4 p-4">
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
              {/* Bouncing dots only while waiting for API — disappears once streaming starts */}
              {isThinking && <ThinkingIndicator />}
              {error && <p className="text-center text-xs text-red-400">{error}</p>}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* ── Input bar ────────────────────────────────────────────── */}
        <div className="mt-3 flex items-end gap-3">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your finances… (Enter to send, Shift+Enter for new line)"
            rows={1}
            disabled={isLoading}
            className={cn(
              'flex-1 resize-none rounded-xl border border-slate-600 bg-slate-800 px-4 py-3 text-sm text-white placeholder:text-slate-500',
              'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'max-h-32 transition-colors',
            )}
            style={{ overflowY: input.split('\n').length > 3 ? 'auto' : 'hidden' }}
          />
          <Button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading}
            isLoading={isThinking}
            className="shrink-0 bg-indigo-500 hover:bg-indigo-600"
            size="lg"
          >
            {!isThinking && (
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            )}
            Send
          </Button>
        </div>
        <p className="mt-1.5 text-center text-xs text-slate-600">
          AI responses use your transaction data only. Switch to Gemini in Task 16 for smarter answers.
        </p>
      </div>
    </AppLayout>
  );
}
