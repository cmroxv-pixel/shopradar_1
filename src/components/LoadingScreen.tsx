'use client';

import React, { useEffect, useState } from 'react';

function Shimmer({ width = '100%', height = 16, radius = 8, style = {} }: {
  width?: string | number; height?: number; radius?: number; style?: React.CSSProperties;
}) {
  return (
    <div style={{
      width, height, borderRadius: radius,
      background: 'hsl(var(--muted))',
      animation: 'shimmer 1.5s ease-in-out infinite',
      ...style,
    }} />
  );
}

export default function LoadingScreen() {
  const [visible, setVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFadeOut(true), 1200);
    const hideTimer = setTimeout(() => setVisible(false), 1600);
    return () => { clearTimeout(fadeTimer); clearTimeout(hideTimer); };
  }, []);

  if (!visible) return null;

  return (
    <>
      <style>{`
        @keyframes shimmer {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
      `}</style>
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'hsl(var(--background))',
          opacity: fadeOut ? 0 : 1,
          transition: 'opacity 0.4s ease',
          display: 'flex', flexDirection: 'column',
          fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
        }}
      >
        {/* Topbar skeleton */}
        <div style={{ height: 56, borderBottom: '1px solid hsl(var(--border))', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Shimmer width={28} height={28} radius={8} />
            <Shimmer width={90} height={14} radius={6} />
          </div>
          <div style={{ display: 'flex', gap: 20 }}>
            <Shimmer width={50} height={12} radius={6} />
            <Shimmer width={50} height={12} radius={6} />
          </div>
          <Shimmer width={32} height={32} radius={16} />
        </div>

        {/* Hero skeleton */}
        <div style={{ maxWidth: 1100, margin: '0 auto', width: '100%', padding: '60px 24px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <Shimmer width={200} height={16} radius={100} />
          <Shimmer width="70%" height={52} radius={10} />
          <Shimmer width="50%" height={52} radius={10} />
          <Shimmer width={340} height={14} radius={6} />
          <Shimmer width={340} height={14} radius={6} />
          <Shimmer width={160} height={44} radius={100} style={{ marginTop: 8 }} />
        </div>

        {/* Stats row skeleton */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 48, padding: '0 24px 40px' }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <Shimmer width={60} height={28} radius={6} />
              <Shimmer width={80} height={12} radius={6} />
            </div>
          ))}
        </div>

        {/* Search area skeleton */}
        <div style={{ maxWidth: 900, margin: '0 auto', width: '100%', padding: '0 24px' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' as const }}>
            {[1, 2, 3, 4, 5].map(i => <Shimmer key={i} width={80} height={32} radius={100} />)}
          </div>
          <Shimmer width="100%" height={52} radius={100} style={{ marginBottom: 10 }} />
          <Shimmer width="100%" height={52} radius={14} />
        </div>
      </div>
    </>
  );
}
