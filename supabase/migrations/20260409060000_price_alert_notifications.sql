-- ============================================================
-- ShopRadar: In-App Notifications for Price Alerts
-- ============================================================

-- 1. in_app_notifications table
CREATE TABLE IF NOT EXISTS public.in_app_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  alert_id UUID REFERENCES public.price_alerts(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL DEFAULT '',
  image_url TEXT DEFAULT '',
  message TEXT NOT NULL,
  target_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  triggered_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_in_app_notifications_user_id ON public.in_app_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_in_app_notifications_alert_id ON public.in_app_notifications(alert_id);
CREATE INDEX IF NOT EXISTS idx_in_app_notifications_is_read ON public.in_app_notifications(user_id, is_read);

-- 3. Enable RLS
ALTER TABLE public.in_app_notifications ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policy
DROP POLICY IF EXISTS "users_manage_own_in_app_notifications" ON public.in_app_notifications;
CREATE POLICY "users_manage_own_in_app_notifications"
ON public.in_app_notifications
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 5. DB function: check a single price_alert row and insert notification if triggered
CREATE OR REPLACE FUNCTION public.check_price_alert_and_notify()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only act when current_price is updated and alert is Active
  IF NEW.alert_status = 'Active'
     AND NEW.current_price <= NEW.target_price
     AND (OLD.alert_status <> 'Triggered' OR OLD.current_price > OLD.target_price)
  THEN
    -- Mark alert as Triggered
    NEW.alert_status := 'Triggered';
    NEW.last_triggered := NOW();

    -- Insert in-app notification (avoid duplicates within 1 hour)
    IF NOT EXISTS (
      SELECT 1 FROM public.in_app_notifications
      WHERE alert_id = NEW.id
        AND created_at > NOW() - INTERVAL '1 hour'
    ) THEN
      INSERT INTO public.in_app_notifications (
        user_id,
        alert_id,
        product_name,
        image_url,
        message,
        target_price,
        triggered_price,
        currency
      ) VALUES (
        NEW.user_id,
        NEW.id,
        NEW.product_name,
        COALESCE(NEW.image_url, ''),
        'Price dropped to ' || NEW.currency || NEW.current_price::TEXT || ' — your target was ' || NEW.currency || NEW.target_price::TEXT || ' for ' || NEW.product_name,
        NEW.target_price,
        NEW.current_price,
        NEW.currency
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 6. Trigger on price_alerts UPDATE
DROP TRIGGER IF EXISTS on_price_alert_updated ON public.price_alerts;
CREATE TRIGGER on_price_alert_updated
  BEFORE UPDATE ON public.price_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.check_price_alert_and_notify();

-- 7. Service-role bypass policy so Edge Function can read all active alerts and update them
DROP POLICY IF EXISTS "service_role_manage_price_alerts" ON public.price_alerts;
CREATE POLICY "service_role_manage_price_alerts"
ON public.price_alerts
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_manage_notifications" ON public.in_app_notifications;
CREATE POLICY "service_role_manage_notifications"
ON public.in_app_notifications
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
