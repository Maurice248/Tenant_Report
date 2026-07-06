import { NextResponse } from 'next/server';
import { requireApiUserId } from '@/lib/api-auth';

/** Meta API routes require an authenticated session. */
export async function requireMetaApiAuth(): Promise<string | NextResponse> {
  return requireApiUserId();
}
