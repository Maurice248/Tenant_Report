'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ChevronLeft } from 'lucide-react';
import { useAppSection } from '@/lib/app-section';

export function Sidebar() {
  const pathname = usePathname();
  const { basePath, homeHref, showLogo, navItems } = useAppSection();

  return (
    <div className="flex h-full w-64 flex-col bg-[#1a1c2e] text-white transition-all duration-200">
      {showLogo && (
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
          <div className="relative h-9 w-9 flex-shrink-0 overflow-hidden rounded-lg">
            <Image
              src="/tenant-report-logo.png"
              alt="Tenant Report AI"
              fill
              className="object-contain"
            />
          </div>
          <span className="text-lg font-bold tracking-wide">Tenant Report</span>
        </div>
      )}

      <nav className="flex-1 space-y-1 px-3 py-6">
        <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-white/40">
          Main Menu
        </p>
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === basePath
              ? pathname === href
              : pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-[#0077b6] text-white shadow-md'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-3">
        <Link
          href={homeHref}
          className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-white/70 transition-all hover:bg-white/10 hover:text-white"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Main Dashboard
        </Link>
      </div>
    </div>
  );
}
