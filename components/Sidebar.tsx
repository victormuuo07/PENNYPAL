"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const OWNER_ONLY = new Set([
  "/dashboard/expenses",
  "/dashboard/inventory",
  "/dashboard/assets",
  "/dashboard/messaging",
  "/dashboard/team",
  "/dashboard/analytics",
]);

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/dashboard/analytics", label: "Analytics", icon: "📈" },
  { href: "/dashboard/sales", label: "Sales", icon: "💰" },
  { href: "/dashboard/expenses", label: "Expenses", icon: "🧾" },
  { href: "/dashboard/distribution", label: "Distribution", icon: "🚚" },
  { href: "/dashboard/inventory", label: "Inventory & Production", icon: "📦" },
  { href: "/dashboard/commissions", label: "Commissions", icon: "🤝" },
  { href: "/dashboard/messaging", label: "Customer Messaging", icon: "📱" },
  { href: "/dashboard/assets", label: "Assets & Funding", icon: "🏷️" },
  { href: "/dashboard/team", label: "Team", icon: "👥" },
];

const COLLAPSE_STORAGE_KEY = "pennypal-sidebar-collapsed";

export default function Sidebar({ role, name }: { role: string; name: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [mobileOpen, setMobileOpen] = useState(false);
  // Starts expanded so server and first client render match (avoids a
  // hydration mismatch) — the real saved preference loads a moment later
  // from localStorage, which only exists in the browser.
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(COLLAPSE_STORAGE_KEY);
    if (saved === "true") setCollapsed(true);
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(COLLAPSE_STORAGE_KEY, String(next));
      return next;
    });
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const items = NAV.filter((item) => role === "owner" || !OWNER_ONLY.has(item.href));

  function renderNav(iconOnly: boolean) {
    return (
      <>
        <div className={`p-6 ${iconOnly ? "px-3" : ""}`}>
          {iconOnly ? (
            <div className="text-xl text-center">🌶️</div>
          ) : (
            <>
              <div className="text-xl font-semibold">🌶️ PennyPal</div>
              <div className="text-xs text-cream-deep mt-1">{name}</div>
              <div className="text-[10px] uppercase tracking-wide text-gold mt-0.5">
                {role === "owner" ? "Owner" : "Sales Rep"}
              </div>
            </>
          )}
        </div>

        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {items.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                title={iconOnly ? item.label : undefined}
                className={`flex items-center gap-2 rounded-card px-3 py-2 text-sm transition-colors ${
                  iconOnly ? "justify-center" : ""
                } ${active ? "bg-white/15 font-medium" : "hover:bg-white/10"}`}
              >
                <span>{item.icon}</span>
                {!iconOnly && item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3">
          <button
            onClick={handleLogout}
            title={iconOnly ? "Sign out" : undefined}
            className={`w-full rounded-card px-3 py-2 text-sm hover:bg-white/10 transition-colors ${
              iconOnly ? "text-center" : "text-left"
            }`}
          >
            🚪 {!iconOnly && "Sign out"}
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Mobile top bar — only visible below md breakpoint. Fixed so it
          stays put while the page content scrolls underneath it. */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-maroon text-cream flex items-center justify-between px-4 py-3 shadow-soft">
        <button onClick={() => setMobileOpen(true)} className="text-xl" aria-label="Open menu">
          ☰
        </button>
        <div className="font-semibold">🌶️ PennyPal</div>
        <div className="w-6" /> {/* balances the hamburger so the title stays centered */}
      </div>

      {/* Backdrop — tapping it closes the drawer, same as tapping outside
          any mobile menu */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 bg-black/40 z-40" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile drawer — always shows full labels, collapsing doesn't make
          sense on a phone where the drawer isn't taking up permanent space */}
      <aside
        className={`md:hidden fixed top-0 left-0 bottom-0 w-72 z-50 bg-gradient-to-b from-maroon to-red text-cream flex flex-col transition-transform duration-200 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {renderNav(false)}
      </aside>

      {/* Desktop sidebar — collapsible between full (w-64) and icon-only
          (w-16). The toggle button sits on the edge, same pattern as most
          admin dashboards. */}
      <aside
        className={`hidden md:flex shrink-0 bg-gradient-to-b from-maroon to-red text-cream flex-col relative transition-all duration-200 ${
          collapsed ? "w-16" : "w-64"
        }`}
      >
        {renderNav(collapsed)}
        <button
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="absolute top-6 -right-3 w-6 h-6 rounded-full bg-gold text-maroon text-xs flex items-center justify-center shadow-soft hover:bg-gold-dark"
        >
          {collapsed ? "›" : "‹"}
        </button>
      </aside>
    </>
  );
}
