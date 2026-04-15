'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

const ADMIN_ID = '2c8fdd0b-b3b6-4216-a541-1cf40490658a';
const PH_KEY = 'phc_mDWJLx7qC9EjyyA4ycrDWNk9iucE4VmbjzzpLE7xReUR';
const PH_HOST = 'https://us.posthog.com';
const PH_PROJECT = '382608';

type Tab = 'overview' | 'users' | 'searches' | 'analytics';

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

interface PHEvent {
  event: string;
  count: number;
  last_seen: string;
}

export default function AdminClient() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [tab, setTab] = useState<Tab>('overview');
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [topSearches, setTopSearches] = useState<{ query: string; count: number }[]>([]);
  const [phEvents, setPhEvents] = useState<PHEvent[]>([]);
  const [aiStats, setAiStats] = useState<{ verdict: string; count: number }[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [testPlan, setTestPlan] = useState<'free' | 'pro' | 'radar_plus' | null>(null);
  const [savingPlan, setSavingPlan] = useState(false);

  useEffect(() => {
    if (!loading && (!user || user.id !== ADMIN_ID)) {
      router.replace('/product-search-results');
    }
  }, [user, loading, router]);

  const fetchPostHogEvents = useCallback(async () => {
    try {
      // Fetch recent events from PostHog Query API
      const res = await fetch(`${PH_HOST}/api/projects/${PH_PROJECT}/query/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${PH_KEY}`,
        },
        body: JSON.stringify({
          query: {
            kind: 'EventsQuery',
            select: ['event', 'count()', 'max(timestamp)'],
            where: [`timestamp > now() - interval '7 days'`],
            groupBy: ['event'],
            orderBy: ['count() DESC'],
            limit: 20,
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const rows = data.results || [];
        setPhEvents(rows.map((r: any[]) => ({ event: r[0], count: r[1], last_seen: r[2] })));

        // Extract AI verdict breakdown
        const aiRes = await fetch(`${PH_HOST}/api/projects/${PH_PROJECT}/query/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${PH_KEY}` },
          body: JSON.stringify({
            query: {
              kind: 'EventsQuery',
              select: ['properties.verdict', 'count()'],
              where: [`event = 'ai_analysis_completed'`, `timestamp > now() - interval '30 days'`],
              groupBy: ['properties.verdict'],
              orderBy: ['count() DESC'],
            },
          }),
        });
        if (aiRes.ok) {
          const aiData = await aiRes.json();
          setAiStats((aiData.results || []).map((r: any[]) => ({ verdict: r[0] || 'Unknown', count: r[1] })));
        }
      }
    } catch { /* PostHog query may not be available on free tier */ }
  }, []);

  const fetchData = useCallback(async () => {
    if (!user || user.id !== ADMIN_ID) return;
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
        supabase.from('price_snapshots').select('product_query, snapshot_date').order('snapshot_date', { ascending: false }).limit(200),
      ]);

      setStats({ totalUsers: userCount || 0, totalWatchlistItems: watchlistCount || 0, totalAlerts: alertCount || 0, totalSearches: snapshotCount || 0 });

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

      const grouped: Record<string, number> = {};
      for (const s of snapshots || []) {
        grouped[s.product_query] = (grouped[s.product_query] || 0) + 1;
      }
      setTopSearches(Object.entries(grouped).sort((a, b) => b[1] - a[1]).slice(0, 30).map(([query, count]) => ({ query, count })));

      await fetchPostHogEvents();
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingData(false);
    }
  }, [user, supabase, fetchPostHogEvents]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const applyTestPlan = async (plan: 'free' | 'pro' | 'radar_plus') => {
    setSavingPlan(true);
    try {
      await supabase.from('user_profiles').update({
        subscription_plan: plan,
        subscription_status: plan === 'free' ? 'inactive' : 'active',
      }).eq('id', ADMIN_ID);
      setTestPlan(plan);
      toast.success(`Plan set to ${plan === 'radar_plus' ? 'Radar+' : plan.charAt(0).toUpperCase() + plan.slice(1)} — refresh the app to see changes`);
    } catch {
      toast.error('Failed to update plan');
    } finally {
      setSavingPlan(false);
    }
  };

  if (loading || !user || user.id !== ADMIN_ID) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ width: 24, height: 24, border: '2px solid hsl(var(--primary))', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.75s linear infinite' }} /></div>;
  }

  const totalAIRequests = aiStats.reduce((sum, s) => sum + s.count, 0);
  const totalEvents = phEvents.reduce((sum, e) => sum + e.count, 0);

  const STAT_CARDS = [
    { label: 'Total Users', value: stats?.totalUsers ?? '—', icon: '👤', color: 'hsl(var(--primary))' },
    { label: 'Watchlist Items', value: stats?.totalWatchlistItems ?? '—', icon: '♥', color: 'hsl(var(--destructive))' },
    { label: 'Price Alerts', value: stats?.totalAlerts ?? '—', icon: '🔔', color: 'hsl(var(--warning))' },
    { label: 'Price Snapshots', value: stats?.totalSearches ?? '—', icon: '📊', color: 'hsl(var(--success))' },
    { label: 'AI Analyses (30d)', value: totalAIRequests || '—', icon: '✦', color: 'hsl(218 100% 60%)' },
    { label: 'Events (7d)', value: totalEvents || '—', icon: '📡', color: 'hsl(var(--accent))' },
  ];

  const TABS: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'users', label: 'Users' },
    { id: 'searches', label: 'Searches' },
    { id: 'analytics', label: '✦ PostHog' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'hsl(var(--background))', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid hsl(var(--border))', background: 'hsl(var(--card))', padding: '0 32px', position: 'sticky', top: 0, zIndex: 40 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'hsl(var(--success))', boxShadow: '0 0 8px hsl(var(--success))' }} />
            <span style={{ fontWeight: 800, fontSize: 16, letterSpacing: '-0.02em' }}>ShopRadar Admin</span>
            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 100, background: 'hsl(var(--primary) / 0.1)', color: 'hsl(var(--primary))', fontWeight: 700 }}>RESTRICTED</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={fetchData} style={{ fontSize: 12, padding: '6px 14px', borderRadius: 100, border: '1px solid hsl(var(--border))', background: 'transparent', color: 'hsl(var(--muted-foreground))', cursor: 'pointer' }}>↻ Refresh</button>
            <button onClick={() => router.push('/product-search-results')} style={{ fontSize: 12, padding: '6px 14px', borderRadius: 100, border: 'none', background: 'hsl(var(--primary))', color: 'white', cursor: 'pointer', fontWeight: 600 }}>← Back to app</button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px 80px' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 28, background: 'hsl(var(--muted))', borderRadius: 12, padding: 4, width: 'fit-content', border: '1px solid hsl(var(--border))' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: '7px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: tab === t.id ? 700 : 400, background: tab === t.id ? 'hsl(var(--card))' : 'transparent', color: tab === t.id ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))', transition: 'all 0.15s', boxShadow: tab === t.id ? '0 1px 6px rgba(0,0,0,0.08)' : 'none' }}>
              {t.label}
            </button>
          ))}
        </div>

        {loadingData ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <div style={{ width: 24, height: 24, border: '2px solid hsl(var(--primary))', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.75s linear infinite' }} />
          </div>
        ) : (
          <>
            {/* Overview */}
            {tab === 'overview' && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16, marginBottom: 32 }}>
                  {STAT_CARDS.map((s, i) => (
                    <div key={i} style={{ background: 'hsl(var(--card))', border: '1.5px solid hsl(var(--border))', borderRadius: 16, padding: '18px 20px', cursor: 'default', transition: 'transform 0.2s' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = 'none'}
                    >
                      <div style={{ fontSize: 22, marginBottom: 8 }}>{s.icon}</div>
                      <div style={{ fontWeight: 800, fontSize: 28, color: s.color, letterSpacing: '-0.03em', lineHeight: 1 }}>{typeof s.value === 'number' ? s.value.toLocaleString() : s.value}</div>
                      <div style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))', marginTop: 4 }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Plan tester */}
                <div style={{ background: 'hsl(var(--card))', border: '1.5px solid hsl(var(--primary) / 0.3)', borderRadius: 16, padding: '20px 24px', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: 14, margin: 0, color: 'hsl(var(--foreground))' }}>🧪 Test Plan Features</p>
                      <p style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))', margin: '3px 0 0' }}>Switch your account plan to test what each tier looks like. Only affects your account.</p>
                    </div>
                    {testPlan && (
                      <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 100, background: 'hsl(var(--success) / 0.1)', color: 'hsl(var(--success))', fontWeight: 700, border: '1px solid hsl(var(--success) / 0.3)' }}>
                        Testing: {testPlan === 'radar_plus' ? 'Radar+' : testPlan.charAt(0).toUpperCase() + testPlan.slice(1)}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {([
                      { id: 'free' as const, label: 'Free', desc: '5 searches/day, 3 watchlist', color: 'hsl(var(--muted-foreground))' },
                      { id: 'pro' as const, label: 'Pro', desc: 'Unlimited + AI analysis', color: 'hsl(var(--primary))' },
                      { id: 'radar_plus' as const, label: 'Radar+', desc: 'Everything unlocked', color: 'hsl(var(--success))' },
                    ]).map(p => (
                      <button key={p.id} onClick={() => applyTestPlan(p.id)} disabled={savingPlan}
                        style={{ flex: 1, minWidth: 130, padding: '12px 16px', borderRadius: 12, border: `1.5px solid ${testPlan === p.id ? p.color : 'hsl(var(--border))'}`, background: testPlan === p.id ? `color-mix(in srgb, ${p.color} 10%, transparent)` : 'hsl(var(--muted) / 0.5)', cursor: savingPlan ? 'wait' : 'pointer', textAlign: 'left', transition: 'all 0.15s', opacity: savingPlan ? 0.6 : 1 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: p.color, margin: 0 }}>{p.label}</p>
                        <p style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))', margin: '2px 0 0' }}>{p.desc}</p>
                      </button>
                    ))}
                    <button onClick={() => applyTestPlan('radar_plus')} disabled={savingPlan}
                      style={{ padding: '12px 16px', borderRadius: 12, border: '1px solid hsl(var(--border))', background: 'transparent', cursor: savingPlan ? 'wait' : 'pointer', fontSize: 12, color: 'hsl(var(--muted-foreground))', whiteSpace: 'nowrap' }}>
                      ↺ Reset to Radar+
                    </button>
                  </div>
                </div>

                {/* Recent users */}
                <div style={{ background: 'hsl(var(--card))', border: '1.5px solid hsl(var(--border))', borderRadius: 16, overflow: 'hidden' }}>
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid hsl(var(--border))', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>Recent Sign-ups</span>
                    <button onClick={() => setTab('users')} style={{ fontSize: 12, color: 'hsl(var(--primary))', background: 'none', border: 'none', cursor: 'pointer' }}>View all →</button>
                  </div>
                  {users.slice(0, 5).map((u, i) => (
                    <div key={u.id} style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: i < 4 ? '1px solid hsl(var(--border))' : 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: u.id === ADMIN_ID ? 'hsl(var(--primary))' : 'hsl(var(--muted))', color: u.id === ADMIN_ID ? 'white' : 'hsl(var(--muted-foreground))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>
                          {(u.full_name || u.email).charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>{u.full_name || u.email}</p>
                          <p style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))', margin: 0 }}>{u.email}</p>
                        </div>
                      </div>
                      <span style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>{new Date(u.created_at).toLocaleDateString('en-AU')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Users */}
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
                          <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'hsl(var(--muted-foreground))', fontSize: 11, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(u => (
                        <tr key={u.id} style={{ borderTop: '1px solid hsl(var(--border))', background: u.id === ADMIN_ID ? 'hsl(var(--primary) / 0.04)' : 'transparent' }}>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ width: 28, height: 28, borderRadius: '50%', background: u.id === ADMIN_ID ? 'hsl(var(--primary))' : 'hsl(var(--muted))', color: u.id === ADMIN_ID ? 'white' : 'hsl(var(--muted-foreground))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12 }}>
                                {(u.full_name || u.email).charAt(0).toUpperCase()}
                              </div>
                              <span style={{ fontWeight: 500 }}>
                                {u.full_name || '—'}
                                {u.id === ADMIN_ID && <span style={{ marginLeft: 6, fontSize: 9, padding: '1px 5px', borderRadius: 4, background: 'hsl(var(--primary))', color: 'white', fontWeight: 700 }}>ADMIN</span>}
                              </span>
                            </div>
                          </td>
                          <td style={{ padding: '12px 16px', color: 'hsl(var(--muted-foreground))' }}>{u.email}</td>
                          <td style={{ padding: '12px 16px', color: 'hsl(var(--muted-foreground))', whiteSpace: 'nowrap' }}>{new Date(u.created_at).toLocaleDateString('en-AU')}</td>
                          <td style={{ padding: '12px 16px' }}><span style={{ fontSize: 12, fontWeight: 600, color: u.watchlist_count > 0 ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))' }}>{u.watchlist_count}</span></td>
                          <td style={{ padding: '12px 16px' }}><span style={{ fontSize: 12, fontWeight: 600, color: u.alert_count > 0 ? 'hsl(var(--success))' : 'hsl(var(--muted-foreground))' }}>{u.alert_count}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Top searches */}
            {tab === 'searches' && (
              <div style={{ background: 'hsl(var(--card))', border: '1.5px solid hsl(var(--border))', borderRadius: 16, overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid hsl(var(--border))' }}>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>Top Searched Products</span>
                  <p style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))', margin: '4px 0 0' }}>Based on price snapshots in Supabase</p>
                </div>
                {topSearches.length === 0 ? (
                  <div style={{ padding: 40, textAlign: 'center', color: 'hsl(var(--muted-foreground))', fontSize: 13 }}>No search data yet</div>
                ) : topSearches.map((s, i) => (
                  <div key={i} style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 14, borderBottom: i < topSearches.length - 1 ? '1px solid hsl(var(--border))' : 'none' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'hsl(var(--muted-foreground))', width: 24 }}>#{i + 1}</span>
                    <span style={{ fontSize: 13, fontWeight: 500, flex: 1, textTransform: 'capitalize' }}>{s.query}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ height: 6, borderRadius: 3, background: 'hsl(var(--primary))', width: Math.max(20, (s.count / topSearches[0].count) * 120) }} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'hsl(var(--primary))', width: 40, textAlign: 'right' }}>{s.count}×</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* PostHog Analytics */}
            {tab === 'analytics' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* AI Verdicts */}
                <div style={{ background: 'hsl(var(--card))', border: '1.5px solid hsl(var(--border))', borderRadius: 16, overflow: 'hidden' }}>
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid hsl(var(--border))', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>✦ AI Analysis Verdicts (30 days)</span>
                      <p style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))', margin: '4px 0 0' }}>What the AI is telling users about their products</p>
                    </div>
                    <span style={{ fontSize: 22, fontWeight: 800, color: 'hsl(var(--primary))' }}>{totalAIRequests.toLocaleString()}</span>
                  </div>
                  {aiStats.length === 0 ? (
                    <div style={{ padding: 32, textAlign: 'center', color: 'hsl(var(--muted-foreground))', fontSize: 13 }}>
                      No AI data yet — users need to click "AI Analysis" on a product card first
                    </div>
                  ) : (
                    <div style={{ padding: '16px 20px', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                      {aiStats.map((s, i) => {
                        const color = s.verdict === 'Buy Now' ? 'hsl(var(--success))' : s.verdict === 'Wait' ? 'hsl(var(--warning))' : 'hsl(var(--primary))';
                        const pct = totalAIRequests > 0 ? Math.round((s.count / totalAIRequests) * 100) : 0;
                        return (
                          <div key={i} style={{ flex: 1, minWidth: 140, padding: '16px 20px', borderRadius: 12, background: `${color}14`, border: `1px solid ${color}30`, textAlign: 'center' }}>
                            <div style={{ fontSize: 28, fontWeight: 800, color, letterSpacing: '-0.03em' }}>{pct}%</div>
                            <div style={{ fontSize: 13, fontWeight: 700, color, marginTop: 4 }}>{s.verdict}</div>
                            <div style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))', marginTop: 2 }}>{s.count.toLocaleString()} times</div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* PostHog events table */}
                <div style={{ background: 'hsl(var(--card))', border: '1.5px solid hsl(var(--border))', borderRadius: 16, overflow: 'hidden' }}>
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid hsl(var(--border))', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>📡 All Events (Last 7 days)</span>
                      <p style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))', margin: '4px 0 0' }}>Every user action tracked via PostHog</p>
                    </div>
                    <a href={`https://us.posthog.com/project/${PH_PROJECT}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: 'hsl(var(--primary))', textDecoration: 'none', fontWeight: 600 }}>
                      Open PostHog →
                    </a>
                  </div>
                  {phEvents.length === 0 ? (
                    <div style={{ padding: 32, textAlign: 'center' }}>
                      <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: 13, marginBottom: 12 }}>No events yet or PostHog API access unavailable on free tier</p>
                      <a href={`https://us.posthog.com/project/${PH_PROJECT}/insights`} target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ fontSize: 13, padding: '8px 20px', textDecoration: 'none', display: 'inline-block' }}>
                        View in PostHog dashboard →
                      </a>
                    </div>
                  ) : phEvents.map((e, i) => (
                    <div key={i} style={{ padding: '11px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: i < phEvents.length - 1 ? '1px solid hsl(var(--border))' : 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))', fontFamily: 'monospace' }}>{e.event}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <span style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>{new Date(e.last_seen).toLocaleDateString('en-AU')}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'hsl(var(--primary))', minWidth: 40, textAlign: 'right' }}>{e.count.toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Direct link to PostHog */}
                <div style={{ background: 'hsl(var(--primary) / 0.05)', border: '1px solid hsl(var(--primary) / 0.15)', borderRadius: 16, padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 14, color: 'hsl(var(--foreground))', margin: 0 }}>Full PostHog Dashboard</p>
                    <p style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))', margin: '4px 0 0' }}>Session recordings, funnels, retention, heatmaps and more</p>
                  </div>
                  <a href={`https://us.posthog.com/project/${PH_PROJECT}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, padding: '10px 20px', borderRadius: 100, background: 'hsl(var(--primary))', color: 'white', textDecoration: 'none', fontWeight: 600 }}>
                    Open PostHog →
                  </a>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
