import { NextRequest, NextResponse } from 'next/server';

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

    // 404, 410, 5xx — treat as unavailable
    if (response.status === 404 || response.status === 410) {
      return { url, available: false };
    }
    if (response.status >= 500) {
      // Server error — give benefit of the doubt, keep listing
      return { url, available: true };
    }
    if (!response.ok) {
      // Other non-OK (403, 429 etc.) — can't verify, keep listing
      return { url, available: true };
    }

    // Read first 50KB of HTML to check for out-of-stock signals
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

    // Check for out-of-stock patterns in the HTML
    for (const pattern of OUT_OF_STOCK_PATTERNS) {
      if (pattern.test(html)) {
        return { url, available: false };
      }
    }

    return { url, available: true };
  } catch {
    // Network error / timeout — keep listing (can't verify)
    return { url, available: true };
  }
}

export async function POST(req: NextRequest) {
  try {
    const { urls } = await req.json();

    if (!Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json({ results: [] });
    }

    // Verify up to 30 URLs in parallel
    const batch = urls.slice(0, 30);
    const results = await Promise.all(batch.map(verifyUrl));

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
