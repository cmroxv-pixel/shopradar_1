'use client';
import React, { useState, useEffect } from 'react';
import { X, Download } from 'lucide-react';
import AppLogo from '@/components/ui/AppLogo';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed or dismissed
    const dismissed = localStorage.getItem('shopradar-pwa-dismissed');
    if (dismissed) return;

    // Check if already running as PWA
    if (window.matchMedia('(display-mode: standalone)').matches) return;

    // iOS detection
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(ios);

    if (ios) {
      // Show iOS instructions after a delay
      setTimeout(() => setShowBanner(true), 3000);
      return;
    }

    // Listen for beforeinstallprompt (Chrome/Android)
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setShowBanner(true), 3000);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    localStorage.setItem('shopradar-pwa-dismissed', 'true');
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 md:left-auto md:right-6 md:w-80">
      <div className="bg-card border border-border rounded-2xl shadow-2xl p-4 flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <AppLogo size={24} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">Install ShopRadar</p>
          {isIOS ? (
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Tap <span className="font-medium text-foreground">Share</span> then <span className="font-medium text-foreground">Add to Home Screen</span> to install
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Add to your home screen for quick access — no app store needed
            </p>
          )}
          {!isIOS && (
            <button
              onClick={handleInstall}
              className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:opacity-90 active:scale-95 transition-all duration-150"
            >
              <Download size={11} /> Install app
            </button>
          )}
        </div>
        <button
          onClick={handleDismiss}
          className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-150 shrink-0"
          aria-label="Dismiss"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
