import { NextRequest, NextResponse } from 'next/server';

// Fallback search-page URLs per marketplace (used only if SerpAPI gives no link at all)
const MARKETPLACE_SEARCH_URLS: Record<string, (q: string) => string> = {
  'amazon': (q) => `https://www.amazon.com.au/s?k=${q}`,
  'amazon australia': (q) => `https://www.amazon.com.au/s?k=${q}`,
  'amazon.com.au': (q) => `https://www.amazon.com.au/s?k=${q}`,
  'amazon.com': (q) => `https://www.amazon.com/s?k=${q}`,
  'amazon.co.uk': (q) => `https://www.amazon.co.uk/s?k=${q}`,
  'ebay': (q) => `https://www.ebay.com.au/sch/i.html?_nkw=${q}`,
  'ebay.com.au': (q) => `https://www.ebay.com.au/sch/i.html?_nkw=${q}`,
  'ebay.com': (q) => `https://www.ebay.com/sch/i.html?_nkw=${q}`,
  'walmart': (q) => `https://www.walmart.com/search?q=${q}`,
  'best buy': (q) => `https://www.bestbuy.com/site/searchpage.jsp?st=${q}`,
  'jb hi-fi': (q) => `https://www.jbhifi.com.au/search?q=${q}`,
  'jb hifi': (q) => `https://www.jbhifi.com.au/search?q=${q}`,
  'harvey norman': (q) => `https://www.harveynorman.com.au/search?q=${q}`,
  'officeworks': (q) => `https://www.officeworks.com.au/shop/officeworks/search?q=${q}`,
  'kogan': (q) => `https://www.kogan.com/au/shop/?q=${q}`,
  'big w': (q) => `https://www.bigw.com.au/search?q=${q}`,
  'catch': (q) => `https://www.catch.com.au/search/?q=${q}`,
  'the good guys': (q) => `https://www.thegoodguys.com.au/SearchDisplay?searchTerm=${q}`,
  'bing lee': (q) => `https://www.binglee.com.au/search?q=${q}`,
  'etsy': (q) => `https://www.etsy.com/search?q=${q}`,
  'aliexpress': (q) => `https://www.aliexpress.com/wholesale?SearchText=${q}`,
  'newegg': (q) => `https://www.newegg.com/p/pl?d=${q}`,
  'target': (q) => `https://www.target.com/s?searchTerm=${q}`,
};

function getFallbackUrl(marketplace: string, productName: string): string {
  const q = encodeURIComponent(productName);
  const m = marketplace.toLowerCase().trim();
  if (MARKETPLACE_SEARCH_URLS[m]) return MARKETPLACE_SEARCH_URLS[m](q);
  for (const [key, fn] of Object.entries(MARKETPLACE_SEARCH_URLS)) {
    if (m.includes(key) || key.includes(m)) return fn(q);
  }
  return `https://www.google.com/search?q=${encodeURIComponent(productName + ' buy ' + marketplace)}`;
}

/**
 * Extract the best direct product URL from a SerpAPI shopping result.
 *
 * SerpAPI returns several possible link fields:
 *   - item.link          — usually the Google Shopping redirect URL (/shopping/product/...)
 *   - item.product_link  — direct URL to the retailer product page (best option)
 *   - item.offers        — array with individual offer links
 *
 * Google Shopping redirect URLs look like:
 *   https://www.google.com/shopping/product/1/specs?...
 *   https://www.google.com/aclk?...
 *
 * We want to return the retailer URL, not the Google one.
 */
function extractDirectUrl(item: any): string {
  // 1. product_link is the most reliable — direct retailer URL from SerpAPI
  if (item.product_link && !isGoogleUrl(item.product_link)) {
    return item.product_link;
  }

  // 2. Check offers array for a direct link
  if (Array.isArray(item.offers)) {
    for (const offer of item.offers) {
      if (offer.link && !isGoogleUrl(offer.link)) return offer.link;
      if (offer.direct_link && !isGoogleUrl(offer.direct_link)) return offer.direct_link;
    }
  }

  // 3. item.link — if it's not a Google redirect, use it directly
  if (item.link && !isGoogleUrl(item.link)) {
    return item.link;
  }

  // 4. Nothing useful found
  return '';
}

function isGoogleUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname;
    return hostname.includes('google.com') || hostname.includes('googleapis.com') || hostname.includes('gstatic.com');
  } catch {
    return false;
  }
}

function parseDelivery(deliveryStr: string): {
  days: number;
  date: string;
  cost: number;
  tier: 'Express' | 'Standard' | 'Economy';
} {
  if (!deliveryStr) return { days: 7, date: '', cost: 0, tier: 'Standard' };
  const lower = deliveryStr.toLowerCase();
  const isFree = lower.includes('free');
  const isExpress =
    lower.includes('express') ||
    lower.includes('next day') ||
    lower.includes('same day') ||
    lower.includes('overnight');

  const dateMatch = deliveryStr.match(
    /([A-Z][a-z]{2},?\s+\d{1,2}\s+[A-Z][a-z]{2,}|\d{1,2}\s+[A-Z][a-z]{2,})/
  );
  const dateStr = dateMatch ? dateMatch[0] : '';

  let days = isExpress ? 2 : 7;
  if (dateStr) {
    try {
      const now = new Date();
      const parsed = new Date(`${dateStr} ${now.getFullYear()}`);
      if (!isNaN(parsed.getTime())) {
        const diff = Math.ceil(
          (parsed.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (diff > 0 && diff < 60) days = diff;
      }
    } catch {
      /* keep fallback */
    }
  }

  const tier: 'Express' | 'Standard' | 'Economy' =
    isExpress || days <= 2 ? 'Express' : days <= 7 ? 'Standard' : 'Economy';

  return { days, date: dateStr, cost: isFree ? 0 : 0, tier };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q');
  const country = (searchParams.get('country') || 'au').toLowerCase().slice(0, 2);

  if (!query) return NextResponse.json({ error: 'Missing query' }, { status: 400 });

  const serpApiKey = process.env.SERPAPI_KEY;
  if (!serpApiKey)
    return NextResponse.json({ error: 'Missing SERPAPI_KEY' }, { status: 500 });

  try {
    const shoppingParams = new URLSearchParams({
      engine: 'google_shopping',
      q: query,
      api_key: serpApiKey,
      num: '40',
      hl: 'en',
      gl: country,
    });

    const shoppingRes = await fetch(
      `https://serpapi.com/search.json?${shoppingParams.toString()}`
    );

    if (!shoppingRes.ok) {
      const err = await shoppingRes.text();
      return NextResponse.json({ error: 'SerpApi error', detail: err }, { status: 500 });
    }

    const shoppingData = await shoppingRes.json();
    const rawResults: any[] = shoppingData.shopping_results || [];

    const results = rawResults.filter(
      (item: any) => (item.extracted_price || item.price) && item.source && item.title
    );

    const currency =
      country === 'au'
        ? 'AUD'
        : country === 'gb'
        ? 'GBP'
        : country === 'us'
        ? 'USD'
        : country === 'eu'
        ? 'EUR'
        : 'AUD';

    const listings = results.slice(0, 20).map((item: any, idx: number) => {
      const rawPrice =
        typeof item.extracted_price === 'number'
          ? item.extracted_price
          : parseFloat(String(item.price || '0').replace(/[^0-9.]/g, ''));

      const marketplace = String(item.source || 'Unknown');

      // Get the best direct URL — no ScrapingBee needed
      let directUrl = extractDirectUrl(item);

      // If we still don't have a good URL, use the fallback search page
      if (!directUrl) {
        directUrl = getFallbackUrl(marketplace, query);
      }

      const deliveryStr = String(item.delivery || '');
      const delivery = parseDelivery(deliveryStr);

      return {
        id: `serpapi-${idx}-${Math.random().toString(36).slice(2, 7)}`,
        title: String(item.title || query),
        productName: String(item.title || query),
        model: '',
        color: '',
        price: rawPrice,
        originalPrice: rawPrice,
        currency,
        marketplace,
        marketplaceLogo: '🛒',
        listingUrl: directUrl,
        condition: item.second_hand_condition ? 'Used' : ('New' as const),
        location: country,
        stockStatus: 'In Stock' as const,
        sellerRating: typeof item.rating === 'number' ? item.rating : 4.5,
        sellerReviews: typeof item.reviews === 'number' ? item.reviews : 0,
        deliveryDays: delivery.days,
        deliveryDate: delivery.date,
        shippingTier: delivery.tier,
        shippingCost: delivery.cost,
        freeReturns: false,
        imageUrl: item.thumbnail || '',
        priceHistory: [],
        deliveryOptions: [
          { tier: delivery.tier, days: delivery.days, cost: delivery.cost },
        ],
        rawDelivery: deliveryStr,
      };
    });

    return NextResponse.json({ listings });
  } catch (err) {
    return NextResponse.json(
      { error: 'Server error', detail: String(err) },
      { status: 500 }
    );
  }
}
