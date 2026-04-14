import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { query, currentPrice, priceHistory, marketplace } = await req.json();

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) return NextResponse.json({ recommendation: null }, { status: 200 });

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
    return NextResponse.json({ recommendation });
  } catch {
    return NextResponse.json({ recommendation: null });
  }
}
