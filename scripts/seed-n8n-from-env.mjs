/**
 * Merge n8n credentials from .env into Tenant Report company_integrations row.
 * Only fills fields that are empty in the database.
 *
 * Usage: node scripts/seed-n8n-from-env.mjs
 * (Ensure .env vars are loaded in your shell, or run via npm script with env)
 */
import { PrismaClient } from '@prisma/client';
import { createCipheriv, randomBytes, scryptSync } from 'crypto';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

function loadEnvFile() {
  try {
    const root = join(dirname(fileURLToPath(import.meta.url)), '..');
    const content = readFileSync(join(root, '.env'), 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = val;
    }
  } catch {
    /* .env optional */
  }
}

loadEnvFile();

const prisma = new PrismaClient();
const PLATFORM_SLUG = process.env.PLATFORM_COMPANY_SLUG || 'tenant-report';

const N8N_WEBHOOK_KEYS = [
  'N8N_COMPETITOR_ANALYSIS_URL',
  'NEXT_PUBLIC_N8N_GENERATE_AD_URL',
  'NEXT_PUBLIC_N8N_ACCEPT_PROMPTS_URL',
  'NEXT_PUBLIC_N8N_SINGLE_IDEA_URL',
  'NEXT_PUBLIC_N8N_SOCIAL_IMAGE_URL',
  'NEXT_PUBLIC_N8N_SOCIAL_POST_URL',
  'NEXT_PUBLIC_N8N_SOCIAL_MANUAL_URL',
  'NEXT_PUBLIC_N8N_SOCIAL_DYNAMIC_URL',
  'NEXT_PUBLIC_N8N_SOCIAL_ACCEPT_URL',
  'NEXT_PUBLIC_N8N_SOCIAL_CONFIRM_PROMPTS_URL',
  'NEXT_PUBLIC_N8N_SOCIAL_RETRY_URL',
  'NEXT_PUBLIC_N8N_SOCIAL_POST_VIDEO_URL',
  'NEXT_PUBLIC_N8N_GENERATE_WEBHOOK_URL',
  'NEXT_PUBLIC_N8N_REGENERATE_WEBHOOK_URL',
  'NEXT_PUBLIC_N8N_HTML_WEBHOOK_URL',
  'NEXT_PUBLIC_N8N_CAMPAIGN_WEBHOOK_URL',
  'N8N_CAMPAIGN_WEBHOOK_URL',
  'N8N_SCRAPER_WEBHOOK_URL',
  'N8N_CLEANUP_WEBHOOK_URL',
  'N8N_APPROVAL_WEBHOOK_URL',
  'N8N_BLOG_AUTOMATION_WEBHOOK_URL',
];

function encryptSecret(plaintext) {
  const secret =
    process.env.INTEGRATION_ENCRYPTION_KEY?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim() ||
    'dev-integration-key-change-in-production';
  const key = scryptSync(secret, 'company-integrations-v1', 32);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
}

function webhooksFromEnv() {
  const map = {};
  for (const key of N8N_WEBHOOK_KEYS) {
    const value = process.env[key]?.trim();
    if (value) map[key] = value;
  }
  return map;
}

async function main() {
  const company = await prisma.company.findUnique({ where: { slug: PLATFORM_SLUG } });
  if (!company) {
    console.error('Platform company not found. Run: npx prisma db seed');
    process.exit(1);
  }

  const existing = await prisma.companyIntegration.findUnique({ where: { companyId: company.id } });
  const envWebhooks = webhooksFromEnv();
  const existingWebhooks =
    existing?.n8nWebhooksJson && typeof existing.n8nWebhooksJson === 'object'
      ? { ...existing.n8nWebhooksJson }
      : {};

  const mergedWebhooks = { ...existingWebhooks };
  for (const [key, value] of Object.entries(envWebhooks)) {
    if (!mergedWebhooks[key]) mergedWebhooks[key] = value;
  }

  const n8nApiKey = process.env.N8N_API_KEY?.trim();
  const n8nApiBaseUrl = process.env.N8N_API_BASE_URL?.trim();
  const n8nBlogWorkflowId = process.env.N8N_BLOG_WORKFLOW_ID?.trim();
  const n8nBlogWorkflowName = process.env.N8N_BLOG_WORKFLOW_NAME?.trim();

  const data = {
    n8nApiKeyEnc: existing?.n8nApiKeyEnc || (n8nApiKey ? encryptSecret(n8nApiKey) : null),
    n8nApiBaseUrl: existing?.n8nApiBaseUrl || n8nApiBaseUrl || null,
    n8nBlogWorkflowId: existing?.n8nBlogWorkflowId || n8nBlogWorkflowId || null,
    n8nBlogWorkflowName: existing?.n8nBlogWorkflowName || n8nBlogWorkflowName || null,
    n8nWebhooksJson: mergedWebhooks,
  };

  const hasAny =
    data.n8nApiKeyEnc ||
    data.n8nApiBaseUrl ||
    Object.keys(mergedWebhooks).length > 0;

  if (!hasAny) {
    console.log('No n8n env vars found — nothing to seed');
    return;
  }

  if (existing) {
    await prisma.$executeRaw`
      UPDATE company_integrations
      SET
        "n8nApiKeyEnc" = COALESCE("n8nApiKeyEnc", ${data.n8nApiKeyEnc}),
        "n8nApiBaseUrl" = COALESCE("n8nApiBaseUrl", ${data.n8nApiBaseUrl}),
        "n8nBlogWorkflowId" = COALESCE("n8nBlogWorkflowId", ${data.n8nBlogWorkflowId}),
        "n8nBlogWorkflowName" = COALESCE("n8nBlogWorkflowName", ${data.n8nBlogWorkflowName}),
        "n8nWebhooksJson" = ${JSON.stringify(mergedWebhooks)}::jsonb,
        "updatedAt" = CURRENT_TIMESTAMP
      WHERE "companyId" = ${company.id}
    `;
    console.log('Merged n8n settings into existing integration row for', company.name);
  } else {
    await prisma.$executeRaw`
      INSERT INTO company_integrations (
        id, "companyId", "n8nApiKeyEnc", "n8nApiBaseUrl", "n8nBlogWorkflowId",
        "n8nBlogWorkflowName", "n8nWebhooksJson", "createdAt", "updatedAt"
      ) VALUES (
        ${randomUUID()},
        ${company.id},
        ${data.n8nApiKeyEnc},
        ${data.n8nApiBaseUrl},
        ${data.n8nBlogWorkflowId},
        ${data.n8nBlogWorkflowName},
        ${JSON.stringify(mergedWebhooks)}::jsonb,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
    `;
    console.log('Created integration row with n8n settings for', company.name);
  }

  console.log(`Webhooks stored: ${Object.keys(mergedWebhooks).length}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
