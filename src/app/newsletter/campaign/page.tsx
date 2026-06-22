import CreateCampaign from '@/components/newsletter/CreateCampaign';

export const metadata = { title: 'Create Campaign' };

export default function CampaignPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Create Campaign</h1>
        <p className="mt-1 text-gray-500">Configure and launch your newsletter campaign.</p>
      </div>
      <CreateCampaign />
    </div>
  );
}
