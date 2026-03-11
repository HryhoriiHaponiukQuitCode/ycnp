import { OrgProvider } from "@/lib/context/org-context";
import { Sidebar } from "@/components/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <OrgProvider>
      <div className="min-h-screen">
        <Sidebar />
        <main className="ml-64 min-h-screen bg-stone-50/60 px-8 py-8">
          {children}
        </main>
      </div>
    </OrgProvider>
  );
}
