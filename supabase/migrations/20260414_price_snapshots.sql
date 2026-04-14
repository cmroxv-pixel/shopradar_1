CREATE TABLE IF NOT EXISTS public.price_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_query TEXT NOT NULL,
  marketplace TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'AUD',
  listing_url TEXT DEFAULT '',
  title TEXT DEFAULT '',
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_price_snapshots_query 
  ON public.price_snapshots(product_query);

CREATE INDEX IF NOT EXISTS idx_price_snapshots_date 
  ON public.price_snapshots(snapshot_date);

CREATE UNIQUE INDEX IF NOT EXISTS idx_price_snapshots_unique_day
  ON public.price_snapshots(product_query, marketplace, snapshot_date);

ALTER TABLE public.price_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone_can_read_price_snapshots"
  ON public.price_snapshots FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "service_role_write_price_snapshots"
  ON public.price_snapshots FOR ALL TO service_role USING (true) WITH CHECK (true);
