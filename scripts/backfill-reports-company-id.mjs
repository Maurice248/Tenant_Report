import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

const prisma = new PrismaClient();
const PLATFORM_SLUG = process.env.PLATFORM_COMPANY_SLUG || 'tenant-report';

async function main() {
  const company = await prisma.company.findUnique({ where: { slug: PLATFORM_SLUG } });
  if (!company) {
    console.error('Platform company not found. Run: npx prisma db seed');
    process.exit(1);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    console.error('Supabase env missing');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  const { data: legacyRows, error: fetchError } = await supabase
    .from('reports_json')
    .select('id')
    .is('company_id', null);

  if (fetchError) {
    throw new Error(fetchError.message);
  }

  if (!legacyRows?.length) {
    console.log('No legacy reports_json rows without company_id');
    return;
  }

  const { error: updateError } = await supabase
    .from('reports_json')
    .update({ company_id: company.id })
    .is('company_id', null);

  if (updateError) {
    throw new Error(updateError.message);
  }

  console.log(`Backfilled ${legacyRows.length} report(s) to ${company.name} (${company.id})`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
