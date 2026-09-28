import type { ReactNode } from "react";
import { columnsFor, fmtDate, str, RECORD_TYPE_MAP } from "@/lib/qc/config";
import type { QcRecord } from "@/lib/qc/queries";

/**
 * One table used for both the on-screen log and the printed monthly report,
 * so what's printed is exactly what's stored. Flagged rows are tinted and
 * carry the reason; open complaints/CAPAs are marked OPEN.
 */
export default function QcTable({
  typeKey,
  records,
  print = false,
  renderActions,
}: {
  typeKey: string;
  records: QcRecord[];
  print?: boolean;
  renderActions?: (r: QcRecord) => ReactNode;
}) {
  const cfg = RECORD_TYPE_MAP[typeKey];
  if (!cfg) return null;
  const columns = columnsFor(cfg);
  const span = columns.length + 1 + (renderActions ? 1 : 0);

  const cell = print ? "border border-gray-400 px-1.5 py-1 align-top text-[10px] leading-tight" : "px-3 py-2 align-top";
  const head = print
    ? "border border-gray-400 bg-gray-200 px-1.5 py-1 text-left text-[10px] font-semibold"
    : "px-3 py-3 font-medium text-left whitespace-nowrap";

  return (
    <table className={`w-full ${print ? "border-collapse" : "text-sm"}`}>
      <thead>
        <tr className={print ? "" : "bg-cream-deep text-ink-soft"}>
          {columns.map((c) => (
            <th key={c.label} className={head}>
              {c.label}
            </th>
          ))}
          <th className={head}>Flags / Status</th>
          {renderActions && <th className={head} />}
        </tr>
      </thead>
      <tbody>
        {records.map((r) => {
          const tint = r.is_flagged ? (print ? "bg-red-50" : "bg-red-50/70") : "";
          const rowStyle = print ? { WebkitPrintColorAdjust: "exact" as const, printColorAdjust: "exact" as const } : undefined;
          if (r.is_nil) {
            return (
              <tr key={r.id} className={print ? "" : "border-t border-cream-deep"} style={rowStyle}>
                <td className={cell}>{fmtDate(r.record_date)}</td>
                <td className={`${cell} italic`} colSpan={span - 1 - (renderActions ? 1 : 0)}>
                  NIL — no incidents / entries this period.{str(r.data, "note") ? ` ${str(r.data, "note")}` : ""}
                  {str(r.data, "logged_by") ? ` (${str(r.data, "logged_by")})` : ""}
                </td>
                {renderActions && <td className={cell}>{renderActions(r)}</td>}
              </tr>
            );
          }
          return (
            <tr key={r.id} className={`${print ? "" : "border-t border-cream-deep"} ${tint}`} style={rowStyle}>
              {columns.map((c) => (
                <td key={c.label} className={cell}>
                  {c.render(r.data)}
                </td>
              ))}
              <td className={cell}>
                {r.is_flagged && <div className="font-semibold text-red-bright">⚑ {r.flag_reason}</div>}
                {r.is_open && <div className="font-semibold text-gold-dark">OPEN</div>}
                {!r.is_flagged && !r.is_open && <span className="text-ink-soft">OK</span>}
              </td>
              {renderActions && <td className={`${cell} whitespace-nowrap`}>{renderActions(r)}</td>}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
