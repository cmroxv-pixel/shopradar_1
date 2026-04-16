import { NextRequest, NextResponse } from 'next/server';
import { parseBody, sanitiseUrl, badRequest } from '@/lib/validate';

export async function POST(req: NextRequest) {
  const scrapingBeeKey = process.env.SCRAPINGBEE_API_KEY;
  if (!scrapingBeeKey) {
    return NextResponse.json({ error: 'Missing SCRAPINGBEE_API_KEY' }, { status: 500 });
  }

  const [body, err] = await parseBody<{ url?: unknown; render_js?: unknown; premium_proxy?: unknown }>(
    req, 4_000,
  );
  if (err) return err;

  // ── Validate ─────────────────────────────────────────────────────────────
  const cleanUrl = sanitiseUrl(body.url);
  if (!cleanUrl) return badRequest('Missing or invalid url (must be http/https)');

  const renderJs     = body.render_js === true;
  const premiumProxy = body.premium_proxy === true;
  // ─────────────────────────────────────────────────────────────────────────

  try {
    const params = new URLSearchParams({
      api_key: scrapingBeeKey,
      url: cleanUrl,
      render_js: String(renderJs),
      premium_proxy: String(premiumProxy),
    });

    const res = await fetch(`https://app.scrapingbee.com/api/v1/?${params.toString()}`);

    if (!res.ok) {
      const errorText = await res.text();
      return NextResponse.json(
        { error: 'ScrapingBee error', detail: errorText },
        { status: res.status }
      );
    }

    const html = await res.text();
    return NextResponse.json({ html });
  } catch {
    return NextResponse.json({ error: 'ScrapingBee request failed' }, { status: 500 });
  }
}
