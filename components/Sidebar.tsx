"use client";

import { useState } from "react";
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

export default function Sidebar({ role, name }: { role: string; name: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const items = NAV.filter((item) => role === "owner" || !OWNER_ONLY.has(item.href));

  const navContent = (
    <>
      <div className="p-6">
        <div className="text-xl font-semibold">🌶️ PennyPal</div>
        <div className="text-xs text-cream-deep mt-1">{name}</div>
        <div className="text-[10px] uppercase tracking-wide text-gold mt-0.5">
          {role === "owner" ? "Owner" : "Sales Rep"}
        </div>
      </div>

      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-2 rounded-card px-3 py-2 text-sm transition-colors ${
                active ? "bg-white/15 font-medium" : "hover:bg-white/10"
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3">
        <button
          onClick={handleLogout}
          className="w-full text-left rounded-card px-3 py-2 text-sm hover:bg-white/10 transition-colors"
        >
          🚪 Sign out
        </button>
      </div>
    </>
  );

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

      {/* Mobile drawer — slides in from the left. translate-x-full pushes
          it fully offscreen when closed; translate-x-0 brings it on screen.
          transition-transform animates between the two. */}
      <aside
        className={`md:hidden fixed top-0 left-0 bottom-0 w-72 z-50 bg-gradient-to-b from-maroon to-red text-cream flex flex-col transition-transform duration-200 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {navContent}
      </aside>

      {/* Desktop sidebar — permanently visible, same as before, only shown
          at md breakpoint and up */}
      <aside className="hidden md:flex w-64 shrink-0 bg-gradient-to-b from-maroon to-red text-cream flex-col">
        {navContent}
      </aside>
    </>
  );
}
