'use client';
import React from 'react';
import Link from 'next/link';
import ModeToggle from './ModeToggle';

export default function Topbar() {
  return (
    <header className="topbar sticky top-0 z-40 w-full" style={{ position: 'relative', zIndex: 40 }}>
      <div style={{
        maxWidth: 1400, margin: '0 auto',
        padding: '0 24px', height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        {/* Logo */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <div style={{
            width: 30, height: 30, borderRadius: '50%',
            background: 'hsl(var(--primary))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 10px hsl(var(--primary) / 0.3)',
          }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="4" cy="7" r="2.5" fill="white" opacity="0.95"/>
              <circle cx="10" cy="4" r="1.8" fill="white" opacity="0.8"/>
              <circle cx="10" cy="10" r="1.8" fill="white" opacity="0.8"/>
              <line x1="6.4" y1="6.1" x2="8.3" y2="4.7" stroke="white" strokeWidth="1" opacity="0.6"/>
              <line x1="6.4" y1="7.9" x2="8.3" y2="9.3" stroke="white" strokeWidth="1" opacity="0.6"/>
            </svg>
          </div>
          <span style={{
            fontFamily: 'Inter, sans-serif', fontWeight: 700,
            fontSize: 15, letterSpacing: '-0.02em',
            color: 'hsl(var(--foreground))',
          }}>
            ShopRadar
          </span>
        </Link>

        {/* Right */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <ModeToggle />
          <button className="btn-primary" style={{ fontSize: 13, padding: '8px 18px' }}>
            Sign in
          </button>
        </div>
      </div>
    </header>
  );
}
