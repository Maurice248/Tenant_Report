import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const TENANT_LOGO = '/tenant-report-logo.png';

async function main() {
  const result = await prisma.company.updateMany({
    where: { slug: 'tenant-report' },
    data: { logoUrl: TENANT_LOGO },
  });

  if (result.count === 0) {
    console.log('No tenant-report company found. Run: npx prisma db seed');
    return;
  }

  const company = await prisma.company.findUnique({
    where: { slug: 'tenant-report' },
    select: { name: true, slug: true, logoUrl: true },
  });

  console.log('Updated Tenant Report company logo:', company);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
