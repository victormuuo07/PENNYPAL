"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AddMamaForm() {
  const router = useRouter();
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ shop_name: "", location: "", contact_phone: "" });

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.shop_name) return;
    setSaving(true);
    setError(null);

    const { error } = await supabase.from("MAMA_MBOGAS").insert({
      shop_name: form.shop_name,
      location: form.location,
      contact_phone: form.contact_phone,
      joined_date: new Date().toISOString().slice(0, 10),
      status: "Active",
    });

    setSaving(false);
    if (error) {
      setError(error.message);
    } else {
      setForm({ shop_name: "", location: "", contact_phone: "" });
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-card-lg shadow-soft p-6 space-y-3">
      <h2 className="font-medium text-ink">➕ Add Mama Mboga / Shop</h2>
      <input
        placeholder="Shop name"
        required
        value={form.shop_name}
        onChange={(e) => update("shop_name", e.target.value)}
        className="w-full rounded-card border border-cream-deep px-3 py-2 text-sm"
      />
      <input
        placeholder="Location"
        value={form.location}
        onChange={(e) => update("location", e.target.value)}
        className="w-full rounded-card border border-cream-deep px-3 py-2 text-sm"
      />
      <input
        placeholder="Contact phone"
        value={form.contact_phone}
        onChange={(e) => update("contact_phone", e.target.value)}
        className="w-full rounded-card border border-cream-deep px-3 py-2 text-sm"
      />
      <button
        type="submit"
        disabled={saving}
        className="bg-maroon hover:bg-red text-cream rounded-card px-4 py-2 text-sm font-medium disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save shop"}
      </button>
      {error && <p className="text-red-bright text-sm">{error}</p>}
    </form>
  );
}
