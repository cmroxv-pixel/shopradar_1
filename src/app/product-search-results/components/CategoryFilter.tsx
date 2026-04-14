'use client';
import React from 'react';

const CATEGORIES = [
  {
    id: 'all', label: 'All',
    icon: <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.4"/><path d="M9.5 9.5L12 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
  },
  {
    id: 'electronics', label: 'Electronics',
    icon: <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><rect x="1" y="2.5" width="11" height="7" rx="1.2" stroke="currentColor" strokeWidth="1.3"/><path d="M4 11.5h5M6.5 9.5v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>,
  },
  {
    id: 'audio', label: 'Audio',
    icon: <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><circle cx="3.5" cy="9" r="2" stroke="currentColor" strokeWidth="1.3"/><circle cx="9.5" cy="7.5" r="2" stroke="currentColor" strokeWidth="1.3"/><path d="M5.5 9V4l6-1.5v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  },
  {
    id: 'phones', label: 'Phones',
    icon: <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><rect x="3.5" y="1" width="6" height="11" rx="1.3" stroke="currentColor" strokeWidth="1.3"/><circle cx="6.5" cy="10" r="0.6" fill="currentColor"/><path d="M5.5 2.5h2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>,
  },
  {
    id: 'gaming', label: 'Gaming',
    icon: <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><rect x="1" y="4" width="11" height="6" rx="2" stroke="currentColor" strokeWidth="1.3"/><path d="M4.5 7h2M5.5 6v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/><circle cx="8.5" cy="7" r="0.7" fill="currentColor"/></svg>,
  },
  {
    id: 'appliances', label: 'Appliances',
    icon: <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><rect x="2" y="1.5" width="9" height="10" rx="1.2" stroke="currentColor" strokeWidth="1.3"/><path d="M2 5h9" stroke="currentColor" strokeWidth="1.3"/><circle cx="9.5" cy="3.2" r="0.7" fill="currentColor"/></svg>,
  },
  {
    id: 'clothing', label: 'Clothing',
    icon: <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M4.5 1.5L1 4l1.5 1.5L4 4.5V12h5V4.5l1.5 1L12 4 8.5 1.5C8 2.5 7 3 6.5 3S5 2.5 4.5 1.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg>,
  },
  {
    id: 'toys', label: 'Toys',
    icon: <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.3"/><path d="M4 6.5h5M6.5 4v5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>,
  },
  {
    id: 'sports', label: 'Sports',
    icon: <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.3"/><path d="M2 6.5h9M6.5 2c-1 1.5-1 5 0 9M6.5 2c1 1.5 1 5 0 9" stroke="currentColor" strokeWidth="1.1"/></svg>,
  },
  {
    id: 'books', label: 'Books',
    icon: <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><rect x="2" y="1.5" width="7" height="10" rx="1" stroke="currentColor" strokeWidth="1.3"/><path d="M5 1.5V11.5M9 3.5l2 .5v7l-2-.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>,
  },
];

interface CategoryFilterProps {
  selected: string;
  onSelect: (category: string) => void;
}

export default function CategoryFilter({ selected, onSelect }: CategoryFilterProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
      {CATEGORIES.map(cat => (
        <button
          key={cat.id}
          onClick={() => onSelect(cat.id)}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '6px 13px', borderRadius: 100,
            fontSize: 12, fontFamily: 'Inter, sans-serif', fontWeight: selected === cat.id ? 600 : 400,
            whiteSpace: 'nowrap', flexShrink: 0, cursor: 'pointer',
            border: '1.5px solid',
            borderColor: selected === cat.id ? 'hsl(var(--primary))' : 'hsl(var(--border))',
            background: selected === cat.id ? 'hsl(var(--primary))' : 'hsl(var(--card))',
            color: selected === cat.id ? 'white' : 'hsl(var(--muted-foreground))',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => {
            if (cat.id !== selected) {
              (e.currentTarget as HTMLElement).style.borderColor = 'hsl(var(--primary) / 0.4)';
              (e.currentTarget as HTMLElement).style.color = 'hsl(var(--foreground))';
            }
          }}
          onMouseLeave={e => {
            if (cat.id !== selected) {
              (e.currentTarget as HTMLElement).style.borderColor = 'hsl(var(--border))';
              (e.currentTarget as HTMLElement).style.color = 'hsl(var(--muted-foreground))';
            }
          }}
        >
          {cat.icon}
          {cat.label}
        </button>
      ))}
    </div>
  );
}
