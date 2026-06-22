'use client';

import { createContext, useContext } from 'react';
import {
  SECTION_CONFIG,
  type AppSection,
  type SectionConfig,
} from '@/lib/app-section-config';

const AppSectionContext = createContext<AppSection>('dashboard');

export function AppSectionProvider({
  section,
  children,
}: {
  section: AppSection;
  children: React.ReactNode;
}) {
  return (
    <AppSectionContext.Provider value={section}>{children}</AppSectionContext.Provider>
  );
}

export function useAppSection(): SectionConfig & { section: AppSection } {
  const section = useContext(AppSectionContext);
  return { section, ...SECTION_CONFIG[section] };
}

export { SECTION_CONFIG, type AppSection, type SectionConfig, type NavItem, type SectionLabels } from '@/lib/app-section-config';
