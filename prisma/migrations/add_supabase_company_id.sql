-- Run against Supabase (main project): adds tenant isolation columns
-- npx prisma db execute --file prisma/migrations/add_supabase_company_id.sql

ALTER TABLE IF EXISTS public.your_name_table
  ADD COLUMN IF NOT EXISTS company_id TEXT;

CREATE INDEX IF NOT EXISTS your_name_table_company_id_idx
  ON public.your_name_table (company_id);

ALTER TABLE IF EXISTS public.status_table
  ADD COLUMN IF NOT EXISTS company_id TEXT;

CREATE INDEX IF NOT EXISTS status_table_company_id_idx
  ON public.status_table (company_id);

ALTER TABLE IF EXISTS public."Error Alerts"
  ADD COLUMN IF NOT EXISTS company_id TEXT;

CREATE INDEX IF NOT EXISTS error_alerts_company_id_idx
  ON public."Error Alerts" (company_id);

ALTER TABLE IF EXISTS public.reports_json
  ADD COLUMN IF NOT EXISTS company_id TEXT;

CREATE INDEX IF NOT EXISTS reports_json_company_id_idx
  ON public.reports_json (company_id);
