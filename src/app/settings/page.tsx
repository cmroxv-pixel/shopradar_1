import React from 'react';
import AppLayout from '@/components/AppLayout';
import SettingsClient from './components/SettingsClient';

export default function SettingsPage() {
  return (
    <AppLayout isLoggedIn dotVariant="settings">
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        {/* Animated circles like sign-in page but blue tinted */}
        <div style={{ position: 'absolute', inset: 0, opacity: 0.06 }}>
          <div style={{ position: 'absolute', top: '10%', left: '5%', width: 600, height: 600, borderRadius: '50%', border: '2px solid hsl(218 100% 62%)', animation: 'spin 30s linear infinite' }} />
          <div style={{ position: 'absolute', top: '20%', left: '15%', width: 900, height: 900, borderRadius: '50%', border: '1px solid hsl(218 100% 62%)', animation: 'spin 45s linear infinite reverse' }} />
          <div style={{ position: 'absolute', bottom: '10%', right: '5%', width: 500, height: 500, borderRadius: '50%', border: '2px solid hsl(218 100% 62%)', animation: 'spin 25s linear infinite' }} />
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 1200, height: 1200, borderRadius: '50%', border: '1px solid hsl(218 100% 62%)', animation: 'spin 60s linear infinite reverse' }} />
          <div style={{ position: 'absolute', bottom: '20%', left: '20%', width: 400, height: 400, borderRadius: '50%', border: '1.5px solid hsl(218 100% 62%)', animation: 'spin 20s linear infinite' }} />
        </div>
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
      <div style={{ position: 'relative', zIndex: 1 }}>
        <SettingsClient />
      </div>
    </AppLayout>
  );
}
