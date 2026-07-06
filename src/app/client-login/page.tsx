import { Suspense } from 'react';
import { ClientLoginForm } from '@/components/client-dashboard/client-login-form';

export default function ClientLoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-slate-50">Loading...</div>}>
      <ClientLoginForm />
    </Suspense>
  );
}
