'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { User, Mail, Lock, Trash2, Loader2, CheckCircle, AlertCircle, Eye, EyeOff, ShieldAlert, Shield, X, Users, BarChart2, Settings, Database, ArrowLeft, Bell, ShoppingCart, Activity, RefreshCw, Hash,  } from 'lucide-react';



const ADMIN_SECRET_CODE = 'SHOPRADAR_ADMIN_2024';
const ADMIN_EMAIL = 'chrismuirhead0903@gmail.com';

interface ProfileData {
  fullName: string;
  email: string;
}

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
  theme_preference: string;
}

interface AnalyticsData {
  totalUsers: number;
  totalWatchlistItems: number;
  totalPriceAlerts: number;
  totalNotifications: number;
  activeAlerts: number;
  triggeredAlerts: number;
}

interface DbTableInfo {
  name: string;
  rows: number;
  rls: boolean;
  icon: React.ElementType;
  color: string;
}

type AdminView = 'home' | 'users' | 'analytics' | 'database' | 'system';

export default function AccountSettingsClient() {
  const { user, signOut, loading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [profile, setProfile] = useState<ProfileData>({ fullName: '', email: '' });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileStatus, setProfileStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [profileError, setProfileError] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [passwordError, setPasswordError] = useState('');

  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const [adminCode, setAdminCode] = useState('');
  const [showAdminCode, setShowAdminCode] = useState(false);
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);
  const [adminCodeError, setAdminCodeError] = useState('');
  const [viewAsUser, setViewAsUser] = useState(false);

  // Admin sub-views
  const [adminView, setAdminView] = useState<AdminView>('home');
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminUsers, setAdminUsers] = useState<UserProfile[]>([]);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [dbTables, setDbTables] = useState<DbTableInfo[]>([]);

  const handleAdminCodeSubmit = () => {
    if (adminCode === ADMIN_SECRET_CODE) {
      setAdminPanelOpen(true);
      setAdminView('home');
      setAdminCode('');
      setAdminCodeError('');
    } else {
      setAdminCodeError('Invalid admin code.');
      setTimeout(() => setAdminCodeError(''), 2500);
    }
  };

  // --- Admin data fetchers ---
  const fetchUsers = async () => {
    setAdminLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, email, full_name, created_at, theme_preference')
        .order('created_at', { ascending: false });
      if (!error && data) setAdminUsers(data as UserProfile[]);
    } finally {
      setAdminLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    setAdminLoading(true);
    try {
      const [usersRes, watchlistRes, alertsRes, notifsRes] = await Promise.all([
        supabase.from('user_profiles').select('id', { count: 'exact', head: true }),
        supabase.from('watchlist_items').select('id', { count: 'exact', head: true }),
        supabase.from('price_alerts').select('id', { count: 'exact', head: true }),
        supabase.from('in_app_notifications').select('id', { count: 'exact', head: true }),
      ]);
      const [activeRes, triggeredRes] = await Promise.all([
        supabase.from('price_alerts').select('id', { count: 'exact', head: true }).eq('alert_status', 'Active'),
        supabase.from('price_alerts').select('id', { count: 'exact', head: true }).eq('alert_status', 'Triggered'),
      ]);
      setAnalyticsData({
        totalUsers: usersRes.count ?? 0,
        totalWatchlistItems: watchlistRes.count ?? 0,
        totalPriceAlerts: alertsRes.count ?? 0,
        totalNotifications: notifsRes.count ?? 0,
        activeAlerts: activeRes.count ?? 0,
        triggeredAlerts: triggeredRes.count ?? 0,
      });
    } finally {
      setAdminLoading(false);
    }
  };

  const fetchDatabase = async () => {
    setAdminLoading(true);
    try {
      const [usersRes, watchlistRes, alertsRes, notifsRes, notifSettingsRes] = await Promise.all([
        supabase.from('user_profiles').select('id', { count: 'exact', head: true }),
        supabase.from('watchlist_items').select('id', { count: 'exact', head: true }),
        supabase.from('price_alerts').select('id', { count: 'exact', head: true }),
        supabase.from('in_app_notifications').select('id', { count: 'exact', head: true }),
        supabase.from('user_notification_settings').select('id', { count: 'exact', head: true }),
      ]);
      setDbTables([
        { name: 'user_profiles', rows: usersRes.count ?? 0, rls: true, icon: Users, color: 'text-blue-500' },
        { name: 'watchlist_items', rows: watchlistRes.count ?? 0, rls: true, icon: ShoppingCart, color: 'text-green-500' },
        { name: 'price_alerts', rows: alertsRes.count ?? 0, rls: true, icon: Bell, color: 'text-orange-500' },
        { name: 'in_app_notifications', rows: notifsRes.count ?? 0, rls: true, icon: Activity, color: 'text-purple-500' },
        { name: 'user_notification_settings', rows: notifSettingsRes.count ?? 0, rls: true, icon: Settings, color: 'text-pink-500' },
      ]);
    } finally {
      setAdminLoading(false);
    }
  };

  const handleAdminNavClick = (view: AdminView) => {
    setAdminView(view);
    if (view === 'users') fetchUsers();
    else if (view === 'analytics') fetchAnalytics();
    else if (view === 'database') fetchDatabase();
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/sign-up-login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      setProfile({
        fullName: user.user_metadata?.full_name || '',
        email: user.email || '',
      });
    }
  }, [user]);

  const handleProfileSave = async () => {
    if (!user) return;
    setProfileSaving(true);
    setProfileStatus('idle');
    setProfileError('');
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: profile.fullName },
      });
      if (error) {
        setProfileError(error.message);
        setProfileStatus('error');
      } else {
        setProfileStatus('success');
        setTimeout(() => setProfileStatus('idle'), 3000);
      }
    } catch (err: any) {
      setProfileError(err.message || 'Failed to update profile');
      setProfileStatus('error');
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!user) return;
    setPasswordError('');
    if (!newPassword || newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters.');
      setPasswordStatus('error');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      setPasswordStatus('error');
      return;
    }
    setPasswordSaving(true);
    setPasswordStatus('idle');
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        setPasswordError(error.message);
        setPasswordStatus('error');
      } else {
        setPasswordStatus('success');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setPasswordStatus('idle'), 3000);
      }
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to update password');
      setPasswordStatus('error');
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user || deleteConfirm !== 'DELETE') return;
    setDeleting(true);
    setDeleteError('');
    try {
      const { error } = await supabase.rpc('delete_user_account');
      if (error) {
        setDeleteError(error.message);
        setDeleting(false);
        return;
      }
      await signOut();
      router.replace('/sign-up-login');
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete account');
      setDeleting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  // --- Admin Panel Sub-Views ---
  const renderAdminContent = () => {
    if (adminView === 'home') {
      return (
        <>
          {/* View as Normal User Toggle */}
          <div className="px-5 pt-4 pb-2">
            <button
              onClick={() => {
                setViewAsUser(v => !v);
                setAdminPanelOpen(false);
              }}
              className={`w-full flex items-center gap-3 p-3.5 rounded-xl border transition-colors text-left group ${
                viewAsUser
                  ? 'border-amber-400 bg-amber-50 dark:bg-amber-500/10' :'border-border hover:bg-muted/50'
              }`}
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${viewAsUser ? 'bg-amber-500/20' : 'bg-muted'}`}>
                <Users size={16} className={viewAsUser ? 'text-amber-500' : 'text-muted-foreground'} />
              </div>
              <div className="flex-1">
                <p className={`text-sm font-semibold transition-colors ${viewAsUser ? 'text-amber-600 dark:text-amber-400' : 'text-foreground group-hover:text-primary'}`}>
                  {viewAsUser ? 'Exit Normal User View' : 'View as Normal User'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {viewAsUser ? 'Currently previewing as a regular user' : 'See exactly what a regular user sees'}
                </p>
              </div>
              <div className={`w-10 h-5 rounded-full transition-colors flex-shrink-0 ${viewAsUser ? 'bg-amber-500' : 'bg-muted-foreground/30'}`}>
                <div className={`w-4 h-4 rounded-full bg-white shadow mt-0.5 transition-transform ${viewAsUser ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </div>
            </button>
          </div>

          <div className="p-5 space-y-3">
            {[
              { icon: Users, label: 'User Management', desc: 'View and manage all registered users', color: 'text-blue-500', bg: 'bg-blue-500/10', view: 'users' as AdminView },
              { icon: BarChart2, label: 'Analytics Dashboard', desc: 'Platform usage stats and metrics', color: 'text-green-500', bg: 'bg-green-500/10', view: 'analytics' as AdminView },
              { icon: Database, label: 'Database Overview', desc: 'Monitor database health and queries', color: 'text-purple-500', bg: 'bg-purple-500/10', view: 'database' as AdminView },
              { icon: Settings, label: 'System Settings', desc: 'Configure global platform settings', color: 'text-orange-500', bg: 'bg-orange-500/10', view: 'system' as AdminView },
            ].map(({ icon: BtnIcon, label, desc, color, bg, view }) => (
              <button
                key={label}
                onClick={() => handleAdminNavClick(view)}
                className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-border hover:bg-muted/50 transition-colors text-left group"
              >
                <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
                  <BtnIcon size={16} className={color} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{label}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
                <ArrowLeft size={14} className="text-muted-foreground rotate-180 group-hover:text-primary transition-colors" />
              </button>
            ))}
          </div>

          <div className="px-5 pb-5">
            <p className="text-xs text-muted-foreground text-center">
              🔒 Admin session active — handle with care
            </p>
          </div>
        </>
      );
    }

    if (adminView === 'users') {
      return (
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-foreground">Registered Users ({adminUsers.length})</p>
            <button onClick={fetchUsers} className="p-1.5 rounded-lg hover:bg-muted transition-colors" title="Refresh">
              <RefreshCw size={13} className={`text-muted-foreground ${adminLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          {adminLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={20} className="animate-spin text-primary" />
            </div>
          ) : adminUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No users found.</p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {adminUsers.map((u) => (
                <div key={u.id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/30">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <User size={14} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{u.full_name || 'No name'}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-muted-foreground">{u.theme_preference || 'ocean'}</p>
                    <p className="text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (adminView === 'analytics') {
      return (
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-foreground">Platform Analytics</p>
            <button onClick={fetchAnalytics} className="p-1.5 rounded-lg hover:bg-muted transition-colors" title="Refresh">
              <RefreshCw size={13} className={`text-muted-foreground ${adminLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          {adminLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={20} className="animate-spin text-primary" />
            </div>
          ) : analyticsData ? (
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Total Users', value: analyticsData.totalUsers, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                { label: 'Watchlist Items', value: analyticsData.totalWatchlistItems, icon: ShoppingCart, color: 'text-green-500', bg: 'bg-green-500/10' },
                { label: 'Price Alerts', value: analyticsData.totalPriceAlerts, icon: Bell, color: 'text-orange-500', bg: 'bg-orange-500/10' },
                { label: 'Notifications', value: analyticsData.totalNotifications, icon: Activity, color: 'text-purple-500', bg: 'bg-purple-500/10' },
                { label: 'Active Alerts', value: analyticsData.activeAlerts, icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                { label: 'Triggered Alerts', value: analyticsData.triggeredAlerts, icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-500/10' },
              ].map(({ label, value, icon: StatIcon, color, bg }) => (
                <div key={label} className="p-3 rounded-xl border border-border bg-muted/30 flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
                    <StatIcon size={14} className={color} />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-foreground leading-none">{value}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">Failed to load analytics.</p>
          )}
        </div>
      );
    }

    if (adminView === 'database') {
      return (
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-foreground">Database Tables</p>
            <button onClick={fetchDatabase} className="p-1.5 rounded-lg hover:bg-muted transition-colors" title="Refresh">
              <RefreshCw size={13} className={`text-muted-foreground ${adminLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          {adminLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={20} className="animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-2">
              {dbTables.map((table) => (
                <div key={table.name} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/30">
                  <div className={`w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0`}>
                    <table.icon size={14} className={table.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground font-mono truncate">{table.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Hash size={10} />{table.rows} rows
                      </span>
                      {table.rls && (
                        <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                          <Shield size={10} />RLS on
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" title="Healthy" />
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (adminView === 'system') {
      return (
        <div className="p-5">
          <p className="text-sm font-semibold text-foreground mb-4">System Settings</p>
          <div className="space-y-3">
            {[
              { label: 'App Name', value: 'ShopRadar', icon: Settings },
              { label: 'Site URL', value: 'shopradar6671.builtwithrocket.new', icon: Activity },
              { label: 'Auth Provider', value: 'Supabase Auth', icon: Shield },
              { label: 'Database', value: 'PostgreSQL (Supabase)', icon: Database },
              { label: 'AI Provider', value: 'Perplexity (API Route)', icon: BarChart2 },
              { label: 'Framework', value: 'Next.js 15 / React 19', icon: Hash },
            ].map(({ label, value, icon: SysIcon }) => (
              <div key={label} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/30">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  <SysIcon size={14} className="text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-sm font-medium text-foreground truncate">{value}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground text-center mt-4">Read-only system configuration</p>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="max-w-2xl mx-auto py-4">
      {/* View as Normal User Banner */}
      {viewAsUser && user?.email === ADMIN_EMAIL && (
        <div className="fixed top-0 left-0 right-0 z-[60] flex items-center justify-between gap-3 px-4 py-2.5 bg-amber-500 text-primary-foreground shadow-lg">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Users size={16} />
            Viewing as Normal User — Admin elements are hidden
          </div>
          <button
            onClick={() => setViewAsUser(false)}
            className="flex items-center gap-1.5 text-xs font-semibold bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-colors"
          >
            <Shield size={13} />
            Exit Preview
          </button>
        </div>
      )}

      {/* Admin Panel Modal */}
      {adminPanelOpen && user?.email === ADMIN_EMAIL && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-border flex-shrink-0">
              <div className="flex items-center gap-2">
                {adminView !== 'home' && (
                  <button
                    onClick={() => setAdminView('home')}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors mr-1"
                  >
                    <ArrowLeft size={15} />
                  </button>
                )}
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Shield size={16} className="text-primary" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground">
                    {adminView === 'home' && 'Admin Panel'}
                    {adminView === 'users' && 'User Management'}
                    {adminView === 'analytics' && 'Analytics Dashboard'}
                    {adminView === 'database' && 'Database Overview'}
                    {adminView === 'system' && 'System Settings'}
                  </h2>
                  <p className="text-xs text-muted-foreground">Restricted access</p>
                </div>
              </div>
              <button
                onClick={() => { setAdminPanelOpen(false); setAdminView('home'); }}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto flex-1">
              {renderAdminContent()}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className={`flex items-center gap-3 mb-8 ${viewAsUser ? 'mt-10' : ''}`}>
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <User size={20} className="text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Account Settings</h1>
          <p className="text-sm text-muted-foreground">Manage your profile and security</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Profile Info */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <User size={16} className="text-primary" />
            <h2 className="text-base font-semibold text-foreground">Profile Information</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Full Name</label>
              <input
                type="text"
                value={profile.fullName}
                onChange={(e) => setProfile((p) => ({ ...p, fullName: e.target.value }))}
                placeholder="Enter your full name"
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Mail size={13} className="text-muted-foreground" />
                  Email Address
                </span>
              </label>
              <input
                type="email"
                value={profile.email}
                disabled
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-muted text-muted-foreground text-sm cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground mt-1">Email cannot be changed here.</p>
            </div>

            {profileStatus === 'success' && (
              <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                <CheckCircle size={15} />
                Profile updated successfully.
              </div>
            )}
            {profileStatus === 'error' && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle size={15} />
                {profileError}
              </div>
            )}

            <button
              onClick={handleProfileSave}
              disabled={profileSaving}
              className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 active:scale-95 transition-all duration-150 disabled:opacity-60 flex items-center gap-2"
            >
              {profileSaving && <Loader2 size={14} className="animate-spin" />}
              Save Changes
            </button>
          </div>
        </div>

        {/* Change Password */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Lock size={16} className="text-primary" />
            <h2 className="text-base font-semibold text-foreground">Change Password</h2>
          </div>

          <div className="space-y-4">
            {[
              { label: 'Current Password', value: currentPassword, setter: setCurrentPassword, show: showCurrent, toggle: () => setShowCurrent(v => !v) },
              { label: 'New Password', value: newPassword, setter: setNewPassword, show: showNew, toggle: () => setShowNew(v => !v) },
              { label: 'Confirm New Password', value: confirmPassword, setter: setConfirmPassword, show: showConfirm, toggle: () => setShowConfirm(v => !v) },
            ].map(({ label, value, setter, show, toggle }) => (
              <div key={label}>
                <label className="block text-sm font-medium text-foreground mb-1.5">{label}</label>
                <div className="relative">
                  <input
                    type={show ? 'text' : 'password'}
                    value={value}
                    onChange={(e) => setter(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2.5 pr-10 rounded-xl border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
                  />
                  <button
                    type="button"
                    onClick={toggle}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {show ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
            ))}

            {passwordStatus === 'success' && (
              <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                <CheckCircle size={15} />
                Password updated successfully.
              </div>
            )}
            {passwordStatus === 'error' && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle size={15} />
                {passwordError}
              </div>
            )}

            <button
              onClick={handlePasswordChange}
              disabled={passwordSaving}
              className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 active:scale-95 transition-all duration-150 disabled:opacity-60 flex items-center gap-2"
            >
              {passwordSaving && <Loader2 size={14} className="animate-spin" />}
              Update Password
            </button>
          </div>
        </div>

        {/* Admin Access — only visible to admin account */}
        {user?.email === ADMIN_EMAIL && !viewAsUser && (
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Shield size={16} className="text-primary" />
              <h2 className="text-base font-semibold text-foreground">Admin Access</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Enter the admin code to access the admin panel.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Admin Code</label>
                <div className="relative">
                  <input
                    type={showAdminCode ? 'text' : 'password'}
                    value={adminCode}
                    onChange={(e) => setAdminCode(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAdminCodeSubmit()}
                    placeholder="Enter admin code"
                    className="w-full px-3 py-2.5 pr-10 rounded-xl border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminCode(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showAdminCode ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              {adminCodeError && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle size={15} />
                  {adminCodeError}
                </div>
              )}
              <button
                onClick={handleAdminCodeSubmit}
                disabled={!adminCode}
                className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 active:scale-95 transition-all duration-150 disabled:opacity-50 flex items-center gap-2"
              >
                <Shield size={14} />
                Access Admin Panel
              </button>
            </div>
          </div>
        )}

        {/* Danger Zone */}
        <div className="bg-card border border-destructive/30 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <ShieldAlert size={16} className="text-destructive" />
            <h2 className="text-base font-semibold text-destructive">Danger Zone</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Permanently delete your account and all associated data. This action cannot be undone.
          </p>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Type <span className="font-mono font-bold text-destructive">DELETE</span> to confirm
              </label>
              <input
                type="text"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder="DELETE"
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-destructive/40 transition"
              />
            </div>

            {deleteError && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle size={15} />
                {deleteError}
              </div>
            )}

            <button
              onClick={handleDeleteAccount}
              disabled={deleting || deleteConfirm !== 'DELETE'}
              className="px-5 py-2.5 rounded-xl bg-destructive text-primary-foreground text-sm font-semibold hover:opacity-90 active:scale-95 transition-all duration-150 disabled:opacity-50 flex items-center gap-2"
            >
              {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              Delete My Account
            </button>

          </div>
        </div>
      </div>
    </div>
  );
}
