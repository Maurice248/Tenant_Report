import type { SupabaseClient } from '@supabase/supabase-js';

export function getPlatformCompanySlug(): string {
  return process.env.PLATFORM_COMPANY_SLUG || 'tenant-report';
}

export function reportBelongsToCompany(
  row: { company_id?: string | null },
  companyId: string,
  companySlug: string | null | undefined
): boolean {
  if (row.company_id === companyId) return true;
  if (!row.company_id && companySlug === getPlatformCompanySlug()) return true;
  return false;
}

export async function listReportsForCompany(
  supabase: SupabaseClient,
  companyId: string,
  companySlug: string | null | undefined
) {
  const isPlatform = companySlug === getPlatformCompanySlug();

  let query = supabase.from('reports_json').select('*').order('created_at', { ascending: false });

  if (isPlatform) {
    query = query.or(`company_id.eq.${companyId},company_id.is.null`);
  } else {
    query = query.eq('company_id', companyId);
  }

  return query;
}
