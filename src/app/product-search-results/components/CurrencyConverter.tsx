'use client';
import React, { useState, useEffect } from 'react';
import { DollarSign, ChevronDown } from 'lucide-react';

const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar' },
  { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc' },
];

// Static approximate exchange rates from USD
const RATES: Record<string, number> = {
  USD: 1, EUR: 0.92, GBP: 0.79, AUD: 1.53, CAD: 1.36,
  JPY: 149.5, INR: 83.2, SGD: 1.34, NZD: 1.63, CHF: 0.90,
};

interface CurrencyConverterProps {
  onCurrencyChange: (currency: string, rate: number) => void;
  selectedCurrency: string;
}

export default function CurrencyConverter({ onCurrencyChange, selectedCurrency }: CurrencyConverterProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = (code: string) => {
    onCurrencyChange(code, RATES[code] || 1);
    setOpen(false);
  };

  const selected = CURRENCIES.find(c => c.code === selectedCurrency) || CURRENCIES[0];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border border-border bg-card text-foreground hover:bg-muted hover:border-primary/30 transition-all duration-200"
      >
        <DollarSign size={13} className="text-primary" />
        <span>{selected.symbol} {selected.code}</span>
        <ChevronDown size={12} className={`text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1.5 w-52 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
            <div className="px-3 py-2 border-b border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Display Currency</p>
            </div>
            <div className="max-h-64 overflow-y-auto py-1">
              {CURRENCIES.map(c => (
                <button
                  key={c.code}
                  onClick={() => handleSelect(c.code)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors ${selectedCurrency === c.code ? 'bg-primary/10 text-primary font-semibold' : 'text-foreground hover:bg-muted'}`}
                >
                  <span>{c.symbol} {c.name}</span>
                  <span className="text-xs text-muted-foreground font-mono">{c.code}</span>
                </button>
              ))}
            </div>
            <div className="px-3 py-2 border-t border-border">
              <p className="text-[10px] text-muted-foreground">Rates are approximate</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
