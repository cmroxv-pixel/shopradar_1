'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/contexts/AuthContext';

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: { monthly: 0, annual: 0 },
    description: 'Perfect for casual shoppers',
    highlight: false,
    cta: 'Get started free',
    features: [
      { text: '5 searches per day', included: true },
      { text: '3 watchlist items', included: true },
      { text: '30-day price history', included: true },
      { text: 'Top 10 listings', included: true },
      { text: 'Basic price alerts', included: true },
      { text: 'AI buy recommendations', included: false },
      { text: 'Email price drop alerts', included: false },
      { text: 'Site screenshot preview', included: false },
      { text: 'SMS alerts', included: false },
      { text: 'CSV export', included: false },
      { text: 'Priority scanning', included: false },
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: { monthly: 7.99, annual: 5.99 },
    description: 'For smart, regular shoppers',
    highlight: false,
    cta: 'Start Pro',
    features: [
      { text: 'Unlimited searches', included: true },
      { text: '25 watchlist items', included: true },
      { text: '90-day price history', included: true },
      { text: 'All 40+ marketplaces', included: true },
      { text: 'Price drop alerts', included: true },
      { text: 'AI buy recommendations', included: true },
      { text: 'Email price drop alerts', included: true },
      { text: 'Site screenshot preview', included: true },
      { text: 'SMS alerts', included: false },
      { text: 'CSV export', included: false },
      { text: 'Priority scanning', included: false },
    ],
  },
  {
    id: 'radar_plus',
    name: 'Radar+',
    price: { monthly: 14.99, annual: 10.99 },
    description: 'For serious deal hunters',
    highlight: true,
    cta: 'Get Radar+',
    features: [
      { text: 'Unlimited searches', included: true },
      { text: 'Unlimited watchlist', included: true },
      { text: '1-year price history', included: true },
      { text: 'All 40+ marketplaces', included: true },
      { text: 'Price drop alerts', included: true },
      { text: 'AI buy recommendations', included: true },
      { text: 'Email price drop alerts', included: true },
      { text: 'Site screenshot preview', included: true },
      { text: 'SMS alerts', included: true },
      { text: 'CSV export', included: true },
      { text: 'Priority scanning', included: true },
    ],
  },
];

const Check = ({ white }: { white?: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
    <circle cx="8" cy="8" r="7" fill={white ? 'rgba(255,255,255,0.2)' : 'hsl(var(--success) / 0.15)'}/>
    <path d="M5 8l2 2 4-4" stroke={white ? 'white' : 'hsl(var(--success))'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const Cross = ({ white }: { white?: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
    <circle cx="8" cy="8" r="7" fill={white ? 'rgba(255,255,255,0.06)' : 'hsl(var(--muted))'}/>
    <path d="M6 6l4 4M10 6l-4 4" stroke={white ? 'rgba(255,255,255,0.3)' : 'hsl(var(--muted-foreground))'} strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

export default function PricingPage() {
  const [annual, setAnnual] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const { user } = useAuth();
  const router = useRouter();

  const handleCheckout = async (planId: string) => {
    if (planId === 'free') {
      router.push('/sign-up-login');
      return;
    }
    if (!user) {
      router.push('/sign-up-login?redirect=/pricing');
      return;
    }
    setLoading(planId);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId, userId: user.id, email: user.email }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {
      alert('Something went wrong. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <AppLayout dotVariant="search">
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '56px 24px 100px', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>

        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: 52 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '6px 14px', borderRadius: 100, background: 'hsl(var(--primary) / 0.08)', border: '1px solid hsl(var(--primary) / 0.15)', fontSize: 12, color: 'hsl(var(--primary))', fontWeight: 600, marginBottom: 20 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'hsl(var(--primary))', display: 'inline-block' }} />
            Simple, transparent pricing
          </div>
          <h1 style={{ fontWeight: 800, fontSize: 'clamp(36px, 5vw, 60px)', letterSpacing: '-0.03em', lineHeight: 1.05, marginBottom: 14, color: 'hsl(var(--foreground))' }}>
            Save more than you spend
          </h1>
          <p style={{ fontSize: 17, color: 'hsl(var(--muted-foreground))', maxWidth: 460, margin: '0 auto 28px', lineHeight: 1.6 }}>
            Find one good deal and ShopRadar pays for itself. Most members save hundreds per year.
          </p>

          {/* Toggle */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '6px 6px 6px 16px', borderRadius: 100, background: 'hsl(var(--card))', border: '1.5px solid hsl(var(--border))' }}>
            <span style={{ fontSize: 13, color: annual ? 'hsl(var(--muted-foreground))' : 'hsl(var(--foreground))', fontWeight: annual ? 400 : 600 }}>Monthly</span>
            <button onClick={() => setAnnual(a => !a)} style={{ width: 42, height: 24, borderRadius: 100, border: 'none', cursor: 'pointer', background: annual ? 'hsl(var(--primary))' : 'hsl(var(--muted))', position: 'relative', transition: 'background 0.2s' }}>
              <span style={{ position: 'absolute', top: 3, left: annual ? 21 : 3, width: 18, height: 18, borderRadius: '50%', background: 'white', transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
            </button>
            <span style={{ fontSize: 13, color: annual ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))', fontWeight: annual ? 600 : 400 }}>Annual</span>
            {annual && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 100, background: 'hsl(var(--success) / 0.12)', color: 'hsl(var(--success))', fontWeight: 700 }}>Save 25%</span>}
          </div>
        </div>

        {/* Plan cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, alignItems: 'start' }}>
          {PLANS.map(plan => (
            <div key={plan.id} style={{
              background: plan.highlight ? 'hsl(var(--primary))' : 'hsl(var(--card))',
              border: plan.highlight ? 'none' : `1.5px solid ${plan.id === 'pro' ? 'hsl(var(--primary) / 0.3)' : 'hsl(var(--border))'}`,
              borderRadius: 20, overflow: 'hidden',
              transform: plan.highlight ? 'scale(1.04)' : 'none',
              boxShadow: plan.highlight ? '0 20px 60px hsl(var(--primary) / 0.3)' : '0 2px 12px rgba(0,0,0,0.05)',
              position: 'relative',
            }}>
              {plan.highlight && (
                <div style={{ position: 'absolute', top: 14, right: 14, fontSize: 9, fontWeight: 800, padding: '3px 10px', borderRadius: 100, background: 'rgba(255,255,255,0.18)', color: 'white', letterSpacing: '0.06em' }}>
                  MOST POPULAR
                </div>
              )}

              <div style={{ padding: '28px 28px 22px' }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: plan.highlight ? 'rgba(255,255,255,0.6)' : 'hsl(var(--muted-foreground))', marginBottom: 6, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{plan.name}</p>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, marginBottom: 5 }}>
                  <span style={{ fontSize: 46, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1, color: plan.highlight ? 'white' : 'hsl(var(--foreground))' }}>
                    {plan.price.monthly === 0 ? 'Free' : `$${plan.price[annual ? 'annual' : 'monthly']}`}
                  </span>
                  {plan.price.monthly > 0 && (
                    <span style={{ fontSize: 13, color: plan.highlight ? 'rgba(255,255,255,0.55)' : 'hsl(var(--muted-foreground))', paddingBottom: 8 }}>/mo</span>
                  )}
                </div>
                {annual && plan.price.monthly > 0 && (
                  <p style={{ fontSize: 11, color: plan.highlight ? 'rgba(255,255,255,0.5)' : 'hsl(var(--muted-foreground))', marginBottom: 4 }}>
                    Billed annually (${(plan.price.annual * 12).toFixed(0)}/yr)
                  </p>
                )}
                <p style={{ fontSize: 13, color: plan.highlight ? 'rgba(255,255,255,0.6)' : 'hsl(var(--muted-foreground))', marginBottom: 22, lineHeight: 1.5 }}>{plan.description}</p>

                <button
                  onClick={() => handleCheckout(plan.id)}
                  disabled={loading === plan.id}
                  style={{
                    width: '100%', padding: '12px', borderRadius: 100,
                    fontSize: 14, fontWeight: 700, cursor: loading === plan.id ? 'wait' : 'pointer',
                    fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                    transition: 'all 0.15s', border: 'none',
                    opacity: loading === plan.id ? 0.7 : 1,
                    ...(plan.highlight
                      ? { background: 'white', color: 'hsl(var(--primary))' }
                      : plan.id === 'pro'
                      ? { background: 'hsl(var(--primary) / 0.1)', color: 'hsl(var(--primary))', border: '1.5px solid hsl(var(--primary) / 0.3)' }
                      : { background: 'hsl(var(--muted))', color: 'hsl(var(--foreground))' }
                    ),
                  }}
                >
                  {loading === plan.id ? 'Loading…' : plan.cta}
                </button>
              </div>

              <div style={{ borderTop: `1px solid ${plan.highlight ? 'rgba(255,255,255,0.12)' : 'hsl(var(--border))'}`, padding: '20px 28px 28px' }}>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {plan.features.map((f, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: f.included ? (plan.highlight ? 'white' : 'hsl(var(--foreground))') : plan.highlight ? 'rgba(255,255,255,0.3)' : 'hsl(var(--muted-foreground))' }}>
                      {f.included ? <Check white={plan.highlight} /> : <Cross white={plan.highlight} />}
                      {f.text}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* Trust row */}
        <div style={{ marginTop: 52, textAlign: 'center' }}>
          <p style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))', marginBottom: 16 }}>
            Cancel anytime · No credit card required for Free · 7-day money back guarantee
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 28, flexWrap: 'wrap' }}>
            {['🔒 Secure payments via Stripe', '📧 Instant confirmation', '🇦🇺 Prices in AUD'].map((s, i) => (
              <span key={i} style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))' }}>{s}</span>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
