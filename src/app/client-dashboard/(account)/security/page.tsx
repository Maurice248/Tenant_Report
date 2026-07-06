import { ChangePasswordForm } from '@/components/client-dashboard/change-password-form';

export default function ClientSecurityPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text)]">Security</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">Manage your password and account security.</p>
      </div>

      <ChangePasswordForm />
    </div>
  );
}
