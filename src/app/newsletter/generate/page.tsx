import GenerateNewsletter from '@/components/newsletter/GenerateNewsletter';

export const metadata = { title: 'Generate Newsletter' };

export default function GeneratePage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Generate Newsletter</h1>
        <p className="mt-1 text-gray-500">Select a service and enter a topic to generate your newsletter.</p>
      </div>
      <GenerateNewsletter />
    </div>
  );
}
