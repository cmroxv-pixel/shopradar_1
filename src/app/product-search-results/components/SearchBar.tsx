'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, X, Clock, Trash2 } from 'lucide-react';

const HISTORY_KEY = 'shopradar_search_history';
const MAX_HISTORY = 10;

interface SearchQuery {
  name: string;
}

interface SearchBarProps {
  initialQuery: SearchQuery;
  onSearch: (q: SearchQuery) => void;
  loading: boolean;
  disabled?: boolean;
}

function loadHistory(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveHistory(history: string[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

export default function SearchBar({ initialQuery, onSearch, loading, disabled = false }: SearchBarProps) {
  const [query, setQuery] = useState<SearchQuery>(initialQuery);
  const [history, setHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowHistory(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.name.trim()) return;
    addToHistory(query.name.trim());
    onSearch(query);
    setShowHistory(false);
  };

  const addToHistory = (term: string) => {
    const updated = [term, ...history.filter(h => h.toLowerCase() !== term.toLowerCase())].slice(0, MAX_HISTORY);
    setHistory(updated);
    saveHistory(updated);
  };

  const removeHistoryItem = (item: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = history.filter(h => h !== item);
    setHistory(updated);
    saveHistory(updated);
  };

  const clearAllHistory = (e: React.MouseEvent) => {
    e.stopPropagation();
    setHistory([]);
    saveHistory([]);
  };

  const selectHistoryItem = (item: string) => {
    const q = { name: item };
    setQuery(q);
    setShowHistory(false);
    addToHistory(item);
    onSearch(q);
  };

  const filteredHistory = history.filter(h =>
    query.name ? h.toLowerCase().includes(query.name.toLowerCase()) : true
  );

  return (
    <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl p-4 shadow-sm">
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Product name */}
        <div className="flex-1 relative" ref={dropdownRef}>
          <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Product Name</label>
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              value={query.name}
              onChange={e => setQuery(q => ({ ...q, name: e.target.value }))}
              onFocus={() => !disabled && history.length > 0 && setShowHistory(true)}
              placeholder={disabled ? "Set your delivery address first..." : "e.g. Sony WH-1000XM5, iPhone 15 Pro, Samsung TV..."}
              disabled={disabled || loading}
              className="w-full pl-10 pr-9 py-3 bg-muted/40 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary focus:bg-card transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            {query.name && (
              <button type="button" onClick={() => setQuery(q => ({ ...q, name: '' }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                <X size={13} />
              </button>
            )}
          </div>

          {/* History dropdown */}
          {showHistory && filteredHistory.length > 0 && !disabled && (
            <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <Clock size={11} />
                  Recent Searches
                </span>
                <button
                  type="button"
                  onClick={clearAllHistory}
                  className="text-xs text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1"
                >
                  <Trash2 size={11} />
                  Clear all
                </button>
              </div>
              <ul className="max-h-52 overflow-y-auto">
                {filteredHistory.map((item, idx) => (
                  <li key={`sh-${idx}`}>
                    <button
                      type="button"
                      onClick={() => selectHistoryItem(item)}
                      className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-foreground hover:bg-muted/60 transition-colors text-left group"
                    >
                      <span className="flex items-center gap-2.5 min-w-0">
                        <Clock size={13} className="text-muted-foreground shrink-0" />
                        <span className="truncate">{item}</span>
                      </span>
                      <span
                        role="button"
                        onClick={(e) => removeHistoryItem(item, e)}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all ml-2 shrink-0 cursor-pointer"
                      >
                        <X size={12} />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex items-end">
          <button
            type="submit"
            disabled={loading || !query.name.trim() || disabled}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-3 bg-primary text-white rounded-xl text-sm font-semibold hover:opacity-90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 min-w-[130px] shadow-sm shadow-primary/20"
          >
            {loading ? (
              <><Loader2 size={15} className="animate-spin" /> Scanning...</>
            ) : (
              <><Search size={15} /> Search</>
            )}
          </button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border">
        Scanning <span className="font-semibold text-foreground">40+ marketplaces</span> including Amazon, eBay, Best Buy, Walmart, Currys, JB Hi-Fi, and boutique stores worldwide
      </p>
    </form>
  );
}