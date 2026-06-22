-- Voice Agent dashboard columns for public.phonenumber
ALTER TABLE public.phonenumber
  ADD COLUMN IF NOT EXISTS status text,
  ADD COLUMN IF NOT EXISTS user_sentiment text,
  ADD COLUMN IF NOT EXISTS summary text,
  ADD COLUMN IF NOT EXISTS recording_url text;

CREATE INDEX IF NOT EXISTS phonenumber_status_idx ON public.phonenumber (status);
CREATE INDEX IF NOT EXISTS phonenumber_created_at_idx ON public.phonenumber (created_at DESC);
