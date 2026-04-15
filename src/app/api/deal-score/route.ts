import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { query, price, priceHistory, marketplace, rating, reviews, shippingTier } = await req.json();

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) return NextResponse.json({ dealScore: null, prediction: null });

  try {
    const historyText = priceHistory?.length > 0
      ? priceHistory.map((p: any) => `${p.date}: A$${p.price}`).join(', ')
      : 'No history';

    const avgHistory = priceHistory?.length > 0
      ? priceHistory.reduce((s: number, p: any) => s + p.price, 0) / priceHistory.length
      : price;

    const prompt = `You are a shopping analytics AI for ShopRadar, an Australian price comparison tool.

Product: "${query}"
Current price: A$${price}
Average historical price: A$${avgHistory.toFixed(2)}
Price history: ${historyText}
Marketplace: ${marketplace}
Seller rating: ${rating}/5
Reviews: ${reviews}
Shipping: ${shippingTier}

Respond ONLY with a JSON object:
{
  "dealScore": <integer 1-10 where 10 is exceptional value>,
  "dealLabel": <"Exceptional" | "Great" | "Good" | "Fair" | "Poor">,
  "prediction": <"Price likely to drop" | "Price likely to rise" | "Price likely to stay stable">,
  "predictionConfidence": <"high" | "medium" | "low">,
  "savingsVsAvg": <percentage saved vs average, negative if more expensive, as integer>
}`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 150, temperature: 0.2 },
        }),
      }
    );

    if (!res.ok) return NextResponse.json({ dealScore: null, prediction: null });

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const clean = text.replace(/```json|```/g, '').trim();
    const result = JSON.parse(clean);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ dealScore: null, prediction: null });
  }
}
