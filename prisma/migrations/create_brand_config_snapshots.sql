CREATE TABLE IF NOT EXISTS public.brand_config_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_config_id UUID NOT NULL REFERENCES public.brand_configs(id) ON DELETE CASCADE,
  products_services TEXT NOT NULL DEFAULT '',
  value_proposition TEXT NOT NULL DEFAULT '',
  brand_voice TEXT NOT NULL DEFAULT '',
  positioning TEXT NOT NULL DEFAULT '',
  competitors TEXT NOT NULL DEFAULT '',
  pain_points TEXT NOT NULL DEFAULT '',
  icp_meta_ads TEXT NOT NULL DEFAULT '',
  icp_newsletter TEXT NOT NULL DEFAULT '',
  icp_outreach TEXT NOT NULL DEFAULT '',
  content_hash TEXT NOT NULL,
  label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS brand_config_snapshots_brand_config_id_idx
  ON public.brand_config_snapshots (brand_config_id, created_at DESC);

CREATE INDEX IF NOT EXISTS brand_config_snapshots_content_hash_idx
  ON public.brand_config_snapshots (brand_config_id, content_hash);
