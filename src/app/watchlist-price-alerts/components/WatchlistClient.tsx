'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Toaster, toast } from 'sonner';
import WatchlistTab from './WatchlistTab';
import AlertsTab from './AlertsTab';
import { type WatchlistItem, type PriceAlert } from './watchlistData';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type Tab = 'watchlist' | 'alerts';

function dbToWatchlistItem(row: any): WatchlistItem {
  return {
    id: row.id,
    productName: row.product_name,
    model: row.model,
    color: row.color,
    imageUrl: row.image_url || '',
    currentBestPrice: Number(row.current_best_price),
    currency: row.currency,
    originalPrice: Number(row.original_price),
    marketplaceCount: row.marketplace_count,
    bestMarketplace: row.best_marketplace || '',
    stockStatus: row.stock_status as WatchlistItem['stockStatus'],
    addedAt: new Date(row.added_at).toLocaleDateString('en-AU', { month: 'short', day: 'numeric', year: 'numeric' }),
    lastChecked: 'just now',
    hasAlert: row.has_alert,
    priceHistory: Array.isArray(row.price_history) ? row.price_history : [],
  };
}

function dbToPriceAlert(row: any): PriceAlert {
  return {
    id: row.id,
    productName: row.product_name,
    model: row.model,
    color: row.color,
    imageUrl: row.image_url || '',
    targetPrice: Number(row.target_price),
    currentPrice: Number(row.current_price),
    currency: row.currency,
    originalPrice: Number(row.original_price),
    marketplace: row.marketplace || 'Any marketplace',
    status: row.alert_status as PriceAlert['status'],
    emailEnabled: row.email_enabled,
    createdAt: new Date(row.created_at).toLocaleDateString('en-AU', { month: 'short', day: 'numeric', year: 'numeric' }),
    lastTriggered: row.last_triggered ? new Date(row.last_triggered).toLocaleString() : undefined,
    priceHistory: Array.isArray(row.price_history) ? row.price_history : [],
    priceDrop: Number(row.price_drop),
  };
}

// ── Skeleton loader ──────────────────────────────────────────
function Skeleton({ width = '100%', height = 16, radius = 8, style = {} }: { width?: string | number; height?: number; radius?: number; style?: React.CSSProperties }) {
  return (
    <div style={{
      width, height, borderRadius: radius,
      background: 'hsl(var(--muted))',
      animation: 'shimmer 1.5s ease-in-out infinite',
      ...style,
    }} />
  );
}

function WatchlistSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <style>{`
        @keyframes shimmer {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
      `}</style>
      {/* Header skeleton */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Skeleton width={220} height={28} radius={6} />
          <Skeleton width={160} height={14} radius={6} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Skeleton width={100} height={36} radius={10} />
          <Skeleton width={120} height={36} radius={10} />
        </div>
      </div>
      {/* Stat cards skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 4 }}>
        {[...Array(4)].map((_, i) => (
          <div key={i} style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 14, padding: '16px' }}>
            <Skeleton width={40} height={14} radius={4} style={{ marginBottom: 8 }} />
            <Skeleton width={60} height={24} radius={4} style={{ marginBottom: 6 }} />
            <Skeleton width={100} height={12} radius={4} />
          </div>
        ))}
      </div>
      {/* Tab skeleton */}
      <Skeleton width={220} height={40} radius={12} />
      {/* Card skeletons */}
      {[...Array(3)].map((_, i) => (
        <div key={i} style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 16, padding: '20px', display: 'flex', gap: 16, alignItems: 'center' }}>
          <Skeleton width={64} height={64} radius={12} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Skeleton width="60%" height={16} radius={4} />
            <Skeleton width="40%" height={12} radius={4} />
            <Skeleton width="30%" height={20} radius={4} />
          </div>
          <Skeleton width={80} height={32} radius={8} />
        </div>
      ))}
    </div>
  );
}

export default function WatchlistClient() {
  const { user, loading: authLoading } = useAuth();
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState<Tab>('watchlist');
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedWl, setSelectedWl] = useState<string[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setDataLoading(true);
    try {
      const [wlRes, alertRes] = await Promise.all([
        supabase.from('watchlist_items').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('price_alerts').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      ]);
      if (wlRes.data) setWatchlist(wlRes.data.map(dbToWatchlistItem));
      if (alertRes.data) setAlerts(alertRes.data.map(dbToPriceAlert));
    } catch {
      toast.error('Failed to load watchlist data');
    } finally {
      setDataLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null; }
    const channel = supabase.channel(`watchlist-realtime-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'watchlist_items', filter: `user_id=eq.${user.id}` }, (payload) => {
        if (payload.eventType === 'INSERT') setWatchlist(prev => [dbToWatchlistItem(payload.new), ...prev]);
        else if (payload.eventType === 'UPDATE') setWatchlist(prev => prev.map(item => item.id === payload.new.id ? dbToWatchlistItem(payload.new) : item));
        else if (payload.eventType === 'DELETE') setWatchlist(prev => prev.filter(item => item.id !== payload.old.id));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'price_alerts', filter: `user_id=eq.${user.id}` }, (payload) => {
        if (payload.eventType === 'INSERT') setAlerts(prev => [dbToPriceAlert(payload.new), ...prev]);
        else if (payload.eventType === 'UPDATE') setAlerts(prev => prev.map(a => a.id === payload.new.id ? dbToPriceAlert(payload.new) : a));
        else if (payload.eventType === 'DELETE') setAlerts(prev => prev.filter(a => a.id !== payload.old.id));
      })
      .subscribe((status) => {
        setRealtimeConnected(status === 'SUBSCRIBED');
      });
    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); channelRef.current = null; setRealtimeConnected(false); };
  }, [user]);

  useEffect(() => {
    if (user) fetchData();
    else if (!authLoading) setDataLoading(false);
  }, [user, authLoading, fetchData]);

  const handleRefreshAll = () => {
    setRefreshing(true);
    fetchData().then(() => { setRefreshing(false); toast.success('Watchlist refreshed!'); });
  };

  const handleRemoveWatchlist = async (id: string) => {
    if (!user) return;
    const { error } = await supabase.from('watchlist_items').delete().eq('id', id).eq('user_id', user.id);
    if (error) { toast.error('Failed to remove item'); return; }
    setWatchlist(prev => prev.filter(w => w.id !== id));
    toast.success('Removed from watchlist');
  };

  const handleBulkDelete = async () => {
    if (!user) return;
    const { error } = await supabase.from('watchlist_items').delete().in('id', selectedWl).eq('user_id', user.id);
    if (error) { toast.error('Failed to remove items'); return; }
    setWatchlist(prev => prev.filter(w => !selectedWl.includes(w.id)));
    toast.success(`${selectedWl.length} items removed`);
    setSelectedWl([]);
  };

  const handleDeleteAlert = async (id: string) => {
    if (!user) return;
    const { error } = await supabase.from('price_alerts').delete().eq('id', id).eq('user_id', user.id);
    if (error) { toast.error('Failed to delete alert'); return; }
    setAlerts(prev => prev.filter(a => a.id !== id));
    toast.success('Alert deleted');
  };

  const handleToggleAlertEmail = async (id: string) => {
    if (!user) return;
    const alert = alerts.find(a => a.id === id);
    if (!alert) return;
    const newVal = !alert.emailEnabled;
    const { error } = await supabase.from('price_alerts').update({ email_enabled: newVal }).eq('id', id).eq('user_id', user.id);
    if (error) { toast.error('Failed to update alert'); return; }
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, emailEnabled: newVal } : a));
    toast.success(`Email ${newVal ? 'enabled' : 'disabled'}`);
  };

  const handleUpdateAlertTarget = async (id: string, targetPrice: number) => {
    if (!user) return;
    const { error } = await supabase.from('price_alerts').update({ target_price: targetPrice }).eq('id', id).eq('user_id', user.id);
    if (error) { toast.error('Failed to update target price'); return; }
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, targetPrice } : a));
    toast.success('Target price updated');
  };

  const handleToggleAlertStatus = async (id: string) => {
    if (!user) return;
    const alert = alerts.find(a => a.id === id);
    if (!alert) return;
    const next = alert.status === 'Paused' ? 'Active' : 'Paused';
    const { error } = await supabase.from('price_alerts').update({ alert_status: next }).eq('id', id).eq('user_id', user.id);
    if (error) { toast.error('Failed to update alert'); return; }
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: next } : a));
    toast.success(`Alert ${next === 'Paused' ? 'paused' : 'resumed'}`);
  };

  const activeAlertCount = alerts.filter(a => a.status === 'Active').length;
  const triggeredCount = alerts.filter(a => a.status === 'Triggered').length;
  const ff = (n: number) => n.toLocaleString();

  // Not signed in
  if (!authLoading && !user) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 24px', textAlign: 'center', gap: 16, fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: 'hsl(var(--primary) / 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 21C12 21 3 14.5 3 8.5C3 5.42 5.42 3 8.5 3C10.24 3 11.91 3.81 13 5.08C14.09 3.81 15.76 3 17.5 3C20.58 3 23 5.42 23 8.5C23 14.5 14 21 12 21Z" stroke="hsl(var(--primary))" strokeWidth="1.8" strokeLinejoin="round"/></svg>
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'hsl(var(--foreground))', margin: 0 }}>Sign in to view your watchlist</h2>
        <p style={{ fontSize: 14, color: 'hsl(var(--muted-foreground))', maxWidth: 300, margin: 0, lineHeight: 1.6 }}>Save products and set price alerts that persist across sessions.</p>
        <Link href="/sign-up-login" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 24px', borderRadius: 100, background: 'hsl(var(--primary))', color: 'white', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
          Sign in
        </Link>
      </div>
    );
  }

  // Loading — show skeleton
  if (authLoading || dataLoading) return <WatchlistSkeleton />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
      <Toaster position="bottom-right" richColors />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: 'hsl(var(--foreground))', margin: 0, letterSpacing: '-0.02em' }}>Watchlist</h1>
            {realtimeConnected && (
              <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 100, background: 'hsl(var(--success) / 0.1)', color: 'hsl(var(--success))', border: '1px solid hsl(var(--success) / 0.2)', fontWeight: 600 }}>
                ● Live
              </span>
            )}
          </div>
          <p style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))', marginTop: 4, marginBottom: 0 }}>
            {watchlist.length} saved · {activeAlertCount} active alerts
            {triggeredCount > 0 && <span style={{ marginLeft: 8, color: 'hsl(var(--success))', fontWeight: 600 }}>· {triggeredCount} triggered!</span>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleRefreshAll} disabled={refreshing}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 100, border: '1.5px solid hsl(var(--border))', background: 'hsl(var(--card))', color: 'hsl(var(--foreground))', cursor: refreshing ? 'wait' : 'pointer', fontSize: 13, fontWeight: 500, opacity: refreshing ? 0.6 : 1 }}>
            {refreshing ? 'Refreshing…' : '↻ Refresh'}
          </button>
          <Link href="/product-search-results"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 100, background: 'hsl(var(--primary))', color: 'white', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
            + Add products
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
        {[
          { label: 'Tracked Products', value: ff(watchlist.length) },
          { label: 'Active Alerts', value: ff(activeAlertCount) },
          { label: 'Triggered', value: ff(triggeredCount) },
          { label: 'Avg. Savings', value: '24%' },
        ].map((s, i) => (
          <div key={i} style={{ background: 'hsl(var(--card))', border: '1.5px solid hsl(var(--border))', borderRadius: 14, padding: '16px 18px' }}>
            <p style={{ fontSize: 24, fontWeight: 800, color: 'hsl(var(--foreground))', margin: 0, letterSpacing: '-0.03em' }}>{s.value}</p>
            <p style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))', marginTop: 4, marginBottom: 0 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', background: 'hsl(var(--muted))', borderRadius: 12, padding: 4, width: 'fit-content', border: '1px solid hsl(var(--border))' }}>
        {(['watchlist', 'alerts'] as Tab[]).map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            style={{ padding: '7px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: activeTab === t ? 700 : 400, background: activeTab === t ? 'hsl(var(--card))' : 'transparent', color: activeTab === t ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))', transition: 'all 0.15s', boxShadow: activeTab === t ? '0 1px 6px rgba(0,0,0,0.08)' : 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
            {t === 'watchlist' ? 'Watchlist' : 'Price Alerts'}
            {t === 'alerts' && triggeredCount > 0 && (
              <span style={{ width: 16, height: 16, borderRadius: '50%', background: 'hsl(var(--success))', color: 'white', fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{triggeredCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* Bulk action */}
      {selectedWl.length > 0 && activeTab === 'watchlist' && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'hsl(var(--primary) / 0.08)', border: '1px solid hsl(var(--primary) / 0.2)', borderRadius: 12, padding: '12px 18px' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--primary))' }}>{selectedWl.length} selected</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setSelectedWl([])} style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))', background: 'none', border: 'none', cursor: 'pointer' }}>Deselect all</button>
            <button onClick={handleBulkDelete} style={{ fontSize: 12, padding: '6px 14px', borderRadius: 8, background: 'hsl(var(--destructive))', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Remove selected</button>
          </div>
        </div>
      )}

      {/* Tab content */}
      {activeTab === 'watchlist'
        ? <WatchlistTab items={watchlist} selected={selectedWl} onSelect={setSelectedWl} onRemove={handleRemoveWatchlist} />
        : <AlertsTab alerts={alerts} onDelete={handleDeleteAlert} onToggleEmail={handleToggleAlertEmail} onUpdateTarget={handleUpdateAlertTarget} onToggleStatus={handleToggleAlertStatus} />
      }
    </div>
  );
}
