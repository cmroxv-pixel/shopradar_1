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
  { id: 'all', label: 'All' },
  { id: 'electronics', label: 'Electronics' },
  { id: 'gaming', label: 'Gaming' },
  { id: 'clothing', label: 'Clothing' },
  { id: 'home', label: 'Home' },
  { id: 'sports', label: 'Sports' },
  { id: 'books', label: 'Books' },
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
    <div style={{
      marginTop: 20,
      background: 'rgba(10,13,26,0.7)',
      border: '1px solid rgba(99,120,255,0.18)',
      borderRadius: 12,
      overflow: 'hidden',
      backdropFilter: 'blur(20px)',
      animation: 'fadeUp 0.4s ease both',
    }}>
      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ display: 'inline-block', width: 13, height: 13, border: '2px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
          <span style={{ fontFamily: 'DM Sans', fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>{STEPS[step].msg}</span>
        </div>
        <span style={{ fontFamily: 'DM Sans', fontSize: 11, color: 'var(--text-muted)' }}>{STEPS[step].pct}%</span>
      </div>
      <div style={{ height: 2, background: 'rgba(99,120,255,0.08)' }}>
        <div style={{ height: '100%', background: 'linear-gradient(90deg, var(--primary), var(--accent))', width: `${STEPS[step].pct}%`, transition: 'width 0.7s cubic-bezier(0.4,0,0.2,1)', borderRadius: 1 }} />
      </div>
      <div style={{ padding: '8px 16px', background: 'rgba(99,120,255,0.04)' }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Searching for <strong style={{ color: 'var(--text)' }}>"{query}"</strong> — usually ~7s</span>
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
      if (l.price < mn || l.price > mx) return false;
      return true;
    });

  const inStock = sorted.filter(l => l.stockStatus !== 'Out of Stock');
  const bestPrice = inStock.length > 0 ? Math.min(...inStock.map(l => l.price)) : null;
  const fastestDays = inStock.length > 0 ? Math.min(...inStock.map(l => l.deliveryDays)) : null;

  return (
    <div style={{ minHeight: '100vh', position: 'relative', zIndex: 1 }}>
      <Toaster position="bottom-right" toastOptions={{
        style: { background: 'rgba(10,13,26,0.95)', border: '1px solid rgba(99,120,255,0.2)', color: 'var(--text)', fontFamily: 'DM Sans, sans-serif', fontSize: 13 },
      }} />

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 16px 120px' }}>

        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: 36, animation: 'fadeUp 0.5s ease both' }}>
          <h1 style={{
            fontFamily: 'Syne, sans-serif', fontWeight: 800,
            fontSize: 'clamp(26px, 6vw, 46px)', letterSpacing: '-0.025em', lineHeight: 1.1,
            background: 'linear-gradient(135deg, #fff 20%, rgba(139,159,255,0.95) 60%, rgba(192,132,252,0.85) 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            marginBottom: 10,
          }}>
            Find the best price.<br />Anywhere.
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.7 }}>
            Real-time prices from 40+ global marketplaces, delivered to you.
          </p>
        </div>

        {/* Location */}
        <div style={{ marginBottom: 10, animation: 'fadeUp 0.5s ease 0.1s both' }}>
          <AddressSelector value={address} onChange={setAddress} />
        </div>

        {/* Search bar */}
        <div style={{ animation: 'fadeUp 0.5s ease 0.15s both' }}>
          <div style={{
            display: 'flex', gap: 8,
            background: 'rgba(10,13,26,0.75)',
            border: '1px solid var(--border)',
            borderRadius: 12, padding: 6,
            backdropFilter: 'blur(20px)',
          }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 10 }}>
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none" style={{ color: 'var(--text-dim)', flexShrink: 0 }}>
                <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M10 10L13 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <input
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder={address.country ? 'Search any product…' : 'Set your location first…'}
                disabled={!address.country || isSearching}
                style={{ background: 'none', border: 'none', outline: 'none', flex: 1, fontSize: 14, color: 'var(--text)', fontFamily: 'DM Sans, sans-serif', padding: '6px 0' }}
              />
              {searchText && !isSearching && (
                <button onClick={() => setSearchText('')} style={{ color: 'var(--text-dim)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 6px', lineHeight: 1 }}>
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M1 1l11 11M12 1L1 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                </button>
              )}
            </div>
            <button
              onClick={handleSearch}
              disabled={!address.country || isSearching || !searchText.trim()}
              className="btn-primary"
              style={{ flexShrink: 0, opacity: (!address.country || !searchText.trim()) ? 0.38 : 1, cursor: (!address.country || !searchText.trim()) ? 'not-allowed' : 'pointer' }}
            >
              {isSearching ? 'Searching…' : 'Search'}
            </button>
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 8, textAlign: 'center' }}>
            Scanning Amazon · eBay · JB Hi-Fi · Kogan · Cash Converters · CeX &amp; more
          </p>
        </div>

        {/* Categories */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 18, animation: 'fadeUp 0.5s ease 0.2s both' }}>
          {CATEGORIES.map(c => (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              style={{
                fontSize: 12, padding: '5px 13px', borderRadius: 8,
                border: '1px solid',
                borderColor: category === c.id ? 'var(--primary)' : 'var(--border)',
                background: category === c.id ? 'rgba(99,120,255,0.1)' : 'transparent',
                color: category === c.id ? 'var(--primary)' : 'var(--text-muted)',
                cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
                fontWeight: category === c.id ? 600 : 400,
                transition: 'all 0.15s',
              }}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Status bar */}
        <StatusBar active={isSearching} query={query} />

        {/* Results */}
        {resultsOpen && hasSearched && (
          <div style={{ marginTop: 28, animation: 'fadeUp 0.4s ease both' }}>

            {/* Results meta row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                {bestPrice !== null && (
                  <span className="badge badge-success">Best A${bestPrice.toFixed(2)}</span>
                )}
                {fastestDays !== null && (
                  <span className="badge badge-accent">{fastestDays}d delivery</span>
                )}
                <span className="badge badge-primary">{sorted.length} results</span>
              </div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {SORT_OPTIONS.map(s => (
                  <button key={s.id} onClick={() => setSortBy(s.id)} style={{
                    fontSize: 11, padding: '4px 10px', borderRadius: 6,
                    border: '1px solid', borderColor: sortBy === s.id ? 'var(--primary)' : 'var(--border)',
                    background: sortBy === s.id ? 'rgba(99,120,255,0.12)' : 'transparent',
                    color: sortBy === s.id ? 'var(--primary)' : 'var(--text-muted)',
                    cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontWeight: sortBy === s.id ? 600 : 400, transition: 'all 0.15s',
                  }}>
                    {s.label}
                  </button>
                ))}
                <button onClick={() => setShowFilters(f => !f)} style={{
                  fontSize: 11, padding: '4px 10px', borderRadius: 6,
                  border: '1px solid', borderColor: showFilters ? 'var(--primary)' : 'var(--border)',
                  background: showFilters ? 'rgba(99,120,255,0.1)' : 'transparent',
                  color: showFilters ? 'var(--primary)' : 'var(--text-muted)',
                  cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center', gap: 4, transition: 'all 0.15s',
                }}>
                  <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M1 2.5h9M3 5.5h5M4.5 8.5h2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
                  Filter
                </button>
              </div>
            </div>

            {/* Filters */}
            {showFilters && (
              <div style={{
                background: 'rgba(10,13,26,0.7)', border: '1px solid var(--border)',
                borderRadius: 10, padding: '12px 14px', marginBottom: 14,
                display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap',
                animation: 'fadeUp 0.3s ease both',
              }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>Price</span>
                <input type="number" placeholder="Min $" value={minPrice} onChange={e => setMinPrice(e.target.value)} style={{ width: 76, padding: '5px 9px', fontSize: 12, borderRadius: 6 }} />
                <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>–</span>
                <input type="number" placeholder="Max $" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} style={{ width: 76, padding: '5px 9px', fontSize: 12, borderRadius: 6 }} />
                <button onClick={() => { setMinPrice(''); setMaxPrice(''); }} style={{ fontSize: 11, color: 'var(--text-dim)', background: 'none', border: 'none', cursor: 'pointer' }}>Clear</button>
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

      {/* Compare button */}
      {compareItems.length > 0 && (
        <div style={{ position: 'fixed', bottom: 80, right: 20, zIndex: 40 }}>
          <button onClick={() => setCompareOpen(true)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, animation: 'pulse-glow 2.5s ease-in-out infinite' }}>
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
