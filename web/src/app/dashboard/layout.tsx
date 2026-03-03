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
          <main className="ml-56 p-6">
            {children}
          </main>
        </div>
      </OrgGate>
    </OrgProvider>
  );
}
