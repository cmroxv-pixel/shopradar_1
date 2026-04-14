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

const SYMBOLS: Record<string, string> = { AUD: 'A$', USD: '$', GBP: '£', EUR: '€', CAD: 'C$', JPY: '¥', NZD: 'NZ$' };

function fmt(price: number, currency: string, displayCurrency: string, rate: number) {
  const converted = displayCurrency !== currency ? price * rate : price;
  return `${SYMBOLS[displayCurrency] || displayCurrency + ' '}${converted.toFixed(2)}`;
}

function SkeletonCard() {
  return (
    <div style={{
      background: 'rgba(10,13,26,0.6)', border: '1px solid rgba(99,120,255,0.08)',
      borderRadius: 16, overflow: 'hidden', animation: 'pulse 1.8s ease-in-out infinite',
    }}>
      <div style={{ height: 160, background: 'rgba(99,120,255,0.05)' }} />
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ height: 10, background: 'rgba(99,120,255,0.07)', borderRadius: 4, width: '60%' }} />
        <div style={{ height: 14, background: 'rgba(99,120,255,0.07)', borderRadius: 4, width: '85%' }} />
        <div style={{ height: 22, background: 'rgba(99,120,255,0.07)', borderRadius: 4, width: '40%' }} />
        <div style={{ height: 36, background: 'rgba(99,120,255,0.06)', borderRadius: 8, marginTop: 4 }} />
      </div>
    </div>
  );
}

function ProductCard({
  listing, rank, isCheapest, isFastest, isComparing, onToggleCompare, onAddToWatchlist, displayCurrency, exchangeRate,
}: {
  listing: Listing; rank: number; isCheapest: boolean; isFastest: boolean;
  isComparing: boolean; onToggleCompare: (l: Listing) => void; onAddToWatchlist: (l: Listing) => void;
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
        outline: isComparing ? '2px solid var(--primary)' : 'none',
        outlineOffset: 2,
      }}
    >
      {/* Best price / fastest badge */}
      {(isCheapest || isFastest) && (
        <div style={{
          padding: '6px 14px',
          background: isCheapest ? 'rgba(52,211,153,0.08)' : 'rgba(168,85,247,0.08)',
          borderBottom: `1px solid ${isCheapest ? 'rgba(52,211,153,0.12)' : 'rgba(168,85,247,0.12)'}`,
          display: 'flex', gap: 8,
        }}>
          {isCheapest && (
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--success)', fontFamily: 'Syne, sans-serif', letterSpacing: '0.04em' }}>
              ★ BEST PRICE
            </span>
          )}
          {isFastest && (
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', fontFamily: 'Syne, sans-serif', letterSpacing: '0.04em' }}>
              ⚡ FASTEST
            </span>
          )}
        </div>
      )}

      {/* Image */}
      <div style={{
        height: 160, background: 'rgba(6,8,15,0.8)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderBottom: '1px solid var(--border)', overflow: 'hidden',
      }}>
        {listing.imageUrl && !imgError ? (
          <AppImage
            src={listing.imageUrl}
            alt={listing.title}
            width={280}
            height={160}
            style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 12 }}
            onError={() => setImgError(true)}
          />
        ) : (
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none" style={{ color: 'rgba(99,120,255,0.2)' }}>
            <rect x="4" y="8" width="28" height="20" rx="3" stroke="currentColor" strokeWidth="1.5"/>
            <circle cx="13" cy="16" r="3" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M4 24l7-5 5 4 5-6 11 7" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
          </svg>
        )}
      </div>

      <div style={{ padding: '14px 14px 12px' }}>
        {/* Store pill */}
        <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span style={{
            fontSize: 11, fontWeight: 700, fontFamily: 'Syne, sans-serif',
            color: 'var(--primary)', background: 'rgba(99,120,255,0.1)',
            border: '1px solid rgba(99,120,255,0.18)',
            borderRadius: 6, padding: '2px 8px', letterSpacing: '0.02em',
            maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {listing.marketplace}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
            {listing.condition}
          </span>
        </div>

        {/* Title */}
        <p style={{
          fontSize: 13, fontWeight: 500, color: 'var(--text)', lineHeight: 1.45,
          marginBottom: 10, display: '-webkit-box', WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical', overflow: 'hidden',
          fontFamily: 'DM Sans, sans-serif',
        }}>
          {listing.title}
        </p>

        {/* Price + rating */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 10 }}>
          <div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 22, color: 'var(--text)', lineHeight: 1, letterSpacing: '-0.02em' }}>
              {price}
            </div>
            {listing.shippingCost === 0 && (
              <span style={{ fontSize: 10, color: 'var(--success)', fontWeight: 500, marginTop: 2, display: 'block' }}>Free shipping</span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ color: '#fbbf24' }}>
              <path d="M6 1l1.4 2.8L10.5 4l-2.25 2.2.53 3.1L6 7.75l-2.78 1.55.53-3.1L1.5 4l3.1-.2L6 1z" fill="currentColor"/>
            </svg>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'DM Sans' }}>{listing.sellerRating}</span>
          </div>
        </div>

        {/* Delivery */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
          <span style={{
            fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 5,
            background: listing.shippingTier === 'Express' ? 'rgba(168,85,247,0.12)' : 'rgba(99,120,255,0.08)',
            color: listing.shippingTier === 'Express' ? 'var(--accent)' : 'var(--primary)',
            border: `1px solid ${listing.shippingTier === 'Express' ? 'rgba(168,85,247,0.2)' : 'rgba(99,120,255,0.15)'}`,
            fontFamily: 'Syne, sans-serif', letterSpacing: '0.04em',
          }}>
            {listing.shippingTier?.toUpperCase()}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {listing.deliveryDate ? `Arrives ${listing.deliveryDate}` : `Est. ${listing.deliveryDays}d`}
          </span>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 6 }}>
          <a
            href={isDisabled ? undefined : listing.listingUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '9px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700,
              fontFamily: 'Syne, sans-serif', letterSpacing: '0.02em',
              background: isDisabled ? 'rgba(99,120,255,0.06)' : 'linear-gradient(135deg, var(--primary), var(--accent))',
              color: isDisabled ? 'var(--text-dim)' : 'white',
              boxShadow: isDisabled ? 'none' : '0 0 16px var(--primary-glow)',
              pointerEvents: isDisabled ? 'none' : 'auto',
              textDecoration: 'none', transition: 'opacity 0.15s',
            }}
            onMouseEnter={e => { if (!isDisabled) (e.currentTarget as HTMLElement).style.opacity = '0.85'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6h8M6 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            {isDisabled ? 'Unavailable' : 'View Deal'}
          </a>

          {/* Watchlist */}
          <button
            onClick={() => onAddToWatchlist(listing)}
            title="Add to watchlist"
            style={{
              width: 34, height: 34, borderRadius: 8, border: '1px solid var(--border)',
              background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,120,255,0.3)'; (e.currentTarget as HTMLElement).style.color = 'var(--primary)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; }}
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M6.5 11S1 7.5 1 4.5a3 3 0 015.5-1.65A3 3 0 0112 4.5C12 7.5 6.5 11 6.5 11z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>
          </button>

          {/* Compare */}
          <button
            onClick={() => onToggleCompare(listing)}
            title={isComparing ? 'Remove from compare' : 'Compare'}
            style={{
              width: 34, height: 34, borderRadius: 8,
              border: `1px solid ${isComparing ? 'var(--primary)' : 'var(--border)'}`,
              background: isComparing ? 'rgba(99,120,255,0.12)' : 'transparent',
              color: isComparing ? 'var(--primary)' : 'var(--text-muted)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 4h9M2 9h9M8 1l3 3-3 3M5 6l-3 3 3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
        {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  if (!hasSearched) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{
          width: 56, height: 56, borderRadius: 14, margin: '0 auto 16px',
          background: 'rgba(99,120,255,0.08)', border: '1px solid rgba(99,120,255,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--primary)' }}>
            <circle cx="11" cy="11" r="7.5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M16.5 16.5L20 20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
        <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 6 }}>
          Search for any product
        </p>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
          Compare prices across 40+ global marketplaces
        </p>
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{
          width: 56, height: 56, borderRadius: 14, margin: '0 auto 16px',
          background: 'rgba(99,120,255,0.06)', border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--text-muted)' }}>
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M8 8l8 8M16 8l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
        <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 6 }}>
          No results found
        </p>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Try widening your filters or a different search term</p>
      </div>
    );
  }

  const inStock = listings.filter(l => l.stockStatus !== 'Out of Stock');
  const cheapestId = inStock.length > 0 ? [...inStock].sort((a, b) => a.price - b.price)[0]?.id : null;
  const fastestId = inStock.length > 0 ? [...inStock].sort((a, b) => a.deliveryDays - b.deliveryDays)[0]?.id : null;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
      {listings.map((listing, i) => (
        <ProductCard
          key={listing.id}
          listing={listing}
          rank={i + 1}
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
