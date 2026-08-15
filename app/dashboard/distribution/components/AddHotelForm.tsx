"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AddHotelForm() {
  const router = useRouter();
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    hotel_name: "",
    location: "",
    contact_phone: "",
    contact_person: "",
    joined_date: new Date().toISOString().slice(0, 10),
  });

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.hotel_name) return;
    setSaving(true);

    const { error } = await supabase.from("HOTELS").insert({
      hotel_name: form.hotel_name,
      location: form.location,
      contact_phone: form.contact_phone,
      contact_person: form.contact_person,
      joined_date: form.joined_date,
      status: "Active",
    });

    setSaving(false);
    if (!error) {
      setForm({ hotel_name: "", location: "", contact_phone: "", contact_person: "", joined_date: new Date().toISOString().slice(0, 10) });
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-card-lg shadow-soft p-6 space-y-3">
      <h2 className="font-medium text-ink">➕ Add New Hotel</h2>
      <input
        placeholder="Hotel name"
        required
        value={form.hotel_name}
        onChange={(e) => update("hotel_name", e.target.value)}
        className="w-full rounded-card border border-cream-deep px-3 py-2 text-sm"
      />
      <input
        placeholder="Location"
        value={form.location}
        onChange={(e) => update("location", e.target.value)}
        className="w-full rounded-card border border-cream-deep px-3 py-2 text-sm"
      />
      <div className="grid grid-cols-2 gap-3">
        <input
          placeholder="Contact phone"
          value={form.contact_phone}
          onChange={(e) => update("contact_phone", e.target.value)}
          className="rounded-card border border-cream-deep px-3 py-2 text-sm"
        />
        <input
          placeholder="Contact person"
          value={form.contact_person}
          onChange={(e) => update("contact_person", e.target.value)}
          className="rounded-card border border-cream-deep px-3 py-2 text-sm"
        />
      </div>
      <label className="block text-xs text-ink-soft">
        Joined date
        <input
          type="date"
          max={new Date().toISOString().slice(0, 10)}
          value={form.joined_date}
          onChange={(e) => update("joined_date", e.target.value)}
          className="w-full mt-1 rounded-card border border-cream-deep px-3 py-2 text-sm"
        />
      </label>
      <button
        type="submit"
        disabled={saving}
        className="bg-maroon hover:bg-red text-cream rounded-card px-4 py-2 text-sm font-medium disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save hotel"}
      </button>
    </form>
  );
}
