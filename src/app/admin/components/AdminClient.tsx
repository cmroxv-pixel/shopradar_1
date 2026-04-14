'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';

const ADMIN_USER_ID = '2c8fdd0b-b3b6-4216-a541-1cf40490658a';

interface Stats {
  totalUsers: number;
  totalWatchlistItems: number;
  totalAlerts: number;
  totalSearches: number;
}

interface UserRow {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
  watchlist_count: number;
  alert_count: number;
}

type Tab = 'overview' | 'users' | 'searches';

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [tab, setTab] = useState<Tab>('overview');
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [recentSearches, setRecentSearches] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Guard — redirect if not admin
  useEffect(() => {
    if (!loading && (!user || user.id !== ADMIN_USER_ID)) {
      router.replace('/product-search-results');
    }
  }, [user, loading, router]);

  const fetchData = useCallback(async () => {
    if (!user || user.id !== ADMIN_USER_ID) return;
    setLoadingData(true);
    try {
      const [
        { count: userCount },
        { count: watchlistCount },
        { count: alertCount },
        { count: snapshotCount },
        { data: userProfiles },
        { data: snapshots },
      ] = await Promise.all([
        supabase.from('user_profiles').select('*', { count: 'exact', head: true }),
        supabase.from('watchlist_items').select('*', { count: 'exact', head: true }),
        supabase.from('price_alerts').select('*', { count: 'exact', head: true }),
        supabase.from('price_snapshots').select('*', { count: 'exact', head: true }),
        supabase.from('user_profiles').select('id, email, full_name, created_at').order('created_at', { ascending: false }).limit(50),
        supabase.from('price_snapshots').select('product_query, marketplace, price, currency, snapshot_date').order('snapshot_date', { ascending: false }).limit(100),
      ]);

      setStats({
        totalUsers: userCount || 0,
        totalWatchlistItems: watchlistCount || 0,
        totalAlerts: alertCount || 0,
        totalSearches: snapshotCount || 0,
      });

      // Enrich users with watchlist + alert counts
      const enriched: UserRow[] = await Promise.all(
        (userProfiles || []).map(async (u: any) => {
          const [{ count: wc }, { count: ac }] = await Promise.all([
            supabase.from('watchlist_items').select('*', { count: 'exact', head: true }).eq('user_id', u.id),
            supabase.from('price_alerts').select('*', { count: 'exact', head: true }).eq('user_id', u.id),
          ]);
          return { ...u, watchlist_count: wc || 0, alert_count: ac || 0 };
        })
      );
      setUsers(enriched);

      // Group snapshots by query
      const grouped: Record<string, number> = {};
      for (const s of snapshots || []) {
        grouped[s.product_query] = (grouped[s.product_query] || 0) + 1;
      }
      setRecentSearches(
        Object.entries(grouped)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 30)
          .map(([query, count]) => ({ query, count }))
      );
    } catch (err) {
      console.error('Admin fetch error:', err);
    } finally {
      setLoadingData(false);
    }
  }, [user, supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading || !user || user.id !== ADMIN_USER_ID) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'hsl(var(--background))' }}>
        <div style={{ width: 24, height: 24, border: '2px solid hsl(var(--primary))', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.75s linear infinite' }} />
      </div>
    );
  }

  const STAT_CARDS = [
    { label: 'Total Users', value: stats?.totalUsers ?? '—', icon: '👤', color: 'hsl(var(--primary))' },
    { label: 'Watchlist Items', value: stats?.totalWatchlistItems ?? '—', icon: '♥', color: 'hsl(var(--destructive))' },
    { label: 'Price Alerts', value: stats?.totalAlerts ?? '—', icon: '🔔', color: 'hsl(var(--warning))' },
    { label: 'Price Snapshots', value: stats?.totalSearches ?? '—', icon: '📊', color: 'hsl(var(--success))' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'hsl(var(--background))', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid hsl(var(--border))', background: 'hsl(var(--card))', padding: '0 32px', position: 'sticky', top: 0, zIndex: 40, backdropFilter: 'blur(20px)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'hsl(var(--success))', boxShadow: '0 0 8px hsl(var(--success))' }} />
            <span style={{ fontWeight: 800, fontSize: 16, letterSpacing: '-0.02em', color: 'hsl(var(--foreground))' }}>
              ShopRadar Admin
            </span>
            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 100, background: 'hsl(var(--primary) / 0.1)', color: 'hsl(var(--primary))', fontWeight: 700, letterSpacing: '0.04em' }}>
              RESTRICTED
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={fetchData} style={{ fontSize: 12, padding: '6px 14px', borderRadius: 100, border: '1px solid hsl(var(--border))', background: 'transparent', color: 'hsl(var(--muted-foreground))', cursor: 'pointer' }}>
              ↻ Refresh
            </button>
            <button onClick={() => router.push('/product-search-results')} style={{ fontSize: 12, padding: '6px 14px', borderRadius: 100, border: 'none', background: 'hsl(var(--primary))', color: 'white', cursor: 'pointer', fontWeight: 600 }}>
              ← Back to app
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px 80px' }}>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 28, background: 'hsl(var(--muted))', borderRadius: 12, padding: 4, width: 'fit-content', border: '1px solid hsl(var(--border))' }}>
          {(['overview', 'users', 'searches'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: '7px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: tab === t ? 700 : 400, background: tab === t ? 'hsl(var(--card))' : 'transparent', color: tab === t ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))', transition: 'all 0.15s', boxShadow: tab === t ? '0 1px 6px rgba(0,0,0,0.08)' : 'none', textTransform: 'capitalize' }}>
              {t}
            </button>
          ))}
        </div>

        {loadingData ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <div style={{ width: 24, height: 24, border: '2px solid hsl(var(--primary))', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.75s linear infinite' }} />
          </div>
        ) : (
          <>
            {/* ── Overview ── */}
            {tab === 'overview' && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 32 }}>
                  {STAT_CARDS.map((s, i) => (
                    <div key={i} style={{ background: 'hsl(var(--card))', border: '1.5px solid hsl(var(--border))', borderRadius: 16, padding: '20px 22px', transition: 'transform 0.2s', cursor: 'default' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = 'none'}
                    >
                      <div style={{ fontSize: 26, marginBottom: 10 }}>{s.icon}</div>
                      <div style={{ fontWeight: 800, fontSize: 32, color: s.color, letterSpacing: '-0.03em', lineHeight: 1 }}>{s.value.toLocaleString()}</div>
                      <div style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))', marginTop: 4 }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Recent users preview */}
                <div style={{ background: 'hsl(var(--card))', border: '1.5px solid hsl(var(--border))', borderRadius: 16, overflow: 'hidden' }}>
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid hsl(var(--border))', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>Recent Sign-ups</span>
                    <button onClick={() => setTab('users')} style={{ fontSize: 12, color: 'hsl(var(--primary))', background: 'none', border: 'none', cursor: 'pointer' }}>View all →</button>
                  </div>
                  <div>
                    {users.slice(0, 5).map((u, i) => (
                      <div key={u.id} style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: i < 4 ? '1px solid hsl(var(--border))' : 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'hsl(var(--primary))', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>
                            {(u.full_name || u.email).charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--foreground))', margin: 0 }}>{u.full_name || '—'}</p>
                            <p style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))', margin: 0 }}>{u.email}</p>
                          </div>
                        </div>
                        <span style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>{new Date(u.created_at).toLocaleDateString('en-AU')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── Users ── */}
            {tab === 'users' && (
              <div style={{ background: 'hsl(var(--card))', border: '1.5px solid hsl(var(--border))', borderRadius: 16, overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid hsl(var(--border))' }}>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{users.length} Users</span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: 'hsl(var(--muted) / 0.5)' }}>
                        {['User', 'Email', 'Joined', 'Watchlist', 'Alerts'].map(h => (
                          <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'hsl(var(--muted-foreground))', fontSize: 11, letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u, i) => (
                        <tr key={u.id} style={{ borderTop: '1px solid hsl(var(--border))', background: u.id === ADMIN_USER_ID ? 'hsl(var(--primary) / 0.04)' : 'transparent' }}>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ width: 28, height: 28, borderRadius: '50%', background: u.id === ADMIN_USER_ID ? 'hsl(var(--primary))' : 'hsl(var(--muted))', color: u.id === ADMIN_USER_ID ? 'white' : 'hsl(var(--muted-foreground))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>
                                {(u.full_name || u.email).charAt(0).toUpperCase()}
                              </div>
                              <span style={{ fontWeight: 500, color: 'hsl(var(--foreground))' }}>
                                {u.full_name || '—'}
                                {u.id === ADMIN_USER_ID && <span style={{ marginLeft: 6, fontSize: 9, padding: '1px 5px', borderRadius: 4, background: 'hsl(var(--primary))', color: 'white', fontWeight: 700 }}>ADMIN</span>}
                              </span>
                            </div>
                          </td>
                          <td style={{ padding: '12px 16px', color: 'hsl(var(--muted-foreground))' }}>{u.email}</td>
                          <td style={{ padding: '12px 16px', color: 'hsl(var(--muted-foreground))', whiteSpace: 'nowrap' }}>{new Date(u.created_at).toLocaleDateString('en-AU')}</td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: u.watchlist_count > 0 ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))' }}>{u.watchlist_count}</span>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: u.alert_count > 0 ? 'hsl(var(--success))' : 'hsl(var(--muted-foreground))' }}>{u.alert_count}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── Top searches ── */}
            {tab === 'searches' && (
              <div style={{ background: 'hsl(var(--card))', border: '1.5px solid hsl(var(--border))', borderRadius: 16, overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid hsl(var(--border))' }}>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>Top Searched Products</span>
                  <p style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))', margin: '4px 0 0' }}>Based on price snapshots stored in Supabase</p>
                </div>
                <div>
                  {recentSearches.length === 0 ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'hsl(var(--muted-foreground))', fontSize: 13 }}>
                      No search data yet — prices are stored after each search
                    </div>
                  ) : (
                    recentSearches.map((s, i) => (
                      <div key={i} style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 14, borderBottom: i < recentSearches.length - 1 ? '1px solid hsl(var(--border))' : 'none' }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'hsl(var(--muted-foreground))', width: 24, flexShrink: 0 }}>#{i + 1}</span>
                        <span style={{ fontSize: 13, fontWeight: 500, color: 'hsl(var(--foreground))', flex: 1, textTransform: 'capitalize' }}>{s.query}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ height: 6, borderRadius: 3, background: 'hsl(var(--primary))', width: Math.max(20, (s.count / recentSearches[0].count) * 120) }} />
                          <span style={{ fontSize: 12, fontWeight: 600, color: 'hsl(var(--primary))', width: 40, textAlign: 'right' }}>{s.count}×</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
