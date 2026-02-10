import { Sidebar } from "@/components/dashboard/sidebar";
import { PlanProvider } from "@/contexts/plan-context";
import { RevenueProvider } from "@/contexts/revenue-context";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--bg-base)" }}>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:rounded-md focus:text-sm focus:font-medium"
        style={{ backgroundColor: "var(--accent)", color: "#fff" }}
      >
        Skip to main content
      </a>
      <Sidebar />
      <main id="main-content" className="ml-60 p-6">
        <PlanProvider>
          <RevenueProvider>{children}</RevenueProvider>
        </PlanProvider>
      </main>
    </div>
  );
}
