import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { parseBody, sanitiseEmail, isValidUUID, badRequest } from '@/lib/validate';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

// Allowlist — the only valid plan → priceId mappings
const PRICE_IDS: Record<string, string> = {
  pro:        'price_1TMIVcLzZESoqdRkX3WEaWwF',
  radar_plus: 'price_1TMIWBLzZESoqdRk9rzq8lAg',
};

export async function POST(req: NextRequest) {
  const [body, err] = await parseBody(req, 4_000);
  if (err) return err;

  const { plan, userId, email } = body as any;

  // ── Validate ─────────────────────────────────────────────────────────────
  if (!isValidUUID(userId))           return badRequest('Invalid userId');

  const cleanEmail = sanitiseEmail(email);
  if (!cleanEmail)                     return badRequest('Invalid email address');

  // plan must be one of our known keys — never pass arbitrary strings to Stripe
  if (typeof plan !== 'string' || !PRICE_IDS[plan])
    return badRequest('Invalid plan');

  const priceId = PRICE_IDS[plan];
  // ─────────────────────────────────────────────────────────────────────────

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/settings?success=true&plan=${plan}`,
      cancel_url:  `${process.env.NEXT_PUBLIC_SITE_URL}/pricing?cancelled=true`,
      customer_email: cleanEmail,
      metadata: { userId, plan },
      subscription_data: { metadata: { userId, plan } },
    });

    return NextResponse.json({ url: session.url });
  } catch {
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}
