import { createHash, randomBytes } from 'crypto';

export function generateInviteToken(): string {
  return randomBytes(32).toString('hex');
}

export function hashInviteToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export const INVITE_EXPIRY_DAYS = 7;

export function inviteExpiresAt(from = new Date()): Date {
  const expires = new Date(from);
  expires.setDate(expires.getDate() + INVITE_EXPIRY_DAYS);
  return expires;
}
