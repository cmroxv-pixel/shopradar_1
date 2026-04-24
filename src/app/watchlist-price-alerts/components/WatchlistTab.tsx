'use client';
import React, { useState } from 'react';
import type { WatchlistItem } from './watchlistData';
import WatchlistSparkline from './WatchlistSparkline';
import PriceHistoryChart from './PriceHistoryChart';
import AppImage from '@/components/ui/AppImage';
import Link from 'next/link';
import { Trash2, Bell, ExternalLink, Store, CheckCircle, AlertTriangle, XCircle, Clock, Bookmark, BarChart2 } from 'lucide-react';

interface WatchlistTabProps {
  items: WatchlistItem[];
  selected: string[];
  onSelect: (ids: string[]) => void;
  onRemove: (id: string) => void;
}

function StockPill({ status }: { status: WatchlistItem['stockStatus'] }) {
  if (status === 'In Stock') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success">
      <CheckCircle size={9} /> In Stock
    </span>
  );
  if (status === 'Low Stock') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-warning/10 text-warning">
      <AlertTriangle size={9} /> Low Stock
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-destructive/10 text-destructive">
      <XCircle size={9} /> Out of Stock
    </span>
  );
}

export default function WatchlistTab({ items, selected, onSelect, onRemove }: WatchlistTabProps) {
  const [expandedChart, setExpandedChart] = useState<string | null>(null);

  const toggleSelect = (id: string) => {
    onSelect(selected.includes(id) ? selected.filter(s => s !== id) : [...selected, id]);
  };

  const toggleAll = () => {
    onSelect(selected.length === items.length ? [] : items.map(i => i.id));
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center bg-card border border-border rounded-2xl">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Bookmark size={28} className="text-primary" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">Your watchlist is empty</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-xs">
          Search for any product and tap the bookmark icon to start tracking its price
        </p>
        <Link
          href="/product-search-results"
          className="mt-4 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 active:scale-95 transition-all duration-150"
        >
          Search products
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Select all row */}
      <div className="flex items-center gap-2 px-1">
        <input
          type="checkbox"
          checked={selected.length === items.length && items.length > 0}
          onChange={toggleAll}
          className="w-4 h-4 rounded border-border accent-primary"
        />
        <span className="text-xs text-muted-foreground">Select all ({items.length})</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-2 gap-3">
        {items.map(item => {
          const savings = item.originalPrice - item.currentBestPrice;
          const savingsPct = Math.round((savings / item.originalPrice) * 100);
          const isSelected = selected.includes(item.id);
          const isChartExpanded = expandedChart === item.id;

          return (
            <div
              key={item.id}
              className={`bg-card border rounded-xl shadow-sm transition-all duration-200 hover:shadow-md ${isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/30'} ${item.stockStatus === 'Out of Stock' ? 'opacity-70' : ''}`}
            >
              <div className="p-4">
                <div className="flex gap-3">
                  {/* Checkbox */}
                  <div className="flex items-start pt-1">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(item.id)}
                      className="w-4 h-4 rounded border-border accent-primary"
                    />
                  </div>

                  {/* Image */}
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted shrink-0">
                    <AppImage
                      src={item.imageUrl}
                      alt={`${item.productName} in ${item.color}`}
                      width={64}
                      height={64}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-semibold text-foreground truncate">{item.productName}</h3>
                        <p className="text-xs text-muted-foreground">{item.model} · {item.color}</p>
                      </div>
                      <button
                        onClick={() => onRemove(item.id)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-150 shrink-0"
                        title="Remove from watchlist"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <StockPill status={item.stockStatus} />
                      {item.hasAlert && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-accent/10 text-accent">
                          <Bell size={9} /> Alert set
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Price row */}
                <div className="mt-3 flex items-center justify-between">
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-foreground tabular-nums font-mono">
                        ${item.currentBestPrice.toFixed(2)}
                      </span>
                      <span className="text-sm text-muted-foreground line-through tabular-nums">
                        ${item.originalPrice.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-semibold text-success">−{savingsPct}% off RRP</span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Store size={10} /> {item.marketplaceCount} stores · Best: {item.bestMarketplace}
                      </span>
                    </div>
                  </div>

                  {/* Sparkline (collapsed) or chart toggle */}
                  {!isChartExpanded && (
                    <div className="w-28 shrink-0">
                      <WatchlistSparkline data={item.priceHistory} currency={item.currency} />
                    </div>
                  )}
                </div>

                {/* Price history chart toggle */}
                <div className="mt-3 pt-3 border-t border-border">
                  <button
                    onClick={() => setExpandedChart(isChartExpanded ? null : item.id)}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors font-medium"
                  >
                    <BarChart2 size={12} />
                    {isChartExpanded ? 'Hide price history' : 'View price history'}
                  </button>

                  {isChartExpanded && (
                    <div className="mt-3">
                      <PriceHistoryChart data={item.priceHistory} currency={item.currency} productName={item.productName} />
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="mt-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock size={10} />
                    <span>Checked {item.lastChecked}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {!item.hasAlert && (
                      <button
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-border text-muted-foreground hover:text-accent hover:border-accent/40 hover:bg-accent/5 transition-all duration-150"
                        title="Set price alert"
                      >
                        <Bell size={11} /> Set alert
                      </button>
                    )}
                    <Link
                      href="/product-search-results"
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 active:scale-95 transition-all duration-150"
                    >
                      <ExternalLink size={11} /> Compare prices
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
