'use client';
import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import ModeToggle from './ModeToggle';

export default function Topbar() {
  return (
    <header className="topbar sticky top-0 z-40 w-full">
      <div style={{
        maxWidth: 1400, margin: '0 auto',
        padding: '0 24px', height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        {/* Logo */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <Image
            src="/logo.webp"
            alt="ShopRadar"
            width={32}
            height={32}
            style={{ borderRadius: 8 }}
          />
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
