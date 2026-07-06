import { prisma } from '@/lib/prisma';
import { COMPANY_ADMIN_ROLE, LEGACY_ADMIN_ROLE } from '@/lib/auth';

export async function countCompanyAdmins(companyId: string): Promise<number> {
  return prisma.user.count({
    where: { companyId, role: { in: [COMPANY_ADMIN_ROLE, LEGACY_ADMIN_ROLE] } },
  });
}

export async function isLastCompanyAdmin(companyId: string, userId: string): Promise<boolean> {
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      companyId,
      role: { in: [COMPANY_ADMIN_ROLE, LEGACY_ADMIN_ROLE] },
    },
    select: { id: true },
  });
  if (!user) return false;
  const adminCount = await countCompanyAdmins(companyId);
  return adminCount <= 1;
}
