import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function isGoogleUrl(url: string): boolean {
  if (!url) return true;
  try {
    const h = new URL(url).hostname;
    return h.includes('google.com') || h.includes('googleapis.com') || h.includes('gstatic.com');
  } catch { return true; }
}

function buildFallbackUrl(marketplace: string, title: string): string {
  const t = encodeURIComponent(title);
  const m = marketplace.toLowerCase().trim().replace(/\s*-\s*.+$/, '');
  if (m.includes('ebay')) return `https://www.ebay.com.au/sch/i.html?_nkw=${t}&_sop=12`;
  if (m.includes('cash converters')) return `https://www.cashconverters.com.au/shop/search?q=${t}`;
  if (m === 'cex' || m.startsWith('cex')) return `https://au.webuy.com/search?q=${t}`;
  if (m.includes('amazon')) return `https://www.amazon.com.au/s?k=${t}`;
  if (m.includes('jb')) return `https://www.jbhifi.com.au/search?q=${t}`;
  if (m.includes('harvey')) return `https://www.harveynorman.com.au/search?q=${t}`;
  if (m.includes('kogan')) return `https://www.kogan.com/au/shop/?q=${t}`;
  if (m.includes('big w')) return `https://www.bigw.com.au/search?q=${t}`;
  if (m.includes('catch')) return `https://www.catch.com.au/search/?q=${t}`;
  if (m.includes('good guys')) return `https://www.thegoodguys.com.au/SearchDisplay?searchTerm=${t}`;
  if (m.includes('bing lee')) return `https://www.binglee.com.au/search?q=${t}`;
  if (m.includes('officeworks')) return `https://www.officeworks.com.au/shop/officeworks/search?q=${t}`;
  if (m.includes('walmart')) return `https://www.walmart.com/search?q=${t}`;
  if (m.includes('best buy')) return `https://www.bestbuy.com/site/searchpage.jsp?st=${t}`;
  if (m.includes('etsy')) return `https://www.etsy.com/search?q=${t}`;
  if (m.includes('aliexpress')) return `https://www.aliexpress.com/wholesale?SearchText=${t}`;
  return `https://www.google.com/search?q=${encodeURIComponent(title + ' buy')}`;
}

function parseDelivery(deliveryStr: string): {
  days: number; date: string; cost: number; tier: 'Express' | 'Standard' | 'Economy';
} {
  if (!deliveryStr) return { days: 7, date: '', cost: 0, tier: 'Standard' };
  const lower = deliveryStr.toLowerCase();
  const isExpress = lower.includes('express') || lower.includes('next day') || lower.includes('same day');
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
    } catch { }
  }
  const tier: 'Express' | 'Standard' | 'Economy' = isExpress || days <= 2 ? 'Express' : days <= 7 ? 'Standard' : 'Economy';
  return { days, date: dateStr, cost: 0, tier };
}

async function storePriceHistory(listings: any[], query: string) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const today = new Date().toISOString().split('T')[0];
    for (const listing of listings.slice(0, 5)) {
      if (!listing.price || listing.price <= 0) continue;
      const { data: existing } = await supabase.from('price_snapshots').select('id')
        .eq('product_query', query.toLowerCase()).eq('marketplace', listing.marketplace)
        .eq('snapshot_date', today).single();
      if (!existing) {
        await supabase.from('price_snapshots').insert({
          product_query: query.toLowerCase(), marketplace: listing.marketplace,
          price: listing.price, currency: listing.currency,
          listing_url: listing.listingUrl, title: listing.title, snapshot_date: today,
        });
      }
    }
  } catch { }
}

async function fetchPriceHistory(query: string): Promise<Record<string, any[]>> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const { data } = await supabase.from('price_snapshots').select('marketplace, price, snapshot_date')
      .eq('product_query', query.toLowerCase()).gte('snapshot_date', thirtyDaysAgo)
      .order('snapshot_date', { ascending: true });
    if (!data) return {};
    const grouped: Record<string, any[]> = {};
    for (const row of data) {
      if (!grouped[row.marketplace]) grouped[row.marketplace] = [];
      grouped[row.marketplace].push({ date: row.snapshot_date, price: row.price });
    }
    return grouped;
  } catch { return {}; }
}

function calcTrust(marketplace: string, rating: number, reviews: number, hasReturns: boolean) {
  let score = 0;
  if (rating >= 4.5) score += 40; else if (rating >= 4.0) score += 25; else if (rating >= 3.5) score += 10;
  if (reviews >= 1000) score += 35; else if (reviews >= 100) score += 20; else if (reviews >= 10) score += 10;
  if (hasReturns) score += 15;
  if (['ebay', 'amazon', 'jb hi-fi', 'harvey norman', 'kogan', 'the good guys'].some(s => marketplace.toLowerCase().includes(s))) score += 10;
  return { score, label: score >= 70 ? 'Trusted' : score >= 40 ? 'Verified' : 'Unverified' };
}

// ── Google Custom Search (FREE — 100 searches/day) ──────────────────────────
async function searchWithGoogle(query: string, country: string): Promise<any[]> {
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
  const engineId = process.env.GOOGLE_SEARCH_ENGINE_ID;
  if (!apiKey || !engineId) return [];

  // Search for shopping/price results
  const params = new URLSearchParams({
    key: apiKey, cx: engineId,
    q: `${query} buy price site:*.com.au OR site:ebay.com.au OR site:amazon.com.au`,
    num: '10',
  });

  try {
    const res = await fetch(`https://www.googleapis.com/customsearch/v1?${params}`);
    if (!res.ok) return [];
    const data = await res.json();
    const items: any[] = data.items || [];

    return items
      .filter((item: any) => item.link && !isGoogleUrl(item.link))
      .map((item: any, idx: number) => {
        // Extract price from snippet
        const priceMatch = (item.snippet || '').match(/\$[\d,]+\.?\d*/);
        const rawPrice = priceMatch ? parseFloat(priceMatch[0].replace(/[$,]/g, '')) : 0;

        // Derive marketplace from URL
        let marketplace = 'Unknown';
        try {
          const host = new URL(item.link).hostname.replace('www.', '');
          if (host.includes('ebay')) marketplace = 'eBay';
          else if (host.includes('amazon')) marketplace = 'Amazon';
          else if (host.includes('jbhifi')) marketplace = 'JB Hi-Fi';
          else if (host.includes('harveynorman')) marketplace = 'Harvey Norman';
          else if (host.includes('kogan')) marketplace = 'Kogan';
          else if (host.includes('bigw')) marketplace = 'Big W';
          else if (host.includes('catch')) marketplace = 'Catch';
          else if (host.includes('thegoodguys')) marketplace = 'The Good Guys';
          else if (host.includes('officeworks')) marketplace = 'Officeworks';
          else if (host.includes('binglee')) marketplace = 'Bing Lee';
          else if (host.includes('aliexpress')) marketplace = 'AliExpress';
          else marketplace = host.split('.')[0].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        } catch { }

        const title = item.title?.replace(/ - .*$/, '').trim() || query;
        const { score: trustScore, label: trustLabel } = calcTrust(marketplace, 4.2, 50, false);

        return {
          id: `google-${idx}-${Math.random().toString(36).slice(2, 7)}`,
          title, productName: title, model: '', color: '',
          price: rawPrice, originalPrice: rawPrice,
          currency: country === 'us' ? 'USD' : country === 'gb' ? 'GBP' : 'AUD',
          marketplace, marketplaceLogo: '🛒',
          listingUrl: item.link,
          condition: 'New' as const,
          location: country, stockStatus: 'In Stock' as const,
          sellerRating: 4.2, sellerReviews: 50,
          deliveryDays: 5, deliveryDate: '', shippingTier: 'Standard' as const, shippingCost: 0,
          freeReturns: false, imageUrl: item.pagemap?.cse_image?.[0]?.src || '',
          priceHistory: [], trustScore, trustLabel,
          deliveryOptions: [{ tier: 'Standard', days: 5, cost: 0 }], rawDelivery: '',
        };
      })
      .filter(l => l.price > 0); // Only include results with a real price
  } catch { return []; }
}

// ── SerpAPI (paid fallback) ─────────────────────────────────────────────────
async function searchWithSerpApi(query: string, country: string, serpApiKey: string): Promise<any[]> {
  const shoppingParams = new URLSearchParams({
    engine: 'google_shopping', q: query, api_key: serpApiKey, num: '20', hl: 'en', gl: country,
  });
  const res = await fetch(`https://serpapi.com/search.json?${shoppingParams}`);
  if (!res.ok) return [];
  const data = await res.json();
  const rawResults: any[] = (data.shopping_results || []).filter(
    (item: any) => (item.extracted_price || item.price) && item.source && item.title
  );
  const currency = country === 'au' ? 'AUD' : country === 'gb' ? 'GBP' : 'USD';

  return Promise.all(rawResults.slice(0, 15).map(async (item: any, idx: number) => {
    const rawPrice = typeof item.extracted_price === 'number'
      ? item.extracted_price
      : parseFloat(String(item.price || '0').replace(/[^0-9.]/g, ''));
    const marketplace = String(item.source || 'Unknown');
    const title = String(item.title || query);
    let directUrl = buildFallbackUrl(marketplace, title);

    // Try to get direct URL from immersive API
    const immersiveUrl: string = item.serpapi_immersive_product_api || '';
    if (immersiveUrl) {
      try {
        const immRes = await fetch(`${immersiveUrl}&api_key=${serpApiKey}`);
        if (immRes.ok) {
          const immData = await immRes.json();
          const stores: any[] = immData?.product_results?.stores || [];
          const mLower = marketplace.toLowerCase().replace(/\s*-\s*.+$/, '').trim();
          for (const store of stores) {
            const link = store.link || '';
            if (!link || isGoogleUrl(link)) continue;
            const name = (store.name || '').toLowerCase();
            if (name.includes(mLower) || mLower.includes(name)) { directUrl = link; break; }
          }
          if (isGoogleUrl(directUrl)) {
            const firstGood = stores.find(s => s.link && !isGoogleUrl(s.link));
            if (firstGood) directUrl = firstGood.link;
          }
        }
      } catch { }
    }

    const delivery = parseDelivery(String(item.delivery || ''));
    const rating = typeof item.rating === 'number' ? item.rating : 0;
    const reviews = typeof item.reviews === 'number' ? item.reviews : 0;
    const hasReturns = String(item.delivery || '').toLowerCase().includes('return');
    const { score: trustScore, label: trustLabel } = calcTrust(marketplace, rating, reviews, hasReturns);

    return {
      id: `serpapi-${idx}-${Math.random().toString(36).slice(2, 7)}`,
      title, productName: title, model: '', color: '',
      price: rawPrice, originalPrice: rawPrice,
      currency, marketplace, marketplaceLogo: '🛒',
      listingUrl: directUrl, condition: item.second_hand_condition ? 'Used' : 'New' as const,
      location: country, stockStatus: 'In Stock' as const,
      sellerRating: rating || 4.5, sellerReviews: reviews,
      deliveryDays: delivery.days, deliveryDate: delivery.date,
      shippingTier: delivery.tier, shippingCost: delivery.cost, freeReturns: hasReturns,
      imageUrl: item.thumbnail || '', priceHistory: [], trustScore, trustLabel,
      deliveryOptions: [{ tier: delivery.tier, days: delivery.days, cost: delivery.cost }],
      rawDelivery: String(item.delivery || ''),
    };
  }));
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q');
  const country = (searchParams.get('country') || 'au').toLowerCase().slice(0, 2);
  if (!query) return NextResponse.json({ error: 'Missing query' }, { status: 400 });

  try {
    const [historyByMarketplace] = await Promise.all([fetchPriceHistory(query)]);

    // Try SerpAPI first (best results)
    let listings: any[] = [];
    const serpApiKey = process.env.SERPAPI_KEY;
    if (serpApiKey) {
      try {
        listings = await searchWithSerpApi(query, country, serpApiKey);
      } catch { listings = []; }
    }

    // Fall back to Google Custom Search if SerpAPI fails or runs out of credits
    if (listings.length < 3) {
      listings = await searchWithGoogle(query, country);
    }

    // Attach price history
    listings = listings.map(l => ({
      ...l,
      priceHistory: historyByMarketplace[l.marketplace] || [],
    }));

    storePriceHistory(listings, query).catch(() => {});
    return NextResponse.json({ listings });
  } catch (err) {
    return NextResponse.json({ error: 'Server error', detail: String(err) }, { status: 500 });
  }
}
