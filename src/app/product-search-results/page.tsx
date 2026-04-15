import React from 'react';
import AppLayout from '@/components/AppLayout';
import SearchResultsWrapper from './components/SearchResultsWrapper';

export default function ProductSearchResultsPage() {
  return (
    <AppLayout dotVariant="search" useDither>
      <SearchResultsWrapper />
    </AppLayout>
  );
}
