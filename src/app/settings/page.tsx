import React from 'react';
import AppLayout from '@/components/AppLayout';
import SettingsClient from './components/SettingsClient';
import { GradientDots } from '@/components/ui/gradient-dots';

export default function SettingsPage() {
  return (
    <AppLayout isLoggedIn dotVariant="settings">
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', opacity: 0.15 }}>
        <GradientDots
          duration={20}
          colorCycleDuration={4}
          dotSize={2}
          spacing={8}
        />
      </div>
      <div style={{ position: 'relative', zIndex: 1 }}>
        <SettingsClient />
      </div>
    </AppLayout>
  );
}
