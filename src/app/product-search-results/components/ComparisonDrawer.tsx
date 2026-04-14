'use client';
import React from 'react';
import type { Listing } from './mockData';
import { X, Star, CheckCircle, XCircle } from 'lucide-react';

interface ComparisonDrawerProps {
  items: Listing[];
  onRemove: (id: string) => void;
  onClose: () => void;
}

const ROWS = [
  { label: 'Price', key: 'price' },
  { label: 'Original Price', key: 'originalPrice' },
  { label: 'Marketplace', key: 'marketplace' },
  { label: 'Seller', key: 'sellerName' },
  { label: 'Rating', key: 'sellerRating' },
  { label: 'Stock', key: 'stockStatus' },
  { label: 'Delivery', key: 'deliveryDate' },
  { label: 'Shipping', key: 'shippingTier' },
  { label: 'Shipping Cost', key: 'shippingCost' },
  { label: 'Condition', key: 'condition' },
  { label: 'Free Returns', key: 'freeReturns' },
];

export default function ComparisonDrawer({ items, onRemove, onClose }: ComparisonDrawerProps) {
  const cheapestPrice = Math.min(...items.map(i => i.price));

  const renderValue = (listing: Listing, key: string) => {
    switch (key) {
      case 'price':
        return (
          <span className={`font-mono tabular-nums font-bold text-base ${listing.price === cheapestPrice ? 'text-success' : 'text-foreground'}`}>
            ${listing.price.toFixed(2)}
            {listing.price === cheapestPrice && <span className="ml-1 text-xs">✓ Best</span>}
          </span>
        );
      case 'originalPrice':
        return <span className="font-mono tabular-nums text-muted-foreground line-through">${listing.originalPrice.toFixed(2)}</span>;
      case 'sellerRating':
        return (
          <div className="flex items-center gap-1">
            <Star size={12} fill="currentColor" className="text-accent" />
            <span>{listing.sellerRating}</span>
          </div>
        );
      case 'stockStatus':
        if (listing.stockStatus === 'In Stock') return <span className="text-success flex items-center gap-1"><CheckCircle size={12} /> In Stock</span>;
        if (listing.stockStatus === 'Out of Stock') return <span className="text-destructive flex items-center gap-1"><XCircle size={12} /> Out of Stock</span>;
        return <span className="text-warning">Low Stock</span>;
      case 'shippingCost':
        return <span>{listing.shippingCost === 0 ? 'Free' : `$${listing.shippingCost}`}</span>;
      case 'freeReturns':
        return listing.freeReturns ? <CheckCircle size={14} className="text-success" /> : <XCircle size={14} className="text-muted-foreground" />;
      default:
        return <span>{String((listing as Record<string, unknown>)[key] ?? '—')}</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-4xl bg-card rounded-t-2xl sm:rounded-2xl border border-border shadow-2xl max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h2 className="text-lg font-semibold text-foreground">Compare Listings ({items.length})</h2>
          <button onClick={onClose} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-150">
            <X size={18} />
          </button>
        </div>

        {/* Table */}
        <div className="overflow-auto flex-1">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide w-36">Attribute</th>
                {items.map(item => (
                  <th key={`compare-header-${item.id}`} className="px-4 py-3 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span className="font-semibold text-foreground">{item.marketplace}</span>
                      <button
                        onClick={() => onRemove(item.id)}
                        className="p-0.5 rounded text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row, ri) => (
                <tr key={`compare-row-${row.key}`} className={`border-b border-border ${ri % 2 === 0 ? 'bg-muted/10' : ''}`}>
                  <td className="px-6 py-3 text-xs font-medium text-muted-foreground">{row.label}</td>
                  {items.map(item => (
                    <td key={`compare-cell-${item.id}-${row.key}`} className="px-4 py-3 text-center text-sm text-foreground">
                      {renderValue(item, row.key)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* CTA row */}
        <div className="flex gap-3 px-6 py-4 border-t border-border bg-muted/10 shrink-0">
          {items.map(item => (
            <a
              key={`compare-cta-${item.id}`}
              href={item.listingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex-1 text-center py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 active:scale-95 ${item.price === cheapestPrice ? 'bg-primary text-white hover:opacity-90' : 'bg-muted text-foreground hover:bg-muted/80'}`}
            >
              {item.price === cheapestPrice ? '🏆 ' : ''}View on {item.marketplace}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}