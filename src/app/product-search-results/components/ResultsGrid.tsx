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

// ── Mini sparkline ───────────────────────────────────────────
function Sparkline({ data }: { data: { date: string; price: number }[] }) {
  if (!data || data.length < 2) {
    return (
      <div style={{ fontSize: 10, color: 'hsl(var(--muted-foreground))', fontStyle: 'italic' }}>
        No history yet
      </div>
    );
  }

  const prices = data.map(d => d.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const w = 120, h = 32;
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((d.price - min) / range) * (h - 4) - 2;
    return `${x},${y}`;
  }).join(' ');

  const latest = prices[prices.length - 1];
  const first = prices[0];
  const trend = latest < first ? 'down' : latest > first ? 'up' : 'flat';
  const color = trend === 'down' ? 'hsl(var(--success))' : trend === 'up' ? 'hsl(var(--destructive))' : 'hsl(var(--muted-foreground))';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <svg width={w} height={h} style={{ overflow: 'visible' }}>
        <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/>
        <circle cx={pts.split(' ').pop()!.split(',')[0]} cy={pts.split(' ').pop()!.split(',')[1]} r="2.5" fill={color}/>
      </svg>
      <span style={{ fontSize: 10, color, fontWeight: 600, whiteSpace: 'nowrap' }}>
        {trend === 'down' ? '↓' : trend === 'up' ? '↑' : '→'} {Math.abs(((latest - first) / first) * 100).toFixed(0)}%
      </span>
    </div>
  );
}

// ── AI Recommendation badge ──────────────────────────────────
function AIRecommendation({ query, currentPrice, priceHistory, marketplace }: {
  query: string; currentPrice: number;
  priceHistory: { date: string; price: number }[]; marketplace: string;
}) {
  const [rec, setRec] = useState<{ verdict: string; reason: string; confidence: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [shown, setShown] = useState(false);

  const fetch = useCallback(async () => {
    if (shown) { setShown(false); return; }
    setLoading(true);
    setShown(true);
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

  const verdictColor = rec?.verdict === 'Buy Now' ? 'hsl(var(--success))' :
    rec?.verdict === 'Wait' ? 'hsl(var(--warning))' : 'hsl(var(--primary))';

  return (
    <div style={{ marginTop: 8 }}>
      <button
        onClick={fetch}
        style={{
          fontSize: 10, padding: '3px 8px', borderRadius: 5, cursor: 'pointer',
          background: 'hsl(var(--primary) / 0.08)', border: '1px solid hsl(var(--primary) / 0.2)',
          color: 'hsl(var(--primary))', fontFamily: 'Syne, sans-serif', fontWeight: 700,
          letterSpacing: '0.03em', display: 'flex', alignItems: 'center', gap: 4, transition: 'all 0.15s',
        }}
      >
        {loading ? '⏳' : '✦'} AI {shown && !loading ? 'Hide' : 'Analysis'}
      </button>
      {shown && !loading && rec && (
        <div style={{
          marginTop: 6, padding: '8px 10px', borderRadius: 8,
          background: 'hsl(var(--card) / 0.8)', border: '1px solid hsl(var(--border))',
          animation: 'fadeUp 0.3s ease both',
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: verdictColor, marginBottom: 3, fontFamily: 'Syne, sans-serif' }}>
            {rec.verdict}
          </div>
          <div style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))', lineHeight: 1.5 }}>
            {rec.reason}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Trust badge ──────────────────────────────────────────────
function TrustBadge({ score, label }: { score: number; label: string }) {
  const color = label === 'Trusted' ? 'hsl(var(--success))' :
    label === 'Verified' ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))';
  const bg = label === 'Trusted' ? 'hsl(var(--success) / 0.1)' :
    label === 'Verified' ? 'hsl(var(--primary) / 0.1)' : 'hsl(var(--muted) / 0.5)';
  const border = label === 'Trusted' ? 'hsl(var(--success) / 0.2)' :
    label === 'Verified' ? 'hsl(var(--primary) / 0.2)' : 'hsl(var(--border))';
  const icon = label === 'Trusted' ? '✓' : label === 'Verified' ? '◎' : '?';
  return (
    <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: bg, color, border: `1px solid ${border}`, fontWeight: 700, fontFamily: 'Syne, sans-serif', letterSpacing: '0.03em' }}>
      {icon} {label}
    </span>
  );
}

// ── Share button ─────────────────────────────────────────────
function ShareButton({ listing }: { listing: Listing }) {
  const [copied, setCopied] = useState(false);

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    const shareUrl = `${window.location.origin}/product-search-results?q=${encodeURIComponent(listing.productName)}`;
    const text = `Found ${listing.productName} for ${listing.currency === 'AUD' ? 'A$' : '$'}${listing.price.toFixed(2)} on ${listing.marketplace} via ShopRadar`;
    if (navigator.share) {
      try { await navigator.share({ title: listing.productName, text, url: shareUrl }); } catch { }
    } else {
      await navigator.clipboard.writeText(`${text}\n${listing.listingUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button onClick={handleShare} title="Share deal" style={{
      width: 30, height: 30, borderRadius: 7,
      border: `1px solid ${copied ? 'hsl(var(--success))' : 'hsl(var(--border))'}`,
      background: copied ? 'hsl(var(--success) / 0.1)' : 'transparent',
      color: copied ? 'hsl(var(--success))' : 'hsl(var(--muted-foreground))',
      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
    }}>
      <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
        <circle cx="9" cy="2" r="1.5" stroke="currentColor" strokeWidth="1.2"/>
        <circle cx="9" cy="9" r="1.5" stroke="currentColor" strokeWidth="1.2"/>
        <circle cx="2" cy="5.5" r="1.5" stroke="currentColor" strokeWidth="1.2"/>
        <path d="M3.4 4.7l4.1-2M3.4 6.3l4.1 2" stroke="currentColor" strokeWidth="1.1"/>
      </svg>
    </button>
  );
}

// ── Price alert button ───────────────────────────────────────
function PriceAlertButton({ listing, query }: { listing: Listing; query?: string }) {
  const [open, setOpen] = useState(false);
  const [targetPrice, setTargetPrice] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    const tp = parseFloat(targetPrice);
    if (!tp || tp <= 0) return;
    setSaving(true);
    try {
      // Store in localStorage for non-auth users, show success
      const alerts = JSON.parse(localStorage.getItem('shopradar_alerts') || '[]');
      alerts.push({
        id: Date.now().toString(),
        productName: listing.productName,
        targetPrice: tp,
        currentPrice: listing.price,
        currency: listing.currency,
        imageUrl: listing.imageUrl,
        marketplace: listing.marketplace,
        listingUrl: listing.listingUrl,
        createdAt: new Date().toISOString(),
      });
      localStorage.setItem('shopradar_alerts', JSON.stringify(alerts));
      setSaved(true);
      setOpen(false);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        title="Set price alert"
        style={{
          width: 30, height: 30, borderRadius: 7,
          border: `1px solid ${saved ? 'hsl(var(--success))' : open ? 'hsl(var(--primary))' : 'hsl(var(--border))'}`,
          background: saved ? 'hsl(var(--success) / 0.1)' : open ? 'hsl(var(--primary) / 0.1)' : 'transparent',
          color: saved ? 'hsl(var(--success))' : open ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
        }}
      >
        <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
          <path d="M5.5 1v.8M5.5 1A3.5 3.5 0 0 1 9 4.5c0 2 .8 3 1.2 3.5H.8C1.2 7.5 2 6.5 2 4.5A3.5 3.5 0 0 1 5.5 1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
          <path d="M4.5 8a1 1 0 0 0 2 0" stroke="currentColor" strokeWidth="1.2"/>
        </svg>
      </button>

      {open && (
        <div style={{
          position: 'absolute', bottom: '100%', right: 0, marginBottom: 6,
          background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))',
          borderRadius: 10, padding: 12, width: 200, zIndex: 50,
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)', animation: 'fadeUp 0.2s ease both',
        }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'hsl(var(--foreground))', marginBottom: 4, fontFamily: 'Syne, sans-serif' }}>
            Price Drop Alert
          </p>
          <p style={{ fontSize: 10, color: 'hsl(var(--muted-foreground))', marginBottom: 8 }}>
            Current: <strong style={{ color: 'hsl(var(--foreground))' }}>A${listing.price.toFixed(2)}</strong>
          </p>
          <input
            type="number"
            placeholder="Alert me at A$..."
            value={targetPrice}
            onChange={e => setTargetPrice(e.target.value)}
            style={{
              width: '100%', padding: '6px 8px', fontSize: 12, borderRadius: 6,
              background: 'hsl(var(--input))', border: '1px solid hsl(var(--border))',
              color: 'hsl(var(--foreground))', outline: 'none', marginBottom: 8,
            }}
          />
          <button
            onClick={handleSave}
            disabled={saving || !targetPrice}
            style={{
              width: '100%', padding: '6px', borderRadius: 6, fontSize: 11, fontWeight: 700,
              fontFamily: 'Syne, sans-serif', background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))',
              color: 'white', border: 'none', cursor: 'pointer', opacity: saving || !targetPrice ? 0.5 : 1,
            }}
          >
            {saving ? 'Saving…' : 'Set Alert'}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Skeleton ─────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div style={{ background: 'hsl(var(--card) / 0.6)', border: '1px solid hsl(var(--border))', borderRadius: 16, overflow: 'hidden' }}>
      <div style={{ height: 156, background: 'hsl(var(--muted) / 0.4)', animation: 'pulse 1.8s ease-in-out infinite' }} />
      <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[60, 85, 40].map((w, i) => (
          <div key={i} style={{ height: i === 1 ? 14 : 10, background: 'hsl(var(--muted) / 0.5)', borderRadius: 4, width: `${w}%`, animation: 'pulse 1.8s ease-in-out infinite', animationDelay: `${i * 0.1}s` }} />
        ))}
        <div style={{ height: 34, background: 'hsl(var(--muted) / 0.4)', borderRadius: 8, marginTop: 4, animation: 'pulse 1.8s ease-in-out infinite' }} />
      </div>
    </div>
  );
}

// ── Main product card ────────────────────────────────────────
function ProductCard({
  listing, isCheapest, isFastest, isComparing, onToggleCompare, onAddToWatchlist,
  displayCurrency, exchangeRate, query,
}: {
  listing: Listing; isCheapest: boolean; isFastest: boolean;
  isComparing: boolean; onToggleCompare: (l: Listing) => void;
  onAddToWatchlist: (l: Listing) => void;
  displayCurrency: string; exchangeRate: number; query?: string;
}) {
  const [imgError, setImgError] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const price = fmt(listing.price, listing.currency, displayCurrency, exchangeRate);
  const isDisabled = listing.stockStatus === 'Out of Stock' || (listing.stockStatus as string) === 'Unavailable';
  const trustScore = (listing as any).trustScore || 0;
  const trustLabel = (listing as any).trustLabel || 'Unverified';
  const priceHistory: { date: string; price: number }[] = (listing as any).priceHistory || [];

  // Delivery date estimation
  const deliveryDate = listing.deliveryDate || (() => {
    const d = new Date();
    d.setDate(d.getDate() + listing.deliveryDays);
    return d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });
  })();

  return (
    <div className="product-card" style={{ opacity: isDisabled ? 0.5 : 1, outline: isComparing ? '2px solid hsl(var(--primary))' : 'none', outlineOffset: 2 }}>
      {/* Top badge */}
      {(isCheapest || isFastest) && (
        <div style={{ padding: '5px 12px', background: isCheapest ? 'hsl(var(--success) / 0.08)' : 'hsl(var(--accent) / 0.08)', borderBottom: `1px solid ${isCheapest ? 'hsl(var(--success) / 0.15)' : 'hsl(var(--accent) / 0.15)'}`, display: 'flex', gap: 8 }}>
          {isCheapest && <span style={{ fontSize: 10, fontWeight: 700, color: 'hsl(var(--success))', fontFamily: 'Syne, sans-serif', letterSpacing: '0.05em' }}>★ BEST PRICE</span>}
          {isFastest && <span style={{ fontSize: 10, fontWeight: 700, color: 'hsl(var(--accent))', fontFamily: 'Syne, sans-serif', letterSpacing: '0.05em' }}>⚡ FASTEST</span>}
        </div>
      )}

      {/* Image */}
      <div style={{ height: 150, background: 'hsl(var(--muted) / 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid hsl(var(--border))', overflow: 'hidden', position: 'relative' }}>
        {listing.imageUrl && !imgError ? (
          <AppImage src={listing.imageUrl} alt={listing.title} width={280} height={150}
            style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 10 }}
            onError={() => setImgError(true)} />
        ) : (
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" style={{ color: 'hsl(var(--border))' }}>
            <rect x="2" y="6" width="24" height="16" rx="2" stroke="currentColor" strokeWidth="1.5"/>
            <circle cx="10" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M2 19l6-4.5 4.5 3.5 4.5-5.5 7 6" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
          </svg>
        )}
        {/* Condition pill on image */}
        <span style={{ position: 'absolute', top: 8, right: 8, fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: listing.condition === 'New' ? 'hsl(var(--success) / 0.85)' : 'hsl(var(--warning) / 0.85)', color: 'white', fontFamily: 'Syne, sans-serif', letterSpacing: '0.04em', backdropFilter: 'blur(4px)' }}>
          {listing.condition?.toUpperCase()}
        </span>
      </div>

      <div style={{ padding: '12px 12px 10px' }}>
        {/* Store + trust */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, gap: 4 }}>
          <span style={{ fontSize: 10, fontWeight: 700, fontFamily: 'Syne, sans-serif', color: 'hsl(var(--primary))', background: 'hsl(var(--primary) / 0.1)', border: '1px solid hsl(var(--primary) / 0.18)', borderRadius: 5, padding: '2px 7px', letterSpacing: '0.02em', maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {listing.marketplace}
          </span>
          <TrustBadge score={trustScore} label={trustLabel} />
        </div>

        {/* Title */}
        <p style={{ fontSize: 12, fontWeight: 500, color: 'hsl(var(--foreground))', lineHeight: 1.4, marginBottom: 8, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', fontFamily: 'DM Sans, sans-serif' }}>
          {listing.title}
        </p>

        {/* Price + rating */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 7 }}>
          <div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 20, color: 'hsl(var(--foreground))', lineHeight: 1, letterSpacing: '-0.02em' }}>
              {price}
            </div>
            {listing.shippingCost === 0 && <span style={{ fontSize: 9, color: 'hsl(var(--success))', marginTop: 2, display: 'block', fontWeight: 500 }}>Free shipping</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" style={{ color: 'hsl(var(--warning))' }}>
              <path d="M5.5 1l1.2 2.5 2.8.4-2 2 .5 2.8L5.5 7.3 2.9 8.7l.5-2.8-2-2 2.8-.4L5.5 1z" fill="currentColor"/>
            </svg>
            <span style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>{listing.sellerRating}</span>
            {listing.sellerReviews > 0 && <span style={{ fontSize: 10, color: 'hsl(var(--muted-foreground))', opacity: 0.6 }}>({listing.sellerReviews > 999 ? `${(listing.sellerReviews / 1000).toFixed(1)}k` : listing.sellerReviews})</span>}
          </div>
        </div>

        {/* Delivery with actual date */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
          <span style={{ fontSize: 9, fontWeight: 600, padding: '2px 5px', borderRadius: 4, fontFamily: 'Syne, sans-serif', letterSpacing: '0.04em', background: listing.shippingTier === 'Express' ? 'hsl(var(--accent) / 0.12)' : 'hsl(var(--primary) / 0.08)', color: listing.shippingTier === 'Express' ? 'hsl(var(--accent))' : 'hsl(var(--primary))', border: `1px solid ${listing.shippingTier === 'Express' ? 'hsl(var(--accent) / 0.2)' : 'hsl(var(--primary) / 0.15)'}` }}>
            {listing.shippingTier?.toUpperCase()}
          </span>
          <span style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>
            Arrives <strong style={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}>{deliveryDate}</strong>
          </span>
        </div>

        {/* Price history sparkline */}
        <div style={{ marginBottom: 8 }}>
          <button onClick={() => setShowHistory(h => !h)} style={{ fontSize: 10, color: 'hsl(var(--muted-foreground))', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 3, marginBottom: showHistory ? 6 : 0, transition: 'color 0.15s' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'hsl(var(--foreground))'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'hsl(var(--muted-foreground))'}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1 8l2.5-3 2 2 2.5-4 1 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Price history {showHistory ? '▲' : '▼'}
          </button>
          {showHistory && (
            <div style={{ animation: 'fadeUp 0.2s ease both' }}>
              <Sparkline data={priceHistory} />
              {priceHistory.length >= 2 && (
                <AIRecommendation
                  query={listing.productName}
                  currentPrice={listing.price}
                  priceHistory={priceHistory}
                  marketplace={listing.marketplace}
                />
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 4 }}>
          <a href={isDisabled ? undefined : listing.listingUrl} target="_blank" rel="noopener noreferrer"
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '8px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700, fontFamily: 'Syne, sans-serif', letterSpacing: '0.02em', background: isDisabled ? 'hsl(var(--muted) / 0.4)' : 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))', color: isDisabled ? 'hsl(var(--muted-foreground))' : 'white', boxShadow: isDisabled ? 'none' : '0 0 12px hsl(var(--primary) / 0.22)', pointerEvents: isDisabled ? 'none' : 'auto', textDecoration: 'none', transition: 'opacity 0.15s' }}
            onMouseEnter={e => { if (!isDisabled) (e.currentTarget as HTMLElement).style.opacity = '0.82'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
          >
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M1.5 5.5h8M5.5 1.5l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            {isDisabled ? 'Unavailable' : 'View Deal'}
          </a>

          {/* Watchlist */}
          <button onClick={() => onAddToWatchlist(listing)} title="Watchlist" style={{ width: 30, height: 30, borderRadius: 7, border: '1px solid hsl(var(--border))', background: 'transparent', cursor: 'pointer', color: 'hsl(var(--muted-foreground))', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLButtonElement; el.style.borderColor = 'hsl(var(--primary) / 0.35)'; el.style.color = 'hsl(var(--primary))'; }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLButtonElement; el.style.borderColor = 'hsl(var(--border))'; el.style.color = 'hsl(var(--muted-foreground))'; }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 10.5S1 7 1 4a3.5 3.5 0 016-2.45A3.5 3.5 0 0111 4C11 7 6 10.5 6 10.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg>
          </button>

          {/* Price alert */}
          <PriceAlertButton listing={listing} query={query} />

          {/* Share */}
          <ShareButton listing={listing} />

          {/* Compare */}
          <button onClick={() => onToggleCompare(listing)} title="Compare" style={{ width: 30, height: 30, borderRadius: 7, border: `1px solid ${isComparing ? 'hsl(var(--primary))' : 'hsl(var(--border))'}`, background: isComparing ? 'hsl(var(--primary) / 0.12)' : 'transparent', color: isComparing ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 3.5h8M2 8.5h8M7.5 1l3 2.5-3 2.5M4.5 5.5L1.5 8l3 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Barcode scanner ──────────────────────────────────────────
function BarcodeScanner({ onResult }: { onResult: (query: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [active, setActive] = useState(false);
  const [error, setError] = useState('');

  const startScan = async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setActive(true);

      // Use BarcodeDetector if available
      if ('BarcodeDetector' in window) {
        const detector = new (window as any).BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'qr_code'] });
        const scan = async () => {
          if (!videoRef.current || !active) return;
          try {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes.length > 0) {
              const barcode = barcodes[0].rawValue;
              stopScan();
              onResult(barcode);
            } else {
              requestAnimationFrame(scan);
            }
          } catch { requestAnimationFrame(scan); }
        };
        requestAnimationFrame(scan);
      } else {
        setError('Barcode scanning not supported on this browser. Try Chrome on Android.');
      }
    } catch {
      setError('Camera access denied. Please allow camera access.');
      setActive(false);
    }
  };

  const stopScan = () => {
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
    }
    setActive(false);
  };

  if (active) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 100, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <p style={{ color: 'white', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 16 }}>Point camera at barcode</p>
        <div style={{ position: 'relative', width: 300, height: 220, borderRadius: 12, overflow: 'hidden', border: '2px solid hsl(var(--primary))' }}>
          <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, border: '3px solid hsl(var(--primary) / 0.5)', borderRadius: 10 }} />
        </div>
        {error && <p style={{ color: 'hsl(var(--warning))', fontSize: 13, textAlign: 'center', maxWidth: 260 }}>{error}</p>}
        <button onClick={stopScan} className="btn-primary" style={{ fontSize: 13 }}>Cancel</button>
      </div>
    );
  }

  return (
    <button
      onClick={startScan}
      title="Scan barcode"
      style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '6px 12px', borderRadius: 8, border: '1px solid hsl(var(--border))', background: 'transparent', color: 'hsl(var(--muted-foreground))', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', transition: 'all 0.15s' }}
      onMouseEnter={e => { const el = e.currentTarget as HTMLButtonElement; el.style.borderColor = 'hsl(var(--primary) / 0.4)'; el.style.color = 'hsl(var(--primary))'; }}
      onMouseLeave={e => { const el = e.currentTarget as HTMLButtonElement; el.style.borderColor = 'hsl(var(--border))'; el.style.color = 'hsl(var(--muted-foreground))'; }}
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <rect x="1" y="2" width="2" height="10" rx="0.5" fill="currentColor"/>
        <rect x="4.5" y="2" width="1" height="10" rx="0.5" fill="currentColor"/>
        <rect x="7" y="2" width="2" height="10" rx="0.5" fill="currentColor"/>
        <rect x="10.5" y="2" width="1.5" height="10" rx="0.5" fill="currentColor"/>
        <path d="M1 1h2.5M10.5 1H13M1 13h2.5M10.5 13H13" stroke="hsl(var(--primary))" strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
      Scan
    </button>
  );
}

// ── Main export ──────────────────────────────────────────────
export default function ResultsGrid({
  listings, loading, hasSearched, compareItems, onToggleCompare, onAddToWatchlist,
  displayCurrency = 'AUD', exchangeRate = 1, onBarcodeSearch,
}: ResultsGridProps) {

  // Group by condition
  const newListings = listings.filter(l => l.condition === 'New' || !l.condition);
  const usedListings = listings.filter(l => l.condition === 'Used');
  const [conditionTab, setConditionTab] = useState<'all' | 'new' | 'used'>('all');

  const displayed = conditionTab === 'new' ? newListings : conditionTab === 'used' ? usedListings : listings;

  if (loading) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 12 }}>
        {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  if (!hasSearched) {
    return (
      <div style={{ textAlign: 'center', padding: '56px 20px' }}>
        <div style={{ width: 52, height: 52, borderRadius: 13, margin: '0 auto 14px', background: 'hsl(var(--primary) / 0.08)', border: '1px solid hsl(var(--primary) / 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" style={{ color: 'hsl(var(--primary))' }}>
            <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M15.5 15.5L19 19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
        <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 15, color: 'hsl(var(--foreground))', marginBottom: 5 }}>Search for any product</p>
        <p style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))', lineHeight: 1.6, marginBottom: 16 }}>Compare prices across 40+ global marketplaces</p>
        {onBarcodeSearch && <BarcodeScanner onResult={onBarcodeSearch} />}
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '56px 20px' }}>
        <div style={{ width: 52, height: 52, borderRadius: 13, margin: '0 auto 14px', background: 'hsl(var(--muted) / 0.5)', border: '1px solid hsl(var(--border))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" style={{ color: 'hsl(var(--muted-foreground))' }}>
            <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M7 7l8 8M15 7l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
        <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 15, color: 'hsl(var(--foreground))', marginBottom: 5 }}>No results found</p>
        <p style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))' }}>Try different filters or a new search term</p>
      </div>
    );
  }

  const inStock = displayed.filter(l => l.stockStatus !== 'Out of Stock');
  const cheapestId = inStock.length > 0 ? [...inStock].sort((a, b) => a.price - b.price)[0]?.id : null;
  const fastestId = inStock.length > 0 ? [...inStock].sort((a, b) => a.deliveryDays - b.deliveryDays)[0]?.id : null;

  return (
    <div>
      {/* Condition tabs + barcode scanner */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {([
            { id: 'all', label: `All (${listings.length})` },
            { id: 'new', label: `New (${newListings.length})` },
            { id: 'used', label: `Used (${usedListings.length})` },
          ] as const).map(tab => (
            <button key={tab.id} onClick={() => setConditionTab(tab.id)} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, cursor: 'pointer', border: '1px solid', fontFamily: 'DM Sans, sans-serif', transition: 'all 0.15s', borderColor: conditionTab === tab.id ? 'hsl(var(--primary) / 0.5)' : 'hsl(var(--border))', background: conditionTab === tab.id ? 'hsl(var(--primary) / 0.1)' : 'transparent', color: conditionTab === tab.id ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))', fontWeight: conditionTab === tab.id ? 600 : 400 }}>
              {tab.label}
            </button>
          ))}
        </div>
        {onBarcodeSearch && <BarcodeScanner onResult={onBarcodeSearch} />}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 12 }}>
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
            query={listing.productName}
          />
        ))}
      </div>
    </div>
  );
}
