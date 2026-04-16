import { NextRequest, NextResponse } from 'next/server';
import { parseBody, sanitiseUrl, badRequest, LIMITS } from '@/lib/validate';

const OUT_OF_STOCK_PATTERNS = [
  /\bout\s*of\s*stock\b/i,
  /\bsold\s*out\b/i,
  /\bunavailable\b/i,
  /\bno\s*longer\s*available\b/i,
  /\bdiscontinued\b/i,
  /\bnot\s*available\b/i,
  /\bitem\s*not\s*found\b/i,
  /\bproduct\s*not\s*found\b/i,
  /\bpage\s*not\s*found\b/i,
  /\b404\b/,
  /\bthis\s*item\s*is\s*currently\s*unavailable\b/i,
  /\bcurrently\s*unavailable\b/i,
  /\bwe\s*don'?t\s*know\s*when\s*or\s*if\s*this\s*item\s*will\s*be\s*back\s*in\s*stock\b/i,
  /\btemporarily\s*out\s*of\s*stock\b/i,
  /\bsorry\b/i,
  /\boh\s*no\b/i,
  /\boops\b/i,
  /\bwe\s*looked\s*everywhere\b/i,
];

async function verifyUrl(url: string): Promise<{ url: string; available: boolean }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      redirect: 'follow',
    });

    clearTimeout(timeout);

    if (response.status === 404 || response.status === 410) return { url, available: false };
    if (response.status >= 500) return { url, available: true };
    if (!response.ok) return { url, available: true };

    const reader = response.body?.getReader();
    if (!reader) return { url, available: true };

    let html = '';
    let bytesRead = 0;
    const maxBytes = 50_000;

    while (bytesRead < maxBytes) {
      const { done, value } = await reader.read();
      if (done) break;
      html += new TextDecoder().decode(value);
      bytesRead += value.byteLength;
    }
    reader.cancel();

    for (const pattern of OUT_OF_STOCK_PATTERNS) {
      if (pattern.test(html)) return { url, available: false };
    }

    return { url, available: true };
  } catch {
    return { url, available: true };
  }
}

export async function POST(req: NextRequest) {
  const [body, err] = await parseBody(req, 64_000);
  if (err) return err;

  const { urls } = body as any;

  // ── Validate ─────────────────────────────────────────────────────────────
  if (!Array.isArray(urls)) return NextResponse.json({ results: [] });

  if (urls.length > LIMITS.URLS_VERIFY_MAX)
    return badRequest(`Too many URLs (max ${LIMITS.URLS_VERIFY_MAX})`);

  // Sanitise each URL — skip malformed or non-http(s) entries
  const cleanUrls = urls
    .map((u: unknown) => sanitiseUrl(u))
    .filter((u): u is string => u !== null);
  // ─────────────────────────────────────────────────────────────────────────

  if (cleanUrls.length === 0) return NextResponse.json({ results: [] });

  try {
    const results = await Promise.all(cleanUrls.map(verifyUrl));
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
