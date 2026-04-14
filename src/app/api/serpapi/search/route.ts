import { NextRequest, NextResponse } from 'next/server';

/**
 * Build the best possible direct URL for a given marketplace + product title.
 * These are real search-results pages filtered to the exact product title,
 * which is as close as we can get without scraping individual listing pages.
 *
 * For marketplaces like Cash Converters and CeX that have structured URLs,
 * we use their proper search endpoints.
 */
function buildDirectUrl(marketplace: string, title: string, query: string): string {
  const t = encodeURIComponent(title);   // exact product title
  const q = encodeURIComponent(query);   // original search term
  const m = marketplace.toLowerCase().trim();

  // ── eBay ──────────────────────────────────────────────────────────────────
  if (m.startsWith('ebay')) {
    // If the marketplace includes a seller name (e.g. "eBay - willenhospiceventuresltd")
    // search eBay with the exact title — far better than a generic keyword search
    const sellerMatch = marketplace.match(/eBay\s*[-–]\s*(.+)/i);
    if (sellerMatch) {
      const seller = encodeURIComponent(sellerMatch[1].trim());
      return `https://www.ebay.com.au/sch/i.html?_nkw=${t}&_sacat=0&_sop=12`;
    }
    return `https://www.ebay.com.au/sch/i.html?_nkw=${t}&_sacat=0&_sop=12`;
  }

  // ── Cash Converters ───────────────────────────────────────────────────────
  if (m.includes('cash converters')) {
    return `https://www.cashconverters.com.au/shop/search?q=${t}`;
  }

  // ── CeX ───────────────────────────────────────────────────────────────────
  if (m === 'cex' || m.includes('cex')) {
    return `https://au.webuy.com/search?q=${t}`;
  }

  // ── Ubuy ──────────────────────────────────────────────────────────────────
  if (m.includes('ubuy')) {
    return `https://www.ubuy.com.au/en/search/?q=${t}`;
  }

  // ── Amazon ────────────────────────────────────────────────────────────────
  if (m.includes('amazon')) {
    if (m.includes('.co.uk')) return `https://www.amazon.co.uk/s?k=${t}`;
    if (m.includes('.com') && !m.includes('.au')) return `https://www.amazon.com/s?k=${t}`;
    return `https://www.amazon.com.au/s?k=${t}`;
  }

  // ── JB Hi-Fi ──────────────────────────────────────────────────────────────
  if (m.includes('jb')) {
    return `https://www.jbhifi.com.au/search?q=${t}`;
  }

  // ── Harvey Norman ─────────────────────────────────────────────────────────
  if (m.includes('harvey')) {
    return `https://www.harveynorman.com.au/search?q=${t}`;
  }

  // ── Kogan ─────────────────────────────────────────────────────────────────
  if (m.includes('kogan')) {
    return `https://www.kogan.com/au/shop/?q=${t}`;
  }

  // ── Big W ─────────────────────────────────────────────────────────────────
  if (m.includes('big w')) {
    return `https://www.bigw.com.au/search?q=${t}`;
  }

  // ── Catch ─────────────────────────────────────────────────────────────────
  if (m.includes('catch')) {
    return `https://www.catch.com.au/search/?q=${t}`;
  }

  // ── The Good Guys ─────────────────────────────────────────────────────────
  if (m.includes('good guys')) {
    return `https://www.thegoodguys.com.au/SearchDisplay?searchTerm=${t}`;
  }

  // ── Bing Lee ──────────────────────────────────────────────────────────────
  if (m.includes('bing lee')) {
    return `https://www.binglee.com.au/search?q=${t}`;
  }

  // ── Officeworks ───────────────────────────────────────────────────────────
  if (m.includes('officeworks')) {
    return `https://www.officeworks.com.au/shop/officeworks/search?q=${t}`;
  }

  // ── Myer ─────────────────────────────────────────────────────────────────
  if (m.includes('myer')) {
    return `https://www.myer.com.au/search?query=${t}`;
  }

  // ── David Jones ───────────────────────────────────────────────────────────
  if (m.includes('david jones')) {
    return `https://www.davidjones.com/search?q=${t}`;
  }

  // ── Walmart ───────────────────────────────────────────────────────────────
  if (m.includes('walmart')) {
    return `https://www.walmart.com/search?q=${t}`;
  }

  // ── Best Buy ──────────────────────────────────────────────────────────────
  if (m.includes('best buy')) {
    return `https://www.bestbuy.com/site/searchpage.jsp?st=${t}`;
  }

  // ── Newegg ────────────────────────────────────────────────────────────────
  if (m.includes('newegg')) {
    return `https://www.newegg.com/p/pl?d=${t}`;
  }

  // ── AliExpress ────────────────────────────────────────────────────────────
  if (m.includes('aliexpress')) {
    return `https://www.aliexpress.com/wholesale?SearchText=${t}`;
  }

  // ── Etsy ──────────────────────────────────────────────────────────────────
  if (m.includes('etsy')) {
    return `https://www.etsy.com/search?q=${t}`;
  }

  // ── Gumtree ───────────────────────────────────────────────────────────────
  if (m.includes('gumtree')) {
    return `https://www.gumtree.com.au/s-${encodeURIComponent(query)}/k0`;
  }

  // ── Super Retro ───────────────────────────────────────────────────────────
  if (m.includes('super retro')) {
    return `https://www.superretro.com.au/search?q=${t}`;
  }

  // ── Generic fallback: Google Shopping filtered to this marketplace ─────────
  return `https://www.google.com/search?q=${encodeURIComponent(title)}+site:${encodeURIComponent(marketplace.split(' ')[0].toLowerCase())}`;
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

    const listings = rawResults.slice(0, 20).map((item: any, idx: number) => {
      const rawPrice =
        typeof item.extracted_price === 'number'
          ? item.extracted_price
          : parseFloat(String(item.price || '0').replace(/[^0-9.]/g, ''));

      const marketplace = String(item.source || 'Unknown');
      const title = String(item.title || query);

      // Build the best direct URL using the exact product title
      const directUrl = buildDirectUrl(marketplace, title, query);

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
    });

    return NextResponse.json({ listings });
  } catch (err) {
    return NextResponse.json({ error: 'Server error', detail: String(err) }, { status: 500 });
  }
}
