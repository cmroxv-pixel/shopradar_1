import React from 'react';
import Topbar from './Topbar';
import BottomNav from './BottomNav';
import PWAInstallPrompt from './PWAInstallPrompt';
import DotCanvas from './DotCanvas';
import dynamic from 'next/dynamic';

const Dither = dynamic(() => import('./Dither'), { ssr: false });

interface AppLayoutProps {
  children: React.ReactNode;
  isLoggedIn?: boolean;
  dotVariant?: 'search' | 'watchlist' | 'settings' | 'auth';
  useDither?: boolean;
}

export default function AppLayout({ children, dotVariant, useDither }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col" style={{ position: 'relative' }}>

      {/* Dither wave background — search page only */}
      {useDither && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 0, opacity: 0.18, pointerEvents: 'none' }}>
          <Dither
            waveColor={[0.1, 0.4, 1.0]}
            waveSpeed={0.04}
            waveFrequency={2.5}
            waveAmplitude={0.35}
            colorNum={4}
            pixelSize={3}
            enableMouseInteraction={true}
            mouseRadius={0.8}
          />
        </div>
      )}

      {/* Dot canvas for other pages */}
      {dotVariant && !useDither && <DotCanvas variant={dotVariant} />}

      <Topbar />
      <main className="flex-1 w-full pb-20" style={{ position: 'relative', zIndex: 1 }}>
        {children}
      </main>
      <BottomNav />
      <PWAInstallPrompt />
    </div>
  );
}
