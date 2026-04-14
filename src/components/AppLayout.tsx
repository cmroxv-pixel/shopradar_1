import React from 'react';
import Topbar from './Topbar';
import BottomNav from './BottomNav';
import PWAInstallPrompt from './PWAInstallPrompt';
import DotCanvas from './DotCanvas';

interface AppLayoutProps {
  children: React.ReactNode;
  isLoggedIn?: boolean;
  dotVariant?: 'search' | 'watchlist' | 'settings' | 'auth';
}

export default function AppLayout({ children, dotVariant }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col" style={{ position: 'relative' }}>
      {/* Dot canvas background — only if variant specified */}
      {dotVariant && <DotCanvas variant={dotVariant} />}

      <Topbar />
      <main className="flex-1 w-full pb-20" style={{ position: 'relative', zIndex: 1 }}>
        {children}
      </main>
      <BottomNav />
      <PWAInstallPrompt />
    </div>
  );
}
