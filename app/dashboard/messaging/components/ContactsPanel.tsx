"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Contact = {
  id: string;
  customer_name: string;
  phone_number: string;
  customer_type: string;
  location: string | null;
  last_contact_date: string | null;
  notes: string | null;
  status: string;
};

export default function ContactsPanel({ contacts }: { contacts: Contact[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    customer_name: "",
    phone_number: "",
    customer_type: "Hotel",
    location: "",
    last_contact_date: new Date().toISOString().slice(0, 10),
    notes: "",
  });

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.customer_name || !form.phone_number) return;
    setSaving(true);

    const { error } = await supabase.from("CUSTOMER_CONTACTS").insert({
      customer_name: form.customer_name,
      phone_number: form.phone_number,
      customer_type: form.customer_type,
      location: form.location,
      last_contact_date: form.last_contact_date || null,
      notes: form.notes,
      status: "Active",
    });

    setSaving(false);
    if (!error) {
      setOpen(false);
      setForm({
        customer_name: "",
        phone_number: "",
        customer_type: "Hotel",
        location: "",
        last_contact_date: new Date().toISOString().slice(0, 10),
        notes: "",
      });
      router.refresh();
    }
  }

  async function sendTestMessage(contact: Contact) {
    setSendingId(contact.id);
    try {
      const res = await fetch("/api/messaging/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone_number: contact.phone_number,
          customer_id: contact.id,
          message: `Hi ${contact.customer_name}, this is a test message from SpiseUp!`,
        }),
      });
      const data = await res.json();
      if (!res.ok) alert(data.error ?? "Failed to send");
      else router.refresh();
    } finally {
      setSendingId(null);
    }
  }

  return (
    <div className="bg-white rounded-card-lg shadow-soft p-6 space-y-4">
      <h2 className="font-medium text-ink">📇 Customer Contacts</h2>

      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="bg-maroon hover:bg-red text-cream rounded-card px-4 py-2 text-sm font-medium"
        >
          + Add Contact
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <input
            placeholder="Customer name"
            required
            value={form.customer_name}
            onChange={(e) => update("customer_name", e.target.value)}
            className="rounded-card border border-cream-deep px-3 py-2 text-sm"
          />
          <input
            placeholder="Phone (e.g. 2547...)"
            required
            value={form.phone_number}
            onChange={(e) => update("phone_number", e.target.value)}
            className="rounded-card border border-cream-deep px-3 py-2 text-sm"
          />
          <select
            value={form.customer_type}
            onChange={(e) => update("customer_type", e.target.value)}
            className="rounded-card border border-cream-deep px-3 py-2 text-sm"
          >
            <option>Hotel</option>
            <option>Mama Mboga</option>
            <option>Individual</option>
          </select>
          <input
            placeholder="Location"
            value={form.location}
            onChange={(e) => update("location", e.target.value)}
            className="rounded-card border border-cream-deep px-3 py-2 text-sm"
          />
          <label className="text-xs text-ink-soft">
            Last contact date
            <input
              type="date"
              value={form.last_contact_date}
              onChange={(e) => update("last_contact_date", e.target.value)}
              className="w-full mt-1 rounded-card border border-cream-deep px-3 py-2 text-sm"
            />
          </label>
          <input
            placeholder="Notes"
            value={form.notes}
            onChange={(e) => update("notes", e.target.value)}
            className="rounded-card border border-cream-deep px-3 py-2 text-sm sm:col-span-3"
          />
          <div className="sm:col-span-4 flex gap-2 justify-end">
            <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 text-sm text-ink-soft">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="bg-maroon hover:bg-red text-cream rounded-card px-4 py-2 text-sm font-medium disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save contact"}
            </button>
          </div>
        </form>
      )}

      {contacts.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-cream-deep text-ink-soft text-left">
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Phone</th>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 font-medium">Location</th>
                <th className="px-3 py-2 font-medium">Last Contact</th>
                <th className="px-3 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) => (
                <tr key={c.id} className="border-t border-cream-deep">
                  <td className="px-3 py-2">{c.customer_name}</td>
                  <td className="px-3 py-2 text-ink-soft">{c.phone_number}</td>
                  <td className="px-3 py-2 text-ink-soft">{c.customer_type}</td>
                  <td className="px-3 py-2 text-ink-soft">{c.location}</td>
                  <td className="px-3 py-2 text-ink-soft">{c.last_contact_date ?? "—"}</td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => sendTestMessage(c)}
                      disabled={sendingId === c.id}
                      className="text-xs bg-cream-deep hover:bg-gold/20 rounded-card px-3 py-1 disabled:opacity-60"
                    >
                      {sendingId === c.id ? "Sending…" : "📱 Send test"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
