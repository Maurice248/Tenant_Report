'use client';

import { signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

export function SignOutButton() {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => signOut({ callbackUrl: '/client-login' })}
      className="gap-2"
    >
      <LogOut className="h-4 w-4" />
      Sign out
    </Button>
  );
}
