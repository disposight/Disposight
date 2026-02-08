import { Sidebar } from "@/components/dashboard/sidebar";
import { PlanProvider } from "@/contexts/plan-context";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--bg-base)" }}>
      <Sidebar />
      <main className="ml-60 p-6">
        <PlanProvider>{children}</PlanProvider>
      </main>
    </div>
  );
}
