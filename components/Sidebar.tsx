"use client";

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

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const items = NAV.filter((item) => role === "owner" || !OWNER_ONLY.has(item.href));

  return (
    <aside className="w-64 shrink-0 bg-gradient-to-b from-maroon to-red text-cream flex flex-col">
      <div className="p-6">
        <div className="text-xl font-semibold">🌶️ PennyPal</div>
        <div className="text-xs text-cream-deep mt-1">{name}</div>
        <div className="text-[10px] uppercase tracking-wide text-gold mt-0.5">
          {role === "owner" ? "Owner" : "Sales Rep"}
        </div>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
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
    </aside>
  );
}
