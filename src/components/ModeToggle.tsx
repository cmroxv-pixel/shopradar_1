'use client';
import React, { useEffect, useState } from 'react';

export default function ModeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('shopradar-mode');
    const dark = saved === 'dark';
    setIsDark(dark);
    applyMode(dark);
  }, []);

  function applyMode(dark: boolean) {
    const html = document.documentElement;
    if (dark) {
      html.setAttribute('data-mode', 'dark');
    } else {
      html.removeAttribute('data-mode');
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
      {isDark ? (
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
          <circle cx="7.5" cy="7.5" r="2.8" stroke="currentColor" strokeWidth="1.4"/>
          <path d="M7.5 1v1.2M7.5 12.8V14M1 7.5h1.2M12.8 7.5H14M3.1 3.1l.85.85M11.05 11.05l.85.85M3.1 11.9l.85-.85M11.05 3.95l.85-.85" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M12 8.5A5.5 5.5 0 015.5 2a5.5 5.5 0 100 10A5.5 5.5 0 0012 8.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
        </svg>
      )}
    </button>
  );
}
