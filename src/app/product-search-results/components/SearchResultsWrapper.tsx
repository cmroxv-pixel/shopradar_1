'use client';
import dynamic from 'next/dynamic';

function SearchSkeleton() {
  return (
    <div style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
      <style>{`@keyframes shimmer{0%,100%{opacity:0.4}50%{opacity:0.8}}`}</style>

      {/* Hero skeleton */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 24px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
        <div style={{ width: 220, height: 24, borderRadius: 100, background: 'hsl(218 15% 20%)', animation: 'shimmer 1.5s ease-in-out infinite' }} />
        <div style={{ width: '65%', height: 60, borderRadius: 12, background: 'hsl(218 15% 20%)', animation: 'shimmer 1.5s ease-in-out infinite' }} />
        <div style={{ width: '48%', height: 60, borderRadius: 12, background: 'hsl(218 15% 20%)', animation: 'shimmer 1.5s ease-in-out infinite' }} />
        <div style={{ width: 340, height: 18, borderRadius: 8, background: 'hsl(218 15% 20%)', animation: 'shimmer 1.5s ease-in-out infinite' }} />
        <div style={{ width: 340, height: 16, borderRadius: 8, background: 'hsl(218 15% 20%)', animation: 'shimmer 1.5s ease-in-out infinite' }} />
        <div style={{ width: 170, height: 50, borderRadius: 100, background: 'hsl(218 15% 20%)', animation: 'shimmer 1.5s ease-in-out infinite', marginTop: 8 }} />
      </div>

      {/* Stats row skeleton */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 56, padding: '20px 24px 32px' }}>
        {[80, 60, 90].map((w, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div style={{ width: w, height: 34, borderRadius: 8, background: 'hsl(218 15% 20%)', animation: 'shimmer 1.5s ease-in-out infinite' }} />
            <div style={{ width: w + 20, height: 13, borderRadius: 6, background: 'hsl(218 15% 20%)', animation: 'shimmer 1.5s ease-in-out infinite' }} />
          </div>
        ))}
      </div>

      {/* Search area skeleton */}
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '32px 24px 80px' }}>
        {/* Controls row */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <div style={{ width: 110, height: 36, borderRadius: 100, background: 'hsl(218 15% 20%)', animation: 'shimmer 1.5s ease-in-out infinite' }} />
          <div style={{ width: 95, height: 36, borderRadius: 100, background: 'hsl(218 15% 20%)', animation: 'shimmer 1.5s ease-in-out infinite' }} />
        </div>
        {/* Category pills */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
          {[70, 100, 65, 80, 105, 60, 70, 80].map((w, i) => (
            <div key={i} style={{ width: w, height: 34, borderRadius: 100, background: 'hsl(218 15% 20%)', animation: 'shimmer 1.5s ease-in-out infinite' }} />
          ))}
        </div>
        {/* Location bar */}
        <div style={{ height: 56, borderRadius: 16, background: 'hsl(218 15% 20%)', animation: 'shimmer 1.5s ease-in-out infinite', marginBottom: 12 }} />
        {/* Search bar */}
        <div style={{ height: 56, borderRadius: 100, background: 'hsl(218 15% 20%)', animation: 'shimmer 1.5s ease-in-out infinite' }} />
      </div>
    </div>
  );
}

const SearchResultsClient = dynamic(() => import('./SearchResultsClient'), {
  ssr: false,
  loading: () => <SearchSkeleton />,
});

export default function SearchResultsWrapper() {
  return <SearchResultsClient />;
}
