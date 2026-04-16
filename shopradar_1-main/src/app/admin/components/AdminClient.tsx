'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Toaster } from 'sonner';

const ADMIN_ID = '2c8fdd0b-b3b6-4216-a541-1cf40490658a';
const PH_PROJECT = process.env.NEXT_PUBLIC_POSTHOG_PROJECT || '382608';
const PH_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.posthog.com';
const PH_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY || '';

type Tab = 'overview' | 'users' | 'searches' | 'analytics' | 'revenue' | 'system';
interface Stats { totalUsers: number; totalWatchlistItems: number; totalAlerts: number; totalSearches: number; }
interface UserRow { id: string; email: string; full_name: string; created_at: string; watchlist_count: number; alert_count: number; subscription_plan?: string; }
interface PHEvent { event: string; count: number; last_seen: string; }
interface DailyCount { date: string; count: number; }

function Sparkline({ data, color = 'hsl(var(--primary))' }: { data: number[]; color?: string }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const w = 140, h = 36;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * (h - 4) - 2}`).join(' ');
  return <svg width={w} height={h}><polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
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
  const [dailySearches, setDailySearches] = useState<DailyCount[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [testPlan, setTestPlan] = useState<string | null>(null);
  const [savingPlan, setSavingPlan] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [userDetail, setUserDetail] = useState<any>(null);
  const [loadingUserDetail, setLoadingUserDetail] = useState(false);
  const [banner, setBanner] = useState('');
  const [bannerSaving, setBannerSaving] = useState(false);
  const [currentBanner, setCurrentBanner] = useState('');
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [featuredProducts, setFeaturedProducts] = useState('');
  const [savingFeatured, setSavingFeatured] = useState(false);

  useEffect(() => {
    if (!loading && (!user || user.id !== ADMIN_ID)) router.replace('/product-search-results');
  }, [user, loading, router]);

  const fetchPostHogData = useCallback(async () => {
    try {
      const query = async (body: any) => {
        const r = await fetch(`${PH_HOST}/api/projects/${PH_PROJECT}/query/`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${PH_KEY}` }, body: JSON.stringify(body) });
        return r.ok ? r.json() : null;
      };
      const [evData, aiData] = await Promise.all([
        query({ query: { kind: 'EventsQuery', select: ['event', 'count()', 'max(timestamp)'], where: [`timestamp > now() - interval '7 days'`], groupBy: ['event'], orderBy: ['count() DESC'], limit: 20 } }),
        query({ query: { kind: 'EventsQuery', select: ['properties.verdict', 'count()'], where: [`event = 'ai_analysis_completed'`, `timestamp > now() - interval '30 days'`], groupBy: ['properties.verdict'], orderBy: ['count() DESC'] } }),
      ]);
      if (evData) setPhEvents((evData.results || []).map((r: any[]) => ({ event: r[0], count: r[1], last_seen: r[2] })));
      if (aiData) setAiStats((aiData.results || []).map((r: any[]) => ({ verdict: r[0] || 'Unknown', count: r[1] })));
    } catch {}
  }, []);

  const fetchData = useCallback(async () => {
    if (!user || user.id !== ADMIN_ID) return;
    setLoadingData(true);
    try {
      const [{ count: uc }, { count: wc }, { count: ac }, { count: sc }, { data: profiles }, { data: snaps }] = await Promise.all([
        supabase.from('user_profiles').select('*', { count: 'exact', head: true }),
        supabase.from('watchlist_items').select('*', { count: 'exact', head: true }),
        supabase.from('price_alerts').select('*', { count: 'exact', head: true }),
        supabase.from('price_snapshots').select('*', { count: 'exact', head: true }),
        supabase.from('user_profiles').select('id, email, full_name, created_at, subscription_plan').order('created_at', { ascending: false }).limit(50),
        supabase.from('price_snapshots').select('product_query, snapshot_date').order('snapshot_date', { ascending: false }).limit(500),
      ]);
      setStats({ totalUsers: uc || 0, totalWatchlistItems: wc || 0, totalAlerts: ac || 0, totalSearches: sc || 0 });

      const enriched = await Promise.all((profiles || []).map(async (u: any) => {
        const [{ count: wcnt }, { count: acnt }] = await Promise.all([
          supabase.from('watchlist_items').select('*', { count: 'exact', head: true }).eq('user_id', u.id),
          supabase.from('price_alerts').select('*', { count: 'exact', head: true }).eq('user_id', u.id),
        ]);
        return { ...u, watchlist_count: wcnt || 0, alert_count: acnt || 0 };
      }));
      setUsers(enriched);

      const grouped: Record<string, number> = {};
      const daily: Record<string, number> = {};
      for (const s of snaps || []) {
        grouped[s.product_query] = (grouped[s.product_query] || 0) + 1;
        daily[s.snapshot_date] = (daily[s.snapshot_date] || 0) + 1;
      }
      setTopSearches(Object.entries(grouped).sort((a, b) => b[1] - a[1]).slice(0, 30).map(([query, count]) => ({ query, count })));
      setDailySearches(Object.entries(daily).sort((a, b) => a[0].localeCompare(b[0])).slice(-30).map(([date, count]) => ({ date, count })));

      const { data: bd } = await supabase.from('admin_settings').select('value').eq('key', 'announcement_banner').single();
      if (bd) setCurrentBanner(bd.value);
      const { data: fd } = await supabase.from('admin_settings').select('value').eq('key', 'featured_products').single();
      if (fd) setFeaturedProducts(fd.value);

      await fetchPostHogData();
    } catch (e) { console.error(e); }
    finally { setLoadingData(false); }
  }, [user, supabase, fetchPostHogData]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const applyTestPlan = async (plan: string) => {
    setSavingPlan(true);
    try {
      await supabase.from('user_profiles').update({ subscription_plan: plan, subscription_status: plan === 'free' ? 'inactive' : 'active' }).eq('id', ADMIN_ID);
      setTestPlan(plan);
      toast.success(`Switched to ${plan === 'radar_plus' ? 'Radar+' : plan} — refresh app to see changes`);
    } catch { toast.error('Failed'); } finally { setSavingPlan(false); }
  };

  const setUserPlan = async (userId: string, plan: string) => {
    const { error } = await supabase.from('user_profiles').update({ subscription_plan: plan, subscription_status: plan === 'free' ? 'inactive' : 'active' }).eq('id', userId);
    if (error) { toast.error('Failed'); return; }
    setUsers(p => p.map(u => u.id === userId ? { ...u, subscription_plan: plan } : u));
    toast.success(`Plan updated`);
  };

  const loadUserDetail = async (u: UserRow) => {
    setSelectedUser(u); setLoadingUserDetail(true);
    try {
      const [{ data: wl }, { data: al }] = await Promise.all([
        supabase.from('watchlist_items').select('product_name, marketplace, price').eq('user_id', u.id).limit(8),
        supabase.from('price_alerts').select('product_name, target_price, alert_status').eq('user_id', u.id).limit(8),
      ]);
      setUserDetail({ watchlist: wl || [], alerts: al || [] });
    } catch {} finally { setLoadingUserDetail(false); }
  };

  const saveBanner = async () => {
    setBannerSaving(true);
    await supabase.from('admin_settings').upsert({ key: 'announcement_banner', value: banner });
    setCurrentBanner(banner); toast.success('Banner saved');
    setBannerSaving(false);
  };

  const saveFeatured = async () => {
    setSavingFeatured(true);
    await supabase.from('admin_settings').upsert({ key: 'featured_products', value: featuredProducts });
    toast.success('Saved'); setSavingFeatured(false);
  };

  if (loading || !user || user.id !== ADMIN_ID) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ width: 24, height: 24, border: '2px solid hsl(var(--primary))', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.75s linear infinite' }} /></div>;

  const paidUsers = users.filter(u => u.subscription_plan && u.subscription_plan !== 'free').length;
  const proUsers = users.filter(u => u.subscription_plan === 'pro').length;
  const radarUsers = users.filter(u => u.subscription_plan === 'radar_plus').length;
  const estMRR = (proUsers * 7.99 + radarUsers * 14.99).toFixed(2);
  const totalAI = aiStats.reduce((s, a) => s + a.count, 0);

  const TABS: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' }, { id: 'users', label: 'Users' }, { id: 'searches', label: 'Searches' },
    { id: 'analytics', label: '✦ Analytics' }, { id: 'revenue', label: '$ Revenue' }, { id: 'system', label: '⚙ System' },
  ];

  const Ch = ({ children, mb = 16 }: { children: React.ReactNode; mb?: number }) => (
    <div style={{ background: 'hsl(var(--card))', border: '1.5px solid hsl(var(--border))', borderRadius: 16, overflow: 'hidden', marginBottom: mb }}>{children}</div>
  );
  const Hd = ({ t, s, r }: { t: string; s?: string; r?: React.ReactNode }) => (
    <div style={{ padding: '14px 20px', borderBottom: '1px solid hsl(var(--border))', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div><span style={{ fontWeight: 700, fontSize: 14 }}>{t}</span>{s && <p style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))', margin: '2px 0 0' }}>{s}</p>}</div>
      {r}
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'hsl(var(--background))', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
      <Toaster position="bottom-right" richColors />
      <div style={{ borderBottom: '1px solid hsl(var(--border))', background: 'hsl(var(--card))', padding: '0 32px', position: 'sticky', top: 0, zIndex: 40 }}>
        <div style={{ maxWidth: 1300, margin: '0 auto', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'hsl(var(--success))', boxShadow: '0 0 8px hsl(var(--success))' }} />
            <span style={{ fontWeight: 800, fontSize: 16 }}>ShopRadar Admin</span>
            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 100, background: 'hsl(var(--primary) / 0.1)', color: 'hsl(var(--primary))', fontWeight: 700 }}>RESTRICTED</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={fetchData} style={{ fontSize: 12, padding: '6px 14px', borderRadius: 100, border: '1px solid hsl(var(--border))', background: 'transparent', color: 'hsl(var(--muted-foreground))', cursor: 'pointer' }}>↻ Refresh</button>
            <button onClick={() => router.push('/product-search-results')} style={{ fontSize: 12, padding: '6px 14px', borderRadius: 100, border: 'none', background: 'hsl(var(--primary))', color: 'white', cursor: 'pointer', fontWeight: 600 }}>← Back to app</button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1300, margin: '0 auto', padding: '28px 24px 80px' }}>
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'hsl(var(--muted))', borderRadius: 12, padding: 4, width: 'fit-content', border: '1px solid hsl(var(--border))', flexWrap: 'wrap' }}>
          {TABS.map(t => <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: tab === t.id ? 700 : 400, background: tab === t.id ? 'hsl(var(--card))' : 'transparent', color: tab === t.id ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))', transition: 'all 0.15s', boxShadow: tab === t.id ? '0 1px 6px rgba(0,0,0,0.08)' : 'none', whiteSpace: 'nowrap' }}>{t.label}</button>)}
        </div>

        {loadingData ? <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div style={{ width: 24, height: 24, border: '2px solid hsl(var(--primary))', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.75s linear infinite' }} /></div> : <>

          {tab === 'overview' && <div>
            {/* Plan tester */}
            <div style={{ background: 'hsl(var(--card))', border: '1.5px solid hsl(var(--primary) / 0.3)', borderRadius: 16, padding: '20px 24px', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
                <div><p style={{ fontWeight: 700, fontSize: 14, margin: 0 }}>🧪 Test Plan Features</p><p style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))', margin: '3px 0 0' }}>Switch your account to test what each plan looks like</p></div>
                {testPlan && <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 100, background: 'hsl(var(--success) / 0.1)', color: 'hsl(var(--success))', fontWeight: 700, border: '1px solid hsl(var(--success) / 0.3)' }}>Testing: {testPlan === 'radar_plus' ? 'Radar+' : testPlan}</span>}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[{ id: 'free', label: 'Free', desc: '5 searches/day', color: 'hsl(var(--muted-foreground))' }, { id: 'pro', label: 'Pro', desc: 'Unlimited + AI', color: 'hsl(var(--primary))' }, { id: 'radar_plus', label: 'Radar+', desc: 'Everything', color: 'hsl(var(--success))' }].map(p => (
                  <button key={p.id} onClick={() => applyTestPlan(p.id)} disabled={savingPlan} style={{ flex: 1, minWidth: 110, padding: '11px 14px', borderRadius: 12, border: `1.5px solid ${testPlan === p.id ? p.color : 'hsl(var(--border))'}`, background: 'hsl(var(--muted) / 0.5)', cursor: 'pointer', textAlign: 'left' }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: p.color, margin: 0 }}>{p.label}</p>
                    <p style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))', margin: '2px 0 0' }}>{p.desc}</p>
                  </button>
                ))}
                <button onClick={() => applyTestPlan('radar_plus')} style={{ padding: '11px 14px', borderRadius: 12, border: '1px solid hsl(var(--border))', background: 'transparent', cursor: 'pointer', fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>↺ Reset</button>
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))', gap: 12, marginBottom: 16 }}>
              {[{ l: 'Total Users', v: stats?.totalUsers || 0, c: 'hsl(var(--primary))', i: '👤' }, { l: 'Paid Users', v: paidUsers, c: 'hsl(var(--success))', i: '💳' }, { l: 'Watchlist Items', v: stats?.totalWatchlistItems || 0, c: 'hsl(var(--destructive))', i: '♥' }, { l: 'Price Alerts', v: stats?.totalAlerts || 0, c: 'hsl(var(--warning))', i: '🔔' }, { l: 'Price Snapshots', v: stats?.totalSearches || 0, c: 'hsl(var(--primary))', i: '📊' }, { l: 'AI Analyses', v: totalAI, c: 'hsl(218 100% 60%)', i: '✦' }].map((s, i) => (
                <div key={i} style={{ background: 'hsl(var(--card))', border: '1.5px solid hsl(var(--border))', borderRadius: 14, padding: '16px 18px' }}>
                  <div style={{ fontSize: 18, marginBottom: 6 }}>{s.i}</div>
                  <div style={{ fontWeight: 800, fontSize: 24, color: s.c, letterSpacing: '-0.03em' }}>{s.v.toLocaleString()}</div>
                  <div style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))', marginTop: 3 }}>{s.l}</div>
                </div>
              ))}
            </div>

            {/* Sparkline */}
            <Ch mb={16}><Hd t="Search Trend (30 days)" s="Daily searches" />
              <div style={{ padding: '18px 24px', display: 'flex', alignItems: 'center', gap: 20 }}>
                <Sparkline data={dailySearches.map(d => d.count)} />
                <div><p style={{ fontSize: 22, fontWeight: 800, color: 'hsl(var(--primary))', margin: 0 }}>{dailySearches.reduce((a, b) => a + b.count, 0).toLocaleString()}</p><p style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))', margin: '2px 0 0' }}>total last 30 days</p></div>
              </div>
            </Ch>

            {/* Banner */}
            <Ch mb={16}><Hd t="📢 Announcement Banner" s={currentBanner ? `Active: "${currentBanner}"` : 'No banner'} />
              <div style={{ padding: '14px 20px', display: 'flex', gap: 8 }}>
                <input value={banner} onChange={e => setBanner(e.target.value)} placeholder="Message to show all users..." style={{ flex: 1, padding: '8px 14px', borderRadius: 10, border: '1.5px solid hsl(var(--border))', background: 'hsl(var(--muted))', color: 'hsl(var(--foreground))', fontSize: 13, outline: 'none' }} />
                <button onClick={saveBanner} disabled={bannerSaving || !banner} style={{ padding: '8px 16px', borderRadius: 10, background: 'hsl(var(--primary))', color: 'white', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, opacity: !banner ? 0.5 : 1 }}>Save</button>
                {currentBanner && <button onClick={async () => { await supabase.from('admin_settings').upsert({ key: 'announcement_banner', value: '' }); setCurrentBanner(''); setBanner(''); toast.success('Banner cleared'); }} style={{ padding: '8px 14px', borderRadius: 10, background: 'hsl(var(--destructive) / 0.1)', color: 'hsl(var(--destructive))', border: 'none', cursor: 'pointer', fontSize: 13 }}>Clear</button>}
              </div>
            </Ch>

            {/* Recent users */}
            <Ch mb={0}><Hd t="Recent Sign-ups" r={<button onClick={() => setTab('users')} style={{ fontSize: 12, color: 'hsl(var(--primary))', background: 'none', border: 'none', cursor: 'pointer' }}>View all →</button>} />
              {users.slice(0, 5).map((u, i) => (
                <div key={u.id} onClick={() => { setTab('users'); loadUserDetail(u); }} style={{ padding: '11px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: i < 4 ? '1px solid hsl(var(--border))' : 'none', cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'hsl(var(--muted))'} onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'none'}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'hsl(var(--primary))', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12 }}>{(u.full_name || u.email).charAt(0).toUpperCase()}</div>
                    <div><p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>{u.full_name || u.email}</p><p style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))', margin: 0 }}>{u.email}</p></div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 6, background: u.subscription_plan !== 'free' && u.subscription_plan ? 'hsl(var(--success) / 0.1)' : 'hsl(var(--muted))', color: u.subscription_plan !== 'free' && u.subscription_plan ? 'hsl(var(--success))' : 'hsl(var(--muted-foreground))', fontWeight: 600 }}>{u.subscription_plan || 'free'}</span>
                    <span style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>{new Date(u.created_at).toLocaleDateString('en-AU')}</span>
                  </div>
                </div>
              ))}
            </Ch>
          </div>}

          {tab === 'users' && <div style={{ display: 'grid', gridTemplateColumns: selectedUser ? '1fr 360px' : '1fr', gap: 16, alignItems: 'start' }}>
            <Ch mb={0}><Hd t={`${users.length} Users`} />
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead><tr style={{ background: 'hsl(var(--muted) / 0.5)' }}>
                    {['User', 'Email', 'Plan', 'Joined', 'W', 'A', ''].map((h, i) => <th key={i} style={{ padding: '9px 14px', textAlign: 'left', fontWeight: 600, color: 'hsl(var(--muted-foreground))', fontSize: 10, letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>)}
                  </tr></thead>
                  <tbody>{users.map(u => (
                    <tr key={u.id} onClick={() => loadUserDetail(u)} style={{ borderTop: '1px solid hsl(var(--border))', cursor: 'pointer', background: selectedUser?.id === u.id ? 'hsl(var(--primary) / 0.04)' : 'transparent' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'hsl(var(--muted) / 0.4)'} onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = selectedUser?.id === u.id ? 'hsl(var(--primary) / 0.04)' : 'transparent'}>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 26, height: 26, borderRadius: '50%', background: u.id === ADMIN_ID ? 'hsl(var(--primary))' : 'hsl(var(--muted))', color: u.id === ADMIN_ID ? 'white' : 'hsl(var(--muted-foreground))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11, flexShrink: 0 }}>{(u.full_name || u.email).charAt(0).toUpperCase()}</div>
                          <span style={{ fontWeight: 500, fontSize: 12 }}>{u.full_name || '—'}{u.id === ADMIN_ID && <span style={{ marginLeft: 4, fontSize: 8, padding: '1px 4px', borderRadius: 3, background: 'hsl(var(--primary))', color: 'white', fontWeight: 700 }}>ADMIN</span>}</span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px', color: 'hsl(var(--muted-foreground))', fontSize: 11 }}>{u.email}</td>
                      <td style={{ padding: '10px 14px' }} onClick={e => e.stopPropagation()}>
                        <select value={u.subscription_plan || 'free'} onChange={e => setUserPlan(u.id, e.target.value)} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))', color: 'hsl(var(--foreground))', cursor: 'pointer' }}>
                          <option value="free">Free</option><option value="pro">Pro</option><option value="radar_plus">Radar+</option>
                        </select>
                      </td>
                      <td style={{ padding: '10px 14px', color: 'hsl(var(--muted-foreground))', fontSize: 11, whiteSpace: 'nowrap' }}>{new Date(u.created_at).toLocaleDateString('en-AU')}</td>
                      <td style={{ padding: '10px 14px' }}><span style={{ fontSize: 12, fontWeight: 600, color: u.watchlist_count > 0 ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))' }}>{u.watchlist_count}</span></td>
                      <td style={{ padding: '10px 14px' }}><span style={{ fontSize: 12, fontWeight: 600, color: u.alert_count > 0 ? 'hsl(var(--success))' : 'hsl(var(--muted-foreground))' }}>{u.alert_count}</span></td>
                      <td style={{ padding: '10px 14px' }}><button onClick={e => { e.stopPropagation(); loadUserDetail(u); }} style={{ fontSize: 11, padding: '3px 9px', borderRadius: 6, border: '1px solid hsl(var(--border))', background: 'transparent', cursor: 'pointer', color: 'hsl(var(--muted-foreground))' }}>View</button></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </Ch>
            {selectedUser && <div style={{ background: 'hsl(var(--card))', border: '1.5px solid hsl(var(--border))', borderRadius: 16, overflow: 'hidden', position: 'sticky', top: 72 }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid hsl(var(--border))', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>User Detail</span>
                <button onClick={() => { setSelectedUser(null); setUserDetail(null); }} style={{ fontSize: 20, background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--muted-foreground))', lineHeight: 1 }}>×</button>
              </div>
              <div style={{ padding: '16px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'hsl(var(--primary))', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15 }}>{(selectedUser.full_name || selectedUser.email).charAt(0).toUpperCase()}</div>
                  <div><p style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>{selectedUser.full_name || 'No name'}</p><p style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))', margin: 0 }}>{selectedUser.email}</p></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                  {[{ l: 'Plan', v: selectedUser.subscription_plan || 'free' }, { l: 'Watchlist', v: selectedUser.watchlist_count }, { l: 'Alerts', v: selectedUser.alert_count }, { l: 'Joined', v: new Date(selectedUser.created_at).toLocaleDateString('en-AU') }].map((s, i) => (
                    <div key={i} style={{ padding: '10px 12px', background: 'hsl(var(--muted))', borderRadius: 10, textAlign: 'center' }}>
                      <p style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>{String(s.v)}</p>
                      <p style={{ fontSize: 10, color: 'hsl(var(--muted-foreground))', margin: '2px 0 0' }}>{s.l}</p>
                    </div>
                  ))}
                </div>
                {loadingUserDetail ? <p style={{ textAlign: 'center', color: 'hsl(var(--muted-foreground))', fontSize: 13 }}>Loading...</p> : userDetail && <>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'hsl(var(--muted-foreground))', letterSpacing: '0.05em', textTransform: 'uppercase', margin: '0 0 8px' }}>Watchlist</p>
                  {userDetail.watchlist.length === 0 ? <p style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>Empty</p> : userDetail.watchlist.map((w: any, i: number) => (
                    <div key={i} style={{ padding: '6px 0', borderBottom: '1px solid hsl(var(--border))' }}>
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 500 }}>{w.product_name}</p>
                      <p style={{ margin: 0, fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>{w.marketplace} · A${w.price}</p>
                    </div>
                  ))}
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'hsl(var(--muted-foreground))', letterSpacing: '0.05em', textTransform: 'uppercase', margin: '14px 0 8px' }}>Alerts</p>
                  {userDetail.alerts.length === 0 ? <p style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>None</p> : userDetail.alerts.map((a: any, i: number) => (
                    <div key={i} style={{ padding: '6px 0', borderBottom: '1px solid hsl(var(--border))' }}>
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 500 }}>{a.product_name}</p>
                      <p style={{ margin: 0, fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>Target: A${a.target_price} · {a.alert_status}</p>
                    </div>
                  ))}
                </>}
              </div>
            </div>}
          </div>}

          {tab === 'searches' && <Ch mb={0}><Hd t="Top Searched Products" s="Based on price snapshots" />
            {topSearches.length === 0 ? <div style={{ padding: 40, textAlign: 'center', color: 'hsl(var(--muted-foreground))', fontSize: 13 }}>No data yet</div>
              : topSearches.map((s, i) => <div key={i} style={{ padding: '11px 20px', display: 'flex', alignItems: 'center', gap: 14, borderBottom: i < topSearches.length - 1 ? '1px solid hsl(var(--border))' : 'none' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'hsl(var(--muted-foreground))', width: 28 }}>#{i + 1}</span>
                <span style={{ fontSize: 13, fontWeight: 500, flex: 1, textTransform: 'capitalize' }}>{s.query}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ height: 5, borderRadius: 3, background: 'hsl(var(--primary))', width: Math.max(16, (s.count / topSearches[0].count) * 100) }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'hsl(var(--primary))', width: 36, textAlign: 'right' }}>{s.count}×</span>
                </div>
              </div>)}
          </Ch>}

          {tab === 'analytics' && <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Ch mb={0}><Hd t="✦ AI Verdicts (30 days)" s="What the AI tells users" r={<span style={{ fontSize: 20, fontWeight: 800, color: 'hsl(var(--primary))' }}>{totalAI.toLocaleString()}</span>} />
              {aiStats.length === 0 ? <div style={{ padding: 32, textAlign: 'center', color: 'hsl(var(--muted-foreground))', fontSize: 13 }}>No AI data yet</div>
                : <div style={{ padding: '16px 20px', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {aiStats.map((s, i) => { const c = s.verdict === 'Buy Now' ? 'hsl(var(--success))' : s.verdict === 'Wait' ? 'hsl(var(--warning))' : 'hsl(var(--primary))'; const pct = totalAI > 0 ? Math.round((s.count / totalAI) * 100) : 0; return <div key={i} style={{ flex: 1, minWidth: 120, padding: '14px', borderRadius: 12, background: `${c}14`, border: `1px solid ${c}30`, textAlign: 'center' }}><div style={{ fontSize: 26, fontWeight: 800, color: c }}>{pct}%</div><div style={{ fontSize: 12, fontWeight: 700, color: c, marginTop: 3 }}>{s.verdict}</div><div style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))', marginTop: 2 }}>{s.count.toLocaleString()}×</div></div>; })}
                </div>}
            </Ch>
            <Ch mb={0}><Hd t="Conversion Funnel" />
              <div style={{ padding: '18px 20px', display: 'flex', gap: 4, alignItems: 'stretch' }}>
                {[{ l: 'Searches', v: stats?.totalSearches || 0, c: 'hsl(var(--primary))' }, { l: 'Watchlist', v: stats?.totalWatchlistItems || 0, c: 'hsl(218 100% 60%)' }, { l: 'Alerts', v: stats?.totalAlerts || 0, c: 'hsl(var(--success))' }].map((f, i, arr) => <React.Fragment key={i}><div style={{ flex: 1, padding: '12px', background: `${f.c}10`, borderRadius: i === 0 ? '10px 0 0 10px' : i === arr.length - 1 ? '0 10px 10px 0' : 0, border: `1px solid ${f.c}25`, textAlign: 'center' }}><div style={{ fontSize: 20, fontWeight: 800, color: f.c }}>{f.v.toLocaleString()}</div><div style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))', marginTop: 3 }}>{f.l}</div>{i > 0 && arr[i-1].v > 0 && <div style={{ fontSize: 10, color: f.c, marginTop: 3, fontWeight: 700 }}>{Math.round((f.v / arr[i-1].v) * 100)}%</div>}</div>{i < arr.length - 1 && <div style={{ display: 'flex', alignItems: 'center', color: 'hsl(var(--muted-foreground))', padding: '0 2px', fontSize: 16 }}>→</div>}</React.Fragment>)}
              </div>
            </Ch>
            <Ch mb={0}><Hd t="📡 Events (7 days)" r={<a href={`https://us.posthog.com/project/${PH_PROJECT}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: 'hsl(var(--primary))', textDecoration: 'none' }}>PostHog →</a>} />
              {phEvents.length === 0 ? <div style={{ padding: 32, textAlign: 'center' }}><p style={{ color: 'hsl(var(--muted-foreground))', fontSize: 13, marginBottom: 12 }}>No data or PostHog API unavailable on free tier</p><a href={`https://us.posthog.com/project/${PH_PROJECT}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, padding: '8px 18px', borderRadius: 100, background: 'hsl(var(--primary))', color: 'white', textDecoration: 'none' }}>Open PostHog →</a></div>
                : phEvents.map((e, i) => <div key={i} style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: i < phEvents.length - 1 ? '1px solid hsl(var(--border))' : 'none' }}><span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: 'hsl(var(--muted))', fontFamily: 'monospace', color: 'hsl(var(--muted-foreground))' }}>{e.event}</span><div style={{ display: 'flex', gap: 14, alignItems: 'center' }}><span style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>{new Date(e.last_seen).toLocaleDateString('en-AU')}</span><span style={{ fontSize: 13, fontWeight: 700, color: 'hsl(var(--primary))' }}>{e.count.toLocaleString()}</span></div></div>)}
            </Ch>
          </div>}

          {tab === 'revenue' && <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(185px, 1fr))', gap: 12 }}>
              {[{ l: 'Est. MRR', v: `A$${estMRR}`, s: 'Monthly recurring revenue', c: 'hsl(var(--success))' }, { l: 'Pro Users', v: proUsers, s: 'A$7.99/mo each', c: 'hsl(var(--primary))' }, { l: 'Radar+ Users', v: radarUsers, s: 'A$14.99/mo each', c: 'hsl(218 100% 60%)' }, { l: 'Free Users', v: (stats?.totalUsers || 0) - paidUsers, s: 'Conversion targets', c: 'hsl(var(--muted-foreground))' }].map((s, i) => (
                <div key={i} style={{ background: 'hsl(var(--card))', border: '1.5px solid hsl(var(--border))', borderRadius: 16, padding: '18px 20px' }}>
                  <div style={{ fontSize: 26, fontWeight: 800, color: s.c, letterSpacing: '-0.03em' }}>{typeof s.v === 'number' ? s.v.toLocaleString() : s.v}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginTop: 4 }}>{s.l}</div>
                  <div style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))', marginTop: 3 }}>{s.s}</div>
                </div>
              ))}
            </div>
            <Ch mb={0}><Hd t="Stripe" />
              <div style={{ padding: '16px 20px', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {[['Payments', 'https://dashboard.stripe.com/test/payments'], ['Subscriptions', 'https://dashboard.stripe.com/test/subscriptions'], ['Customers', 'https://dashboard.stripe.com/test/customers']].map(([l, u]) => <a key={l} href={u} target="_blank" rel="noopener noreferrer" style={{ padding: '9px 18px', borderRadius: 100, background: 'hsl(var(--primary))', color: 'white', textDecoration: 'none', fontWeight: 600, fontSize: 13 }}>{l} →</a>)}
              </div>
            </Ch>
            <Ch mb={0}><Hd t={`${paidUsers} Paid Users`} />
              {users.filter(u => u.subscription_plan && u.subscription_plan !== 'free').length === 0
                ? <div style={{ padding: 32, textAlign: 'center', color: 'hsl(var(--muted-foreground))', fontSize: 13 }}>No paid users yet</div>
                : users.filter(u => u.subscription_plan && u.subscription_plan !== 'free').map((u, i, arr) => (
                  <div key={u.id} style={{ padding: '11px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: i < arr.length - 1 ? '1px solid hsl(var(--border))' : 'none' }}>
                    <div><p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>{u.full_name || u.email}</p><p style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))', margin: 0 }}>{u.email}</p></div>
                    <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 100, background: 'hsl(var(--success) / 0.1)', color: 'hsl(var(--success))', fontWeight: 700 }}>{u.subscription_plan === 'radar_plus' ? 'Radar+ · A$14.99' : 'Pro · A$7.99'}/mo</span>
                  </div>
                ))}
            </Ch>
          </div>}

          {tab === 'system' && <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Ch mb={0}><Hd t="⚡ API Health" />
              <div style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[['SerpAPI', 'https://serpapi.com'], ['Google Custom Search', 'https://console.cloud.google.com'], ['Gemini AI', 'https://ai.google.dev'], ['Stripe', 'https://dashboard.stripe.com'], ['PostHog', `https://us.posthog.com/project/${PH_PROJECT}`], ['Supabase', 'https://supabase.com/dashboard']].map(([n, u]) => (
                  <div key={n} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 14px', borderRadius: 10, background: 'hsl(var(--muted) / 0.4)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><div style={{ width: 7, height: 7, borderRadius: '50%', background: 'hsl(var(--success))', boxShadow: '0 0 5px hsl(var(--success))' }} /><span style={{ fontSize: 13, fontWeight: 600 }}>{n}</span></div>
                    <a href={u} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: 'hsl(var(--primary))', textDecoration: 'none' }}>Dashboard →</a>
                  </div>
                ))}
              </div>
            </Ch>
            <Ch mb={0}><Hd t="⭐ Featured Products" s="Shown in the app mockup hero (one per line)" />
              <div style={{ padding: '14px 20px' }}>
                <textarea value={featuredProducts} onChange={e => setFeaturedProducts(e.target.value)} placeholder={'Sony WH-1000XM5\niPhone 15 Pro\nSamsung 4K TV'} rows={5} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid hsl(var(--border))', background: 'hsl(var(--muted))', color: 'hsl(var(--foreground))', fontSize: 13, outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                <button onClick={saveFeatured} disabled={savingFeatured} style={{ marginTop: 10, padding: '8px 18px', borderRadius: 100, background: 'hsl(var(--primary))', color: 'white', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>{savingFeatured ? 'Saving…' : 'Save'}</button>
              </div>
            </Ch>
            <Ch mb={0}><Hd t="📣 Broadcast Message" s="Requires email provider (Resend/SendGrid)" />
              <div style={{ padding: '14px 20px' }}>
                <textarea value={broadcastMsg} onChange={e => setBroadcastMsg(e.target.value)} placeholder="Message to all users..." rows={4} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid hsl(var(--border))', background: 'hsl(var(--muted))', color: 'hsl(var(--foreground))', fontSize: 13, outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                <div style={{ display: 'flex', gap: 10, marginTop: 10, alignItems: 'center' }}>
                  <button onClick={() => toast.info('Connect Resend or SendGrid to enable broadcasts')} disabled={!broadcastMsg} style={{ padding: '8px 18px', borderRadius: 100, background: 'hsl(var(--primary))', color: 'white', border: 'none', cursor: broadcastMsg ? 'pointer' : 'not-allowed', fontSize: 13, fontWeight: 600, opacity: broadcastMsg ? 1 : 0.5 }}>Send to {stats?.totalUsers || 0} users</button>
                  <span style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>Requires email integration</span>
                </div>
              </div>
            </Ch>
          </div>}
        </>}
      </div>
    </div>
  );
}
