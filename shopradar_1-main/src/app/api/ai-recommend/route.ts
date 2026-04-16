import { NextRequest, NextResponse } from 'next/server';
import { PostHog } from 'posthog-node';
import {
  parseBody, sanitiseString, sanitiseNumber, isValidUUID, badRequest, LIMITS,
} from '@/lib/validate';

const posthogClient = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY || '', {
  host: 'https://us.i.posthog.com',
  flushAt: 1,
  flushInterval: 0,
});

export async function POST(req: NextRequest) {
  const [body, err] = await parseBody(req, 32_000);
  if (err) return err;

  const { query, currentPrice, priceHistory, marketplace, userId } = body as any;

  // ── Validate ─────────────────────────────────────────────────────────────
  const cleanQuery = sanitiseString(query, LIMITS.SEARCH_QUERY_MAX);
  if (!cleanQuery) return badRequest('Invalid query');

  const cleanPrice = sanitiseNumber(currentPrice, 0.01, LIMITS.PRICE_MAX, -1);
  if (cleanPrice < 0) return badRequest('Invalid currentPrice');

  const cleanMarketplace = sanitiseString(marketplace, LIMITS.MARKETPLACE_MAX) ?? 'Unknown';

  // userId is optional (analytics only) — must be UUID if provided
  const cleanUserId = isValidUUID(userId) ? userId : 'anonymous';

  const cleanHistory: { date: string; price: number }[] = [];
  if (Array.isArray(priceHistory)) {
    for (const p of priceHistory.slice(0, LIMITS.PRICE_HISTORY_MAX)) {
      const hp = sanitiseNumber(p?.price, 0.01, LIMITS.PRICE_MAX, 0);
      const hd = sanitiseString(p?.date, 20) ?? '';
      if (hp > 0 && hd) cleanHistory.push({ date: hd, price: hp });
    }
  }
  // ─────────────────────────────────────────────────────────────────────────

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) return NextResponse.json({ recommendation: null }, { status: 200 });

  const startTime = Date.now();

  try {
    const historyText = cleanHistory.length > 0
      ? cleanHistory.map(p => `${p.date}: A$${p.price}`).join(', ')
      : 'No history available yet';

    const prompt = `You are a price analysis assistant for ShopRadar, an Australian price comparison app.

Product: "${cleanQuery}"
Current best price: A$${cleanPrice}
Price history (last 30 days): ${historyText}
Main marketplace: ${cleanMarketplace}

Analyze this price data and give a SHORT (max 2 sentences) recommendation on whether to buy now or wait. Be specific about the trend. Format as JSON: {"verdict": "Buy Now" | "Wait" | "Good Deal", "reason": "your reason here", "confidence": "high" | "medium" | "low"}

Only respond with the JSON object, nothing else.`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 150, temperature: 0.3 },
        }),
      }
    );

    if (!res.ok) return NextResponse.json({ recommendation: null });

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const clean = text.replace(/```json|```/g, '').trim();
    const recommendation = JSON.parse(clean);
    const latencyMs = Date.now() - startTime;

    posthogClient.capture({
      distinctId: cleanUserId,
      event: 'ai_analysis_completed',
      properties: {
        query: cleanQuery, marketplace: cleanMarketplace,
        current_price: cleanPrice,
        verdict: recommendation.verdict,
        confidence: recommendation.confidence,
        has_price_history: cleanHistory.length > 0,
        history_points: cleanHistory.length,
        latency_ms: latencyMs,
        model: 'gemini-1.5-flash',
        timestamp: new Date().toISOString(),
      },
    });
    await posthogClient.flushAsync();

    return NextResponse.json({ recommendation });
  } catch {
    return NextResponse.json({ recommendation: null });
  }
}
