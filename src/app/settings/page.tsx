import React from 'react';
import AppLayout from '@/components/AppLayout';
import SettingsClient from './components/SettingsClient';
import { FallingPattern } from '@/components/ui/falling-pattern';

export default function SettingsPage() {
  return (
    <AppLayout isLoggedIn dotVariant="settings">
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <FallingPattern
          color="hsl(218 100% 62% / 0.6)"
          backgroundColor="transparent"
          duration={150}
          blurIntensity="1em"
          density={1}
          className="h-screen [mask-image:radial-gradient(ellipse_at_center,transparent,hsl(var(--background)))]"
        />
      </div>
      <div style={{ position: 'relative', zIndex: 1 }}>
        <SettingsClient />
      </div>
    </AppLayout>
  );
}
