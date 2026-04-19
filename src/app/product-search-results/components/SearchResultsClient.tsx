'use client';
import Link from 'next/link';
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getEffectivePlan, canUseFeature, PLAN_LIMITS } from '@/lib/plan';
import { createClient } from '@/lib/supabase/client';
import { useScroll, useTransform, useSpring, motion } from 'framer-motion';
import { Toaster, toast } from 'sonner';
import AddressSelector from './AddressSelector';
import BorderGlow from '@/components/BorderGlow';
import '@/components/BorderGlow.css';
import FilterPanel from './FilterPanel';
import ResultsGrid from './ResultsGrid';
import ComparisonDrawer from './ComparisonDrawer';
import CurrencyConverter from './CurrencyConverter';
import CategoryFilter from './CategoryFilter';
import { type Listing } from './mockData';
import { SlidersHorizontal, TrendingDown, Zap, Globe, ChevronDown } from 'lucide-react';
import { LiquidButton } from '@/components/ui/LiquidButton';

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

// ── Marketplace logos strip ──────────────────────────────
const MARKETPLACES = [
  { name: 'Amazon',        logo: 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg' },
  { name: 'eBay',          logo: 'https://upload.wikimedia.org/wikipedia/commons/1/1b/EBay_logo.svg' },
  { name: 'JB Hi-Fi',      logo: 'https://upload.wikimedia.org/wikipedia/en/1/11/JB_Hi-Fi_logo.svg' },
  { name: 'Kogan',         logo: 'https://upload.wikimedia.org/wikipedia/commons/9/9e/Kogan_logo.png' },
  { name: 'Harvey Norman', logo: 'https://upload.wikimedia.org/wikipedia/commons/0/01/Harvey_Norman_Logo.svg' },
  { name: 'Walmart',       logo: 'https://upload.wikimedia.org/wikipedia/commons/1/14/Walmart_Spark.svg' },
];

// ── Status bar ───────────────────────────────────────────
function StatusBar({ active, query }: { active: boolean; query: string }) {
  const [step, setStep] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (active) {
      setStep(0);
      timer.current = setInterval(() => setStep(p => Math.min(p + 1, STEPS.length - 1)), 1200);
    } else {
      if (timer.current) clearInterval(timer.current);
    }
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [active]);
  if (!active) return null;
  return (
    <div style={{ marginTop: 16, background: 'hsl(var(--card))', border: '1.5px solid hsl(var(--primary) / 0.2)', borderRadius: 14, overflow: 'hidden' }}>
      <div style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="animate-spin-sm" style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid hsl(var(--primary))', borderTopColor: 'transparent', borderRadius: '50%' }} />
          <span style={{ fontSize: 13, color: 'hsl(var(--foreground))', fontWeight: 500 }}>{STEPS[step].msg}</span>
        </div>
        <span style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>{STEPS[step].pct}%</span>
      </div>
      <div className="progress-track"><div className="progress-fill" style={{ width: `${STEPS[step].pct}%` }} /></div>
      <div style={{ padding: '8px 18px', background: 'hsl(var(--primary) / 0.03)' }}>
        <span style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>
          Searching for <strong style={{ color: 'hsl(var(--foreground))' }}>"{query}"</strong> — usually ~7 seconds
        </span>
      </div>
    </div>
  );
}

// ── App mockup card (used in hero) ───────────────────────
function AppMockup() {
  return (
    <div style={{
      background: 'hsl(var(--card))',
      border: '1.5px solid hsl(var(--border))',
      borderRadius: 20,
      overflow: 'hidden',
      boxShadow: '0 32px 80px rgba(0,0,0,0.12)',
      maxWidth: 700,
      width: '100%',
    }}>
      {/* Mock topbar */}
      <div style={{ padding: '12px 18px', background: 'hsl(var(--background) / 0.8)', borderBottom: '1px solid hsl(var(--border))', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <img src="/logo.png" alt="ShopRadar" style={{ width: 24, height: 24, display: "block", flexShrink: 0 }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: 'hsl(var(--foreground))' }}>ShopRadar</span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {['#ff5f57','#febc2e','#28c840'].map((c, i) => (
            <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
          ))}
        </div>
      </div>
      {/* Mock search bar */}
      <div style={{ padding: '14px 18px 10px', borderBottom: '1px solid hsl(var(--border))' }}>
        <div style={{ background: 'hsl(var(--muted))', borderRadius: 100, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ color: 'hsl(var(--muted-foreground))' }}>
            <circle cx="6" cy="6" r="4" stroke="currentColor" strokeWidth="1.4"/>
            <path d="M9.5 9.5L12 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          <span style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>Search any product…</span>
          <div style={{ marginLeft: 'auto', background: 'hsl(var(--primary))', color: 'white', borderRadius: 100, padding: '3px 10px', fontSize: 11, fontWeight: 600 }}>Search</div>
        </div>
      </div>
      {/* Mock product cards */}
      <div style={{ padding: 14, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {[
          { name: 'Sony WH-1000XM5', price: 'A$279', store: 'Amazon', badge: '★ Best Price', img: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200&h=140&fit=crop', badgeColor: 'hsl(var(--success))' },
          { name: 'iPhone 15 Pro', price: 'A$1,499', store: 'JB Hi-Fi', badge: '⚡ Fastest', img: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=200&h=140&fit=crop', badgeColor: 'hsl(var(--primary))' },
          { name: 'Samsung 4K TV', price: 'A$899', store: 'Harvey Norman', badge: 'Verified ◎', img: 'https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=200&h=140&fit=crop', badgeColor: 'hsl(var(--muted-foreground))' },
        ].map((item, i) => (
          <div key={i} style={{ background: 'hsl(var(--background))', borderRadius: 12, overflow: 'hidden', border: '1px solid hsl(var(--border))' }}>
            <div style={{ height: 80, overflow: 'hidden', position: 'relative' }}>
              <img src={item.img} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <span style={{ position: 'absolute', top: 6, left: 6, fontSize: 8, fontWeight: 700, padding: '1px 5px', borderRadius: 4, background: item.badgeColor, color: 'white' }}>{item.badge}</span>
            </div>
            <div style={{ padding: '8px 8px 10px' }}>
              <p style={{ fontSize: 10, fontWeight: 600, color: 'hsl(var(--foreground))', marginBottom: 2, lineHeight: 1.3 }}>{item.name}</p>
              <p style={{ fontSize: 9, color: 'hsl(var(--muted-foreground))', marginBottom: 6 }}>{item.store}</p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: 'hsl(var(--foreground))' }}>{item.price}</span>
                <div style={{ background: 'hsl(var(--primary))', borderRadius: 100, padding: '2px 7px', fontSize: 8, color: 'white', fontWeight: 600 }}>View →</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


// ── Scroll-animated mockup ────────────────────────────────
function ScrollMockup() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });

  const rotateX = useTransform(scrollYProgress, [0, 0.4], [22, 0]);
  const rotateXSpring = useSpring(rotateX, { stiffness: 60, damping: 20 });

  const scale = useTransform(scrollYProgress, [0, 0.4], [0.88, 1]);
  const scaleSpring = useSpring(scale, { stiffness: 60, damping: 20 });

  const translateY = useTransform(scrollYProgress, [0, 0.4], [60, 0]);
  const translateYSpring = useSpring(translateY, { stiffness: 60, damping: 20 });

  return (
    <div ref={ref} style={{
      maxWidth: 1200, margin: '0 auto -60px', padding: '0 24px',
      maskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)',
      WebkitMaskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)',
      perspective: '1200px',
    }}>
      <motion.div
        style={{
          rotateX: rotateXSpring,
          scale: scaleSpring,
          y: translateYSpring,
          transformOrigin: 'top center',
          boxShadow: '0 0 #0000004d, 0 9px 20px #0000004a, 0 37px 37px #00000042, 0 84px 50px #00000026',
          borderRadius: 20,
          overflow: 'hidden',
          border: '1.5px solid hsl(var(--border))',
          background: 'hsl(var(--card))',
        }}
      >
        <AppMockup />
      </motion.div>
    </div>
  );
}

export default function SearchResultsClient() {
  const [searchText, setSearchText] = useState('');
  const [query, setQuery] = useState({ name: '' });
  const [hasSearched, setHasSearched] = useState(false);
  const [listings, setListings] = useState<Listing[]>([]);
  const [sortBy, setSortBy] = useState<'price' | 'delivery' | 'rating' | 'proximity'>('price');
  const [filterOpen, setFilterOpen] = useState(false);
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
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showRecent, setShowRecent] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const searchSectionRef = useRef<HTMLDivElement>(null);
  const [savedSearches, setSavedSearches] = useState<string[]>([]);
  const [multiCountry, setMultiCountry] = useState(false);
  const [exportingCSV, setExportingCSV] = useState(false);
  const [photoSearching, setPhotoSearching] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const { user, loading: authLoading } = useAuth();
  const supabase = createClient();
  const [userProfile, setUserProfile] = useState<any>(null);
  const plan = getEffectivePlan(user, userProfile);
  const searchLimit = PLAN_LIMITS[plan].searches_per_day;

  // Load user profile for plan check
  useEffect(() => {
    if (!user) return;
    supabase.from('user_profiles').select('subscription_plan, subscription_status').eq('id', user.id).single()
      .then(({ data }) => { if (data) setUserProfile(data); });
  }, [user]);

  useEffect(() => {
    try { setRecentSearches(JSON.parse(localStorage.getItem('shopradar_recent') || '[]')); } catch { }
  }, []);

  // Load saved searches for Radar+ users
  useEffect(() => {
    if (user && plan === 'radar_plus') {
      fetch(`/api/saved-searches?userId=${user.id}`)
        .then(r => r.json()).then(d => setSavedSearches((d.searches || []).map((s: any) => s.query)))
        .catch(() => {});
    }
  }, [user, plan]);

  useEffect(() => {
    if (address.country) {
      const cc = address.country.slice(0, 2).toLowerCase();
      const curr = COUNTRY_CURRENCY[cc] || COUNTRY_CURRENCY['au'];
      setDisplayCurrency(curr.code); setExchangeRate(curr.rate);
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
      const res = await fetch(`/api/serpapi/search?${new URLSearchParams({ q: name, country: country.slice(0, 2).toLowerCase() })}`);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data.listings) ? data.listings : [];
    } catch { return []; }
  }, []);

  const handleSearch = useCallback(async (overrideName?: string) => {
    const name = (overrideName || searchText).trim();
    if (!name) return;
    if (!address.country) { toast.error('Please select your location first'); return; }

    // Plan enforcement — check daily search limit for free users
    if (!canUseFeature(plan, 'unlimited_searches')) {
      const today = new Date().toDateString();
      const stored = JSON.parse(localStorage.getItem('shopradar_daily') || '{}');
      const count = stored.date === today ? stored.count : 0;
      if (count >= searchLimit) {
        toast.error(`Free plan limit: ${searchLimit} searches per day. Upgrade to Pro for unlimited searches.`, { duration: 5000 });
        return;
      }
      localStorage.setItem('shopradar_daily', JSON.stringify({ date: today, count: count + 1 }));
    }
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

  const handleCSVExport = async () => {
    if (!canUseFeature(plan, 'csv_export')) { window.location.href = '/pricing'; return; }
    setExportingCSV(true);
    try {
      const res = await fetch('/api/csv-export', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listings: sorted, query: query.name }),
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url;
      a.download = `shopradar-${query.name.replace(/\s+/g, '-')}.csv`;
      a.click(); URL.revokeObjectURL(url);
    } catch { toast.error('Export failed'); } finally { setExportingCSV(false); }
  };

  const handleSaveSearch = async () => {
    if (!user || !query.name) return;
    await fetch('/api/saved-searches', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, query: query.name, country: address.country }),
    });
    setSavedSearches(prev => [...new Set([...prev, query.name.toLowerCase()])]);
    toast.success('Search saved — we\'ll track this for you');
  };

  const handlePhotoSearch = async (file: File) => {
    if (!canUseFeature(plan, 'barcode_scanner')) { window.location.href = '/pricing'; return; }
    setPhotoSearching(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = (e.target?.result as string).split(',')[1];
        const mimeType = file.type;
        const res = await fetch('/api/photo-search', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64, mimeType }),
        });
        const data = await res.json();
        if (data.query) {
          setSearchText(data.query);
          toast.success(`Found: ${data.description || data.query}`);
          setTimeout(() => handleSearch(data.query), 300);
        } else {
          toast.error('Could not identify product in image');
        }
        setPhotoSearching(false);
      };
      reader.readAsDataURL(file);
    } catch {
      toast.error('Photo search failed');
      setPhotoSearching(false);
    }
  };

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

  // Show skeleton while auth loads
  if (authLoading) {
    return (
      <div style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
        <style>{`@keyframes shimmer{0%,100%{opacity:0.4}50%{opacity:0.8}}`}</style>
        {/* Hero skeleton */}
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 24px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
          <div style={{ width: 180, height: 24, borderRadius: 100, background: 'hsl(var(--muted))', animation: 'shimmer 1.5s ease-in-out infinite' }} />
          <div style={{ width: '70%', height: 56, borderRadius: 12, background: 'hsl(var(--muted))', animation: 'shimmer 1.5s ease-in-out infinite' }} />
          <div style={{ width: '50%', height: 56, borderRadius: 12, background: 'hsl(var(--muted))', animation: 'shimmer 1.5s ease-in-out infinite' }} />
          <div style={{ width: 320, height: 18, borderRadius: 8, background: 'hsl(var(--muted))', animation: 'shimmer 1.5s ease-in-out infinite' }} />
          <div style={{ width: 160, height: 48, borderRadius: 100, background: 'hsl(var(--muted))', animation: 'shimmer 1.5s ease-in-out infinite', marginTop: 8 }} />
        </div>
        {/* Stats skeleton */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 48, padding: '20px 24px' }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 60, height: 32, borderRadius: 8, background: 'hsl(var(--muted))', animation: 'shimmer 1.5s ease-in-out infinite' }} />
              <div style={{ width: 80, height: 14, borderRadius: 6, background: 'hsl(var(--muted))', animation: 'shimmer 1.5s ease-in-out infinite' }} />
            </div>
          ))}
        </div>
        {/* Search area skeleton */}
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '40px 24px' }}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
            <div style={{ width: 100, height: 36, borderRadius: 100, background: 'hsl(var(--muted))', animation: 'shimmer 1.5s ease-in-out infinite' }} />
            <div style={{ width: 90, height: 36, borderRadius: 100, background: 'hsl(var(--muted))', animation: 'shimmer 1.5s ease-in-out infinite' }} />
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            {[1,2,3,4,5,6].map(i => <div key={i} style={{ width: 90, height: 34, borderRadius: 100, background: 'hsl(var(--muted))', animation: 'shimmer 1.5s ease-in-out infinite' }} />)}
          </div>
          <div style={{ height: 56, borderRadius: 100, background: 'hsl(var(--muted))', animation: 'shimmer 1.5s ease-in-out infinite', marginBottom: 16 }} />
          <div style={{ height: 56, borderRadius: 16, background: 'hsl(var(--muted))', animation: 'shimmer 1.5s ease-in-out infinite' }} />
        </div>
      </div>
    );
  }

  // Redirect to sign in if not logged in
  if (!user) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 20, fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", padding: '40px 24px', textAlign: 'center' }}>
        <img src="/logo.png" alt="ShopRadar" style={{ width: 56, height: 56 }} />
        <h2 style={{ fontSize: 28, fontWeight: 800, color: 'hsl(var(--foreground))', margin: 0, letterSpacing: '-0.02em' }}>Sign in to search</h2>
        <p style={{ fontSize: 15, color: 'hsl(var(--muted-foreground))', margin: 0, maxWidth: 340, lineHeight: 1.6 }}>
          Create a free account to compare prices across 40+ marketplaces and track price drops.
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link href="/sign-up-login" style={{ display: 'inline-block', padding: '12px 32px', borderRadius: 100, background: 'hsl(var(--primary))', color: 'white', textDecoration: 'none', fontWeight: 700, fontSize: 15 }}>
            Sign in
          </Link>
          <Link href="/sign-up-login" style={{ display: 'inline-block', padding: '12px 32px', borderRadius: 100, border: '1.5px solid hsl(var(--border))', color: 'hsl(var(--foreground))', textDecoration: 'none', fontWeight: 600, fontSize: 15 }}>
            Create account
          </Link>
        </div>
        <p style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))', margin: 0 }}>Free forever · No credit card required</p>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', zIndex: 1 }}>
      <Toaster position="bottom-right" toastOptions={{
        style: { background: 'hsl(var(--card))', border: '1.5px solid hsl(var(--border))', color: 'hsl(var(--foreground))', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 13, borderRadius: 12 },
      }} />

      {/* ════════════════════════════════════════
          HERO SECTION
      ════════════════════════════════════════ */}
      <section style={{ overflow: 'hidden', paddingBottom: 0 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '64px 24px 0', position: 'relative', zIndex: 2 }}>

          {/* Badge — fade up */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28, animation: 'heroFadeUp 0.9s 0.1s cubic-bezier(0.25,0.4,0.25,1) both' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '6px 16px', borderRadius: 100, background: 'hsl(var(--primary) / 0.06)', border: '1px solid hsl(var(--primary) / 0.15)', fontSize: 12, color: 'hsl(var(--primary))', fontWeight: 600, letterSpacing: '0.01em' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'hsl(var(--primary))', display: 'inline-block' }} />
              Real-time prices from 40+ global marketplaces
            </div>
          </div>

          {/* Headline — HeroGeometric style gradient */}
          <h1 style={{
            textAlign: 'center',
            fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
            fontWeight: 800,
            fontSize: 'clamp(42px, 7vw, 88px)',
            letterSpacing: '-0.04em',
            lineHeight: 1.0,
            marginBottom: 24,
            animation: 'heroFadeUp 1s 0.3s cubic-bezier(0.25,0.4,0.25,1) both',
          }}>
            <span style={{
              display: 'block',
              backgroundImage: 'linear-gradient(to bottom, hsl(var(--foreground)), hsl(var(--foreground) / 0.8))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              Find the best price,
            </span>
            <span style={{
              display: 'block',
              backgroundImage: 'linear-gradient(to right, hsl(218 100% 65%), hsl(var(--foreground) / 0.9), hsl(218 100% 70%))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              anywhere.
            </span>
          </h1>

          {/* Subtext — fade up */}
          <p style={{
            textAlign: 'center',
            fontSize: 18,
            color: 'hsl(var(--muted-foreground))',
            lineHeight: 1.65,
            maxWidth: 500,
            margin: '0 auto 36px',
            fontWeight: 300,
            letterSpacing: '0.01em',
            animation: 'heroFadeUp 1s 0.5s cubic-bezier(0.25,0.4,0.25,1) both',
          }}>
            ShopRadar scans Amazon, eBay, JB Hi-Fi, Kogan and dozens more — showing you the cheapest price with real delivery dates to your door.
          </p>

          {/* CTA button */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 52, animation: 'heroFadeUp 1s 0.65s cubic-bezier(0.25,0.4,0.25,1) both' }}>
            <LiquidButton
              size="xl"
              onClick={() => searchSectionRef.current?.scrollIntoView({ behavior: 'smooth' })}
              style={{
                fontSize: 16, fontWeight: 700,
                color: 'hsl(var(--primary))',
                background: 'linear-gradient(135deg, rgba(61,142,255,0.38) 0%, rgba(61,142,255,0.14) 100%)',
                border: '1px solid rgba(61,142,255,0.45)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3), 0 0 28px rgba(61,142,255,0.22), 0 4px 16px rgba(0,0,0,0.15)',
              }}
            >
              Start comparing →
            </LiquidButton>
          </div>

          {/* Stats row */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 40, marginBottom: 48, flexWrap: 'wrap' }}>
            {[
              { value: '40+', label: 'Marketplaces' },
              { value: 'Free', label: 'Always' },
              { value: 'Real-time', label: 'Price data' },
            ].map((s, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontWeight: 800, fontSize: 28, color: 'hsl(var(--foreground))', letterSpacing: '-0.03em' }}>{s.value}</div>
                <div style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Scroll-animated app mockup ── */}
        <ScrollMockup />
      </section>

      {/* ── Marketplace logos strip ── */}
      <section style={{ background: 'hsl(var(--background))', position: 'relative', zIndex: 10, paddingTop: 100, paddingBottom: 48 }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px' }}>
          <p style={{ textAlign: 'center', fontSize: 13, fontWeight: 600, color: 'hsl(var(--muted-foreground))', marginBottom: 28, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Scanning prices from
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 32 }}>
            {MARKETPLACES.map((m, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: 0.55, filter: 'grayscale(1)', transition: 'opacity 0.2s, filter 0.2s' }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.opacity = '1'; el.style.filter = 'none'; }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.opacity = '0.55'; el.style.filter = 'grayscale(1)'; }}
              >
                <img src={m.logo} alt={m.name} style={{ height: 22, width: 'auto', maxWidth: 90, objectFit: 'contain' }}
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: 'hsl(var(--foreground))', whiteSpace: 'nowrap' }}>{m.name}</span>
              </div>
            ))}
            <span style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--muted-foreground))' }}>+ 35 more</span>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          SEARCH SECTION
      ════════════════════════════════════════ */}
      <div ref={searchSectionRef} style={{ maxWidth: 1400, margin: '0 auto', padding: '48px 24px 120px' }}>

        {/* Controls row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <CurrencyConverter selectedCurrency={displayCurrency} onCurrencyChange={(c, r) => { setDisplayCurrency(c); setExchangeRate(r); }} />
            <button onClick={() => { setFilterOpen(!filterOpen); }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 100, border: `1.5px solid ${filterOpen ? 'hsl(var(--primary))' : 'hsl(var(--border))'}`, background: filterOpen ? 'hsl(var(--primary) / 0.08)' : 'hsl(var(--card))', color: filterOpen ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))', cursor: 'pointer', fontSize: 13, fontWeight: 500, transition: 'all 0.15s' }}>
              <SlidersHorizontal size={14} />
              Filters
              {activeFilterCount > 0 && <span style={{ width: 16, height: 16, borderRadius: '50%', background: 'hsl(var(--primary))', color: 'white', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{activeFilterCount}</span>}
            </button>

          </div>
        </div>

        {/* Category filter */}
        <div style={{ marginBottom: 14 }}>
          <CategoryFilter selected={selectedCategory} onSelect={setSelectedCategory} />
        </div>

        {filterOpen && (
          <div style={{ marginBottom: 16, maxWidth: 320 }}>
            <FilterPanel priceRange={priceRange} onPriceRange={setPriceRange} selectedMarketplaces={selectedMarketplaces} onMarketplaces={setSelectedMarketplaces} deliveryFilter={deliveryFilter} onDeliveryFilter={setDeliveryFilter} minRating={minRating} onMinRating={setMinRating} onClose={() => setFilterOpen(false)} />
          </div>
        )}

        {/* Location */}
        <div className="location-glow" style={{ marginBottom: 10 }}>
          <AddressSelector value={address} onChange={setAddress} />
        </div>

        {/* Search bar */}
        <div style={{ marginBottom: 8, position: 'relative' }}>
          <BorderGlow borderRadius={100} backgroundColor="hsl(var(--card))" glowColor="218 100 60" colors={['#3b82f6', '#6366f1', '#0ea5e9']} edgeSensitivity={20} glowRadius={32} glowIntensity={1.2} coneSpread={30} animated>
          <div style={{ padding: '6px 6px 6px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ color: 'hsl(var(--muted-foreground))', flexShrink: 0 }}>
              <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M11 11L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <input ref={searchRef} value={searchText}
              onChange={e => { setSearchText(e.target.value); setShowRecent(e.target.value.length === 0 && recentSearches.length > 0); }}
              onFocus={() => { if (!searchText && recentSearches.length > 0) setShowRecent(true); }}
              onBlur={() => setTimeout(() => setShowRecent(false), 150)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder={address.country ? 'Search any product…' : 'Set your location first…'}
              disabled={!address.country || isSearching}
              style={{ background: 'none', border: 'none', outline: 'none', flex: 1, fontSize: 15, color: 'hsl(var(--foreground))', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", padding: '8px 0' }}
            />
            {searchText && !isSearching && (
              <button onClick={() => { setSearchText(''); searchRef.current?.focus(); }} style={{ color: 'hsl(var(--muted-foreground))', background: 'none', border: 'none', cursor: 'pointer', padding: '0 8px', opacity: 0.5 }}>
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M1 1l11 11M12 1L1 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </button>
            )}
            {/* Hidden file input for photo search */}
            <input ref={photoInputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoSearch(f); e.target.value = ''; }} />
            {canUseFeature(plan, 'barcode_scanner') ? (
              <button onClick={() => photoInputRef.current?.click()} disabled={photoSearching || isSearching}
                title="Search by photo (Radar+)"
                style={{ width: 40, height: 40, borderRadius: '50%', border: '1.5px solid hsl(var(--border))', background: photoSearching ? 'hsl(var(--primary) / 0.1)' : 'transparent', color: photoSearching ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
                {photoSearching ? (
                  <svg width="14" height="14" viewBox="0 0 14 14" style={{ animation: 'spin 0.75s linear infinite' }}><circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="20" strokeDashoffset="10" fill="none"/></svg>
                ) : (
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                    <rect x="1" y="3" width="13" height="10" rx="2" stroke="currentColor" strokeWidth="1.3"/>
                    <circle cx="7.5" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.3"/>
                    <path d="M5 3l1-2h3l1 2" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
            ) : (
              <button onClick={() => window.location.href = '/pricing'}
                title="Photo search — Radar+ only"
                style={{ width: 40, height: 40, borderRadius: '50%', border: '1.5px solid hsl(var(--primary) / 0.3)', background: 'hsl(var(--primary) / 0.06)', color: 'hsl(var(--primary))', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                  <rect x="1" y="3" width="13" height="10" rx="2" stroke="currentColor" strokeWidth="1.3"/>
                  <circle cx="7.5" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.3"/>
                  <path d="M5 3l1-2h3l1 2" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
                </svg>
              </button>
            )}
            <button onClick={() => handleSearch()} disabled={!address.country || isSearching || !searchText.trim()} className="btn-primary" style={{ fontSize: 14, padding: '10px 24px' }}>
              {isSearching ? 'Searching…' : 'Search'}
            </button>
          </div>
          </BorderGlow>

          {/* Recent searches */}
          {showRecent && recentSearches.length > 0 && (
            <div style={{ marginTop: 4, background: 'hsl(var(--card))', border: '1.5px solid hsl(var(--border))', borderRadius: 14, overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.08)', position: 'absolute', left: 0, right: 0, zIndex: 50 }}>
              <div style={{ padding: '10px 14px 6px', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'hsl(var(--muted-foreground))', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Recent</span>
                <button onClick={() => { localStorage.removeItem('shopradar_recent'); setRecentSearches([]); setShowRecent(false); }} style={{ fontSize: 10, color: 'hsl(var(--muted-foreground))', background: 'none', border: 'none', cursor: 'pointer' }}>Clear all</button>
              </div>
              {recentSearches.map((s, i) => (
                <button key={i} onMouseDown={() => handleSearch(s)}
                  style={{ width: '100%', padding: '8px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', color: 'hsl(var(--foreground))', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, transition: 'background 0.1s' }}
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

        <StatusBar active={isSearching} query={query.name} />
        {hasSearched && listings.length > 0 && (
          <div style={{ display: 'flex', gap: 8, padding: '8px 0', flexWrap: 'wrap' }}>
            {canUseFeature(plan, 'csv_export') ? (
              <button onClick={handleCSVExport} disabled={exportingCSV} style={{ fontSize: 12, padding: '6px 14px', borderRadius: 100, border: '1.5px solid hsl(var(--border))', background: 'hsl(var(--card))', color: 'hsl(var(--foreground))', cursor: 'pointer', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 5 }}>
                {exportingCSV ? '…' : '↓'} Export CSV
              </button>
            ) : (
              <button onClick={() => window.location.href = '/pricing'} style={{ fontSize: 12, padding: '6px 14px', borderRadius: 100, border: '1.5px solid hsl(var(--primary) / 0.3)', background: 'hsl(var(--primary) / 0.06)', color: 'hsl(var(--primary))', cursor: 'pointer', fontWeight: 500 }}>
                Pro — Export CSV
              </button>
            )}
            {user && canUseFeature(plan, 'saved_searches') && !savedSearches.includes(query.name.toLowerCase()) && (
              <button onClick={handleSaveSearch} style={{ fontSize: 12, padding: '6px 14px', borderRadius: 100, border: '1.5px solid hsl(var(--border))', background: 'hsl(var(--card))', color: 'hsl(var(--foreground))', cursor: 'pointer', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 5 }}>
                ♥ Save Search
              </button>
            )}
            {user && savedSearches.includes(query.name.toLowerCase()) && (
              <span style={{ fontSize: 12, padding: '6px 14px', borderRadius: 100, background: 'hsl(var(--success) / 0.1)', color: 'hsl(var(--success))', border: '1px solid hsl(var(--success) / 0.2)', fontWeight: 500 }}>
                ✓ Search saved
              </span>
            )}
          </div>
        )}

        {/* Results modal */}
        {resultsOpen && hasSearched && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div style={{ position: 'absolute', inset: 0, background: 'hsl(var(--background) / 0.75)', backdropFilter: 'blur(12px)' }} onClick={() => setResultsOpen(false)} />
            <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: 1100, maxHeight: '88vh', background: 'hsl(var(--card))', border: '1.5px solid hsl(var(--border))', borderRadius: 24, boxShadow: '0 24px 80px rgba(0,0,0,0.12)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {/* Modal header */}
              <div style={{ padding: '14px 20px', borderBottom: '1px solid hsl(var(--border))', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  {lowestPrice !== null && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 100, background: 'hsl(var(--success) / 0.1)', border: '1px solid hsl(var(--success) / 0.2)', fontSize: 12, fontWeight: 600, color: 'hsl(var(--success))' }}>
                      <TrendingDown size={12} /> Best: <strong>A${lowestPrice.toFixed(2)}</strong>
                    </div>
                  )}
                  {fastestDays !== null && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 100, background: 'hsl(var(--primary) / 0.08)', border: '1px solid hsl(var(--primary) / 0.15)', fontSize: 12, fontWeight: 600, color: 'hsl(var(--primary))' }}>
                      <Zap size={12} /> Fastest: <strong>{fastestDays}d</strong>
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 100, background: 'hsl(var(--muted))', fontSize: 12, fontWeight: 600, color: 'hsl(var(--muted-foreground))' }}>
                    <Globe size={12} /> {sorted.length} listings
                  </div>
                </div>
                <button onClick={() => setResultsOpen(false)} style={{ padding: '5px 8px', borderRadius: 10, border: '1.5px solid hsl(var(--border))', background: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                  <ChevronDown size={18} />
                </button>
              </div>
              {/* Sort bar */}
              <div style={{ padding: '10px 20px', borderBottom: '1px solid hsl(var(--border))', display: 'flex', justifyContent: 'flex-end', background: 'hsl(var(--muted) / 0.3)', flexShrink: 0 }}>
                <div style={{ display: 'flex', gap: 4, background: 'hsl(var(--muted))', border: '1px solid hsl(var(--border))', borderRadius: 100, padding: 4 }}>
                  {(['proximity', 'price', 'delivery', 'rating'] as const).map(s => (
                    <button key={s} onClick={() => setSortBy(s)} style={{ padding: '5px 12px', borderRadius: 100, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: sortBy === s ? 600 : 400, background: sortBy === s ? 'hsl(var(--card))' : 'transparent', color: sortBy === s ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))', transition: 'all 0.15s', boxShadow: sortBy === s ? '0 1px 4px rgba(0,0,0,0.08)' : 'none' }}>
                      {s === 'proximity' ? '📍 Nearest' : s === 'price' ? '💰 Cheapest' : s === 'delivery' ? '⚡ Fastest' : '⭐ Top Rated'}
                    </button>
                  ))}
                </div>
              </div>
              {/* Results */}
              <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
                <ResultsGrid listings={sorted} loading={isSearching} hasSearched={hasSearched} compareItems={compareItems} onToggleCompare={toggleCompare} onAddToWatchlist={async (l) => {
                  if (!user) { toast.error('Sign in to add to watchlist'); return; }
                  const limit = PLAN_LIMITS[plan].watchlist_items;
                  if (limit !== Infinity) {
                    const { count } = await supabase.from('watchlist_items').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
                    if ((count || 0) >= limit) {
                      toast.error(`Watchlist limit: ${limit} items on ${plan === 'free' ? 'Free' : 'Pro'} plan. Upgrade for more.`, { duration: 5000 });
                      return;
                    }
                  }
                  await supabase.from('watchlist_items').insert({ user_id: user.id, product_name: l.productName, marketplace: l.marketplace, price: l.price, currency: l.currency, listing_url: l.listingUrl });
                  toast.success(`"${l.productName}" added to watchlist`);
                }} displayCurrency={displayCurrency} exchangeRate={exchangeRate} selectedCategory={selectedCategory} onBarcodeSearch={(q) => { setResultsOpen(false); handleSearch(q); }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {compareItems.length > 0 && (
        <div style={{ position: 'fixed', bottom: 80, right: 24, zIndex: 40 }}>
          <button onClick={() => setCompareOpen(true)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>{compareItems.length}</span>
            Compare
          </button>
        </div>
      )}

      {compareOpen && compareItems.length >= 2 && (
        <ComparisonDrawer items={compareItems} onRemove={(id) => setCompareItems(prev => prev.filter(l => l.id !== id))} onClose={() => setCompareOpen(false)} />
      )}
    </div>
  );
}
