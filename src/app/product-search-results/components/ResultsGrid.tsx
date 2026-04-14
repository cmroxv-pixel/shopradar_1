'use client';
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

// ── Sparkline ────────────────────────────────────────────────
function Sparkline({ data }: { data: { date: string; price: number }[] }) {
  if (!data || data.length < 2) return (
    <span style={{ fontSize: 10, color: 'hsl(var(--muted-foreground))', fontStyle: 'italic' }}>No history yet</span>
  );
  const prices = data.map(d => d.price);
  const min = Math.min(...prices), max = Math.max(...prices);
  const range = max - min || 1;
  const w = 100, h = 28;
  const pts = data.map((d, i) => `${(i / (data.length - 1)) * w},${h - ((d.price - min) / range) * (h - 4) - 2}`).join(' ');
  const latest = prices[prices.length - 1], first = prices[0];
  const trend = latest < first ? 'down' : latest > first ? 'up' : 'flat';
  const color = trend === 'down' ? 'hsl(var(--success))' : trend === 'up' ? 'hsl(var(--destructive))' : 'hsl(var(--muted-foreground))';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <svg width={w} height={h} style={{ overflow: 'visible' }}>
        <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/>
      </svg>
      <span style={{ fontSize: 10, color, fontWeight: 600 }}>
        {trend === 'down' ? '↓' : trend === 'up' ? '↑' : '→'} {Math.abs(((latest - first) / first) * 100).toFixed(0)}%
      </span>
    </div>
  );
}

// ── AI recommendation ────────────────────────────────────────
function AIRecommendation({ query, currentPrice, priceHistory, marketplace }: {
  query: string; currentPrice: number;
  priceHistory: { date: string; price: number }[]; marketplace: string;
}) {
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
      <button onClick={getAnalysis} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 100, cursor: 'pointer', background: shown && !loading ? 'hsl(var(--primary) / 0.08)' : 'transparent', border: '1.5px solid hsl(var(--primary) / 0.25)', color: 'hsl(var(--primary))', fontFamily: 'Inter, sans-serif', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, transition: 'all 0.15s' }}>
        {loading ? '…' : '✦'} AI {shown && !loading ? 'Hide' : 'Analysis'}
      </button>
      {shown && !loading && rec && (
        <div className="animate-fade-up" style={{ marginTop: 8, padding: '10px 12px', borderRadius: 10, background: 'hsl(var(--muted) / 0.5)', border: '1px solid hsl(var(--border))' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: verdictColor, marginBottom: 3 }}>{rec.verdict}</div>
          <div style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))', lineHeight: 1.5 }}>{rec.reason}</div>
        </div>
      )}
    </div>
  );
}

// ── Trust badge ──────────────────────────────────────────────
function TrustBadge({ label }: { label: string }) {
  const styles: Record<string, { color: string; bg: string; border: string; icon: string }> = {
    Trusted:    { color: 'hsl(var(--success))',     bg: 'hsl(var(--success) / 0.08)',     border: 'hsl(var(--success) / 0.2)',     icon: '✓' },
    Verified:   { color: 'hsl(var(--primary))',     bg: 'hsl(var(--primary) / 0.08)',     border: 'hsl(var(--primary) / 0.2)',     icon: '◎' },
    Unverified: { color: 'hsl(var(--muted-foreground))', bg: 'hsl(var(--muted) / 0.5)', border: 'hsl(var(--border))',              icon: '?' },
  };
  const s = styles[label] || styles.Unverified;
  return (
    <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 100, background: s.bg, color: s.color, border: `1px solid ${s.border}`, fontWeight: 600, letterSpacing: '-0.01em' }}>
      {s.icon} {label}
    </span>
  );
}

// ── Share button ─────────────────────────────────────────────
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
    <button onClick={handle} title="Share" style={{ width: 30, height: 30, borderRadius: '50%', border: `1.5px solid ${copied ? 'hsl(var(--success))' : 'hsl(var(--border))'}`, background: copied ? 'hsl(var(--success) / 0.08)' : 'transparent', color: copied ? 'hsl(var(--success))' : 'hsl(var(--muted-foreground))', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
      <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
        <circle cx="9" cy="2" r="1.3" stroke="currentColor" strokeWidth="1.1"/>
        <circle cx="9" cy="9" r="1.3" stroke="currentColor" strokeWidth="1.1"/>
        <circle cx="2" cy="5.5" r="1.3" stroke="currentColor" strokeWidth="1.1"/>
        <path d="M3.2 4.9l4.5-2M3.2 6.1l4.5 2" stroke="currentColor" strokeWidth="1.1"/>
      </svg>
    </button>
  );
}

// ── Price alert ──────────────────────────────────────────────
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
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} title="Set price alert" style={{ width: 30, height: 30, borderRadius: '50%', border: `1.5px solid ${saved ? 'hsl(var(--success))' : open ? 'hsl(var(--primary))' : 'hsl(var(--border))'}`, background: saved ? 'hsl(var(--success) / 0.08)' : open ? 'hsl(var(--primary) / 0.08)' : 'transparent', color: saved ? 'hsl(var(--success))' : open ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
        <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
          <path d="M5.5 1v.7M5.5 1A3.3 3.3 0 0 1 8.8 4.3c0 1.9.7 2.8 1.1 3.3H1.1C1.5 7.1 2.2 6.2 2.2 4.3A3.3 3.3 0 0 1 5.5 1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
          <path d="M4.5 7.6a1 1 0 0 0 2 0" stroke="currentColor" strokeWidth="1.2"/>
        </svg>
      </button>
      {open && (
        <div className="animate-fade-up" style={{ position: 'absolute', bottom: '100%', right: 0, marginBottom: 8, background: 'hsl(var(--card))', border: '1.5px solid hsl(var(--border))', borderRadius: 12, padding: 14, width: 200, zIndex: 50, boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'hsl(var(--foreground))', marginBottom: 4 }}>Price Drop Alert</p>
          <p style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))', marginBottom: 8 }}>Now: <strong style={{ color: 'hsl(var(--foreground))' }}>A${listing.price.toFixed(2)}</strong></p>
          <input type="number" placeholder="Alert me at A$..." value={targetPrice} onChange={e => setTargetPrice(e.target.value)} style={{ width: '100%', padding: '7px 9px', fontSize: 12, borderRadius: 8, background: 'hsl(var(--input))', border: '1.5px solid hsl(var(--border))', color: 'hsl(var(--foreground))', outline: 'none', marginBottom: 8 }} />
          <button onClick={handleSave} disabled={!targetPrice} style={{ width: '100%', padding: '7px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: 'hsl(var(--primary))', color: 'white', border: 'none', cursor: 'pointer', opacity: !targetPrice ? 0.4 : 1 }}>
            Set Alert
          </button>
        </div>
      )}
    </div>
  );
}

// ── Barcode scanner ──────────────────────────────────────────
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
        const det = new (window as any).BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'qr_code'] });
        const scan = async () => {
          if (!videoRef.current) return;
          try {
            const codes = await det.detect(videoRef.current);
            if (codes.length > 0) { stop(); onResult(codes[0].rawValue); }
            else requestAnimationFrame(scan);
          } catch { requestAnimationFrame(scan); }
        };
        requestAnimationFrame(scan);
      } else setError('Barcode scanning requires Chrome on Android.');
    } catch { setError('Camera access denied.'); setActive(false); }
  };

  const stop = () => {
    if (videoRef.current?.srcObject) (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
    setActive(false);
  };

  if (active) return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 100, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <p style={{ color: 'white', fontFamily: 'Instrument Serif, serif', fontSize: 20 }}>Point at barcode</p>
      <div style={{ width: 300, height: 220, borderRadius: 16, overflow: 'hidden', border: '2px solid hsl(var(--primary))' }}>
        <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
      {error && <p style={{ color: 'hsl(var(--warning))', fontSize: 13, textAlign: 'center', maxWidth: 260 }}>{error}</p>}
      <button onClick={stop} className="btn-primary">Cancel</button>
    </div>
  );

  return (
    <button onClick={start} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, padding: '4px 10px', borderRadius: 100, border: '1.5px solid hsl(var(--border))', background: 'transparent', color: 'hsl(var(--muted-foreground))', cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'all 0.15s' }}
      onMouseEnter={e => { const el = e.currentTarget as HTMLButtonElement; el.style.borderColor = 'hsl(var(--primary))'; el.style.color = 'hsl(var(--primary))'; }}
      onMouseLeave={e => { const el = e.currentTarget as HTMLButtonElement; el.style.borderColor = 'hsl(var(--border))'; el.style.color = 'hsl(var(--muted-foreground))'; }}
    >
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <rect x="1" y="1.5" width="1.5" height="9" rx="0.3" fill="currentColor"/>
        <rect x="3.8" y="1.5" width="0.8" height="9" rx="0.3" fill="currentColor"/>
        <rect x="5.8" y="1.5" width="1.5" height="9" rx="0.3" fill="currentColor"/>
        <rect x="8.7" y="1.5" width="1" height="9" rx="0.3" fill="currentColor"/>
        <path d="M1 1h2M9 1h2M1 11h2M9 11h2" stroke="hsl(var(--primary))" strokeWidth="1" strokeLinecap="round"/>
      </svg>
      Scan barcode
    </button>
  );
}

// ── Skeleton ─────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div style={{ background: 'hsl(var(--card))', border: '1.5px solid hsl(var(--border))', borderRadius: 20, overflow: 'hidden' }}>
      <div style={{ height: 180, background: 'hsl(var(--muted))', animation: 'pulse 1.8s ease-in-out infinite' }} />
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[50, 80, 35].map((w, i) => (
          <div key={i} style={{ height: i === 1 ? 14 : 10, background: 'hsl(var(--muted))', borderRadius: 6, width: `${w}%`, animation: 'pulse 1.8s ease-in-out infinite', animationDelay: `${i * 0.1}s` }} />
        ))}
        <div style={{ height: 38, background: 'hsl(var(--muted))', borderRadius: 10, marginTop: 4, animation: 'pulse 1.8s ease-in-out infinite' }} />
      </div>
    </div>
  );
}

// ── Product card ─────────────────────────────────────────────
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
  const price = fmt(listing.price, listing.currency, displayCurrency, exchangeRate);
  const isDisabled = listing.stockStatus === 'Out of Stock' || (listing.stockStatus as string) === 'Unavailable';
  const trustLabel = (listing as any).trustLabel || 'Unverified';
  const priceHistory: { date: string; price: number }[] = (listing as any).priceHistory || [];

  const deliveryDate = listing.deliveryDate || (() => {
    const d = new Date();
    d.setDate(d.getDate() + listing.deliveryDays);
    return d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });
  })();

  return (
    <div className="product-card" style={{
      opacity: isDisabled ? 0.55 : 1,
      outline: isComparing ? '2.5px solid hsl(var(--primary))' : 'none',
      outlineOffset: 2,
    }}>
      {/* Best/fastest ribbon */}
      {(isCheapest || isFastest) && (
        <div style={{ padding: '6px 14px', background: isCheapest ? 'hsl(var(--primary))' : 'hsl(var(--success))', display: 'flex', gap: 8 }}>
          {isCheapest && <span style={{ fontSize: 11, fontWeight: 700, color: 'white', letterSpacing: '0.02em' }}>★ Best Price</span>}
          {isFastest && <span style={{ fontSize: 11, fontWeight: 700, color: 'white', letterSpacing: '0.02em' }}>⚡ Fastest</span>}
        </div>
      )}

      {/* Image */}
      <div style={{ height: 180, background: 'hsl(var(--muted) / 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative', borderBottom: '1px solid hsl(var(--border))' }}>
        {listing.imageUrl && !imgError ? (
          <AppImage src={listing.imageUrl} alt={listing.title} width={300} height={180}
            style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 12 }}
            onError={() => setImgError(true)} />
        ) : (
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none" style={{ color: 'hsl(var(--border))' }}>
            <rect x="3" y="8" width="30" height="20" rx="3" stroke="currentColor" strokeWidth="1.5"/>
            <circle cx="13" cy="16" r="3.5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M3 24l8-6 6 4.5 6-7 10 8.5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
          </svg>
        )}
        {/* Condition badge */}
        <span style={{ position: 'absolute', top: 10, right: 10, fontSize: 9, fontWeight: 700, padding: '3px 7px', borderRadius: 100, background: listing.condition === 'New' ? 'hsl(var(--success))' : 'hsl(var(--warning))', color: 'white', letterSpacing: '0.04em' }}>
          {listing.condition?.toUpperCase() || 'NEW'}
        </span>
      </div>

      <div style={{ padding: '14px 14px 12px' }}>
        {/* Store + trust */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'hsl(var(--primary))', letterSpacing: '-0.01em', maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {listing.marketplace}
          </span>
          <TrustBadge label={trustLabel} />
        </div>

        {/* Title */}
        <p style={{ fontSize: 13, fontWeight: 500, color: 'hsl(var(--foreground))', lineHeight: 1.4, marginBottom: 10, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', fontFamily: 'Inter, sans-serif', letterSpacing: '-0.01em' }}>
          {listing.title}
        </p>

        {/* Price */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 8 }}>
          <div>
            <div style={{ fontFamily: 'Instrument Serif, serif', fontSize: 26, color: 'hsl(var(--foreground))', lineHeight: 1, letterSpacing: '-0.01em' }}>
              {price}
            </div>
            {listing.shippingCost === 0 && <span style={{ fontSize: 10, color: 'hsl(var(--success))', marginTop: 2, display: 'block', fontWeight: 500 }}>Free shipping</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, paddingBottom: 2 }}>
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" style={{ color: '#f59e0b' }}>
              <path d="M5.5 1l1.2 2.5 2.8.4-2 2 .5 2.8L5.5 7.3 2.9 8.7l.5-2.8-2-2 2.8-.4L5.5 1z" fill="currentColor"/>
            </svg>
            <span style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>{listing.sellerRating}</span>
            {listing.sellerReviews > 0 && (
              <span style={{ fontSize: 10, color: 'hsl(var(--muted-foreground))', opacity: 0.6 }}>
                ({listing.sellerReviews > 999 ? `${(listing.sellerReviews / 1000).toFixed(1)}k` : listing.sellerReviews})
              </span>
            )}
          </div>
        </div>

        {/* Delivery */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
          <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 100, background: listing.shippingTier === 'Express' ? 'hsl(var(--primary))' : 'hsl(var(--muted))', color: listing.shippingTier === 'Express' ? 'white' : 'hsl(var(--muted-foreground))' }}>
            {listing.shippingTier}
          </span>
          <span style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>
            Arrives <strong style={{ color: 'hsl(var(--foreground))', fontWeight: 500 }}>{deliveryDate}</strong>
          </span>
        </div>

        {/* Price history toggle */}
        <div style={{ marginBottom: 10 }}>
          <button onClick={() => setShowHistory(h => !h)} style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'hsl(var(--foreground))'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'hsl(var(--muted-foreground))'}
          >
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M1 9l2.5-3.5 2 2 2.5-4 1.5 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            30-day history {showHistory ? '▲' : '▼'}
          </button>
          {showHistory && (
            <div className="animate-fade-up" style={{ marginTop: 8 }}>
              <Sparkline data={priceHistory} />
              {priceHistory.length >= 2 && (
                <AIRecommendation query={listing.productName} currentPrice={listing.price} priceHistory={priceHistory} marketplace={listing.marketplace} />
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <a href={isDisabled ? undefined : listing.listingUrl} target="_blank" rel="noopener noreferrer"
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '10px 14px', borderRadius: 100, fontSize: 13, fontWeight: 600, fontFamily: 'Inter, sans-serif', letterSpacing: '-0.01em', background: isDisabled ? 'hsl(var(--muted))' : 'hsl(var(--primary))', color: isDisabled ? 'hsl(var(--muted-foreground))' : 'white', boxShadow: isDisabled ? 'none' : '0 2px 12px hsl(var(--primary) / 0.25)', pointerEvents: isDisabled ? 'none' : 'auto', textDecoration: 'none', transition: 'all 0.15s' }}
            onMouseEnter={e => { if (!isDisabled) { (e.currentTarget as HTMLElement).style.opacity = '0.85'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; (e.currentTarget as HTMLElement).style.transform = 'none'; }}
          >
            {isDisabled ? 'Unavailable' : 'View Deal →'}
          </a>
          <button onClick={() => onAddToWatchlist(listing)} title="Watchlist" style={{ width: 32, height: 32, borderRadius: '50%', border: '1.5px solid hsl(var(--border))', background: 'transparent', cursor: 'pointer', color: 'hsl(var(--muted-foreground))', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLButtonElement; el.style.borderColor = 'hsl(var(--primary))'; el.style.color = 'hsl(var(--primary))'; }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLButtonElement; el.style.borderColor = 'hsl(var(--border))'; el.style.color = 'hsl(var(--muted-foreground))'; }}
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M6.5 11S1.5 7.5 1.5 4.5A3.5 3.5 0 0111.5 4.5C11.5 7.5 6.5 11 6.5 11z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>
          </button>
          <PriceAlertButton listing={listing} />
          <ShareButton listing={listing} />
          <button onClick={() => onToggleCompare(listing)} title="Compare" style={{ width: 32, height: 32, borderRadius: '50%', border: `1.5px solid ${isComparing ? 'hsl(var(--primary))' : 'hsl(var(--border))'}`, background: isComparing ? 'hsl(var(--primary) / 0.1)' : 'transparent', color: isComparing ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 3.5h8M2 8.5h8M7.5 1l3 2.5-3 2.5M4.5 5.5L1.5 8l3 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main export ──────────────────────────────────────────────
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
        {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  if (!hasSearched) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px' }}>
        <p style={{ fontFamily: 'Instrument Serif, serif', fontSize: 28, color: 'hsl(var(--muted-foreground))', marginBottom: 16, fontWeight: 400 }}>
          Your results will appear here
        </p>
        <p style={{ fontSize: 14, color: 'hsl(var(--muted-foreground))', opacity: 0.7, marginBottom: 20 }}>
          Search for any product to compare prices
        </p>
        {onBarcodeSearch && <BarcodeScanner onResult={onBarcodeSearch} />}
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px' }}>
        <p style={{ fontFamily: 'Instrument Serif, serif', fontSize: 24, color: 'hsl(var(--muted-foreground))', marginBottom: 8 }}>No results found</p>
        <p style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))', opacity: 0.6 }}>Try a different search term</p>
      </div>
    );
  }

  const inStock = displayed.filter(l => l.stockStatus !== 'Out of Stock');
  const cheapestId = inStock.length > 0 ? [...inStock].sort((a, b) => a.price - b.price)[0]?.id : null;
  const fastestId = inStock.length > 0 ? [...inStock].sort((a, b) => a.deliveryDays - b.deliveryDays)[0]?.id : null;

  return (
    <div>
      {/* Condition tabs + barcode */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {([
            { id: 'all',  label: `All (${listings.length})` },
            { id: 'new',  label: `New (${newL.length})` },
            { id: 'used', label: `Used (${usedL.length})` },
          ] as const).map(tab => (
            <button key={tab.id} onClick={() => setConditionTab(tab.id)} className={`btn-ghost${conditionTab === tab.id ? ' active' : ''}`} style={{ fontSize: 12 }}>
              {tab.label}
            </button>
          ))}
        </div>
        {onBarcodeSearch && <BarcodeScanner onResult={onBarcodeSearch} />}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
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
