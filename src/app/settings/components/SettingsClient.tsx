'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { Bell, Mail, Zap, CheckCircle, AlertCircle, Loader2, Settings, Send } from 'lucide-react';

interface NotificationSettings {
  notificationFrequency: string;
  priceDropAlerts: boolean;
  backInStockAlerts: boolean;
  dealAlerts: boolean;
  watchlistUpdates: boolean;
  emailPriceDrop: boolean;
  emailBackInStock: boolean;
  emailDeals: boolean;
  emailWatchlistSummary: boolean;
  emailWeeklyDigest: boolean;
}

const defaultSettings: NotificationSettings = {
  notificationFrequency: 'daily',
  priceDropAlerts: true,
  backInStockAlerts: true,
  dealAlerts: true,
  watchlistUpdates: true,
  emailPriceDrop: true,
  emailBackInStock: false,
  emailDeals: true,
  emailWatchlistSummary: false,
  emailWeeklyDigest: true,
};

const frequencyOptions = [
  { value: 'realtime', label: 'Real-time', description: 'Instant alerts as they happen' },
  { value: 'hourly', label: 'Hourly', description: 'Bundled every hour' },
  { value: 'daily', label: 'Daily', description: 'Once a day digest' },
  { value: 'weekly', label: 'Weekly', description: 'Weekly summary only' },
];

interface ToggleProps {
  checked: boolean;
  onChange: (val: boolean) => void;
  disabled?: boolean;
}

function Toggle({ checked, onChange, disabled = false }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/40 ${
        checked ? 'bg-primary' : 'bg-muted-foreground/30'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

interface SettingRowProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (val: boolean) => void;
  disabled?: boolean;
}

function SettingRow({ label, description, checked, onChange, disabled }: SettingRowProps) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex-1 pr-4">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <Toggle checked={checked} onChange={onChange} disabled={disabled} />
    </div>
  );
}

export default function SettingsClient() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [testEmailStatus, setTestEmailStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [testEmailMsg, setTestEmailMsg] = useState('');

  const loadSettings = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_notification_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.log('Load settings error:', error.message);
      } else if (data) {
        setSettings({
          notificationFrequency: data.notification_frequency,
          priceDropAlerts: data.price_drop_alerts,
          backInStockAlerts: data.back_in_stock_alerts,
          dealAlerts: data.deal_alerts,
          watchlistUpdates: data.watchlist_updates,
          emailPriceDrop: data.email_price_drop,
          emailBackInStock: data.email_back_in_stock,
          emailDeals: data.email_deals,
          emailWatchlistSummary: data.email_watchlist_summary,
          emailWeeklyDigest: data.email_weekly_digest,
        });
      }
    } catch (err: any) {
      console.log('Settings load failed:', err.message);
    } finally {
      setLoading(false);
    }
  }, [user, supabase]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/sign-up-login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      loadSettings();
    }
  }, [user, loadSettings]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setSaveStatus('idle');
    setErrorMsg('');

    try {
      const payload = {
        user_id: user.id,
        notification_frequency: settings.notificationFrequency,
        price_drop_alerts: settings.priceDropAlerts,
        back_in_stock_alerts: settings.backInStockAlerts,
        deal_alerts: settings.dealAlerts,
        watchlist_updates: settings.watchlistUpdates,
        email_price_drop: settings.emailPriceDrop,
        email_back_in_stock: settings.emailBackInStock,
        email_deals: settings.emailDeals,
        email_watchlist_summary: settings.emailWatchlistSummary,
        email_weekly_digest: settings.emailWeeklyDigest,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('user_notification_settings')
        .upsert(payload, { onConflict: 'user_id' });

      if (error) {
        console.log('Save settings error:', error.message);
        setErrorMsg(error.message);
        setSaveStatus('error');
      } else {
        setSaveStatus('success');
        setTimeout(() => setSaveStatus('idle'), 3000);
      }
    } catch (err: any) {
      console.log('Save failed:', err.message);
      setErrorMsg(err.message || 'Failed to save settings');
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  };

  const handleSendTestEmails = async () => {
    if (!user?.email) return;
    setSendingTest(true);
    setTestEmailStatus('idle');
    setTestEmailMsg('');

    try {
      const res = await fetch('/api/send-test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, type: 'both' }),
      });

      const data = await res.json();

      if (!res.ok) {
        setTestEmailStatus('error');
        setTestEmailMsg(data.error || 'Failed to send test emails');
      } else {
        setTestEmailStatus('success');
        setTestEmailMsg(`Test emails sent to ${user.email}! Check your inbox.`);
        setTimeout(() => setTestEmailStatus('idle'), 6000);
      }
    } catch (err: any) {
      setTestEmailStatus('error');
      setTestEmailMsg(err.message || 'Failed to send test emails');
    } finally {
      setSendingTest(false);
    }
  };

  const update = (key: keyof NotificationSettings, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaveStatus('idle');
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto py-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Settings size={20} className="text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notification Settings</h1>
          <p className="text-sm text-muted-foreground">Manage how and when you receive alerts</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Notification Frequency */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Zap size={16} className="text-primary" />
            <h2 className="text-base font-semibold text-foreground">Notification Frequency</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Choose how often you want to receive bundled notifications.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {frequencyOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => update('notificationFrequency', opt.value)}
                className={`flex flex-col items-start p-4 rounded-xl border-2 text-left transition-all duration-150 ${
                  settings.notificationFrequency === opt.value
                    ? 'border-primary bg-primary/5' :'border-border hover:border-primary/40 hover:bg-muted/50'
                }`}
              >
                <span className="text-sm font-semibold text-foreground">{opt.label}</span>
                <span className="text-xs text-muted-foreground mt-0.5">{opt.description}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Alert Preferences */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-1">
            <Bell size={16} className="text-primary" />
            <h2 className="text-base font-semibold text-foreground">Alert Preferences</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-2">
            Choose which types of in-app alerts you want to receive.
          </p>
          <div className="divide-y divide-border">
            <SettingRow
              label="Price Drop Alerts"
              description="Get notified when a tracked product drops in price"
              checked={settings.priceDropAlerts}
              onChange={(v) => update('priceDropAlerts', v)}
            />
            <SettingRow
              label="Back in Stock Alerts"
              description="Know when an out-of-stock item becomes available"
              checked={settings.backInStockAlerts}
              onChange={(v) => update('backInStockAlerts', v)}
            />
            <SettingRow
              label="Deal Alerts"
              description="Receive alerts for flash sales and limited-time deals"
              checked={settings.dealAlerts}
              onChange={(v) => update('dealAlerts', v)}
            />
            <SettingRow
              label="Watchlist Updates"
              description="Get notified about changes to your watchlist items"
              checked={settings.watchlistUpdates}
              onChange={(v) => update('watchlistUpdates', v)}
            />
          </div>
        </div>

        {/* Email Notifications */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-1">
            <Mail size={16} className="text-primary" />
            <h2 className="text-base font-semibold text-foreground">Email Notifications</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-2">
            Control which notifications are sent to your email address.
          </p>
          <div className="divide-y divide-border">
            <SettingRow
              label="Price Drop Emails"
              description="Email me when a tracked product drops in price"
              checked={settings.emailPriceDrop}
              onChange={(v) => update('emailPriceDrop', v)}
            />
            <SettingRow
              label="Back in Stock Emails"
              description="Email me when an out-of-stock item is available again"
              checked={settings.emailBackInStock}
              onChange={(v) => update('emailBackInStock', v)}
            />
            <SettingRow
              label="Deal Emails"
              description="Email me about flash sales and limited-time offers"
              checked={settings.emailDeals}
              onChange={(v) => update('emailDeals', v)}
            />
            <SettingRow
              label="Watchlist Summary Emails"
              description="Periodic summary of all your watchlist activity"
              checked={settings.emailWatchlistSummary}
              onChange={(v) => update('emailWatchlistSummary', v)}
            />
            <SettingRow
              label="Weekly Digest"
              description="A weekly roundup of the best deals for your tracked products"
              checked={settings.emailWeeklyDigest}
              onChange={(v) => update('emailWeeklyDigest', v)}
            />
          </div>

          {/* Send Test Emails */}
          <div className="mt-5 pt-5 border-t border-border">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <p className="text-sm font-medium text-foreground">Preview Email Templates</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Send example emails to <span className="font-medium text-foreground">{user?.email}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={handleSendTestEmails}
                disabled={sendingTest}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-primary text-primary text-sm font-semibold hover:bg-primary/5 active:scale-95 transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {sendingTest ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Sending…
                  </>
                ) : (
                  <>
                    <Send size={14} />
                    Send Test Emails
                  </>
                )}
              </button>
            </div>
            {testEmailStatus === 'success' && (
              <div className="flex items-center gap-2 text-sm text-green-600 mt-3">
                <CheckCircle size={15} />
                <span>{testEmailMsg}</span>
              </div>
            )}
            {testEmailStatus === 'error' && (
              <div className="flex items-center gap-2 text-sm text-destructive mt-3">
                <AlertCircle size={15} />
                <span>{testEmailMsg}</span>
              </div>
            )}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-between gap-4 pt-2">
          {saveStatus === 'success' && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle size={16} />
              <span>Settings saved successfully</span>
            </div>
          )}
          {saveStatus === 'error' && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle size={16} />
              <span>{errorMsg || 'Failed to save settings'}</span>
            </div>
          )}
          {saveStatus === 'idle' && <div />}

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:opacity-90 active:scale-95 transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed ml-auto"
          >
            {saving ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Saving…
              </>
            ) : (
              'Save Settings'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
