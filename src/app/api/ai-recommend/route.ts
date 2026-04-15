import { NextRequest, NextResponse } from 'next/server';
import { PostHog } from 'posthog-node';

const posthogClient = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY || '', {
  host: 'https://us.i.posthog.com',
  flushAt: 1,
  flushInterval: 0,
});

export async function POST(req: NextRequest) {
  const { query, currentPrice, priceHistory, marketplace, userId } = await req.json();

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) return NextResponse.json({ recommendation: null }, { status: 200 });

  const startTime = Date.now();

  try {
    const historyText = priceHistory.length > 0
      ? priceHistory.map((p: any) => `${p.date}: A$${p.price}`).join(', ')
      : 'No history available yet';

    const prompt = `You are a price analysis assistant for ShopRadar, an Australian price comparison app.

Product: "${query}"
Current best price: A$${currentPrice}
Price history (last 30 days): ${historyText}
Main marketplace: ${marketplace}

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

    // Track in PostHog server-side
    posthogClient.capture({
      distinctId: userId || 'anonymous',
      event: 'ai_analysis_completed',
      properties: {
        query, marketplace,
        current_price: currentPrice,
        verdict: recommendation.verdict,
        confidence: recommendation.confidence,
        has_price_history: priceHistory.length > 0,
        history_points: priceHistory.length,
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
