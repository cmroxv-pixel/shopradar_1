import React from 'react';
import AppLayout from '@/components/AppLayout';
import SettingsClient from './components/SettingsClient';
import dynamic from 'next/dynamic';

const FaultyTerminal = dynamic(() => import('@/components/ui/FaultyTerminal'), { ssr: false });

export default function SettingsPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'transparent', position: 'relative' }}>
      {/* FaultyTerminal background */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', background: '#0a0a0a' }}>
        <FaultyTerminal
          scale={1.5}
          tint="#3b82f6"
          brightness={0.5}
          scanlineIntensity={0.3}
          noiseAmp={1}
          mouseReact={false}
          pageLoadAnimation={false}
          timeScale={0.3}
        />
      </div>
      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <AppLayout isLoggedIn>
          <SettingsClient />
        </AppLayout>
      </div>
    </div>
  );
}
