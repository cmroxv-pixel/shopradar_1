import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ error: 'Missing query' }, { status: 400 });
  }

  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Missing Perplexity API key' }, { status: 500 });
  }

  const today = new Date().toISOString().split('T')[0];

  const prompt = `Today is ${today}. Search the web RIGHT NOW for the current live price of "${query}" available to purchase online today.

Find this product from EVERY possible source including:
- Major retailers (Amazon, eBay, Walmart, JB Hi-Fi, Harvey Norman, Officeworks, Currys, Best Buy, Target, Costco)
- Boutique and independent online stores
- Niche and specialist retailers
- International stores that ship worldwide
- Second hand marketplaces (eBay, Depop, Etsy, Gumtree, Facebook Marketplace)
- Auction sites
- Rare, vintage and hard to find product sellers
- Specialty importers and grey market sellers

You MUST return the current real-time price as it appears on the website TODAY — not a cached or old price.

Return ONLY a raw JSON array of 25+ listings. Each object must have:
- title: full product title as shown on the listing
- price: current live price as a number (e.g. 299.99) — no currency symbols
- currency: 3-letter ISO code based on the store country (e.g. "AUD", "USD", "GBP", "EUR")
- marketplace: name of the store or website
- url: the EXACT direct URL to the product listing page from your live search — real URLs only, never invented
 rocket-update
- condition: "New", "Used", "Refurbished", or "Vintage" - location: country the seller ships from (e.g."Australia", "USA", "UK", "Japan")

- condition: "New", "Used", "Refurbished", or "Vintage"
- location: country the seller ships from (e.g. "Australia", "USA", "UK", "Japan")
 main
- in_stock: true or false based on what the listing says right now

Strict rules:
- Every URL must be a real page you actually found in your search right now — never invent or guess URLs
- URL must link directly to the product page, not a homepage or category page
- Price must be the current live price shown on the site today
- Remove any listing with price = 0 or missing URL
- Include as many different stores as possible — not just Amazon and eBay
- Dig deep — find rare, obscure and hard to find listings too
- Return ONLY the raw JSON array — no explanation, no markdown, no code fences`;

  try {
    const res = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: [
          {
            role: 'system',
            content: `You are a real-time product price search engine. You search the live web right now to find current prices for any product from any store worldwide. You specialise in finding hard-to-find, rare, niche and obscure products. You only return URLs you have genuinely found in your live search — you never hallucinate, guess or invent URLs or prices. You always return valid raw JSON only with no markdown or explanation.`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 6000,
        temperature: 0.1,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: 'Perplexity API error', detail: err }, { status: 500 });
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content ?? '';
    const cleaned = text.replace(/```json|```/g, '').trim();

    let raw: any[] = [];
    try {
      raw = JSON.parse(cleaned);
    } catch {
      const match = cleaned.match(/\[[\s\S]*\]/);
      if (match) {
        try { raw = JSON.parse(match[0]); } catch { return NextResponse.json({ listings: [] }); }
      }
    }

    const listings = raw
      .filter((l: any) => {
        if (!l.url || l.url === '#' || l.url === '') return false;
        if (!l.price || Number(l.price) <= 0) return false;
        try {
          const parsed = new URL(l.url);
          if (parsed.pathname === '/' || parsed.pathname === '') return false;
          return true;
        } catch { return false; }
      })
      .map((l: any) => ({
        id: `perplexity-${Math.random().toString(36).slice(2, 9)}`,
        title: String(l.title || ''),
        productName: String(l.title || ''),
        model: '',
        color: '',
        price: parseFloat(String(l.price)),
        originalPrice: parseFloat(String(l.price)),
        currency: String(l.currency || 'USD'),
        marketplace: String(l.marketplace || 'Unknown'),
        marketplaceLogo: '🛒',
        listingUrl: String(l.url),
        condition: String(l.condition || 'New'),
        location: String(l.location || ''),
        stockStatus: l.in_stock === false ? 'Out of Stock' : 'In Stock',
        sellerRating: 4.5,
        sellerReviews: 0,
        deliveryDays: 5,
        deliveryDate: '',
        shippingTier: 'Standard' as const,
        shippingCost: 0,
        freeReturns: false,
        imageUrl: '',
        priceHistory: [],
        deliveryOptions: [{ tier: 'Standard' as const, days: 5, cost: 0 }],
      }));

    return NextResponse.json({ listings });

  } catch (err) {
    return NextResponse.json({ error: 'Server error', detail: String(err) }, { status: 500 });
  }
}
