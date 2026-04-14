'use client';
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Toaster, toast } from 'sonner';
import SearchBar from './SearchBar';
import AddressSelector from './AddressSelector';
import FilterPanel from './FilterPanel';
import ResultsGrid from './ResultsGrid';
import ComparisonDrawer from './ComparisonDrawer';
import ThemeSwitcherPanel from './ThemeSwitcherPanel';
import CurrencyConverter from './CurrencyConverter';
import CategoryFilter from './CategoryFilter';
import { type Listing } from './mockData';
import { SlidersHorizontal, Palette, TrendingDown, Zap, Globe, ChevronDown } from 'lucide-react';

const SEARCH_STEPS = [
  { message: 'Searching Google Shopping…', progress: 10 },
  { message: 'Finding listings across 40+ marketplaces…', progress: 25 },
  { message: 'Resolving direct product URLs…', progress: 45 },
  { message: 'Fetching store pages for each result…', progress: 60 },
  { message: 'Comparing prices & delivery times…', progress: 75 },
  { message: 'Almost there — finalising results…', progress: 90 },
];

function StatusBar({ isSearching, query }: { isSearching: boolean; query: string }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isSearching) {
      setStepIndex(0);
      setProgress(SEARCH_STEPS[0].progress);

      intervalRef.current = setInterval(() => {
        setStepIndex(prev => {
          const next = prev + 1;
          if (next >= SEARCH_STEPS.length) {
            // Stay on last step
            setProgress(SEARCH_STEPS[SEARCH_STEPS.length - 1].progress);
            return SEARCH_STEPS.length - 1;
          }
          setProgress(SEARCH_STEPS[next].progress);
          return next;
        });
      }, 1200);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setProgress(0);
      setStepIndex(0);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isSearching]);

  if (!isSearching) return null;

  const currentStep = SEARCH_STEPS[stepIndex];

  return (
    <div className="mt-4 w-full bg-card border border-border rounded-xl overflow-hidden shadow-sm">
      {/* Top row */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="animate-spin inline-block w-4 h-4 border-2 border-primary border-t-transparent rounded-full shrink-0" />
          <span className="text-sm font-medium text-foreground">{currentStep.message}</span>
        </div>
        <span className="text-xs text-muted-foreground font-mono tabular-nums">{currentStep.progress}%</span>
      </div>

      {/* Progress bar */}
      <div className="h-1 w-full bg-muted">
        <div
          className="h-full bg-primary transition-all duration-700 ease-in-out rounded-full"
          style={{ width: `${currentStep.progress}%` }}
        />
      </div>

      {/* Bottom label */}
      <div className="px-4 py-2 bg-muted/30">
        <p className="text-xs text-muted-foreground">
          Searching for <span className="font-semibold text-foreground">"{query}"</span> — this takes ~7 seconds
        </p>
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
  const [resultsModalOpen, setResultsModalOpen] = useState(false);
  const [displayCurrency, setDisplayCurrency] = useState('AUD');
  const [exchangeRate, setExchangeRate] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState('all');

  const fetchSerpApiResults = useCallback(async (productName: string, country: string): Promise<Listing[]> => {
    try {
      const params = new URLSearchParams({
        q: productName,
        country: country.slice(0, 2).toLowerCase(),
      });
      const res = await fetch(`/api/serpapi/search?${params.toString()}`);
      if (!res.ok) return [];
      const data = await res.json();
      if (data.error) {
        console.error('SerpApi error:', data.error, data.detail);
        return [];
      }
      if (!data.listings || !Array.isArray(data.listings)) return [];
      return data.listings as Listing[];
    } catch (err) {
      console.error('SerpApi fetch error:', err);
      return [];
    }
  }, []);

  const handleSearch = useCallback(async (q: typeof query) => {
    if (!q.name.trim()) return;
    if (!address.country) {
      toast.error('Please select your location first');
      return;
    }

    setQuery(q);
    setHasSearched(false);
    setListings([]);
    setIsSearching(true);

    try {
      const results = await fetchSerpApiResults(q.name, address.country);

      setListings(results);
      setHasSearched(true);
      setResultsModalOpen(true);

      if (results.length > 0) {
        toast.success(`Found ${results.length} listing${results.length !== 1 ? 's' : ''} for "${q.name}"`);
      } else {
        toast.info('No listings found. Try a different search term or check your API keys.');
      }
    } catch {
      setHasSearched(true);
      toast.error('Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  }, [fetchSerpApiResults, address.country]);

  const toggleCompare = useCallback((listing: Listing) => {
    setCompareItems(prev => {
      const exists = prev.find(l => l.id === listing.id);
      if (exists) return prev.filter(l => l.id !== listing.id);
      if (prev.length >= 3) {
        toast.error('You can compare up to 3 listings at once');
        return prev;
      }
      const next = [...prev, listing];
      if (next.length >= 2) setCompareOpen(true);
      return next;
    });
  }, []);

  const handleAddToWatchlist = useCallback((listing: Listing) => {
    toast.success(`"${listing.productName}" added to your watchlist`);
  }, []);

  const handleCurrencyChange = useCallback((currency: string, rate: number) => {
    setDisplayCurrency(currency);
    setExchangeRate(rate);
  }, []);

  const sorted = [...listings].sort((a, b) => {
    if (sortBy === 'price') return a.price - b.price;
    if (sortBy === 'delivery') return a.deliveryDays - b.deliveryDays;
    if (sortBy === 'proximity') {
      const aDist = a.distanceKm ?? a.deliveryDays * 500;
      const bDist = b.distanceKm ?? b.deliveryDays * 500;
      return aDist - bDist;
    }
    return b.sellerRating - a.sellerRating;
  }).filter(l => {
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

  return (
    <div className="min-h-screen">
      <Toaster position="bottom-right" richColors />

      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">Product Search</h1>
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
              <Globe size={13} className="text-primary" />
              Real-time prices from <span className="font-semibold text-foreground">global marketplaces</span> via Google Shopping
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <CurrencyConverter
              selectedCurrency={displayCurrency}
              onCurrencyChange={handleCurrencyChange}
            />
            <button
              onClick={() => { setFilterOpen(!filterOpen); setThemeOpen(false); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all duration-200 ${filterOpen ? 'bg-primary text-white border-primary shadow-md shadow-primary/20' : 'bg-card text-foreground border-border hover:bg-muted hover:border-primary/30'}`}
            >
              <SlidersHorizontal size={14} />
              Filters
              {(selectedMarketplaces.length > 0 || deliveryFilter !== 'any' || minRating > 0) && (
                <span className="ml-0.5 w-4 h-4 rounded-full bg-white/30 text-[10px] font-bold flex items-center justify-center">
                  {[selectedMarketplaces.length > 0, deliveryFilter !== 'any', minRating > 0].filter(Boolean).length}
                </span>
              )}
            </button>
            <button
              onClick={() => { setThemeOpen(!themeOpen); setFilterOpen(false); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all duration-200 ${themeOpen ? 'bg-primary text-white border-primary shadow-md shadow-primary/20' : 'bg-card text-foreground border-border hover:bg-muted hover:border-primary/30'}`}
            >
              <Palette size={14} />
              Theme
            </button>
          </div>
        </div>

        {/* Category filters */}
        <div className="mt-4">
          <CategoryFilter selected={selectedCategory} onSelect={setSelectedCategory} />
        </div>

        {/* Status bar */}
        <StatusBar isSearching={isSearching} query={query.name} />
      </div>

      {/* Search + Address section */}
      <div className="space-y-3 mb-6">
        <AddressSelector value={address} onChange={setAddress} />
        <SearchBar initialQuery={query} onSearch={handleSearch} loading={isSearching} disabled={!address.country} />
        {!address.country && (
          <p className="text-xs text-muted-foreground flex items-center gap-1.5 pl-1">
            <Globe size={11} className="text-primary" />
            Select your location above to enable search
          </p>
        )}
      </div>

      {/* Theme panel */}
      {themeOpen && (
        <ThemeSwitcherPanel onClose={() => setThemeOpen(false)} />
      )}

      {/* Filter sidebar */}
      {filterOpen && (
        <div className="mb-6 w-64">
          <FilterPanel
            priceRange={priceRange}
            onPriceRange={setPriceRange}
            selectedMarketplaces={selectedMarketplaces}
            onMarketplaces={setSelectedMarketplaces}
            deliveryFilter={deliveryFilter}
            onDeliveryFilter={setDeliveryFilter}
            minRating={minRating}
            onMinRating={setMinRating}
            onClose={() => setFilterOpen(false)}
          />
        </div>
      )}

      {/* Results Modal Overlay */}
      {resultsModalOpen && hasSearched && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-background/60 backdrop-blur-md"
            onClick={() => setResultsModalOpen(false)}
          />
          <div className="relative z-10 w-full max-w-5xl max-h-[85vh] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <div className="flex items-center gap-3 flex-wrap">
                {!isSearching && inStock.length > 0 && (
                  <>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-success/10 border border-success/20 rounded-lg text-xs font-medium text-success">
                      <TrendingDown size={12} />
                      Best price: <span className="font-bold">${lowestPrice?.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-accent/10 border border-accent/20 rounded-lg text-xs font-medium text-accent">
                      <Zap size={12} fill="currentColor" />
                      Fastest: <span className="font-bold">{fastestDays} day{fastestDays !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-lg text-xs font-medium text-primary">
                      <Globe size={12} />
                      <span className="font-bold">{sorted.length}</span> listings found
                    </div>
                  </>
                )}
                {address.suburb && (
                  <p className="text-xs text-muted-foreground">
                    Delivering to <span className="font-medium text-foreground">{address.suburb}, {address.country}</span>
                  </p>
                )}
              </div>
              <button
                onClick={() => setResultsModalOpen(false)}
                className="ml-4 p-2 rounded-xl bg-muted/60 hover:bg-muted border border-border text-muted-foreground hover:text-foreground transition-all duration-150 shrink-0"
                aria-label="Close results"
              >
                <ChevronDown size={18} />
              </button>
            </div>

            {/* Sort bar */}
            <div className="flex items-center justify-end px-5 py-2.5 border-b border-border shrink-0 bg-muted/20">
              <div className="flex items-center gap-1 bg-muted/60 border border-border rounded-xl p-1">
                {(['proximity', 'price', 'delivery', 'rating'] as const).map(s => (
                  <button
                    key={`sort-${s}`}
                    onClick={() => setSortBy(s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${sortBy === s ? 'bg-card text-foreground shadow-sm border border-border' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    {s === 'proximity' ? '📍 Nearest' : s === 'price' ? '💰 Best Price' : s === 'delivery' ? '⚡ Fastest' : '⭐ Top Rated'}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable results */}
            <div className="flex-1 overflow-y-auto p-5">
              <ResultsGrid
                listings={sorted}
                loading={isSearching}
                hasSearched={hasSearched}
                compareItems={compareItems}
                onToggleCompare={toggleCompare}
                onAddToWatchlist={handleAddToWatchlist}
                displayCurrency={displayCurrency}
                exchangeRate={exchangeRate}
                selectedCategory={selectedCategory}
              />
            </div>
          </div>
        </div>
      )}

      {/* Compare floating button */}
      {compareItems.length > 0 && (
        <div className="fixed bottom-6 right-6 z-40">
          <button
            onClick={() => setCompareOpen(true)}
            className="flex items-center gap-2 px-5 py-3 bg-primary text-white rounded-2xl shadow-xl shadow-primary/30 text-sm font-semibold hover:opacity-90 active:scale-95 transition-all duration-150"
          >
            <span className="w-5 h-5 rounded-full bg-white/25 text-xs font-bold flex items-center justify-center">{compareItems.length}</span>
            Compare items
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
