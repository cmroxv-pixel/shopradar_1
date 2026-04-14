'use client';
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Toaster, toast } from 'sonner';
import AddressSelector from './AddressSelector';
import FilterPanel from './FilterPanel';
import ResultsGrid from './ResultsGrid';
import ComparisonDrawer from './ComparisonDrawer';
import ThemeSwitcherPanel from './ThemeSwitcherPanel';
import CurrencyConverter from './CurrencyConverter';
import CategoryFilter from './CategoryFilter';
import { type Listing } from './mockData';
import { SlidersHorizontal, Palette, TrendingDown, Zap, Globe, ChevronDown } from 'lucide-react';

const STEPS = [
  { msg: 'Querying Google Shopping…',          pct: 12 },
  { msg: 'Scanning 40+ global marketplaces…',  pct: 28 },
  { msg: 'Resolving direct product URLs…',     pct: 46 },
  { msg: 'Fetching individual store pages…',   pct: 63 },
  { msg: 'Comparing prices & delivery times…', pct: 78 },
  { msg: 'Finalising results…',                pct: 92 },
];

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
      borderRadius: 14, overflow: 'hidden',
      boxShadow: '0 4px 20px hsl(var(--primary) / 0.08)',
    }}>
      <div style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="animate-spin-sm" style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid hsl(var(--primary))', borderTopColor: 'transparent', borderRadius: '50%', flexShrink: 0 }} />
          <span style={{ fontFamily: 'Inter', fontSize: 13, color: 'hsl(var(--foreground))', fontWeight: 500 }}>{STEPS[step].msg}</span>
        </div>
        <span style={{ fontFamily: 'Inter', fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>{STEPS[step].pct}%</span>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${STEPS[step].pct}%` }} />
      </div>
      <div style={{ padding: '8px 18px', background: 'hsl(var(--primary) / 0.03)' }}>
        <span style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>
          Searching for <strong style={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}>"{query}"</strong> — usually ~7 seconds
        </span>
      </div>
    </div>
  );
}

export default function SearchResultsClient() {
  const [query, setQuery] = useState({ name: '' });
  const [hasSearched, setHasSearched] = useState(false);
  const [listings, setListings] = useState<Listing[]>([]);
  const [sortBy, setSortBy] = useState<'price' | 'delivery' | 'rating' | 'proximity'>('price');
  const [filterOpen, setFilterOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [compareItems, setCompareItems] = useState<Listing[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [address, setAddress] = useState({ country: '', state: '', suburb: '', full: '' });
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [selectedMarketplaces, setSelectedMarketplaces] = useState<string[]>([]);
  const [deliveryFilter, setDeliveryFilter] = useState<'any' | 'express' | '3days' | '7days'>('any');
  const [minRating, setMinRating] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [resultsOpen, setResultsOpen] = useState(false);
  const [displayCurrency, setDisplayCurrency] = useState('AUD');
  const [exchangeRate, setExchangeRate] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showRecent, setShowRecent] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('shopradar_recent') || '[]');
      setRecentSearches(saved);
    } catch { }
  }, []);

  // Auto-detect currency from country
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

  const handleSearch = useCallback(async (overrideName?: string) => {
    const name = (overrideName || searchText).trim();
    if (!name) return;
    if (!address.country) { toast.error('Please select your location first'); return; }
    if (overrideName) setSearchText(overrideName);
    setQuery({ name });
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
      if (results.length > 0) toast.success(`Found ${results.length} listing${results.length !== 1 ? 's' : ''} for "${name}"`);
      else toast.info('No listings found. Try a different search term.');
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
      if (prev.length >= 3) { toast.error('You can compare up to 3 listings at once'); return prev; }
      const next = [...prev, listing];
      if (next.length >= 2) setCompareOpen(true);
      return next;
    });
  }, []);

  const handleCurrencyChange = useCallback((currency: string, rate: number) => {
    setDisplayCurrency(currency);
    setExchangeRate(rate);
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
      if (l.price < priceRange[0] || l.price > priceRange[1]) return false;
      if (selectedMarketplaces.length > 0 && !selectedMarketplaces.includes(l.marketplace)) return false;
      if (deliveryFilter === 'express' && l.shippingTier !== 'Express') return false;
      if (deliveryFilter === '3days' && l.deliveryDays > 3) return false;
      if (deliveryFilter === '7days' && l.deliveryDays > 7) return false;
      if (l.sellerRating < minRating) return false;
      return true;
    });

  const inStock = sorted.filter(l => l.stockStatus !== 'Out of Stock');
  const lowestPrice = inStock.length > 0 ? Math.min(...inStock.map(l => l.price)) : null;
  const fastestDays = inStock.length > 0 ? Math.min(...inStock.map(l => l.deliveryDays)) : null;
  const activeFilterCount = [selectedMarketplaces.length > 0, deliveryFilter !== 'any', minRating > 0].filter(Boolean).length;

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '40px 24px 120px', position: 'relative', zIndex: 1 }}>
      <Toaster position="bottom-right" toastOptions={{
        style: { background: 'hsl(var(--card))', border: '1.5px solid hsl(var(--border))', color: 'hsl(var(--foreground))', fontFamily: 'Inter, sans-serif', fontSize: 13, borderRadius: 12 },
      }} />

      {/* ── Hero ── */}
      <div className="animate-fade-up" style={{ marginBottom: 40 }}>
        <h1 style={{
          fontFamily: 'Instrument Serif, serif', fontWeight: 400,
          fontSize: 'clamp(38px, 5vw, 72px)',
          letterSpacing: '-0.02em', lineHeight: 1.05,
          color: 'hsl(var(--primary))', marginBottom: 12,
        }}>
          Find the best price,<br />
          <span style={{ color: 'hsl(var(--foreground))' }}>anywhere.</span>
        </h1>
        <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: 15, lineHeight: 1.6, maxWidth: 460 }}>
          Real-time prices from 40+ global marketplaces, delivered to you.
        </p>
      </div>

      {/* ── Page Header row (currency + filter + theme) ── */}
      <div className="animate-fade-up" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <CurrencyConverter selectedCurrency={displayCurrency} onCurrencyChange={handleCurrencyChange} />
          <button
            onClick={() => { setFilterOpen(!filterOpen); setThemeOpen(false); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', borderRadius: 100,
              border: `1.5px solid ${filterOpen ? 'hsl(var(--primary))' : 'hsl(var(--border))'}`,
              background: filterOpen ? 'hsl(var(--primary) / 0.08)' : 'hsl(var(--card))',
              color: filterOpen ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
              cursor: 'pointer', fontSize: 13, fontFamily: 'Inter, sans-serif', fontWeight: 500,
              transition: 'all 0.15s',
            }}
          >
            <SlidersHorizontal size={14} />
            Filters
            {activeFilterCount > 0 && (
              <span style={{ width: 16, height: 16, borderRadius: '50%', background: 'hsl(var(--primary))', color: 'white', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {activeFilterCount}
              </span>
            )}
          </button>
          <button
            onClick={() => { setThemeOpen(!themeOpen); setFilterOpen(false); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', borderRadius: 100,
              border: `1.5px solid ${themeOpen ? 'hsl(var(--primary))' : 'hsl(var(--border))'}`,
              background: themeOpen ? 'hsl(var(--primary) / 0.08)' : 'hsl(var(--card))',
              color: themeOpen ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
              cursor: 'pointer', fontSize: 13, fontFamily: 'Inter, sans-serif', fontWeight: 500,
              transition: 'all 0.15s',
            }}
          >
            <Palette size={14} />
            Theme
          </button>
        </div>
      </div>

      {/* ── Category filter ── */}
      <div className="animate-fade-up" style={{ marginBottom: 16 }}>
        <CategoryFilter selected={selectedCategory} onSelect={setSelectedCategory} />
      </div>

      {/* ── Theme panel ── */}
      {themeOpen && <ThemeSwitcherPanel onClose={() => setThemeOpen(false)} />}

      {/* ── Filter panel ── */}
      {filterOpen && (
        <div style={{ marginBottom: 16, maxWidth: 320 }}>
          <FilterPanel
            priceRange={priceRange} onPriceRange={setPriceRange}
            selectedMarketplaces={selectedMarketplaces} onMarketplaces={setSelectedMarketplaces}
            deliveryFilter={deliveryFilter} onDeliveryFilter={setDeliveryFilter}
            minRating={minRating} onMinRating={setMinRating}
            onClose={() => setFilterOpen(false)}
          />
        </div>
      )}

      {/* ── Location ── */}
      <div className="location-glow animate-fade-up" style={{ marginBottom: 10 }}>
        <AddressSelector value={address} onChange={setAddress} />
      </div>

      {/* ── Search bar ── */}
      <div className="animate-fade-up" style={{ marginBottom: 8 }}>
        <div className="search-glow" style={{ padding: '6px 6px 6px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
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
            style={{ background: 'none', border: 'none', outline: 'none', flex: 1, fontSize: 15, color: 'hsl(var(--foreground))', fontFamily: 'Inter, sans-serif', padding: '8px 0' }}
          />
          {searchText && !isSearching && (
            <button onClick={() => { setSearchText(''); searchRef.current?.focus(); }} style={{ color: 'hsl(var(--muted-foreground))', background: 'none', border: 'none', cursor: 'pointer', padding: '0 8px', opacity: 0.5 }}>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M1 1l11 11M12 1L1 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </button>
          )}
          <button onClick={() => handleSearch()} disabled={!address.country || isSearching || !searchText.trim()} className="btn-primary" style={{ fontSize: 14, padding: '10px 24px' }}>
            {isSearching ? 'Searching…' : 'Search'}
          </button>
        </div>

        {/* Recent searches */}
        {showRecent && recentSearches.length > 0 && (
          <div className="animate-fade-up" style={{ marginTop: 4, background: 'hsl(var(--card))', border: '1.5px solid hsl(var(--border))', borderRadius: 14, overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.08)', position: 'relative', zIndex: 50 }}>
            <div style={{ padding: '10px 14px 6px', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: 'hsl(var(--muted-foreground))', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Recent</span>
              <button onClick={() => { localStorage.removeItem('shopradar_recent'); setRecentSearches([]); setShowRecent(false); }} style={{ fontSize: 10, color: 'hsl(var(--muted-foreground))', background: 'none', border: 'none', cursor: 'pointer' }}>Clear all</button>
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
      </div>

      <p style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))', marginBottom: 16, opacity: 0.65 }}>
        Scanning Amazon · eBay · JB Hi-Fi · Kogan · Cash Converters · CeX · Harvey Norman &amp; more
        {displayCurrency !== 'AUD' && <span style={{ color: 'hsl(var(--primary))', fontWeight: 600, opacity: 1, marginLeft: 6 }}>· Showing {displayCurrency}</span>}
      </p>

      {/* ── Status bar ── */}
      <StatusBar active={isSearching} query={query.name} />

      {/* ── Results modal overlay ── */}
      {resultsOpen && hasSearched && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'hsl(var(--background) / 0.7)', backdropFilter: 'blur(12px)' }} onClick={() => setResultsOpen(false)} />
          <div style={{
            position: 'relative', zIndex: 10, width: '100%', maxWidth: 1100,
            maxHeight: '88vh', background: 'hsl(var(--card))',
            border: '1.5px solid hsl(var(--border))', borderRadius: 24,
            boxShadow: '0 24px 80px rgba(0,0,0,0.15)',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}>
            {/* Modal header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid hsl(var(--border))', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                {lowestPrice !== null && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 100, background: 'hsl(var(--success) / 0.1)', border: '1px solid hsl(var(--success) / 0.2)', fontSize: 12, fontWeight: 600, color: 'hsl(var(--success))' }}>
                    <TrendingDown size={13} />
                    Best price: <strong>A${lowestPrice.toFixed(2)}</strong>
                  </div>
                )}
                {fastestDays !== null && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 100, background: 'hsl(var(--primary) / 0.08)', border: '1px solid hsl(var(--primary) / 0.15)', fontSize: 12, fontWeight: 600, color: 'hsl(var(--primary))' }}>
                    <Zap size={13} />
                    Fastest: <strong>{fastestDays}d</strong>
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 100, background: 'hsl(var(--muted))', fontSize: 12, fontWeight: 600, color: 'hsl(var(--muted-foreground))' }}>
                  <Globe size={13} />
                  {sorted.length} listings
                </div>
                {address.suburb && (
                  <span style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>
                    → <span style={{ fontWeight: 600, color: 'hsl(var(--foreground))' }}>{address.suburb}, {address.country}</span>
                  </span>
                )}
              </div>
              <button onClick={() => setResultsOpen(false)} style={{ padding: '6px 8px', borderRadius: 10, border: '1.5px solid hsl(var(--border))', background: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.15s' }}>
                <ChevronDown size={18} />
              </button>
            </div>

            {/* Sort bar */}
            <div style={{ padding: '10px 20px', borderBottom: '1px solid hsl(var(--border))', display: 'flex', justifyContent: 'flex-end', background: 'hsl(var(--muted) / 0.3)', flexShrink: 0 }}>
              <div style={{ display: 'flex', gap: 4, background: 'hsl(var(--muted))', border: '1px solid hsl(var(--border))', borderRadius: 100, padding: 4 }}>
                {(['proximity', 'price', 'delivery', 'rating'] as const).map(s => (
                  <button key={s} onClick={() => setSortBy(s)} style={{ padding: '5px 12px', borderRadius: 100, border: 'none', cursor: 'pointer', fontSize: 12, fontFamily: 'Inter, sans-serif', fontWeight: sortBy === s ? 600 : 400, background: sortBy === s ? 'hsl(var(--card))' : 'transparent', color: sortBy === s ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))', transition: 'all 0.15s', boxShadow: sortBy === s ? '0 1px 4px rgba(0,0,0,0.08)' : 'none' }}>
                    {s === 'proximity' ? '📍 Nearest' : s === 'price' ? '💰 Cheapest' : s === 'delivery' ? '⚡ Fastest' : '⭐ Top Rated'}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable results */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
              <ResultsGrid
                listings={sorted}
                loading={isSearching}
                hasSearched={hasSearched}
                compareItems={compareItems}
                onToggleCompare={toggleCompare}
                onAddToWatchlist={(l) => toast.success(`"${l.productName}" added to watchlist`)}
                displayCurrency={displayCurrency}
                exchangeRate={exchangeRate}
                selectedCategory={selectedCategory}
                onBarcodeSearch={(q) => { setResultsOpen(false); handleSearch(q); }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Compare button */}
      {compareItems.length > 0 && (
        <div style={{ position: 'fixed', bottom: 80, right: 24, zIndex: 40 }}>
          <button onClick={() => setCompareOpen(true)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, boxShadow: '0 4px 20px hsl(var(--primary) / 0.35)' }}>
            <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>{compareItems.length}</span>
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
