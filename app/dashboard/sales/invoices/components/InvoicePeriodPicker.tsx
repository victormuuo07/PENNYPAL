"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { PeriodKey } from "@/lib/invoices";

const PRESETS: { key: PeriodKey; label: string }[] = [
  { key: "day", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "year", label: "This Year" },
];

export default function InvoicePeriodPicker({ period, anchor, customFrom, customTo }: { period: PeriodKey; anchor: string; customFrom?: string; customTo?: string }) {
  const router = useRouter();
  const [from, setFrom] = useState(customFrom ?? anchor);
  const [to, setTo] = useState(customTo ?? anchor);

  function go(params: Record<string, string>) {
    const qs = new URLSearchParams(params).toString();
    router.push(`/dashboard/sales/invoices?${qs}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {PRESETS.map((p) => (
        <button
          key={p.key}
          onClick={() => go({ period: p.key, anchor })}
          className={`px-3 py-2 rounded-card text-sm ${period === p.key ? "bg-maroon text-cream" : "bg-white shadow-soft text-ink-soft hover:bg-cream-deep"}`}
        >
          {p.label}
        </button>
      ))}
      <div className={`flex items-center gap-1.5 px-2 py-1 rounded-card ${period === "custom" ? "bg-maroon/10" : ""}`}>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-card border border-cream-deep px-2 py-1.5 text-sm" />
        <span className="text-ink-soft text-sm">to</span>
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-card border border-cream-deep px-2 py-1.5 text-sm" />
        <button onClick={() => go({ period: "custom", anchor, from, to })} className="px-3 py-1.5 rounded-card text-sm bg-white shadow-soft text-ink-soft hover:bg-cream-deep">
          Go
        </button>
      </div>
    </div>
  );
}
