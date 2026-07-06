import { NextResponse } from 'next/server';
import { getRequestCompanyId, getRequestUserId } from '@/lib/auth';

export function unauthorizedJson() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

/** Requires any authenticated user. Returns userId or a 401 response. */
export async function requireApiUserId(): Promise<string | NextResponse> {
  const userId = await getRequestUserId();
  if (!userId) return unauthorizedJson();
  return userId;
}

/** Requires authenticated user with a company. Returns companyId or a 401 response. */
export async function requireApiCompanyId(): Promise<string | NextResponse> {
  const companyId = await getRequestCompanyId();
  if (!companyId) return unauthorizedJson();
  return companyId;
}
