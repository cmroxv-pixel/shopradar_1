import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId');
  if (!userId) return NextResponse.json({ searches: [] });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data } = await supabase.from('saved_searches')
    .select('*').eq('user_id', userId).order('created_at', { ascending: false });

  return NextResponse.json({ searches: data || [] });
}

export async function POST(req: NextRequest) {
  const { userId, query, country } = await req.json();
  if (!userId || !query) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data, error } = await supabase.from('saved_searches').upsert({
    user_id: userId, query: query.trim().toLowerCase(), country: country || 'au',
    created_at: new Date().toISOString(),
  }, { onConflict: 'user_id,query' }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ search: data });
}

export async function DELETE(req: NextRequest) {
  const { userId, query } = await req.json();
  if (!userId || !query) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  await supabase.from('saved_searches').delete().eq('user_id', userId).eq('query', query);
  return NextResponse.json({ success: true });
}
