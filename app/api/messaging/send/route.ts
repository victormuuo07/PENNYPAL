import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Sends one SMS via Africa's Talking and logs the result to MESSAGE_HISTORY.
// AFRICASTALKING_API_KEY and AFRICASTALKING_USERNAME must be set as
// server-side env vars in Vercel (NOT prefixed with NEXT_PUBLIC_, so they're
// never sent to the browser). Get these from africastalking.com.
// Africa's Talking wants full international format with a leading "+",
// e.g. +254712345678. Users type 07..., 7..., 2547... or with spaces/dashes.
function normalizeKenyanPhone(raw: string): string {
  const cleaned = String(raw).replace(/[\s\-().]/g, "");
  if (cleaned.startsWith("+")) return cleaned;
  if (cleaned.startsWith("254")) return `+${cleaned}`;
  if (cleaned.startsWith("0")) return `+254${cleaned.slice(1)}`;
  if (/^[17]\d{8}$/.test(cleaned)) return `+254${cleaned}`;
  return cleaned;
}

export async function POST(request: Request) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "owner") {
    return NextResponse.json({ error: "Only owners can send messages" }, { status: 403 });
  }

  const { phone_number, message, customer_id, message_id } = await request.json();

  if (!phone_number || !message) {
    return NextResponse.json({ error: "phone_number and message are required" }, { status: 400 });
  }

  const apiKey = process.env.AFRICASTALKING_API_KEY?.trim().replace(/^["']|["']$/g, "");
  const username = process.env.AFRICASTALKING_USERNAME?.trim().replace(/^["']|["']$/g, "");

  // The "sandbox" app username only works against the sandbox host; live
  // usernames only work against the live host. Mixing them gives a 401.
  const baseUrl =
    username === "sandbox" ? "https://api.sandbox.africastalking.com" : "https://api.africastalking.com";
  const to = normalizeKenyanPhone(phone_number);

  let delivered = false;
  let errorMessage: string | null = null;

  if (!apiKey || !username) {
    errorMessage = "AFRICASTALKING_API_KEY / AFRICASTALKING_USERNAME not set in Vercel env vars yet";
  } else {
    try {
      const res = await fetch(`${baseUrl}/version1/messaging`, {
        method: "POST",
        headers: {
          apiKey,
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: new URLSearchParams({ username, to, message }),
      });
      const text = await res.text();
      let data: any = null;
      try {
        data = JSON.parse(text);
      } catch {
        // AT returns plain text (e.g. "The supplied authentication is invalid") on auth failures
      }
      const recipient = data?.SMSMessageData?.Recipients?.[0];
      // AT returns HTTP 201 on accept; status is "Success" (some accounts: "Sent")
      delivered = res.ok && (recipient?.status === "Success" || recipient?.status === "Sent");
      if (!delivered) {
        errorMessage = `AT ${res.status} @ ${baseUrl} (user=${username}, keyLen=${apiKey?.length}, keyStart=${apiKey?.slice(0, 4)}, to ${to}): ${recipient?.status ?? ""} ${
          data ? data?.SMSMessageData?.Message ?? "" : text
        }`.trim();
        console.error("Africa's Talking send failed:", res.status, text);
      }
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : "Unknown send error";
    }
  }

  // Log the attempt either way, so you can see failures in Message History
  await supabase.from("MESSAGE_HISTORY").insert({
    customer_id: customer_id ?? null,
    message_id: message_id ?? null,
    phone_number,
    message_content: message,
    sent_date: new Date().toISOString(),
    was_delivered: delivered,
    error_message: delivered ? null : (errorMessage ?? "Send failed").slice(0, 500),
  });

  if (!delivered) {
    return NextResponse.json({ error: errorMessage ?? "Send failed" }, { status: 502 });
  }

  return NextResponse.json({ success: true });
}
