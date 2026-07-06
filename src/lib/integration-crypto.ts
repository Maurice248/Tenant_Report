import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const SALT = 'company-integrations-v1';

function getEncryptionKey(): Buffer {
  const secret =
    process.env.INTEGRATION_ENCRYPTION_KEY?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim() ||
    'dev-integration-key-change-in-production';
  return scryptSync(secret, SALT, 32);
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const key = getEncryptionKey();
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
}

export function decryptSecret(payload: string): string {
  const [ivB64, tagB64, dataB64] = payload.split(':');
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error('Invalid encrypted secret format');
  }
  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(tagB64, 'base64');
  const encrypted = Buffer.from(dataB64, 'base64');
  const key = getEncryptionKey();
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

export function maskSecret(value: string, visible = 4): string {
  if (!value) return '';
  if (value.length <= visible * 2) return '••••••••';
  return `${value.slice(0, visible)}••••${value.slice(-visible)}`;
}
