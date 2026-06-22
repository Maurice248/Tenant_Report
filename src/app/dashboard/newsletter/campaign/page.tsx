import CreateCampaign from "@/components/newsletter/CreateCampaign";
import { Header } from "@/components/dashboard/header";

export const metadata = { title: "Create Campaign" };

export default function CampaignPage() {
  return (
    <div>
      <Header 
        title="Create Campaign" 
        description="Launch your newsletter campaigns to your subscribers." 
      />
      <div className="p-6">
        <CreateCampaign />
      </div>
    </div>
  );
}
