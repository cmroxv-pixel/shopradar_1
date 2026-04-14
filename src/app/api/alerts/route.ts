import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { userId, productName, targetPrice, currentPrice, currency, imageUrl, marketplace } = body;

  if (!userId || !productName || !targetPrice) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data, error } = await supabase.from('price_alerts').insert({
    user_id: userId,
    product_name: productName,
    target_price: targetPrice,
    current_price: currentPrice || 0,
    currency: currency || 'AUD',
    image_url: imageUrl || '',
    marketplace: marketplace || 'Any marketplace',
    alert_status: 'Active',
    email_enabled: true,
    price_history: [],
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ alert: data });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const alertId = searchParams.get('id');
  const userId = searchParams.get('userId');

  if (!alertId || !userId) return NextResponse.json({ error: 'Missing params' }, { status: 400 });

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
