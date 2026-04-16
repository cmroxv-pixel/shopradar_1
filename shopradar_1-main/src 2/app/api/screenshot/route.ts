import { NextRequest, NextResponse } from 'next/server';
import { parseBody, sanitiseUrl, badRequest } from '@/lib/validate';

export async function POST(req: NextRequest) {
  const [body, err] = await parseBody(req, 4_000);
  if (err) return err;

  // ── Validate ─────────────────────────────────────────────────────────────
  const cleanUrl = sanitiseUrl((body as any).url);
  if (!cleanUrl) return badRequest('Missing or invalid URL (must be http/https)');
  // ─────────────────────────────────────────────────────────────────────────

  const apiKey = process.env.SCREENSHOTONE_API_KEY;
  if (!apiKey) {
    const fallbackUrl = `https://api.screenshotmachine.com?key=demo&url=${encodeURIComponent(cleanUrl)}&dimension=1024x768&format=png&cacheLimit=0`;
    return NextResponse.json({ screenshotUrl: fallbackUrl });
  }

  try {
    const params = new URLSearchParams({
      access_key: apiKey,
      url: cleanUrl,
      full_page: 'false',
      viewport_width: '1280',
      viewport_height: '800',
      format: 'jpg',
      image_quality: '80',
      block_ads: 'true',
      block_cookie_banners: 'true',
      block_trackers: 'true',
      delay: '1',
    });

    const screenshotUrl = `https://api.screenshotone.com/take?${params}`;
    return NextResponse.json({ screenshotUrl });
  } catch {
    return NextResponse.json({ error: 'Screenshot failed' }, { status: 500 });
  }
}
