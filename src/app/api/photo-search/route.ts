import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { imageBase64, mimeType } = await req.json();

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) return NextResponse.json({ error: 'No AI key configured' }, { status: 500 });

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                inline_data: {
                  mime_type: mimeType || 'image/jpeg',
                  data: imageBase64,
                },
              },
              {
                text: `You are a product identification AI for ShopRadar, a price comparison tool.
Look at this image and identify the specific product shown.
Respond ONLY with a JSON object:
{
  "query": "<the best search query to find this product for price comparison, e.g. 'Sony WH-1000XM5 headphones' or 'iPhone 15 Pro 256GB'>",
  "confidence": "<high | medium | low>",
  "description": "<one sentence describing what you see>"
}
Be as specific as possible with model numbers, colors, sizes if visible. If you cannot identify a product, set confidence to "low" and query to a general description.`,
              },
            ],
          }],
          generationConfig: { maxOutputTokens: 200, temperature: 0.1 },
        }),
      }
    );

    if (!res.ok) return NextResponse.json({ error: 'AI failed' }, { status: 500 });

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const clean = text.replace(/```json|```/g, '').trim();
    const result = JSON.parse(clean);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
