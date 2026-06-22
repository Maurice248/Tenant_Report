'use client';

import { ServicesProvider } from '@/context/ServicesContext';
import { NewsletterProvider } from '@/context/NewsletterContext';
import { NewsletterHistoryProvider } from '@/context/NewsletterHistoryContext';
import { CampaignProvider } from '@/context/CampaignContext';

export function NewsletterProviders({ children }: { children: React.ReactNode }) {
  return (
    <ServicesProvider>
      <NewsletterProvider>
        <NewsletterHistoryProvider>
          <CampaignProvider>
            {children}
          </CampaignProvider>
        </NewsletterHistoryProvider>
      </NewsletterProvider>
    </ServicesProvider>
  );
}
