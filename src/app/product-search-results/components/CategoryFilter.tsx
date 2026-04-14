'use client';
import React from 'react';

const CATEGORIES = [
  { id: 'all', label: 'All', emoji: '🔍' },
  { id: 'electronics', label: 'Electronics', emoji: '💻' },
  { id: 'audio', label: 'Audio', emoji: '🎧' },
  { id: 'phones', label: 'Phones', emoji: '📱' },
  { id: 'gaming', label: 'Gaming', emoji: '🎮' },
  { id: 'appliances', label: 'Appliances', emoji: '🏠' },
  { id: 'clothing', label: 'Clothing', emoji: '👕' },
  { id: 'toys', label: 'Toys', emoji: '🧸' },
  { id: 'sports', label: 'Sports', emoji: '⚽' },
  { id: 'books', label: 'Books', emoji: '📚' },
];

interface CategoryFilterProps {
  selected: string;
  onSelect: (category: string) => void;
}

export default function CategoryFilter({ selected, onSelect }: CategoryFilterProps) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
      {CATEGORIES.map(cat => (
        <button
          key={cat.id}
          onClick={() => onSelect(cat.id)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-150 shrink-0 ${
            selected === cat.id
              ? 'bg-primary text-white shadow-sm shadow-primary/20'
              : 'bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-muted'
          }`}
        >
          <span>{cat.emoji}</span>
          <span>{cat.label}</span>
        </button>
      ))}
    </div>
  );
}
