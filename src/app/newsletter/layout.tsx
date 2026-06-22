import { NewsletterVoiceShell } from '@/components/newsletter/NewsletterVoiceShell';

export default function NewsletterLayout({ children }: { children: React.ReactNode }) {
  return <NewsletterVoiceShell>{children}</NewsletterVoiceShell>;
}
