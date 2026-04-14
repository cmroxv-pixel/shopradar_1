import { NextRequest, NextResponse } from 'next/server';

// ─── Fallback search-page URLs (last resort only) ────────────────────────────
const MARKETPLACE_SEARCH_URLS: Record<string, (q: string) => string> = {
  'amazon':           (q) => `https://www.amazon.com.au/s?k=${q}`,
  'amazon australia': (q) => `https://www.amazon.com.au/s?k=${q}`,
  'amazon.com.au':    (q) => `https://www.amazon.com.au/s?k=${q}`,
  'amazon.com':       (q) => `https://www.amazon.com/s?k=${q}`,
  'amazon.co.uk':     (q) => `https://www.amazon.co.uk/s?k=${q}`,
  'ebay':             (q) => `https://www.ebay.com.au/sch/i.html?_nkw=${q}`,
  'ebay.com.au':      (q) => `https://www.ebay.com.au/sch/i.html?_nkw=${q}`,
  'ebay.com':         (q) => `https://www.ebay.com/sch/i.html?_nkw=${q}`,
  'walmart':          (q) => `https://www.walmart.com/search?q=${q}`,
  'best buy':         (q) => `https://www.bestbuy.com/site/searchpage.jsp?st=${q}`,
  'jb hi-fi':         (q) => `https://www.jbhifi.com.au/search?q=${q}`,
  'jb hifi':          (q) => `https://www.jbhifi.com.au/search?q=${q}`,
  'harvey norman':    (q) => `https://www.harveynorman.com.au/search?q=${q}`,
  'officeworks':      (q) => `https://www.officeworks.com.au/shop/officeworks/search?q=${q}`,
  'kogan':            (q) => `https://www.kogan.com/au/shop/?q=${q}`,
  'big w':            (q) => `https://www.bigw.com.au/search?q=${q}`,
  'catch':            (q) => `https://www.catch.com.au/search/?q=${q}`,
  'the good guys':    (q) => `https://www.thegoodguys.com.au/SearchDisplay?searchTerm=${q}`,
  'bing lee':         (q) => `https://www.binglee.com.au/search?q=${q}`,
  'etsy':             (q) => `https://www.etsy.com/search?q=${q}`,
  'aliexpress':       (q) => `https://www.aliexpress.com/wholesale?SearchText=${q}`,
  'newegg':           (q) => `https://www.newegg.com/p/pl?d=${q}`,
  'target':           (q) => `https://www.target.com/s?searchTerm=${q}`,
  'cash converters':  (q) => `https://www.cashconverters.com.au/shop/search?q=${q}`,
  'cashconverters':   (q) => `https://www.cashconverters.com.au/shop/search?q=${q}`,
};

function getFallbackUrl(marketplace: string, productName: string): string {
  const q = encodeURIComponent(productName);
  const m = marketplace.toLowerCase().trim();
  if (MARKETPLACE_SEARCH_URLS[m]) return MARKETPLACE_SEARCH_URLS[m](q);
  for (const [key, fn] of Object.entries(MARKETPLACE_SEARCH_URLS)) {
    if (m.includes(key) || key.includes(m)) return fn(q);
  }
  return `https://www.google.com/search?q=${encodeURIComponent(productName + ' ' + marketplace + ' buy')}`;
}

function isGoogleUrl(url: string): boolean {
  if (!url) return true;
  try {
    const h = new URL(url).hostname;
    return h.includes('google.com') || h.includes('googleapis.com') || h.includes('gstatic.com');
  } catch {
    return true;
  }
}

/**
 * Step 2: Use SerpAPI google_product engine to get real seller offer links.
 * Each product in Google Shopping has a product_id — this endpoint returns
 * all sellers with their direct store URLs.
 */
async function getDirectUrlFromProductOffers(
  productId: string,
  marketplace: string,
  serpApiKey: string,
  country: string
): Promise<string> {
  try {
    const params = new URLSearchParams({
      engine: 'google_product',
      product_id: productId,
      api_key: serpApiKey,
      hl: 'en',
      gl: country,
    });

    const res = await fetch(`https://serpapi.com/search.json?${params.toString()}`);
    if (!res.ok) return '';

    const data = await res.json();
    const sellers: any[] = data?.sellers_results?.online_sellers || [];
    if (sellers.length === 0) return '';

    const mLower = marketplace.toLowerCase();

    // Try to match the exact marketplace first
    for (const seller of sellers) {
      const name = (seller.name || seller.seller || '').toLowerCase();
      const link = seller.link || seller.base_price_link || '';
      if (!link || isGoogleUrl(link)) continue;
      if (name.includes(mLower) || mLower.includes(name)) return link;
    }

    // Otherwise return the first valid direct link
    for (const seller of sellers) {
      const link = seller.link || seller.base_price_link || '';
      if (link && !isGoogleUrl(link)) return link;
    }

    return '';
  } catch {
    return '';
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
      const parsed = new Date(`${dateStr} ${new Date().getFullYear()}`);
      if (!isNaN(parsed.getTime())) {
        const diff = Math.ceil((parsed.getTime() - Date.now()) / 86400000);
        if (diff > 0 && diff < 60) days = diff;
      }
    } catch { /* keep fallback */ }
  }

  const tier: 'Express' | 'Standard' | 'Economy' =
    isExpress || days <= 2 ? 'Express' : days <= 7 ? 'Standard' : 'Economy';

  return { days, date: dateStr, cost: 0, tier };
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
    // ── Step 1: Google Shopping search ────────────────────────────────────────
    const shoppingParams = new URLSearchParams({
      engine: 'google_shopping',
      q: query,
      api_key: serpApiKey,
      num: '20',
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
    const rawResults: any[] = (shoppingData.shopping_results || []).filter(
      (item: any) => (item.extracted_price || item.price) && item.source && item.title
    );

    const currency =
      country === 'au' ? 'AUD' :
      country === 'gb' ? 'GBP' :
      country === 'us' ? 'USD' :
      country === 'eu' ? 'EUR' : 'AUD';

    // ── Step 2: Resolve direct product URLs in parallel ────────────────────────
    // Cap at 12 to limit SerpAPI credit usage (1 credit per product lookup)
    const topResults = rawResults.slice(0, 12);

    const listings = await Promise.all(
      topResults.map(async (item: any, idx: number) => {
        const rawPrice =
          typeof item.extracted_price === 'number'
            ? item.extracted_price
            : parseFloat(String(item.price || '0').replace(/[^0-9.]/g, ''));

        const marketplace = String(item.source || 'Unknown');
        const productId: string = item.product_id || '';
        let directUrl = '';

        // Best path: google_product engine gives real seller URLs
        if (productId) {
          directUrl = await getDirectUrlFromProductOffers(
            productId,
            marketplace,
            serpApiKey,
            country
          );
        }

        // Fallback: check raw link fields from shopping result
        if (!directUrl) {
          for (const candidate of [item.product_link, item.link]) {
            if (candidate && !isGoogleUrl(candidate)) {
              directUrl = candidate;
              break;
            }
          }
        }

        // Last resort: marketplace search page for this query
        if (!directUrl) {
          directUrl = getFallbackUrl(marketplace, query);
        }

        const delivery = parseDelivery(String(item.delivery || ''));

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
          deliveryOptions: [{ tier: delivery.tier, days: delivery.days, cost: delivery.cost }],
          rawDelivery: String(item.delivery || ''),
        };
      })
    );

    return NextResponse.json({ listings });
  } catch (err) {
    return NextResponse.json({ error: 'Server error', detail: String(err) }, { status: 500 });
  }
}
