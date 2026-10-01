/**
 * Minimal iCalendar (RFC 5545) writer — just enough to publish a read-only
 * feed of PennyPal tasks that Google/Apple/Outlook Calendar can subscribe
 * to. Not a general ICS library: no recurrence, no time zones beyond UTC
 * timestamps, no alarms — tasks only ever need a title, a due date, and a
 * description.
 */

export type IcsEvent = {
  /** Stable across regenerations of the feed — reusing a task's id means a
   *  subscribed calendar updates the existing event instead of duplicating
   *  it when the feed refreshes. */
  uid: string;
  /** All-day event date, YYYY-MM-DD. */
  date: string;
  summary: string;
  description?: string;
  /** When this event's data last changed — lets calendar apps skip
   *  re-rendering unchanged events on refresh. */
  updatedAt: string; // ISO timestamp
};

function escapeText(s: string): string {
  // RFC 5545 §3.3.11: backslash, semicolon, comma and newlines must be escaped.
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Lines over 75 octets must be "folded" with CRLF + a leading space. */
function foldLine(line: string): string {
  const bytes = Buffer.byteLength(line, "utf8");
  if (bytes <= 75) return line;
  const out: string[] = [];
  let chunk = "";
  let chunkBytes = 0;
  for (const ch of line) {
    const b = Buffer.byteLength(ch, "utf8");
    if (chunkBytes + b > 74) {
      out.push(chunk);
      chunk = "";
      chunkBytes = 0;
    }
    chunk += ch;
    chunkBytes += b;
  }
  if (chunk) out.push(chunk);
  return out.join("\r\n ");
}

function dateStamp(d: string): string {
  return d.replace(/-/g, "");
}

/** YYYYMMDD one day after the given YYYY-MM-DD — all-day events use an exclusive DTEND. */
function nextDay(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return dateStamp(d.toISOString().slice(0, 10));
}

function toUtcStamp(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

export function buildIcsFeed(calendarName: string, events: IcsEvent[]): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//PennyPal//Task Calendar Feed//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(calendarName)}`,
    // Hints how often to poll — most clients treat this as a minimum, not a
    // guarantee (Google in particular may refresh far less often).
    "X-PUBLISHED-TTL:PT1H",
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
  ];

  for (const e of events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.uid}@pennypal.spiseup`,
      `DTSTAMP:${toUtcStamp(e.updatedAt)}`,
      `DTSTART;VALUE=DATE:${dateStamp(e.date)}`,
      `DTEND;VALUE=DATE:${nextDay(e.date)}`,
      `SUMMARY:${escapeText(e.summary)}`
    );
    if (e.description) lines.push(`DESCRIPTION:${escapeText(e.description)}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.map(foldLine).join("\r\n") + "\r\n";
}
