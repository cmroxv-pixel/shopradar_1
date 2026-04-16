import React from 'react';
import AppLayout from '@/components/AppLayout';
import SettingsClient from './components/SettingsClient';
import FaultyBackground from './components/FaultyBackground';

export default function SettingsPage() {
  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <FaultyBackground />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <AppLayout isLoggedIn>
          <SettingsClient />
        </AppLayout>
      </div>
    </div>
  );
}
