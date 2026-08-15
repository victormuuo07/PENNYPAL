"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreateUserForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    role: "rep",
    phone: "",
    commission_rate: 0,
  });

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const res = await fetch("/api/admin/create-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();

    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Failed to create account");
      return;
    }

    setOpen(false);
    setForm({ full_name: "", email: "", password: "", role: "rep", phone: "", commission_rate: 0 });
    router.refresh();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="bg-maroon hover:bg-red text-cream rounded-card px-4 py-2 text-sm font-medium"
      >
        + Create Account
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-card-lg shadow-soft p-6 space-y-4">
      <h2 className="font-medium text-ink">👤 New Account</h2>

      {/* This is the whole answer to "how do we tell owner vs rep apart" —
          it's picked explicitly here, nothing automatic about it. */}
      <div className="flex gap-3">
        {(["rep", "owner"] as const).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => update("role", r)}
            className={`flex-1 rounded-card border-2 px-4 py-3 text-sm font-medium transition-colors ${
              form.role === r
                ? "border-maroon bg-maroon/5 text-maroon"
                : "border-cream-deep text-ink-soft hover:border-gold"
            }`}
          >
            {r === "owner" ? "🔑 Owner" : "🤝 Sales Rep"}
            <div className="text-xs font-normal mt-1 opacity-70">
              {r === "owner" ? "Full access to everything" : "Own sales, distribution & commissions only"}
            </div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input
          placeholder="Full name"
          required
          value={form.full_name}
          onChange={(e) => update("full_name", e.target.value)}
          className="rounded-card border border-cream-deep px-3 py-2 text-sm"
        />
        <input
          type="email"
          placeholder="Email"
          required
          value={form.email}
          onChange={(e) => update("email", e.target.value)}
          className="rounded-card border border-cream-deep px-3 py-2 text-sm"
        />
        <input
          type="password"
          placeholder="Temporary password"
          required
          minLength={6}
          value={form.password}
          onChange={(e) => update("password", e.target.value)}
          className="rounded-card border border-cream-deep px-3 py-2 text-sm"
        />
        {form.role === "rep" && (
          <input
            placeholder="Phone (optional)"
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            className="rounded-card border border-cream-deep px-3 py-2 text-sm"
          />
        )}
        {form.role === "rep" && (
          <input
            type="number"
            min={0}
            max={100}
            placeholder="Commission rate %"
            value={form.commission_rate}
            onChange={(e) => update("commission_rate", Number(e.target.value))}
            className="rounded-card border border-cream-deep px-3 py-2 text-sm"
          />
        )}
      </div>

      {error && <p className="text-red-bright text-sm">{error}</p>}

      <div className="flex gap-2 justify-end">
        <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 text-sm text-ink-soft">
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="bg-maroon hover:bg-red text-cream rounded-card px-4 py-2 text-sm font-medium disabled:opacity-60"
        >
          {saving ? "Creating…" : "Create account"}
        </button>
      </div>
    </form>
  );
}
