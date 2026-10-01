import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildIcsFeed, type IcsEvent } from "@/lib/ics";

export const dynamic = "force-dynamic";

/**
 * Public, unauthenticated feed — protected only by the token being
 * unguessable (see supabase/calendar_schema.sql for the security model).
 * Calendar apps fetch this on their own schedule with no login, so this
 * route can't require a Supabase session; it uses the admin client to look
 * up which user the token belongs to, then reads only that user's tasks.
 */
export async function GET(_req: Request, { params }: { params: { token: string } }) {
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidPattern.test(params.token)) {
    return new NextResponse("Not found", { status: 404 });
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return new NextResponse("Calendar feed is not configured on this deployment", { status: 500 });
  }

  const { data: feed } = await admin.from("CALENDAR_FEEDS").select("user_id").eq("token", params.token).maybeSingle();
  if (!feed) {
    return new NextResponse("Not found", { status: 404 });
  }

  const [{ data: profile }, { data: tasks }] = await Promise.all([
    admin.from("profiles").select("full_name").eq("id", feed.user_id).single(),
    admin
      .from("TASKS")
      .select("id, title, notes, due_date, status, priority, entity_label, updated_at")
      .or(`assigned_to.eq.${feed.user_id},created_by.eq.${feed.user_id}`)
      .not("due_date", "is", null)
      .order("due_date", { ascending: true }),
  ]);

  const events: IcsEvent[] = (tasks ?? []).map((t) => ({
    uid: t.id,
    date: t.due_date as string,
    summary: `${t.status === "done" ? "✅ " : ""}${t.title}${t.priority === "high" ? " (high priority)" : ""}`,
    description: [t.entity_label, t.notes].filter(Boolean).join(" — ") || undefined,
    updatedAt: t.updated_at,
  }));

  const calendarName = `PennyPal Tasks — ${profile?.full_name ?? "SpiseUp"}`;
  const body = buildIcsFeed(calendarName, events);

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="pennypal-tasks.ics"',
      "Cache-Control": "no-cache, max-age=0",
    },
  });
}
