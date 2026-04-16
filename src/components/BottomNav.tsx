'use client';
import React, { useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

const NAV = [
  {
    href: '/product-search-results',
    label: 'Search',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <circle cx="10" cy="10" r="6" stroke="currentColor" strokeWidth="1.8"/>
        <path d="M15 15L19 19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    href: '/watchlist-price-alerts',
    label: 'Watchlist',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M12 21C12 21 3 14.5 3 8.5C3 5.42 5.42 3 8.5 3C10.24 3 11.91 3.81 13 5.08C14.09 3.81 15.76 3 17.5 3C20.58 3 23 5.42 23 8.5C23 14.5 14 21 12 21Z"
          stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"
          fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.15 : 0}
        />
      </svg>
    ),
  },
  {
    href: '/settings',
    label: 'Settings',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="1.8"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
          stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
];

function DockItem({
  href, label, icon, active, mouseX,
}: {
  href: string; label: string;
  icon: (active: boolean) => React.ReactNode;
  active: boolean; mouseX: any;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const distance = useTransform(mouseX, (val: number) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return val - bounds.x - bounds.width / 2;
  });

  const widthSync = useTransform(distance, [-120, 0, 120], [44, 68, 44]);
  const width = useSpring(widthSync, { mass: 0.1, stiffness: 180, damping: 14 });

  const scaleSync = useTransform(distance, [-120, 0, 120], [1, 1.55, 1]);
  const scale = useSpring(scaleSync, { mass: 0.1, stiffness: 180, damping: 14 });

  const ySync = useTransform(distance, [-120, 0, 120], [0, -10, 0]);
  const y = useSpring(ySync, { mass: 0.1, stiffness: 180, damping: 14 });

  return (
    <Link href={href} style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <motion.div ref={ref} style={{ width, y }} className="dock-item-wrapper">
        <motion.div
          style={{ scale }}
          className="dock-item"
          style={{
            width: '100%',
            aspectRatio: '1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 14,
            background: active ? 'hsl(var(--primary) / 0.12)' : 'hsl(var(--card))',
            border: `1.5px solid ${active ? 'hsl(var(--primary) / 0.3)' : 'hsl(var(--border))'}`,
            color: active ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
            boxShadow: active ? '0 4px 16px hsl(var(--primary) / 0.2)' : '0 2px 8px rgba(0,0,0,0.08)',
            cursor: 'pointer',
            transition: 'background 0.15s, border-color 0.15s, color 0.15s',
          }}
        >
          {icon(active)}
        </motion.div>
      </motion.div>
      <span style={{
        fontSize: 9,
        fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
        fontWeight: active ? 700 : 400,
        color: active ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
        letterSpacing: '-0.01em',
      }}>
        {label}
      </span>
    </Link>
  );
}

export default function BottomNav() {
  const pathname = usePathname();
  const mouseX = useMotionValue(Infinity);

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      zIndex: 40, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around',
      padding: '12px 24px 18px',
      background: 'hsl(var(--background) / 0.92)',
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      borderTop: '1px solid hsl(var(--border))',
      boxShadow: '0 -4px 24px rgba(0,0,0,0.08)',
    }}
      onMouseMove={e => mouseX.set(e.pageX)}
      onMouseLeave={() => mouseX.set(Infinity)}
    >
      {NAV.map(({ href, label, icon }) => {
        const active = pathname === href || pathname.startsWith(href);
        return (
          <DockItem
            key={href}
            href={href}
            label={label}
            icon={icon}
            active={active}
            mouseX={mouseX}
          />
        );
      })}
    </nav>
  );
}
