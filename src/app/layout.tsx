import React from 'react';
import type { Metadata, Viewport } from 'next';
import '../styles/tailwind.css';
import { ThemeProvider } from '@/components/ThemeProvider';
import { AuthProvider } from '@/contexts/AuthContext';
import { PostHogProvider } from '@/components/PostHogProvider';
import DarkModeInit from '@/components/DarkModeInit';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: 'ShopRadar — Find the Best Price, Delivered Fastest',
  description: 'ShopRadar scans Amazon, eBay, and boutique stores worldwide to show you the cheapest in-stock price with accurate delivery estimates to your door.',
  icons: { icon: [{ url: '/favicon.ico', type: 'image/x-icon' }] },
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'ShopRadar' },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <DarkModeInit />
      </head>
      <body>
        <PostHogProvider>
          <AuthProvider>
            <ThemeProvider>
              {children}
            </ThemeProvider>
          </AuthProvider>
        </PostHogProvider>
      </body>
    </html>
  );
}
