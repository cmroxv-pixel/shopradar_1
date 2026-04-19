import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { createClient } from '@/lib/supabase/server';

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'shopradar-secret-key-change-in-production');

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('shopradar_session')?.value;
    if (!token) return NextResponse.json({ user: null });

    const { payload } = await jwtVerify(token, SECRET);

    const supabase = await createClient();
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id, email, full_name, subscription_plan, subscription_status')
      .eq('id', payload.id as string)
      .single();

    return NextResponse.json({ user: profile || payload });
  } catch {
    return NextResponse.json({ user: null });
  }
}
