import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  parseBody, sanitiseString, sanitiseNumber, sanitiseCurrency,
  isValidUUID, badRequest, LIMITS,
} from '@/lib/validate';

export async function POST(req: NextRequest) {
  const [body, err] = await parseBody(req, 8_000);
  if (err) return err;

  const { userId, productName, targetPrice, currentPrice, currency, imageUrl, marketplace } = body as any;

  // ── Validate ─────────────────────────────────────────────────────────────
  if (!isValidUUID(userId)) return badRequest('Invalid userId');

  const cleanProductName = sanitiseString(productName, LIMITS.PRODUCT_NAME_MAX);
  if (!cleanProductName) return badRequest('Missing or invalid productName');

  const cleanTargetPrice = sanitiseNumber(targetPrice, 0.01, LIMITS.PRICE_MAX, -1);
  if (cleanTargetPrice < 0) return badRequest('Invalid targetPrice');

  const cleanCurrentPrice = sanitiseNumber(currentPrice, 0, LIMITS.PRICE_MAX, 0);
  const cleanCurrency = sanitiseCurrency(currency);

  // imageUrl is optional — must be http/https if provided
  let cleanImageUrl = '';
  if (imageUrl) {
    try {
      const u = new URL(String(imageUrl).slice(0, LIMITS.URL_MAX));
      if (u.protocol === 'http:' || u.protocol === 'https:') cleanImageUrl = u.toString();
    } catch { /* ignore bad URLs */ }
  }

  const cleanMarketplace = sanitiseString(marketplace, LIMITS.MARKETPLACE_MAX) ?? 'Any marketplace';
  // ─────────────────────────────────────────────────────────────────────────

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data, error } = await supabase.from('price_alerts').insert({
    user_id: userId,
    product_name: cleanProductName,
    target_price: cleanTargetPrice,
    current_price: cleanCurrentPrice,
    currency: cleanCurrency,
    image_url: cleanImageUrl,
    marketplace: cleanMarketplace,
    alert_status: 'Active',
    email_enabled: true,
    price_history: [],
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ alert: data });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  // ── Validate ─────────────────────────────────────────────────────────────
  const alertId = searchParams.get('id');
  const userId  = searchParams.get('userId');
  if (!isValidUUID(alertId)) return badRequest('Invalid alert id');
  if (!isValidUUID(userId))  return badRequest('Invalid userId');
  // ─────────────────────────────────────────────────────────────────────────

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { error } = await supabase.from('price_alerts')
    .delete()
    .eq('id', alertId)
    .eq('user_id', userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
