import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "company_integrations"
    ADD COLUMN IF NOT EXISTS "n8nApiKeyEnc" TEXT;
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "company_integrations"
    ADD COLUMN IF NOT EXISTS "n8nApiBaseUrl" TEXT;
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "company_integrations"
    ADD COLUMN IF NOT EXISTS "n8nBlogWorkflowId" TEXT;
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "company_integrations"
    ADD COLUMN IF NOT EXISTS "n8nBlogWorkflowName" TEXT;
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "company_integrations"
    ADD COLUMN IF NOT EXISTS "n8nWebhooksJson" JSONB NOT NULL DEFAULT '{}';
  `);

  console.log('n8n integration columns ready on company_integrations');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
