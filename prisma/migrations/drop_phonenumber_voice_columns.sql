-- Remove Voice Agent dashboard columns from public.phonenumber (Supabase)
DROP INDEX IF EXISTS public.phonenumber_status_idx;
DROP INDEX IF EXISTS public.phonenumber_created_at_idx;

ALTER TABLE public.phonenumber
  DROP COLUMN IF EXISTS status,
  DROP COLUMN IF EXISTS user_sentiment,
  DROP COLUMN IF EXISTS summary,
  DROP COLUMN IF EXISTS recording_url;
