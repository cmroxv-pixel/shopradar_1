'use client';
import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import ModeToggle from './ModeToggle';
import { useAuth } from '@/contexts/AuthContext';

const ADMIN_ID = '2c8fdd0b-b3b6-4216-a541-1cf40490658a';

const IconHeart = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <path d="M12 21C12 21 3 14.5 3 8.5C3 5.42 5.42 3 8.5 3C10.24 3 11.91 3.81 13 5.08C14.09 3.81 15.76 3 17.5 3C20.58 3 23 5.42 23 8.5C23 14.5 14 21 12 21Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/>
  </svg>
);

const IconGear = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconAdmin = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconSignOut = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

function NavLink({ href, icon, label, onClick, color }: { href: string; icon: React.ReactNode; label: React.ReactNode; onClick: () => void; color?: string }) {
  return (
    <Link href={href} onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 16px', color: color || 'hsl(var(--foreground))', textDecoration: 'none', fontSize: 13, transition: 'background 0.1s' }}
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = color ? `hsl(var(--primary) / 0.06)` : 'hsl(var(--muted))'}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'none'}
    >
      <span style={{ color: color || 'hsl(var(--muted-foreground))' }}>{icon}</span>
      {label}
    </Link>
  );
}

function UserAvatar() {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  if (!user) return null;

  const name: string = user.user_metadata?.full_name || user.email || '';
  const initial = name.charAt(0).toUpperCase();
  const email: string = user.email || '';
  const isAdmin = user.id === ADMIN_ID;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Avatar button */}
      <button
        onClick={() => setOpen(o => !o)}
        title={email}
        style={{
          width: 34, height: 34, borderRadius: '50%',
          background: 'hsl(var(--primary))',
          color: 'white', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
          fontWeight: 700, fontSize: 14,
          boxShadow: '0 2px 10px hsl(var(--primary) / 0.35)',
          transition: 'transform 0.15s, box-shadow 0.15s',
          flexShrink: 0, position: 'relative',
        }}
        onMouseEnter={e => { const el = e.currentTarget as HTMLButtonElement; el.style.transform = 'scale(1.08)'; el.style.boxShadow = '0 4px 16px hsl(var(--primary) / 0.45)'; }}
        onMouseLeave={e => { const el = e.currentTarget as HTMLButtonElement; el.style.transform = 'scale(1)'; el.style.boxShadow = '0 2px 10px hsl(var(--primary) / 0.35)'; }}
      >
        {initial}
        {/* Admin green dot */}
        {isAdmin && (
          <span style={{ position: 'absolute', bottom: 0, right: 0, width: 9, height: 9, borderRadius: '50%', background: 'hsl(var(--success))', border: '1.5px solid hsl(var(--background))', boxShadow: '0 0 6px hsl(var(--success))' }} />
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 10px)', right: 0,
          background: 'hsl(var(--card))', border: '1.5px solid hsl(var(--border))',
          borderRadius: 14, overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          minWidth: 210, zIndex: 100,
          animation: 'heroFadeUp 0.2s ease both',
        }}>
          {/* User info header */}
          <div style={{ padding: '14px 16px', borderBottom: '1px solid hsl(var(--border))' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'hsl(var(--primary))', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, flexShrink: 0 }}>
                {initial}
              </div>
              <div style={{ overflow: 'hidden', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {user.user_metadata?.full_name && (
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--foreground))', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {user.user_metadata.full_name}
                    </p>
                  )}
                  {isAdmin && (
                    <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 4, background: 'hsl(var(--primary))', color: 'white', fontWeight: 700, flexShrink: 0 }}>ADMIN</span>
                  )}
                </div>
                <p style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {email}
                </p>
              </div>
            </div>
          </div>

          {/* Nav links */}
          <div style={{ padding: '6px 0' }}>
            <NavLink href="/watchlist-price-alerts" icon={<IconHeart />} label="Watchlist" onClick={() => setOpen(false)} />
            <NavLink href="/settings" icon={<IconGear />} label="Settings" onClick={() => setOpen(false)} />

            {/* Admin only */}
            {isAdmin && (
              <NavLink
                href="/admin"
                icon={<IconAdmin />}
                label={
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    Admin Panel
                    <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 4, background: 'hsl(var(--primary))', color: 'white', fontWeight: 700 }}>ONLY YOU</span>
                  </span>
                }
                onClick={() => setOpen(false)}
                color="hsl(var(--primary))"
              />
            )}

            {/* Sign out */}
            <div style={{ borderTop: '1px solid hsl(var(--border))', marginTop: 4, paddingTop: 4 }}>
              <button
                onClick={async () => { setOpen(false); await signOut(); }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 16px', background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--destructive))', fontSize: 13, textAlign: 'left', transition: 'background 0.1s' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'hsl(var(--destructive) / 0.06)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'none'}
              >
                <IconSignOut />
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Topbar() {
  const { user, loading } = useAuth();

  return (
    <header className="topbar sticky top-0 z-40 w-full">
      <div style={{
        maxWidth: 1400, margin: '0 auto',
        padding: '0 24px', height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Link href="/product-search-results" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <Image src="/logo.webp" alt="ShopRadar" width={32} height={32} style={{ borderRadius: 8 }} />
          <span style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontWeight: 700, fontSize: 15, letterSpacing: '-0.02em', color: 'hsl(var(--foreground))' }}>
            ShopRadar
          </span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <ModeToggle />
          {!loading && (
            user
              ? <UserAvatar />
              : (
                <Link href="/sign-up-login" style={{ textDecoration: 'none' }}>
                  <button className="btn-primary" style={{ fontSize: 13, padding: '8px 18px' }}>
                    Sign in
                  </button>
                </Link>
              )
          )}
        </div>
      </div>
    </header>
  );
}
