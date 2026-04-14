import { NextRequest, NextResponse } from 'next/server';

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
 * Use the serpapi_immersive_product_api URL (which is already in each shopping result)
 * to fetch the real seller listing URL for a specific marketplace.
 *
 * The immersive product API returns a `sellers` array with direct retailer links.
 */
async function getDirectUrlFromImmersiveApi(
  immersiveApiUrl: string,
  marketplace: string
): Promise<string> {
  try {
    const res = await fetch(immersiveApiUrl);
    if (!res.ok) return '';
    const data = await res.json();

    // The immersive product API returns sellers under different keys depending on the product
    const sellers: any[] =
      data?.sellers_results?.online_sellers ||
      data?.buying_options ||
      data?.offers ||
      [];

    if (sellers.length === 0) return '';

    const mLower = marketplace.toLowerCase().replace(/\s*-\s*.+$/, '').trim(); // strip " - sellerName"

    // 1. Try to find exact marketplace match
    for (const seller of sellers) {
      const name = (seller.name || seller.seller || seller.store || '').toLowerCase();
      const link = seller.link || seller.url || seller.base_price_link || '';
      if (!link || isGoogleUrl(link)) continue;
      if (name.includes(mLower) || mLower.includes(name)) return link;
    }

    // 2. Return first valid direct link
    for (const seller of sellers) {
      const link = seller.link || seller.url || seller.base_price_link || '';
      if (link && !isGoogleUrl(link)) return link;
    }

    return '';
  } catch {
    return '';
  }
}

function buildFallbackUrl(marketplace: string, title: string, query: string): string {
  const t = encodeURIComponent(title);
  const m = marketplace.toLowerCase().trim().replace(/\s*-\s*.+$/, ''); // strip seller name

  if (m.startsWith('ebay')) return `https://www.ebay.com.au/sch/i.html?_nkw=${t}&_sop=12`;
  if (m.includes('cash converters')) return `https://www.cashconverters.com.au/shop/search?q=${t}`;
  if (m === 'cex' || m.startsWith('cex')) return `https://au.webuy.com/search?q=${t}`;
  if (m.includes('ubuy')) return `https://www.ubuy.com.au/en/search/?q=${t}`;
  if (m.includes('amazon')) {
    if (m.includes('.co.uk')) return `https://www.amazon.co.uk/s?k=${t}`;
    if (m.includes('.com') && !m.includes('.au')) return `https://www.amazon.com/s?k=${t}`;
    return `https://www.amazon.com.au/s?k=${t}`;
  }
  if (m.includes('jb')) return `https://www.jbhifi.com.au/search?q=${t}`;
  if (m.includes('harvey')) return `https://www.harveynorman.com.au/search?q=${t}`;
  if (m.includes('kogan')) return `https://www.kogan.com/au/shop/?q=${t}`;
  if (m.includes('big w')) return `https://www.bigw.com.au/search?q=${t}`;
  if (m.includes('catch')) return `https://www.catch.com.au/search/?q=${t}`;
  if (m.includes('good guys')) return `https://www.thegoodguys.com.au/SearchDisplay?searchTerm=${t}`;
  if (m.includes('bing lee')) return `https://www.binglee.com.au/search?q=${t}`;
  if (m.includes('officeworks')) return `https://www.officeworks.com.au/shop/officeworks/search?q=${t}`;
  if (m.includes('myer')) return `https://www.myer.com.au/search?query=${t}`;
  if (m.includes('david jones')) return `https://www.davidjones.com/search?q=${t}`;
  if (m.includes('walmart')) return `https://www.walmart.com/search?q=${t}`;
  if (m.includes('best buy')) return `https://www.bestbuy.com/site/searchpage.jsp?st=${t}`;
  if (m.includes('newegg')) return `https://www.newegg.com/p/pl?d=${t}`;
  if (m.includes('aliexpress')) return `https://www.aliexpress.com/wholesale?SearchText=${t}`;
  if (m.includes('etsy')) return `https://www.etsy.com/search?q=${t}`;
  if (m.includes('super retro')) return `https://www.superretro.com.au/search?q=${t}`;
  if (m.includes('noble knight')) return `https://www.nobleknight.com/Search?search=${t}`;
  if (m.includes('salvos')) return `https://www.salvosstores.com.au/search?q=${t}`;
  if (m.includes('whatnot')) return `https://www.whatnot.com/search?q=${encodeURIComponent(query)}`;
  if (m.includes('snapklik')) return `https://snapklik.com/au/?q=${t}`;
  if (m.includes('hospitality')) return `https://www.google.com/search?q=${encodeURIComponent(title + ' buy')}`;

  // Generic fallback
  return `https://www.google.com/search?q=${encodeURIComponent(title + ' ' + marketplace + ' buy')}`;
}

function parseDelivery(deliveryStr: string): {
  days: number; date: string; cost: number; tier: 'Express' | 'Standard' | 'Economy';
} {
  if (!deliveryStr) return { days: 7, date: '', cost: 0, tier: 'Standard' };
  const lower = deliveryStr.toLowerCase();
  const isExpress = lower.includes('express') || lower.includes('next day') ||
    lower.includes('same day') || lower.includes('overnight');
  const dateMatch = deliveryStr.match(/([A-Z][a-z]{2},?\s+\d{1,2}\s+[A-Z][a-z]{2,}|\d{1,2}\s+[A-Z][a-z]{2,})/);
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
    // Step 1: Get Google Shopping results
    const shoppingParams = new URLSearchParams({
      engine: 'google_shopping',
      q: query,
      api_key: serpApiKey,
      num: '20',
      hl: 'en',
      gl: country,
    });

    const shoppingRes = await fetch(`https://serpapi.com/search.json?${shoppingParams.toString()}`);
    if (!shoppingRes.ok) {
      const err = await shoppingRes.text();
      return NextResponse.json({ error: 'SerpApi error', detail: err }, { status: 500 });
    }

    const shoppingData = await shoppingRes.json();
    const rawResults: any[] = (shoppingData.shopping_results || []).filter(
      (item: any) => (item.extracted_price || item.price) && item.source && item.title
    );

    const currency = country === 'au' ? 'AUD' : country === 'gb' ? 'GBP' :
      country === 'us' ? 'USD' : country === 'eu' ? 'EUR' : 'AUD';

    // Step 2: For each result, use serpapi_immersive_product_api to get real direct URL
    // Cap at 15 results — each immersive API call costs 1 SerpAPI credit
    const topResults = rawResults.slice(0, 15);

    const listings = await Promise.all(
      topResults.map(async (item: any, idx: number) => {
        const rawPrice = typeof item.extracted_price === 'number'
          ? item.extracted_price
          : parseFloat(String(item.price || '0').replace(/[^0-9.]/g, ''));

        const marketplace = String(item.source || 'Unknown');
        const title = String(item.title || query);
        let directUrl = '';

        // Use the immersive product API URL that's already in every result
        const immersiveUrl: string = item.serpapi_immersive_product_api || '';
        if (immersiveUrl) {
          directUrl = await getDirectUrlFromImmersiveApi(immersiveUrl, marketplace);
        }

        // Fallback to title-based search URL if immersive API returned nothing
        if (!directUrl) {
          directUrl = buildFallbackUrl(marketplace, title, query);
        }

        const delivery = parseDelivery(String(item.delivery || ''));

        return {
          id: `serpapi-${idx}-${Math.random().toString(36).slice(2, 7)}`,
          title,
          productName: title,
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
