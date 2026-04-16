import { NextRequest, NextResponse } from 'next/server';
import {
  parseBody, sanitiseString, sanitiseNumber, badRequest, LIMITS,
} from '@/lib/validate';

export async function POST(req: NextRequest) {
  const [body, err] = await parseBody(req, 32_000);
  if (err) return err;

  const { query, price, priceHistory, marketplace, rating, reviews, shippingTier } = body as any;

  // ── Validate ─────────────────────────────────────────────────────────────
  const cleanQuery = sanitiseString(query, LIMITS.SEARCH_QUERY_MAX);
  if (!cleanQuery) return badRequest('Invalid query');

  const cleanPrice = sanitiseNumber(price, 0.01, LIMITS.PRICE_MAX, -1);
  if (cleanPrice < 0) return badRequest('Invalid price');

  const cleanMarketplace = sanitiseString(marketplace, LIMITS.MARKETPLACE_MAX) ?? 'Unknown';
  const cleanRating   = sanitiseNumber(rating, 0, 5, 0);
  const cleanReviews  = sanitiseNumber(reviews, 0, 10_000_000, 0);
  const allowedTiers  = ['Express', 'Standard', 'Economy'];
  const cleanTier     = allowedTiers.includes(shippingTier) ? shippingTier : 'Standard';

  // Validate priceHistory array
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
  if (!geminiKey) return NextResponse.json({ dealScore: null, prediction: null });

  try {
    const historyText = cleanHistory.length > 0
      ? cleanHistory.map(p => `${p.date}: A$${p.price}`).join(', ')
      : 'No history';

    const avgHistory = cleanHistory.length > 0
      ? cleanHistory.reduce((s, p) => s + p.price, 0) / cleanHistory.length
      : cleanPrice;

    const prompt = `You are a shopping analytics AI for ShopRadar, an Australian price comparison tool.

Product: "${cleanQuery}"
Current price: A$${cleanPrice}
Average historical price: A$${avgHistory.toFixed(2)}
Price history: ${historyText}
Marketplace: ${cleanMarketplace}
Seller rating: ${cleanRating}/5
Reviews: ${cleanReviews}
Shipping: ${cleanTier}

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
