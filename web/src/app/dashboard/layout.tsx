import { OrgProvider } from "@/lib/context/org-context";
import { Sidebar } from "@/components/sidebar";
import { OrgGate } from "@/components/org-gate";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <OrgProvider>
      <OrgGate>
        <div className="min-h-screen">
          <Sidebar />
          <main className="ml-64 min-h-screen bg-stone-50/60 px-8 py-8">
            {children}
          </main>
        </div>
      </OrgGate>
    </OrgProvider>
  );
}
