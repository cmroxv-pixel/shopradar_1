'use client';
import React, { useEffect, useState } from 'react';

export default function ModeToggle() {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('shopradar-mode');
    const dark = saved === 'dark';
    setIsDark(dark);
    applyMode(dark);
  }, []);

  function applyMode(dark: boolean) {
    if (dark) {
      document.documentElement.setAttribute('data-mode', 'dark');
    } else {
      document.documentElement.removeAttribute('data-mode');
    }
  }

  function toggle() {
    const next = !isDark;
    setIsDark(next);
    applyMode(next);
    localStorage.setItem('shopradar-mode', next ? 'dark' : 'light');
  }

  return (
    <button
      onClick={toggle}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      style={{
        width: 34, height: 34, borderRadius: '50%',
        border: '1.5px solid hsl(var(--border))',
        background: 'hsl(var(--card))',
        color: 'hsl(var(--muted-foreground))',
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.15s',
        flexShrink: 0,
        opacity: mounted ? 1 : 0,
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLButtonElement;
        el.style.borderColor = 'hsl(var(--primary))';
        el.style.color = 'hsl(var(--primary))';
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLButtonElement;
        el.style.borderColor = 'hsl(var(--border))';
        el.style.color = 'hsl(var(--muted-foreground))';
      }}
    >
      {/* Sun icon — shown in dark mode to switch to light */}
      {isDark ? (
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
          <circle cx="7.5" cy="7.5" r="2.8" stroke="currentColor" strokeWidth="1.4"/>
          <path d="M7.5 1.5v1.2M7.5 12.3v1.2M1.5 7.5h1.2M12.3 7.5h1.2M3.4 3.4l.85.85M10.75 10.75l.85.85M3.4 11.6l.85-.85M10.75 4.25l.85-.85"
            stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        </svg>
      ) : (
        /* Moon icon — shown in light mode to switch to dark */
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M11.5 8.5A5 5 0 015 2a5 5 0 100 10 5 5 0 006.5-3.5z"
            stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
        </svg>
      )}
    </button>
  );
}
