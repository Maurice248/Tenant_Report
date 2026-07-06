import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const email = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'admin@tenantreport.ai').toLowerCase();

try {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, role: true, companyId: true },
  });

  const companyCount = await prisma.company.count();

  console.log(JSON.stringify({ user, companyCount }, null, 2));

  if (!user) {
    console.log('\nNo admin user found. Run: npx prisma db seed');
  } else if (!user.companyId) {
    console.log('\nAdmin exists but has no companyId. Run: npx prisma db seed');
  } else if (companyCount === 0) {
    console.log('\nCompanies table is empty. Run migrations + seed.');
  }
} catch (err) {
  console.error('Database error:', err.message);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
