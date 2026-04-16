'use client';
import React, { useState } from 'react';
import type { WatchlistItem } from './watchlistData';
import WatchlistSparkline from './WatchlistSparkline';
import PriceHistoryChart from './PriceHistoryChart';
import AppImage from '@/components/ui/AppImage';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Trash2, Bell, ExternalLink, Store, CheckCircle, AlertTriangle, XCircle, Clock, BarChart2 } from 'lucide-react';

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

const DEMO_PRODUCTS = [
  { name: 'Sony WH-1000XM5', price: 'A$279', store: 'Amazon', img: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=120&h=120&fit=crop', badge: '\u2193 18%', delay: 0 },
  { name: 'iPhone 15 Pro', price: 'A$1,499', store: 'JB Hi-Fi', img: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=120&h=120&fit=crop', badge: '\u2605 Best', delay: 0.15 },
  { name: 'Samsung 4K TV', price: 'A$899', store: 'Harvey Norman', img: 'https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=120&h=120&fit=crop', badge: '\u2193 12%', delay: 0.3 },
];

function EmptyProductCard({ product }: { product: typeof DEMO_PRODUCTS[0] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: product.delay, duration: 0.5, ease: 'easeOut' }}
      style={{ background: 'hsl(var(--card))', border: '1.5px solid hsl(var(--border))', borderRadius: 16, overflow: 'hidden', width: 130, flexShrink: 0 }}
    >
      <div style={{ position: 'relative', height: 90, overflow: 'hidden' }}>
        <img src={product.img} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <motion.div
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 2, repeat: Infinity, delay: product.delay + 1 }}
          style={{ position: 'absolute', top: 6, right: 6, background: 'hsl(var(--success))', color: 'white', fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 6 }}
        >
          {product.badge}
        </motion.div>
      </div>
      <div style={{ padding: '8px 10px' }}>
        <p style={{ fontSize: 10, fontWeight: 600, color: 'hsl(var(--foreground))', margin: 0, lineHeight: 1.3 }}>{product.name}</p>
        <p style={{ fontSize: 9, color: 'hsl(var(--muted-foreground))', margin: '2px 0 4px' }}>{product.store}</p>
        <p style={{ fontSize: 13, fontWeight: 800, color: 'hsl(var(--foreground))', margin: 0 }}>{product.price}</p>
      </div>
    </motion.div>
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
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: '48px 24px', textAlign: 'center',
        background: 'hsl(var(--card) / 0.6)',
        border: '1.5px solid hsl(var(--border))',
        borderRadius: 20,
      }}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 32, justifyContent: 'center' }}>
          {DEMO_PRODUCTS.map((p, i) => <EmptyProductCard key={i} product={p} />)}
        </div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.4 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: 'hsl(var(--foreground))', margin: '0 0 8px' }}>
            Your watchlist is empty
          </h3>
          <p style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))', margin: '0 0 20px', maxWidth: 280, lineHeight: 1.6 }}>
            Search for any product and tap the bookmark icon to start tracking its price
          </p>
          <Link
            href="/product-search-results"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 22px', borderRadius: 100, background: 'hsl(var(--primary))', color: 'white', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}
          >
            Search products
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <input type="checkbox" checked={selected.length === items.length && items.length > 0} onChange={toggleAll} className="w-4 h-4 rounded border-border accent-primary" />
        <span className="text-xs text-muted-foreground">Select all ({items.length})</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-2 gap-3">
        {items.map(item => {
          const savings = item.originalPrice - item.currentBestPrice;
          const savingsPct = Math.round((savings / item.originalPrice) * 100);
          const isSelected = selected.includes(item.id);
          const isChartExpanded = expandedChart === item.id;

          return (
            <div key={item.id} className={`bg-card border rounded-xl shadow-sm transition-all duration-200 hover:shadow-md ${isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/30'} ${item.stockStatus === 'Out of Stock' ? 'opacity-70' : ''}`}>
              <div className="p-4">
                <div className="flex gap-3">
                  <div className="flex items-start pt-1">
                    <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(item.id)} className="w-4 h-4 rounded border-border accent-primary" />
                  </div>
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted shrink-0">
                    <AppImage src={item.imageUrl} alt={`${item.productName} in ${item.color}`} width={64} height={64} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-semibold text-foreground truncate">{item.productName}</h3>
                        <p className="text-xs text-muted-foreground">{item.model} {item.color ? `· ${item.color}` : ''}</p>
                      </div>
                      <button onClick={() => onRemove(item.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-150 shrink-0" title="Remove from watchlist">
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

                <div className="mt-3 flex items-center justify-between">
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-foreground tabular-nums font-mono">${item.currentBestPrice.toFixed(2)}</span>
                      <span className="text-sm text-muted-foreground line-through tabular-nums">${item.originalPrice.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-semibold text-success">-{savingsPct}% off RRP</span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Store size={10} /> {item.marketplaceCount} stores · Best: {item.bestMarketplace}
                      </span>
                    </div>
                  </div>
                  {!isChartExpanded && (
                    <div className="w-28 shrink-0">
                      <WatchlistSparkline data={item.priceHistory} currency={item.currency} />
                    </div>
                  )}
                </div>

                <div className="mt-3 pt-3 border-t border-border">
                  <button onClick={() => setExpandedChart(isChartExpanded ? null : item.id)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors font-medium">
                    <BarChart2 size={12} />
                    {isChartExpanded ? 'Hide price history' : 'View price history'}
                  </button>
                  {isChartExpanded && (
                    <div className="mt-3">
                      <PriceHistoryChart data={item.priceHistory} currency={item.currency} productName={item.productName} />
                    </div>
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock size={10} />
                    <span>Checked {item.lastChecked}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {!item.hasAlert && (
                      <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-border text-muted-foreground hover:text-accent hover:border-accent/40 hover:bg-accent/5 transition-all duration-150">
                        <Bell size={11} /> Set alert
                      </button>
                    )}
                    <Link href="/product-search-results" className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-primary text-white hover:opacity-90 active:scale-95 transition-all duration-150">
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
