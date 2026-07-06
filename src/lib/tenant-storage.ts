export function tenantStorageKey(companyId: string | null | undefined, key: string): string {
  if (companyId) return `company:${companyId}:${key}`;
  return key;
}
