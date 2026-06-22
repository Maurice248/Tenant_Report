-- Newsletter dashboard: active campaigns + Resend webhook events
CREATE TABLE IF NOT EXISTS public.newsletter_campaigns (
  id SERIAL PRIMARY KEY,
  template_id TEXT NOT NULL,
  subject_line TEXT NOT NULL DEFAULT '',
  limit_for_daily INTEGER NOT NULL DEFAULT 30,
  table_name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.resend_events (
  id BIGSERIAL PRIMARY KEY,
  event_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS newsletter_campaigns_active_idx ON public.newsletter_campaigns (is_active);
CREATE INDEX IF NOT EXISTS resend_events_created_at_idx ON public.resend_events (created_at DESC);
CREATE INDEX IF NOT EXISTS resend_events_event_type_idx ON public.resend_events (event_type);
