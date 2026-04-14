import { NextRequest, NextResponse } from 'next/server';

const MARKETPLACE_URLS: Record<string, (q: string) => string> = {
  'amazon': (q) => `https://www.amazon.com.au/s?k=${q}`,
  'amazon australia': (q) => `https://www.amazon.com.au/s?k=${q}`,
  'amazon.com.au': (q) => `https://www.amazon.com.au/s?k=${q}`,
  'amazon.com': (q) => `https://www.amazon.com/s?k=${q}`,
  'amazon.co.uk': (q) => `https://www.amazon.co.uk/s?k=${q}`,
  'amazon.de': (q) => `https://www.amazon.de/s?k=${q}`,
  'ebay': (q) => `https://www.ebay.com.au/sch/i.html?_nkw=${q}`,
  'ebay.com.au': (q) => `https://www.ebay.com.au/sch/i.html?_nkw=${q}`,
  'ebay.com': (q) => `https://www.ebay.com/sch/i.html?_nkw=${q}`,
  'ebay.co.uk': (q) => `https://www.ebay.co.uk/sch/i.html?_nkw=${q}`,
  'walmart': (q) => `https://www.walmart.com/search?q=${q}`,
  'best buy': (q) => `https://www.bestbuy.com/site/searchpage.jsp?st=${q}`,
  'target': (q) => `https://www.target.com/s?searchTerm=${q}`,
  'newegg': (q) => `https://www.newegg.com/p/pl?d=${q}`,
  'jb hi-fi': (q) => `https://www.jbhifi.com.au/search?q=${q}`,
  'jb hifi': (q) => `https://www.jbhifi.com.au/search?q=${q}`,
  'harvey norman': (q) => `https://www.harveynorman.com.au/search?q=${q}`,
  'officeworks': (q) => `https://www.officeworks.com.au/shop/officeworks/search?q=${q}`,
  'kogan': (q) => `https://www.kogan.com/au/shop/?q=${q}`,
  'big w': (q) => `https://www.bigw.com.au/search?q=${q}`,
  'catch': (q) => `https://www.catch.com.au/search/?q=${q}`,
  'myer': (q) => `https://www.myer.com.au/search?query=${q}`,
  'david jones': (q) => `https://www.davidjones.com/search?q=${q}`,
  'the good guys': (q) => `https://www.thegoodguys.com.au/SearchDisplay?searchTerm=${q}`,
  'bing lee': (q) => `https://www.binglee.com.au/search?q=${q}`,
  'cash converters': (q) => `https://www.cashconverters.com.au/shop/search?q=${q}`,
  'etsy': (q) => `https://www.etsy.com/search?q=${q}`,
  'gumtree': (q) => `https://www.gumtree.com.au/s-${q}/k0`,
  'depop': (q) => `https://www.depop.com/search/?q=${q}`,
  'aliexpress': (q) => `https://www.aliexpress.com/wholesale?SearchText=${q}`,
  'rakuten': (q) => `https://www.rakuten.com/search/${q}`,
  'lazada': (q) => `https://www.lazada.com/catalog/?q=${q}`,
  'shopee': (q) => `https://shopee.com/search?keyword=${q}`,
  'zalando': (q) => `https://www.zalando.com/catalog/?q=${q}`,
  'costco': (q) => `https://www.costco.com.au/search?text=${q}`,
  'b&h': (q) => `https://www.bhphotovideo.com/c/search?Ntt=${q}`,
  'currys': (q) => `https://www.currys.co.uk/search?q=${q}`,
  'argos': (q) => `https://www.argos.co.uk/search/${q}`,
  'john lewis': (q) => `https://www.johnlewis.com/search?search-term=${q}`,
  'apple': (q) => `https://www.apple.com/au/search/${q}`,
  'microsoft': (q) => `https://www.microsoft.com/en-au/search/explore?q=${q}`,
  'bunnings': (q) => `https://www.bunnings.com.au/search/products?q=${q}`,
  'flipkart': (q) => `https://www.flipkart.com/search?q=${q}`,
};

function getFallbackUrl(marketplace: string, productName: string): string {
  const q = encodeURIComponent(productName);
  const m = marketplace.toLowerCase().trim();
  if (MARKETPLACE_URLS[m]) return MARKETPLACE_URLS[m](q);
  for (const [key, fn] of Object.entries(MARKETPLACE_URLS)) {
    if (m.includes(key) || key.includes(m)) return fn(q);
  }
  return `https://www.google.com/search?q=${encodeURIComponent(productName + ' ' + marketplace)}`;
}

async function scrapeDirectUrl(
  googleShoppingUrl: string,
  marketplace: string,
  scrapingBeeKey: string
): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      api_key: scrapingBeeKey,
      url: googleShoppingUrl,
      render_js: 'true',
      premium_proxy: 'true',
      country_code: 'au',
      extract_rules: JSON.stringify({
        visit_site_url: {
          selector: 'a[jsname="tBiGEc"], a[data-url], .sh-np__click-target',
          type: 'item',
          output: '@href',
        },
        all_links: {
          selector: 'a[href]',
          type: 'list',
          output: '@href',
        },
      }),
    });

    const res = await fetch(`https://app.scrapingbee.com/api/v1/?${params.toString()}`);
    if (!res.ok) return null;
    const data = await res.json();

    // Try the primary targeted selector
    let visitUrl: string = data?.visit_site_url || '';
    if (visitUrl) {
      const match = visitUrl.match(/[?&]q=(https?[^&]+)/);
      if (match) visitUrl = decodeURIComponent(match[1]);
      if (visitUrl.startsWith('https://') && !visitUrl.includes('google.com')) return visitUrl;
    }

    const allLinks: string[] = data?.all_links || [];
    const domain = marketplace.toLowerCase().replace(/\s+/g, '').split('.')[0];

    // Find a link for the marketplace domain
    for (const raw of allLinks) {
      if (!raw) continue;
      const match = raw.match(/[?&]q=(https?[^&]+)/);
      const link = match ? decodeURIComponent(match[1]) : raw;
      if (!link.startsWith('https://')) continue;
      if (link.includes('google.com') || link.includes('googleapis.com') || link.includes('gstatic.com')) continue;
      if (link.includes(domain)) return link;
    }

    // Any non-Google external link as last resort
    for (const raw of allLinks) {
      if (!raw) continue;
      const match = raw.match(/[?&]q=(https?[^&]+)/);
      const link = match ? decodeURIComponent(match[1]) : raw;
      if (!link.startsWith('https://')) continue;
      if (link.includes('google.com') || link.includes('googleapis.com') || link.includes('gstatic.com')) continue;
      return link;
    }

    return null;
  } catch {
    return null;
  }
}

function parseDelivery(deliveryStr: string): { days: number; date: string; cost: number; tier: 'Express' | 'Standard' | 'Economy' } {
  if (!deliveryStr) return { days: 7, date: '', cost: 0, tier: 'Standard' };
  const lower = deliveryStr.toLowerCase();
  const isFree = lower.includes('free');
  const isExpress = lower.includes('express') || lower.includes('next day') || lower.includes('same day') || lower.includes('overnight');

  const dateMatch = deliveryStr.match(/([A-Z][a-z]{2},?\s+\d{1,2}\s+[A-Z][a-z]{2,}|\d{1,2}\s+[A-Z][a-z]{2,})/);
  const dateStr = dateMatch ? dateMatch[0] : '';

  let days = isExpress ? 2 : 7;
  if (dateStr) {
    try {
      const now = new Date();
      const parsed = new Date(`${dateStr} ${now.getFullYear()}`);
      if (!isNaN(parsed.getTime())) {
        const diff = Math.ceil((parsed.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (diff > 0 && diff < 60) days = diff;
      }
    } catch { /* keep fallback */ }
  }

  const tier: 'Express' | 'Standard' | 'Economy' = isExpress || days <= 2 ? 'Express' : days <= 7 ? 'Standard' : 'Economy';

  return { days, date: dateStr, cost: isFree ? 0 : 0, tier };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q');
  const country = (searchParams.get('country') || 'au').toLowerCase().slice(0, 2);

  if (!query) return NextResponse.json({ error: 'Missing query' }, { status: 400 });

  const serpApiKey = process.env.SERPAPI_KEY;
  const scrapingBeeKey = process.env.SCRAPINGBEE_API_KEY;

  if (!serpApiKey) return NextResponse.json({ error: 'Missing SERPAPI_KEY' }, { status: 500 });

  try {
    const shoppingParams = new URLSearchParams({
      engine: 'google_shopping',
      q: query,
      api_key: serpApiKey,
      num: '40',
      hl: 'en',
      gl: country,
    });

    const shoppingRes = await fetch(`https://serpapi.com/search.json?${shoppingParams.toString()}`);
    if (!shoppingRes.ok) {
      const err = await shoppingRes.text();
      return NextResponse.json({ error: 'SerpApi error', detail: err }, { status: 500 });
    }

    const shoppingData = await shoppingRes.json();
    const rawResults: any[] = shoppingData.shopping_results || [];

    const results = rawResults.filter((item: any) =>
      (item.extracted_price || item.price) && item.source && item.title
    );

    const currency = country === 'au' ? 'AUD' : country === 'gb' ? 'GBP' : country === 'us' ? 'USD' : country === 'eu' ? 'EUR' : 'AUD';

    const listings = await Promise.all(
      results.slice(0, 20).map(async (item: any, idx: number) => {
        const rawPrice = typeof item.extracted_price === 'number'
          ? item.extracted_price
          : parseFloat(String(item.price || '0').replace(/[^0-9.]/g, ''));

        const marketplace = String(item.source || 'Unknown');
        const googleUrl: string = item.product_link || item.link || '';
        let directUrl = '';

        if (scrapingBeeKey && googleUrl && googleUrl.includes('google.com')) {
          const scraped = await scrapeDirectUrl(googleUrl, marketplace, scrapingBeeKey);
          if (scraped) directUrl = scraped;
        } else if (googleUrl && !googleUrl.includes('google.com')) {
          directUrl = googleUrl;
        }

        if (!directUrl || directUrl.includes('google.com')) {
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
          deliveryOptions: [{ tier: delivery.tier, days: delivery.days, cost: delivery.cost }],
          rawDelivery: deliveryStr,
        };
      })
    );

    return NextResponse.json({ listings });
  } catch (err) {
    return NextResponse.json({ error: 'Server error', detail: String(err) }, { status: 500 });
  }
}
