import { getServerSession } from 'next-auth';
import { authOptions, isCompanyAdminRole } from '@/lib/auth';
import { AccountNav } from '@/components/client-dashboard/account-nav';

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  const isAdmin = isCompanyAdminRole(session?.user?.role);

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-10">
      <AccountNav isAdmin={isAdmin} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
