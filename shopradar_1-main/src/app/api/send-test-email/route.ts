import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parseBody, sanitiseEmail, badRequest } from '@/lib/validate';

const ALLOWED_TYPES = new Set(['price_alert', 'weekly_digest', 'both']);

export async function POST(req: NextRequest) {
  // Auth check first — only authenticated users can trigger test emails
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [body, err] = await parseBody(req, 2_000);
  if (err) return err;

  // ── Validate ─────────────────────────────────────────────────────────────
  // Always send to the session email — ignore any client-supplied email
  // to prevent using this endpoint to send email to arbitrary addresses.
  const sessionEmail = session.user?.email;
  if (!sessionEmail) return badRequest('No email on session');

  const rawType = (body as any).type;
  const cleanType = typeof rawType === 'string' && ALLOWED_TYPES.has(rawType) ? rawType : 'both';
  // ─────────────────────────────────────────────────────────────────────────

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const res = await fetch(`${supabaseUrl}/functions/v1/send-test-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({ email: sessionEmail, type: cleanType }),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json({ error: data.error || 'Failed to send test email' }, { status: res.status });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
