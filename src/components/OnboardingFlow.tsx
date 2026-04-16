'use client';
import React, { useState } from 'react';
import { X, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import AppLogo from '@/components/ui/AppLogo';

const STEPS = [
  {
    id: 1,
    title: 'Set your location',
    description: "Tell ShopRadar where you are so we can show accurate delivery times and local prices from stores near you.",
    tip: 'Tap the location bar on the search page to set your country, state, and suburb.',
  },
  {
    id: 2,
    title: 'Search any product',
    description: "Type any product name — headphones, laptops, sneakers — and we'll scan 40+ global marketplaces in real time.",
    tip: 'Be specific! "Sony WH-1000XM5" gets better results than just "headphones".',
  },
  {
    id: 3,
    title: 'Track prices on your watchlist',
    description: "Tap the bookmark icon on any listing to add it to your watchlist. We'll track the price and alert you when it drops.",
    tip: 'Set a target price alert to get notified exactly when a deal hits your budget.',
  },
  {
    id: 4,
    title: 'Get price drop alerts',
    description: 'ShopRadar monitors your watchlist and sends you notifications when prices drop to your target.',
    tip: 'Enable email alerts in your watchlist to get weekly deal digests straight to your inbox.',
  },
];

const PRODUCTS = [
  { name: 'Sony WH-1000XM5', price: 'A$279', store: 'Amazon', badge: '★ Best Price', img: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=120&h=80&fit=crop', badgeColor: '#16a34a' },
  { name: 'iPhone 15 Pro', price: 'A$1,499', store: 'JB Hi-Fi', badge: '⚡ Fastest', img: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=120&h=80&fit=crop', badgeColor: '#2563eb' },
  { name: 'Samsung 4K TV', price: 'A$899', store: 'Harvey Norman', badge: 'Verified', img: 'https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=120&h=80&fit=crop', badgeColor: '#6b7280' },
];

function MockTopbar() {
  return (
    <div style={{ padding: '8px 12px', background: '#0a0a0a', borderBottom: '1px solid #222', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <img src="/assets/images/Untitled-1775641794744.png" alt="logo" style={{ width: 18, height: 18, filter: 'brightness(0) invert(1)', objectFit: 'contain' }} />
        <span style={{ fontSize: 10, fontWeight: 700, color: '#fff' }}>ShopRadar</span>
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        {['#ff5f57', '#febc2e', '#28c840'].map((c, i) => <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: c }} />)}
      </div>
    </div>
  );
}

function AppMockup({ step }: { step: number }) {
  return (
    <div style={{ background: '#111', borderRadius: 14, overflow: 'hidden', border: '1.5px solid #222', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
      <MockTopbar />

      {step === 0 && (
        <div style={{ padding: '10px 12px' }}>
          <div style={{ background: '#1d4ed820', border: '1.5px solid #1d4ed8', borderRadius: 8, padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><circle cx="5" cy="4" r="2" stroke="#1d4ed8" strokeWidth="1.2"/><path d="M5 9C5 9 2 6.5 2 4a3 3 0 0 1 6 0c0 2.5-3 5-3 5z" stroke="#1d4ed8" strokeWidth="1.2"/></svg>
            <span style={{ fontSize: 9, color: '#1d4ed8', fontWeight: 600 }}>United States, New York, Brooklyn</span>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {PRODUCTS.slice(0, 2).map((p, i) => (
              <div key={i} style={{ flex: 1, background: '#1a1a1a', borderRadius: 8, overflow: 'hidden', border: '1px solid #222' }}>
                <img src={p.img} alt={p.name} style={{ width: '100%', height: 48, objectFit: 'cover' }} />
                <div style={{ padding: '4px 6px' }}>
                  <p style={{ fontSize: 8, fontWeight: 600, color: '#fff', margin: 0 }}>{p.name}</p>
                  <p style={{ fontSize: 9, fontWeight: 800, color: '#fff', margin: '2px 0 0' }}>{p.price}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {step === 1 && (
        <div style={{ padding: '10px 12px' }}>
          <div style={{ background: '#1a1a1a', borderRadius: 8, padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, border: '1px solid #333' }}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><circle cx="4.5" cy="4.5" r="3" stroke="#666" strokeWidth="1.2"/><path d="M7 7L9 9" stroke="#666" strokeWidth="1.2" strokeLinecap="round"/></svg>
            <span style={{ fontSize: 9, color: '#666' }}>Sony WH-1000XM5...</span>
            <div style={{ marginLeft: 'auto', background: '#1d4ed8', borderRadius: 6, padding: '2px 7px', fontSize: 8, color: 'white', fontWeight: 700 }}>Search</div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {PRODUCTS.map((p, i) => (
              <div key={i} style={{ flex: 1, background: '#1a1a1a', borderRadius: 8, overflow: 'hidden', border: '1px solid #222' }}>
                <div style={{ position: 'relative' }}>
                  <img src={p.img} alt={p.name} style={{ width: '100%', height: 44, objectFit: 'cover' }} />
                  <span style={{ position: 'absolute', top: 3, left: 3, fontSize: 6, fontWeight: 700, padding: '1px 4px', borderRadius: 3, background: p.badgeColor, color: 'white' }}>{p.badge}</span>
                </div>
                <div style={{ padding: '3px 5px 5px' }}>
                  <p style={{ fontSize: 7, color: '#aaa', margin: 0 }}>{p.store}</p>
                  <p style={{ fontSize: 9, fontWeight: 800, color: '#fff', margin: '1px 0 0' }}>{p.price}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {step === 2 && (
        <div style={{ padding: '10px 12px' }}>
          <p style={{ fontSize: 8, fontWeight: 700, color: '#666', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>My Watchlist</p>
          {PRODUCTS.slice(0, 2).map((p, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#1a1a1a', borderRadius: 8, padding: '6px 8px', marginBottom: 5, border: '1px solid #222' }}>
              <img src={p.img} alt={p.name} style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'cover' }} />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 8, fontWeight: 600, color: '#fff', margin: 0 }}>{p.name}</p>
                <p style={{ fontSize: 7, color: '#16a34a', margin: '1px 0 0', fontWeight: 700 }}>Price dropped!</p>
              </div>
              <span style={{ fontSize: 9, fontWeight: 800, color: '#fff' }}>{p.price}</span>
            </div>
          ))}
        </div>
      )}

      {step === 3 && (
        <div style={{ padding: '10px 12px' }}>
          <div style={{ background: '#16a34a18', border: '1.5px solid #16a34a40', borderRadius: 10, padding: '8px 10px', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a' }} />
              <span style={{ fontSize: 8, fontWeight: 700, color: '#16a34a' }}>Price Drop Alert!</span>
            </div>
            <p style={{ fontSize: 8, color: '#ccc', margin: 0 }}>Sony WH-1000XM5 dropped to <strong style={{ color: '#16a34a' }}>A$279</strong> — your target was A$300</p>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {[{ label: 'Active Alerts', value: '3', color: '#1d4ed8' }, { label: 'Triggered', value: '1', color: '#16a34a' }].map((s, i) => (
              <div key={i} style={{ flex: 1, background: '#1a1a1a', borderRadius: 8, padding: '8px', border: '1px solid #222', textAlign: 'center' as const }}>
                <p style={{ fontSize: 14, fontWeight: 800, color: s.color, margin: 0 }}>{s.value}</p>
                <p style={{ fontSize: 7, color: '#666', margin: '2px 0 0' }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface OnboardingFlowProps {
  onComplete: () => void;
}

export default function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState(0);
  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-md" />
      <div className="relative z-10 w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">

        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <AppLogo size={28} />
            <span className="font-bold text-sm text-foreground">Welcome to ShopRadar</span>
          </div>
          <button onClick={onComplete} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-150">
            <X size={15} />
          </button>
        </div>

        <div className="flex items-center gap-1.5 px-5 pt-4">
          {STEPS.map((_, i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? 'bg-primary w-6' : i < step ? 'bg-primary/40 w-3' : 'bg-muted w-3'}`} />
          ))}
        </div>

        <div style={{ margin: '16px 20px 0' }}>
          <AppMockup step={step} />
        </div>

        <div className="px-5 py-5">
          <h2 className="text-xl font-bold text-foreground mb-2">{current.title}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">{current.description}</p>
          <div className="flex items-start gap-2.5 p-3 bg-primary/5 border border-primary/15 rounded-xl">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, marginTop: 1, color: 'hsl(var(--primary))' }}>
              <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.4"/>
              <path d="M7 4v3M7 9.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            <p className="text-xs text-foreground/80 leading-relaxed">{current.tip}</p>
          </div>
        </div>

        <div className="flex items-center justify-between px-5 pb-5 gap-3">
          <button onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted border border-border transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed">
            <ChevronLeft size={14} /> Back
          </button>
          <button onClick={() => isLast ? onComplete() : setStep(s => s + 1)} className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold bg-primary text-white hover:opacity-90 active:scale-95 transition-all duration-150 shadow-sm shadow-primary/20">
            {isLast ? <><Check size={14} /> Get started</> : <>Next <ChevronRight size={14} /></>}
          </button>
        </div>

      </div>
    </div>
  );
}
