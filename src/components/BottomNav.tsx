'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  {
    href: '/product-search-results',
    label: 'Search',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M12.5 12.5L16 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    href: '/watchlist',
    label: 'Watchlist',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M9 15S2 10.5 2 6a4 4 0 0 1 7-2.65A4 4 0 0 1 16 6c0 4.5-7 9-7 9z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    href: '/settings',
    label: 'Settings',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <circle cx="9" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M9 1v2M9 15v2M1 9h2M15 9h2M3.22 3.22l1.42 1.42M13.36 13.36l1.42 1.42M3.22 14.78l1.42-1.42M13.36 4.64l1.42-1.42" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="bottom-nav fixed bottom-0 left-0 right-0 z-40">
      <div className="max-w-lg mx-auto px-4 h-16 flex items-center justify-around">
        {NAV.map(({ href, label, icon }) => {
          const active = pathname === href || pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-1 px-4 py-1 rounded-xl transition-all duration-150"
              style={{
                color: active ? 'var(--primary)' : 'var(--text-muted)',
                filter: active ? 'drop-shadow(0 0 6px var(--primary))' : 'none',
              }}
            >
              {icon}
              <span style={{ fontSize: 10, fontFamily: 'DM Sans, sans-serif', fontWeight: active ? 600 : 400 }}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
