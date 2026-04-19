import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'shopradar-secret-key-change-in-production');

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('id, email, full_name, password_hash, subscription_plan, subscription_status')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (error || !profile) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    if (!profile.password_hash) {
      return NextResponse.json({ error: 'Account not set up for password login. Please reset your password.' }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, profile.password_hash);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const token = await new SignJWT({
      id: profile.id,
      email: profile.email,
      full_name: profile.full_name,
      subscription_plan: profile.subscription_plan,
      subscription_status: profile.subscription_status,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('7d')
      .sign(SECRET);

    const res = NextResponse.json({ success: true, user: { id: profile.id, email: profile.email, full_name: profile.full_name } });
    res.cookies.set('shopradar_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });
    return res;
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Sign in failed' }, { status: 500 });
  }
}
