"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { evaluate, RECORD_TYPE_MAP, str, type Data, type Field, type RecordTypeConfig } from "@/lib/qc/config";
import { todayNairobi, type QcRecord } from "@/lib/qc/queries";
import QcTable from "./QcTable";

export type Suggestions = {
  batches: string[];
  /** batch number → its production date, used to pre-fill traceability records */
  batchDates: Record<string, string>;
  materials: string[];
  products: string[];
  /** field key → distinct values previously entered in this log (names, areas, suppliers…) */
  history: Record<string, string[]>;
};

type Mode = { kind: "new" } | { kind: "edit"; record: QcRecord } | { kind: "nil" } | null;

const inputCls = "w-full rounded-card border border-cream-deep px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gold/60";

function nowTime() {
  return new Date().toLocaleTimeString("en-GB", { timeZone: "Africa/Nairobi", hour: "2-digit", minute: "2-digit" });
}

function initialValue(f: Field): string {
  if (f.default === "today") return todayNairobi();
  if (f.default === "now") return nowTime();
  return f.default ?? "";
}

function blankForm(cfg: RecordTypeConfig, keep?: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of cfg.fields) out[f.key] = keep && f.sticky && keep[f.key] !== undefined ? keep[f.key] : initialValue(f);
  return out;
}

function explainDbError(msg: string): string {
  if (/QC_RECORDS|QC_REVIEWS/.test(msg) && /(does not exist|schema cache|relation)/i.test(msg)) {
    return "The QC tables don't exist yet — run supabase/qc_schema.sql in the Supabase SQL editor first.";
  }
  return msg;
}

export default function QcRecordManager({
  typeKey,
  records,
  suggestions,
  enteredByName,
}: {
  typeKey: string;
  records: QcRecord[];
  suggestions: Suggestions;
  enteredByName: string;
}) {
  const cfg = RECORD_TYPE_MAP[typeKey];
  const router = useRouter();
  const supabase = createClient();
  const [mode, setMode] = useState<Mode>(null);
  const [filter, setFilter] = useState<"all" | "flagged" | "open">("all");
  const [notice, setNotice] = useState<string | null>(null);

  const visible = useMemo(
    () => records.filter((r) => (filter === "flagged" ? r.is_flagged : filter === "open" ? r.is_open : true)),
    [records, filter]
  );
  const flaggedCount = records.filter((r) => r.is_flagged).length;
  const openCount = records.filter((r) => r.is_open).length;

  async function handleDelete(r: QcRecord) {
    if (!confirm("Delete this record? This removes it from the monthly report too.")) return;
    const { error } = await supabase.from("QC_RECORDS").delete().eq("id", r.id);
    if (error) setNotice(explainDbError(error.message));
    else router.refresh();
  }

  if (!cfg) return null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <button
          onClick={() => {
            setNotice(null);
            setMode({ kind: "new" });
          }}
          className="bg-maroon hover:bg-red text-cream rounded-card px-4 py-2 text-sm font-medium transition-colors"
        >
          + New entry
        </button>
        {cfg.nilAllowed && (
          <button
            onClick={() => {
              setNotice(null);
              setMode({ kind: "nil" });
            }}
            className="bg-white shadow-soft hover:bg-cream-deep text-maroon rounded-card px-4 py-2 text-sm font-medium"
          >
            Log NIL entry
          </button>
        )}
        <div className="ml-auto flex gap-1 text-sm">
          {(
            [
              ["all", `All (${records.length})`],
              ["flagged", `Flagged (${flaggedCount})`],
              ["open", `Open (${openCount})`],
            ] as const
          )
            .filter(([k]) => k !== "open" || cfg.closeKey)
            .map(([k, label]) => (
              <button
                key={k}
                onClick={() => setFilter(k)}
                className={`px-3 py-1.5 rounded-card ${filter === k ? "bg-maroon text-cream" : "bg-white shadow-soft text-ink-soft hover:bg-cream-deep"}`}
              >
                {label}
              </button>
            ))}
        </div>
      </div>

      {notice && <div className="bg-red-50 text-red-bright text-sm rounded-card px-4 py-3">{notice}</div>}

      {mode?.kind === "nil" && (
        <NilForm
          cfg={cfg}
          enteredByName={enteredByName}
          onClose={() => setMode(null)}
          onSaved={() => {
            setMode(null);
            router.refresh();
          }}
        />
      )}

      {(mode?.kind === "new" || mode?.kind === "edit") && (
        <EntryForm
          key={mode.kind === "edit" ? mode.record.id : "new"}
          cfg={cfg}
          record={mode.kind === "edit" ? mode.record : null}
          suggestions={suggestions}
          enteredByName={enteredByName}
          onClose={() => setMode(null)}
          onSaved={(again) => {
            if (!again) setMode(null);
            router.refresh();
          }}
        />
      )}

      {visible.length === 0 ? (
        <div className="bg-white rounded-card-lg shadow-soft p-6 text-ink-soft text-sm">
          {records.length === 0 ? "No entries for this month yet." : "No entries match this filter."}
        </div>
      ) : (
        <div className="bg-white rounded-card-lg shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <QcTable
              typeKey={typeKey}
              records={visible}
              renderActions={(r) => (
                <span className="flex gap-3 text-xs print:hidden">
                  {!r.is_nil && (
                    <button onClick={() => setMode({ kind: "edit", record: r })} className="text-maroon hover:underline">
                      {r.is_open ? "Edit / close" : "Edit"}
                    </button>
                  )}
                  <button onClick={() => handleDelete(r)} className="text-ink-soft hover:text-red-bright hover:underline">
                    Delete
                  </button>
                </span>
              )}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// --------------------------------------------------------------- entry form

function EntryForm({
  cfg,
  record,
  suggestions,
  enteredByName,
  onClose,
  onSaved,
}: {
  cfg: RecordTypeConfig;
  record: QcRecord | null;
  suggestions: Suggestions;
  enteredByName: string;
  onClose: () => void;
  onSaved: (addAnother: boolean) => void;
}) {
  const supabase = createClient();
  const [form, setForm] = useState<Record<string, string>>(() => {
    if (!record) return blankForm(cfg);
    const out = blankForm(cfg);
    for (const f of cfg.fields) out[f.key] = record.data[f.key] === undefined ? "" : String(record.data[f.key]);
    return out;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  // Limits are checked live AND re-applied on save, so a CCP breach can never be stored as "Pass".
  const ev = useMemo(() => evaluate(cfg, form as Data), [cfg, form]);
  const eff = ev.data as Record<string, string | number>;
  const forced = (key: string) => !!(cfg.autoFail && cfg.resultKey === key && ev.reasons.length > 0);

  function set(key: string, value: string) {
    setForm((f) => {
      const next = { ...f, [key]: value };
      if (key === cfg.batchKey) {
        const date = suggestions.batchDates[value];
        const target = cfg.fields.find((x) => x.fromBatchDate);
        if (date && target) next[target.key] = date;
      }
      return next;
    });
  }

  function listId(f: Field) {
    return f.suggest ? `qc-${cfg.key}-${f.key}` : undefined;
  }
  function listValues(f: Field): string[] {
    if (f.suggest === "batches") return suggestions.batches;
    if (f.suggest === "materials") return suggestions.materials;
    if (f.suggest === "products") return suggestions.products;
    if (f.suggest === "history") return suggestions.history[f.key] ?? [];
    return [];
  }

  async function save(addAnother: boolean) {
    setError(null);
    setSavedMsg(null);

    for (const f of cfg.fields) {
      if (f.required && String(eff[f.key] ?? "").trim() === "") {
        setError(`"${f.label}" is required`);
        return;
      }
    }
    const invalid = cfg.validate?.(eff as Data);
    if (invalid) {
      setError(invalid);
      return;
    }
    if (ev.flagged && cfg.correctiveKey && str(eff as Data, cfg.correctiveKey) === "") {
      const label = cfg.fields.find((f) => f.key === cfg.correctiveKey)?.label ?? "Corrective action";
      setError(`This entry is flagged (${ev.reasons.join("; ")}). Record what was done in "${label}" before saving.`);
      return;
    }

    // Store numbers as numbers, drop empties
    const clean: Data = {};
    for (const f of cfg.fields) {
      const v = String(eff[f.key] ?? "").trim();
      if (v === "") continue;
      clean[f.key] = f.type === "number" ? Number(v) : v;
    }

    const payload = {
      record_type: cfg.key,
      record_date: clean[cfg.dateKey],
      batch_number: cfg.batchKey ? (clean[cfg.batchKey] as string | undefined) ?? null : null,
      data: clean,
      is_nil: false,
      is_flagged: ev.flagged,
      flag_reason: ev.flagged ? ev.reasons.join("; ") : null,
      is_open: ev.open,
    };

    setSaving(true);
    const { error: dbError } = record
      ? await supabase.from("QC_RECORDS").update(payload).eq("id", record.id)
      : await supabase.from("QC_RECORDS").insert({ ...payload, entered_by_name: enteredByName });
    setSaving(false);

    if (dbError) {
      setError(explainDbError(dbError.message));
      return;
    }
    if (addAnother) {
      setForm((prev) => blankForm(cfg, prev));
      setSavedMsg(ev.flagged ? "Saved and flagged ⚑ — ready for the next entry" : "Saved ✓ — ready for the next entry");
    }
    onSaved(addAnother);
  }

  return (
    <div className="bg-white rounded-card-lg shadow-soft overflow-hidden print:hidden">
      <div className="bg-maroon text-cream px-6 py-4 flex items-center justify-between">
        <div>
          <div className="font-semibold">
            {cfg.icon} {record ? "Edit" : "New"} — {cfg.label}
          </div>
          <div className="text-xs text-cream-deep">{cfg.frequency}</div>
        </div>
        <button onClick={onClose} className="text-cream-deep hover:text-white text-sm" type="button">
          ✕ Close
        </button>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          save(false);
        }}
        className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        {cfg.fields.map((f) => (
          <label key={f.key} className={`block ${f.full ? "sm:col-span-2 lg:col-span-3" : ""}`}>
            <span className="block text-xs font-medium text-ink-soft mb-1">
              {f.label}
              {f.required && <span className="text-red-bright"> *</span>}
            </span>
            {f.type === "select" ? (
              <select
                value={String(eff[f.key] ?? "")}
                onChange={(e) => set(f.key, e.target.value)}
                disabled={forced(f.key)}
                className={`${inputCls} ${forced(f.key) ? "bg-red-50 text-red-bright font-medium" : ""}`}
              >
                {(!f.default || !eff[f.key]) && <option value="">Select…</option>}
                {f.options?.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            ) : f.type === "textarea" ? (
              <textarea rows={2} value={String(eff[f.key] ?? "")} onChange={(e) => set(f.key, e.target.value)} placeholder={f.placeholder} className={inputCls} />
            ) : (
              <input
                type={f.type}
                step={f.type === "number" ? f.step ?? "any" : undefined}
                value={String(eff[f.key] ?? "")}
                onChange={(e) => set(f.key, e.target.value)}
                placeholder={f.placeholder}
                list={listId(f)}
                autoComplete="off"
                className={inputCls}
              />
            )}
            {f.suggest && (
              <datalist id={listId(f)}>
                {listValues(f).map((v) => (
                  <option key={v} value={v} />
                ))}
              </datalist>
            )}
          </label>
        ))}

        {ev.reasons.length > 0 && (
          <div className="sm:col-span-2 lg:col-span-3 bg-red-50 border border-red-bright/30 rounded-card px-4 py-3 text-sm text-red-bright">
            <div className="font-semibold mb-1">⚑ This entry will be flagged</div>
            <ul className="list-disc pl-5 space-y-0.5">
              {ev.reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
            {cfg.autoFail && <div className="mt-1 text-xs">Result has been set to {cfg.failValues?.[0]} automatically.</div>}
            {cfg.correctiveKey && <div className="mt-1 text-xs">A corrective action is required before saving.</div>}
          </div>
        )}
        {cfg.ccpTag?.(eff as Data) && ev.reasons.length === 0 && (
          <div className="sm:col-span-2 lg:col-span-3 bg-gold/10 rounded-card px-4 py-2 text-xs text-ink-soft">
            📌 This is a {cfg.ccpTag(eff as Data)} monitoring record.
          </div>
        )}

        <div className="sm:col-span-2 lg:col-span-3 flex flex-wrap gap-2 justify-end items-center">
          {error && <span className="text-red-bright text-sm mr-auto">{error}</span>}
          {savedMsg && !error && <span className="text-green-700 text-sm mr-auto">{savedMsg}</span>}
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-card text-sm text-ink-soft hover:bg-cream-deep">
            Cancel
          </button>
          {!record && (
            <button
              type="button"
              disabled={saving}
              onClick={() => save(true)}
              className="bg-white border border-maroon text-maroon rounded-card px-4 py-2 text-sm font-medium hover:bg-cream-deep disabled:opacity-60"
            >
              Save &amp; add another
            </button>
          )}
          <button type="submit" disabled={saving} className="bg-maroon hover:bg-red text-cream rounded-card px-4 py-2 text-sm font-medium disabled:opacity-60">
            {saving ? "Saving…" : record ? "Save changes" : "Save entry"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------- NIL entry

function NilForm({
  cfg,
  enteredByName,
  onClose,
  onSaved,
}: {
  cfg: RecordTypeConfig;
  enteredByName: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const supabase = createClient();
  const [date, setDate] = useState(todayNairobi());
  const [by, setBy] = useState(enteredByName);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!by.trim()) {
      setError("Enter the initials / name of who confirmed this");
      return;
    }
    setSaving(true);
    const data: Data = { logged_by: by.trim() };
    if (note.trim()) data.note = note.trim();
    const { error: dbError } = await supabase.from("QC_RECORDS").insert({
      record_type: cfg.key,
      record_date: date,
      data,
      is_nil: true,
      entered_by_name: enteredByName,
    });
    setSaving(false);
    if (dbError) setError(explainDbError(dbError.message));
    else onSaved();
  }

  return (
    <form onSubmit={save} className="bg-white rounded-card-lg shadow-soft p-6 grid grid-cols-1 sm:grid-cols-3 gap-4 print:hidden">
      <div className="sm:col-span-3 text-sm text-ink-soft">
        A NIL entry confirms nothing to report for {cfg.label.toLowerCase()} — it proves the log is active and reviewed, which is what an auditor checks for.
      </div>
      <label className="block">
        <span className="block text-xs font-medium text-ink-soft mb-1">Date</span>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} required />
      </label>
      <label className="block">
        <span className="block text-xs font-medium text-ink-soft mb-1">Confirmed by</span>
        <input value={by} onChange={(e) => setBy(e.target.value)} className={inputCls} required />
      </label>
      <label className="block">
        <span className="block text-xs font-medium text-ink-soft mb-1">Note (optional)</span>
        <input value={note} onChange={(e) => setNote(e.target.value)} className={inputCls} />
      </label>
      <div className="sm:col-span-3 flex gap-2 justify-end items-center">
        {error && <span className="text-red-bright text-sm mr-auto">{error}</span>}
        <button type="button" onClick={onClose} className="px-4 py-2 rounded-card text-sm text-ink-soft hover:bg-cream-deep">
          Cancel
        </button>
        <button type="submit" disabled={saving} className="bg-maroon hover:bg-red text-cream rounded-card px-4 py-2 text-sm font-medium disabled:opacity-60">
          {saving ? "Saving…" : "Log NIL entry"}
        </button>
      </div>
    </form>
  );
}
