'use client';
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Toaster, toast } from 'sonner';
import AddressSelector from './AddressSelector';
import ResultsGrid from './ResultsGrid';
import ComparisonDrawer from './ComparisonDrawer';
import { type Listing } from './mockData';

const STEPS = [
  { msg: 'Querying Google Shopping…',          pct: 12 },
  { msg: 'Scanning 40+ global marketplaces…',  pct: 28 },
  { msg: 'Resolving direct product URLs…',     pct: 46 },
  { msg: 'Fetching individual store pages…',   pct: 63 },
  { msg: 'Comparing prices & delivery times…', pct: 78 },
  { msg: 'Finalising results…',                pct: 92 },
];

const CATEGORIES = [
  { id: 'all',         label: 'All' },
  { id: 'electronics', label: 'Electronics' },
  { id: 'gaming',      label: 'Gaming' },
  { id: 'clothing',    label: 'Clothing' },
  { id: 'home',        label: 'Home' },
  { id: 'sports',      label: 'Sports' },
  { id: 'books',       label: 'Books' },
];

const SORT_OPTIONS = [
  { id: 'price',     label: 'Cheapest' },
  { id: 'delivery',  label: 'Fastest' },
  { id: 'rating',    label: 'Top rated' },
  { id: 'proximity', label: 'Nearest' },
] as const;

function StatusBar({ active, query }: { active: boolean; query: string }) {
  const [step, setStep] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (active) {
      setStep(0);
      timer.current = setInterval(() => setStep(p => Math.min(p + 1, STEPS.length - 1)), 1200);
    } else {
      if (timer.current) clearInterval(timer.current);
      setStep(0);
    }
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [active]);
  if (!active) return null;

  return (
    <div className="animate-fade-up" style={{
      marginTop: 16,
      background: 'hsl(var(--card) / 0.75)',
      backdropFilter: 'blur(20px)',
      border: '1px solid hsl(var(--primary) / 0.2)',
      borderRadius: 12,
      overflow: 'hidden',
      boxShadow: '0 0 20px hsl(var(--primary) / 0.08)',
    }}>
      <div style={{ padding: '11px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="animate-spin-sm" style={{ display: 'inline-block', width: 13, height: 13, border: '2px solid hsl(var(--primary))', borderTopColor: 'transparent', borderRadius: '50%', flexShrink: 0 }} />
          <span style={{ fontFamily: 'DM Sans', fontSize: 13, color: 'hsl(var(--foreground))', fontWeight: 500 }}>{STEPS[step].msg}</span>
        </div>
        <span style={{ fontFamily: 'DM Sans', fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>{STEPS[step].pct}%</span>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${STEPS[step].pct}%` }} />
      </div>
      <div style={{ padding: '7px 16px', background: 'hsl(var(--primary) / 0.04)' }}>
        <span style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>
          Searching for <strong style={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}>"{query}"</strong> — usually ~7s
        </span>
      </div>
    </div>
  );
}

export default function SearchResultsClient() {
  const [searchText, setSearchText] = useState('');
  const [query, setQuery] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [listings, setListings] = useState<Listing[]>([]);
  const [sortBy, setSortBy] = useState<'price' | 'delivery' | 'rating' | 'proximity'>('price');
  const [compareItems, setCompareItems] = useState<Listing[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [address, setAddress] = useState({ country: '', state: '', suburb: '', full: '' });
  const [isSearching, setIsSearching] = useState(false);
  const [resultsOpen, setResultsOpen] = useState(false);
  const [category, setCategory] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  const fetchResults = useCallback(async (name: string, country: string): Promise<Listing[]> => {
    try {
      const params = new URLSearchParams({ q: name, country: country.slice(0, 2).toLowerCase() });
      const res = await fetch(`/api/serpapi/search?${params}`);
      if (!res.ok) return [];
      const data = await res.json();
      if (data.error || !Array.isArray(data.listings)) return [];
      return data.listings as Listing[];
    } catch { return []; }
  }, []);

  const handleSearch = useCallback(async () => {
    const name = searchText.trim();
    if (!name) return;
    if (!address.country) { toast.error('Select your location first'); return; }
    setQuery(name);
    setHasSearched(false);
    setListings([]);
    setIsSearching(true);
    try {
      const results = await fetchResults(name, address.country);
      setListings(results);
      setHasSearched(true);
      setResultsOpen(true);
      if (results.length > 0) toast.success(`Found ${results.length} listing${results.length !== 1 ? 's' : ''}`);
      else toast.info('No listings found — try a different term');
    } catch {
      setHasSearched(true);
      toast.error('Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  }, [searchText, address.country, fetchResults]);

  const toggleCompare = useCallback((listing: Listing) => {
    setCompareItems(prev => {
      if (prev.find(l => l.id === listing.id)) return prev.filter(l => l.id !== listing.id);
      if (prev.length >= 3) { toast.error('Max 3 items to compare'); return prev; }
      const next = [...prev, listing];
      if (next.length >= 2) setCompareOpen(true);
      return next;
    });
  }, []);

  const sorted = [...listings]
    .sort((a, b) => {
      if (sortBy === 'price') return a.price - b.price;
      if (sortBy === 'delivery') return a.deliveryDays - b.deliveryDays;
      if (sortBy === 'proximity') return (a.distanceKm ?? a.deliveryDays * 500) - (b.distanceKm ?? b.deliveryDays * 500);
      return b.sellerRating - a.sellerRating;
    })
    .filter(l => {
      if (l.stockStatus === 'Out of Stock' || (l.stockStatus as string) === 'Unavailable') return false;
      if (l.price <= 0) return false;
      const mn = parseFloat(minPrice) || 0;
      const mx = parseFloat(maxPrice) || 999999;
      return l.price >= mn && l.price <= mx;
    });

  const inStock = sorted.filter(l => l.stockStatus !== 'Out of Stock');
  const bestPrice = inStock.length > 0 ? Math.min(...inStock.map(l => l.price)) : null;
  const fastestDays = inStock.length > 0 ? Math.min(...inStock.map(l => l.deliveryDays)) : null;

  return (
    <div style={{ minHeight: '100vh', position: 'relative', zIndex: 1 }}>
      <Toaster position="bottom-right" toastOptions={{
        style: {
          background: 'hsl(var(--card))',
          border: '1px solid hsl(var(--border))',
          color: 'hsl(var(--foreground))',
          fontFamily: 'DM Sans, sans-serif',
          fontSize: 13,
        },
      }} />

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '28px 16px 120px' }}>

        {/* ── Hero ── */}
        <div className="animate-fade-up" style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{
            fontFamily: 'Syne, sans-serif',
            fontWeight: 800,
            fontSize: 'clamp(26px, 6vw, 44px)',
            letterSpacing: '-0.025em',
            lineHeight: 1.1,
            marginBottom: 10,
            background: 'linear-gradient(135deg, hsl(var(--foreground)) 20%, hsl(var(--primary)) 60%, hsl(var(--accent)) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            Find the best price.<br />Anywhere.
          </h1>
          <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: 14, lineHeight: 1.7 }}>
            Real-time prices from 40+ global marketplaces, delivered to you.
          </p>
        </div>

        {/* ── Location bar (glowing) ── */}
        <div className="animate-fade-up location-glow" style={{ marginBottom: 10, animationDelay: '0.08s' }}>
          <AddressSelector value={address} onChange={setAddress} />
        </div>

        {/* ── Search bar (glowing) ── */}
        <div className="animate-fade-up search-glow" style={{ animationDelay: '0.13s', padding: 6, display: 'flex', gap: 8 }}>
          {/* Icon + input */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 10 }}>
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" style={{ color: 'hsl(var(--muted-foreground))', flexShrink: 0 }}>
              <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M10 10L13 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <input
              ref={searchRef}
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder={address.country ? 'Search any product…' : 'Set your location first…'}
              disabled={!address.country || isSearching}
              style={{
                background: 'none', border: 'none', outline: 'none', flex: 1,
                fontSize: 14, color: 'hsl(var(--foreground))',
                fontFamily: 'DM Sans, sans-serif', padding: '7px 0',
              }}
            />
            {searchText && !isSearching && (
              <button
                onClick={() => { setSearchText(''); searchRef.current?.focus(); }}
                style={{ color: 'hsl(var(--muted-foreground))', background: 'none', border: 'none', cursor: 'pointer', padding: '0 6px', lineHeight: 1, opacity: 0.6 }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </button>
            )}
          </div>
          <button
            onClick={handleSearch}
            disabled={!address.country || isSearching || !searchText.trim()}
            className="btn-primary"
          >
            {isSearching ? 'Searching…' : 'Search'}
          </button>
        </div>

        {/* Caption */}
        <p style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))', marginTop: 8, textAlign: 'center', opacity: 0.65 }}>
          Scanning Amazon · eBay · JB Hi-Fi · Kogan · Cash Converters · CeX &amp; more
        </p>

        {/* ── Categories ── */}
        <div className="animate-fade-up" style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 16, animationDelay: '0.18s' }}>
          {CATEGORIES.map(c => (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              className={`btn-ghost${category === c.id ? ' active' : ''}`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* ── Status bar ── */}
        <StatusBar active={isSearching} query={query} />

        {/* ── Results ── */}
        {resultsOpen && hasSearched && (
          <div className="animate-fade-up" style={{ marginTop: 24 }}>
            {/* Meta row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                {bestPrice !== null && <span className="badge badge-success">Best A${bestPrice.toFixed(2)}</span>}
                {fastestDays !== null && <span className="badge badge-accent">{fastestDays}d delivery</span>}
                <span className="badge badge-primary">{sorted.length} results</span>
              </div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {SORT_OPTIONS.map(s => (
                  <button key={s.id} onClick={() => setSortBy(s.id)} style={{
                    fontSize: 11, padding: '4px 10px', borderRadius: 6, cursor: 'pointer',
                    border: '1px solid', fontFamily: 'DM Sans, sans-serif', transition: 'all 0.15s',
                    borderColor: sortBy === s.id ? 'hsl(var(--primary) / 0.5)' : 'hsl(var(--border))',
                    background: sortBy === s.id ? 'hsl(var(--primary) / 0.1)' : 'transparent',
                    color: sortBy === s.id ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
                    fontWeight: sortBy === s.id ? 600 : 400,
                  }}>
                    {s.label}
                  </button>
                ))}
                <button onClick={() => setShowFilters(f => !f)} style={{
                  fontSize: 11, padding: '4px 10px', borderRadius: 6, cursor: 'pointer',
                  border: '1px solid', fontFamily: 'DM Sans, sans-serif', transition: 'all 0.15s',
                  borderColor: showFilters ? 'hsl(var(--primary) / 0.5)' : 'hsl(var(--border))',
                  background: showFilters ? 'hsl(var(--primary) / 0.1)' : 'transparent',
                  color: showFilters ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M1 2.5h9M3 5.5h5M4.5 8.5h2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
                  Filter
                </button>
              </div>
            </div>

            {/* Filter panel */}
            {showFilters && (
              <div className="animate-fade-up" style={{
                background: 'hsl(var(--card) / 0.7)', backdropFilter: 'blur(16px)',
                border: '1px solid hsl(var(--border))', borderRadius: 10,
                padding: '11px 14px', marginBottom: 12,
                display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap',
              }}>
                <span style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))', fontWeight: 500 }}>Price</span>
                <input type="number" placeholder="Min $" value={minPrice} onChange={e => setMinPrice(e.target.value)}
                  style={{ width: 76, padding: '5px 9px', fontSize: 12, borderRadius: 6, background: 'hsl(var(--input))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))', outline: 'none' }} />
                <span style={{ color: 'hsl(var(--muted-foreground))', fontSize: 12 }}>–</span>
                <input type="number" placeholder="Max $" value={maxPrice} onChange={e => setMaxPrice(e.target.value)}
                  style={{ width: 76, padding: '5px 9px', fontSize: 12, borderRadius: 6, background: 'hsl(var(--input))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))', outline: 'none' }} />
                <button onClick={() => { setMinPrice(''); setMaxPrice(''); }}
                  style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))', background: 'none', border: 'none', cursor: 'pointer' }}>
                  Clear
                </button>
              </div>
            )}

            <ResultsGrid
              listings={sorted}
              loading={isSearching}
              hasSearched={hasSearched}
              compareItems={compareItems}
              onToggleCompare={toggleCompare}
              onAddToWatchlist={(l) => toast.success(`"${l.productName}" added to watchlist`)}
              displayCurrency="AUD"
              exchangeRate={1}
              selectedCategory={category}
            />
          </div>
        )}
      </div>

      {/* Compare floating button */}
      {compareItems.length > 0 && (
        <div style={{ position: 'fixed', bottom: 80, right: 20, zIndex: 40 }}>
          <button onClick={() => setCompareOpen(true)} className="btn-primary animate-glow"
            style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
              {compareItems.length}
            </span>
            Compare
          </button>
        </div>
      )}

      {compareOpen && compareItems.length >= 2 && (
        <ComparisonDrawer
          items={compareItems}
          onRemove={(id) => setCompareItems(prev => prev.filter(l => l.id !== id))}
          onClose={() => setCompareOpen(false)}
        />
      )}
    </div>
  );
}
