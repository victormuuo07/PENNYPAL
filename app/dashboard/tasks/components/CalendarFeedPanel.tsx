"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function CalendarFeedPanel() {
  const supabase = createClient();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error: selectError } = await supabase.from("CALENDAR_FEEDS").select("token").eq("user_id", user.id).maybeSingle();
      if (selectError) {
        setError(selectError.message.includes("CALENDAR_FEEDS") ? "The calendar feed table isn't set up yet — run supabase/calendar_schema.sql in Supabase first." : selectError.message);
        setLoading(false);
        return;
      }
      if (data) {
        setToken(data.token);
      } else {
        const { data: created, error: insertError } = await supabase.from("CALENDAR_FEEDS").insert({ user_id: user.id }).select("token").single();
        if (insertError) setError(insertError.message);
        else setToken(created.token);
      }
      setLoading(false);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function regenerate() {
    if (!confirm("Regenerate your calendar link? The old link will stop working, so you'll need to re-subscribe on any device using it.")) return;
    setBusy(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data, error: updateError } = await supabase
      .from("CALENDAR_FEEDS")
      .update({ token: crypto.randomUUID() })
      .eq("user_id", user!.id)
      .select("token")
      .single();
    setBusy(false);
    if (!updateError) setToken(data.token);
  }

  function copy(url: string) {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) return null;
  if (error) {
    return <div className="bg-gold/10 border border-gold/30 rounded-card-lg px-5 py-3 text-sm text-ink-soft">{error}</div>;
  }
  if (!token) return null;

  const url = typeof window !== "undefined" ? `${window.location.origin}/api/calendar/${token}/feed.ics` : "";

  return (
    <div className="bg-white rounded-card-lg shadow-soft">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between px-5 py-3 text-sm font-medium text-maroon">
        <span>📅 Add my tasks to Google/Apple/Outlook Calendar</span>
        <span className="text-ink-soft">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="px-5 pb-5 space-y-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <input readOnly value={url} onFocus={(e) => e.target.select()} className="flex-1 min-w-[16rem] rounded-card border border-cream-deep px-3 py-2 text-xs bg-cream-deep/40 font-mono" />
            <button onClick={() => copy(url)} className="bg-maroon hover:bg-red text-cream rounded-card px-3 py-2 text-xs font-medium whitespace-nowrap">
              {copied ? "Copied ✓" : "Copy link"}
            </button>
          </div>
          <details className="text-ink-soft">
            <summary className="cursor-pointer hover:text-maroon">How to subscribe</summary>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>
                <strong>Google Calendar (computer):</strong> Settings → Add calendar → From URL → paste the link.
              </li>
              <li>
                <strong>Apple Calendar (iPhone/Mac):</strong> Settings → Calendar → Accounts → Add Account → Other → Add Subscribed Calendar → paste the link.
              </li>
              <li>
                <strong>Outlook:</strong> Add calendar → Subscribe from web → paste the link.
              </li>
            </ul>
          </details>
          <p className="text-xs text-ink-soft">
            This link only shows your own task titles and due dates — it updates automatically, though Google in particular may only refresh it every several hours. Anyone with this exact
            link could see your tasks, so don&apos;t post it publicly.{" "}
            <button onClick={regenerate} disabled={busy} className="text-maroon hover:underline disabled:opacity-60">
              {busy ? "Regenerating…" : "Regenerate link"}
            </button>
          </p>
        </div>
      )}
    </div>
  );
}
