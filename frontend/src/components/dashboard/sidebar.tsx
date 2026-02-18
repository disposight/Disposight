"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useNewSignals } from "@/lib/use-new-signals";
import { usePlan } from "@/contexts/plan-context";
import { createClient } from "@/lib/supabase";

const navItems = [
  { label: "Pipeline", items: [
    { href: "/dashboard", label: "Today", icon: "⚡", badge: true },
    { href: "/dashboard/overview", label: "Overview", icon: "◉" },
    { href: "/dashboard/map", label: "Map", icon: "◎" },
  ]},
  { label: "My Work", items: [
    { href: "/dashboard/pipeline", label: "My Pipeline", icon: "▣" },
    { href: "/dashboard/watchlist", label: "Watchlist", icon: "★" },
    { href: "/dashboard/alerts", label: "Alerts", icon: "▲" },
  ]},
  { label: "Account", items: [
    { href: "/dashboard/settings", label: "Settings", icon: "⚙" },
    { href: "/dashboard/help", label: "Help", icon: "?" },
  ]},
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const { newCount, dismiss } = useNewSignals();
  const { user } = usePlan();
  const isAdmin = user?.role === "owner" || user?.role === "admin";

  const allNavItems = isAdmin
    ? [
        ...navItems.slice(0, -1),
        {
          label: "Account",
          items: [
            { href: "/dashboard/settings", label: "Settings", icon: "⚙" },
            { href: "/dashboard/admin/security", label: "Security", icon: "🛡" },
            { href: "/dashboard/help", label: "Help", icon: "?" },
          ],
        },
      ]
    : navItems;

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <aside
      role="navigation"
      aria-label="Main navigation"
      className={`fixed left-0 top-0 h-full border-r transition-all duration-200 flex flex-col ${
        collapsed ? "w-16" : "w-60"
      }`}
      style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-default)" }}
    >
      <a href="/dashboard" className="p-4 flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
        <img src="/logo.png" alt="DispoSight" className="h-7" />
        {!collapsed && (
          <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            DispoSight
          </span>
        )}
      </a>

      <nav className="flex-1 px-2 py-4 space-y-6 overflow-y-auto">
        {allNavItems.map((section) => (
          <div key={section.label}>
            {!collapsed && (
              <p
                className="px-3 mb-2 text-[11px] font-medium uppercase tracking-wider"
                style={{ color: "var(--text-muted)" }}
              >
                {section.label}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                const showBadge = item.badge && newCount > 0;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => {
                      if (item.badge) dismiss();
                    }}
                    className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                      collapsed ? "justify-center" : ""
                    }`}
                    style={{
                      backgroundColor: isActive ? "var(--accent-muted)" : "transparent",
                      color: isActive ? "var(--accent-text)" : "var(--text-secondary)",
                    }}
                    title={collapsed ? item.label : undefined}
                  >
                    <span className="text-base relative" aria-hidden="true">
                      {item.icon}
                      {showBadge && collapsed && (
                        <span
                          className="absolute -top-1 -right-1 w-2 h-2 rounded-full"
                          style={{ backgroundColor: "var(--accent)" }}
                          aria-label={`${newCount} new signals`}
                        />
                      )}
                    </span>
                    {!collapsed && (
                      <span className="flex-1 flex items-center justify-between">
                        <span>{item.label}</span>
                        {showBadge && (
                          <span
                            className="ml-2 px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none"
                            style={{
                              backgroundColor: "var(--accent)",
                              color: "#fff",
                            }}
                            role="status"
                            aria-live="polite"
                            aria-label={`${newCount} new signals`}
                          >
                            {newCount > 99 ? "99+" : newCount}
                          </span>
                        )}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t px-2 py-3 space-y-1" style={{ borderColor: "var(--border-default)" }}>
        <button
          onClick={handleSignOut}
          aria-label="Sign out"
          className={`flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm transition-colors hover:opacity-80 ${
            collapsed ? "justify-center" : ""
          }`}
          style={{ color: "var(--text-muted)" }}
          title={collapsed ? "Sign Out" : undefined}
        >
          <span className="text-base" aria-hidden="true">↪</span>
          {!collapsed && <span>Sign Out</span>}
        </button>
        <button
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={`flex items-center gap-3 w-full px-3 py-2 rounded-md text-xs transition-colors ${
            collapsed ? "justify-center" : ""
          }`}
          style={{ color: "var(--text-muted)" }}
        >
          <span aria-hidden="true">{collapsed ? "→" : "← Collapse"}</span>
        </button>
      </div>
    </aside>
  );
}
