import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "company_integrations"
    ADD COLUMN IF NOT EXISTS "apiTokenSecretsEnc" TEXT;
  `);

  console.log('apiTokenSecretsEnc column ready on company_integrations');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
