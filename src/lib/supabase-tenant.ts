import { getRequestCompanyId } from '@/lib/auth';

/** Scope filter for tenant-scoped Supabase rows. Returns null when unauthenticated. */
export async function getTenantCompanyId(): Promise<string | null> {
  return getRequestCompanyId();
}

/** Legacy global row id used before multi-tenant status_table. */
export const LEGACY_STATUS_ROW_ID = 1;
