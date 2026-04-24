'use client';
import { useAuth } from '@/contexts/AuthContext';
import { getEffectivePlan, canUseFeature } from '@/lib/plan';
import React, { useState, useCallback, useRef } from 'react';
import type { Listing } from './mockData';
import AppImage from '@/components/ui/AppImage';

interface ResultsGridProps {
  listings: Listing[];
  loading: boolean;
  hasSearched: boolean;
  compareItems: Listing[];
  onToggleCompare: (l: Listing) => void;
  onAddToWatchlist: (l: Listing) => void;
  displayCurrency?: string;
  exchangeRate?: number;
  selectedCategory?: string;
  onBarcodeSearch?: (query: string) => void;
}

const SYMBOLS: Record<string, string> = {
  AUD: 'A$', USD: '$', GBP: '£', EUR: '€', CAD: 'C$', JPY: '¥', NZD: 'NZ$',
};

function fmt(price: number, currency: string, displayCurrency: string, rate: number) {
  const converted = displayCurrency !== currency ? price * rate : price;
  return `${SYMBOLS[displayCurrency] || displayCurrency + ' '}${converted.toFixed(2)}`;
}

// ── Sparkline ──────────────────────────────────────────────
function Sparkline({ data }: { data: { date: string; price: number }[] }) {
  if (!data || data.length < 2) return (
    <span style={{ fontSize: 10, color: 'hsl(var(--muted-foreground))', fontStyle: 'italic' }}>No history yet</span>
  );
  const prices = data.map(d => d.price);
  const min = Math.min(...prices), max = Math.max(...prices);
  const range = max - min || 1;
  const w = 80, h = 24;
  const pts = data.map((d, i) => `${(i / (data.length - 1)) * w},${h - ((d.price - min) / range) * (h - 4) - 2}`).join(' ');
  const latest = prices[prices.length - 1], first = prices[0];
  const trend = latest < first ? 'down' : latest > first ? 'up' : 'flat';
  const color = trend === 'down' ? 'hsl(var(--success))' : trend === 'up' ? 'hsl(var(--destructive))' : 'hsl(var(--muted-foreground))';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <svg width={w} height={h} style={{ overflow: 'visible' }}>
        <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/>
      </svg>
      <span style={{ fontSize: 10, color, fontWeight: 600 }}>
        {trend === 'down' ? '↓' : trend === 'up' ? '↑' : '→'}{Math.abs(((latest - first) / first) * 100).toFixed(0)}%
      </span>
    </div>
  );
}

// ── AI Recommendation ──────────────────────────────────────
function AIRecommendation({ query, currentPrice, priceHistory, marketplace }: {
  query: string; currentPrice: number;
  priceHistory: { date: string; price: number }[]; marketplace: string;
}) {
  const { user } = useAuth();
  const plan = getEffectivePlan(user);
  const hasAI = canUseFeature(plan, 'ai_recommendations');
  const [rec, setRec] = useState<{ verdict: string; reason: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [shown, setShown] = useState(false);

  const getAnalysis = useCallback(async () => {
    if (shown) { setShown(false); return; }
    setLoading(true); setShown(true);
    try {
      const res = await window.fetch('/api/ai-recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, currentPrice, priceHistory, marketplace }),
      });
      const data = await res.json();
      setRec(data.recommendation);
    } catch { setRec(null); }
    finally { setLoading(false); }
  }, [shown, query, currentPrice, priceHistory, marketplace]);

  const verdictColor = rec?.verdict === 'Buy Now' ? 'hsl(var(--success))' : rec?.verdict === 'Wait' ? 'hsl(var(--warning))' : 'hsl(var(--primary))';

  return (
    <div style={{ marginTop: 6 }}>
      <button onClick={hasAI ? getAnalysis : () => window.location.href = '/pricing'}
        title={hasAI ? '' : 'Upgrade to Pro or Radar+ to unlock AI analysis'}
        style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, cursor: 'pointer', background: hasAI ? 'hsl(var(--muted))' : 'hsl(var(--primary) / 0.08)', border: `1px solid ${hasAI ? 'hsl(var(--border))' : 'hsl(var(--primary) / 0.3)'}`, color: hasAI ? 'hsl(var(--muted-foreground))' : 'hsl(var(--primary))', fontFamily: 'Inter, sans-serif', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4, transition: 'all 0.15s' }}>
        {loading ? '…' : '✦'} {hasAI ? (shown && !loading ? 'Hide AI' : 'AI Analysis') : '✦ Pro — AI Analysis'}
      </button>
      {shown && !loading && rec && (
        <div style={{ marginTop: 6, padding: '8px 10px', borderRadius: 8, background: 'hsl(var(--muted) / 0.5)', border: '1px solid hsl(var(--border))' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: verdictColor, marginBottom: 2 }}>{rec.verdict}</div>
          <div style={{ fontSize: 10, color: 'hsl(var(--muted-foreground))', lineHeight: 1.5 }}>{rec.reason}</div>
        </div>
      )}
    </div>
  );
}


// ── Deal Score (Radar+) ────────────────────────────────────
function DealScore({ query, price, priceHistory, marketplace, rating, reviews, shippingTier }: {
  query: string; price: number; priceHistory: any[]; marketplace: string;
  rating: number; reviews: number; shippingTier: string;
}) {
  const { user } = useAuth();
  const plan = getEffectivePlan(user);
  const hasFeature = canUseFeature(plan, 'deal_score');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [shown, setShown] = useState(false);

  const run = async () => {
    if (shown) { setShown(false); return; }
    if (!hasFeature) { window.location.href = '/pricing'; return; }
    setLoading(true); setShown(true);
    try {
      const res = await window.fetch('/api/deal-score', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, price, priceHistory, marketplace, rating, reviews, shippingTier }),
      });
      setData(await res.json());
    } catch {}
    setLoading(false);
  };

  const sc = !data ? 'hsl(var(--muted-foreground))' : data.dealScore >= 8 ? 'hsl(var(--success))' : data.dealScore >= 6 ? 'hsl(var(--primary))' : data.dealScore >= 4 ? 'hsl(var(--warning))' : 'hsl(var(--destructive))';

  return (
    <div style={{ marginTop: 4 }}>
      <button onClick={run} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, cursor: 'pointer', background: 'hsl(var(--muted))', border: '1px solid hsl(var(--border))', color: hasFeature ? 'hsl(var(--muted-foreground))' : 'hsl(var(--primary))', fontFamily: 'Inter, sans-serif', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
        {loading ? '…' : '★'} {hasFeature ? (shown ? 'Hide Score' : 'Deal Score') : 'Radar+ Deal Score'}
      </button>
      {shown && !loading && data && (
        <div style={{ marginTop: 6, padding: '8px 10px', borderRadius: 8, background: 'hsl(var(--muted) / 0.5)', border: '1px solid hsl(var(--border))' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 3 }}>
            <span style={{ fontSize: 18, fontWeight: 800, color: sc }}>{data.dealScore}/10</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: sc }}>{data.dealLabel}</span>
          </div>
          <div style={{ fontSize: 10, color: 'hsl(var(--muted-foreground))' }}>{data.prediction}</div>
        </div>
      )}
    </div>
  );
}
// ── Trust badge ────────────────────────────────────────────
function TrustBadge({ label }: { label: string }) {
  const map: Record<string, { color: string; bg: string }> = {
    Trusted:    { color: 'hsl(var(--success))',          bg: 'hsl(var(--success) / 0.1)' },
    Verified:   { color: 'hsl(var(--primary))',          bg: 'hsl(var(--primary) / 0.08)' },
    Unverified: { color: 'hsl(var(--muted-foreground))', bg: 'hsl(var(--muted))' },
  };
  const s = map[label] || map.Unverified;
  const icon = label === 'Trusted' ? '✓' : label === 'Verified' ? '◎' : '?';
  return (
    <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 6, background: s.bg, color: s.color, fontWeight: 700, letterSpacing: '0.02em', border: `1px solid ${s.color}20` }}>
      {icon} {label}
    </span>
  );
}

// ── Share button ───────────────────────────────────────────
function ShareButton({ listing }: { listing: Listing }) {
  const [copied, setCopied] = useState(false);
  const handle = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    const text = `${listing.productName} — ${listing.currency === 'AUD' ? 'A$' : '$'}${listing.price.toFixed(2)} on ${listing.marketplace}`;
    if (navigator.share) {
      try { await navigator.share({ title: listing.productName, text, url: listing.listingUrl }); } catch { }
    } else {
      await navigator.clipboard.writeText(`${text}\n${listing.listingUrl}`);
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    }
  };
  return (
    <button onClick={handle} title="Share" style={{ width: 28, height: 28, borderRadius: '50%', border: `1px solid ${copied ? 'hsl(var(--success))' : 'hsl(var(--border))'}`, background: copied ? 'hsl(var(--success) / 0.08)' : 'transparent', color: copied ? 'hsl(var(--success))' : 'hsl(var(--muted-foreground))', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s', flexShrink: 0 }}>
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
        <circle cx="8" cy="1.5" r="1.2" stroke="currentColor" strokeWidth="1"/>
        <circle cx="8" cy="8.5" r="1.2" stroke="currentColor" strokeWidth="1"/>
        <circle cx="2" cy="5" r="1.2" stroke="currentColor" strokeWidth="1"/>
        <path d="M3.1 4.4l3.8-2M3.1 5.6l3.8 2" stroke="currentColor" strokeWidth="1"/>
      </svg>
    </button>
  );
}

// ── Price alert ────────────────────────────────────────────
function PriceAlertButton({ listing }: { listing: Listing }) {
  const [open, setOpen] = useState(false);
  const [targetPrice, setTargetPrice] = useState('');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    const tp = parseFloat(targetPrice);
    if (!tp || tp <= 0) return;
    const alerts = JSON.parse(localStorage.getItem('shopradar_alerts') || '[]');
    alerts.push({ id: Date.now().toString(), productName: listing.productName, targetPrice: tp, currentPrice: listing.price, currency: listing.currency, imageUrl: listing.imageUrl, marketplace: listing.marketplace, listingUrl: listing.listingUrl, createdAt: new Date().toISOString() });
    localStorage.setItem('shopradar_alerts', JSON.stringify(alerts));
    setSaved(true); setOpen(false);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <button onClick={() => setOpen(o => !o)} title="Price alert" style={{ width: 28, height: 28, borderRadius: '50%', border: `1px solid ${saved ? 'hsl(var(--success))' : open ? 'hsl(var(--primary))' : 'hsl(var(--border))'}`, background: saved ? 'hsl(var(--success) / 0.08)' : open ? 'hsl(var(--primary) / 0.08)' : 'transparent', color: saved ? 'hsl(var(--success))' : open ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M5 1v.6A3 3 0 0 1 8 4.5c0 1.8.7 2.5 1 3H1c.3-.5 1-1.2 1-3A3 3 0 0 1 5 1z" stroke="currentColor" strokeWidth="1" strokeLinejoin="round"/>
          <path d="M4 7.5a1 1 0 0 0 2 0" stroke="currentColor" strokeWidth="1"/>
        </svg>
      </button>
      {open && (
        <div style={{ position: 'absolute', bottom: '100%', right: 0, marginBottom: 6, background: 'hsl(var(--card))', border: '1.5px solid hsl(var(--border))', borderRadius: 10, padding: 12, width: 180, zIndex: 50, boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'hsl(var(--foreground))', marginBottom: 4 }}>Price Drop Alert</p>
          <p style={{ fontSize: 10, color: 'hsl(var(--muted-foreground))', marginBottom: 8 }}>Now: <strong>A${listing.price.toFixed(2)}</strong></p>
          <input type="number" placeholder="Alert me at A$..." value={targetPrice} onChange={e => setTargetPrice(e.target.value)}
            style={{ width: '100%', padding: '6px 8px', fontSize: 11, borderRadius: 6, background: 'hsl(var(--input))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))', outline: 'none', marginBottom: 6 }} />
          <button onClick={handleSave} disabled={!targetPrice}
            style={{ width: '100%', padding: '6px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))', border: 'none', cursor: 'pointer', opacity: !targetPrice ? 0.4 : 1 }}>
            Set Alert
          </button>
        </div>
      )}
    </div>
  );
}

// ── Barcode scanner ────────────────────────────────────────
function BarcodeScanner({ onResult }: { onResult: (q: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [active, setActive] = useState(false);
  const [error, setError] = useState('');

  const start = async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
      setActive(true);
      if ('BarcodeDetector' in window) {
        const det = new (window as any).BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] });
        const scan = async () => {
          if (!videoRef.current) return;
          try {
            const codes = await det.detect(videoRef.current);
            if (codes.length > 0) { stop(); onResult(codes[0].rawValue); }
            else requestAnimationFrame(scan);
          } catch { requestAnimationFrame(scan); }
        };
        requestAnimationFrame(scan);
      } else setError('Requires Chrome on Android.');
    } catch { setError('Camera access denied.'); setActive(false); }
  };

  const stop = () => {
    if (videoRef.current?.srcObject) (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
    setActive(false);
  };

  if (active) return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 100, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <p style={{ color: 'white', fontSize: 16, fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>Point at barcode</p>
      <div style={{ width: 280, height: 200, borderRadius: 12, overflow: 'hidden', border: '2px solid hsl(var(--primary))' }}>
        <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
      {error && <p style={{ color: 'hsl(var(--warning))', fontSize: 12, textAlign: 'center', maxWidth: 240 }}>{error}</p>}
      <button onClick={stop} className="btn-primary">Cancel</button>
    </div>
  );

  return (
    <button onClick={start} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, padding: '4px 10px', borderRadius: 100, border: '1px solid hsl(var(--border))', background: 'transparent', color: 'hsl(var(--muted-foreground))', cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'all 0.15s', whiteSpace: 'nowrap' }}>
      <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
        <rect x="1" y="1.5" width="1.2" height="8" rx="0.3" fill="currentColor"/>
        <rect x="3.4" y="1.5" width="0.7" height="8" rx="0.3" fill="currentColor"/>
        <rect x="5.2" y="1.5" width="1.2" height="8" rx="0.3" fill="currentColor"/>
        <rect x="7.8" y="1.5" width="0.9" height="8" rx="0.3" fill="currentColor"/>
        <path d="M1 1h1.8M8.2 1H10M1 10h1.8M8.2 10H10" stroke="hsl(var(--primary))" strokeWidth="0.9" strokeLinecap="round"/>
      </svg>
      Scan barcode
    </button>
  );
}

// ── Skeleton ───────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div style={{
      background: 'hsl(var(--card))',
      border: '1px solid hsl(var(--border))',
      borderRadius: 16, overflow: 'hidden', padding: 16,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'hsl(var(--muted))', animation: 'pulse 1.8s ease-in-out infinite' }} />
        <div style={{ width: 48, height: 20, borderRadius: 6, background: 'hsl(var(--muted))', animation: 'pulse 1.8s ease-in-out infinite' }} />
      </div>
      <div style={{ height: 140, background: 'hsl(var(--muted))', borderRadius: 10, marginBottom: 12, animation: 'pulse 1.8s ease-in-out infinite' }} />
      {[70, 90, 40].map((w, i) => (
        <div key={i} style={{ height: i === 1 ? 13 : 9, background: 'hsl(var(--muted))', borderRadius: 4, width: `${w}%`, marginBottom: 8, animation: 'pulse 1.8s ease-in-out infinite', animationDelay: `${i * 0.1}s` }} />
      ))}
      <div style={{ height: 36, background: 'hsl(var(--muted))', borderRadius: 100, marginTop: 12, animation: 'pulse 1.8s ease-in-out infinite' }} />
    </div>
  );
}

// ── Main product card (bento style) ───────────────────────
function ProductCard({
  listing, isCheapest, isFastest, isComparing, onToggleCompare, onAddToWatchlist, displayCurrency, exchangeRate,
}: {
  listing: Listing; isCheapest: boolean; isFastest: boolean;
  isComparing: boolean; onToggleCompare: (l: Listing) => void;
  onAddToWatchlist: (l: Listing) => void;
  displayCurrency: string; exchangeRate: number;
}) {
  const [imgError, setImgError] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [hovered, setHovered] = useState(false);
  const price = fmt(listing.price, listing.currency, displayCurrency, exchangeRate);
  const isDisabled = listing.stockStatus === 'Out of Stock' || (listing.stockStatus as string) === 'Unavailable';
  const trustLabel = (listing as any).trustLabel || 'Unverified';
  const priceHistory: { date: string; price: number }[] = (listing as any).priceHistory || [];

  const deliveryDate = listing.deliveryDate || (() => {
    const d = new Date();
    d.setDate(d.getDate() + listing.deliveryDays);
    return d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });
  })();

  const tags = [
    listing.marketplace,
    listing.condition,
    listing.shippingTier,
  ].filter(Boolean);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        padding: 16,
        borderRadius: 16,
        overflow: 'hidden',
        background: 'hsl(var(--card))',
        border: `1px solid ${isComparing ? 'hsl(var(--primary))' : hovered ? 'hsl(var(--border))' : 'hsl(var(--border) / 0.8)'}`,
        boxShadow: hovered ? '0 2px 12px rgba(0,0,0,0.06)' : 'none',
        transform: hovered ? 'translateY(-2px)' : 'none',
        transition: 'all 0.3s cubic-bezier(0.22,1,0.36,1)',
        opacity: isDisabled ? 0.55 : 1,
        outline: isComparing ? '2px solid hsl(var(--primary))' : 'none',
        outlineOffset: 2,
        willChange: 'transform',
      }}
    >
      {/* Dot pattern overlay on hover — bento style */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        opacity: hovered ? 1 : 0, transition: 'opacity 0.3s',
        backgroundImage: 'radial-gradient(circle at center, hsl(var(--foreground) / 0.04) 1px, transparent 1px)',
        backgroundSize: '4px 4px',
      }} />

      {/* Gradient border effect on hover */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: -1, borderRadius: 16, padding: 1,
        background: hovered ? 'linear-gradient(135deg, transparent, hsl(var(--border) / 0.5), transparent)' : 'none',
        opacity: hovered ? 1 : 0, transition: 'opacity 0.3s',
      }} />

      <div style={{ position: 'relative' }}>
        {/* Top row: status badge + trust */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', gap: 5 }}>
            {isCheapest && (
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: 'hsl(var(--success) / 0.1)', color: 'hsl(var(--success))', border: '1px solid hsl(var(--success) / 0.2)' }}>
                Best Price
              </span>
            )}
            {isFastest && (
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: 'hsl(var(--primary) / 0.08)', color: 'hsl(var(--primary))', border: '1px solid hsl(var(--primary) / 0.15)' }}>
                Fastest
              </span>
            )}
            {!isCheapest && !isFastest && (
              <span style={{ fontSize: 10, fontWeight: 500, padding: '2px 8px', borderRadius: 6, background: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))' }}>
                {isDisabled ? 'Unavailable' : 'In Stock'}
              </span>
            )}
          </div>
          <TrustBadge label={trustLabel} />
        </div>

        {/* Product image */}
        <div style={{ height: 140, background: 'hsl(var(--muted) / 0.4)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 12, position: 'relative' }}>
          {listing.imageUrl && !imgError ? (
            <AppImage src={listing.imageUrl} alt={listing.title} width={260} height={140}
              style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 10 }}
              onError={() => setImgError(true)} />
          ) : (
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" style={{ color: 'hsl(var(--border))' }}>
              <rect x="2" y="6" width="24" height="16" rx="2" stroke="currentColor" strokeWidth="1.5"/>
              <circle cx="10" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M2 19l6-4.5 4.5 3.5 4.5-5.5 7 6" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
            </svg>
          )}
          {/* Condition pill */}
          <span style={{ position: 'absolute', top: 8, right: 8, fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 100, background: listing.condition === 'New' ? 'hsl(var(--success))' : 'hsl(var(--warning))', color: 'white', letterSpacing: '0.03em' }}>
            {listing.condition?.toUpperCase() || 'NEW'}
          </span>
        </div>

        {/* Title + meta */}
        <div style={{ marginBottom: 10 }}>
          <h3 style={{ fontSize: 13, fontWeight: 500, color: 'hsl(var(--foreground))', lineHeight: 1.4, marginBottom: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', fontFamily: 'Inter, sans-serif', letterSpacing: '-0.01em' }}>
            {listing.title}
            <span style={{ marginLeft: 6, fontSize: 11, color: 'hsl(var(--muted-foreground))', fontWeight: 400 }}>
              {listing.marketplace}
            </span>
          </h3>
        </div>

        {/* Price + rating */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 8 }}>
          <div>
            <div style={{ fontFamily: 'Instrument Serif, serif', fontSize: 24, color: 'hsl(var(--foreground))', lineHeight: 1, letterSpacing: '-0.01em' }}>
              {price}
            </div>
            {listing.shippingCost === 0 && <span style={{ fontSize: 9, color: 'hsl(var(--success))', marginTop: 1, display: 'block', fontWeight: 500 }}>Free shipping</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, paddingBottom: 2 }}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ color: '#f59e0b' }}>
              <path d="M5 1l1.1 2.2 2.4.4-1.75 1.7.4 2.4L5 6.6l-2.15 1.1.4-2.4L1.5 3.6l2.4-.4L5 1z" fill="currentColor"/>
            </svg>
            <span style={{ fontSize: 10, color: 'hsl(var(--muted-foreground))' }}>{listing.sellerRating}</span>
            {listing.sellerReviews > 0 && (
              <span style={{ fontSize: 9, color: 'hsl(var(--muted-foreground))', opacity: 0.6 }}>
                ({listing.sellerReviews > 999 ? `${(listing.sellerReviews / 1000).toFixed(1)}k` : listing.sellerReviews})
              </span>
            )}
          </div>
        </div>

        {/* Tags row — bento style */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {tags.map((tag, i) => (
              <span key={i} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 6, background: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))', transition: 'background 0.2s' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'hsl(var(--muted) / 0.8)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'hsl(var(--muted))'}
              >
                #{tag}
              </span>
            ))}
          </div>
          {/* Delivery — shows on hover like bento "Explore →" */}
          <span style={{ fontSize: 10, color: 'hsl(var(--muted-foreground))', opacity: hovered ? 1 : 0, transition: 'opacity 0.3s', whiteSpace: 'nowrap' }}>
            Arrives {deliveryDate}
          </span>
        </div>

        {/* Price history */}
        <div style={{ marginBottom: 10 }}>
          <button onClick={() => setShowHistory(h => !h)} style={{ fontSize: 10, color: 'hsl(var(--muted-foreground))', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 3, transition: 'color 0.15s' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'hsl(var(--foreground))'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'hsl(var(--muted-foreground))'}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1 8l2-3 2 1.5 2-3.5 2 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            30-day history {showHistory ? '▲' : '▼'}
          </button>
          {showHistory && (
            <div style={{ marginTop: 6 }}>
              <Sparkline data={priceHistory} />
              {priceHistory.length >= 2 && (
                <>
                  <AIRecommendation query={listing.productName} currentPrice={listing.price} priceHistory={priceHistory} marketplace={listing.marketplace} />
                  <DealScore query={listing.productName} price={listing.price} priceHistory={priceHistory} marketplace={listing.marketplace} rating={listing.sellerRating} reviews={listing.sellerReviews} shippingTier={listing.shippingTier} />
                </>
              )}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
          <a href={isDisabled ? undefined : listing.listingUrl} target="_blank" rel="noopener noreferrer"
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '9px 14px', borderRadius: 100, fontSize: 12, fontWeight: 600, fontFamily: 'Inter, sans-serif', letterSpacing: '-0.01em', background: isDisabled ? 'hsl(var(--muted))' : 'hsl(var(--primary))', color: isDisabled ? 'hsl(var(--muted-foreground))' : 'white', boxShadow: isDisabled ? 'none' : '0 2px 10px hsl(var(--primary) / 0.25)', pointerEvents: isDisabled ? 'none' : 'auto', textDecoration: 'none', transition: 'all 0.15s' }}
            onMouseEnter={e => { if (!isDisabled) { (e.currentTarget as HTMLElement).style.opacity = '0.85'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; (e.currentTarget as HTMLElement).style.transform = 'none'; }}
          >
            {isDisabled ? 'Unavailable' : 'View Deal →'}
          </a>
          <button onClick={() => onAddToWatchlist(listing)} title="Watchlist" style={{ width: 30, height: 30, borderRadius: '50%', border: '1px solid hsl(var(--border))', background: 'transparent', cursor: 'pointer', color: 'hsl(var(--muted-foreground))', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s', flexShrink: 0 }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLButtonElement; el.style.borderColor = 'hsl(var(--primary))'; el.style.color = 'hsl(var(--primary))'; }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLButtonElement; el.style.borderColor = 'hsl(var(--border))'; el.style.color = 'hsl(var(--muted-foreground))'; }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 10.5S1 7 1 4a3.5 3.5 0 016-2.45A3.5 3.5 0 0111 4C11 7 6 10.5 6 10.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg>
          </button>
          <PriceAlertButton listing={listing} />
          <ShareButton listing={listing} />
          <button onClick={() => onToggleCompare(listing)} title="Compare" style={{ width: 30, height: 30, borderRadius: '50%', border: `1px solid ${isComparing ? 'hsl(var(--primary))' : 'hsl(var(--border))'}`, background: isComparing ? 'hsl(var(--primary) / 0.1)' : 'transparent', color: isComparing ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s', flexShrink: 0 }}>
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M2 3h7M2 8h7M7 1l3 2-3 2M4 6L1 8l3 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main export ────────────────────────────────────────────
export default function ResultsGrid({
  listings, loading, hasSearched, compareItems, onToggleCompare, onAddToWatchlist,
  displayCurrency = 'AUD', exchangeRate = 1, onBarcodeSearch,
}: ResultsGridProps) {
  const [conditionTab, setConditionTab] = useState<'all' | 'new' | 'used'>('all');
  const newL = listings.filter(l => l.condition === 'New' || !l.condition);
  const usedL = listings.filter(l => l.condition === 'Used');
  const displayed = conditionTab === 'new' ? newL : conditionTab === 'used' ? usedL : listings;

  if (loading) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
        {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  if (!hasSearched) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, margin: '0 auto 12px', background: 'hsl(var(--muted))', border: '1px solid hsl(var(--border))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ color: 'hsl(var(--muted-foreground))' }}>
            <circle cx="9" cy="9" r="6.5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M14 14L18 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
        <p style={{ fontFamily: 'Instrument Serif, serif', fontSize: 20, color: 'hsl(var(--foreground))', marginBottom: 6 }}>Search for any product</p>
        <p style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))', marginBottom: 16 }}>Compare prices across 40+ global marketplaces</p>
        {onBarcodeSearch && <BarcodeScanner onResult={onBarcodeSearch} />}
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <p style={{ fontFamily: 'Instrument Serif, serif', fontSize: 20, color: 'hsl(var(--foreground))', marginBottom: 6 }}>No results found</p>
        <p style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))' }}>Try a different search term</p>
      </div>
    );
  }

  const inStock = displayed.filter(l => l.stockStatus !== 'Out of Stock');
  const cheapestId = inStock.length > 0 ? [...inStock].sort((a, b) => a.price - b.price)[0]?.id : null;
  const fastestId = inStock.length > 0 ? [...inStock].sort((a, b) => a.deliveryDays - b.deliveryDays)[0]?.id : null;

  return (
    <div>
      {/* Condition tabs + barcode */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', gap: 5 }}>
          {([
            { id: 'all',  label: `All (${listings.length})` },
            { id: 'new',  label: `New (${newL.length})` },
            { id: 'used', label: `Used (${usedL.length})` },
          ] as const).map(tab => (
            <button key={tab.id} onClick={() => setConditionTab(tab.id)} style={{ fontSize: 11, padding: '4px 12px', borderRadius: 100, border: '1px solid', fontFamily: 'Inter, sans-serif', cursor: 'pointer', transition: 'all 0.15s', borderColor: conditionTab === tab.id ? 'hsl(var(--primary))' : 'hsl(var(--border))', background: conditionTab === tab.id ? 'hsl(var(--primary) / 0.08)' : 'transparent', color: conditionTab === tab.id ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))', fontWeight: conditionTab === tab.id ? 600 : 400 }}>
              {tab.label}
            </button>
          ))}
        </div>
        {onBarcodeSearch && <BarcodeScanner onResult={onBarcodeSearch} />}
      </div>

      {/* Bento grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
        {displayed.map(listing => (
          <ProductCard
            key={listing.id}
            listing={listing}
            isCheapest={listing.id === cheapestId}
            isFastest={listing.id === fastestId}
            isComparing={compareItems.some(c => c.id === listing.id)}
            onToggleCompare={onToggleCompare}
            onAddToWatchlist={onAddToWatchlist}
            displayCurrency={displayCurrency}
            exchangeRate={exchangeRate}
          />
        ))}
      </div>
    </div>
  );
}
