"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { monthLabel, shiftMonth } from "@/lib/customers";

export default function CustomerMonthPicker({ basePath, month }: { basePath: string; month: string }) {
  const router = useRouter();
  return (
    <div className="flex items-center gap-2">
      <Link href={`${basePath}?month=${shiftMonth(month, -1)}`} className="px-3 py-2 rounded-card bg-white shadow-soft text-sm hover:bg-cream-deep" aria-label="Previous month">
        ‹
      </Link>
      <label className="relative">
        <span className="block px-4 py-2 rounded-card bg-white shadow-soft text-sm font-medium text-maroon min-w-[9rem] text-center">{monthLabel(month)}</span>
        <input
          type="month"
          value={month}
          onChange={(e) => e.target.value && router.push(`${basePath}?month=${e.target.value}`)}
          className="absolute inset-0 opacity-0 cursor-pointer"
          aria-label="Choose month"
        />
      </label>
      <Link href={`${basePath}?month=${shiftMonth(month, 1)}`} className="px-3 py-2 rounded-card bg-white shadow-soft text-sm hover:bg-cream-deep" aria-label="Next month">
        ›
      </Link>
    </div>
  );
}
