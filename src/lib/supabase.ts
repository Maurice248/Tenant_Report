import { createClient } from '@supabase/supabase-js';

/** Supabase JS expects the project root URL, not /rest/v1 */
function normalizeSupabaseProjectUrl(url: string): string {
  return url.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
}

const supabaseUrl = normalizeSupabaseProjectUrl(process.env.NEXT_PUBLIC_SUPABASE_URL || "");
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase environment variables are missing in lib/supabase.ts");
}

export const supabaseProjectUrl = supabaseUrl;
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
