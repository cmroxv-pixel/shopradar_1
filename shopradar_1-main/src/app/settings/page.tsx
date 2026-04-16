import React from 'react';
import AppLayout from '@/components/AppLayout';
import SettingsClient from './components/SettingsClient';
import dynamic from 'next/dynamic';

const FaultyTerminal = dynamic(() => import('@/components/ui/FaultyTerminal'), { ssr: false });

export default function SettingsPage() {
  return (
    <AppLayout isLoggedIn dotVariant="settings">
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <FaultyTerminal
          scale={1.5}
          tint="#3b82f6"
          brightness={0.4}
          scanlineIntensity={0.3}
          noiseAmp={1}
          mouseReact={false}
          pageLoadAnimation={false}
          timeScale={0.3}
        />
      </div>
      <div style={{ position: 'relative', zIndex: 1 }}>
        <SettingsClient />
      </div>
    </AppLayout>
  );
}
