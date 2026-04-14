'use client';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppLogo from '@/components/ui/AppLogo';
import { LogOut, Settings, Bell, BellRing, X, TrendingDown } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import AppImage from '@/components/ui/AppImage';

interface InAppNotification {
  id: string;
  alertId: string | null;
  productName: string;
  imageUrl: string;
  message: string;
  targetPrice: number;
  triggeredPrice: number;
  currency: string;
  isRead: boolean;
  createdAt: string;
}

function dbToNotification(row: any): InAppNotification {
  return {
    id: row.id,
    alertId: row.alert_id,
    productName: row.product_name,
    imageUrl: row.image_url || '',
    message: row.message,
    targetPrice: Number(row.target_price),
    triggeredPrice: Number(row.triggered_price),
    currency: row.currency,
    isRead: row.is_read,
    createdAt: row.created_at,
  };
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function Topbar() {
  const { user, signOut } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const menuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const supabase = createClient();

  const userInitial = user?.user_metadata?.full_name
    ? user.user_metadata.full_name.charAt(0).toUpperCase()
    : user?.email
    ? user.email.charAt(0).toUpperCase()
    : '?';

  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('in_app_notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);
    if (data) setNotifications(data.map(dbToNotification));
  }, [user]);

  // Real-time subscription for new notifications
  useEffect(() => {
    if (!user) return;
    fetchNotifications();

    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'in_app_notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setNotifications(prev => [dbToNotification(payload.new), ...prev]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'in_app_notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setNotifications(prev =>
            prev.map(n => n.id === payload.new.id ? dbToNotification(payload.new) : n)
          );
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // Mark all as read when panel opens
  const handleOpenNotif = async () => {
    setNotifOpen(v => !v);
    setUserMenuOpen(false);
  };

  const markAllRead = async () => {
    if (!user || unreadCount === 0) return;
    const unreadIds = notifications.filter(n => !n.isRead).map(n => n.id);
    await supabase
      .from('in_app_notifications')
      .update({ is_read: true })
      .in('id', unreadIds)
      .eq('user_id', user.id);
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const dismissNotification = async (id: string) => {
    await supabase
      .from('in_app_notifications')
      .delete()
      .eq('id', id)
      .eq('user_id', user?.id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
      setUserMenuOpen(false);
      router.push('/sign-up-login');
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-card border-b border-border shadow-sm">
      <div className="max-w-screen-2xl mx-auto px-4 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/product-search-results" className="flex items-center gap-2 shrink-0">
          <AppLogo size={36} />
          <span className="font-bold text-xl tracking-tight text-foreground hidden sm:block">
            ShopRadar
          </span>
        </Link>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {user && (
            /* Notification Bell */
            <div className="relative" ref={notifRef}>
              <button
                onClick={handleOpenNotif}
                className="relative w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary/50"
                aria-label="Notifications"
              >
                {unreadCount > 0 ? (
                  <BellRing size={18} className="text-primary animate-pulse" />
                ) : (
                  <Bell size={18} />
                )}
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-white text-[10px] font-bold flex items-center justify-center leading-none">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Panel */}
              {notifOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                    <div className="flex items-center gap-2">
                      <Bell size={15} className="text-primary" />
                      <span className="text-sm font-semibold text-foreground">Price Alerts</span>
                      {unreadCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllRead}
                        className="text-xs text-primary hover:underline"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  {/* List */}
                  <div className="max-h-80 overflow-y-auto divide-y divide-border">
                    {notifications.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                        <Bell size={24} className="text-muted-foreground mb-2" />
                        <p className="text-sm font-medium text-foreground">No notifications yet</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          We&apos;ll notify you when a price drops to your target
                        </p>
                      </div>
                    ) : (
                      notifications.map(n => (
                        <div
                          key={n.id}
                          className={`flex gap-3 px-4 py-3 transition-colors ${!n.isRead ? 'bg-primary/5' : 'hover:bg-muted/50'}`}
                        >
                          {/* Product image */}
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted shrink-0 mt-0.5">
                            {n.imageUrl ? (
                              <AppImage
                                src={n.imageUrl}
                                alt={n.productName}
                                width={40}
                                height={40}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <TrendingDown size={16} className="text-success" />
                              </div>
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-foreground truncate">{n.productName}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">{n.message}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs font-bold text-success">
                                {n.currency}{n.triggeredPrice.toFixed(2)}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                target: {n.currency}{n.targetPrice.toFixed(2)}
                              </span>
                              <span className="text-xs text-muted-foreground ml-auto">
                                {timeAgo(n.createdAt)}
                              </span>
                            </div>
                          </div>

                          {/* Dismiss */}
                          <button
                            onClick={() => dismissNotification(n.id)}
                            className="shrink-0 p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            aria-label="Dismiss notification"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Footer */}
                  {notifications.length > 0 && (
                    <div className="px-4 py-2.5 border-t border-border">
                      <Link
                        href="/watchlist-price-alerts"
                        onClick={() => setNotifOpen(false)}
                        className="text-xs text-primary hover:underline font-medium"
                      >
                        View all price alerts →
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {user ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => { setUserMenuOpen(!userMenuOpen); setNotifOpen(false); }}
                className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white font-semibold text-sm hover:opacity-90 active:scale-95 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary/50"
                aria-label="Account menu"
              >
                {userInitial}
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 bg-card border border-border rounded-xl shadow-lg py-1 z-50">
                  <Link
                    href="/account-settings"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
                  >
                    <Settings size={15} className="text-muted-foreground" />
                    Account Settings
                  </Link>
                  <hr className="my-1 border-border" />
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                  >
                    <LogOut size={15} className="text-red-500" />
                    Log Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/sign-up-login"
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-white hover:opacity-90 active:scale-95 transition-all duration-150"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}