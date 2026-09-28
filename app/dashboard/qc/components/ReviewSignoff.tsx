"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { fmtDate } from "@/lib/qc/config";
import type { QcReview } from "@/lib/qc/queries";

/** Supervisor month-end sign-off for one log — HACCP "verification". Prints on the monthly report. */
export default function ReviewSignoff({
  typeKey,
  month,
  reviewerName,
  review,
}: {
  typeKey: string;
  month: string;
  reviewerName: string;
  review: QcReview | null;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sign() {
    setSaving(true);
    setError(null);
    const { error } = await supabase
      .from("QC_REVIEWS")
      .upsert({ review_month: `${month}-01`, record_type: typeKey, reviewed_by: reviewerName, reviewed_at: new Date().toISOString() }, { onConflict: "review_month,record_type" });
    setSaving(false);
    if (error) setError(error.message);
    else router.refresh();
  }

  async function unsign() {
    if (!confirm("Remove this month's supervisor review?")) return;
    setSaving(true);
    const { error } = await supabase.from("QC_REVIEWS").delete().eq("review_month", `${month}-01`).eq("record_type", typeKey);
    setSaving(false);
    if (error) setError(error.message);
    else router.refresh();
  }

  return (
    <div className="bg-white rounded-card-lg shadow-soft px-5 py-3 flex flex-wrap items-center gap-3 text-sm">
      {review ? (
        <>
          <span className="text-green-700 font-medium">✔ Reviewed by {review.reviewed_by}</span>
          <span className="text-ink-soft">on {fmtDate(review.reviewed_at.slice(0, 10))}</span>
          <button onClick={unsign} disabled={saving} className="ml-auto text-xs text-ink-soft hover:text-red-bright underline">
            Remove review
          </button>
        </>
      ) : (
        <>
          <span className="text-ink-soft">Supervisor review for this month not yet signed.</span>
          <button onClick={sign} disabled={saving} className="ml-auto bg-gold hover:bg-gold-dark text-maroon rounded-card px-4 py-1.5 text-sm font-medium disabled:opacity-60">
            {saving ? "Saving…" : `Mark reviewed as ${reviewerName}`}
          </button>
        </>
      )}
      {error && <span className="basis-full text-red-bright text-xs">{error}</span>}
    </div>
  );
}
