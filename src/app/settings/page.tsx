'use client';
import React from 'react';
import Topbar from '@/components/Topbar';
import BottomNav from '@/components/BottomNav';
import SettingsClient from './components/SettingsClient';
import FaultyBackground from './components/FaultyBackground';

export default function SettingsPage() {
  return (
    <div style={{ minHeight: '100vh', position: 'relative', background: '#0a0a0a' }}>
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <FaultyBackground style={{ width: '100%', height: '100%' }} />
      </div>
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Topbar />
        <main style={{ flex: 1, width: '100%', maxWidth: 1280, margin: '0 auto', padding: '24px 16px 80px' }}>
          <SettingsClient />
        </main>
        <BottomNav />
      </div>
    </div>
  );
}
