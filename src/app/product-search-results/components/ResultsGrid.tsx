'use client';
import React, { useState } from 'react';
import type { Listing } from './mockData';
import PriceSparkline from './PriceSparkline';
import AppImage from '@/components/ui/AppImage';
import { Bookmark, GitCompare, ExternalLink, Star, Truck, Zap, Package, AlertTriangle, CheckCircle, XCircle, ChevronDown, ChevronUp, Clock, Share2, TrendingDown, Flame, Tag } from 'lucide-react';

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

// Currency symbols map
const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$', EUR: '€', GBP: '£', AUD: 'A$', CAD: 'C$', JPY: '¥', INR: '₹', SGD: 'S$', NZD: 'NZ$', CHF: 'Fr',
};

function formatPrice(price: number, currency: string, displayCurrency: string, exchangeRate: number): string {
  const converted = displayCurrency !== currency ? price * exchangeRate : price;
  const sym = CURRENCY_SYMBOLS[displayCurrency] || displayCurrency + ' ';
  return `${sym}${converted.toFixed(2)}`;
}

function DealScoreBadge({ savingsPct }: { savingsPct: number }) {
  if (savingsPct <= 0) return null;
  if (savingsPct >= 30) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-destructive/10 text-destructive border border-destructive/20">
      <Flame size={9} fill="currentColor" /> Hot Deal −{savingsPct}%
    </span>
  );
  if (savingsPct >= 15) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-success/10 text-success border border-success/20">
      <TrendingDown size={9} /> Good Deal −{savingsPct}%
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
      <Tag size={9} /> −{savingsPct}%
    </span>
  );
}

function StockBadge({ status, count }: { status: Listing['stockStatus']; count?: number }) {
  if (status === 'In Stock') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success border border-success/20">
      <CheckCircle size={10} /> In Stock
    </span>
  );
  if (status === 'Low Stock') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-warning/10 text-warning border border-warning/20">
      <AlertTriangle size={10} /> Only {count} left
    </span>
  );
  if (status === 'Pre-Order') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-500 border border-blue-500/20">
      <Clock size={10} /> Pre-Order
    </span>
  );
  if (status === 'Unavailable') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border">
      <XCircle size={10} /> Unavailable
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-destructive/10 text-destructive border border-destructive/20">
      <XCircle size={10} /> Out of Stock
    </span>
  );
}

function ShippingBadge({ tier }: { tier: Listing['shippingTier'] }) {
  if (tier === 'Express') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-accent/15 text-accent border border-accent/25">
      <Zap size={9} fill="currentColor" /> Express
    </span>
  );
  if (tier === 'Standard') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
      <Truck size={9} /> Standard
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border">
      <Package size={9} /> Economy
    </span>
  );
}

function ShareButton({ listing }: { listing: Listing }) {
  const [copied, setCopied] = useState(false);

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const shareText = `Check out ${listing.productName} on ${listing.marketplace} for ${listing.currency === 'USD' ? '$' : listing.currency + ' '}${listing.price.toFixed(2)}! Found via ShopRadar`;
    const shareUrl = listing.listingUrl;

    if (navigator.share) {
      try {
        await navigator.share({ title: listing.productName, text: shareText, url: shareUrl });
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={handleShare}
      title="Share this deal"
      className={`p-2.5 rounded-xl border transition-all duration-150 active:scale-95 ${copied ? 'border-success bg-success/10 text-success' : 'border-border text-muted-foreground hover:text-foreground hover:border-border'}`}
    >
      <Share2 size={15} />
    </button>
  );
}

function SimilarProductsSection({ listing, allListings }: { listing: Listing; allListings: Listing[] }) {
  const similar = allListings
    .filter(l => l.id !== listing.id && l.productName === listing.productName)
    .slice(0, 3);

  if (similar.length === 0) return null;

  return (
    <div className="mt-3 pt-3 border-t border-border">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Also available at</p>
      <div className="space-y-1.5">
        {similar.map(s => (
          <a
            key={s.id}
            href={s.listingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-lg bg-muted/40 border border-border hover:border-primary/30 hover:bg-primary/5 transition-all duration-150"
          >
            <span className="font-medium text-foreground">{s.marketplaceLogo} {s.marketplace}</span>
            <span className="font-bold text-foreground tabular-nums">
              {s.currency === 'USD' ? '$' : s.currency + ' '}{s.price.toFixed(2)}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}

function ListingCard({
  listing,
  rank,
  isFastest,
  isCheapest,
  isComparing,
  onToggleCompare,
  onAddToWatchlist,
  displayCurrency,
  exchangeRate,
  allListings,
}: {
  listing: Listing;
  rank: number;
  isFastest: boolean;
  isCheapest: boolean;
  isComparing: boolean;
  onToggleCompare: (l: Listing) => void;
  onAddToWatchlist: (l: Listing) => void;
  displayCurrency: string;
  exchangeRate: number;
  allListings: Listing[];
}) {
  const [expanded, setExpanded] = useState(false);
  const [showSimilar, setShowSimilar] = useState(false);
  const savings = listing.originalPrice - listing.price;
  const savingsPct = Math.round((savings / listing.originalPrice) * 100);
  const isOutOfStock = listing.stockStatus === 'Out of Stock';
  const isUnavailable = listing.stockStatus === 'Unavailable';
  const isPreOrder = listing.stockStatus === 'Pre-Order';
  const isDisabled = isOutOfStock || isUnavailable;

  // Determine display currency: if listing is AUD, show AUD; otherwise use selected display currency
  const listingIsAud = listing.currency === 'AUD';
  const showConverted = !listingIsAud && displayCurrency !== listing.currency;
  const effectiveDisplayCurrency = listingIsAud ? 'AUD' : displayCurrency;
  const effectiveRate = listingIsAud ? 1 : exchangeRate;
  const convertedPrice = formatPrice(listing.price, listing.currency, effectiveDisplayCurrency, effectiveRate);
  const convertedOriginal = formatPrice(listing.originalPrice, listing.currency, effectiveDisplayCurrency, effectiveRate);

  // Title to display: prefer listing.title over productName
  const displayTitle = listing.title && listing.title !== listing.productName
    ? listing.title
    : listing.productName;

  return (
    <div className={`bg-card border rounded-2xl overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 ${isDisabled ? 'opacity-55' : ''} ${isComparing ? 'border-primary ring-2 ring-primary/20 shadow-md shadow-primary/10' : 'border-border hover:border-primary/40 shadow-sm'}`}>
      {/* Top highlight bar */}
      {(isCheapest || isFastest) && (
        <div className={`flex gap-2 px-4 py-2.5 ${isCheapest ? 'bg-primary/8' : 'bg-accent/8'} border-b border-border`}>
          {isCheapest && (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-primary">
              🏆 Best Price
            </span>
          )}
          {isFastest && (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-accent">
              ⚡ Fastest Delivery
            </span>
          )}
        </div>
      )}

      <div className="p-4">
        {/* Product image — always shown, placeholder if no URL */}
        <div className="w-full h-44 rounded-xl overflow-hidden bg-muted border border-border mb-3 flex items-center justify-center">
          {listing.imageUrl ? (
            <AppImage
              src={listing.imageUrl}
              alt={`${displayTitle} from ${listing.marketplace}`}
              width={400}
              height={176}
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="flex flex-col items-center gap-1.5 text-muted-foreground/50">
              <Package size={32} />
              <span className="text-xs">No image</span>
            </div>
          )}
        </div>

        {/* Site name — prominent pill */}
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20 text-xs font-bold text-primary">
            {listing.marketplace}
          </span>
          <span className="text-xs text-muted-foreground">{listing.condition}</span>
          {listing.freeReturns && <span className="text-xs text-success">· Free returns</span>}
        </div>

        {/* Title — big and bold */}
        <p className="text-base font-bold text-foreground leading-snug line-clamp-2 mb-3">
          {displayTitle}
        </p>

        {/* Stock + deal badges */}
        <div className="flex items-center gap-1.5 flex-wrap mb-3">
          <StockBadge status={listing.stockStatus} count={listing.stockCount} />
          <DealScoreBadge savingsPct={savingsPct} />
        </div>

        {/* Price block */}
        <div className="flex items-end justify-between gap-2 mb-3">
          <div>
            <div className="text-2xl font-bold text-foreground tabular-nums leading-none">
              {convertedPrice}
            </div>
            {listing.originalPrice > listing.price && (
              <div className="text-xs text-muted-foreground line-through tabular-nums mt-0.5">
                {convertedOriginal}
              </div>
            )}
            {showConverted && (
              <div className="text-[10px] text-muted-foreground mt-0.5">
                orig. {listing.currency} {listing.price.toFixed(2)}
              </div>
            )}
          </div>

          {/* Rating */}
          <div className="flex items-center gap-1 shrink-0">
            {[1,2,3,4,5].map(i => (
              <Star
                key={`star-${listing.id}-${i}`}
                size={11}
                className={i <= Math.round(listing.sellerRating) ? 'text-accent' : 'text-muted'}
                fill={i <= Math.round(listing.sellerRating) ? 'currentColor' : 'none'}
              />
            ))}
            <span className="text-xs text-muted-foreground ml-1">{listing.sellerRating}</span>
          </div>
        </div>

        {/* Shipping badge + delivery info — always shown */}
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <ShippingBadge tier={listing.shippingTier} />
          {!isDisabled && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Truck size={11} className="text-primary" />
              {listing.deliveryDate
                ? `Arrives ${listing.deliveryDate}`
                : `Est. ${listing.deliveryDays} day${listing.deliveryDays !== 1 ? 's' : ''}`}
              {listing.shippingCost === 0 && <span className="text-success ml-1">· Free</span>}
            </span>
          )}
        </div>

        {/* Price sparkline */}
        <div className="pt-3 border-t border-border">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-muted-foreground font-medium">30-day price trend</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSimilar(!showSimilar)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Similar {showSimilar ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
              </button>
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {expanded ? 'Less' : 'Shipping'} {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
              </button>
            </div>
          </div>
          <PriceSparkline data={listing.priceHistory} />
        </div>

        {/* Similar products */}
        {showSimilar && (
          <SimilarProductsSection listing={listing} allListings={allListings} />
        )}

        {/* Expanded delivery options */}
        {expanded && listing.deliveryOptions.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Available Shipping</p>
            {listing.deliveryOptions.map((opt, i) => (
              <div key={`${listing.id}-opt-${i}`} className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-lg bg-muted/40 border border-border">
                <div className="flex items-center gap-2">
                  <ShippingBadge tier={opt.tier} />
                  <span className="text-muted-foreground">{opt.days} day{opt.days !== 1 ? 's' : ''}</span>
                </div>
                <span className="font-semibold text-foreground tabular-nums">
                  {opt.cost === 0 ? <span className="text-success">Free</span> : `$${opt.cost.toFixed(2)}`}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="mt-4 flex items-center gap-2">
          <a
            href={listing.listingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 active:scale-95 ${isDisabled ? 'bg-muted text-muted-foreground cursor-not-allowed pointer-events-none' : isPreOrder ? 'bg-blue-500 text-white hover:opacity-90 shadow-sm shadow-blue-500/20' : 'bg-primary text-white hover:opacity-90 shadow-sm shadow-primary/20'}`}
          >
            {isDisabled
              ? (isUnavailable ? 'Unavailable' : 'Out of Stock')
              : isPreOrder
                ? <><Clock size={13} /> Pre-Order on {listing.marketplace}</>
                : <><ExternalLink size={13} /> View Deal on {listing.marketplace}</>
            }
          </a>
          <button
            onClick={() => onAddToWatchlist(listing)}
            title="Add to watchlist"
            className="p-2.5 rounded-xl border border-border text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all duration-150 active:scale-95"
          >
            <Bookmark size={15} />
          </button>
          <ShareButton listing={listing} />
          <button
            onClick={() => onToggleCompare(listing)}
            title={isComparing ? 'Remove from comparison' : 'Add to comparison'}
            className={`p-2.5 rounded-xl border transition-all duration-150 active:scale-95 ${isComparing ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground hover:border-border'}`}
          >
            <GitCompare size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={`skel-${i}`} className="bg-card border border-border rounded-2xl p-4 space-y-3 animate-pulse">
          <div className="flex gap-3.5">
            <div className="w-[72px] h-[72px] rounded-xl bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded-lg w-3/4" />
              <div className="h-3 bg-muted rounded-lg w-1/2" />
              <div className="h-5 bg-muted rounded-lg w-1/3" />
            </div>
          </div>
          <div className="h-8 bg-muted rounded-lg" />
          <div className="h-10 bg-muted rounded-xl" />
        </div>
      ))}
    </div>
  );
}

export default function ResultsGrid({
  listings, loading, hasSearched, compareItems, onToggleCompare, onAddToWatchlist,
  displayCurrency = 'USD', exchangeRate = 1, selectedCategory,
}: ResultsGridProps) {
  if (loading) return <LoadingSkeleton />;

  if (!hasSearched) {
    return (
      <div className="flex flex-col items-center justify-center py-28 text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
          <Package size={28} className="text-primary" />
        </div>
        <h3 className="text-lg font-bold text-foreground">Search for any product</h3>
        <p className="text-sm text-muted-foreground mt-1.5 max-w-sm leading-relaxed">
          Enter a product name above to compare prices across 40+ global marketplaces
        </p>
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-28 text-center">
        <div className="w-16 h-16 rounded-2xl bg-muted border border-border flex items-center justify-center mb-4">
          <XCircle size={28} className="text-muted-foreground" />
        </div>
        <h3 className="text-lg font-bold text-foreground">No listings match your filters</h3>
        <p className="text-sm text-muted-foreground mt-1.5">Try widening your price range or removing marketplace filters</p>
      </div>
    );
  }

  const inStockListings = listings.filter(l => l.stockStatus !== 'Out of Stock');
  const cheapestId = inStockListings.length > 0 ? [...inStockListings].sort((a,b) => a.price - b.price)[0]?.id : null;
  const fastestId = inStockListings.length > 0 ? [...inStockListings].sort((a,b) => a.deliveryDays - b.deliveryDays)[0]?.id : null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {listings.map((listing, i) => (
        <ListingCard
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
          allListings={listings}
        />
      ))}
    </div>
  );
}