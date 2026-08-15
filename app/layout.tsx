import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PennyPal — SpiseUp Ops",
  description: "SpiseUp sales, expenses, inventory & operations",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-cream text-ink font-sans">{children}</body>
    </html>
  );
}
