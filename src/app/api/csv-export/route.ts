import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { listings, query } = await req.json();

  if (!listings?.length) return NextResponse.json({ error: 'No listings' }, { status: 400 });

  const headers = ['Product', 'Marketplace', 'Price (AUD)', 'Condition', 'Delivery Days', 'Shipping', 'Rating', 'Reviews', 'Trust', 'URL'];
  const rows = listings.map((l: any) => [
    `"${(l.title || l.productName || '').replace(/"/g, '""')}"`,
    `"${l.marketplace}"`,
    l.price?.toFixed(2) || '0',
    l.condition || 'New',
    l.deliveryDays || '',
    l.shippingTier || '',
    l.sellerRating || '',
    l.sellerReviews || '',
    l.trustLabel || '',
    `"${l.listingUrl || ''}"`,
  ].join(','));

  const csv = [headers.join(','), ...rows].join('\n');
  const filename = `shopradar-${query.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.csv`;

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
