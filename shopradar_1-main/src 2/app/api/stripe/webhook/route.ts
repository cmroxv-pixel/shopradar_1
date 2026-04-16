import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { isValidUUID } from '@/lib/validate';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

const VALID_PLANS = new Set(['free', 'pro', 'radar_plus']);

export async function POST(req: NextRequest) {
  // Must read raw body before any parsing — required for Stripe signature verification
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: 'Missing stripe signature or webhook secret' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch {
    // Don't leak error details to caller
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.CheckoutSession;
    const { userId, plan } = session.metadata || {};

    // Validate metadata before writing — even though we set it, be defensive
    if (isValidUUID(userId) && typeof plan === 'string' && VALID_PLANS.has(plan)) {
      await supabase.from('user_profiles').update({
        subscription_plan: plan,
        subscription_status: 'active',
        stripe_customer_id: session.customer as string,
        stripe_subscription_id: session.subscription as string,
        updated_at: new Date().toISOString(),
      }).eq('id', userId);
    }
  }

  if (
    event.type === 'customer.subscription.deleted' ||
    event.type === 'customer.subscription.paused'
  ) {
    const subscription = event.data.object as Stripe.Subscription;
    const { userId } = subscription.metadata || {};

    if (isValidUUID(userId)) {
      await supabase.from('user_profiles').update({
        subscription_plan: 'free',
        subscription_status: 'inactive',
        updated_at: new Date().toISOString(),
      }).eq('id', userId);
    }
  }

  return NextResponse.json({ received: true });
}
