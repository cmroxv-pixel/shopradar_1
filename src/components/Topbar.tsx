'use client';
import React from 'react';
import Link from 'next/link';

export default function Topbar() {
  return (
    <header className="topbar sticky top-0 z-40 w-full">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center shadow-lg shadow-[var(--primary-glow)]">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="4" cy="7" r="2.5" fill="white" opacity="0.9"/>
              <circle cx="10" cy="4" r="1.8" fill="white" opacity="0.7"/>
              <circle cx="10" cy="10" r="1.8" fill="white" opacity="0.7"/>
              <line x1="6.5" y1="6" x2="8.5" y2="4.8" stroke="white" strokeWidth="1" opacity="0.5"/>
              <line x1="6.5" y1="8" x2="8.5" y2="9.2" stroke="white" strokeWidth="1" opacity="0.5"/>
            </svg>
          </div>
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 16, letterSpacing: '-0.01em' }}
            className="text-white">
            ShopRadar
          </span>
        </Link>

        {/* Right */}
        <button className="btn-primary text-xs px-4 py-2">
          Sign in
        </button>
      </div>
    </header>
  );
}
