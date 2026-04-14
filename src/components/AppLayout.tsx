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
      <main className="flex-1 w-full max-w-screen-2xl mx-auto px-4 lg:px-8 xl:px-10 2xl:px-16 py-6 pb-20">
        {children}
      </main>
      <BottomNav />
      <PWAInstallPrompt />
    </div>
  );
}