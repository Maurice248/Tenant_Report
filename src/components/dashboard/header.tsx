'use client';

import { useAppSection } from '@/lib/app-section';
import { cn } from '@/lib/utils';

interface HeaderProps {
  title: string;
  description?: string;
}

export function Header({ title, description }: HeaderProps) {
  const { section } = useAppSection();
  const isOutreach = section === 'outreach';

  if (isOutreach) {
    return (
      <div className="px-8 pb-2 pt-8">
        <h1 className="text-[28px] font-bold leading-tight text-gray-900">{title}</h1>
        {description && (
          <p className="mt-1 text-[15px] text-gray-500">{description}</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-16 items-center justify-between border-b bg-white px-6">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
        {description && <p className="text-sm text-gray-500">{description}</p>}
      </div>
    </div>
  );
}
