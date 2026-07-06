/**
 * Drop Voice Agent columns from Supabase public.phonenumber.
 *
 * Usage: node scripts/drop-voice-agent-columns.mjs
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(`DROP INDEX IF EXISTS public.phonenumber_status_idx`);
  await prisma.$executeRawUnsafe(`DROP INDEX IF EXISTS public.phonenumber_created_at_idx`);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE public.phonenumber
      DROP COLUMN IF EXISTS status,
      DROP COLUMN IF EXISTS user_sentiment,
      DROP COLUMN IF EXISTS summary,
      DROP COLUMN IF EXISTS recording_url
  `);

  console.log('Voice Agent columns removed from public.phonenumber (if they existed).');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
