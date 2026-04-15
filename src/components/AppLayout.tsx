import React from 'react';
import Topbar from './Topbar';
import BottomNav from './BottomNav';
import PWAInstallPrompt from './PWAInstallPrompt';
import DotCanvas from './DotCanvas';
import DitherBackground from './DitherBackground';

interface AppLayoutProps {
  children: React.ReactNode;
  isLoggedIn?: boolean;
  dotVariant?: 'search' | 'watchlist' | 'settings' | 'auth';
  useDither?: boolean;
}

export default function AppLayout({ children, dotVariant, useDither }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col" style={{ position: 'relative', overflowX: 'hidden', width: '100%' }}>
      {useDither && <DitherBackground />}
      {dotVariant && !useDither && <DotCanvas variant={dotVariant} />}
      <Topbar />
      <main className="flex-1 w-full pb-20" style={{ position: 'relative', zIndex: 1, paddingTop: '56px' }}>
        {children}
      </main>
      <BottomNav />
      <PWAInstallPrompt />
    </div>
  );
}
