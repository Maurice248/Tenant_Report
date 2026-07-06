/**
 * Remove Voice Agent n8n webhook keys from company_integrations.n8nWebhooksJson.
 *
 * Usage: node scripts/strip-voice-agent-n8n-webhooks.mjs
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const VOICE_WEBHOOK_KEYS = [
  'NEXT_PUBLIC_N8N_DELETE_INACTIVITY_URL',
  'NEXT_PUBLIC_N8N_NOT_LIFTED_TO_NULL_URL',
  'NEXT_PUBLIC_N8N_ALL_STATUS_TO_NULL_URL',
];

async function main() {
  const rows = await prisma.$queryRaw`
    SELECT "companyId", "n8nWebhooksJson" FROM company_integrations
  `;

  let updated = 0;
  for (const row of rows) {
    if (!row.n8nWebhooksJson || typeof row.n8nWebhooksJson !== 'object' || Array.isArray(row.n8nWebhooksJson)) {
      continue;
    }

    const webhooks = { ...(row.n8nWebhooksJson) };
    let changed = false;
    for (const key of VOICE_WEBHOOK_KEYS) {
      if (key in webhooks) {
        delete webhooks[key];
        changed = true;
      }
    }

    if (!changed) continue;

    await prisma.$executeRaw`
      UPDATE company_integrations
      SET
        "n8nWebhooksJson" = CAST(${JSON.stringify(webhooks)} AS jsonb),
        "updatedAt" = CURRENT_TIMESTAMP
      WHERE "companyId" = ${row.companyId}
    `;
    updated += 1;
  }

  console.log(`Stripped Voice Agent webhook keys from ${updated} integration row(s).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
