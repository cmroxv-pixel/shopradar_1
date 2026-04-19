import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'shopradar-secret-key-change-in-production');

export async function POST(req: NextRequest) {
  try {
    const { email, password, full_name } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    const supabase = await createClient();

    const { data: existing } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 400 });
    }

    const password_hash = await bcrypt.hash(password, 12);
    const id = crypto.randomUUID();

    const { error } = await supabase.from('user_profiles').insert({
      id,
      email: email.toLowerCase().trim(),
      full_name: full_name || '',
      password_hash,
      subscription_plan: 'free',
      subscription_status: 'inactive',
    });

    if (error) throw error;

    const token = await new SignJWT({
      id,
      email: email.toLowerCase().trim(),
      full_name: full_name || '',
      subscription_plan: 'free',
      subscription_status: 'inactive',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('7d')
      .sign(SECRET);

    const res = NextResponse.json({ success: true, user: { id, email, full_name } });
    res.cookies.set('shopradar_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });
    return res;
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Sign up failed' }, { status: 500 });
  }
}
