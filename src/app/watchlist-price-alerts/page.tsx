import React from 'react';
import AppLayout from '@/components/AppLayout';
import WatchlistClient from './components/WatchlistClient';

export default function WatchlistPriceAlertsPage() {
  return (
    <AppLayout isLoggedIn dotVariant="watchlist">
      <WatchlistClient />
    </AppLayout>
  );
}
