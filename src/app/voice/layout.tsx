import { NewsletterVoiceShell } from '@/components/newsletter/NewsletterVoiceShell';

export default function VoiceLayout({ children }: { children: React.ReactNode }) {
  return <NewsletterVoiceShell>{children}</NewsletterVoiceShell>;
}
