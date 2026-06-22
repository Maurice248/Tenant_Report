import NewsletterHistory from '@/components/newsletter/NewsletterHistory';

export const metadata = { title: 'Newsletter History' };

export default function HistoryPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Newsletter History</h1>
        <p className="mt-1 text-gray-500">All newsletters you have generated, with their status and preview.</p>
      </div>
      <NewsletterHistory />
    </div>
  );
}
