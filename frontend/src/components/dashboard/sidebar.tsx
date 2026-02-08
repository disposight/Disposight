"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useNewSignals } from "@/lib/use-new-signals";

const navItems = [
  { label: "Intelligence", items: [
    { href: "/dashboard", label: "Overview", icon: "◉" },
    { href: "/dashboard/signals", label: "Signals", icon: "⚡", badge: true },
    { href: "/dashboard/companies", label: "Companies", icon: "▣" },
    { href: "/dashboard/map", label: "Map", icon: "◎" },
  ]},
  { label: "Configuration", items: [
    { href: "/dashboard/watchlist", label: "Watchlist", icon: "★" },
    { href: "/dashboard/alerts", label: "Alerts", icon: "▲" },
  ]},
  { label: "Account", items: [
    { href: "/dashboard/settings", label: "Settings", icon: "⚙" },
  ]},
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { newCount, dismiss } = useNewSignals();

  return (
    <aside
      className={`fixed left-0 top-0 h-full border-r transition-all duration-200 flex flex-col ${
        collapsed ? "w-16" : "w-60"
      }`}
      style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-default)" }}
    >
      <div className="p-4 flex items-center gap-2">
        <span className="text-lg font-bold" style={{ color: "var(--accent)" }}>D</span>
        {!collapsed && (
          <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            DispoSight
          </span>
        )}
      </div>

      <nav className="flex-1 px-2 py-4 space-y-6 overflow-y-auto">
        {navItems.map((section) => (
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
                    <span className="text-base relative">
                      {item.icon}
                      {showBadge && collapsed && (
                        <span
                          className="absolute -top-1 -right-1 w-2 h-2 rounded-full"
                          style={{ backgroundColor: "var(--accent)" }}
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

      <button
        onClick={() => setCollapsed(!collapsed)}
        className="p-4 text-xs transition-colors"
        style={{ color: "var(--text-muted)" }}
      >
        {collapsed ? "→" : "← Collapse"}
      </button>
    </aside>
  );
}
