"use client";

export default function PrintButton({ label = "🖨️ Print / Save as PDF" }: { label?: string }) {
  return (
    <button onClick={() => window.print()} className="bg-maroon hover:bg-red text-cream rounded-card px-4 py-2 text-sm font-medium transition-colors print:hidden">
      {label}
    </button>
  );
}
