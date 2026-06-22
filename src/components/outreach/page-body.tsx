'use client';

import { useAppSection } from '@/lib/app-section';
import { cn } from '@/lib/utils';

export function getPageBodyClass(section: 'dashboard' | 'outreach', extra?: string) {
  return cn(
    section === 'outreach' ? 'px-8 pb-8 space-y-6' : 'p-6 space-y-6',
    extra
  );
}

export function PageBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { section } = useAppSection();
  return <div className={getPageBodyClass(section, className)}>{children}</div>;
}

export const outreachCardClass =
  'rounded-xl border border-gray-100 bg-white shadow-sm';
