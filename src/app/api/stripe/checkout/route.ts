import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

const PRICE_IDS = {
  pro: 'price_1TMIVcLzZESoqdRkX3WEaWwF',
  radar_plus: 'price_1TMIWBLzZESoqdRk9rzq8lAg',
};

export async function POST(req: NextRequest) {
  const { plan, userId, email } = await req.json();

  if (!plan || !userId || !email) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const priceId = PRICE_IDS[plan as keyof typeof PRICE_IDS];
  if (!priceId) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/settings?success=true&plan=${plan}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/pricing?cancelled=true`,
      customer_email: email,
      metadata: { userId, plan },
      subscription_data: { metadata: { userId, plan } },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
