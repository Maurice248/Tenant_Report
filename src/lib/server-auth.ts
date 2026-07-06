import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function requireServerSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect('/client-login');
  }
  return session;
}
