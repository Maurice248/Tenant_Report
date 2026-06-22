-- Newsletter n8n workflow tables (from "Newletter Dashboard automation" workflow)
-- Creates tables referenced by Supabase nodes that are not yet in the project.

-- Active campaign config slot used by the scheduled send workflow
CREATE TABLE IF NOT EXISTS public.template_id (
  id SERIAL PRIMARY KEY,
  template_id TEXT,
  subject_line TEXT NOT NULL DEFAULT '',
  limit_for_daily INTEGER NOT NULL DEFAULT 30,
  table_name TEXT NOT NULL DEFAULT 'table1'
);

CREATE INDEX IF NOT EXISTS template_id_template_id_idx ON public.template_id (template_id);

-- Duplicate config table updated by the Campaign webhook (parallel to template_id)
CREATE TABLE IF NOT EXISTS public.template_id_duplicate (
  id SERIAL PRIMARY KEY,
  template_id TEXT,
  subject_line TEXT NOT NULL DEFAULT '',
  limit_for_daily INTEGER NOT NULL DEFAULT 30,
  table_name TEXT NOT NULL DEFAULT 'table1'
);

CREATE INDEX IF NOT EXISTS template_id_duplicate_template_id_idx ON public.template_id_duplicate (template_id);

-- Master subscriber list (all members, not segmented by table1–table6)
CREATE TABLE IF NOT EXISTS public.subscriber_member_list (
  id SERIAL PRIMARY KEY,
  email_id TEXT,
  first_name TEXT,
  last_name TEXT,
  sevice_type TEXT,
  subscriber_unsubscriber TEXT NOT NULL DEFAULT 'subscriber',
  email_id_sent TEXT,
  verfication TEXT NOT NULL DEFAULT 'notsent',
  template_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS subscriber_member_list_email_id_idx ON public.subscriber_member_list (email_id);
CREATE INDEX IF NOT EXISTS subscriber_member_list_status_idx ON public.subscriber_member_list (subscriber_unsubscriber, verfication);

-- Generated newsletter content + campaign metadata (n8n uses exact name "Newsletter_campaigns")
CREATE TABLE IF NOT EXISTS public."Newsletter_campaigns" (
  id SERIAL PRIMARY KEY,
  subject_line TEXT NOT NULL DEFAULT '',
  preheader TEXT NOT NULL DEFAULT '',
  header_title TEXT NOT NULL DEFAULT '',
  intro TEXT NOT NULL DEFAULT '',
  main_story TEXT NOT NULL DEFAULT '',
  key_insights TEXT NOT NULL DEFAULT '',
  industry_update TEXT NOT NULL DEFAULT '',
  pro_tip TEXT NOT NULL DEFAULT '',
  call_to_action TEXT NOT NULL DEFAULT '',
  footer_note TEXT NOT NULL DEFAULT '',
  campaign_name TEXT,
  template_id TEXT,
  daily_limit INTEGER,
  subscribers TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS newsletter_campaigns_subject_line_idx ON public."Newsletter_campaigns" (subject_line);
CREATE INDEX IF NOT EXISTS newsletter_campaigns_template_id_idx ON public."Newsletter_campaigns" (template_id);

-- Ensure lead tables (table1–table6) have columns required by the send workflow
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['table1', 'table2', 'table3', 'table4', 'table5', 'table6']
  LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS email_id TEXT', t);
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS sevice_type TEXT', t);
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS subscriber_unsubscriber TEXT NOT NULL DEFAULT ''subscriber''', t);
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS verfication TEXT NOT NULL DEFAULT ''notsent''', t);
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS template_id TEXT', t);
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS email_id_sent TEXT', t);
  END LOOP;
END $$;

-- Seed the active campaign slot (workflow filters on id = 2)
INSERT INTO public.template_id (id, template_id, subject_line, limit_for_daily, table_name)
VALUES (2, NULL, '', 30, 'table1')
ON CONFLICT (id) DO NOTHING;

-- Align sequence after explicit id insert
SELECT setval(
  pg_get_serial_sequence('public.template_id', 'id'),
  GREATEST((SELECT COALESCE(MAX(id), 1) FROM public.template_id), 2)
);
