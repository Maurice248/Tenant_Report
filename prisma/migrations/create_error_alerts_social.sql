-- Social Supabase (omiqphbaqsviaddivtmj) — "Error Alerts" for n8n error workflow
-- n8n node: UPDATE "Error Alerts" WHERE id = 1, sets "Error" + updated_at

CREATE TABLE IF NOT EXISTS public."Error Alerts" (
  id         BIGINT PRIMARY KEY,
  "Error"    TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public."Error Alerts" (id, "Error")
VALUES (1, '')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public."Error Alerts" DISABLE ROW LEVEL SECURITY;

GRANT SELECT, UPDATE ON public."Error Alerts" TO anon, authenticated, service_role;
