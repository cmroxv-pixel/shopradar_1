import React from 'react';
import Topbar from './Topbar';
import BottomNav from './BottomNav';
import PWAInstallPrompt from './PWAInstallPrompt';

interface AppLayoutProps {
  children: React.ReactNode;
  isLoggedIn?: boolean;
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Topbar />
      <main className="flex-1 w-full px-0 py-0 pb-20">
        {children}
      </main>
      <BottomNav />
      <PWAInstallPrompt />
    </div>
  );
}
