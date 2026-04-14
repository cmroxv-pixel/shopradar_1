import { NextRequest, NextResponse } from 'next/server';

/**
 * ScrapingBee proxy route
 * POST /api/scrapingbee
 * Body: { url: string, render_js?: boolean, premium_proxy?: boolean }
 */
export async function POST(req: NextRequest) {
  const scrapingBeeKey = process.env.SCRAPINGBEE_API_KEY;
  if (!scrapingBeeKey) {
    return NextResponse.json({ error: 'Missing SCRAPINGBEE_API_KEY' }, { status: 500 });
  }

  let body: { url?: string; render_js?: boolean; premium_proxy?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { url, render_js = false, premium_proxy = false } = body;
  if (!url) {
    return NextResponse.json({ error: 'Missing url in request body' }, { status: 400 });
  }

  try {
    const params = new URLSearchParams({
      api_key: scrapingBeeKey,
      url,
      render_js: String(render_js),
      premium_proxy: String(premium_proxy),
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
  } catch (err) {
    return NextResponse.json({ error: 'ScrapingBee request failed', detail: String(err) }, { status: 500 });
  }
}
