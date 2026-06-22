import ManageServices from '@/components/newsletter/ManageServices';

export const metadata = { title: 'Manage Services' };

export default function ServicesPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Manage Services</h1>
        <p className="mt-1 text-gray-500">Add or remove services. They will appear in the newsletter generation selector.</p>
      </div>
      <ManageServices />
    </div>
  );
}
