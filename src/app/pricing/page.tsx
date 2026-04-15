'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/AppLayout';

const PLANS = [
  {
    name: 'Free',
    price: { monthly: 0, annual: 0 },
    description: 'Perfect for casual shoppers',
    color: 'hsl(var(--muted-foreground))',
    bg: 'hsl(var(--card))',
    border: 'hsl(var(--border))',
    cta: 'Get started free',
    ctaStyle: 'outline',
    popular: false,
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
    name: 'Pro',
    price: { monthly: 7.99, annual: 5.99 },
    description: 'For smart, regular shoppers',
    color: 'hsl(var(--primary))',
    bg: 'hsl(var(--card))',
    border: 'hsl(var(--primary) / 0.4)',
    cta: 'Start Pro',
    ctaStyle: 'outline-primary',
    popular: false,
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
    name: 'Radar+',
    price: { monthly: 14.99, annual: 10.99 },
    description: 'For serious deal hunters',
    color: 'white',
    bg: 'hsl(var(--primary))',
    border: 'hsl(var(--primary))',
    cta: 'Get Radar+',
    ctaStyle: 'solid-white',
    popular: true,
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

const Check = ({ color }: { color: string }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
    <circle cx="8" cy="8" r="7" fill={color} fillOpacity="0.15"/>
    <path d="M5 8l2 2 4-4" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const Cross = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
    <circle cx="8" cy="8" r="7" fill="currentColor" fillOpacity="0.06"/>
    <path d="M6 6l4 4M10 6l-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

export default function PricingPage() {
  const [annual, setAnnual] = useState(false);

  return (
    <AppLayout dotVariant="search">
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '56px 24px 100px', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>

        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '6px 14px', borderRadius: 100, background: 'hsl(var(--primary) / 0.08)', border: '1px solid hsl(var(--primary) / 0.15)', fontSize: 12, color: 'hsl(var(--primary))', fontWeight: 600, marginBottom: 20 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'hsl(var(--primary))', display: 'inline-block' }} />
            Simple, transparent pricing
          </div>
          <h1 style={{ fontWeight: 800, fontSize: 'clamp(36px, 5vw, 64px)', letterSpacing: '-0.03em', lineHeight: 1.05, marginBottom: 16, color: 'hsl(var(--foreground))' }}>
            Save more than you spend
          </h1>
          <p style={{ fontSize: 18, color: 'hsl(var(--muted-foreground))', maxWidth: 480, margin: '0 auto 28px', lineHeight: 1.6 }}>
            Find one good deal and ShopRadar pays for itself. Most members save hundreds per year.
          </p>

          {/* Annual toggle */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '6px 6px 6px 16px', borderRadius: 100, background: 'hsl(var(--card))', border: '1.5px solid hsl(var(--border))' }}>
            <span style={{ fontSize: 13, color: annual ? 'hsl(var(--muted-foreground))' : 'hsl(var(--foreground))', fontWeight: annual ? 400 : 600 }}>Monthly</span>
            <button onClick={() => setAnnual(a => !a)} style={{ width: 42, height: 24, borderRadius: 100, border: 'none', cursor: 'pointer', background: annual ? 'hsl(var(--primary))' : 'hsl(var(--muted))', position: 'relative', transition: 'background 0.2s' }}>
              <span style={{ position: 'absolute', top: 3, left: annual ? 21 : 3, width: 18, height: 18, borderRadius: '50%', background: 'white', transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
            </button>
            <span style={{ fontSize: 13, color: annual ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))', fontWeight: annual ? 600 : 400 }}>Annual</span>
            {annual && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 100, background: 'hsl(var(--success) / 0.12)', color: 'hsl(var(--success))', fontWeight: 700 }}>Save 25%</span>}
          </div>
        </div>

        {/* Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, alignItems: 'start' }}>
          {PLANS.map((plan, i) => (
            <div key={plan.name} style={{
              background: plan.bg,
              border: `1.5px solid ${plan.border}`,
              borderRadius: 20,
              overflow: 'hidden',
              position: 'relative',
              transform: plan.popular ? 'scale(1.03)' : 'none',
              boxShadow: plan.popular ? '0 20px 60px hsl(var(--primary) / 0.25)' : '0 2px 12px rgba(0,0,0,0.06)',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}>
              {plan.popular && (
                <div style={{ position: 'absolute', top: 16, right: 16, fontSize: 10, fontWeight: 800, padding: '3px 10px', borderRadius: 100, background: 'rgba(255,255,255,0.2)', color: 'white', letterSpacing: '0.06em' }}>
                  MOST POPULAR
                </div>
              )}

              <div style={{ padding: '28px 28px 24px' }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: plan.popular ? 'rgba(255,255,255,0.7)' : 'hsl(var(--muted-foreground))', marginBottom: 6, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{plan.name}</p>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, marginBottom: 6 }}>
                  <span style={{ fontSize: 48, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1, color: plan.popular ? 'white' : 'hsl(var(--foreground))' }}>
                    {plan.price[annual ? 'annual' : 'monthly'] === 0 ? 'Free' : `$${plan.price[annual ? 'annual' : 'monthly']}`}
                  </span>
                  {plan.price.monthly > 0 && (
                    <span style={{ fontSize: 14, color: plan.popular ? 'rgba(255,255,255,0.6)' : 'hsl(var(--muted-foreground))', paddingBottom: 8 }}>/mo</span>
                  )}
                </div>
                <p style={{ fontSize: 13, color: plan.popular ? 'rgba(255,255,255,0.65)' : 'hsl(var(--muted-foreground))', marginBottom: 24, lineHeight: 1.5 }}>{plan.description}</p>

                <Link href="/sign-up-login" style={{ textDecoration: 'none', display: 'block' }}>
                  <button style={{
                    width: '100%', padding: '12px', borderRadius: 100, fontSize: 14, fontWeight: 700, cursor: 'pointer',
                    fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                    transition: 'all 0.15s',
                    ...(plan.ctaStyle === 'solid-white'
                      ? { background: 'white', color: 'hsl(var(--primary))', border: 'none', boxShadow: '0 2px 12px rgba(255,255,255,0.3)' }
                      : plan.ctaStyle === 'outline-primary'
                      ? { background: 'hsl(var(--primary) / 0.08)', color: 'hsl(var(--primary))', border: '1.5px solid hsl(var(--primary) / 0.3)' }
                      : { background: 'hsl(var(--muted))', color: 'hsl(var(--foreground))', border: '1.5px solid hsl(var(--border))' }
                    ),
                  }}>
                    {plan.cta}
                  </button>
                </Link>
              </div>

              <div style={{ borderTop: `1px solid ${plan.popular ? 'rgba(255,255,255,0.15)' : 'hsl(var(--border))'}`, padding: '20px 28px 28px' }}>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {plan.features.map((f, j) => (
                    <li key={j} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: f.included ? (plan.popular ? 'white' : 'hsl(var(--foreground))') : plan.popular ? 'rgba(255,255,255,0.35)' : 'hsl(var(--muted-foreground))' }}>
                      {f.included
                        ? <Check color={plan.popular ? 'white' : 'hsl(var(--success))'} />
                        : <span style={{ color: plan.popular ? 'rgba(255,255,255,0.3)' : 'hsl(var(--muted-foreground))' }}><Cross /></span>
                      }
                      {f.text}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* FAQ / trust row */}
        <div style={{ marginTop: 64, textAlign: 'center' }}>
          <p style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))', marginBottom: 20 }}>
            Cancel anytime · No credit card required for Free · 7-day money back guarantee
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 32, flexWrap: 'wrap' }}>
            {['🔒 Secure payments via Stripe', '📧 Instant email confirmation', '🇦🇺 Prices in AUD'].map((s, i) => (
              <span key={i} style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))' }}>{s}</span>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
