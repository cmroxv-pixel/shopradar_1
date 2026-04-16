import { NextRequest, NextResponse } from 'next/server';
import { parseBody, sanitiseString, badRequest, LIMITS } from '@/lib/validate';

export async function POST(req: NextRequest) {
  const [body, err] = await parseBody(req, 2 * 1024 * 1024); // 2 MB max
  if (err) return err;

  const { listings, query } = body as any;

  // ── Validate ─────────────────────────────────────────────────────────────
  if (!Array.isArray(listings) || listings.length === 0)
    return badRequest('No listings provided');

  if (listings.length > LIMITS.LISTINGS_MAX)
    return badRequest(`Too many listings (max ${LIMITS.LISTINGS_MAX})`);

  const cleanQuery = sanitiseString(query, LIMITS.SEARCH_QUERY_MAX) ?? 'results';
  // ─────────────────────────────────────────────────────────────────────────

  const headers = ['Product', 'Marketplace', 'Price (AUD)', 'Condition', 'Delivery Days', 'Shipping', 'Rating', 'Reviews', 'Trust', 'URL'];
  const rows = listings.map((l: any) => [
    `"${String(l.title || l.productName || '').slice(0, 300).replace(/"/g, '""')}"`,
    `"${String(l.marketplace || '').slice(0, 100).replace(/"/g, '""')}"`,
    Number.isFinite(l.price) ? l.price.toFixed(2) : '0',
    ['New', 'Used', 'Refurbished', 'Vintage'].includes(l.condition) ? l.condition : 'New',
    Number.isFinite(l.deliveryDays) ? String(l.deliveryDays) : '',
    ['Express', 'Standard', 'Economy'].includes(l.shippingTier) ? l.shippingTier : '',
    Number.isFinite(l.sellerRating) ? l.sellerRating : '',
    Number.isFinite(l.sellerReviews) ? l.sellerReviews : '',
    ['Trusted', 'Verified', 'Unverified'].includes(l.trustLabel) ? l.trustLabel : '',
    // Only include http/https URLs
    (() => { try { const u = new URL(String(l.listingUrl || '')); return (u.protocol === 'http:' || u.protocol === 'https:') ? `"${u.toString()}"` : '""'; } catch { return '""'; } })(),
  ].join(','));

  const csv = [headers.join(','), ...rows].join('\n');
  const safeName = cleanQuery.replace(/[^a-z0-9]/gi, '-').toLowerCase().slice(0, 80);
  const filename = `shopradar-${safeName}-${new Date().toISOString().split('T')[0]}.csv`;

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
