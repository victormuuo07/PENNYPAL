"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-card-lg shadow-soft p-8">
        <div className="mb-8 text-center">
          <div className="text-3xl mb-2">🌶️</div>
          <h1 className="text-2xl font-semibold text-maroon">PennyPal</h1>
          <p className="text-ink-soft text-sm mt-1">SpiseUp operations</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink-soft mb-1">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-card border border-cream-deep px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-bright"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-soft mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-card border border-cream-deep px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-bright"
            />
          </div>

          {error && (
            <p className="text-sm text-red-bright bg-red-50 rounded-card px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-maroon hover:bg-red text-cream rounded-card py-2 font-medium transition-colors disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
