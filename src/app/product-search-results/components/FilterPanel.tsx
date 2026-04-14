'use client';
import React from 'react';
import { X, Star } from 'lucide-react';

const MARKETPLACES = ['Amazon', 'eBay', 'Best Buy', 'Walmart', 'B&H Photo', 'Newegg', 'Costco', 'Rakuten', 'Adorama', 'Currys', 'JB Hi-Fi'];

interface FilterPanelProps {
  priceRange: [number, number];
  onPriceRange: (r: [number, number]) => void;
  selectedMarketplaces: string[];
  onMarketplaces: (m: string[]) => void;
  deliveryFilter: 'any' | 'express' | '3days' | '7days';
  onDeliveryFilter: (f: 'any' | 'express' | '3days' | '7days') => void;
  minRating: number;
  onMinRating: (r: number) => void;
  onClose: () => void;
}

export default function FilterPanel({
  priceRange, onPriceRange,
  selectedMarketplaces, onMarketplaces,
  deliveryFilter, onDeliveryFilter,
  minRating, onMinRating,
  onClose,
}: FilterPanelProps) {
  const toggleMarket = (m: string) => {
    onMarketplaces(
      selectedMarketplaces.includes(m)
        ? selectedMarketplaces.filter(x => x !== m)
        : [...selectedMarketplaces, m]
    );
  };

  const deliveryOptions: { value: 'any' | 'express' | '3days' | '7days'; label: string }[] = [
    { value: 'any', label: 'Any speed' },
    { value: 'express', label: 'Express only' },
    { value: '3days', label: 'Within 3 days' },
    { value: '7days', label: 'Within 7 days' },
  ];

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm p-4 space-y-5 sticky top-24">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Filters</h3>
        <button onClick={onClose} className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-150">
          <X size={14} />
        </button>
      </div>

      {/* Price range */}
      <div>
        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Price Range (USD)</label>
        <div className="flex items-center gap-2 mb-2">
          <input
            type="number"
            value={priceRange[0]}
            onChange={e => onPriceRange([Number(e.target.value), priceRange[1]])}
            className="w-full px-2 py-1.5 bg-muted/50 border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            placeholder="Min"
          />
          <span className="text-muted-foreground text-xs">—</span>
          <input
            type="number"
            value={priceRange[1]}
            onChange={e => onPriceRange([priceRange[0], Number(e.target.value)])}
            className="w-full px-2 py-1.5 bg-muted/50 border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            placeholder="Max"
          />
        </div>
        <div className="flex gap-1 flex-wrap mt-2">
          {([100, 200, 300, 500] as const).map(v => (
            <button
              key={`price-chip-${v}`}
              onClick={() => onPriceRange([0, v])}
              className={`px-2 py-1 rounded-md text-xs font-medium transition-all duration-150 ${priceRange[1] === v ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
            >
              Under ${v}
            </button>
          ))}
        </div>
      </div>

      {/* Delivery speed */}
      <div>
        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Delivery Speed</label>
        <div className="space-y-1.5">
          {deliveryOptions.map(opt => (
            <button
              key={`delivery-${opt.value}`}
              onClick={() => onDeliveryFilter(opt.value)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-150 ${deliveryFilter === opt.value ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Marketplaces */}
      <div>
        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Marketplaces</label>
        <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
          {MARKETPLACES.map(m => (
            <label key={`market-${m}`} className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={selectedMarketplaces.includes(m)}
                onChange={() => toggleMarket(m)}
                className="w-4 h-4 rounded border-border text-primary focus:ring-primary/30 accent-primary"
              />
              <span className={`text-sm transition-colors ${selectedMarketplaces.includes(m) ? 'text-foreground font-medium' : 'text-muted-foreground group-hover:text-foreground'}`}>
                {m}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Min rating */}
      <div>
        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Min. Seller Rating</label>
        <div className="flex gap-1">
          {[0, 3, 3.5, 4, 4.5].map(r => (
            <button
              key={`rating-${r}`}
              onClick={() => onMinRating(r)}
              className={`flex items-center gap-0.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${minRating === r ? 'bg-accent/20 text-accent font-semibold' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
            >
              {r === 0 ? 'Any' : <><Star size={10} fill="currentColor" />{r}+</>}
            </button>
          ))}
        </div>
      </div>

      {/* Reset */}
      <button
        onClick={() => {
          onPriceRange([0, 600]);
          onMarketplaces([]);
          onDeliveryFilter('any');
          onMinRating(0);
        }}
        className="w-full py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all duration-150"
      >
        Reset all filters
      </button>
    </div>
  );
}