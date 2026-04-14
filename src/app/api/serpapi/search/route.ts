import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function isGoogleUrl(url: string): boolean {
  if (!url) return true;
  try {
    const h = new URL(url).hostname;
    return h.includes('google.com') || h.includes('googleapis.com') || h.includes('gstatic.com');
  } catch { return true; }
}

async function getDirectUrlFromImmersiveApi(
  immersiveApiUrl: string,
  marketplace: string,
  serpApiKey: string
): Promise<string> {
  try {
    const res = await fetch(`${immersiveApiUrl}&api_key=${serpApiKey}`);
    if (!res.ok) return '';
    const data = await res.json();
    const stores: any[] = data?.product_results?.stores || [];
    if (stores.length === 0) return '';
    const mLower = marketplace.toLowerCase().replace(/\s*-\s*.+$/, '').trim();
    for (const store of stores) {
      const name = (store.name || '').toLowerCase();
      const link = store.link || '';
      if (!link || isGoogleUrl(link)) continue;
      if (name.includes(mLower) || mLower.includes(name)) return link;
    }
    for (const store of stores) {
      const link = store.link || '';
      if (link && !isGoogleUrl(link)) return link;
    }
    return '';
  } catch { return ''; }
}

function buildFallbackUrl(marketplace: string, title: string, query: string): string {
  const t = encodeURIComponent(title);
  const m = marketplace.toLowerCase().trim().replace(/\s*-\s*.+$/, '');
  if (m.startsWith('ebay')) return `https://www.ebay.com.au/sch/i.html?_nkw=${t}&_sop=12`;
  if (m.includes('cash converters')) return `https://www.cashconverters.com.au/shop/search?q=${t}`;
  if (m === 'cex' || m.startsWith('cex')) return `https://au.webuy.com/search?q=${t}`;
  if (m.includes('ubuy')) return `https://www.ubuy.com.au/en/search/?q=${t}`;
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
  if (m.includes('salvos')) return `https://www.salvosstores.com.au/search?q=${t}`;
  if (m.includes('noble knight')) return `https://www.nobleknight.com/Search?search=${t}`;
  if (m.includes('super retro')) return `https://www.superretro.com.au/search?q=${t}`;
  return `https://www.google.com/search?q=${encodeURIComponent(title + ' buy')}`;
}

function parseDelivery(deliveryStr: string): {
  days: number; date: string; cost: number; tier: 'Express' | 'Standard' | 'Economy';
} {
  if (!deliveryStr) return { days: 7, date: '', cost: 0, tier: 'Standard' };
  const lower = deliveryStr.toLowerCase();
  const isExpress = lower.includes('express') || lower.includes('next day') || lower.includes('same day') || lower.includes('overnight');
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
  const tier: 'Express' | 'Standard' | 'Economy' = isExpress || days <= 2 ? 'Express' : days <= 7 ? 'Standard' : 'Economy';
  return { days, date: dateStr, cost: 0, tier };
}

// Store price snapshot in Supabase for price history
async function storePriceHistory(listings: any[], query: string) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) return;

    const supabase = createClient(supabaseUrl, supabaseKey);
    const today = new Date().toISOString().split('T')[0];

    for (const listing of listings.slice(0, 5)) {
      if (!listing.price || listing.price <= 0) continue;
      const { data: existing } = await supabase
        .from('price_snapshots')
        .select('id')
        .eq('product_query', query.toLowerCase())
        .eq('marketplace', listing.marketplace)
        .eq('snapshot_date', today)
        .single();

      if (!existing) {
        await supabase.from('price_snapshots').insert({
          product_query: query.toLowerCase(),
          marketplace: listing.marketplace,
          price: listing.price,
          currency: listing.currency,
          listing_url: listing.listingUrl,
          title: listing.title,
          snapshot_date: today,
        });
      }
    }
  } catch { /* non-fatal */ }
}

// Fetch price history for a query
async function fetchPriceHistory(query: string): Promise<Record<string, any[]>> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) return {};

    const supabase = createClient(supabaseUrl, supabaseKey);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const { data } = await supabase
      .from('price_snapshots')
      .select('marketplace, price, snapshot_date')
      .eq('product_query', query.toLowerCase())
      .gte('snapshot_date', thirtyDaysAgo)
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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q');
  const country = (searchParams.get('country') || 'au').toLowerCase().slice(0, 2);

  if (!query) return NextResponse.json({ error: 'Missing query' }, { status: 400 });

  const serpApiKey = process.env.SERPAPI_KEY;
  if (!serpApiKey) return NextResponse.json({ error: 'Missing SERPAPI_KEY' }, { status: 500 });

  try {
    const shoppingParams = new URLSearchParams({
      engine: 'google_shopping', q: query, api_key: serpApiKey,
      num: '20', hl: 'en', gl: country,
    });

    const shoppingRes = await fetch(`https://serpapi.com/search.json?${shoppingParams}`);
    if (!shoppingRes.ok) {
      const err = await shoppingRes.text();
      return NextResponse.json({ error: 'SerpApi error', detail: err }, { status: 500 });
    }

    const shoppingData = await shoppingRes.json();
    const rawResults: any[] = (shoppingData.shopping_results || []).filter(
      (item: any) => (item.extracted_price || item.price) && item.source && item.title
    );

    const currency = country === 'au' ? 'AUD' : country === 'gb' ? 'GBP' : country === 'us' ? 'USD' : 'AUD';

    // Fetch price history in parallel with URL resolution
    const [historyByMarketplace] = await Promise.all([
      fetchPriceHistory(query),
    ]);

    const topResults = rawResults.slice(0, 15);

    const listings = await Promise.all(
      topResults.map(async (item: any, idx: number) => {
        const rawPrice = typeof item.extracted_price === 'number'
          ? item.extracted_price
          : parseFloat(String(item.price || '0').replace(/[^0-9.]/g, ''));

        const marketplace = String(item.source || 'Unknown');
        const title = String(item.title || query);
        let directUrl = '';

        const immersiveUrl: string = item.serpapi_immersive_product_api || '';
        if (immersiveUrl) {
          directUrl = await getDirectUrlFromImmersiveApi(immersiveUrl, marketplace, serpApiKey);
        }
        if (!directUrl) directUrl = buildFallbackUrl(marketplace, title, query);

        const delivery = parseDelivery(String(item.delivery || ''));

        // Calculate trust score
        const reviews = typeof item.reviews === 'number' ? item.reviews : 0;
        const rating = typeof item.rating === 'number' ? item.rating : 0;
        const hasReturns = String(item.delivery || '').toLowerCase().includes('return');
        let trustScore = 0;
        if (rating >= 4.5) trustScore += 40;
        else if (rating >= 4.0) trustScore += 25;
        else if (rating >= 3.5) trustScore += 10;
        if (reviews >= 1000) trustScore += 35;
        else if (reviews >= 100) trustScore += 20;
        else if (reviews >= 10) trustScore += 10;
        if (hasReturns) trustScore += 15;
        if (['eBay', 'Amazon', 'JB Hi-Fi', 'Harvey Norman', 'Kogan', 'The Good Guys'].some(s => marketplace.includes(s))) trustScore += 10;
        const trustLabel = trustScore >= 70 ? 'Trusted' : trustScore >= 40 ? 'Verified' : 'Unverified';

        // Price history for this marketplace
        const priceHistory = historyByMarketplace[marketplace] || [];

        return {
          id: `serpapi-${idx}-${Math.random().toString(36).slice(2, 7)}`,
          title, productName: title,
          model: '', color: '',
          price: rawPrice, originalPrice: rawPrice,
          currency, marketplace, marketplaceLogo: '🛒',
          listingUrl: directUrl,
          condition: item.second_hand_condition ? 'Used' : ('New' as const),
          location: country,
          stockStatus: 'In Stock' as const,
          sellerRating: rating || 4.5,
          sellerReviews: reviews,
          deliveryDays: delivery.days,
          deliveryDate: delivery.date,
          shippingTier: delivery.tier,
          shippingCost: delivery.cost,
          freeReturns: hasReturns,
          imageUrl: item.thumbnail || '',
          priceHistory,
          trustScore,
          trustLabel,
          deliveryOptions: [{ tier: delivery.tier, days: delivery.days, cost: delivery.cost }],
          rawDelivery: String(item.delivery || ''),
        };
      })
    );

    // Store today's prices for history (non-blocking)
    storePriceHistory(listings, query).catch(() => {});

    return NextResponse.json({ listings });
  } catch (err) {
    return NextResponse.json({ error: 'Server error', detail: String(err) }, { status: 500 });
  }
}
