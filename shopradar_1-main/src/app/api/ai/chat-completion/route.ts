import { NextRequest, NextResponse } from 'next/server';
import { completion } from '@rocketnew/llm-sdk';
import { parseBody, sanitiseString, badRequest, LIMITS } from '@/lib/validate';

const API_KEYS: Record<string, string | undefined> = {
  OPEN_AI:    process.env.OPENAI_API_KEY,
  ANTHROPIC:  process.env.ANTHROPIC_API_KEY,
  GEMINI:     process.env.GEMINI_API_KEY,
  PERPLEXITY: process.env.PERPLEXITY_API_KEY,
};

const ALLOWED_PROVIDERS = new Set(Object.keys(API_KEYS));

function formatErrorResponse(error: unknown, provider?: string) {
  const statusCode = (error as any)?.statusCode || (error as any)?.status || 500;
  const providerName = (error as any)?.llmProvider || provider || 'Unknown';
  return {
    error: `${providerName.toUpperCase()} API error: ${statusCode}`,
    details: error instanceof Error ? error.message : String(error),
    statusCode,
  };
}

export async function POST(request: NextRequest) {
  // 512 KB max — enough for a full multi-turn conversation
  const [body, parseErr] = await parseBody(request, 512 * 1024);
  if (parseErr) return parseErr;

  const { provider, model, messages, stream = false, parameters = {} } = body as any;

  // ── Validate ─────────────────────────────────────────────────────────────
  const cleanProvider = sanitiseString(provider, 32);
  if (!cleanProvider || !ALLOWED_PROVIDERS.has(cleanProvider))
    return badRequest('Invalid or unsupported provider');

  const cleanModel = sanitiseString(model, 128);
  if (!cleanModel) return badRequest('Missing or invalid model');

  if (!Array.isArray(messages) || messages.length === 0)
    return badRequest('messages must be a non-empty array');

  if (messages.length > LIMITS.MESSAGES_MAX)
    return badRequest(`Too many messages (max ${LIMITS.MESSAGES_MAX})`);

  // Validate each message
  for (const msg of messages) {
    if (!['user', 'assistant', 'system'].includes(msg?.role))
      return badRequest('Invalid message role');
    if (typeof msg.content !== 'string' || msg.content.length > LIMITS.MESSAGE_CONTENT_MAX)
      return badRequest(`Message content exceeds ${LIMITS.MESSAGE_CONTENT_MAX} characters`);
  }

  // parameters must be a plain object — no prototype tricks
  if (typeof parameters !== 'object' || Array.isArray(parameters))
    return badRequest('Invalid parameters');
  // ─────────────────────────────────────────────────────────────────────────

  const apiKey = API_KEYS[cleanProvider];
  if (!apiKey) {
    return NextResponse.json(
      { error: `${cleanProvider.toUpperCase()} API key is not configured` },
      { status: 400 }
    );
  }

  try {
    if (stream) {
      const response = await completion({
        model: cleanModel,
        messages,
        stream: true,
        api_key: apiKey,
        ...parameters,
      });

      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        async start(controller) {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'start' })}\n\n`));
            for await (const chunk of response as unknown as AsyncIterable<unknown>) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'chunk', chunk })}\n\n`));
            }
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
            controller.close();
          } catch (error) {
            const formatted = formatErrorResponse(error, cleanProvider);
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: formatted.error })}\n\n`));
            controller.close();
          }
        },
      });

      return new NextResponse(readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      });
    }

    const response = await completion({
      model: cleanModel,
      messages,
      stream: false,
      api_key: apiKey,
      ...parameters,
    });

    return NextResponse.json(response);
  } catch (error) {
    const formatted = formatErrorResponse(error, cleanProvider);
    return NextResponse.json(
      { error: formatted.error },
      { status: formatted.statusCode }
    );
  }
}
