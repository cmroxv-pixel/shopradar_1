'use client';
import React from 'react';
import Link from 'next/link';
import ModeToggle from './ModeToggle';

export default function Topbar() {
  return (
    <header className="topbar sticky top-0 z-40 w-full" style={{ position: 'relative', zIndex: 40 }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 16px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Logo */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none' }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 14px hsl(var(--primary) / 0.4)',
          }}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <circle cx="3.5" cy="6.5" r="2.2" fill="white" opacity="0.95"/>
              <circle cx="9.5" cy="3.5" r="1.6" fill="white" opacity="0.75"/>
              <circle cx="9.5" cy="9.5" r="1.6" fill="white" opacity="0.75"/>
              <line x1="5.7" y1="5.6" x2="7.9" y2="4.3" stroke="white" strokeWidth="0.9" opacity="0.5"/>
              <line x1="5.7" y1="7.4" x2="7.9" y2="8.7" stroke="white" strokeWidth="0.9" opacity="0.5"/>
            </svg>
          </div>
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 15, letterSpacing: '-0.01em', color: 'hsl(var(--foreground))' }}>
            ShopRadar
          </span>
        </Link>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ModeToggle />
          <button className="btn-primary" style={{ fontSize: 12, padding: '7px 16px' }}>
            Sign in
          </button>
        </div>
      </div>
    </header>
  );
}
