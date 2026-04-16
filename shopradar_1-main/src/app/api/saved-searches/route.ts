import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  parseBody, sanitiseString, sanitiseCountry,
  isValidUUID, badRequest, LIMITS,
} from '@/lib/validate';

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId');
  if (!isValidUUID(userId)) return NextResponse.json({ searches: [] });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data } = await supabase.from('saved_searches')
    .select('*').eq('user_id', userId).order('created_at', { ascending: false });

  return NextResponse.json({ searches: data || [] });
}

export async function POST(req: NextRequest) {
  const [body, err] = await parseBody(req, 4_000);
  if (err) return err;

  const { userId, query, country } = body as any;

  // ── Validate ─────────────────────────────────────────────────────────────
  if (!isValidUUID(userId)) return badRequest('Invalid userId');

  const cleanQuery = sanitiseString(query, LIMITS.SEARCH_QUERY_MAX);
  if (!cleanQuery) return badRequest('Missing or invalid query');

  const cleanCountry = sanitiseCountry(country);
  // ─────────────────────────────────────────────────────────────────────────

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data, error } = await supabase.from('saved_searches').upsert({
    user_id: userId,
    query: cleanQuery.trim().toLowerCase(),
    country: cleanCountry,
    created_at: new Date().toISOString(),
  }, { onConflict: 'user_id,query' }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ search: data });
}

export async function DELETE(req: NextRequest) {
  const [body, err] = await parseBody(req, 2_000);
  if (err) return err;

  const { userId, query } = body as any;

  // ── Validate ─────────────────────────────────────────────────────────────
  if (!isValidUUID(userId)) return badRequest('Invalid userId');
  const cleanQuery = sanitiseString(query, LIMITS.SEARCH_QUERY_MAX);
  if (!cleanQuery) return badRequest('Invalid query');
  // ─────────────────────────────────────────────────────────────────────────

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  await supabase.from('saved_searches').delete().eq('user_id', userId).eq('query', cleanQuery);
  return NextResponse.json({ success: true });
}
