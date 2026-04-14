'use client';
import React, { useEffect, useState } from 'react';

export default function ModeToggle() {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    // Read saved preference, default to dark
    const saved = localStorage.getItem('shopradar-mode');
    const dark = saved !== 'light';
    setIsDark(dark);
    applyMode(dark);
  }, []);

  function applyMode(dark: boolean) {
    const html = document.documentElement;
    if (dark) {
      html.removeAttribute('data-mode');
    } else {
      html.setAttribute('data-mode', 'light');
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
        width: 36,
        height: 36,
        borderRadius: 10,
        border: '1px solid hsl(var(--border))',
        background: 'transparent',
        color: 'hsl(var(--muted-foreground))',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.15s',
        flexShrink: 0,
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLButtonElement;
        el.style.borderColor = 'hsl(var(--primary) / 0.4)';
        el.style.color = 'hsl(var(--primary))';
        el.style.background = 'hsl(var(--primary) / 0.08)';
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLButtonElement;
        el.style.borderColor = 'hsl(var(--border))';
        el.style.color = 'hsl(var(--muted-foreground))';
        el.style.background = 'transparent';
      }}
    >
      {isDark ? (
        // Sun icon
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.4"/>
          <path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3.05 3.05l1.06 1.06M11.89 11.89l1.06 1.06M3.05 12.95l1.06-1.06M11.89 4.11l1.06-1.06" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        </svg>
      ) : (
        // Moon icon
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
          <path d="M12.5 9.5A6 6 0 015.5 2.5a6 6 0 100 10 6 6 0 007-3z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
        </svg>
      )}
    </button>
  );
}
