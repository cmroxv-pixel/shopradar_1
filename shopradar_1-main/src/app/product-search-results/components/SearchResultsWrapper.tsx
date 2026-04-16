'use client';
import dynamic from 'next/dynamic';

const SearchResultsClient = dynamic(() => import('./SearchResultsClient'), { ssr: false });

export default function SearchResultsWrapper() {
  return <SearchResultsClient />;
}
