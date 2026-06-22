'use client';

import { NewsletterProviders } from '@/components/newsletter/Providers';

export default function NewsletterLayout({ children }: { children: React.ReactNode }) {
  return (
    <NewsletterProviders>
      {children}
    </NewsletterProviders>
  );
}
