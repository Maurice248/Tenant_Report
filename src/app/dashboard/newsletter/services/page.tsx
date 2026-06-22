import ManageServices from "@/components/newsletter/ManageServices";
import { Header } from "@/components/dashboard/header";

export const metadata = { title: "Manage Services" };

export default function ServicesPage() {
  return (
    <div>
      <Header 
        title="Manage Services" 
        description="Configure the medical specialties and services for AI generation." 
      />
      <div className="p-6">
        <ManageServices />
      </div>
    </div>
  );
}
