"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type AutomatedMessage = {
  id: string;
  message_name: string;
  message_content: string;
  customer_type: string;
  schedule_type: string;
  is_active: boolean;
};

export default function AutomatedMessagesPanel({ messages }: { messages: AutomatedMessage[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    message_name: "",
    message_content: "",
    customer_type: "Hotel",
    schedule_type: "Weekly",
  });

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.message_name || !form.message_content) return;
    setSaving(true);

    const { error } = await supabase.from("AUTOMATED_MESSAGES").insert({
      message_name: form.message_name,
      message_content: form.message_content,
      customer_type: form.customer_type,
      schedule_type: form.schedule_type,
      is_active: true,
    });

    setSaving(false);
    if (!error) {
      setOpen(false);
      setForm({ message_name: "", message_content: "", customer_type: "Hotel", schedule_type: "Weekly" });
      router.refresh();
    }
  }

  async function toggleActive(id: string, current: boolean) {
    await supabase.from("AUTOMATED_MESSAGES").update({ is_active: !current }).eq("id", id);
    router.refresh();
  }

  return (
    <div className="bg-white rounded-card-lg shadow-soft p-6 space-y-4">
      <h2 className="font-medium text-ink">🔁 Automated Messages</h2>
      <p className="text-xs text-ink-soft -mt-2">
        These define the rule (who, what, how often) — actually firing them on schedule needs a Vercel Cron job
        calling an API route on a timer, which we haven&apos;t wired up yet.
      </p>

      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="bg-maroon hover:bg-red text-cream rounded-card px-4 py-2 text-sm font-medium"
        >
          + Add Rule
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            placeholder="Rule name (e.g. Weekly Hotel Reminder)"
            required
            value={form.message_name}
            onChange={(e) => update("message_name", e.target.value)}
            className="rounded-card border border-cream-deep px-3 py-2 text-sm sm:col-span-2"
          />
          <textarea
            placeholder="Message content"
            required
            value={form.message_content}
            onChange={(e) => update("message_content", e.target.value)}
            className="rounded-card border border-cream-deep px-3 py-2 text-sm sm:col-span-2"
            rows={2}
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
          <select
            value={form.schedule_type}
            onChange={(e) => update("schedule_type", e.target.value)}
            className="rounded-card border border-cream-deep px-3 py-2 text-sm"
          >
            <option>Daily</option>
            <option>Weekly</option>
            <option>Monthly</option>
          </select>
          <div className="sm:col-span-2 flex gap-2 justify-end">
            <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 text-sm text-ink-soft">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="bg-maroon hover:bg-red text-cream rounded-card px-4 py-2 text-sm font-medium disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save rule"}
            </button>
          </div>
        </form>
      )}

      {messages.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-cream-deep text-ink-soft text-left">
                <th className="px-3 py-2 font-medium">Rule</th>
                <th className="px-3 py-2 font-medium">Target</th>
                <th className="px-3 py-2 font-medium">Schedule</th>
                <th className="px-3 py-2 font-medium">Active</th>
              </tr>
            </thead>
            <tbody>
              {messages.map((m) => (
                <tr key={m.id} className="border-t border-cream-deep">
                  <td className="px-3 py-2">{m.message_name}</td>
                  <td className="px-3 py-2 text-ink-soft">{m.customer_type}</td>
                  <td className="px-3 py-2 text-ink-soft">{m.schedule_type}</td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => toggleActive(m.id, m.is_active)}
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        m.is_active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {m.is_active ? "Active" : "Paused"}
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
