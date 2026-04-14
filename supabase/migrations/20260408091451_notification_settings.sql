-- ============================================================
-- ShopRadar: User Notification Settings Migration
-- ============================================================

-- 1. Create user_notification_settings table
CREATE TABLE IF NOT EXISTS public.user_notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  -- Notification frequency
  notification_frequency TEXT NOT NULL DEFAULT 'daily',
  -- Alert preferences
  price_drop_alerts BOOLEAN NOT NULL DEFAULT true,
  back_in_stock_alerts BOOLEAN NOT NULL DEFAULT true,
  deal_alerts BOOLEAN NOT NULL DEFAULT true,
  watchlist_updates BOOLEAN NOT NULL DEFAULT true,
  -- Email notification toggles
  email_price_drop BOOLEAN NOT NULL DEFAULT true,
  email_back_in_stock BOOLEAN NOT NULL DEFAULT false,
  email_deals BOOLEAN NOT NULL DEFAULT true,
  email_watchlist_summary BOOLEAN NOT NULL DEFAULT false,
  email_weekly_digest BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id)
);

-- 2. Index
CREATE INDEX IF NOT EXISTS idx_notification_settings_user_id ON public.user_notification_settings(user_id);

-- 3. Enable RLS
ALTER TABLE public.user_notification_settings ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policy
DROP POLICY IF EXISTS "users_manage_own_notification_settings" ON public.user_notification_settings;
CREATE POLICY "users_manage_own_notification_settings"
ON public.user_notification_settings
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
