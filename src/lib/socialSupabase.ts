import { createClient } from '@supabase/supabase-js';

/** Supabase JS expects the project root URL, not /rest/v1 */
function normalizeSupabaseProjectUrl(url: string): string {
  return url.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
}

const socialSupabaseUrl = normalizeSupabaseProjectUrl(
  process.env.NEXT_PUBLIC_SOCIAL_DASH_SUPABASE_URL || ''
);
const socialSupabaseAnonKey = process.env.NEXT_PUBLIC_SOCIAL_DASH_SUPABASE_ANON_KEY || '';

if (!socialSupabaseUrl || !socialSupabaseAnonKey) {
  console.warn('Social Dash Supabase environment variables are missing in lib/socialSupabase.ts');
}

export const socialSupabaseProjectUrl = socialSupabaseUrl;
export const socialSupabase = createClient(socialSupabaseUrl, socialSupabaseAnonKey);
