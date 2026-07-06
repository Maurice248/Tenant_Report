import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions, isCompanyAdminRole } from '@/lib/auth';
import { MembersManager } from '@/components/client-dashboard/members-manager';

export default async function ClientMembersPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.companyId) {
    redirect('/client-login');
  }

  if (!isCompanyAdminRole(session.user.role)) {
    redirect('/client-dashboard/profile');
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text)]">Members</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Invite teammates and manage who has access to your company workspace.
        </p>
      </div>

      <MembersManager currentUserId={session.user.id} />
    </div>
  );
}
