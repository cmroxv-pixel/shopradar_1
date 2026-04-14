'use client';
import React, { useState } from 'react';
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
}

const SYMBOLS: Record<string, string> = {
  AUD: 'A$', USD: '$', GBP: '£', EUR: '€', CAD: 'C$', JPY: '¥', NZD: 'NZ$',
};

function fmt(price: number, currency: string, displayCurrency: string, rate: number) {
  const converted = displayCurrency !== currency ? price * rate : price;
  return `${SYMBOLS[displayCurrency] || displayCurrency + ' '}${converted.toFixed(2)}`;
}

function SkeletonCard() {
  return (
    <div style={{
      background: 'hsl(var(--card) / 0.6)',
      border: '1px solid hsl(var(--border))',
      borderRadius: 16, overflow: 'hidden',
    }}>
      <div style={{ height: 156, background: 'hsl(var(--muted) / 0.4)', animation: 'pulse 1.8s ease-in-out infinite' }} />
      <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[60, 85, 40].map((w, i) => (
          <div key={i} style={{
            height: i === 1 ? 14 : 10,
            background: 'hsl(var(--muted) / 0.5)',
            borderRadius: 4, width: `${w}%`,
            animation: 'pulse 1.8s ease-in-out infinite',
            animationDelay: `${i * 0.1}s`,
          }} />
        ))}
        <div style={{ height: 34, background: 'hsl(var(--muted) / 0.4)', borderRadius: 8, marginTop: 4, animation: 'pulse 1.8s ease-in-out infinite' }} />
      </div>
    </div>
  );
}

function ProductCard({
  listing, isCheapest, isFastest, isComparing, onToggleCompare, onAddToWatchlist, displayCurrency, exchangeRate,
}: {
  listing: Listing; isCheapest: boolean; isFastest: boolean;
  isComparing: boolean; onToggleCompare: (l: Listing) => void;
  onAddToWatchlist: (l: Listing) => void;
  displayCurrency: string; exchangeRate: number;
}) {
  const [imgError, setImgError] = useState(false);
  const price = fmt(listing.price, listing.currency, displayCurrency, exchangeRate);
  const isDisabled = listing.stockStatus === 'Out of Stock' || (listing.stockStatus as string) === 'Unavailable';

  return (
    <div
      className="product-card"
      style={{
        opacity: isDisabled ? 0.5 : 1,
        outline: isComparing ? '2px solid hsl(var(--primary))' : 'none',
        outlineOffset: 2,
      }}
    >
      {/* Top badge */}
      {(isCheapest || isFastest) && (
        <div style={{
          padding: '5px 12px',
          background: isCheapest ? 'hsl(var(--success) / 0.08)' : 'hsl(var(--accent) / 0.08)',
          borderBottom: `1px solid ${isCheapest ? 'hsl(var(--success) / 0.15)' : 'hsl(var(--accent) / 0.15)'}`,
          display: 'flex', gap: 8,
        }}>
          {isCheapest && (
            <span style={{ fontSize: 10, fontWeight: 700, color: 'hsl(var(--success))', fontFamily: 'Syne, sans-serif', letterSpacing: '0.05em' }}>
              ★ BEST PRICE
            </span>
          )}
          {isFastest && (
            <span style={{ fontSize: 10, fontWeight: 700, color: 'hsl(var(--accent))', fontFamily: 'Syne, sans-serif', letterSpacing: '0.05em' }}>
              ⚡ FASTEST
            </span>
          )}
        </div>
      )}

      {/* Image */}
      <div style={{
        height: 156,
        background: 'hsl(var(--muted) / 0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderBottom: '1px solid hsl(var(--border))', overflow: 'hidden',
      }}>
        {listing.imageUrl && !imgError ? (
          <AppImage
            src={listing.imageUrl}
            alt={listing.title}
            width={280}
            height={156}
            style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 10 }}
            onError={() => setImgError(true)}
          />
        ) : (
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" style={{ color: 'hsl(var(--border))' }}>
            <rect x="3" y="7" width="26" height="18" rx="3" stroke="currentColor" strokeWidth="1.5"/>
            <circle cx="11" cy="14" r="3" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M3 22l7-5 5 4 5-6 9 7" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
          </svg>
        )}
      </div>

      <div style={{ padding: '12px 12px 10px' }}>
        {/* Store + condition */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
          <span style={{
            fontSize: 10, fontWeight: 700, fontFamily: 'Syne, sans-serif',
            color: 'hsl(var(--primary))',
            background: 'hsl(var(--primary) / 0.1)',
            border: '1px solid hsl(var(--primary) / 0.18)',
            borderRadius: 5, padding: '2px 7px', letterSpacing: '0.02em',
            maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {listing.marketplace}
          </span>
          <span style={{ fontSize: 10, color: 'hsl(var(--muted-foreground))' }}>
            {listing.condition}
          </span>
        </div>

        {/* Title */}
        <p style={{
          fontSize: 13, fontWeight: 500, color: 'hsl(var(--foreground))',
          lineHeight: 1.45, marginBottom: 9,
          display: '-webkit-box', WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical', overflow: 'hidden',
          fontFamily: 'DM Sans, sans-serif',
        }}>
          {listing.title}
        </p>

        {/* Price + rating */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 8 }}>
          <div>
            <div style={{
              fontFamily: 'Syne, sans-serif', fontWeight: 800,
              fontSize: 20, color: 'hsl(var(--foreground))',
              lineHeight: 1, letterSpacing: '-0.02em',
            }}>
              {price}
            </div>
            {listing.shippingCost === 0 && (
              <span style={{ fontSize: 10, color: 'hsl(var(--success))', marginTop: 2, display: 'block', fontWeight: 500 }}>
                Free shipping
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" style={{ color: 'hsl(var(--warning))' }}>
              <path d="M5.5 1l1.2 2.5 2.8.4-2 2 .5 2.8L5.5 7.3 2.9 8.7l.5-2.8-2-2 2.8-.4L5.5 1z" fill="currentColor"/>
            </svg>
            <span style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>
              {listing.sellerRating}
            </span>
          </div>
        </div>

        {/* Delivery */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 10 }}>
          <span style={{
            fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 4,
            fontFamily: 'Syne, sans-serif', letterSpacing: '0.04em',
            background: listing.shippingTier === 'Express' ? 'hsl(var(--accent) / 0.12)' : 'hsl(var(--primary) / 0.08)',
            color: listing.shippingTier === 'Express' ? 'hsl(var(--accent))' : 'hsl(var(--primary))',
            border: `1px solid ${listing.shippingTier === 'Express' ? 'hsl(var(--accent) / 0.2)' : 'hsl(var(--primary) / 0.15)'}`,
          }}>
            {listing.shippingTier?.toUpperCase()}
          </span>
          <span style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>
            {listing.deliveryDate ? `Arrives ${listing.deliveryDate}` : `Est. ${listing.deliveryDays}d`}
          </span>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 5 }}>
          <a
            href={isDisabled ? undefined : listing.listingUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700,
              fontFamily: 'Syne, sans-serif', letterSpacing: '0.02em',
              background: isDisabled
                ? 'hsl(var(--muted) / 0.4)'
                : 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))',
              color: isDisabled ? 'hsl(var(--muted-foreground))' : 'white',
              boxShadow: isDisabled ? 'none' : '0 0 14px hsl(var(--primary) / 0.25)',
              pointerEvents: isDisabled ? 'none' : 'auto',
              textDecoration: 'none', transition: 'opacity 0.15s',
            }}
            onMouseEnter={e => { if (!isDisabled) (e.currentTarget as HTMLElement).style.opacity = '0.82'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
          >
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
              <path d="M1.5 5.5h8M5.5 1.5l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {isDisabled ? 'Unavailable' : 'View Deal'}
          </a>

          {/* Watchlist */}
          <button
            onClick={() => onAddToWatchlist(listing)}
            title="Watchlist"
            style={{
              width: 32, height: 32, borderRadius: 7,
              border: '1px solid hsl(var(--border))',
              background: 'transparent', cursor: 'pointer',
              color: 'hsl(var(--muted-foreground))',
              display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.borderColor = 'hsl(var(--primary) / 0.35)';
              el.style.color = 'hsl(var(--primary))';
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.borderColor = 'hsl(var(--border))';
              el.style.color = 'hsl(var(--muted-foreground))';
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 10.5S1 7 1 4a3.5 3.5 0 016-2.45A3.5 3.5 0 0111 4C11 7 6 10.5 6 10.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
            </svg>
          </button>

          {/* Compare */}
          <button
            onClick={() => onToggleCompare(listing)}
            title="Compare"
            style={{
              width: 32, height: 32, borderRadius: 7, cursor: 'pointer',
              border: `1px solid ${isComparing ? 'hsl(var(--primary))' : 'hsl(var(--border))'}`,
              background: isComparing ? 'hsl(var(--primary) / 0.12)' : 'transparent',
              color: isComparing ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
              display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 3.5h8M2 8.5h8M7.5 1l3 2.5-3 2.5M4.5 5.5L1.5 8l3 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ResultsGrid({
  listings, loading, hasSearched, compareItems, onToggleCompare, onAddToWatchlist,
  displayCurrency = 'AUD', exchangeRate = 1,
}: ResultsGridProps) {

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
        <div style={{
          width: 52, height: 52, borderRadius: 13, margin: '0 auto 14px',
          background: 'hsl(var(--primary) / 0.08)',
          border: '1px solid hsl(var(--primary) / 0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" style={{ color: 'hsl(var(--primary))' }}>
            <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M15.5 15.5L19 19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
        <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 15, color: 'hsl(var(--foreground))', marginBottom: 5 }}>
          Search for any product
        </p>
        <p style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))', lineHeight: 1.6 }}>
          Compare prices across 40+ global marketplaces
        </p>
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '56px 20px' }}>
        <div style={{
          width: 52, height: 52, borderRadius: 13, margin: '0 auto 14px',
          background: 'hsl(var(--muted) / 0.5)',
          border: '1px solid hsl(var(--border))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" style={{ color: 'hsl(var(--muted-foreground))' }}>
            <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M7 7l8 8M15 7l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
        <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 15, color: 'hsl(var(--foreground))', marginBottom: 5 }}>
          No results found
        </p>
        <p style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))' }}>
          Try different filters or a new search term
        </p>
      </div>
    );
  }

  const inStock = listings.filter(l => l.stockStatus !== 'Out of Stock');
  const cheapestId = inStock.length > 0 ? [...inStock].sort((a, b) => a.price - b.price)[0]?.id : null;
  const fastestId = inStock.length > 0 ? [...inStock].sort((a, b) => a.deliveryDays - b.deliveryDays)[0]?.id : null;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 12 }}>
      {listings.map(listing => (
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
  );
}
