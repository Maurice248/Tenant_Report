import GenerateNewsletter from "@/components/newsletter/GenerateNewsletter";
import { Header } from "@/components/dashboard/header";

export const metadata = { title: "Generate Newsletter" };

export default function GeneratePage() {
  return (
    <div>
      <Header 
        title="Generate Newsletter" 
        description="Craft compelling medical newsletters with AI precision and instant visual preview." 
      />
      <div className="p-6">
        <GenerateNewsletter />
      </div>
    </div>
  );
}
