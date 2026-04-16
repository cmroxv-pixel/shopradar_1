import { NextRequest, NextResponse } from 'next/server';
import {
  parseBody, sanitiseImageBase64, sanitiseMimeType, badRequest,
} from '@/lib/validate';

export async function POST(req: NextRequest) {
  const [body, err] = await parseBody<{ imageBase64?: unknown; mimeType?: unknown }>(
    req,
    8 * 1024 * 1024, // 8 MB max body (base64 overhead)
  );
  if (err) return err;

  // ── Validate ─────────────────────────────────────────────────────────────
  const cleanBase64 = sanitiseImageBase64(body.imageBase64);
  if (!cleanBase64) return badRequest('Missing or oversized image data (max 5 MB)');

  const cleanMimeType = sanitiseMimeType(body.mimeType);
  // ─────────────────────────────────────────────────────────────────────────

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
                  mime_type: cleanMimeType,
                  data: cleanBase64,
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
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
