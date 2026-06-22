import NewsletterHistory from "@/components/newsletter/NewsletterHistory";
import { Header } from "@/components/dashboard/header";

export const metadata = { title: "Newsletter History" };

export default function HistoryPage() {
  return (
    <div>
      <Header 
        title="Newsletter History" 
        description="Review and manage your previously generated newsletters." 
      />
      <div className="p-6">
        <NewsletterHistory />
      </div>
    </div>
  );
}
