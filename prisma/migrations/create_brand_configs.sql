CREATE TABLE IF NOT EXISTS public.brand_configs (
  id UUID PRIMARY KEY,
  products_services TEXT NOT NULL DEFAULT '',
  value_proposition TEXT NOT NULL DEFAULT '',
  brand_voice TEXT NOT NULL DEFAULT '',
  positioning TEXT NOT NULL DEFAULT '',
  competitors TEXT NOT NULL DEFAULT '',
  pain_points TEXT NOT NULL DEFAULT '',
  icp_meta_ads TEXT NOT NULL DEFAULT '',
  icp_newsletter TEXT NOT NULL DEFAULT '',
  icp_outreach TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.brand_configs (
  id,
  products_services,
  value_proposition,
  brand_voice,
  positioning,
  competitors,
  pain_points,
  icp_meta_ads,
  icp_newsletter,
  icp_outreach
)
VALUES (
  'd33fb700-9a07-4478-9ff1-6f636f2f3625',
  'Tenant Reports (background checks & applicant reports), Smart Tenant Subscription (AI-powered reliability scoring), Rent Promise & Protection Package, Online landlord dashboard, Background Screening, Credit Reports',
  'Reduce risk and ensure reliable rental income — affordable AI-powered tenant screening with comprehensive background & credit reports, real-time application tracking, and rent protection guarantees',
  'Trustworthy, Professional, Clear, Landlord-focused, Solution-oriented, Confidence-building',
  'Affordable AI-powered tenant screening platform for Canadian landlords — streamlining tenant selection with transparent pricing and comprehensive risk reduction tools',
  'SingleKey, Naborly, Certn, Landlord Credit Bureau, TenantCheck',
  'Unreliable tenant payment history, risk of missed rent, time-consuming manual screening, difficulty verifying applicant reliability, rental income uncertainty, fear of bad tenant selection',
  'Canadian landlords and property managers aged 28-60, owning 1-10 rental units, interested in property management, real estate investing, landlord rights, rental income protection, tenant screening',
  'Canadian landlords actively screening tenants or comparing screening services — need trust-building content about AI-driven reliability scoring, background checks, credit reports, and rent protection packages',
  'Landlords, property managers, and real estate investors in Canada — small-to-mid portfolio owners managing residential rentals, seeking affordable tenant screening solutions'
)
ON CONFLICT (id) DO NOTHING;
