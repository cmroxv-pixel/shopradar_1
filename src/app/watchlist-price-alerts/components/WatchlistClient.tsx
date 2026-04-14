'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Toaster, toast } from 'sonner';
import { Bookmark, Bell, RefreshCw, Trash2, Plus, Loader2, LogIn, Wifi } from 'lucide-react';
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
    addedAt: new Date(row.added_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
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
    createdAt: new Date(row.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    lastTriggered: row.last_triggered ? new Date(row.last_triggered).toLocaleString() : undefined,
    priceHistory: Array.isArray(row.price_history) ? row.price_history : [],
    priceDrop: Number(row.price_drop),
  };
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

  // Real-time subscriptions
  useEffect(() => {
    if (!user) return;

    // Clean up any existing channel first
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase
      .channel(`watchlist-realtime-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'watchlist_items',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setWatchlist(prev => [dbToWatchlistItem(payload.new), ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setWatchlist(prev =>
              prev.map(item => item.id === payload.new.id ? dbToWatchlistItem(payload.new) : item)
            );
          } else if (payload.eventType === 'DELETE') {
            setWatchlist(prev => prev.filter(item => item.id !== payload.old.id));
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'price_alerts',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setAlerts(prev => [dbToPriceAlert(payload.new), ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setAlerts(prev =>
              prev.map(alert => alert.id === payload.new.id ? dbToPriceAlert(payload.new) : alert)
            );
          } else if (payload.eventType === 'DELETE') {
            setAlerts(prev => prev.filter(alert => alert.id !== payload.old.id));
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setRealtimeConnected(true);
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setRealtimeConnected(false);
        }
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
      setRealtimeConnected(false);
    };
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchData();
    } else if (!authLoading) {
      setDataLoading(false);
    }
  }, [user, authLoading, fetchData]);

  const handleRefreshAll = () => {
    setRefreshing(true);
    fetchData().then(() => {
      setRefreshing(false);
      toast.success('Watchlist refreshed!');
    });
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
    toast.success(`${selectedWl.length} items removed from watchlist`);
    setSelectedWl([]);
  };

  const handleDeleteAlert = async (id: string) => {
    if (!user) return;
    const { error } = await supabase.from('price_alerts').delete().eq('id', id).eq('user_id', user.id);
    if (error) { toast.error('Failed to delete alert'); return; }
    setAlerts(prev => prev.filter(a => a.id !== id));
    toast.success('Price alert deleted');
  };

  const handleToggleAlertEmail = async (id: string) => {
    if (!user) return;
    const alert = alerts.find(a => a.id === id);
    if (!alert) return;
    const newVal = !alert.emailEnabled;
    const { error } = await supabase.from('price_alerts').update({ email_enabled: newVal }).eq('id', id).eq('user_id', user.id);
    if (error) { toast.error('Failed to update alert'); return; }
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, emailEnabled: newVal } : a));
    toast.success(`Email notifications ${newVal ? 'enabled' : 'disabled'}`);
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
    if (error) { toast.error('Failed to update alert status'); return; }
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: next } : a));
    toast.success(`Alert ${next === 'Paused' ? 'paused' : 'resumed'}`);
  };

  const activeAlertCount = alerts.filter(a => a.status === 'Active').length;
  const triggeredCount = alerts.filter(a => a.status === 'Triggered').length;

  // Not logged in state
  if (!authLoading && !user) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Bookmark size={28} className="text-primary" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">Sign in to view your watchlist</h2>
        <p className="text-sm text-muted-foreground max-w-xs">
          Create an account or sign in to save products and set price alerts that persist across sessions.
        </p>
        <Link
          href="/sign-up-login"
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-white text-sm font-semibold hover:opacity-90 active:scale-95 transition-all duration-150"
        >
          <LogIn size={15} /> Sign in / Create account
        </Link>
      </div>
    );
  }

  // Loading state
  if (authLoading || dataLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={28} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Toaster position="bottom-right" richColors />

      {/* Page header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-foreground">Watchlist & Price Alerts</h1>
            {realtimeConnected && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success border border-success/20">
                <Wifi size={10} className="animate-pulse" /> Live
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {watchlist.length} saved products · {activeAlertCount} active alerts
            {triggeredCount > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-success/10 text-success">
                🎉 {triggeredCount} alert{triggeredCount > 1 ? 's' : ''} triggered!
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefreshAll}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border border-border bg-card text-foreground hover:bg-muted disabled:opacity-50 transition-all duration-150 active:scale-95"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Refreshing...' : 'Refresh all'}
          </button>
          <Link
            href="/product-search-results"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold bg-primary text-white hover:opacity-90 active:scale-95 transition-all duration-150"
          >
            <Plus size={14} /> Add products
          </Link>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Tracked Products', value: watchlist.length, icon: Bookmark, color: 'text-primary bg-primary/10' },
          { label: 'Active Alerts', value: activeAlertCount, icon: Bell, color: 'text-accent bg-accent/10' },
          { label: 'Alerts Triggered', value: triggeredCount, icon: Bell, color: 'text-success bg-success/10' },
          { label: 'Avg. Savings Found', value: '24%', icon: RefreshCw, color: 'text-primary bg-primary/10' },
        ].map(stat => (
          <div key={`stat-${stat.label}`} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${stat.color}`}>
              <stat.icon size={16} />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground tabular-nums">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex bg-muted rounded-xl p-1 w-full sm:w-72">
        {(['watchlist', 'alerts'] as Tab[]).map(t => (
          <button
            key={`maintab-${t}`}
            onClick={() => setActiveTab(t)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${activeTab === t ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {t === 'watchlist' ? <Bookmark size={14} /> : <Bell size={14} />}
            {t === 'watchlist' ? 'Watchlist' : 'Price Alerts'}
            {t === 'alerts' && triggeredCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-success text-white text-xs flex items-center justify-center font-bold">
                {triggeredCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Bulk action bar */}
      {selectedWl.length > 0 && activeTab === 'watchlist' && (
        <div className="flex items-center justify-between bg-primary/10 border border-primary/30 rounded-xl px-4 py-3">
          <span className="text-sm font-medium text-primary">{selectedWl.length} item{selectedWl.length > 1 ? 's' : ''} selected</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedWl([])}
              className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Deselect all
            </button>
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-destructive text-white hover:opacity-90 active:scale-95 transition-all duration-150"
            >
              <Trash2 size={12} /> Remove selected
            </button>
          </div>
        </div>
      )}

      {/* Tab content */}
      {activeTab === 'watchlist' ? (
        <WatchlistTab
          items={watchlist}
          selected={selectedWl}
          onSelect={setSelectedWl}
          onRemove={handleRemoveWatchlist}
        />
      ) : (
        <AlertsTab
          alerts={alerts}
          onDelete={handleDeleteAlert}
          onToggleEmail={handleToggleAlertEmail}
          onUpdateTarget={handleUpdateAlertTarget}
          onToggleStatus={handleToggleAlertStatus}
        />
      )}
    </div>
  );
}