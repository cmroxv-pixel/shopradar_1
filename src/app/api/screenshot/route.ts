import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { url } = await req.json();

  if (!url) return NextResponse.json({ error: 'Missing URL' }, { status: 400 });

  const apiKey = process.env.SCREENSHOTONE_API_KEY;
  if (!apiKey) {
    // Fallback: use a free screenshot service
    const fallbackUrl = `https://api.screenshotmachine.com?key=demo&url=${encodeURIComponent(url)}&dimension=1024x768&format=png&cacheLimit=0`;
    return NextResponse.json({ screenshotUrl: fallbackUrl });
  }

  try {
    const params = new URLSearchParams({
      access_key: apiKey,
      url,
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
