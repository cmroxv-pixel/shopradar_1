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
  { id: 'home',        label: 'Home & Living' },
  { id: 'sports',      label: 'Sports' },
  { id: 'books',       label: 'Books' },
];

const SORT_OPTIONS = [
  { id: 'price',     label: 'Cheapest' },
  { id: 'delivery',  label: 'Fastest' },
  { id: 'rating',    label: 'Top Rated' },
  { id: 'proximity', label: 'Nearest' },
] as const;

const COUNTRY_CURRENCY: Record<string, { code: string; rate: number }> = {
  au: { code: 'AUD', rate: 1 },
  us: { code: 'USD', rate: 0.64 },
  gb: { code: 'GBP', rate: 0.51 },
  nz: { code: 'NZD', rate: 1.09 },
  ca: { code: 'CAD', rate: 0.87 },
  jp: { code: 'JPY', rate: 96 },
  sg: { code: 'SGD', rate: 0.86 },
};

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
      background: 'hsl(var(--card))',
      border: '1.5px solid hsl(var(--primary) / 0.2)',
      borderRadius: 14,
      overflow: 'hidden',
      boxShadow: '0 4px 20px hsl(var(--primary) / 0.08)',
    }}>
      <div style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="animate-spin-sm" style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid hsl(var(--primary))', borderTopColor: 'transparent', borderRadius: '50%', flexShrink: 0 }} />
          <span style={{ fontFamily: 'Inter', fontSize: 13, color: 'hsl(var(--foreground))', fontWeight: 500 }}>
            {STEPS[step].msg}
          </span>
        </div>
        <span style={{ fontFamily: 'Inter', fontSize: 11, color: 'hsl(var(--muted-foreground))', fontVariantNumeric: 'tabular-nums' }}>
          {STEPS[step].pct}%
        </span>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${STEPS[step].pct}%` }} />
      </div>
      <div style={{ padding: '8px 18px', background: 'hsl(var(--primary) / 0.03)' }}>
        <span style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>
          Searching for{' '}
          <strong style={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}>"{query}"</strong>
          {' '}— usually ~7 seconds
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
  const [displayCurrency, setDisplayCurrency] = useState('AUD');
  const [exchangeRate, setExchangeRate] = useState(1);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showRecent, setShowRecent] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('shopradar_recent') || '[]');
      setRecentSearches(saved);
    } catch { }
  }, []);

  useEffect(() => {
    if (address.country) {
      const cc = address.country.slice(0, 2).toLowerCase();
      const curr = COUNTRY_CURRENCY[cc] || COUNTRY_CURRENCY['au'];
      setDisplayCurrency(curr.code);
      setExchangeRate(curr.rate);
    }
  }, [address.country]);

  const saveRecentSearch = useCallback((term: string) => {
    try {
      const saved = JSON.parse(localStorage.getItem('shopradar_recent') || '[]') as string[];
      const updated = [term, ...saved.filter(s => s.toLowerCase() !== term.toLowerCase())].slice(0, 6);
      localStorage.setItem('shopradar_recent', JSON.stringify(updated));
      setRecentSearches(updated);
    } catch { }
  }, []);

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

  const handleSearch = useCallback(async (overrideQuery?: string) => {
    const name = (overrideQuery || searchText).trim();
    if (!name) return;
    if (!address.country) { toast.error('Select your location first'); return; }
    if (overrideQuery) setSearchText(overrideQuery);
    setQuery(name);
    setHasSearched(false);
    setListings([]);
    setIsSearching(true);
    setShowRecent(false);
    saveRecentSearch(name);
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
  }, [searchText, address.country, fetchResults, saveRecentSearch]);

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
  const currSym = displayCurrency === 'AUD' ? 'A$' : displayCurrency === 'USD' ? '$' : displayCurrency === 'GBP' ? '£' : displayCurrency + ' ';

  return (
    <div style={{ minHeight: '100vh', position: 'relative', zIndex: 1 }}>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'hsl(var(--card))',
            border: '1.5px solid hsl(var(--border))',
            color: 'hsl(var(--foreground))',
            fontFamily: 'Inter, sans-serif',
            fontSize: 13,
            borderRadius: 12,
          },
        }}
      />

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '48px 24px 120px' }}>

        {/* ── Hero ── */}
        <div className="animate-fade-up" style={{ marginBottom: 48 }}>
          {/* Big serif headline */}
          <h1 style={{
            fontFamily: 'Instrument Serif, serif',
            fontWeight: 400,
            fontSize: 'clamp(42px, 6vw, 80px)',
            letterSpacing: '-0.02em',
            lineHeight: 1.0,
            color: 'hsl(var(--primary))',
            marginBottom: 16,
          }}>
            Find the best price,<br />
            <span style={{ color: 'hsl(var(--foreground))' }}>anywhere.</span>
          </h1>
          <p style={{
            color: 'hsl(var(--muted-foreground))',
            fontSize: 16, lineHeight: 1.6,
            fontWeight: 400, maxWidth: 480,
          }}>
            Real-time prices from 40+ global marketplaces.<br />
            Delivered to your door.
          </p>
        </div>

        {/* ── Two-column layout on desktop ── */}
        <div style={{ display: 'grid', gridTemplateColumns: resultsOpen ? '340px 1fr' : '1fr', gap: 32, alignItems: 'start' }}>

          {/* ── Left: Search panel ── */}
          <div style={{ position: resultsOpen ? 'sticky' : 'relative', top: resultsOpen ? 80 : 'auto' }}>

            {/* Location */}
            <div className="location-glow" style={{ marginBottom: 10 }}>
              <AddressSelector value={address} onChange={setAddress} />
            </div>

            {/* Search bar */}
            <div className="search-glow" style={{ padding: '6px 6px 6px 16px', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ color: 'hsl(var(--muted-foreground))', flexShrink: 0 }}>
                <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M11 11L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <input
                ref={searchRef}
                value={searchText}
                onChange={e => { setSearchText(e.target.value); setShowRecent(e.target.value.length === 0 && recentSearches.length > 0); }}
                onFocus={() => { if (!searchText && recentSearches.length > 0) setShowRecent(true); }}
                onBlur={() => setTimeout(() => setShowRecent(false), 150)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder={address.country ? 'Search any product…' : 'Set your location first…'}
                disabled={!address.country || isSearching}
                style={{ background: 'none', border: 'none', outline: 'none', flex: 1, fontSize: 14, color: 'hsl(var(--foreground))', fontFamily: 'Inter, sans-serif', padding: '7px 0' }}
              />
              {searchText && !isSearching && (
                <button onClick={() => { setSearchText(''); searchRef.current?.focus(); }}
                  style={{ color: 'hsl(var(--muted-foreground))', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', opacity: 0.5 }}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                </button>
              )}
              <button onClick={() => handleSearch()} disabled={!address.country || isSearching || !searchText.trim()} className="btn-primary" style={{ fontSize: 13, padding: '9px 20px' }}>
                {isSearching ? 'Searching…' : 'Search'}
              </button>
            </div>

            {/* Recent searches */}
            {showRecent && recentSearches.length > 0 && (
              <div className="animate-fade-up" style={{ marginBottom: 10, background: 'hsl(var(--card))', border: '1.5px solid hsl(var(--border))', borderRadius: 14, overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.08)', zIndex: 50, position: 'relative' }}>
                <div style={{ padding: '10px 14px 6px', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'hsl(var(--muted-foreground))', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Recent</span>
                  <button onClick={() => { localStorage.removeItem('shopradar_recent'); setRecentSearches([]); setShowRecent(false); }} style={{ fontSize: 10, color: 'hsl(var(--muted-foreground))', background: 'none', border: 'none', cursor: 'pointer' }}>Clear</button>
                </div>
                {recentSearches.map((s, i) => (
                  <button key={i} onMouseDown={() => handleSearch(s)}
                    style={{ width: '100%', padding: '8px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', color: 'hsl(var(--foreground))', fontSize: 13, fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', gap: 8, transition: 'background 0.1s' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'hsl(var(--muted))'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'none'}
                  >
                    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" style={{ color: 'hsl(var(--muted-foreground))', flexShrink: 0 }}>
                      <circle cx="5.5" cy="5.5" r="4" stroke="currentColor" strokeWidth="1.2"/>
                      <path d="M5.5 3v2.5l1.5 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                    </svg>
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Caption */}
            <p style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))', lineHeight: 1.6, opacity: 0.7, marginBottom: 20 }}>
              Scanning Amazon · eBay · JB Hi-Fi · Kogan<br />Cash Converters · CeX · Harvey Norman &amp; more
            </p>

            {/* Categories */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
              {CATEGORIES.map(c => (
                <button key={c.id} onClick={() => setCategory(c.id)} className={`btn-ghost${category === c.id ? ' active' : ''}`} style={{ fontSize: 12 }}>
                  {c.label}
                </button>
              ))}
            </div>

            {/* Status bar */}
            <StatusBar active={isSearching} query={query} />

            {/* Results meta — only show in sidebar when results open */}
            {resultsOpen && hasSearched && !isSearching && (
              <div style={{ marginTop: 20, padding: '16px', background: 'hsl(var(--card))', border: '1.5px solid hsl(var(--border))', borderRadius: 16 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Results for "{query}"</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {bestPrice !== null && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>Best price</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: 'hsl(var(--success))', fontFamily: 'Instrument Serif, serif' }}>{currSym}{bestPrice.toFixed(2)}</span>
                    </div>
                  )}
                  {fastestDays !== null && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>Fastest delivery</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--primary))' }}>{fastestDays} day{fastestDays !== 1 ? 's' : ''}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>Listings found</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--foreground))' }}>{sorted.length}</span>
                  </div>
                  {displayCurrency !== 'AUD' && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>Currency</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'hsl(var(--primary))' }}>{displayCurrency}</span>
                    </div>
                  )}
                </div>

                {/* Sort */}
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid hsl(var(--border))' }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Sort by</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {SORT_OPTIONS.map(s => (
                      <button key={s.id} onClick={() => setSortBy(s.id)} style={{ textAlign: 'left', padding: '7px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', background: sortBy === s.id ? 'hsl(var(--primary) / 0.08)' : 'transparent', color: sortBy === s.id ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))', fontSize: 13, fontFamily: 'Inter, sans-serif', fontWeight: sortBy === s.id ? 600 : 400, transition: 'all 0.1s' }}>
                        {sortBy === s.id ? '→ ' : ''}{s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Price filter */}
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid hsl(var(--border))' }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Price range</p>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input type="number" placeholder="Min" value={minPrice} onChange={e => setMinPrice(e.target.value)} style={{ flex: 1, padding: '7px 10px', fontSize: 12, borderRadius: 8, background: 'hsl(var(--input))', border: '1.5px solid hsl(var(--border))', color: 'hsl(var(--foreground))', outline: 'none' }} />
                    <span style={{ color: 'hsl(var(--muted-foreground))', fontSize: 12 }}>–</span>
                    <input type="number" placeholder="Max" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} style={{ flex: 1, padding: '7px 10px', fontSize: 12, borderRadius: 8, background: 'hsl(var(--input))', border: '1.5px solid hsl(var(--border))', color: 'hsl(var(--foreground))', outline: 'none' }} />
                  </div>
                  {(minPrice || maxPrice) && (
                    <button onClick={() => { setMinPrice(''); setMaxPrice(''); }} style={{ marginTop: 6, fontSize: 11, color: 'hsl(var(--muted-foreground))', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Clear filter</button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── Right: Results ── */}
          {resultsOpen && hasSearched && (
            <div className="animate-fade-up">
              <ResultsGrid
                listings={sorted}
                loading={isSearching}
                hasSearched={hasSearched}
                compareItems={compareItems}
                onToggleCompare={toggleCompare}
                onAddToWatchlist={(l) => toast.success(`"${l.productName}" added to watchlist`)}
                displayCurrency={displayCurrency}
                exchangeRate={exchangeRate}
                selectedCategory={category}
                onBarcodeSearch={(q) => handleSearch(q)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Compare button */}
      {compareItems.length > 0 && (
        <div style={{ position: 'fixed', bottom: 80, right: 24, zIndex: 40 }}>
          <button onClick={() => setCompareOpen(true)} className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, boxShadow: '0 4px 20px hsl(var(--primary) / 0.35)' }}>
            <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
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
