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
    image: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=400&h=220&fit=crop',
    imageAlt: 'World map with location pin',
  },
  {
    id: 2,
    title: 'Search any product',
    description: "Type any product name — headphones, laptops, sneakers — and we'll scan 40+ global marketplaces in real time.",
    tip: 'Be specific! "Sony WH-1000XM5" gets better results than just "headphones".',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=220&fit=crop',
    imageAlt: 'Headphones product comparison',
  },
  {
    id: 3,
    title: 'Track prices on your watchlist',
    description: "Tap the bookmark icon on any listing to add it to your watchlist. We'll track the price and alert you when it drops.",
    tip: 'Set a target price alert to get notified exactly when a deal hits your budget.',
    image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=400&h=220&fit=crop',
    imageAlt: 'Online shopping with price tracking',
  },
  {
    id: 4,
    title: 'Get price drop alerts',
    description: 'ShopRadar monitors your watchlist and sends you notifications when prices drop to your target.',
    tip: 'Enable email alerts in your watchlist to get weekly deal digests straight to your inbox.',
    image: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=400&h=220&fit=crop',
    imageAlt: 'Phone notification for price drop',
  },
];

interface OnboardingFlowProps {
  onComplete: () => void;
}

export default function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState(0);
  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];

  const handleNext = () => {
    if (isLast) { onComplete(); } else { setStep(s => s + 1); }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-md" />
      <div className="relative z-10 w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <AppLogo size={28} />
            <span className="font-bold text-sm text-foreground">Welcome to ShopRadar</span>
          </div>
          <button onClick={onComplete} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-150" aria-label="Skip onboarding">
            <X size={15} />
          </button>
        </div>
        <div className="flex items-center gap-1.5 px-5 pt-4">
          {STEPS.map((_, i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? 'bg-primary w-6' : i < step ? 'bg-primary/40 w-3' : 'bg-muted w-3'}`} />
          ))}
        </div>
        <div style={{ margin: '16px 20px 0', borderRadius: 14, overflow: 'hidden', height: 180 }}>
          <img src={current.image} alt={current.imageAlt} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
          <button onClick={handleNext} className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold bg-primary text-white hover:opacity-90 active:scale-95 transition-all duration-150 shadow-sm shadow-primary/20">
            {isLast ? <><Check size={14} /> Get started</> : <>Next <ChevronRight size={14} /></>}
          </button>
        </div>
      </div>
    </div>
  );
}
