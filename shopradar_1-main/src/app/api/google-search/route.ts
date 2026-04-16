import { NextRequest, NextResponse } from 'next/server';
import { sanitiseString, badRequest, LIMITS } from '@/lib/validate';

function extractPrice(snippet: string, title: string): number {
  const text = `${title} ${snippet}`;
  const patterns = [
    /\$\s*(\d{1,6}(?:[,]\d{3})*(?:\.\d{2})?)/,
    /AUD\s*(\d{1,6}(?:[,]\d{3})*(?:\.\d{2})?)/i,
    /USD\s*(\d{1,6}(?:[,]\d{3})*(?:\.\d{2})?)/i,
    /GBP\s*(\d{1,6}(?:[,]\d{3})*(?:\.\d{2})?)/i,
    /EUR\s*(\d{1,6}(?:[,]\d{3})*(?:\.\d{2})?)/i,
    /(\d{1,6}(?:[,]\d{3})*(?:\.\d{2})?)\s*(?:AUD|USD|GBP|EUR)/i,
    /(?:price|was|now|only|just)\s*:?\s*\$?\s*(\d{1,6}(?:[,]\d{3})*(?:\.\d{2})?)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const price = parseFloat(match[1].replace(/,/g, ''));
      if (price > 0 && price < 100000) return price;
    }
  }
  return 0;
}

function getMarketplaceName(url: string): string {
  try {
    const domain = new URL(url).hostname.replace('www.', '');
    const map: Record<string, string> = {
      'ebay.com.au': 'eBay Australia', 'ebay.com': 'eBay', 'ebay.co.uk': 'eBay UK',
      'ebay.de': 'eBay Germany', 'amazon.com.au': 'Amazon Australia', 'amazon.com': 'Amazon',
      'amazon.co.uk': 'Amazon UK', 'amazon.de': 'Amazon Germany', 'amazon.co.jp': 'Amazon Japan',
      'cashconverters.com.au': 'Cash Converters', 'jbhifi.com.au': 'JB Hi-Fi',
      'harveynorman.com.au': 'Harvey Norman', 'kogan.com': 'Kogan', 'catch.com.au': 'Catch',
      'bigw.com.au': 'Big W', 'gumtree.com.au': 'Gumtree', 'etsy.com': 'Etsy',
      'walmart.com': 'Walmart', 'aliexpress.com': 'AliExpress', 'depop.com': 'Depop',
      'target.com.au': 'Target Australia', 'officeworks.com.au': 'Officeworks',
      'myer.com.au': 'Myer', 'davidjones.com': 'David Jones',
      'thegoodguys.com.au': 'The Good Guys', 'binglee.com.au': 'Bing Lee',
    };
    return map[domain] || domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1);
  } catch {
    return 'Unknown';
  }
}

function scoreResult(url: string, title: string, snippet: string, price: number): number {
  let score = 0;
  const path = (() => { try { return new URL(url).pathname.toLowerCase(); } catch { return ''; } })();
  const fullUrl = url.toLowerCase();
  const text = `${title} ${snippet}`.toLowerCase();

  if (/\/itm\/\d+/.test(fullUrl)) score += 100;
  if (/\/dp\/[A-Z0-9]{10}/.test(fullUrl)) score += 100;
  if (/\/ip\//.test(fullUrl)) score += 80;
  if (/\/product\//.test(fullUrl)) score += 70;
  if (/\/p\/[a-z0-9-]+$/.test(fullUrl)) score += 70;
  if (/\/shop\/.+\/.+\/.+/.test(fullUrl)) score += 70;
  if (/\/listing\/\d+/.test(fullUrl)) score += 70;
  if (/\d{8,}/.test(path)) score += 60;
  if (/\/buy\//.test(fullUrl)) score += 60;
  if (/\/item\//.test(fullUrl)) score += 60;
  if (price > 0) score += 80;
  if (text.includes('add to cart')) score += 30;
  if (text.includes('buy now')) score += 30;
  if (text.includes('in stock')) score += 20;
  if (text.includes('free shipping') || text.includes('free delivery')) score += 15;
  if (text.includes('condition:')) score += 20;
  if (/\/search[?/]/.test(fullUrl)) score -= 200;
  if (/\/s\?/.test(fullUrl)) score -= 200;
  if (/\/sch\//.test(fullUrl)) score -= 200;
  if (/\/category/.test(fullUrl)) score -= 150;
  if (/\/browse/.test(fullUrl)) score -= 150;
  if (/\/catalog/.test(fullUrl)) score -= 150;
  if (/\/results/.test(fullUrl)) score -= 200;
  if (/\/collection/.test(fullUrl)) score -= 100;
  if (/\/shop\/?$/.test(fullUrl)) score -= 100;
  if (/\/store\/?$/.test(fullUrl)) score -= 100;
  if (path === '/' || path === '') score -= 500;

  return score;
}

function isValidProductPage(url: string, score: number): boolean {
  if (score <= 0) return false;
  try {
    const path = new URL(url).pathname;
    if (path === '/' || path === '') return false;
    return true;
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  // ── Validate ─────────────────────────────────────────────────────────────
  const query = sanitiseString(searchParams.get('q'), LIMITS.SEARCH_QUERY_MAX);
  if (!query) return badRequest('Missing or invalid query');
  // ─────────────────────────────────────────────────────────────────────────

  const apiKey  = process.env.GOOGLE_SEARCH_API_KEY;
  const engineId = process.env.GOOGLE_SEARCH_ENGINE_ID;

  if (!apiKey)    return NextResponse.json({ error: 'Missing GOOGLE_SEARCH_API_KEY' }, { status: 500 });
  if (!engineId)  return NextResponse.json({ error: 'Missing GOOGLE_SEARCH_ENGINE_ID' }, { status: 500 });

  try {
    const searchQueries = [
      `"${query}" buy`,
      `"${query}" price`,
      `"${query}" for sale`,
      `"${query}" shop`,
      `"${query}" listing`,
    ];

    const allResults = await Promise.all(
      searchQueries.map(async (q) => {
        const params = new URLSearchParams({ key: apiKey, cx: engineId, q, num: '10', safe: 'active' });
        const res = await fetch(`https://www.googleapis.com/customsearch/v1?${params.toString()}`);
        if (!res.ok) return [];
        const data = await res.json();
        return data.items || [];
      })
    );

    const seenUrls = new Set<string>();
    const uniqueResults: any[] = [];
    for (const results of allResults) {
      for (const item of results) {
        if (!item.link || seenUrls.has(item.link)) continue;
        seenUrls.add(item.link);
        uniqueResults.push(item);
      }
    }

    const listings = uniqueResults
      .map((item: any, idx: number) => {
        const url = item.link || '';
        const title = item.title || query;
        const snippet = item.snippet || '';
        const marketplace = getMarketplaceName(url);
        const price = extractPrice(snippet, title);
        const score = scoreResult(url, title, snippet, price);

        return {
          id: `gsearch-${idx}-${Math.random().toString(36).slice(2, 7)}`,
          title, productName: title, model: '', color: '',
          price, originalPrice: price, currency: 'AUD',
          marketplace, marketplaceLogo: '🛒',
          listingUrl: url,
          condition: (
            title.toLowerCase().includes('used') ||
            title.toLowerCase().includes('pre-owned') ||
            title.toLowerCase().includes('second hand') ||
            snippet.toLowerCase().includes('used') ||
            marketplace === 'Gumtree' ||
            marketplace === 'Depop'
          ) ? 'Used' : 'New',
          location: 'Worldwide', stockStatus: 'In Stock',
          sellerRating: 4.5, sellerReviews: 0,
          deliveryDays: 5, deliveryDate: '', shippingTier: 'Standard' as const,
          shippingCost: 0, freeReturns: false,
          imageUrl: item.pagemap?.cse_image?.[0]?.src || item.pagemap?.cse_thumbnail?.[0]?.src || '',
          priceHistory: [],
          deliveryOptions: [{ tier: 'Standard' as const, days: 5, cost: 0 }],
          score, snippet,
        };
      })
      .filter(l => isValidProductPage(l.listingUrl, l.score))
      .filter(l => l.price > 0)
      .sort((a, b) => b.score - a.score)
      .map(({ score, snippet, ...rest }) => rest);

    return NextResponse.json({ listings });

  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
