/**
 * Apply create_error_alerts_social.sql to the Social Supabase project.
 *
 * Add to .env (Supabase → Social project → Settings → Database → URI, port 5432):
 *   SOCIAL_DASH_DIRECT_URL="postgresql://postgres.omiqphbaqsviaddivtmj:YOUR_PASSWORD@..."
 *
 * Run: node scripts/apply-social-error-alerts.mjs
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  try {
    const raw = readFileSync(resolve(__dirname, '../.env'), 'utf8');
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    // .env optional if env vars already set
  }
}

loadEnv();

const url = process.env.SOCIAL_DASH_DIRECT_URL;
if (!url) {
  console.error('Missing SOCIAL_DASH_DIRECT_URL in .env');
  console.error('Supabase → omiqphbaqsviaddivtmj → Settings → Database → Connection string (URI, port 5432)');
  process.exit(1);
}

const file = resolve(__dirname, '../prisma/migrations/create_error_alerts_social.sql');

try {
  execSync(`npx prisma db execute --file "${file}" --url "${url}"`, {
    stdio: 'inherit',
    cwd: resolve(__dirname, '..'),
  });
  console.log('Migration applied successfully.');
} catch {
  process.exit(1);
}
